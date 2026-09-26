const Joi = require("joi");
const { objectId } = require("./custom.validation");

const getCircuitOptions = {
  query: Joi.object().keys({
    type: Joi.string().valid("product", "bandwidth").required(),
  }),
};

const createCircuitOption = {
  body: Joi.object().keys({
    type: Joi.string().valid("product", "bandwidth").required(),
    name: Joi.string().trim().min(1).required(),
    // "we need option to place this at what position or after which
    // existing BW option to maintain its Sorting order" - the existing
    // option this new one should be inserted right after; omitted (or
    // blank) still just appends to the end.
    afterId: Joi.string().custom(objectId).allow(""),
  }),
};

const renameCircuitOption = {
  params: Joi.object().keys({
    circuitOptionId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string().trim().min(1).required(),
  }),
};

const deactivateCircuitOption = {
  params: Joi.object().keys({
    circuitOptionId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  getCircuitOptions,
  createCircuitOption,
  renameCircuitOption,
  deactivateCircuitOption,
};
