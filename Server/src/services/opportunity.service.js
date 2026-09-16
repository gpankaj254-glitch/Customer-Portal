const httpStatus = require("http-status");
const _ = require("lodash");
const moment = require("moment");
const { Opportunity, Counter } = require("../models");
const ApiError = require("../utils/ApiError");
const { extractUserDetails, extractNameAndCode } = require("../utils/extractors");

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
  // entry's statusHistory has to be explicitly carried over here or it would
  // be silently dropped on save - a brand new entry (no _id yet) gets seeded
  // with its initial status, an existing entry only gets a new log line when
  // its status actually changed, otherwise its prior history is preserved.
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
      return { ...entry, statusHistory };
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

module.exports = {
  createOpportunity,
  queryOpportunities,
  getSalesDashboardSummary,
  getOpportunityById,
  getActiveOpportunityById,
  updateOpportunityById,
  deactivateOpportunityById,
  restoreOpportunityById,
  permanentlyDeleteOpportunityById,
};
