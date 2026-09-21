/* eslint-disable eqeqeq */
const httpStatus = require("http-status");
// const { custom } = require("joi");
const crypto = require("crypto");
const _ = require("lodash");
const moment = require("moment");
const { parse } = require("csv-parse/sync");
const { roleTypes, isCustomerRole } = require("../config/roles");
const { problemTypeOptions, priorityOptions, siteAccessHoursOptions } = require("../config/ticketOptions");
// const logger = require("../config/logger");
const { Ticket, Circuit, Counter } = require("../models");
const ApiError = require("../utils/ApiError");
const { createCodeFromName } = require("../utils/creators");
const { uploadBuffer } = require("../utils/s3");
const { getVendorById } = require("./vendor.service");
const { getCustomerByName } = require("./customer.service");
const { getSiteByCustomerAndName } = require("./site.service");

// "YYYY-MM-DDTHH:mm" wall-clock shape (datetime-local) - what Problem Start Date
// and Time is saved as, and what closedAtLocal is sent as.
const WALL_CLOCK = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Build a unique S3 key for an uploaded file under a given prefix, keeping
 * the original name (sanitized) at the end for readability in the bucket.
 * @param {string} prefix - e.g. "tickets/<ticketId>" or "tickets/<ticketId>/vendor"
 * @param {string} originalName
 * @returns {string}
 */
const buildAttachmentKey = (prefix, originalName) => {
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  return `${prefix}/${unique}-${safeName}`;
};

/**
 * Atomically reserve the next serial for a given ticket-number prefix and
 * build the full ticket number: <prefix><YY><MM><4-digit serial>. The serial
 * is scoped to prefix+year+month, so it naturally resets every month and
 * stays unique even if two customers share the same first letter.
 * @param {string} prefix
 * @returns {Promise<string>}
 */
const generateTicketNumber = async (prefix) => {
  const now = moment();
  const yy = now.format("YY");
  const mm = now.format("MM");
  const counter = await Counter.findOneAndUpdate(
    { _id: `ticketNumber-${prefix}${yy}${mm}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const serial = String(counter.seq).padStart(4, "0");
  return `${prefix}${yy}${mm}${serial}`;
};

/**
 * Ticket number prefix is the first letter of the customer's name for a
 * customer-created ticket, or "INT" (internal) for one SCX creates.
 * @param {Object} ticketToCreate
 * @param {Object} user
 * @returns {Promise<string>}
 */
const getNextTicketNumber = async (ticketToCreate, user) => {
  if (isCustomerRole(user.role)) {
    const namePrefix = _.get(ticketToCreate, "customer.name", "").trim().charAt(0).toUpperCase() || "X";
    return generateTicketNumber(namePrefix);
  }
  return generateTicketNumber("INT");
};

// const { createCodeFromName } = require("../utils/creators");
const {
  extractNameAndCode,
  extractUserDetails,
} = require("../utils/extractors");
// const { getActiveSiteById } = require("./site.service");

function getLatestUpdate(status, comment, user) {
  return {
    status,
    comment,
    user: extractUserDetails(user),
    updatedAt: moment().toISOString(),
  };
}

function getUpdatedHistory(history, latestUpdate) {
  return _.concat(history, latestUpdate);
}

const updateAndSave = async (ticket, status, comment, user) => {
  _.set(ticket, "latestUpdate", getLatestUpdate(status, comment, user));
  _.set(
    ticket,
    "history",
    getUpdatedHistory(ticket.history, ticket.latestUpdate)
  );
  // logger.debug(`newTicket ----> ${JSON.stringify(ticket)}`);

  return ticket.save();
};

/**
 * Create a site
 * @param {Object} ticketBody
 * @param {Object} circuit
 * @param {Object} user
 * @returns {Promise<Site>}
 */
const createTicket = async (ticketBody, circuit, user) => {
  let ticketToCreate = _.pick(ticketBody, [
    "customerReference",
    "problemType",
    "problemStartDate",
    "priority",
    "description",
  ]);
  // The create form has no separate "subject" field - use the problem type
  // so anything still displaying/relying on subject has something sensible.
  ticketToCreate.subject = ticketBody.problemType;
  ticketToCreate.otherProblemDetails =
    ticketBody.problemType === "Other" ? _.trim(ticketBody.otherProblemDetails) : "";
  ticketToCreate.status = "Submitted";
  ticketToCreate.siteChecklist = _.pick(ticketBody.siteChecklist, [
    "powerAvailable",
    "physicalConnectionCheck",
    "siteAccessHours",
    "siteAccessHoursOtherText",
  ]);
  ticketToCreate = _.assign(
    ticketToCreate,
    _.pick(circuit, ["site", "customer", "region", "provider"])
  );
  // Circuit has no "name" field of its own (unlike Site/Region/Customer) -
  // fall back to its vendor/customer circuit id (or code) as a display name.
  ticketToCreate.circuit = extractNameAndCode(circuit);
  ticketToCreate.circuit.name = circuit.vendorCircuitId || circuit.customerCircuitId || circuit.code;
  ticketToCreate.vendorCircuitId = circuit.vendorCircuitId || "";
  if (circuit.vendorId) {
    const vendor = await getVendorById(circuit.vendorId);
    if (vendor) {
      ticketToCreate.vendor = extractNameAndCode(vendor);
    }
  }
  ticketToCreate.ticketId = await getNextTicketNumber(ticketToCreate, user);
  _.set(
    ticketToCreate,
    "latestUpdate",
    getLatestUpdate("Submitted", ticketBody.description, user)
  );
  _.set(
    ticketToCreate,
    "history",
    getUpdatedHistory([], ticketToCreate.latestUpdate)
  );

  return Ticket.create(ticketToCreate);
};

/**
 * Query for tickets
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTickets = async (filter, options) => {
  const tickets = await Ticket.paginate(filter, options);
  return tickets;
};

/**
 * Get ticket by id
 * @param {ObjectId} ticketId
 * @returns {Promise<Ticket>}
 */
const getTicketById = async (ticketId) => {
  return Ticket.findOne({ _id: ticketId });
};

/**
 * @param {ObjectId} ticketId
 * @returns {Promise<Site>}
 */
const getActiveTicketById = async (ticketId) => {
  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket not found");
  } else if (!ticket.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Ticket is not active");
  }
  return ticket;
};

/**
 * @param {ObjectId} ticketId
 * @param {Object} user
 * @returns {Promise<Contact>}
 */
const getAuthorizedTicket = async (ticketId, user) => {
  const ticket = await getActiveTicketById(ticketId);
  if (
    user.role == roleTypes.customerAdmin ||
    user.role == roleTypes.customerUser
  ) {
    if (_.get(ticket, "customer.id") != _.get(user, "customer.id")) {
      // logger.debug(`ticketToCreate ----> ${JSON.stringify(ticketToCreate)}`);

      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized for this ticket"
      );
    }
  }
  return ticket;
};

/**
 * Update a ticket's editable fields (Problem Type, Customer Reference,
 * Priority, Status, SCX Internal Comments, Vendor Communication tab fields)
 * and log the status change in the activity history. Circuit/Site/Customer/
 * Region/Vendor stay fixed - a ticket is never re-associated with a
 * different circuit. Description/Vendor Description are not editable here -
 * they can only be appended to (see appendTicketDescription /
 * appendVendorDescription), so the original text is always preserved.
 * @param {Object} ticketBody
 * @param {Object} user
 * @returns {Promise<Ticket>}
 */
const CLOSURE_DETAIL_FIELDS = [
  "rfoStatus",
  "ticketStartDateTime",
  "actualIssueStartDateTime",
  "reportedToSupplier",
  "resolvedFromSupplier",
  "issueReportedResolvedToAryaka",
  "actualDownTimeMinutes",
  "issueResolvedDateTime",
  "overallDownTime",
  "rfo",
  "reason",
  "reasonCode",
  "remarks",
  "scloudxBucket",
  "supplierBucket",
  "customerBucket",
  "category",
  "totalMinutes",
  "downTimeMinutes",
  "uptimePercent",
  "downTimeHours",
];

const updateTicket = async (ticketBody, user) => {
  const {
    ticketId,
    problemType,
    otherProblemDetails,
    customerReference,
    priority,
    status,
    closureCode,
    closedAt,
    closedAtLocal,
    scxInternalComments,
    vendorTicketId,
    vendorTicketCreateDate,
    vendorTicketStatus,
    vendorTicketClosureDate,
  } = ticketBody;
  const ticket = await getAuthorizedTicket(ticketId, user);

  // Completed is final - no further edits through this endpoint at all.
  if (ticket.status === "Completed") {
    throw new ApiError(httpStatus.BAD_REQUEST, "This ticket is completed and can no longer be modified");
  }

  if (ticket.status === "Closed") {
    // Once Closed, the rest of the ticket is frozen - only Ticket Closure
    // details may still be edited, via the Closed Tickets tab, and the only
    // status change allowed from here is on to Completed (or resaving
    // Closure details while staying Closed).
    if (status !== "Closed" && status !== "Completed") {
      throw new ApiError(httpStatus.BAD_REQUEST, "A closed ticket can only stay Closed or be marked Completed");
    }
    CLOSURE_DETAIL_FIELDS.forEach((field) => {
      if (ticketBody[field] !== undefined) {
        ticket.closureDetails[field] = ticketBody[field];
      }
    });
    ticket.status = status;
    return updateAndSave(ticket, status, "", user);
  }

  // Ticket is still open - normal full edit, with the option to close it.
  // Completed is only reachable from Closed (see above), never directly.
  if (status === "Completed") {
    throw new ApiError(httpStatus.BAD_REQUEST, "A ticket must be Closed before it can be marked Completed");
  }
  if (status === "Closed" && !closureCode) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Closure Code is required to close a ticket");
  }

  // Closed Date and Time - entered by the user when closing (defaults to
  // now). Must not precede the Problem Start Date and Time (the ticket's
  // creation time is deliberately not a limit) or lie in the future (5 min
  // of slack for clock skew between browser and server).
  let closedAtDate = new Date();
  if (status === "Closed" && closedAt) {
    closedAtDate = new Date(closedAt);
    // Problem Start is saved as a "YYYY-MM-DDTHH:mm" string with no time zone,
    // so it is compared with the closer's own wall-clock closedAtLocal (same
    // shape) rather than with the UTC closedAt instant. Anything else (older
    // clients, free text from a bulk import) has no reliable frame - skipped.
    const problemStart = _.trim(ticket.problemStartDate);
    if (WALL_CLOCK.test(problemStart) && WALL_CLOCK.test(closedAtLocal || "") && closedAtLocal.slice(0, 16) < problemStart.slice(0, 16)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Closed Date and Time cannot be before the Problem Start Date and Time");
    }
    if (closedAtDate > moment().add(5, "minutes").toDate()) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Closed Date and Time cannot be in the future");
    }
  }

  if (problemType !== undefined) ticket.problemType = problemType;
  if (otherProblemDetails !== undefined) ticket.otherProblemDetails = _.trim(otherProblemDetails);
  if (ticket.problemType !== "Other") ticket.otherProblemDetails = "";
  if (customerReference !== undefined) ticket.customerReference = customerReference;
  if (priority !== undefined) ticket.priority = priority;
  if (closureCode !== undefined) ticket.closureCode = closureCode;
  if (scxInternalComments !== undefined) ticket.scxInternalComments = scxInternalComments;
  if (vendorTicketId !== undefined) ticket.vendorTicketId = vendorTicketId;
  if (vendorTicketCreateDate !== undefined) ticket.vendorTicketCreateDate = vendorTicketCreateDate;
  if (vendorTicketStatus !== undefined) ticket.vendorTicketStatus = vendorTicketStatus;
  if (vendorTicketClosureDate !== undefined) ticket.vendorTicketClosureDate = vendorTicketClosureDate;

  ticket.status = status;
  ticket.closed = status === "Closed";
  if (status === "Closed" && !ticket.downTime) {
    const created = _.get(ticket, "history[0].updatedAt");
    if (created) {
      // Closing may now be dated before creation (see above) - never store a negative downtime.
      ticket.downTime = Math.max(0, moment.duration(moment(closedAtDate).diff(created)).asMinutes());
    }
    ticket.closedAt = closedAtDate;
  }

  return updateAndSave(ticket, status, "", user);
};

/**
 * Append a note to a ticket's Description without disturbing what is
 * already there - the original text (and any prior appended notes) is
 * kept, and the new note is added as its own dated/attributed block.
 * @param {Object} ticketBody
 * @param {Object} user
 * @returns {Promise<Ticket>}
 */
const appendTicketDescription = async (ticketBody, user) => {
  const { ticketId, descriptionAppend } = ticketBody;
  const ticket = await getAuthorizedTicket(ticketId, user);

  if (ticket.closed) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot add comments to a closed ticket");
  }

  const authorName = _.get(user, "name") || _.get(user, "email") || "";
  const timestamp = moment().format("DD/MM/YYYY hh:mm A");
  const notedBlock = `[${timestamp} - ${authorName}]: ${descriptionAppend}`;
  ticket.description = ticket.description
    ? `${ticket.description}\n\n${notedBlock}`
    : notedBlock;

  return updateAndSave(ticket, ticket.status, descriptionAppend, user);
};

/**
 * Vendor Communication counterpart to appendTicketDescription - appends a
 * dated/attributed note to vendorDescription without disturbing what's
 * already there. SCX-only (Vendor Communication is not visible to customers).
 * @param {Object} ticketBody
 * @param {Object} user
 * @returns {Promise<Ticket>}
 */
const appendVendorDescription = async (ticketBody, user) => {
  const { ticketId, descriptionAppend } = ticketBody;
  const ticket = await getAuthorizedTicket(ticketId, user);

  if (ticket.closed) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot add comments to a closed ticket");
  }

  const authorName = _.get(user, "name") || _.get(user, "email") || "";
  const timestamp = moment().format("DD/MM/YYYY hh:mm A");
  const notedBlock = `[${timestamp} - ${authorName}]: ${descriptionAppend}`;
  ticket.vendorDescription = ticket.vendorDescription
    ? `${ticket.vendorDescription}\n\n${notedBlock}`
    : notedBlock;

  return updateAndSave(ticket, ticket.status, descriptionAppend, user);
};

/**
 * Attach one or more uploaded files to a ticket for reference/investigation
 * (photos, graphs, logs, etc). Available to the same roles/conditions as
 * appendTicketDescription - not allowed once the ticket is closed.
 * @param {string} ticketId
 * @param {Array} files - multer file objects (memory storage - have .buffer)
 * @param {Object} user
 * @returns {Promise<Ticket>}
 */
const addTicketAttachments = async (ticketId, files, user) => {
  const ticket = await getAuthorizedTicket(ticketId, user);

  if (ticket.closed) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot add attachments to a closed ticket");
  }

  const uploadedBy = extractUserDetails(user);
  const uploadedAt = moment().toISOString();
  const attachments = await Promise.all(
    files.map(async (file) => {
      const key = buildAttachmentKey(`tickets/${ticketId}`, file.originalname);
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
  ticket.attachments = _.concat(ticket.attachments, attachments);

  const fileNames = attachments.map((attachment) => attachment.originalName).join(", ");
  return updateAndSave(ticket, ticket.status, `Attachment(s) added: ${fileNames}`, user);
};

/**
 * Vendor Communication counterpart to addTicketAttachments - stored
 * separately (vendorAttachments) from the customer-facing attachments.
 * @param {string} ticketId
 * @param {Array} files - multer file objects (memory storage - have .buffer)
 * @param {Object} user
 * @returns {Promise<Ticket>}
 */
const addVendorAttachments = async (ticketId, files, user) => {
  const ticket = await getAuthorizedTicket(ticketId, user);

  if (ticket.closed) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot add attachments to a closed ticket");
  }

  const uploadedBy = extractUserDetails(user);
  const uploadedAt = moment().toISOString();
  const attachments = await Promise.all(
    files.map(async (file) => {
      const key = buildAttachmentKey(`tickets/${ticketId}/vendor`, file.originalname);
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
  ticket.vendorAttachments = _.concat(ticket.vendorAttachments, attachments);

  const fileNames = attachments.map((attachment) => attachment.originalName).join(", ");
  return updateAndSave(ticket, ticket.status, `Vendor attachment(s) added: ${fileNames}`, user);
};

/**
 * @param {ObjectId} ticketId
 * @param {String} contactId
 * @returns {Promise<Ticket>}
 */
const addContact = async (ticketId, contactId) => {
  const ticket = await getActiveTicketById(ticketId);
  const contacts = _.concat(ticket.contacts, contactId);
  _.set(ticket, "contactPersons", contacts);
  await ticket.save();
  return ticket;
};

/**
 * Deactivate ticket by id
 * @param {ObjectId} ticketId
 * @param {Object} actingUser
 * @returns {Promise<Ticket>}
 */
const deactivateTicketById = async (ticketId, actingUser) => {
  const ticket = await getActiveTicketById(ticketId);
  ticket.active = false;
  ticket.deletedAt = new Date();
  ticket.deletedBy = extractUserDetails(actingUser);
  await ticket.save();
  return ticket;
};

/**
 * Restore a deleted ticket by id
 * @param {ObjectId} ticketId
 * @returns {Promise<Ticket>}
 */
const restoreTicketById = async (ticketId) => {
  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket not found");
  } else if (ticket.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Ticket is already active");
  }
  ticket.active = true;
  ticket.deletedAt = null;
  ticket.deletedBy = null;
  await ticket.save();
  return ticket;
};

/**
 * Permanently remove a soft-deleted ticket from the database.
 * @param {ObjectId} ticketId
 * @returns {Promise<void>}
 */
const permanentlyDeleteTicketById = async (ticketId) => {
  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket not found");
  }
  if (ticket.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Ticket must be deleted before it can be permanently removed");
  }
  await Ticket.deleteOne({ _id: ticketId });
};

/**
 * Look up one attachment's stored metadata on a ticket the requesting user
 * is authorized to see, for a secure (auth-checked) download.
 * @param {string} ticketId
 * @param {string} attachmentId - the attachment subdocument's _id
 * @param {Object} user
 * @returns {Promise<Object>}
 */
const getTicketAttachment = async (ticketId, attachmentId, user) => {
  const ticket = await getAuthorizedTicket(ticketId, user);
  const attachment = ticket.attachments.id(attachmentId);
  if (!attachment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attachment not found");
  }
  if (!attachment.key) {
    throw new ApiError(httpStatus.NOT_FOUND, "This attachment predates S3 storage and is no longer available");
  }
  return attachment;
};

/**
 * Vendor Communication counterpart to getTicketAttachment.
 * @param {string} ticketId
 * @param {string} attachmentId
 * @param {Object} user
 * @returns {Promise<Object>}
 */
const getVendorAttachment = async (ticketId, attachmentId, user) => {
  const ticket = await getAuthorizedTicket(ticketId, user);
  const attachment = ticket.vendorAttachments.id(attachmentId);
  if (!attachment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Attachment not found");
  }
  if (!attachment.key) {
    throw new ApiError(httpStatus.NOT_FOUND, "This attachment predates S3 storage and is no longer available");
  }
  return attachment;
};

/**
 * @param {Array} ticketIds
 * @returns {Promise<Contact>}
 */
const getActiveTicketsById = async (ticketIds) => {
  const tickets = await Promise.all(
    ticketIds.map(async (ticketId) => {
      const ticket = await getTicketById(ticketId);
      if (ticket && ticket.active) {
        return _.pick(ticket, [
          "code",
          "orderReference",
          // "id",
          "provider",
          "providerTicketId",
          "customerTicketId",
        ]);
        // return ticket;
      }
    })
  );
  return _.compact(tickets);
};

const BULK_UPLOAD_COLUMNS = [
  "Customer Name",
  "Site Name",
  "Vendor Circuit ID",
  "Problem Type",
  "Priority",
  "Description",
  "Customer Reference",
  "Problem Start Date",
  "Power Available",
  "Physical Connection Check",
  "Site Access Hours",
  "Site Access Hours Other Text",
];

// Power Available / Physical Connection Check are the only two boolean
// fields on the create form - "" is treated as not-checked (false), same as
// the checkboxes' own unchecked default, rather than being an error.
function parseYesNo(rawValue, label, errors) {
  const value = (rawValue || "").trim();
  if (!value) return false;
  if (/^yes$/i.test(value)) return true;
  if (/^no$/i.test(value)) return false;
  errors.push(`${label} must be "Yes" or "No"`);
  return false;
}

/**
 * Bulk-create tickets from an uploaded CSV buffer. SCX-only (unlike normal
 * ticket creation, which Customers can also do) - see bulkUpload right.
 * Each row identifies its Circuit by Customer Name + Site Name + Vendor
 * Circuit ID (the same natural key Circuit bulk upload itself matches on),
 * not a raw circuitId, since a human filling in a spreadsheet has no way to
 * know a Mongo id. Unlike Site/Circuit/Vendor bulk upload, there is no
 * "duplicate" check - creating several tickets against the same circuit is
 * completely normal (that's exactly what happens over a circuit's life),
 * so nothing here treats repeated rows as an error. Only inserts anything
 * if every row passes (all-or-nothing), and does not fire the
 * ticket-created email alert per row - that notification is for a single
 * live submission, not a bulk/historical import.
 * @param {Buffer} fileBuffer
 * @param {Object} actingUser
 * @returns {Promise<{success: boolean, totalRows: number, insertedCount: number, failedRows: Array}>}
 */
const bulkUploadTickets = async (fileBuffer, actingUser) => {
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

  const missingColumns = BULK_UPLOAD_COLUMNS.filter((column) => !(column in records[0]));
  if (missingColumns.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `CSV is missing required column(s): ${missingColumns.join(", ")}`);
  }

  const failedRows = [];
  const validRows = [];

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const rowNumber = i + 2; // account for the header row, 1-indexed
    const customerName = _.get(record, "Customer Name", "").trim();
    const siteName = _.get(record, "Site Name", "").trim();
    const vendorCircuitId = _.get(record, "Vendor Circuit ID", "").trim();
    const problemType = _.get(record, "Problem Type", "").trim();
    const priority = _.get(record, "Priority", "").trim();
    const description = _.get(record, "Description", "").trim();
    const siteAccessHours = _.get(record, "Site Access Hours", "").trim();
    const errors = [];

    if (!customerName) errors.push("Customer Name is required");
    if (!siteName) errors.push("Site Name is required");
    if (!vendorCircuitId) errors.push("Vendor Circuit ID is required");
    if (!problemType) errors.push("Problem Type is required");
    else if (!problemTypeOptions.includes(problemType)) errors.push(`Problem Type "${problemType}" is not a valid option`);
    if (!priority) errors.push("Priority is required");
    else if (!priorityOptions.includes(priority)) errors.push(`Priority "${priority}" is not a valid option`);
    if (!description) errors.push("Description is required");
    if (siteAccessHours && !siteAccessHoursOptions.includes(siteAccessHours)) {
      errors.push(`Site Access Hours "${siteAccessHours}" is not a valid option`);
    }

    const powerAvailable = parseYesNo(_.get(record, "Power Available", ""), "Power Available", errors);
    const physicalConnectionCheck = parseYesNo(_.get(record, "Physical Connection Check", ""), "Physical Connection Check", errors);

    let circuit = null;
    if (customerName && siteName) {
      // eslint-disable-next-line no-await-in-loop
      const customer = await getCustomerByName(customerName);
      if (!customer || !customer.active) {
        errors.push("Customer not found or inactive");
      } else {
        // eslint-disable-next-line no-await-in-loop
        const site = await getSiteByCustomerAndName(customer, siteName);
        if (!site || !site.active) {
          errors.push("Site not found for this customer, or inactive");
        } else if (vendorCircuitId) {
          const code = createCodeFromName(vendorCircuitId, site.code);
          // eslint-disable-next-line no-await-in-loop
          const matchedCircuit = await Circuit.findOne({ code });
          if (!matchedCircuit || !matchedCircuit.active) {
            errors.push("Circuit not found for this Vendor Circuit ID at this site, or inactive");
          } else {
            circuit = matchedCircuit;
          }
        }
      }
    }

    if (errors.length > 0) {
      failedRows.push({ row: rowNumber, customerName, siteName, vendorCircuitId, errors: errors.join("; ") });
    } else {
      validRows.push({
        circuit,
        ticketBody: {
          problemType,
          priority,
          description,
          customerReference: _.get(record, "Customer Reference", "").trim(),
          problemStartDate: _.get(record, "Problem Start Date", "").trim(),
          siteChecklist: {
            powerAvailable,
            physicalConnectionCheck,
            siteAccessHours,
            siteAccessHoursOtherText: _.get(record, "Site Access Hours Other Text", "").trim(),
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
    const { circuit, ticketBody } = validRows[i];
    // eslint-disable-next-line no-await-in-loop
    const ticket = await createTicket(ticketBody, circuit, actingUser);
    created.push(ticket);
  }

  return { success: true, totalRows: records.length, insertedCount: created.length, failedRows: [] };
};

module.exports = {
  createTicket,
  bulkUploadTickets,
  queryTickets,
  getTicketById,
  updateTicket,
  appendTicketDescription,
  addTicketAttachments,
  getTicketAttachment,
  appendVendorDescription,
  addVendorAttachments,
  getVendorAttachment,
  deactivateTicketById,
  restoreTicketById,
  permanentlyDeleteTicketById,
  getActiveTicketById,
  addContact,
  // createTicketBySite,
  getActiveTicketsById,
  getAuthorizedTicket,
};
