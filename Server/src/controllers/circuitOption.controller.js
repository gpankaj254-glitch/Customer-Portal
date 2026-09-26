const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const { circuitOptionService } = require("../services");

// "Once this is changed, these values should be visible in various
// dropdown menus" - the full merged (static + admin-added) name list, as
// plain strings, for every Product/Bandwidth dropdown across the app.
const getCircuitOptions = catchAsync(async (req, res) => {
  const names = await circuitOptionService.getCircuitOptionNames(req.query.type);
  res.send(names);
});

// "Create Product Management Function for SCX Admin" - the management
// page's own list: just the admin-added options (with _id, so they can be
// renamed/deactivated), not the built-in static ones.
const getManagedCircuitOptions = catchAsync(async (req, res) => {
  const options = await circuitOptionService.listManagedCircuitOptions(req.query.type);
  res.send(options);
});

const createCircuitOption = catchAsync(async (req, res) => {
  const option = await circuitOptionService.createCircuitOption(req.body, req.user);
  res.status(httpStatus.CREATED).send(option);
});

const renameCircuitOption = catchAsync(async (req, res) => {
  const option = await circuitOptionService.renameCircuitOption(req.params.circuitOptionId, req.body.name, req.user);
  res.send(option);
});

const deactivateCircuitOption = catchAsync(async (req, res) => {
  await circuitOptionService.deactivateCircuitOption(req.params.circuitOptionId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  getCircuitOptions,
  getManagedCircuitOptions,
  createCircuitOption,
  renameCircuitOption,
  deactivateCircuitOption,
};
