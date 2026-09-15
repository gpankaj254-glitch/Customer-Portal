/* eslint-disable no-unused-vars */
const httpStatus = require("http-status");
const _ = require("lodash");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const {
  vendorService,
  contactService,
  // circuitService,
} = require("../services");
const logger = require("../config/logger");
const { createGetVendorFilter, activeOnly } = require("../utils/filters");

// const { isVendor } = require("../config/roles");

const getOrCreateVendorByName = async (
  name,
  vendorCon1,
  vendorCon2,
  vendorCon3
) => {
  let vendor = await vendorService.getVendorByName(name);
  if (!vendor) {
    vendor = await vendorService.createVendor({ name });

    // return regionService.createDefaultRegion(vendor);
  }
  return vendor;
};

const createVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.createVendor(req.body[0]);
  logger.debug(`vendor ----> ${JSON.stringify(vendor)}`);

  if (!vendor) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to create Vendor"
    );
  }
  res.status(httpStatus.CREATED).send([vendor]);
});

const attachContacts = async (vendor) => {
  const contactList = await contactService.getActiveContactsById(
    vendor.contactPersons
  );
  // logger.debug(`result ----> ${JSON.stringify(contacts)}`);
  const updatedVendor = _.assign({}, { contactList }, vendor);
  return updatedVendor;
};

const getVendors = catchAsync(async (req, res) => {
  const search = _.trim(_.get(req.body, "search", ""));
  const baseFilter = _.omit(req.body, "search");
  const filter = activeOnly(createGetVendorFilter(req.user, baseFilter));

  if (search) {
    _.assign(filter, {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ],
    });
  }

  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await vendorService.queryVendors(filter, options);
  result.results = await Promise.all(
    result.results.map(async (vendor) => {
      const vendorObj = vendor.toJSON();
      return attachContacts(vendorObj);
    })
  );
  res.send(result);
});

const getVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.getVendorById(req.params.vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, "Vendor not found");
  }
  res.send(vendor);
});

const updateVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.updateVendorById(
    req.params.vendorId,
    req.body,
    req.user
  );
  res.send(vendor);
});

const deactivateVendor = catchAsync(async (req, res) => {
  await vendorService.deactivateVendorById(req.params.vendorId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const getDeletedVendors = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await vendorService.queryVendors({ active: false }, options);
  res.send(result);
});

const restoreVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.restoreVendorById(req.params.vendorId);
  res.send(vendor);
});

const bulkUploadVendors = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No file uploaded");
  }
  const result = await vendorService.bulkUploadVendors(req.file.buffer);
  res.send(result);
});

module.exports = {
  createVendor,
  getVendors,
  getVendor,
  updateVendor,
  deactivateVendor,
  getDeletedVendors,
  restoreVendor,
  bulkUploadVendors,
  getOrCreateVendorByName,
};
