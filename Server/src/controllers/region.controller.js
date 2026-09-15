const httpStatus = require("http-status");
// const _ = require("lodash");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { regionService } = require("../services");
// const logger = require("../config/logger");
const { filterByCustomerId } = require("../utils/filters");

// const { isRegion } = require("../config/roles");

const getOrCreateRegionByCustomerAndName = async (customer, name) => {
  let region = await regionService.getRegionByCustomerAndName(customer, name);
  if (!region) {
    region = await regionService.createRegionByCustomerAndName(customer, name);
  }
  return region;
};

const createRegion = catchAsync(async (req, res) => {
  const regionToCreate = req.body[0];
  const region = await regionService.createRegion(regionToCreate);
  // await customerService.addRegion()

  if (!region) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to create Region"
    );
  }
  res.status(httpStatus.CREATED).send(region);
});

const getRegions = catchAsync(async (req, res) => {
  // logger.debug(`getRegions req ----> ${JSON.stringify(req)}`);

  const filter = filterByCustomerId(req.user, req.body);
  const options = pick(req.query, ["sortBy", "limit", "page"]);

  const result = await regionService.queryRegions(filter, options);
  res.send(result);
});

const getRegion = catchAsync(async (req, res) => {
  const region = await regionService.getRegionById(req.params.regionId);
  if (!region) {
    throw new ApiError(httpStatus.NOT_FOUND, "Region not found");
  }
  res.send(region);
});

const updateRegion = catchAsync(async (req, res) => {
  const region = await regionService.updateRegionById(
    req.params.regionId,
    req.body
  );
  res.send(region);
});

const deactivateRegion = catchAsync(async (req, res) => {
  await regionService.deactivateRegionById(req.params.regionId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createRegion,
  getRegions,
  getRegion,
  updateRegion,
  deactivateRegion,
  getOrCreateRegionByCustomerAndName,
};
