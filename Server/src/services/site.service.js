const mongoose = require("mongoose");
const { roleTypes } = require("../config/roles");

const httpStatus = require("http-status");
// const { custom } = require("joi");
const _ = require("lodash");
const { parse } = require("csv-parse/sync");
const logger = require("../config/logger");
const { Site, Circuit, Region, Ticket } = require("../models");
const ApiError = require("../utils/ApiError");
const {
  getActiveRegionById,
  // extractRegionNameAndCode,
} = require("./region.service");
const { getActiveCustomerById, getCustomerById, getCustomerByName } = require("./customer.service");
const { extractNameAndCode, extractUserDetails } = require("../utils/extractors");
const { createCodeFromName } = require("../utils/creators");

/**
 * @param {Object} siteBody
 * @returns {Promise<Site>}
 */
const createSite = async (siteBody) => {
  let regionId = _.get(siteBody, "regionId", null);
  if (!regionId) {
    const customerId = _.get(siteBody, "customerId", null);
    const customer = await getActiveCustomerById(customerId);
    regionId = customer.defaultRegion;
  }
  const region = await getActiveRegionById(regionId);
  // const siteToCreate = _.pick(siteBody, ["name"]);
  const name = _.get(siteBody, "name");
  const location = _.pick(siteBody, [
    "address",
    "postalCode",
    "town",
    "country",
  ]);
  const siteToCreate = {
    name,
    code: createCodeFromName(name, region.customer.code),
    customer: region.customer,
    location,
    customerSiteIdentifier: _.get(siteBody, "endUser", ""),
    region: extractNameAndCode(region),
  };
  const createdSite = await Site.create(siteToCreate);
  const regionSites = _.concat(region.sites, createdSite._id);
  _.set(region, "sites", regionSites);
  await region.save();
  return createdSite;
};

/**
 * Query for sites
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const querySites = async (filter, options) => {
  const sites = await Site.paginate(filter, options);
  return sites;
};

/**
 * Batch-fetch just the `location` field for a set of Site ids, keyed by id -
 * used to enrich a flat circuit list (see circuit.controller.js's
 * getCircuits, behind the Live/Ceased Circuit Inventory tabs) with each
 * circuit's site address without a query per row. A circuit only stores
 * site.id/name/code, not the address itself.
 * @param {string[]} siteIds
 * @returns {Promise<Map<string, Object>>}
 */
const getLocationsBySiteIds = async (siteIds) => {
  if (siteIds.length === 0) {
    return new Map();
  }
  const sites = await Site.find({ _id: { $in: siteIds } })
    .select("location")
    .lean();
  return new Map(sites.map((site) => [String(site._id), site.location]));
};

/**
 * Count every active Circuit belonging to any Site matching the given
 * filter (the same Site-level filter querySites/getSites uses, search
 * conditions included) - not just the circuits on the current page's sites -
 * broken down by Circuit Status. "SCX Admin - Inventory - Live Circuit
 * Inventory says Number of Circuits 217; Live Site Inventory says Total
 * Circuits 221. Why this difference?" - because the old, single combined
 * count here included every active Circuit regardless of status (217 Live +
 * 2 Changed + 2 Ceased = 221), even though "Total Circuits" is shown
 * specifically on the Live/Changed/Ceased Site Inventory tab it matches.
 * Returning per-status counts instead lets each tab show only its own
 * status's total, same as Live Circuit Inventory already does.
 * @param {Object} filter - the same Mongo filter passed to querySites
 * @returns {Promise<{Live: number, Changed: number, Ceased: number}>}
 */
const countCircuitsForFilterByStatus = async (filter) => {
  const counts = { Live: 0, Changed: 0, Ceased: 0 };
  const matchingSites = await Site.find(filter).select("_id").lean();
  if (matchingSites.length === 0) {
    return counts;
  }
  const siteIds = matchingSites.map((site) => String(site._id));
  const grouped = await Circuit.aggregate([
    { $match: { active: true, "site.id": { $in: siteIds } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  grouped.forEach(({ _id, count }) => {
    // A circuit with no stored status yet is "Live" (the schema default -
    // aggregate() reads raw documents, bypassing that default, same as
    // everywhere else this is handled - see circuit.model.js). That means
    // $group can produce TWO separate buckets that both belong under
    // "Live" - _id: null (no status stored) and _id: "Live" (stored
    // explicitly) - in an order Mongo doesn't guarantee. Summing with += is
    // what makes that safe; a plain "=" here (the original bug - confirmed
    // live: "Live Circuit Inventory says 217, Live Site Inventory says 7")
    // let whichever bucket happened to sort last silently overwrite the
    // other instead of the two adding up to the correct total.
    const status = _id || "Live";
    if (counts[status] !== undefined) {
      counts[status] += count;
    }
  });
  return counts;
};

/**
 * Get site by id
 * @param {ObjectId} siteId
 * @returns {Promise<Site>}
 */
const getSiteById = async (siteId) => {
  logger.debug(`getting site by id: ${siteId}`);
  return Site.findOne({ _id: siteId });
};

/**
 * Create a customer
 * @param {Object} customer
 * @param {String} name
 * @returns {Promise<Customer>}
 */
const getSiteByCustomerAndName = async (customer, name) => {
  logger.debug(`getting site by customer: ${customer.name} and name: ${name}`);
  const code = createCodeFromName(name, customer.code);
  return Site.findOne({ code });
};

/**
 * @param {Object} siteBody
 * @returns {Promise<Site>}
 */
const getOrCreateSite = async (siteBody) => {
  let site = await getSiteByCustomerAndName(siteBody.customer, siteBody.name);
  if (!site) {
    site = await createSite(
      _.assign({}, siteBody, { customerId: siteBody.customer.id })
    );
  }
  return site;
};
/**
 * @param {ObjectId} siteId
 * @returns {Promise<Site>}
 */
const getActiveSiteById = async (siteId) => {
  const site = await getSiteById(siteId);
  if (!site) {
    throw new ApiError(httpStatus.NOT_FOUND, "Site not found");
  } else if (!site.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Site is not active");
  }
  logger.debug(`site ----> ${JSON.stringify(site)}`);
  return site;
};

/**
 * @param {ObjectId} siteId
 * @param {Object} user
 * @returns {Promise<Site>}
 */
const getAuthorizedSite = async (siteId, user) => {
  const site = await getActiveSiteById(siteId);
  if (
    user.role == roleTypes.customerAdmin ||
    user.role == roleTypes.customerUser
  ) {
    if (_.get(site, "customer.id") != _.get(user, "customer.id")) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized for this site"
      );
    }
  }
  return site;
};

/**
 * @param {ObjectId} site
 * @param {Object} updateBody
 * @param {Object} actingUser
 * @returns {Promise<Site>}
 */
const updateSite = async (site, updateBody, actingUser) => {
  // Captured before Object.assign below overwrites it - "If I edit Site
  // Name in Site Management, how will it impact existing orders?" answered
  // that Circuit/Ticket each keep their own frozen site.name/site.code
  // snapshot from whenever they were created, unlike DeliveryOrder (which
  // only ever stores siteId, a live reference, so it was never affected).
  // Cascading the rename here - the one place every Site update already
  // goes through - keeps those snapshots in sync going forward without a
  // separate job to remember to run; see scripts/backfill-site-snapshots.js
  // for the one-time repair of whatever's already stale from before this
  // existed.
  const nameChanged = updateBody.name !== undefined && updateBody.name !== site.name;
  const codeChanged = updateBody.code !== undefined && updateBody.code !== site.code;

  Object.assign(site, updateBody);
  site.updatedBy = extractUserDetails(actingUser);
  await site.save();

  if (nameChanged || codeChanged) {
    const siteIdStr = String(site._id);
    const snapshot = { "site.name": site.name, "site.code": site.code };
    await Promise.all([
      Circuit.updateMany({ "site.id": siteIdStr }, { $set: snapshot }),
      Ticket.updateMany({ "site.id": siteIdStr }, { $set: snapshot }),
    ]);
  }

  return site;
};

/**
 * Update site by id
 * @param {ObjectId} siteId
 * @param {Object} updateBody
 * @param {Object} actingUser
 * @returns {Promise<Site>}
 */
const updateSiteById = async (siteId, updateBody, actingUser) => {
  const site = await getActiveSiteById(siteId);
  return updateSite(site, updateBody, actingUser);
};

/**
 * Deactivate site by id. Blocks if the site has any active circuits -
 * the admin must delete those first, rather than this silently cascading
 * to them.
 * @param {ObjectId} siteId
 * @param {Object} actingUser
 * @returns {Promise<Site>}
 */
const deactivateSiteById = async (siteId, actingUser) => {
  const site = await getSiteById(siteId);
  if (!site) {
    throw new ApiError(httpStatus.NOT_FOUND, "Site not found");
  } else if (!site.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Site is not active");
  }

  const activeCircuitCount = await Circuit.countDocuments({ "site.id": siteId, active: true });
  if (activeCircuitCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete site: ${activeCircuitCount} active circuit(s) still reference it. Delete them first.`
    );
  }

  site.active = false;
  site.deletedAt = new Date();
  site.deletedBy = extractUserDetails(actingUser);
  await site.save();
  return site;
};

/**
 * Restore a deleted site by id
 * @param {ObjectId} siteId
 * @returns {Promise<Site>}
 */
const restoreSiteById = async (siteId) => {
  const site = await getSiteById(siteId);
  if (!site) {
    throw new ApiError(httpStatus.NOT_FOUND, "Site not found");
  } else if (site.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Site is already active");
  }
  const customer = await getCustomerById(site.customer.id);
  if (!customer || !customer.active) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot restore site: its customer is deleted. Restore the customer first."
    );
  }
  const circuitIdsToRestore = site.cascadeDeactivatedCircuitIds || [];
  if (circuitIdsToRestore.length > 0) {
    await Circuit.updateMany(
      { _id: { $in: circuitIdsToRestore }, active: false },
      { active: true, deletedAt: null, deletedBy: null }
    );
  }

  site.active = true;
  site.deletedAt = null;
  site.deletedBy = null;
  site.cascadeDeactivatedCircuitIds = [];
  await site.save();
  return site;
};

/**
 * Permanently remove a soft-deleted site from the database. Only ever usable
 * on a site that's already soft-deleted (active: false) - this is a one-way
 * admin cleanup action, not a replacement for the normal deactivate/restore
 * flow. Prunes the site's id out of its Region's `sites` array so that array
 * doesn't accumulate a dangling reference; the site's own soft-deleted
 * Circuits are left alone (each is independently visible/manageable in its
 * own Deleted Circuits list).
 * @param {ObjectId} siteId
 * @returns {Promise<void>}
 */
const permanentlyDeleteSiteById = async (siteId) => {
  const site = await getSiteById(siteId);
  if (!site) {
    throw new ApiError(httpStatus.NOT_FOUND, "Site not found");
  }
  if (site.active) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      "Site must be deleted before it can be permanently removed"
    );
  }
  if (_.get(site, "region.id")) {
    // Region.sites is a Mixed array storing raw ObjectId elements (see
    // createSite's `_.concat(region.sites, createdSite._id)`) - $pull with a
    // plain string id won't match those by BSON type, so it must be cast.
    await Region.updateOne(
      { _id: site.region.id },
      { $pull: { sites: new mongoose.Types.ObjectId(siteId) } }
    );
  }
  await Site.deleteOne({ _id: siteId });
};

/**
 * @param {ObjectId} siteId
 * @param {String} contactId
 * @returns {Promise<Site>}
 */
const addContact = async (siteId, contactId) => {
  const site = await getActiveSiteById(siteId);
  logger.debug(`adding contact to site: ${site.name}`);
  const contacts = _.concat(site.contactPersons, contactId);
  _.set(site, "contactPersons", contacts);
  await site.save();
  return site;
};

/**
 * @param {ObjectId} siteId
 * @param {String} circuitId
 * @returns {Promise<Site>}
 */
const addCircuit = async (site, circuitId) => {
  // const site = await getActiveSiteById(siteId);
  // logger.debug(`adding contact to site: ${site.name}`);
  const circuits = _.concat(site.contactPersons, circuitId);
  _.set(site, "circuits", circuits);
  await site.save();
  return site;
};

/**
 * @param {ObjectId} siteId
 * @param {String} circuitId
 * @returns {Promise<Site>}
 */
const addCircuitById = async (siteId, circuitId) => {
  const site = await getActiveSiteById(siteId);
  // return addCircuit(site, circuitId);
  const circuits = _.concat(site.circuits, circuitId);
  _.set(site, "circuits", circuits);
  await site.save();
  return site;
};

const BULK_UPLOAD_COLUMNS = ["Customer Name", "Site Name", "End User", "Address", "Town", "Postal Code", "Country"];

/**
 * Bulk-create sites from an uploaded CSV buffer. Validates every row first -
 * a matching active Customer, and no duplicate Site (within the file or
 * already in the DB) for that customer - and only inserts anything if every
 * row passes. Returns the list of failed rows (with reasons) instead of
 * throwing, so the caller can build a downloadable audit report.
 * @param {Buffer} fileBuffer
 * @returns {Promise<{success: boolean, totalRows: number, insertedCount: number, failedRows: Array}>}
 */
const bulkUploadSites = async (fileBuffer) => {
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
    const errors = [];

    if (!customerName) errors.push("Customer Name is required");
    if (!siteName) errors.push("Site Name is required");

    let customer = null;
    if (customerName) {
      // eslint-disable-next-line no-await-in-loop
      customer = await getCustomerByName(customerName);
      if (!customer || !customer.active) {
        errors.push("Customer not found or inactive");
      }
    }

    if (customer && siteName) {
      const code = createCodeFromName(siteName, customer.code);
      if (seenCodes.has(code)) {
        errors.push("Duplicate Customer + Site Name within this file");
      } else {
        seenCodes.add(code);
        // eslint-disable-next-line no-await-in-loop
        const existingSite = await Site.findOne({ code });
        if (existingSite) {
          errors.push("A site with this name already exists for this customer");
        }
      }
    }

    if (errors.length > 0) {
      failedRows.push({ row: rowNumber, customerName, siteName, errors: errors.join("; ") });
    } else {
      validRows.push({
        name: siteName,
        customerId: customer.id,
        address: _.get(record, "Address", "").trim(),
        postalCode: _.get(record, "Postal Code", "").trim(),
        town: _.get(record, "Town", "").trim(),
        country: _.get(record, "Country", "").trim(),
        endUser: _.get(record, "End User", "").trim(),
      });
    }
  }

  if (failedRows.length > 0) {
    return { success: false, totalRows: records.length, insertedCount: 0, failedRows };
  }

  const created = [];
  for (let i = 0; i < validRows.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const site = await createSite(validRows[i]);
    created.push(site);
  }

  return { success: true, totalRows: records.length, insertedCount: created.length, failedRows: [] };
};

module.exports = {
  createSite,
  querySites,
  countCircuitsForFilterByStatus,
  getLocationsBySiteIds,
  getSiteById,
  updateSiteById,
  deactivateSiteById,
  restoreSiteById,
  permanentlyDeleteSiteById,
  getActiveSiteById,
  addContact,
  getSiteByCustomerAndName,
  getOrCreateSite,
  addCircuitById,
  addCircuit,
  getAuthorizedSite,
  bulkUploadSites,
};
