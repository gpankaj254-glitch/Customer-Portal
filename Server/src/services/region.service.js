const httpStatus = require("http-status");
// const { custom } = require("joi");
// const _ = require("lodash");
const _ = require("lodash");
const logger = require("../config/logger");
const { Region } = require("../models");
const ApiError = require("../utils/ApiError");
const { extractNameAndCode } = require("../utils/extractors");
const {
  getActiveCustomerById,
  updateCustomerById,
} = require("./customer.service");
const { createCodeFromName } = require("../utils/creators");
const customerService = require("./customer.service");

const createRegionHelper = async (customer, regionToCreate) => {
  _.set(regionToCreate, "customer", extractNameAndCode(customer));
  const createdRegion = await Region.create(regionToCreate);
  await customerService.addRegion(customer, createdRegion._id);
  return createdRegion;
};

/**
 * @param {Object} regionBody
 * @returns {Promise<Region>}
 */
const createRegion = async (regionBody) => {
  logger.debug(`creating region: ${regionBody.name}`);
  const customer = await getActiveCustomerById(regionBody.customerId);
  const regionToCreate = _.pick(regionBody, ["name", "code"]);
  return createRegionHelper(customer, regionToCreate);
};

/**
 * @param {Object} customer
 * @param {String} name
 * @returns {Promise<Region>}
 */
const createRegionByCustomerAndName = async (customer, name) => {
  logger.debug(
    `creating region by customer: ${customer.name} and name: ${name}`
  );
  const regionToCreate = {
    name,
    code: createCodeFromName(name, customer.code),
  };
  return createRegionHelper(customer, regionToCreate);
};

/**
 * Create default region
 * @param {Object} customer
 * @returns {Promise<Region>}
 */
const createDefaultRegion = async (customer) => {
  logger.debug(`creating default region for customer : ${customer.name}`);
  const globalRegion = await createRegion({
    customerId: customer.id,
    code: createCodeFromName("global", customer.code),
    name: "global",
  });
  return updateCustomerById(customer.id, {
    defaultRegion: globalRegion.id,
  });
};

/**
 * Query for regions
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryRegions = async (filter, options) => {
  const regions = await Region.paginate(filter, options);
  return regions;
};

/**
 * Get region by id
 * @param {ObjectId} regionId
 * @returns {Promise<Region>}
 */
const getRegionById = async (regionId) => {
  return Region.findOne({ _id: regionId });
};

/**
 * Update region by id
 * @param {ObjectId} regionId
 * @param {Object} updateBody
 * @returns {Promise<Region>}
 */
const updateRegionById = async (regionId, updateBody) => {
  const region = await getRegionById(regionId);
  if (!region) {
    throw new ApiError(httpStatus.NOT_FOUND, "Region not found");
  } else if (!region.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Region is not active");
  }
  Object.assign(region, updateBody);
  await region.save();
  return region;
};

/**
 * @param {ObjectId} regionId
 * @returns {Promise<Region>}
 */
const getActiveRegionById = async (regionId) => {
  const region = await getRegionById(regionId);
  if (!region) {
    throw new ApiError(httpStatus.NOT_FOUND, "Region not found");
  } else if (!region.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Region is not active");
  }
  return region;
};

// /**
//  * @param {Object} customer
//  * @returns {Promise<Customer>}
//  */
// const getDefaultRegion = async (customer) => {
//   const regionId = customer.defaultRegion;
//   return getActiveRegionById(regionId);
// };

/**
 * Create a customer
 * @param {Object} customer
 * @param {String} name
 * @returns {Promise<Customer>}
 */
const getRegionByCustomerAndName = async (customer, name) => {
  logger.debug(
    `getting region by customer: ${customer.name} and name: ${name}`
  );
  const code = createCodeFromName(name, customer.code);
  return Region.findOne({ code });
};

/**
 * Deactivate region by id
 * @param {ObjectId} regionId
 * @returns {Promise<Region>}
 */
const deactivateRegionById = async (regionId) => {
  const region = await getRegionById(regionId);
  if (!region) {
    throw new ApiError(httpStatus.NOT_FOUND, "Region not found");
  } else if (!region.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Region is not active");
  }
  region.active = false;
  await region.save();
  return region;
};

/**
 * @param {Array} regionIds
 * @returns {Promise<Region>}
 */
const getActiveRegionsById = async (regionIds) => {
  const regions = [];
  Promise.all(
    regionIds.map(async (regionId) => {
      const region = await getRegionById(regionId);
      if (_.get(region, "active", null)) {
        _.concat(regions, region);
      }
    })
  );
  return regions;
};

/**
 * @param {ObjectId} regionId
 * @param {String} contactId
 * @returns {Promise<Region>}
 */
const addContact = async (regionId, contactId) => {
  const region = await getActiveRegionById(regionId);
  const contacts = _.concat(region.contacts, contactId);
  _.set(region, "contacts", contacts);
  await region.save();
  return region;
};

module.exports = {
  createRegion,
  queryRegions,
  getRegionById,
  updateRegionById,
  deactivateRegionById,
  getActiveRegionById,
  addContact,
  getActiveRegionsById,
  createDefaultRegion,
  createRegionByCustomerAndName,
  getRegionByCustomerAndName,
};
