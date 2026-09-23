/* eslint-disable eqeqeq */
const httpStatus = require("http-status");
// const { custom } = require("joi");
const mongoose = require("mongoose");
const _ = require("lodash");
const moment = require("moment");
const { parse } = require("csv-parse/sync");
const { roleTypes } = require("../config/roles");
const { bandwidthOptions, productOptions } = require("../config/circuitOptions");
const logger = require("../config/logger");
const { Circuit, Site, Customer, Vendor, Ticket } = require("../models");
const ApiError = require("../utils/ApiError");
const { createCodeFromName } = require("../utils/creators");
const { extractNameAndCode, extractUserDetails } = require("../utils/extractors");
const { getSiteById } = require("./site.service");
const { getVendorById } = require("./vendor.service");

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

const CIRCUIT_STATUS_FIELDS = ["status", "billStopDate", "changeType", "changeOrderNumber", "changeDate"];

/**
 * Update just a circuit's Status (and whichever of Bill Stop Date/Change
 * Type/Change Order Number/Change Date go with it) - a separate, narrower
 * endpoint from updateCircuitById so SCX Service Delivery can be given
 * rights to this alone (see roles.js's updateCircuitStatus) without also
 * gaining the general "editCircuits" right. Whichever fields don't apply to
 * the newly-set status are cleared, so old Ceased/Changed data doesn't
 * linger once a circuit moves on to a different status (mirrors
 * deliveryOrder.service.js's own handoverDate-on-status-change handling).
 * "Service Delivery Login, remove change option for Changed and Ceased
 * Circuit" - once a circuit has already been marked Changed/Ceased, Service
 * Delivery can no longer touch its status again (SCX Admin still can, same
 * as every other Circuit field).
 * @param {ObjectId} circuitId
 * @param {Object} updateBody
 * @param {Object} actingUser
 * @returns {Promise<Circuit>}
 */
const updateCircuitStatusById = async (circuitId, updateBody, actingUser) => {
  const circuit = await getCircuitById(circuitId);
  if (!circuit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Circuit not found");
  } else if (!circuit.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Circuit is not active");
  }

  const currentStatus = circuit.status || "Live";
  if (actingUser.role === roleTypes.scloudxServiceDelivery && (currentStatus === "Changed" || currentStatus === "Ceased")) {
    throw new ApiError(httpStatus.FORBIDDEN, `This circuit is already ${currentStatus} and can no longer have its status changed`);
  }

  const update = _.pick(updateBody, CIRCUIT_STATUS_FIELDS);
  if (update.status === "Live") {
    update.billStopDate = "";
    update.changeType = "";
    update.changeOrderNumber = "";
    update.changeDate = "";
  } else if (update.status === "Ceased") {
    update.changeType = "";
    update.changeOrderNumber = "";
    update.changeDate = "";
  } else if (update.status === "Changed") {
    update.billStopDate = "";
  }

  Object.assign(circuit, update);
  circuit.updatedBy = extractUserDetails(actingUser);
  await circuit.save();
  return circuit;
};

/**
 * Move an active circuit to another active site of the SAME customer. A site
 * knows its circuits through its `circuits` id list, and the circuit carries
 * a site/region snapshot and a code built from its Vendor Circuit ID plus the
 * site's code (see createCircuitBySite) - so all of those move together.
 * The circuit record itself (id, every field) is kept, so nothing that points
 * at it is lost. Optionally re-points the site on the circuit's existing
 * tickets too (a ticket keeps its own site/circuit snapshot).
 * @param {ObjectId} circuitId
 * @param {Object} targetSite - active Site document
 * @param {Object} options
 * @param {boolean} [options.updateTickets=true]
 * @param {Object} options.actingUser
 * @returns {Promise<Circuit>}
 */
const moveCircuitToSite = async (circuitId, targetSite, { updateTickets = true, actingUser } = {}) => {
  const circuit = await getActiveCircuitById(circuitId);
  const circuitIdStr = String(circuit._id);
  const fromSiteId = String(_.get(circuit, "site.id", ""));
  const toSiteId = String(targetSite._id);

  if (fromSiteId === toSiteId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "The circuit is already at this site");
  }
  if (String(_.get(circuit, "customer.id")) !== String(_.get(targetSite, "customer.id"))) {
    throw new ApiError(httpStatus.BAD_REQUEST, "A circuit can only be moved to a site of the same customer");
  }

  // Same rule as creating a circuit: one Vendor Circuit ID per site.
  const newCode = createCodeFromName(circuit.vendorCircuitId || "", targetSite.code);
  if (await Circuit.isCodeTaken(newCode, circuit._id)) {
    throw new ApiError(httpStatus.CONFLICT, "The target site already has a circuit with this Vendor Circuit ID");
  }

  // Add to the new site first, so a failure part-way can never leave the
  // circuit on no site's list - worst case it is briefly on both.
  await Site.updateOne({ _id: toSiteId }, { $addToSet: { circuits: circuitIdStr } });

  circuit.site = extractNameAndCode(targetSite);
  circuit.region = targetSite.region;
  circuit.code = newCode;
  circuit.updatedBy = extractUserDetails(actingUser);
  await circuit.save();

  if (fromSiteId) {
    // Older records may hold the id as an ObjectId rather than a string.
    const idForms = [circuitIdStr, new mongoose.Types.ObjectId(circuitIdStr)];
    await Site.updateOne(
      { _id: fromSiteId },
      { $pull: { circuits: { $in: idForms }, cascadeDeactivatedCircuitIds: circuitIdStr } }
    );
  }

  if (updateTickets) {
    await Ticket.updateMany(
      { "circuit.id": circuitIdStr },
      {
        $set: {
          "site.id": toSiteId,
          "site.name": targetSite.name,
          "site.code": targetSite.code,
          "circuit.code": newCode,
        },
      }
    );
  }

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
          // Circuit Status fields - were missing entirely here, which
          // silently broke the Inventory list's "Circuit Status" column and
          // would have made "Changed Inventory"/"Ceased Inventory" always
          // show empty regardless of what's actually saved.
          "status",
          "billStopDate",
          "changeType",
          "changeOrderNumber",
          "changeDate",
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
 * the predefined options. A row's Vendor Circuit ID is only rejected as a
 * duplicate against an existing Live circuit at that site - one that's
 * already Ceased or Changed no longer blocks a new circuit from reusing its
 * ID ("This duplicate validation should be checked only for Live circuits,
 * not Closed[Ceased] or Changed"). Does not write anything - the caller only
 * inserts if there are zero failedRows, keeping the upload all-or-nothing.
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

  // Batch-fetch every Customer and Vendor this file references in one round
  // trip each, instead of one findOne per row - a file with hundreds of
  // rows typically only references a handful of distinct customers/vendors
  // (e.g. 219 rows / 2 customers / 84 vendors is typical), so looking each
  // one up per row turned a bulk upload into hundreds of sequential DB
  // round trips and could time out the whole request.
  const customerCodes = new Set();
  const vendorCodes = new Set();
  records.forEach((record) => {
    const customerName = _.get(record, "Customer Name", "").trim();
    const vendorName = _.get(record, "Vendor Name", "").trim();
    if (customerName) customerCodes.add(createCodeFromName(customerName));
    if (vendorName) vendorCodes.add(createCodeFromName(vendorName));
  });
  const [customers, vendors] = await Promise.all([
    Customer.find({ code: { $in: [...customerCodes] } }),
    Vendor.find({ code: { $in: [...vendorCodes] } }),
  ]);
  const customersByCode = new Map(customers.map((customer) => [customer.code, customer]));
  const vendorsByCode = new Map(vendors.map((vendor) => [vendor.code, vendor]));

  // Sites are keyed by customer code (their parent), so their codes can
  // only be computed once each row's customer has resolved above - still
  // one more batched round trip rather than one per row.
  const siteCodes = new Set();
  records.forEach((record) => {
    const customerName = _.get(record, "Customer Name", "").trim();
    const siteName = _.get(record, "Site Name", "").trim();
    const customer = customersByCode.get(createCodeFromName(customerName));
    if (customer && siteName) {
      siteCodes.add(createCodeFromName(siteName, customer.code));
    }
  });
  const sites = await Site.find({ code: { $in: [...siteCodes] } });
  const sitesByCode = new Map(sites.map((site) => [site.code, site]));

  // Same idea for "does a circuit with this code already exist" - collect
  // every candidate code up front and check them all in one query rather
  // than one findOne per row.
  const circuitCodes = new Set();
  records.forEach((record) => {
    const customerName = _.get(record, "Customer Name", "").trim();
    const siteName = _.get(record, "Site Name", "").trim();
    const vendorCircuitId = _.get(record, "Vendor Circuit ID", "").trim();
    const customer = customersByCode.get(createCodeFromName(customerName));
    const site = customer && siteName ? sitesByCode.get(createCodeFromName(siteName, customer.code)) : null;
    if (site) {
      circuitCodes.add(createCodeFromName(vendorCircuitId, site.code));
    }
  });
  const existingCircuits = await Circuit.find({ code: { $in: [...circuitCodes] } }).select("code status");
  // "This duplicate validation should be checked only for Live circuits, not
  // Closed[Ceased] or Changed" - a circuit that's already moved on to Ceased
  // or Changed no longer blocks a new circuit from reusing its Vendor
  // Circuit ID at the same site; only an existing Live circuit does (status
  // defaults to "Live" - see circuit.model.js).
  const existingLiveCircuitCodes = new Set(
    existingCircuits.filter((circuit) => (circuit.status || "Live") === "Live").map((circuit) => circuit.code)
  );

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
      const customer = customersByCode.get(createCodeFromName(customerName));
      if (!customer || !customer.active) {
        errors.push("Customer not found or inactive");
      } else {
        const matchedSite = sitesByCode.get(createCodeFromName(siteName, customer.code));
        if (!matchedSite || !matchedSite.active) {
          errors.push("Site not found for this customer, or inactive");
        } else {
          site = matchedSite;
        }
      }
    }

    let vendor = null;
    if (vendorName) {
      const matchedVendor = vendorsByCode.get(createCodeFromName(vendorName));
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
        if (existingLiveCircuitCodes.has(code)) {
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

/**
 * Insert every circuit from a validated bulk upload in a small, fixed
 * number of DB round trips regardless of row count: one insertMany for all
 * the circuit documents, then one bulkWrite to push each new circuit onto
 * its site's `circuits` array. Mirrors createCircuitBySite's per-row logic,
 * batched - and skips the isCodeTaken re-check createCircuitBySite does,
 * since validateBulkUploadCircuits already confirmed every code is free
 * (the schema's unique index on `code` still catches a genuine race).
 * @param {Array<{site: Object, circuitBody: Object}>} validRows
 * @returns {Promise<Array<Circuit>>}
 */
const bulkCreateCircuitsBySite = async (validRows) => {
  if (validRows.length === 0) {
    return [];
  }

  const docs = validRows.map(({ site, circuitBody }) => {
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
    circuitToCreate.code = createCodeFromName(circuitBody.vendorCircuitId, site.code);
    circuitToCreate.customer = site.customer;
    circuitToCreate.region = site.region;
    circuitToCreate.site = extractNameAndCode(site);
    return circuitToCreate;
  });

  // insertMany returns documents in the same order as the input array, so
  // index i here always corresponds to validRows[i].
  const createdCircuits = await Circuit.insertMany(docs, { ordered: true });

  const circuitIdsBySiteId = new Map();
  createdCircuits.forEach((circuit, index) => {
    const siteId = validRows[index].site._id.toString();
    const ids = circuitIdsBySiteId.get(siteId) || [];
    ids.push(circuit._id.toString());
    circuitIdsBySiteId.set(siteId, ids);
  });

  await Site.bulkWrite(
    [...circuitIdsBySiteId.entries()].map(([siteId, circuitIds]) => ({
      updateOne: {
        filter: { _id: siteId },
        update: { $push: { circuits: { $each: circuitIds } } },
      },
    }))
  );

  return createdCircuits;
};

/**
 * Find the distinct Site ids of active Circuits whose own fields match a
 * search term - lets Site search (site.controller.js's getSites) also
 * catch circuit-level identifiers like Vendor Circuit ID or SCloudX Order
 * Reference, not just the site's own name/customer/town.
 * @param {string} search
 * @returns {Promise<mongoose.Types.ObjectId[]>}
 */
const findSiteIdsMatchingSearch = async (search) => {
  const regex = { $regex: search, $options: "i" };
  const siteIds = await Circuit.find({
    active: true,
    $or: [
      { code: regex },
      { customerCircuitId: regex },
      { vendorCircuitId: regex },
      { scloudxOrderReference: regex },
      { vendorOrderReference: regex },
      { customerOrderReference: regex },
      { customerCircuitBillStartDate: regex },
      { customerCircuitContractTerm: regex },
      { vendorCircuitBillStartDate: regex },
      { vendorCircuitContractTerm: regex },
      { vendorLECName: regex },
      { bandwidth: regex },
      { product: regex },
      { vendorUptime: regex },
      { vendorMTTR: regex },
    ],
  }).distinct("site.id");
  return siteIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
};

module.exports = {
  // createCircuit,
  queryCircuits,
  findSiteIdsMatchingSearch,
  validateBulkUploadCircuits,
  bulkCreateCircuitsBySite,
  // createOrUpdateCircuitByVendorId,
  getActiveCircuitByVendorId,
  getCircuitById,
  updateCircuitById,
  updateCircuitStatusById,
  moveCircuitToSite,
  deactivateCircuitById,
  restoreCircuitById,
  permanentlyDeleteCircuitById,
  getActiveCircuitById,
  addCircuit: addCircuitById,
  createCircuitBySite,
  getActiveCircuitsById,
  getAuthorizedCircuit,
};
