/* eslint-disable no-unused-vars */
const httpStatus = require("http-status");
const _ = require("lodash");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { circuitService, siteService, vendorService } = require("../services");
const logger = require("../config/logger");
const { filterByCustomerId, activeOnly } = require("../utils/filters");

// const { isCircuit } = require("../config/roles");

// const getOrCreateCircuitByVendorId = async (
//   vendorId,
//   circuitToCreate = {}
// ) => {};

// const createCircuitByVendorIdAndSite = async (vendorId, site, circuitBody) => {
//   logger.info("");
//   await circuitService.getActiveCircuitByVendorId;
// };

// TODO ->

/**
 * @param {Object} circuitBody
 * @param {Object} site
 * @returns {Promise<Site>}
 */
const createCircuitBySite = async (site, circuitBody) => {
  const circuit = await circuitService.createCircuitBySite(site, circuitBody);
  await siteService.addCircuitById(site._id, circuit._id.toString());

  return circuit;
};

const createCircuit = catchAsync(async (req, res) => {
  const reqBody = req.body[0];
  const siteId = _.get(reqBody, "siteId");
  const vendorId = _.get(reqBody, "vendorId");
  const site = await siteService.getActiveSiteById(siteId);
  await vendorService.getActiveVendorById(vendorId);
  const circuit = await createCircuitBySite(site, reqBody);
  if (!circuit) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to create Circuit"
    );
  }
  res.status(httpStatus.CREATED).send([circuit]);
});

const getCircuits = catchAsync(async (req, res) => {
  // search is pulled out separately rather than left in req.body, since
  // filterByCustomerId (and queryCircuits -> Circuit.paginate) treats the
  // filter object as a literal Mongo query - a raw "search" key would just
  // fail to match anything instead of actually searching. Mirrors getSites.
  // statuses is pulled out the same way, and for the same reason it has to
  // be a plain array here rather than the client sending { status: { $in:
  // [...] } } directly - express-mongo-sanitize (see app.js) strips any
  // "$"-prefixed key out of the request body as a NoSQL-injection guard, so
  // a client-supplied $in silently disappears, leaving status: {} and a
  // Mongoose cast error. The $in itself has to be built here instead.
  const search = _.trim(_.get(req.body, "search", ""));
  const statuses = _.get(req.body, "statuses");
  const baseFilter = _.omit(req.body, ["search", "statuses"]);
  const filter = activeOnly(filterByCustomerId(req.user, baseFilter));

  if (Array.isArray(statuses) && statuses.length > 0) {
    // A circuit whose status was never explicitly set still counts as
    // "Live" - the schema default only applies once Mongoose hydrates a
    // document (see circuit.model.js), not to this query itself, so a bare
    // {status: {$in: ["Live"]}} would silently miss every legacy circuit
    // that has no stored status field at all. Mirrors CircuitTable.js's own
    // client-side (circuit.status || "Live") fallback. Combined via $and
    // (not a plain filter.$or, which the search block below would then
    // clobber) so both can coexist if a caller ever sends both.
    const statusCondition = statuses.includes("Live")
      ? { $or: [{ status: { $in: statuses } }, { status: { $in: [null, ""] } }, { status: { $exists: false } }] }
      : { status: { $in: statuses } };
    filter.$and = [...(filter.$and || []), statusCondition];
  }

  if (search) {
    const regex = { $regex: search, $options: "i" };
    // This endpoint is currently only used by the Finance dashboard's circuit
    // table (see FinanceDashboard.js) - the search fields are kept to exactly
    // the columns shown there. Matching on a field the table doesn't display
    // (e.g. Vendor LEC Name, Vendor Circuit ID) is confusing: a result shows
    // up with nothing visible in the row to explain why it matched. Vendor
    // Circuit ID was replaced by SCX Order Ref Number as a displayed column
    // ("Remove Vendor Circuit ID and Replace with SCX Order Ref Number"), so
    // it's replaced here too.
    const orConditions = [
      { "site.name": regex },
      { "customer.name": regex },
      { scloudxOrderReference: regex },
      { customerCircuitBillStartDate: regex },
      { customerCircuitContractTerm: regex },
      { vendorCircuitBillStartDate: regex },
      { vendorCircuitContractTerm: regex },
    ];
    // Vendor Name isn't stored on the circuit itself (only vendorId), so
    // matching it needs a lookup into Vendor first.
    const matchingVendorIds = await vendorService.findVendorIdsMatchingSearch(search);
    if (matchingVendorIds.length > 0) {
      orConditions.push({ vendorId: { $in: matchingVendorIds } });
    }
    filter.$and = [...(filter.$and || []), { $or: orConditions }];
  }

  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await circuitService.queryCircuits(filter, options);
  // "Live Circuit Inventory"/"Ceased Circuit Inventory" (the Inventory
  // module's circuit-centric tabs) show each circuit's Site Address, which
  // isn't stored on the circuit itself (only site.id/name/code) - batch-
  // enriched here the same way getSites attaches each site's circuits.
  // Harmless extra field for every other caller of this endpoint (e.g. the
  // Finance dashboard's circuit table), which just ignores it.
  const siteIds = [...new Set(result.results.map((circuit) => circuit.site.id).filter(Boolean))];
  const locationsBySiteId = await siteService.getLocationsBySiteIds(siteIds);
  result.results = result.results.map((circuit) => {
    const circuitObj = circuit.toJSON();
    circuitObj.location = locationsBySiteId.get(circuitObj.site.id) || null;
    return circuitObj;
  });
  res.send(result);
});

const getCircuit = catchAsync(async (req, res) => {
  const circuit = await circuitService.getAuthorizedCircuit(req.params.circuitId, req.user);
  if (!circuit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Circuit not found");
  }
  res.send(circuit);
});

const updateCircuit = catchAsync(async (req, res) => {
  const circuit = await circuitService.updateCircuitById(
    req.params.circuitId,
    req.body,
    req.user
  );
  res.send(circuit);
});

const updateCircuitStatus = catchAsync(async (req, res) => {
  const circuit = await circuitService.updateCircuitStatusById(
    req.params.circuitId,
    req.body,
    req.user
  );
  res.send(circuit);
});

const moveCircuit = catchAsync(async (req, res) => {
  const { siteId, updateTickets } = req.body;
  const targetSite = await siteService.getActiveSiteById(siteId);
  const circuit = await circuitService.moveCircuitToSite(req.params.circuitId, targetSite, {
    updateTickets: updateTickets !== false,
    actingUser: req.user,
  });
  res.send(circuit);
});

const deactivateCircuit = catchAsync(async (req, res) => {
  await circuitService.deactivateCircuitById(req.params.circuitId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const getDeletedCircuits = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await circuitService.queryCircuits({ active: false }, options);
  res.send(result);
});

const restoreCircuit = catchAsync(async (req, res) => {
  const circuit = await circuitService.restoreCircuitById(req.params.circuitId);
  res.send(circuit);
});

const permanentlyDeleteCircuit = catchAsync(async (req, res) => {
  await circuitService.permanentlyDeleteCircuitById(req.params.circuitId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkUploadCircuits = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No file uploaded");
  }
  const { totalRows, failedRows, validRows } = await circuitService.validateBulkUploadCircuits(req.file.buffer);

  if (failedRows.length > 0) {
    res.send({ success: false, totalRows, insertedCount: 0, failedRows });
    return;
  }

  const created = await circuitService.bulkCreateCircuitsBySite(validRows);

  res.send({ success: true, totalRows, insertedCount: created.length, failedRows: [] });
});

module.exports = {
  createCircuit,
  createCircuitBySite,
  getCircuits,
  getCircuit,
  updateCircuit,
  updateCircuitStatus,
  moveCircuit,
  deactivateCircuit,
  getDeletedCircuits,
  restoreCircuit,
  permanentlyDeleteCircuit,
  bulkUploadCircuits,
  // getOrCreateCircuitByVendorId,
  // getCircuitByVendorId,
};
