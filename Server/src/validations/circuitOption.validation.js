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
