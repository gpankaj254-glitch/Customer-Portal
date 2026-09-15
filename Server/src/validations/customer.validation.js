const Joi = require("joi");

const createCustomer = {
  body: Joi.array().items(
    Joi.object().keys({
      name: Joi.string().required(),
    })
  ),
};

const getCustomers = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
  body: Joi.object(),
};

const getCustomer = {
  params: Joi.object().keys({
    customerId: Joi.string(),
  }),
};

const updateCustomer = {
  params: Joi.object().keys({
    customerId: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      regions: Joi.array(),
      customerCode: Joi.string(),
    })
    .min(1),
};

const deactivateCustomer = {
  params: Joi.object().keys({
    customerId: Joi.string().required(),
  }),
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deactivateCustomer,
};
