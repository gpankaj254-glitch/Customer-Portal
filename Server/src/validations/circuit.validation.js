const Joi = require("joi");
const { bandwidthOptions, productOptions } = require("../config/circuitOptions");

const createCircuit = {
  body: Joi.array().items(
    Joi.object().keys({
      siteId: Joi.string().required(),
      vendorId: Joi.string().required(),
      scloudxOrderReference: Joi.string().required(),
      vendorLECName: Joi.string().required(),
      customerCircuitId: Joi.string().allow(""),
      vendorCircuitId: Joi.string().allow(""),
      vendorOrderReference: Joi.string().allow(""),
      customerOrderReference: Joi.string().allow(""),
      customerCircuitBillStartDate: Joi.string().allow(""),
      customerCircuitContractTerm: Joi.string().allow(""),
      vendorCircuitBillStartDate: Joi.string().allow(""),
      vendorCircuitContractTerm: Joi.string().allow(""),
      bandwidth: Joi.string().valid("", ...bandwidthOptions),
      product: Joi.string().valid("", ...productOptions),
      vendorUptime: Joi.string().allow(""),
      vendorMTTR: Joi.string().allow(""),
    })
  ),
};

const getCircuits = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
  body: Joi.object(),
};

const updateCircuit = {
  params: Joi.object().keys({
    circuitId: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      vendorLECName: Joi.string(),
      customerCircuitId: Joi.string().allow(""),
      vendorCircuitId: Joi.string().allow(""),
      vendorOrderReference: Joi.string().allow(""),
      customerOrderReference: Joi.string().allow(""),
      scloudxOrderReference: Joi.string(),
      customerCircuitBillStartDate: Joi.string().allow(""),
      customerCircuitContractTerm: Joi.string().allow(""),
      vendorCircuitBillStartDate: Joi.string().allow(""),
      vendorCircuitContractTerm: Joi.string().allow(""),
      bandwidth: Joi.string().valid("", ...bandwidthOptions),
      product: Joi.string().valid("", ...productOptions),
      vendorUptime: Joi.string().allow(""),
      vendorMTTR: Joi.string().allow(""),
    })
    .min(1),
};

const deactivateCircuit = {
  params: Joi.object().keys({
    circuitId: Joi.string().required(),
  }),
};

const moveCircuit = {
  params: Joi.object().keys({
    circuitId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    siteId: Joi.string().required(),
    updateTickets: Joi.boolean(),
  }),
};

module.exports = {
  createCircuit,
  getCircuits,
  updateCircuit,
  deactivateCircuit,
  moveCircuit,
};
