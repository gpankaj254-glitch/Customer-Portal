const Joi = require("joi");

const createContact = {
  body: Joi.array().items(
    Joi.object().keys({
      name: Joi.string().required(),
      customerId: Joi.string(),
      regionId: Joi.string(),
      siteId: Joi.string(),
      phoneNumbers: Joi.array(),
      emailIds: Joi.array(),
    })
  ),
};

const getContacts = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
  body: Joi.object(),
};

const getContact = {
  params: Joi.object().keys({
    contactId: Joi.string(),
  }),
};

const updateContact = {
  body: Joi.object()
    .keys({
      contactId: Joi.required(),
      name: Joi.string(),
      regions: Joi.array(),
      contactCode: Joi.string(),
    })
    .min(2),
};

const deactivateContact = {
  params: Joi.object().keys({
    contactId: Joi.string().required(),
  }),
};

module.exports = {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deactivateContact,
};
