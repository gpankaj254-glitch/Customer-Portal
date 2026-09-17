const httpStatus = require("http-status");
const crypto = require("crypto");
const _ = require("lodash");
const moment = require("moment");
const { parse } = require("csv-parse/sync");
const { Opportunity, Counter } = require("../models");
const ApiError = require("../utils/ApiError");
const { extractUserDetails, extractNameAndCode } = require("../utils/extractors");
const { uploadBuffer } = require("../utils/s3");
const { getCustomerByName } = require("./customer.service");
const {
  linkTypeOptions,
  ipRequirementOptions,
  interfaceOptions,
  supplierQuoteStatusOptions,
} = require("../config/opportunityOptions");
const { bandwidthOptions, productOptions } = require("../config/circuitOptions");
const { currencyOptions } = require("../config/currencyOptions");

const currencyCodes = currencyOptions.map((option) => option.code);

// Natural key the sales team identifies a Customer Request by, used both to
// reject duplicate opportunities on bulk create and to link a Supplier
// Response upload row back to the right opportunity - see
// bulkUploadOpportunities/bulkUploadSupplierResponses below.
function buildCustomerRequestKey(customerLabel, requestDate, requestId, linkType, siteAddress) {
  return [customerLabel, requestDate, requestId, linkType, siteAddress]
    .map((part) => (part || "").trim().toLowerCase())
    .join("|");
}

/**
 * Build a unique S3 key for an uploaded file under a given prefix - mirrors
 * ticket.service.js's buildAttachmentKey.
 * @param {string} prefix
 * @param {string} originalName
 * @returns {string}
 */
const buildAttachmentKey = (prefix, originalName) => {
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  return `${prefix}/${unique}-${safeName}`;
};

/**
 * Atomically reserve the next serial for a given month and build the full
 * opportunity number: OPP<YY><MM><4-digit serial> - mirrors
 * ticket.service.js's generateTicketNumber.
 * @returns {Promise<string>}
 */
const generateOpportunityNumber = async () => {
  const now = moment();
  const yy = now.format("YY");
  const mm = now.format("MM");
  const counter = await Counter.findOneAndUpdate(
    { _id: `opportunityNumber-${yy}${mm}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const serial = String(counter.seq).padStart(4, "0");
  return `OPP${yy}${mm}${serial}`;
};

function getLatestUpdate(stage, comment, user) {
  return {
    stage,
    comment,
    user: extractUserDetails(user),
    updatedAt: moment().toISOString(),
  };
}

/**
 * Create a Sales Opportunity
 * @param {Object} reqBody
 * @param {Object} user - the acting (creating) user
 * @param {Object} [relatedCustomer] - the Customer this opportunity is linked to, when applicable
 * @returns {Promise<Opportunity>}
 */
const createOpportunity = async (reqBody, user, relatedCustomer = null) => {
  const opportunityToCreate = _.pick(reqBody, [
    "name",
    "prospectName",
    "value",
    "stage",
    "expectedCloseDate",
    "description",
    "customerRequest",
  ]);
  opportunityToCreate.opportunityId = await generateOpportunityNumber();
  if (relatedCustomer) {
    opportunityToCreate.customer = extractNameAndCode(relatedCustomer);
  }
  opportunityToCreate.owner = extractUserDetails(user);
  opportunityToCreate.createdBy = extractUserDetails(user);
  opportunityToCreate.latestUpdate = getLatestUpdate(
    opportunityToCreate.stage || "New",
    "Opportunity created",
    user
  );
  opportunityToCreate.history = [opportunityToCreate.latestUpdate];
  // Seed the Customer Request's status log with its initial value (default
  // "Pending" if not otherwise set) so the Log isn't empty until the first
  // later change. Snapshots currency/nrc/mrc alongside the status itself.
  opportunityToCreate.customerRequest = {
    ...(opportunityToCreate.customerRequest || {}),
    statusHistory: [
      {
        status: _.get(opportunityToCreate, "customerRequest.quoteStatus", "Pending"),
        changedAt: new Date().toISOString(),
        currency: _.get(opportunityToCreate, "customerRequest.currency", ""),
        nrc: _.get(opportunityToCreate, "customerRequest.nrc", null),
        mrc: _.get(opportunityToCreate, "customerRequest.mrc", null),
      },
    ],
  };
  return Opportunity.create(opportunityToCreate);
};

/**
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryOpportunities = async (filter, options) => {
  return Opportunity.paginate(filter, options);
};

/**
 * @param {ObjectId} opportunityId
 * @returns {Promise<Opportunity>}
 */
const getOpportunityById = async (opportunityId) => {
  return Opportunity.findById(opportunityId);
};

const getActiveOpportunityById = async (opportunityId) => {
  const opportunity = await getOpportunityById(opportunityId);
  if (!opportunity) {
    throw new ApiError(httpStatus.NOT_FOUND, "Opportunity not found");
  } else if (!opportunity.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Opportunity is not active");
  }
  return opportunity;
};

/**
 * Update an opportunity by id. Moving to a new stage appends to the history
 * log the same way Ticket tracks its status changes; moving to "Converted"
 * stamps convertedOrder.convertedAt.
 * @param {ObjectId} opportunityId
 * @param {Object} updateBody
 * @param {Object} actingUser
 * @param {Object} [relatedCustomer]
 * @returns {Promise<Opportunity>}
 */
const updateOpportunityById = async (opportunityId, updateBody, actingUser, relatedCustomer = null) => {
  const opportunity = await getActiveOpportunityById(opportunityId);
  const stageChanging = updateBody.stage !== undefined && updateBody.stage !== opportunity.stage;
  const snapshot = opportunity.toObject();

  // customerRequest is a single nested object, not an array - a PATCH that
  // only sends a couple of fields (e.g. Edit Opportunity's Quote Submit
  // Date/Quote Status) must merge into the existing object rather than
  // wholesale-replace it via Object.assign, or the other fields captured at
  // creation would be wiped out.
  if (updateBody.customerRequest) {
    const existingCustomerRequest = snapshot.customerRequest || {};
    const mergedCustomerRequest = { ...existingCustomerRequest, ...updateBody.customerRequest };
    const statusChanged =
      updateBody.customerRequest.quoteStatus !== undefined &&
      updateBody.customerRequest.quoteStatus !== existingCustomerRequest.quoteStatus;
    mergedCustomerRequest.statusHistory = statusChanged
      ? _.concat(existingCustomerRequest.statusHistory || [], {
          status: updateBody.customerRequest.quoteStatus,
          changedAt: new Date().toISOString(),
          currency: mergedCustomerRequest.currency || "",
          nrc: mergedCustomerRequest.nrc ?? null,
          mrc: mergedCustomerRequest.mrc ?? null,
        })
      : existingCustomerRequest.statusHistory || [];
    updateBody.customerRequest = mergedCustomerRequest;
  }

  // supplierCommunications is saved as a whole-array replace (the client
  // always sends every entry back with only the fields it edits), so every
  // entry's statusHistory and attachments have to be explicitly carried over
  // here or they would be silently dropped on save - a brand new entry (no
  // _id yet) gets seeded with its initial status and no attachments, an
  // existing entry only gets a new log line when its status actually
  // changed, otherwise its prior history/attachments are preserved.
  if (updateBody.supplierCommunications) {
    const existingById = _.keyBy(snapshot.supplierCommunications || [], (entry) => String(entry._id));
    updateBody.supplierCommunications = updateBody.supplierCommunications.map((entry) => {
      const existingEntry = entry._id && existingById[String(entry._id)];
      const now = new Date().toISOString();
      if (!existingEntry) {
        return {
          ...entry,
          statusHistory: [
            {
              status: entry.quoteStatus || "Pending",
              changedAt: now,
              currency: entry.currency || "",
              nrc: entry.nrc ?? null,
              mrc: entry.mrc ?? null,
            },
          ],
          attachments: [],
        };
      }
      const statusChanged = entry.quoteStatus !== undefined && entry.quoteStatus !== existingEntry.quoteStatus;
      const statusHistory = statusChanged
        ? _.concat(existingEntry.statusHistory || [], {
            status: entry.quoteStatus,
            changedAt: now,
            currency: entry.currency || "",
            nrc: entry.nrc ?? null,
            mrc: entry.mrc ?? null,
          })
        : existingEntry.statusHistory || [];
      return { ...entry, statusHistory, attachments: existingEntry.attachments || [] };
    });
  }

  Object.assign(opportunity, _.omit(updateBody, ["customerId"]));
  if (relatedCustomer) {
    opportunity.customer = extractNameAndCode(relatedCustomer);
  }

  if (stageChanging) {
    opportunity.latestUpdate = getLatestUpdate(
      updateBody.stage,
      updateBody.comment || "",
      actingUser
    );
    opportunity.history = _.concat(opportunity.history, opportunity.latestUpdate);
    if (updateBody.stage === "Converted") {
      _.set(opportunity, "convertedOrder.convertedAt", new Date());
    }
  }

  opportunity.updatedBy = extractUserDetails(actingUser);
  await opportunity.save();
  return opportunity;
};

/**
 * Sales dashboard metrics for the Sales User/Sales Admin landing page -
 * all computed live from active opportunities, no persisted rollups.
 *
 * - totalOpenOpportunities: active opportunities whose Customer Request
 *   quoteStatus is "Pending".
 * - openOpportunitiesOverThreeDays: of those, ones whose requestDate is
 *   more than 3 days old.
 * - customerLast30Days: among Customer Requests whose quoteSubmitDate is
 *   within the last 30 days - quotesSubmitted (all of them), quotesWon
 *   (status Won), quotesAwaitingFeedback (status Submitted).
 * - supplierQuotesPending: Supplier Communication entries (across all
 *   active opportunities) whose quoteStatus is "Submitted" or "Pending" -
 *   i.e. the request is out to the supplier or not yet sent, either way
 *   still open and not yet resolved to Received/No Bid.
 * - supplierQuotesPendingOverThreeDays: of those, ones whose
 *   quoteSubmitDate is more than 3 days old.
 * - supplierLast30Days: among Supplier Communication entries whose
 *   quoteSubmitDate is within the last 30 days - quotesSubmitted (all of
 *   them), quotesReceived (status Received).
 * - supplierWiseReport: the supplierQuotesPending/OverThreeDays counts
 *   broken down per supplier name, sorted by pending count descending.
 * - openOpportunities: one row per "Pending" opportunity (opportunityId,
 *   name, customerOrProspect, requestDate, daysPending), sorted by
 *   daysPending descending - the detail list behind the two Open
 *   Opportunity tiles, same idea as supplierWiseReport.
 * @returns {Promise<Object>}
 */
const getSalesDashboardSummary = async () => {
  const opportunities = await Opportunity.find({ active: true })
    .select("opportunityId name customer prospectName customerRequest supplierCommunications")
    .lean();

  const today = moment().startOf("day");
  const daysSince = (dateString) => {
    if (!dateString) return null;
    const parsed = moment(dateString).startOf("day");
    if (!parsed.isValid()) return null;
    return today.diff(parsed, "days");
  };

  let totalOpenOpportunities = 0;
  let openOpportunitiesOverThreeDays = 0;
  let customerQuotesSubmitted = 0;
  let customerQuotesWon = 0;
  let customerQuotesAwaitingFeedback = 0;
  let supplierQuotesPending = 0;
  let supplierQuotesPendingOverThreeDays = 0;
  let supplierQuotesSubmittedLast30Days = 0;
  let supplierQuotesReceivedLast30Days = 0;
  const supplierStats = {};
  const openOpportunities = [];
  const openSupplierQuoteStatuses = ["Submitted", "Pending"];

  opportunities.forEach((opportunity) => {
    const customerRequest = opportunity.customerRequest || {};

    if (customerRequest.quoteStatus === "Pending") {
      totalOpenOpportunities += 1;
      const requestAge = daysSince(customerRequest.requestDate);
      if (requestAge !== null && requestAge > 3) {
        openOpportunitiesOverThreeDays += 1;
      }
      openOpportunities.push({
        opportunityId: opportunity.opportunityId,
        name: opportunity.name,
        customerOrProspect: _.get(opportunity, "customer.name") || opportunity.prospectName || "",
        requestDate: customerRequest.requestDate || "",
        daysPending: requestAge,
      });
    }

    const submitAge = daysSince(customerRequest.quoteSubmitDate);
    if (submitAge !== null && submitAge < 30) {
      customerQuotesSubmitted += 1;
      if (customerRequest.quoteStatus === "Won") customerQuotesWon += 1;
      if (customerRequest.quoteStatus === "Submitted") customerQuotesAwaitingFeedback += 1;
    }

    (opportunity.supplierCommunications || []).forEach((entry) => {
      const entrySubmitAge = daysSince(entry.quoteSubmitDate);
      if (entrySubmitAge !== null && entrySubmitAge < 30) {
        supplierQuotesSubmittedLast30Days += 1;
        if (entry.quoteStatus === "Received") supplierQuotesReceivedLast30Days += 1;
      }

      if (!openSupplierQuoteStatuses.includes(entry.quoteStatus)) return;
      const supplierName = entry.supplier || "Unknown";
      if (!supplierStats[supplierName]) {
        supplierStats[supplierName] = { supplier: supplierName, pending: 0, pendingOverThreeDays: 0 };
      }
      supplierQuotesPending += 1;
      supplierStats[supplierName].pending += 1;

      if (entrySubmitAge !== null && entrySubmitAge > 3) {
        supplierQuotesPendingOverThreeDays += 1;
        supplierStats[supplierName].pendingOverThreeDays += 1;
      }
    });
  });

  const supplierWiseReport = _.orderBy(Object.values(supplierStats), ["pending"], ["desc"]);
  const openOpportunitiesSorted = _.orderBy(openOpportunities, ["daysPending"], ["desc"]);

  return {
    totalOpenOpportunities,
    openOpportunitiesOverThreeDays,
    openOpportunities: openOpportunitiesSorted,
    customerLast30Days: {
      quotesSubmitted: customerQuotesSubmitted,
      quotesWon: customerQuotesWon,
      quotesAwaitingFeedback: customerQuotesAwaitingFeedback,
    },
    supplierQuotesPending,
    supplierQuotesPendingOverThreeDays,
    supplierLast30Days: {
      quotesSubmitted: supplierQuotesSubmittedLast30Days,
      quotesReceived: supplierQuotesReceivedLast30Days,
    },
    supplierWiseReport,
  };
};

/**
 * Deactivate opportunity by id
 * @param {ObjectId} opportunityId
 * @param {Object} actingUser
 * @returns {Promise<Opportunity>}
 */
const deactivateOpportunityById = async (opportunityId, actingUser) => {
  const opportunity = await getActiveOpportunityById(opportunityId);
  opportunity.active = false;
  opportunity.deletedAt = new Date();
  opportunity.deletedBy = extractUserDetails(actingUser);
  await opportunity.save();
  return opportunity;
};

/**
 * Restore a deleted opportunity by id
 * @param {ObjectId} opportunityId
 * @returns {Promise<Opportunity>}
 */
const restoreOpportunityById = async (opportunityId) => {
  const opportunity = await getOpportunityById(opportunityId);
  if (!opportunity) {
    throw new ApiError(httpStatus.NOT_FOUND, "Opportunity not found");
  } else if (opportunity.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Opportunity is already active");
  }
  opportunity.active = true;
  opportunity.deletedAt = null;
  opportunity.deletedBy = null;
  await opportunity.save();
  return opportunity;
};

/**
 * Permanently remove a soft-deleted opportunity from the database.
 * @param {ObjectId} opportunityId
 * @returns {Promise<void>}
 */
const permanentlyDeleteOpportunityById = async (opportunityId) => {
  const opportunity = await getOpportunityById(opportunityId);
  if (!opportunity) {
    throw new ApiError(httpStatus.NOT_FOUND, "Opportunity not found");
  }
  if (opportunity.active) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      "Opportunity must be deleted before it can be permanently removed"
    );
  }
  await Opportunity.deleteOne({ _id: opportunityId });
};

/**
 * Attach one or more uploaded files to a Supplier Communication entry.
 * @param {string} opportunityId
 * @param {string} entryId - the supplierCommunications subdocument's _id
 * @param {Array} files - multer file objects (memory storage - have .buffer)
 * @param {Object} user
 * @returns {Promise<Opportunity>}
 */
const addSupplierCommunicationAttachments = async (opportunityId, entryId, files, user) => {
  const opportunity = await getActiveOpportunityById(opportunityId);
  const entry = opportunity.supplierCommunications.id(entryId);
  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Supplier Communication entry not found");
  }

  const uploadedBy = extractUserDetails(user);
  const uploadedAt = moment().toISOString();
  const attachments = await Promise.all(
    files.map(async (file) => {
      const key = buildAttachmentKey(`opportunities/${opportunityId}/supplier/${entryId}`, file.originalname);
      await uploadBuffer(key, file.buffer, file.mimetype);
      return {
        key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy,
        uploadedAt,
      };
    })
  );
  entry.attachments = _.concat(entry.attachments, attachments);

  opportunity.updatedBy = extractUserDetails(user);
  await opportunity.save();
  return opportunity;
};

/**
 * Look up one Supplier Communication attachment's stored metadata, for a
 * secure (auth-checked) download.
 * @param {string} opportunityId
 * @param {string} entryId
 * @param {string} attachmentId
 * @returns {Promise<Object>}
 */
const getSupplierCommunicationAttachment = async (opportunityId, entryId, attachmentId) => {
  const opportunity = await getActiveOpportunityById(opportunityId);
  const entry = opportunity.supplierCommunications.id(entryId);
  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Supplier Communication entry not found");
  }
  const attachment = entry.attachments.id(attachmentId);
  if (!attachment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attachment not found");
  }
  return attachment;
};

const OPPORTUNITY_BULK_UPLOAD_COLUMNS = [
  "Opportunity Name",
  "Customer Name",
  "Prospect Name",
  "Description",
  "Request ID",
  "Request Date",
  "Link Type",
  "Site Address",
  "City",
  "State",
  "Zip Code",
  "Country",
  "Product",
  "IP Requirement",
  "Interface",
  "Down Bandwidth",
  "Up Bandwidth",
  "Contract Term",
];

/**
 * Bulk-create Sales Opportunities from an uploaded CSV buffer. Each row's
 * Customer Name + Request Date + Request ID + Link Type + Site Address is
 * treated as a natural key - a row that matches an already-existing active
 * opportunity, or another row in the same file, is rejected as a duplicate
 * rather than creating a second Customer Request for the same thing. Only
 * inserts anything if every row passes (all-or-nothing), same convention as
 * ticket.service.js's bulkUploadTickets.
 * @param {Buffer} fileBuffer
 * @param {Object} actingUser
 * @returns {Promise<{success: boolean, totalRows: number, insertedCount: number, failedRows: Array}>}
 */
const bulkUploadOpportunities = async (fileBuffer, actingUser) => {
  let records;
  try {
    records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Could not parse CSV file: ${err.message}`);
  }

  if (records.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "CSV file has no data rows");
  }

  const missingColumns = OPPORTUNITY_BULK_UPLOAD_COLUMNS.filter((column) => !(column in records[0]));
  if (missingColumns.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `CSV is missing required column(s): ${missingColumns.join(", ")}`);
  }

  // Existing active opportunities' keys, to reject duplicates against what's
  // already in the database (not just duplicates within this file).
  const existingOpportunities = await Opportunity.find({ active: true })
    .select("opportunityId customer.name prospectName customerRequest.requestDate customerRequest.requestId customerRequest.linkType customerRequest.siteAddress")
    .lean();
  const existingKeyToOpportunityId = new Map();
  existingOpportunities.forEach((opportunity) => {
    const customerLabel = _.get(opportunity, "customer.name") || opportunity.prospectName || "";
    const key = buildCustomerRequestKey(
      customerLabel,
      _.get(opportunity, "customerRequest.requestDate", ""),
      _.get(opportunity, "customerRequest.requestId", ""),
      _.get(opportunity, "customerRequest.linkType", ""),
      _.get(opportunity, "customerRequest.siteAddress", "")
    );
    existingKeyToOpportunityId.set(key, opportunity.opportunityId);
  });

  const seenKeysInFile = new Map();
  const failedRows = [];
  const validRows = [];

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const rowNumber = i + 2; // account for the header row, 1-indexed
    const errors = [];

    const name = _.get(record, "Opportunity Name", "").trim();
    const customerName = _.get(record, "Customer Name", "").trim();
    const prospectName = _.get(record, "Prospect Name", "").trim();
    const description = _.get(record, "Description", "").trim();
    const requestId = _.get(record, "Request ID", "").trim();
    const requestDate = _.get(record, "Request Date", "").trim();
    const linkType = _.get(record, "Link Type", "").trim();
    const siteAddress = _.get(record, "Site Address", "").trim();
    const city = _.get(record, "City", "").trim();
    const state = _.get(record, "State", "").trim();
    const zipCode = _.get(record, "Zip Code", "").trim();
    const country = _.get(record, "Country", "").trim();
    const product = _.get(record, "Product", "").trim();
    const ipRequirement = _.get(record, "IP Requirement", "").trim();
    const interfaceType = _.get(record, "Interface", "").trim();
    const downBandwidth = _.get(record, "Down Bandwidth", "").trim();
    const upBandwidth = _.get(record, "Up Bandwidth", "").trim();
    const contractTerm = _.get(record, "Contract Term", "").trim();

    if (!name) errors.push("Opportunity Name is required");
    if (linkType && !linkTypeOptions.includes(linkType)) errors.push(`Link Type "${linkType}" is not a valid option`);
    if (product && !productOptions.includes(product)) errors.push(`Product "${product}" is not a valid option`);
    if (ipRequirement && !ipRequirementOptions.includes(ipRequirement)) errors.push(`IP Requirement "${ipRequirement}" is not a valid option`);
    if (interfaceType && !interfaceOptions.includes(interfaceType)) errors.push(`Interface "${interfaceType}" is not a valid option`);
    if (downBandwidth && !bandwidthOptions.includes(downBandwidth)) errors.push(`Down Bandwidth "${downBandwidth}" is not a valid option`);
    if (upBandwidth && !bandwidthOptions.includes(upBandwidth)) errors.push(`Up Bandwidth "${upBandwidth}" is not a valid option`);

    let relatedCustomer = null;
    if (customerName) {
      // eslint-disable-next-line no-await-in-loop
      const customer = await getCustomerByName(customerName);
      if (!customer || !customer.active) {
        errors.push("Customer not found or inactive");
      } else {
        relatedCustomer = customer;
      }
    } else if (!prospectName) {
      errors.push("Either Customer Name or Prospect Name is required");
    }

    const customerLabel = customerName || prospectName;
    const key = buildCustomerRequestKey(customerLabel, requestDate, requestId, linkType, siteAddress);
    if (existingKeyToOpportunityId.has(key)) {
      errors.push(
        `Duplicate: an opportunity with this Customer Name/Request Date/Request ID/Link Type/Site Address already exists (${existingKeyToOpportunityId.get(key)})`
      );
    } else if (seenKeysInFile.has(key)) {
      errors.push(`Duplicate of row ${seenKeysInFile.get(key)} in this file (same Customer Name/Request Date/Request ID/Link Type/Site Address)`);
    } else {
      seenKeysInFile.set(key, rowNumber);
    }

    if (errors.length > 0) {
      failedRows.push({ row: rowNumber, name, customerName: customerLabel, requestId, errors: errors.join("; ") });
    } else {
      validRows.push({
        relatedCustomer,
        opportunityBody: {
          name,
          prospectName: relatedCustomer ? "" : prospectName,
          description,
          customerRequest: {
            requestId,
            requestDate,
            linkType,
            siteAddress,
            city,
            state,
            zipCode,
            country,
            product,
            ipRequirement,
            interface: interfaceType,
            downBandwidth,
            upBandwidth,
            contractTerm,
          },
        },
      });
    }
  }

  if (failedRows.length > 0) {
    return { success: false, totalRows: records.length, insertedCount: 0, failedRows };
  }

  const created = [];
  for (let i = 0; i < validRows.length; i += 1) {
    const { relatedCustomer, opportunityBody } = validRows[i];
    // eslint-disable-next-line no-await-in-loop
    const opportunity = await createOpportunity(opportunityBody, actingUser, relatedCustomer);
    created.push(opportunity);
  }

  return { success: true, totalRows: records.length, insertedCount: created.length, failedRows: [] };
};

function parseOptionalNumber(rawValue, label, errors) {
  const value = (rawValue || "").trim();
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    errors.push(`${label} must be a number`);
    return null;
  }
  return parsed;
}

const SUPPLIER_RESPONSE_BULK_UPLOAD_COLUMNS = [
  "Customer Name",
  "Request Date",
  "Request Ref",
  "Link Category",
  "Address",
  "Supplier",
  "Quote Request Date",
  "LEC",
  "Currency",
  "NRC",
  "MRC",
  "Quote Submit Date",
  "Quote Status",
];

/**
 * Bulk-add/update Supplier Communication entries on existing opportunities
 * from an uploaded CSV buffer. Each row is linked back to its opportunity
 * by Customer Name + Request Date + Request Ref (Request ID) + Link
 * Category (Link Type) + Address (Site Address) - the same natural key
 * bulkUploadOpportunities enforces as unique on create, so it uniquely
 * identifies one opportunity here too. Within an opportunity, a row whose
 * Supplier matches an existing Supplier Communication entry (case
 * insensitive) updates that entry in place (logging a new status history
 * line only if the status actually changed); otherwise a new entry is
 * added. All-or-nothing per file, like bulkUploadOpportunities.
 * @param {Buffer} fileBuffer
 * @param {Object} actingUser
 * @returns {Promise<{success: boolean, totalRows: number, updatedCount: number, opportunitiesAffected: number, failedRows: Array}>}
 */
const bulkUploadSupplierResponses = async (fileBuffer, actingUser) => {
  let records;
  try {
    records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Could not parse CSV file: ${err.message}`);
  }

  if (records.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "CSV file has no data rows");
  }

  const missingColumns = SUPPLIER_RESPONSE_BULK_UPLOAD_COLUMNS.filter((column) => !(column in records[0]));
  if (missingColumns.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `CSV is missing required column(s): ${missingColumns.join(", ")}`);
  }

  const activeOpportunities = await Opportunity.find({ active: true });
  const keyToOpportunity = new Map();
  const ambiguousKeys = new Set();
  activeOpportunities.forEach((opportunity) => {
    const customerLabel = _.get(opportunity, "customer.name") || opportunity.prospectName || "";
    const key = buildCustomerRequestKey(
      customerLabel,
      _.get(opportunity, "customerRequest.requestDate", ""),
      _.get(opportunity, "customerRequest.requestId", ""),
      _.get(opportunity, "customerRequest.linkType", ""),
      _.get(opportunity, "customerRequest.siteAddress", "")
    );
    if (keyToOpportunity.has(key)) {
      ambiguousKeys.add(key);
    } else {
      keyToOpportunity.set(key, opportunity);
    }
  });

  const failedRows = [];
  const groupsByOpportunityId = new Map();

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const rowNumber = i + 2;
    const errors = [];

    const customerName = _.get(record, "Customer Name", "").trim();
    const requestDate = _.get(record, "Request Date", "").trim();
    const requestRef = _.get(record, "Request Ref", "").trim();
    const linkCategory = _.get(record, "Link Category", "").trim();
    const address = _.get(record, "Address", "").trim();
    const supplier = _.get(record, "Supplier", "").trim();
    const quoteRequestDate = _.get(record, "Quote Request Date", "").trim();
    const lec = _.get(record, "LEC", "").trim();
    const currency = _.get(record, "Currency", "").trim();
    const quoteSubmitDate = _.get(record, "Quote Submit Date", "").trim();
    const quoteStatus = _.get(record, "Quote Status", "").trim() || "Pending";

    if (!supplier) errors.push("Supplier is required");
    if (currency && !currencyCodes.includes(currency)) errors.push(`Currency "${currency}" is not a valid option`);
    if (!supplierQuoteStatusOptions.includes(quoteStatus)) errors.push(`Quote Status "${quoteStatus}" is not a valid option`);
    const nrc = parseOptionalNumber(_.get(record, "NRC", ""), "NRC", errors);
    const mrc = parseOptionalNumber(_.get(record, "MRC", ""), "MRC", errors);

    const key = buildCustomerRequestKey(customerName, requestDate, requestRef, linkCategory, address);
    let matchedOpportunity = null;
    if (ambiguousKeys.has(key)) {
      errors.push(
        "Multiple opportunities match this Customer Name/Request Date/Request Ref/Link Category/Address combination - cannot determine which one to update"
      );
    } else {
      matchedOpportunity = keyToOpportunity.get(key);
      if (!matchedOpportunity) {
        errors.push("No matching opportunity found for this Customer Name/Request Date/Request Ref/Link Category/Address combination");
      }
    }

    if (errors.length > 0) {
      failedRows.push({ row: rowNumber, customerName, requestRef, supplier, errors: errors.join("; ") });
    } else {
      const opportunityKey = String(matchedOpportunity._id);
      if (!groupsByOpportunityId.has(opportunityKey)) {
        groupsByOpportunityId.set(opportunityKey, { opportunity: matchedOpportunity, rows: [] });
      }
      groupsByOpportunityId.get(opportunityKey).rows.push({ supplier, quoteRequestDate, currency, lec, nrc, mrc, quoteSubmitDate, quoteStatus });
    }
  }

  if (failedRows.length > 0) {
    return { success: false, totalRows: records.length, updatedCount: 0, opportunitiesAffected: 0, failedRows };
  }

  let updatedCount = 0;
  const groups = Array.from(groupsByOpportunityId.values());
  for (let i = 0; i < groups.length; i += 1) {
    const { opportunity, rows } = groups[i];
    const now = new Date().toISOString();
    rows.forEach((row) => {
      const matchIndex = opportunity.supplierCommunications.findIndex(
        (entry) => (entry.supplier || "").trim().toLowerCase() === row.supplier.trim().toLowerCase()
      );
      if (matchIndex === -1) {
        opportunity.supplierCommunications.push({
          supplier: row.supplier,
          quoteRequestDate: row.quoteRequestDate,
          currency: row.currency,
          lec: row.lec,
          nrc: row.nrc,
          mrc: row.mrc,
          quoteSubmitDate: row.quoteSubmitDate,
          quoteStatus: row.quoteStatus,
          statusHistory: [{ status: row.quoteStatus, changedAt: now, currency: row.currency || "", nrc: row.nrc ?? null, mrc: row.mrc ?? null }],
        });
      } else {
        const existing = opportunity.supplierCommunications[matchIndex];
        const statusChanged = row.quoteStatus !== existing.quoteStatus;
        existing.supplier = row.supplier;
        existing.quoteRequestDate = row.quoteRequestDate;
        existing.currency = row.currency;
        existing.lec = row.lec;
        existing.nrc = row.nrc;
        existing.mrc = row.mrc;
        existing.quoteSubmitDate = row.quoteSubmitDate;
        existing.quoteStatus = row.quoteStatus;
        if (statusChanged) {
          existing.statusHistory = _.concat(existing.statusHistory || [], {
            status: row.quoteStatus,
            changedAt: now,
            currency: row.currency || "",
            nrc: row.nrc ?? null,
            mrc: row.mrc ?? null,
          });
        }
      }
      updatedCount += 1;
    });
    opportunity.updatedBy = extractUserDetails(actingUser);
    // eslint-disable-next-line no-await-in-loop
    await opportunity.save();
  }

  return { success: true, totalRows: records.length, updatedCount, opportunitiesAffected: groups.length, failedRows: [] };
};

module.exports = {
  createOpportunity,
  queryOpportunities,
  getSalesDashboardSummary,
  getOpportunityById,
  getActiveOpportunityById,
  updateOpportunityById,
  addSupplierCommunicationAttachments,
  getSupplierCommunicationAttachment,
  deactivateOpportunityById,
  restoreOpportunityById,
  permanentlyDeleteOpportunityById,
  bulkUploadOpportunities,
  bulkUploadSupplierResponses,
};
