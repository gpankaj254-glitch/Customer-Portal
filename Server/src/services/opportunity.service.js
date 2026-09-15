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
  getOpportunityById,
  getActiveOpportunityById,
  updateOpportunityById,
  deactivateOpportunityById,
  restoreOpportunityById,
  permanentlyDeleteOpportunityById,
};
