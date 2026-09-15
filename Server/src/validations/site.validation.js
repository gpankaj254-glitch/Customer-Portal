const Joi = require("joi");

const createSite = {
  body: Joi.array().items(
    Joi.object()
      .keys({
        name: Joi.string(),
        customerId: Joi.string(),
        regionId: Joi.string(),
        contactPersons: Joi.array(),
        endUser: Joi.string(),
        category: Joi.string(),
        address: Joi.string(),
        postalCode: Joi.string(),
        town: Joi.string(),
        country: Joi.string(),
        // sites: Joi.array(),
      })
      .or("regionId", "customerId")
  ),
};

const getSites = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
  body: Joi.object(),
};

const updateSite = {
  params: Joi.object().keys({
    siteId: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      category: Joi.string(),
      customerSiteIdentifier: Joi.string(),
    })
    .min(1),
};

const deactivateSite = {
  params: Joi.object().keys({
    siteId: Joi.string().required(),
  }),
};

module.exports = {
  createSite,
  getSites,
  updateSite,
  deactivateSite,
};
