const Joi = require("joi");

const getClosedTicketsAnalysis = {
  body: Joi.object().keys({
    startDate: Joi.string().allow(""),
    endDate: Joi.string().allow(""),
    customerId: Joi.string().allow(""),
  }),
};

module.exports = {
  getClosedTicketsAnalysis,
};
