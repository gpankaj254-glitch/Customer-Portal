const httpStatus = require("http-status");
// const { custom } = require("joi");
// const _ = require("lodash");
// const logger = require("../config/logger");
const _ = require("lodash");
const { Customer, Site, User } = require("../models");
const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");
const { createCodeFromName } = require("../utils/creators");
const { extractUserDetails } = require("../utils/extractors");
const { isScloudxUser } = require("../config/roles");
// const { createRegion } = require("./region.service");

/**
 * @param {ObjectId} customerId
 * @returns {Promise<Customer>}
 */
const getCustomerById = async (customerId) => {
  logger.debug(`getCustomerById ----> ${customerId}`);
  return Customer.findOne({ _id: customerId });
};

/**
 * @param {ObjectId} customerId
 * @returns {Promise<Region>}
 */
const getActiveCustomerById = async (customerId) => {
  const customer = await getCustomerById(customerId);
  logger.debug(`getActiveCustomerById ----> ${customer}`);
  if (!customer) {
    logger.debug(`getActiveCustomerById ----> ${customerId}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found");
  } else if (!customer.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Customer is not active");
  }
  return customer;
};

/**
 * Create a customer
 * @param {Object} customerBody
 * @returns {Promise<Customer>}
 */
const createCustomer = async (customerBody) => {
  const name = _.get(customerBody, "name");
  logger.debug(`creating customer : ${name}`);

  const customerToCreate = {
    name,
    code: createCodeFromName(name),
  };
  const customer = await Customer.create(customerToCreate);

  // Lazy require: region.service.js requires customer.service.js at the top
  // level (both destructured and as a whole module), so a top-level require
  // here would create a circular dependency and risk customerService.addRegion
  // resolving to undefined depending on load order. Requiring it inside the
  // function body defers resolution until both modules have fully loaded.
  const { createDefaultRegion } = require("./region.service");
  // createDefaultRegion creates a "global" Region for this customer and sets
  // customer.defaultRegion to it, returning the updated customer document.
  return createDefaultRegion(customer);
};

/**
 * @param {String} name
 * @returns {Promise<Customer>}
 */
const getCustomerByName = async (name) => {
  logger.debug(`getting customer by name : ${name}`);
  const code = createCodeFromName(name);
  return Customer.findOne({ code });
};

/**
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryCustomers = async (filter, options) => {
  const customers = await Customer.paginate(filter, options);
  return customers;
};

/**
 * Update customer by id
 * @param {ObjectId} customerId
 * @param {Object} updateBody
 * @param {Object} actingUser
 * @returns {Promise<Customer>}
 */
const updateCustomerById = async (customerId, updateBody, actingUser) => {
  const customer = await getActiveCustomerById(customerId);
  Object.assign(customer, updateBody);
  customer.updatedBy = extractUserDetails(actingUser);
  await customer.save();
  return customer;
};

/**
 * Deactivate customer by id. Blocks if the customer has any active sites or
 * users - the admin must delete those first, rather than this silently
 * cascading to them.
 * @param {ObjectId} customerId
 * @param {Object} actingUser
 * @returns {Promise<Customer>}
 */
const deactivateCustomerById = async (customerId, actingUser) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found");
  } else if (!customer.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Customer is not active");
  }

  const [activeSiteCount, activeUserCount] = await Promise.all([
    Site.countDocuments({ "customer.id": customerId, active: true }),
    User.countDocuments({ "customer.id": customerId, active: true }),
  ]);
  if (activeSiteCount > 0 || activeUserCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete customer: ${activeSiteCount} active site(s) and ${activeUserCount} active user(s) still reference it. Delete them first.`
    );
  }

  customer.active = false;
  customer.deletedAt = new Date();
  customer.deletedBy = extractUserDetails(actingUser);
  await customer.save();
  return customer;
};

/**
 * Restore a deleted customer by id
 * @param {ObjectId} customerId
 * @returns {Promise<Customer>}
 */
const restoreCustomerById = async (customerId) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found");
  } else if (customer.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Customer is already active");
  }
  customer.active = true;
  customer.deletedAt = null;
  customer.deletedBy = null;
  await customer.save();
  return customer;
};

/**
 * Permanently remove a soft-deleted customer from the database. Only ever
 * usable on a customer that's already soft-deleted (active: false) - this is
 * a one-way admin cleanup action, not a replacement for the normal
 * deactivate/restore flow.
 * @param {ObjectId} customerId
 * @returns {Promise<void>}
 */
const permanentlyDeleteCustomerById = async (customerId) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found");
  }
  if (customer.active) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      "Customer must be deleted before it can be permanently removed"
    );
  }
  await Customer.deleteOne({ _id: customerId });
};

/**
 * @param {Object} customer
 * @param {String} contactId
 * @returns {Promise<Customer>}
 */
const addContact = async (customer, contactId) => {
  const contacts = _.concat(customer.contacts, contactId);
  _.set(customer, "contacts", contacts);
  await customer.save();
  return customer;
};

/**
 * @param {ObjectId} customerId
 * @param {String} contactId
 * @returns {Promise<Customer>}
 */
const addContactById = async (customerId, contactId) => {
  const customer = await getActiveCustomerById(customerId);
  return addContact(customer, contactId);
};

/**
 * @param {Object} customer
 * @param {String} regionId
 * @returns {Promise<Customer>}
 */
const addRegion = async (customer, regionId) => {
  const customerRegions = _.concat(customer.regions, regionId);
  _.set(customer, "regions", customerRegions);
  await customer.save();
  return customer;
};

/**
 * @param {ObjectId} customerId
 * @param {Object} user
 * @returns {Promise<Contact>}
 */
const getAuthorizedCustomer = async (customerId, user) => {
  const customer = await getActiveCustomerById(customerId);
  if (!isScloudxUser(user.role)) {
    if (_.get(customer, "id") !== _.get(user, "customer.id")) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized for this customer"
      );
    }
  }

  logger.debug(`customer ----> ${JSON.stringify(customer)}`);

  return customer;
};

module.exports = {
  getCustomerById,
  getActiveCustomerById,
  createCustomer,
  queryCustomers,
  updateCustomerById,
  deactivateCustomerById,
  restoreCustomerById,
  permanentlyDeleteCustomerById,
  addContact: addContactById,
  getCustomerByName,
  addRegion,
  getAuthorizedCustomer,
};
