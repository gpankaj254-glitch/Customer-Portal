const httpStatus = require("http-status");
// const { custom } = require("joi");
const _ = require("lodash");
const { parse } = require("csv-parse/sync");
const { isScloudxUser } = require("../config/roles");
const logger = require("../config/logger");
const { Vendor, Circuit } = require("../models");
const ApiError = require("../utils/ApiError");
const { extractUserDetails } = require("../utils/extractors");
const { createCodeFromName } = require("../utils/creators");

/**
 * @param {Object} vendorBody
 * @returns {Promise<Vendor>}
 */
const createVendor = async (vendorBody) => {
  const name = _.get(vendorBody, "name");
  const location = _.pick(vendorBody, [
    "address",
    "postalCode",
    "town",
    "country",
  ]);
  const vendorToCreate = {
    name,
    code: createCodeFromName(name),
    location,
    vendorUptime: _.get(vendorBody, "vendorUptime", ""),
    vendorMTTR: _.get(vendorBody, "vendorMTTR", ""),
  };
  const createdVendor = await Vendor.create(vendorToCreate);
  return createdVendor;
};

/**
 * Query for vendors
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryVendors = async (filter, options) => {
  const vendors = await Vendor.paginate(filter, options);
  return vendors;
};

/**
 * Vendor ids (as strings, matching how Circuit.vendorId is stored) whose
 * Vendor Name matches the search text - used to let a circuit search find
 * circuits by their vendor's name, which isn't itself stored on the circuit.
 * @param {string} search
 * @returns {Promise<string[]>}
 */
const findVendorIdsMatchingSearch = async (search) => {
  const regex = { $regex: search, $options: "i" };
  const ids = await Vendor.find({ name: regex }).distinct("_id");
  return ids.map((id) => id.toString());
};

/**
 * Get vendor by id
 * @param {ObjectId} vendorId
 * @returns {Promise<Vendor>}
 */
const getVendorById = async (vendorId) => {
  logger.debug(`getting vendor by id: ${vendorId}`);
  return Vendor.findOne({ _id: vendorId });
};

// /**
//  * Create a customer
//  * @param {Object} customer
//  * @param {String} name
//  * @returns {Promise<Vendor>}
//  */
// const getVendorByName = async (customer, name) => {
//   logger.debug(
//     `getting vendor by customer: ${customer.name} and name: ${name}`
//   );
//   const code = createCodeFromName(name, customer.code);
//   return Vendor.findOne({ code });
// };

/**
 * @param {String} name
 * @returns {Promise<Vendor>}
 */
const getVendorByName = async (name) => {
  logger.debug(`getting customer by name : ${name}`);
  const code = createCodeFromName(name);
  return Vendor.findOne({ code });
};

/**
 * @param {Object} vendorBody
 * @returns {Promise<Vendor>}
 */
const getOrCreateVendor = async (vendorBody) => {
  let vendor = await getVendorByName(vendorBody.name);
  if (!vendor) {
    vendor = await createVendor(
      _.assign({}, vendorBody, { customerId: vendorBody.customer.id })
    );
  }
  return vendor;
};
/**
 * @param {ObjectId} vendorId
 * @returns {Promise<Vendor>}
 */
const getActiveVendorById = async (vendorId) => {
  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, "Vendor not found");
  } else if (!vendor.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Vendor is not active");
  }
  logger.debug(`vendor ----> ${JSON.stringify(vendor)}`);
  return vendor;
};

/**
 * Update vendor by id
 * @param {ObjectId} vendorId
 * @param {Object} updateBody
 * @param {Object} actingUser
 * @returns {Promise<Vendor>}
 */
const updateVendorById = async (vendorId, updateBody, actingUser) => {
  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, "Vendor not found");
  } else if (!vendor.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Vendor is not active");
  }

  Object.assign(vendor, updateBody);
  vendor.updatedBy = extractUserDetails(actingUser);
  await vendor.save();
  return vendor;
};

/**
 * Deactivate vendor by id
 * @param {ObjectId} vendorId
 * @param {Object} actingUser
 * @returns {Promise<Vendor>}
 */
const deactivateVendorById = async (vendorId, actingUser) => {
  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, "Vendor not found");
  } else if (!vendor.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Vendor is not active");
  }

  const activeCircuitCount = await Circuit.countDocuments({
    vendorId,
    active: true,
  });
  if (activeCircuitCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete vendor: ${activeCircuitCount} active circuit(s) still reference it. Delete them first.`
    );
  }

  vendor.active = false;
  vendor.deletedAt = new Date();
  vendor.deletedBy = extractUserDetails(actingUser);
  await vendor.save();
  return vendor;
};

/**
 * Restore a deleted vendor by id
 * @param {ObjectId} vendorId
 * @returns {Promise<Vendor>}
 */
const restoreVendorById = async (vendorId) => {
  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, "Vendor not found");
  } else if (vendor.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Vendor is already active");
  }
  vendor.active = true;
  vendor.deletedAt = null;
  vendor.deletedBy = null;
  await vendor.save();
  return vendor;
};

/**
 * @param {ObjectId} vendorId
 * @param {Object} user
 * @returns {Promise<Vendor>}
 */
const getAuthorizedVendor = async (vendorId, user) => {
  const vendor = await getActiveVendorById(vendorId);
  if (!isScloudxUser(user.role)) {
    if (_.get(vendor, "id") !== _.get(user, "vendor.id")) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized for this vendor"
      );
    }
  }
  return vendor;
};

/**
 * @param {ObjectId} vendorId
 * @param {String} contactId
 * @returns {Promise<Vendor>}
 */
const addContact = async (vendorId, contactId) => {
  const vendor = await getActiveVendorById(vendorId);
  logger.debug(`adding contact to vendor: ${vendor.name}`);
  const contacts = _.concat(vendor.contactPersons, contactId);
  _.set(vendor, "contactPersons", contacts);
  await vendor.save();
  return vendor;
};

const BULK_UPLOAD_COLUMNS = ["Vendor Name", "Address", "Town", "Postal Code", "Country", "Vendor Uptime", "Vendor MTTR"];

/**
 * Bulk-create vendors from an uploaded CSV buffer. Validates every row first
 * - a Vendor Name, and no duplicate Vendor (within the file or already in
 * the DB) - and only inserts anything if every row passes. Returns the list
 * of failed rows (with reasons) instead of throwing, so the caller can build
 * a downloadable audit report.
 * @param {Buffer} fileBuffer
 * @returns {Promise<{success: boolean, totalRows: number, insertedCount: number, failedRows: Array}>}
 */
const bulkUploadVendors = async (fileBuffer) => {
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

  // Batch-fetch every vendor code this file could reference in one round
  // trip, instead of one findOne per row - see circuit.service.js's
  // validateBulkUploadCircuits for the same fix and the reasoning (a file
  // with many rows turns one-lookup-per-row into hundreds of sequential DB
  // round trips, which can time out the whole request).
  const candidateCodes = records
    .map((record) => _.get(record, "Vendor Name", "").trim())
    .filter(Boolean)
    .map((name) => createCodeFromName(name));
  const existingVendors = await Vendor.find({ code: { $in: candidateCodes } }).select("code");
  const existingCodes = new Set(existingVendors.map((vendor) => vendor.code));

  const failedRows = [];
  const validRows = [];
  const seenCodes = new Set();

  records.forEach((record, i) => {
    const rowNumber = i + 2; // account for the header row, 1-indexed
    const vendorName = _.get(record, "Vendor Name", "").trim();
    const errors = [];

    if (!vendorName) errors.push("Vendor Name is required");

    if (vendorName) {
      const code = createCodeFromName(vendorName);
      if (seenCodes.has(code)) {
        errors.push("Duplicate Vendor Name within this file");
      } else {
        seenCodes.add(code);
        if (existingCodes.has(code)) {
          errors.push("A vendor with this name already exists");
        }
      }
    }

    if (errors.length > 0) {
      failedRows.push({ row: rowNumber, vendorName, errors: errors.join("; ") });
    } else {
      validRows.push({
        name: vendorName,
        address: _.get(record, "Address", "").trim(),
        postalCode: _.get(record, "Postal Code", "").trim(),
        town: _.get(record, "Town", "").trim(),
        country: _.get(record, "Country", "").trim(),
        vendorUptime: _.get(record, "Vendor Uptime", "").trim(),
        vendorMTTR: _.get(record, "Vendor MTTR", "").trim(),
      });
    }
  });

  if (failedRows.length > 0) {
    return { success: false, totalRows: records.length, insertedCount: 0, failedRows };
  }

  const created = validRows.length
    ? await Vendor.insertMany(
        validRows.map((row) => ({
          name: row.name,
          code: createCodeFromName(row.name),
          location: _.pick(row, ["address", "postalCode", "town", "country"]),
          vendorUptime: row.vendorUptime,
          vendorMTTR: row.vendorMTTR,
        }))
      )
    : [];

  return { success: true, totalRows: records.length, insertedCount: created.length, failedRows: [] };
};

module.exports = {
  addContact,
  // addRegion,

  createVendor,
  deactivateVendorById,
  restoreVendorById,
  getActiveVendorById,
  getAuthorizedVendor,
  getOrCreateVendor,
  getVendorByName,
  getVendorById,
  queryVendors,
  findVendorIdsMatchingSearch,
  updateVendorById,
  bulkUploadVendors,
};
