const httpStatus = require("http-status");
const _ = require("lodash");
const pick = require("../utils/pick");
const catchAsync = require("../utils/catchAsync");
const { opportunityService, customerService } = require("../services");
const { activeOnly } = require("../utils/filters");

const getRelatedCustomer = async (customerId, user) => {
  if (!customerId) {
    return null;
  }
  return customerService.getAuthorizedCustomer(customerId, user);
};

const createOpportunity = catchAsync(async (req, res) => {
  const customerId = _.get(req, "body[0].customerId");
  const relatedCustomer = await getRelatedCustomer(customerId, req.user);
  const opportunity = await opportunityService.createOpportunity(req.body[0], req.user, relatedCustomer);
  res.status(httpStatus.CREATED).send(opportunity);
});

const getOpportunities = catchAsync(async (req, res) => {
  const filter = activeOnly({});
  const search = _.trim(_.get(req.body, "search", ""));
  if (search) {
    _.assign(filter, {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { opportunityId: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { prospectName: { $regex: search, $options: "i" } },
      ],
    });
  }
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await opportunityService.queryOpportunities(filter, options);
  res.send(result);
});

const getOpportunity = catchAsync(async (req, res) => {
  const opportunity = await opportunityService.getActiveOpportunityById(req.params.opportunityId);
  res.send(opportunity);
});

const updateOpportunity = catchAsync(async (req, res) => {
  const customerId = _.get(req, "body.customerId");
  const relatedCustomer = await getRelatedCustomer(customerId, req.user);
  const opportunity = await opportunityService.updateOpportunityById(
    req.params.opportunityId,
    req.body,
    req.user,
    relatedCustomer
  );
  res.send(opportunity);
});

const deactivateOpportunity = catchAsync(async (req, res) => {
  await opportunityService.deactivateOpportunityById(req.params.opportunityId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const getDeletedOpportunities = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await opportunityService.queryOpportunities({ active: false }, options);
  res.send(result);
});

const restoreOpportunity = catchAsync(async (req, res) => {
  const opportunity = await opportunityService.restoreOpportunityById(req.params.opportunityId);
  res.send(opportunity);
});

const permanentlyDeleteOpportunity = catchAsync(async (req, res) => {
  await opportunityService.permanentlyDeleteOpportunityById(req.params.opportunityId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createOpportunity,
  getOpportunities,
  getOpportunity,
  updateOpportunity,
  deactivateOpportunity,
  getDeletedOpportunities,
  restoreOpportunity,
  permanentlyDeleteOpportunity,
};
