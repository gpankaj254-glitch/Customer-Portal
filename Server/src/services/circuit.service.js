/* eslint-disable eqeqeq */
const httpStatus = require("http-status");
// const { custom } = require("joi");
const _ = require("lodash");
const moment = require("moment");
const { parse } = require("csv-parse/sync");
const { roleTypes } = require("../config/roles");
const { bandwidthOptions, productOptions } = require("../config/circuitOptions");
const logger = require("../config/logger");
const { Circuit, Site } = require("../models");
const ApiError = require("../utils/ApiError");
const { createCodeFromName } = require("../utils/creators");
const { extractNameAndCode, extractUserDetails } = require("../utils/extractors");
const { getSiteById, getSiteByCustomerAndName } = require("./site.service");
const { getVendorById, getVendorByName } = require("./vendor.service");
const { getCustomerByName } = require("./customer.service");

const BILL_START_DATE_FORMAT = "DD-MM-YYYY";

function isValidBillStartDate(value) {
  if (!value) return true;
  return moment(value, BILL_START_DATE_FORMAT, true).isValid();
}

/**
 * @param {Object} circuitBody
 * @param {Object} site
 * @returns {Promise<Site>}
 */
const createCircuitBySite = async (site, circuitBody) => {
  const circuitToCreate = _.pick(circuitBody, [
    "customerCircuitId",
    "vendorCircuitId",
    "vendorId",
    "scloudxOrderReference",
    "vendorOrderReference",
    "customerOrderReference",
    "customerCircuitBillStartDate",
    "customerCircuitContractTerm",
    "vendorCircuitBillStartDate",
    "vendorCircuitContractTerm",
    "vendorLECName",
    "bandwidth",
    "product",
    "vendorUptime",
    "vendorMTTR",
  ]);

  const code = createCodeFromName(circuitBody.vendorCircuitId, site.code);
  if (await Circuit.isCodeTaken(code)) {
    throw new Error("Duplicate vendor circuit id");
  }
  circuitToCreate.customer = site.customer;
  circuitToCreate.code = code;
  circuitToCreate.region = site.region;
  circuitToCreate.site = extractNameAndCode(site);
  const createdCircuit = await Circuit.create(circuitToCreate);
  // const siteCircuits = _.concat(site.circuits, createdCircuit._id);
  // _.set(site, "circuits", siteCircuits);
  // await site.save();
  return createdCircuit;
};

/**
 * Query for circuits
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryCircuits = async (filter, options) => {
  const circuits = await Circuit.paginate(filter, options);
  return circuits;
};

/**
 * Get circuit by id
 * @param {ObjectId} circuitId
 * @returns {Promise<Circuit>}
 */
const getCircuitById = async (circuitId) => {
  return Circuit.findOne({ _id: circuitId });
};

// const updateOrCreateCircuit = async (circuitBody) => {
//   const doc = await Character.findOneAndUpdate(filter, update, {
//     new: true,
//     upsert: true, // Make this update into an upsert
//   });

//   const site = await getActiveSiteById(circuitBody.siteId);
//   return createCircuitBySite(site, circuitBody);
// };

/**
 * @param {ObjectId} circuitId
 * @returns {Promise<Site>}
 */
const getActiveCircuitById = async (circuitId) => {
  const circuit = await getCircuitById(circuitId);
  if (!circuit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Circuit not found");
  } else if (!circuit.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Circuit is not active");
  }
  return circuit;
};

// const getCircuitByVendorId = async (vendorId) => {
//   logger.debug(`getting customer by name : ${vendorId}`);
//   const code = createCodeFromName(vendorId);
//   const circuit = await Circuit.findOne({ code });

//   return circuit || null;
// };

const getActiveCircuitByVendorId = async (vendorId) => {
  logger.debug(`getting customer by name : ${vendorId}`);
  const code = createCodeFromName(vendorId);
  const circuit = await Circuit.findOne({ code });

  if (!circuit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Circuit not found");
  } else if (!circuit.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Circuit is not active");
  }
  return circuit;
};

/**
 * Update circuit by id
 * @param {ObjectId} circuitId
 * @param {Object} updateBody
 * @param {Object} actingUser
 * @returns {Promise<Circuit>}
 */
const updateCircuitById = async (circuitId, updateBody, actingUser) => {
  const circuit = await getCircuitById(circuitId);
  if (!circuit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Circuit not found");
  } else if (!circuit.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Circuit is not active");
  }

  Object.assign(circuit, updateBody);
  circuit.updatedBy = extractUserDetails(actingUser);
  await circuit.save();
  return circuit;
};

// /**
//  * Update circuit by id
//  * @param {ObjectId} circuitId
//  * @param {Object} updateBody
//  * @returns {Promise<Circuit>}
//  */
// const updateCircuitAndCircuits = async (circuitId, updateBody) => {
//   const circuit = await getCircuitById(circuitId);
//   if (!circuit) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Circuit not found");
//   } else if (!circuit.active) {
//     throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Circuit is not active");
//   }

//   Object.assign(circuit, updateBody);
//   await circuit.save();
//   return circuit;
// };

/**
 * @param {ObjectId} circuitId
 * @param {String} CircuitId
 * @returns {Promise<Circuit>}
 */
const addCircuit = async (circuit, CircuitId) => {
  // const circuit = await getActiveCircuitById(circuitId);
  const Circuits = _.concat(circuit.Circuits, CircuitId);
  _.set(circuit, "CircuitPersons", Circuits);
  await circuit.save();
  return circuit;
};

/**
 * @param {ObjectId} circuitId
 * @param {String} CircuitId
 * @returns {Promise<Circuit>}
 */
const addCircuitById = async (circuitId, CircuitId) => {
  const circuit = await getActiveCircuitById(circuitId);

  // const Circuits = _.concat(circuit.Circuits, CircuitId);
  // _.set(circuit, "CircuitPersons", Circuits);
  // await circuit.save();
  return addCircuit(circuit, CircuitId);
};

/**
 * Deactivate circuit by id
 * @param {ObjectId} circuitId
 * @param {Object} actingUser
 * @returns {Promise<Circuit>}
 */
const deactivateCircuitById = async (circuitId, actingUser) => {
  const circuit = await getCircuitById(circuitId);
  if (!circuit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Circuit not found");
  } else if (!circuit.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Circuit is not active");
  }
  circuit.active = false;
  circuit.deletedAt = new Date();
  circuit.deletedBy = extractUserDetails(actingUser);
  await circuit.save();
  return circuit;
};

/**
 * Restore a deleted circuit by id
 * @param {ObjectId} circuitId
 * @returns {Promise<Circuit>}
 */
const restoreCircuitById = async (circuitId) => {
  const circuit = await getCircuitById(circuitId);
  if (!circuit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Circuit not found");
  } else if (circuit.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Circuit is already active");
  }
  const site = await getSiteById(circuit.site.id);
  if (!site || !site.active) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot restore circuit: its site is deleted. Restore the site first."
    );
  }
  const vendor = await getVendorById(circuit.vendorId);
  if (!vendor || !vendor.active) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot restore circuit: its vendor is deleted. Restore the vendor first."
    );
  }
  circuit.active = true;
  circuit.deletedAt = null;
  circuit.deletedBy = null;
  await circuit.save();
  return circuit;
};

/**
 * Permanently remove a soft-deleted circuit from the database. Only ever
 * usable on a circuit that's already soft-deleted (active: false) - this is
 * a one-way admin cleanup action, not a replacement for the normal
 * deactivate/restore flow. Prunes the circuit's id out of its Site's
 * `circuits` and `cascadeDeactivatedCircuitIds` arrays so those don't
 * accumulate a dangling reference.
 * @param {ObjectId} circuitId
 * @returns {Promise<void>}
 */
const permanentlyDeleteCircuitById = async (circuitId) => {
  const circuit = await getCircuitById(circuitId);
  if (!circuit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Circuit not found");
  }
  if (circuit.active) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      "Circuit must be deleted before it can be permanently removed"
    );
  }
  if (_.get(circuit, "site.id")) {
    await Site.updateOne(
      { _id: circuit.site.id },
      { $pull: { circuits: circuitId, cascadeDeactivatedCircuitIds: circuitId } }
    );
  }
  await Circuit.deleteOne({ _id: circuitId });
};

/**
 * @param {Array} circuitIds
 * @returns {Promise<Circuit>}
 */
const getActiveCircuitsById = async (circuitIds) => {
  const circuits = await Promise.all(
    circuitIds.map(async (circuitId) => {
      const circuit = await getCircuitById(circuitId);
      if (circuit && circuit.active) {
        // if (circuit) {
        return _.pick(circuit, [
          "code",
          "scloudxOrderReference",
          "vendorOrderReference",
          "customerOrderReference",
          "customerCircuitBillStartDate",
          "customerCircuitContractTerm",
          "vendorCircuitBillStartDate",
          "vendorCircuitContractTerm",
          "vendorId",
          "vendorLECName",
          "bandwidth",
          "product",
          "vendorUptime",
          "vendorMTTR",
          "id",
          // "provider",
          "vendorCircuitId",
          "customerCircuitId",
          "updatedAt",
          "updatedBy",
        ]);
        // return circuit;
      }
    })
  );
  return _.compact(circuits);
  // return circuits;
};

/**
 * @param {ObjectId} circuitId
 * @param {Object} user
 * @returns {Promise<Circuit>}
 */
const getAuthorizedCircuit = async (circuitId, user) => {
  const circuit = await getActiveCircuitById(circuitId);
  if (
    user.role == roleTypes.customerAdmin ||
    user.role == roleTypes.customerUser
  ) {
    if (_.get(circuit, "customer.id") != _.get(user, "customer.id")) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized for this circuit"
      );
    }
  }

  logger.debug(`circuit ----> ${JSON.stringify(circuit)}`);

  return circuit;
};

// /**
//  * Update circuit by id
//  * @param {ObjectId} vendorId
//  * @param {Object} circuitBody
//  * @returns {Promise<Circuit>}
//  */
// const createOrUpdateCircuitByVendorId = async (vendorId, circuitBody) => {
//   const circuit = await getCircuitByVendorId(vendorId);

//   if (circuit && circuit.active) {
//     logger.debug(`circuit ----> ${JSON.stringify(circuit)}`);
//     updateCircuitById(circuit);
//     // throw new ApiError(httpStatus.NOT_FOUND, "Circuit not found");
//   } else if (!circuit.active) {
//     throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Circuit is not active");
//   }

//   Object.assign(circuit, updateBody);
//   await circuit.save();
//   return circuit;
// };

const BULK_UPLOAD_COLUMNS = [
  "Customer Name",
  "Site Name",
  "Vendor Name",
  "SCloudX Order Reference",
  "Customer Order Reference",
  "Vendor Order Reference",
  "Vendor Circuit ID",
  "Customer Circuit ID",
  "Vendor LEC Name",
  "Bandwidth",
  "Product",
  "Vendor Uptime",
  "Vendor MTTR",
  "Customer Circuit Bill Start Date",
  "Customer Circuit Contract Term",
  "Vendor Circuit Bill Start Date",
  "Vendor Circuit Contract Term",
];

/**
 * Parse and validate an uploaded CSV buffer of circuits. Every row's Site is
 * resolved by Customer Name + Site Name against an existing active Site -
 * all other site-derived details (customer, region) come from that matched
 * Site record, never from the CSV's own copies. Vendor Name must match an
 * existing active Vendor, and Bandwidth/Product (when given) must be one of
 * the predefined options. Does not write anything - the caller only inserts
 * if there are zero failedRows, keeping the upload all-or-nothing.
 * @param {Buffer} fileBuffer
 * @returns {Promise<{totalRows: number, failedRows: Array, validRows: Array}>}
 */
const validateBulkUploadCircuits = async (fileBuffer) => {
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
  const seenCodes = new Set();

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const rowNumber = i + 2; // account for the header row, 1-indexed
    const customerName = _.get(record, "Customer Name", "").trim();
    const siteName = _.get(record, "Site Name", "").trim();
    const vendorName = _.get(record, "Vendor Name", "").trim();
    const scloudxOrderReference = _.get(record, "SCloudX Order Reference", "").trim();
    const vendorLECName = _.get(record, "Vendor LEC Name", "").trim();
    const vendorCircuitId = _.get(record, "Vendor Circuit ID", "").trim();
    const bandwidth = _.get(record, "Bandwidth", "").trim();
    const product = _.get(record, "Product", "").trim();
    const customerCircuitBillStartDate = _.get(record, "Customer Circuit Bill Start Date", "").trim();
    const vendorCircuitBillStartDate = _.get(record, "Vendor Circuit Bill Start Date", "").trim();
    const errors = [];

    if (!customerName) errors.push("Customer Name is required");
    if (!siteName) errors.push("Site Name is required");
    if (!vendorName) errors.push("Vendor Name is required");
    if (!scloudxOrderReference) errors.push("SCloudX Order Reference is required");
    if (!vendorLECName) errors.push("Vendor LEC Name is required");
    if (bandwidth && !bandwidthOptions.includes(bandwidth)) errors.push(`Bandwidth "${bandwidth}" is not a valid option`);
    if (product && !productOptions.includes(product)) errors.push(`Product "${product}" is not a valid option`);
    if (!isValidBillStartDate(customerCircuitBillStartDate)) errors.push("Customer Circuit Bill Start Date must be dd-mm-yyyy");
    if (!isValidBillStartDate(vendorCircuitBillStartDate)) errors.push("Vendor Circuit Bill Start Date must be dd-mm-yyyy");

    let site = null;
    if (customerName && siteName) {
      // eslint-disable-next-line no-await-in-loop
      const customer = await getCustomerByName(customerName);
      if (!customer || !customer.active) {
        errors.push("Customer not found or inactive");
      } else {
        // eslint-disable-next-line no-await-in-loop
        const matchedSite = await getSiteByCustomerAndName(customer, siteName);
        if (!matchedSite || !matchedSite.active) {
          errors.push("Site not found for this customer, or inactive");
        } else {
          site = matchedSite;
        }
      }
    }

    let vendor = null;
    if (vendorName) {
      // eslint-disable-next-line no-await-in-loop
      const matchedVendor = await getVendorByName(vendorName);
      if (!matchedVendor || !matchedVendor.active) {
        errors.push("Vendor not found or inactive");
      } else {
        vendor = matchedVendor;
      }
    }

    if (site) {
      const code = createCodeFromName(vendorCircuitId, site.code);
      if (seenCodes.has(code)) {
        errors.push("Duplicate circuit (same Site + Vendor Circuit ID) within this file");
      } else {
        seenCodes.add(code);
        // eslint-disable-next-line no-await-in-loop
        const existingCircuit = await Circuit.findOne({ code });
        if (existingCircuit) {
          errors.push("A circuit with this Vendor Circuit ID already exists for this site");
        }
      }
    }

    if (errors.length > 0) {
      failedRows.push({ row: rowNumber, customerName, siteName, vendorName, errors: errors.join("; ") });
    } else {
      validRows.push({
        site,
        circuitBody: {
          vendorId: vendor.id,
          customerCircuitId: _.get(record, "Customer Circuit ID", "").trim(),
          vendorCircuitId,
          scloudxOrderReference,
          vendorOrderReference: _.get(record, "Vendor Order Reference", "").trim(),
          customerOrderReference: _.get(record, "Customer Order Reference", "").trim(),
          customerCircuitBillStartDate,
          customerCircuitContractTerm: _.get(record, "Customer Circuit Contract Term", "").trim(),
          vendorCircuitBillStartDate,
          vendorCircuitContractTerm: _.get(record, "Vendor Circuit Contract Term", "").trim(),
          vendorLECName,
          bandwidth,
          product,
          vendorUptime: _.get(record, "Vendor Uptime", "").trim(),
          vendorMTTR: _.get(record, "Vendor MTTR", "").trim(),
        },
      });
    }
  }

  return { totalRows: records.length, failedRows, validRows };
};

module.exports = {
  // createCircuit,
  queryCircuits,
  validateBulkUploadCircuits,
  // createOrUpdateCircuitByVendorId,
  getActiveCircuitByVendorId,
  getCircuitById,
  updateCircuitById,
  deactivateCircuitById,
  restoreCircuitById,
  permanentlyDeleteCircuitById,
  getActiveCircuitById,
  addCircuit: addCircuitById,
  createCircuitBySite,
  getActiveCircuitsById,
  getAuthorizedCircuit,
};
