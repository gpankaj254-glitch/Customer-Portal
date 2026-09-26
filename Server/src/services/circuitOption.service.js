const httpStatus = require("http-status");
const { CircuitOption } = require("../models");
const ApiError = require("../utils/ApiError");
const { extractUserDetails } = require("../utils/extractors");

// "Display existing Product/Bandwidth options in Dropdown ... Can we also
// change existing product/BW Value?" - the original built-in names
// (config/circuitOptions.js) are seeded into this same collection once (see
// scripts/seed-circuit-options.js) with builtIn:true, so from here on every
// option - built-in or admin-added - is just a CircuitOption document, all
// equally renameable/deactivatable through this one feature. Sorted by
// sortOrder first so the built-ins keep their original deliberate order
// (bandwidths ascending numerically, not alphabetically); anything added
// afterward sorts to the end.
const OPTION_SORT = { sortOrder: 1, name: 1 };

/**
 * Every dropdown across the app that used to import the static
 * productOptions/bandwidthOptions list directly should call this instead
 * (via the /circuit-option/get endpoint) so admin add/rename/deactivate
 * changes show up without a deploy.
 * @param {"product"|"bandwidth"} type
 * @returns {Promise<string[]>}
 */
const getCircuitOptionNames = async (type) => {
  const options = await CircuitOption.find({ type, active: true }).sort(OPTION_SORT).select("name").lean();
  return options.map((o) => o.name);
};

/**
 * The Product Management page's own list - every active option of this
 * type (built-in and admin-added alike), each with its own _id so any of
 * them can be renamed/deactivated.
 * @param {"product"|"bandwidth"} type
 * @returns {Promise<CircuitOption[]>}
 */
const listManagedCircuitOptions = async (type) => {
  // No .lean() here (unlike getCircuitOptionNames above) - the client needs
  // each option's own id (via the toJSON plugin's _id->id transform, which
  // only runs on real Mongoose documents, not lean() plain objects) to know
  // which row a rename/deactivate applies to.
  return CircuitOption.find({ type, active: true }).sort(OPTION_SORT);
};

/**
 * Case-insensitive duplicate check against every already-added option of
 * this type (built-in or not).
 * @param {"product"|"bandwidth"} type
 * @param {string} name
 * @param {ObjectId} [excludeId]
 * @returns {Promise<boolean>}
 */
const isNameTaken = async (type, name, excludeId) => {
  return CircuitOption.isNameTaken(type, name, excludeId);
};

/**
 * @param {Object} body - { type, name }
 * @param {Object} user
 * @returns {Promise<CircuitOption>}
 */
const createCircuitOption = async (body, user) => {
  if (await isNameTaken(body.type, body.name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `This ${body.type} name already exists`);
  }
  const last = await CircuitOption.findOne({ type: body.type }).sort({ sortOrder: -1 }).select("sortOrder").lean();
  return CircuitOption.create({
    type: body.type,
    name: body.name.trim(),
    sortOrder: (last ? last.sortOrder : 0) + 10,
    createdBy: extractUserDetails(user),
    updatedBy: extractUserDetails(user),
  });
};

const getCircuitOptionById = async (id) => {
  const option = await CircuitOption.findOne({ _id: id });
  if (!option) {
    throw new ApiError(httpStatus.NOT_FOUND, "Option not found");
  }
  return option;
};

/**
 * Rename an existing admin-added Product/Bandwidth option - "allow to ...
 * Change New/Existing Product Name and allow to ... Change Bandwidth
 * Name". Already-saved Circuits/Delivery Orders/Opportunities keep
 * whatever string they stored at the time - this only changes what shows
 * up as the option going forward.
 * @param {ObjectId} id
 * @param {string} name
 * @param {Object} user
 * @returns {Promise<CircuitOption>}
 */
const renameCircuitOption = async (id, name, user) => {
  const option = await getCircuitOptionById(id);
  if (await isNameTaken(option.type, name, id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `This ${option.type} name already exists`);
  }
  option.name = name.trim();
  option.updatedBy = extractUserDetails(user);
  await option.save();
  return option;
};

/**
 * @param {ObjectId} id
 * @param {Object} user
 * @returns {Promise<CircuitOption>}
 */
const deactivateCircuitOption = async (id, user) => {
  const option = await getCircuitOptionById(id);
  option.active = false;
  option.updatedBy = extractUserDetails(user);
  await option.save();
  return option;
};

module.exports = {
  getCircuitOptionNames,
  listManagedCircuitOptions,
  createCircuitOption,
  renameCircuitOption,
  deactivateCircuitOption,
};
