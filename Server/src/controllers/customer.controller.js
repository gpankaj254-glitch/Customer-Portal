const httpStatus = require("http-status");
const _ = require("lodash");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { customerService } = require("../services");
const logger = require("../config/logger");
const { createGetCustomerFilter, activeOnly } = require("../utils/filters");

const getOrCreateCustomerByName = async (name) => {
  let customer = await customerService.getCustomerByName(name);
  if (!customer) {
    // customerService.createCustomer already creates the customer's default
    // region and returns it attached - calling createDefaultRegion again
    // here (as this used to) tries to create a second "global" region with
    // the same code and throws a duplicate-key error, even though the
    // customer was already created successfully.
    customer = await customerService.createCustomer({ name });
  }
  return customer;
};

const createCustomer = catchAsync(async (req, res) => {
  logger.debug(`req.user ----> ${JSON.stringify(req.user)}`);

  const customerBody = req.body[0];
  const customer = await customerService.createCustomer(customerBody);
  if (!customer) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to create Customer"
    );
  }
  res.status(httpStatus.CREATED).send([customer]);
});

const getCustomers = catchAsync(async (req, res) => {
  logger.debug(`req.user ----> ${JSON.stringify(req.user)}`);

  const search = _.trim(_.get(req.body, "search", ""));
  const baseFilter = _.omit(req.body, "search");
  const filter = activeOnly(createGetCustomerFilter(req.user, baseFilter));

  if (search) {
    _.assign(filter, {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ],
    });
  }

  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await customerService.queryCustomers(filter, options);
  res.send(result);
});

const getCustomer = catchAsync(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found");
  }

  res.send(customer);
});

const updateCustomer = catchAsync(async (req, res) => {
  const customer = await customerService.updateCustomerById(
    req.params.customerId,
    req.body,
    req.user
  );
  res.send(customer);
});

const deactivateCustomer = catchAsync(async (req, res) => {
  await customerService.deactivateCustomerById(req.params.customerId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const getDeletedCustomers = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await customerService.queryCustomers({ active: false }, options);
  res.send(result);
});

const restoreCustomer = catchAsync(async (req, res) => {
  const customer = await customerService.restoreCustomerById(req.params.customerId);
  res.send(customer);
});

const permanentlyDeleteCustomer = catchAsync(async (req, res) => {
  await customerService.permanentlyDeleteCustomerById(req.params.customerId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deactivateCustomer,
  getDeletedCustomers,
  restoreCustomer,
  permanentlyDeleteCustomer,
  getOrCreateCustomerByName,
};
