const Joi = require("joi");

const createRegion = {
  body: Joi.array().items(
    Joi.object().keys({
      name: Joi.string().required(),
      customerId: Joi.string().required(),
    })
  ),
};

const getRegions = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
  body: Joi.object(),
};

// const getRegion = {
//   params: Joi.object().keys({
//     regionId: Joi.string(),
//   }),
// };

// const updateRegion = {
//   body: Joi.object()
//     .keys({
//       regionId: Joi.required(),
//       name: Joi.string(),
//       regions: Joi.array(),
//       code: Joi.string(),
//     })
//     .min(2),
// };

// const deactivateRegion = {
//   params: Joi.object().keys({
//     regionId: Joi.string().required(),
//   }),
// };

module.exports = {
  createRegion,
  getRegions,
  // getRegion,
  // updateRegion,
  // deactivateRegion,
};
