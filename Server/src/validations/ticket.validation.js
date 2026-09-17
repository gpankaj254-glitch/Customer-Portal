const Joi = require("joi");
const { problemTypeOptions, priorityOptions, siteAccessHoursOptions, statusOptions, closureCodeOptions, rfoStatusOptions } = require("../config/ticketOptions");

const createTicket = {
  body: Joi.array().items(
    Joi.object().keys({
      circuitId: Joi.string().required(),
      problemType: Joi.string()
        .valid(...problemTypeOptions)
        .required(),
      problemStartDate: Joi.string().allow(""),
      customerReference: Joi.string().allow(""),
      priority: Joi.string()
        .valid(...priorityOptions)
        .required(),
      description: Joi.string().required(),
      siteChecklist: Joi.object().keys({
        powerAvailable: Joi.boolean(),
        physicalConnectionCheck: Joi.boolean(),
        siteAccessHours: Joi.string().valid("", ...siteAccessHoursOptions),
        siteAccessHoursOtherText: Joi.string().allow(""),
      }),
    })
  ),
};

const getTickets = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
  body: Joi.object(),
};

// const getTicket = {
//   params: Joi.object().keys({
//     ticketId: Joi.string(),
//   }),
// };

const updateTicket = {
  body: Joi.array().items(
    Joi.object().keys({
      ticketId: Joi.required(),
      problemType: Joi.string().valid(...problemTypeOptions),
      customerReference: Joi.string().allow(""),
      priority: Joi.string().valid(...priorityOptions),
      status: Joi.string()
        .valid(...statusOptions)
        .required(),
      closureCode: Joi.string().valid("", ...closureCodeOptions).allow(""),
      scxInternalComments: Joi.string().allow(""),
      vendorTicketId: Joi.string().allow(""),
      vendorTicketCreateDate: Joi.string().allow(""),
      vendorTicketStatus: Joi.string().allow(""),
      vendorTicketClosureDate: Joi.string().allow(""),
      rfoStatus: Joi.string().valid("", ...rfoStatusOptions),
      ticketStartDateTime: Joi.string().allow(""),
      actualIssueStartDateTime: Joi.string().allow(""),
      reportedToSupplier: Joi.string().allow(""),
      resolvedFromSupplier: Joi.string().allow(""),
      issueReportedResolvedToAryaka: Joi.string().allow(""),
      actualDownTimeMinutes: Joi.number().allow(null),
      issueResolvedDateTime: Joi.string().allow(""),
      overallDownTime: Joi.number().allow(null),
      rfo: Joi.string().allow(""),
      reason: Joi.string().allow(""),
      reasonCode: Joi.string().allow(""),
      remarks: Joi.string().allow(""),
      scloudxBucket: Joi.number().allow(null),
      supplierBucket: Joi.number().allow(null),
      customerBucket: Joi.number().allow(null),
      category: Joi.string().allow(""),
      totalMinutes: Joi.number().allow(null),
      downTimeMinutes: Joi.number().allow(null),
      uptimePercent: Joi.number().allow(null),
      downTimeHours: Joi.number().allow(null),
    })
  ),
};

const appendDescription = {
  body: Joi.array().items(
    Joi.object().keys({
      ticketId: Joi.required(),
      descriptionAppend: Joi.string().required(),
    })
  ),
};

const deactivateTicket = {
  params: Joi.object().keys({
    ticketId: Joi.string().required(),
  }),
};

module.exports = {
  createTicket,
  getTickets,
  // getTicket,
  updateTicket,
  appendDescription,
  deactivateTicket,
};
