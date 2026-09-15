const Joi = require("joi");
const { stageOptions } = require("../config/opportunityOptions");

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
