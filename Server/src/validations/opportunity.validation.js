const Joi = require("joi");
const {
  stageOptions,
  quoteStatusOptions,
  supplierQuoteStatusOptions,
  linkTypeOptions,
  ipRequirementOptions,
  interfaceOptions,
} = require("../config/opportunityOptions");
const { bandwidthOptions, productOptions } = require("../config/circuitOptions");
const { currencyOptions } = require("../config/currencyOptions");

const currencyCodes = currencyOptions.map((option) => option.code);

const customerRequestSchema = Joi.object().keys({
  requestId: Joi.string().allow(""),
  requestDate: Joi.string().allow(""),
  linkType: Joi.string().valid("", ...linkTypeOptions),
  siteAddress: Joi.string().allow(""),
  city: Joi.string().allow(""),
  state: Joi.string().allow(""),
  zipCode: Joi.string().allow(""),
  country: Joi.string().allow(""),
  product: Joi.string().valid("", ...productOptions),
  ipRequirement: Joi.string().valid("", ...ipRequirementOptions),
  interface: Joi.string().valid("", ...interfaceOptions),
  downBandwidth: Joi.string().valid("", ...bandwidthOptions),
  upBandwidth: Joi.string().valid("", ...bandwidthOptions),
  contractTerm: Joi.string().allow(""),
  quoteSubmitDate: Joi.string().allow(""),
  quoteStatus: Joi.string().valid(...quoteStatusOptions),
  currency: Joi.string().valid("", ...currencyCodes),
  nrc: Joi.number().allow(null),
  mrc: Joi.number().allow(null),
});

const supplierCommunicationItem = Joi.object().keys({
  _id: Joi.string(),
  supplier: Joi.string().allow(""),
  quoteRequestDate: Joi.string().allow(""),
  currency: Joi.string().valid("", ...currencyCodes),
  lec: Joi.string().allow(""),
  nrc: Joi.number().allow(null),
  mrc: Joi.number().allow(null),
  quoteSubmitDate: Joi.string().allow(""),
  quoteStatus: Joi.string().valid(...supplierQuoteStatusOptions),
  // "Edit Supplier Communication: Add Field - bandwith, Remarks".
  bandwidth: Joi.string().valid("", ...bandwidthOptions),
  remarks: Joi.string().allow(""),
});

const createOpportunity = {
  body: Joi.array().items(
    Joi.object().keys({
      name: Joi.string().required(),
      customerId: Joi.string(),
      prospectName: Joi.string().allow(""),
      value: Joi.number(),
      stage: Joi.string().valid(...stageOptions),
      expectedCloseDate: Joi.string().allow(""),
      description: Joi.string().allow(""),
      customerRequest: customerRequestSchema,
    })
  ),
};

const getOpportunities = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
  body: Joi.object().keys({
    search: Joi.string().allow(""),
  }),
};

const getOpportunity = {
  params: Joi.object().keys({
    opportunityId: Joi.string().required(),
  }),
};

const updateOpportunity = {
  params: Joi.object().keys({
    opportunityId: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      customerId: Joi.string(),
      prospectName: Joi.string().allow(""),
      value: Joi.number(),
      stage: Joi.string().valid(...stageOptions),
      comment: Joi.string().allow(""),
      expectedCloseDate: Joi.string().allow(""),
      description: Joi.string().allow(""),
      owner: Joi.object(),
      convertedOrder: Joi.object().keys({
        orderNumber: Joi.string().allow(""),
        orderValue: Joi.number(),
      }),
      customerRequest: customerRequestSchema,
      supplierCommunications: Joi.array().items(supplierCommunicationItem),
    })
    .min(1),
};

const deactivateOpportunity = {
  params: Joi.object().keys({
    opportunityId: Joi.string().required(),
  }),
};

module.exports = {
  createOpportunity,
  getOpportunities,
  getOpportunity,
  updateOpportunity,
  deactivateOpportunity,
};
