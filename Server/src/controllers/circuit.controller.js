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
  const filter = activeOnly(filterByCustomerId(req.user, req.body));
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await circuitService.queryCircuits(filter, options);
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
  moveCircuit,
  deactivateCircuit,
  getDeletedCircuits,
  restoreCircuit,
  permanentlyDeleteCircuit,
  bulkUploadCircuits,
  // getOrCreateCircuitByVendorId,
  // getCircuitByVendorId,
};
