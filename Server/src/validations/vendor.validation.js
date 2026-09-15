const Joi = require("joi");

const createVendor = {
  body: Joi.array().items(
    Joi.object().keys({
      name: Joi.string().required(),
      regionId: Joi.string(),
      contactPersons: Joi.array(),
      preferredTicketMode: Joi.string(),
      address: Joi.string(),
      postalCode: Joi.string(),
      country: Joi.string(),
      vendorType: Joi.string(),
      vendorUptime: Joi.string().allow(""),
      vendorMTTR: Joi.string().allow(""),
    })
  ),
};

const getVendors = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
  body: Joi.object(),
};

const updateVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      vendorType: Joi.string(),
      preferredTicketMode: Joi.string(),
      vendorUptime: Joi.string().allow(""),
      vendorMTTR: Joi.string().allow(""),
    })
    .min(1),
};

const deactivateVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().required(),
  }),
};

module.exports = {
  createVendor,
  getVendors,
  updateVendor,
  deactivateVendor,
};
