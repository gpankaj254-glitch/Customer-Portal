const Joi = require("joi");
const { objectId } = require("./custom.validation");
const {
  problemTypeOptions,
  priorityOptions,
  siteAccessHoursOptions,
  statusOptions,
  closureCodeOptions,
  rfoRequestStatusOptions,
  rfoCodeOptions,
  vendorTicketStatusOptions,
} = require("../config/ticketOptions");

const createTicket = {
  body: Joi.array().items(
    Joi.object().keys({
      circuitId: Joi.string().required(),
      problemType: Joi.string()
        .valid(...problemTypeOptions)
        .required(),
      otherProblemDetails: Joi.string().allow(""),
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
      otherProblemDetails: Joi.string().allow(""),
      customerReference: Joi.string().allow(""),
      priority: Joi.string().valid(...priorityOptions),
      status: Joi.string()
        .valid(...statusOptions)
        .required(),
      closureCode: Joi.string().valid("", ...closureCodeOptions).allow(""),
      closedAt: Joi.string().isoDate().allow(""),
      closedAtLocal: Joi.string().allow(""),
      scxInternalComments: Joi.string().allow(""),
      vendorTicketId: Joi.string().allow(""),
      vendorTicketCreateDate: Joi.string().allow(""),
      vendorTicketStatus: Joi.string().valid("", ...vendorTicketStatusOptions),
      vendorTicketClosureDate: Joi.string().allow(""),
      // "Add Field - Customer Delay/Hold Time - HH:MM"
      customerDelayTime: Joi.string().allow(""),
      // Redesigned Ticket Closure Details tab - only meaningful once
      // requested is "No" (Yes's own fields are entered via the separate
      // RFO Request tab/endpoint instead - see saveRfo below); mirrors that
      // same rfo object shape.
      rfo: Joi.object().keys({
        problemStartDateTime: Joi.string().allow(""),
        problemStopDateTime: Joi.string().allow(""),
        status: Joi.string().valid("", ...rfoRequestStatusOptions),
        code: Joi.string().valid("", ...rfoCodeOptions),
      }),
    })
  ),
};

// "SCX NOC Users/Admin: EDIT Modify Ticket" - RFO Request tab, its own
// dedicated endpoint (see ticket.route.js/saveTicketRfo) rather than going
// through the general updateTicket above, since it must stay editable even
// once the ticket is Closed/Completed.
const saveRfo = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    requested: Joi.string().valid("", "Yes", "No"),
    requestDate: Joi.string().allow(""),
    problemStartDateTime: Joi.string().allow(""),
    problemStopDateTime: Joi.string().allow(""),
    status: Joi.string().valid("", ...rfoRequestStatusOptions),
    code: Joi.string().valid("", ...rfoCodeOptions),
    description: Joi.string().allow(""),
    // "Give Button at Below - Save and Save and Closed. When Save and
    // Closed is clicked; Save and Change Ticket Status as RFO Closed"
    closeNow: Joi.boolean(),
  }),
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
  saveRfo,
  appendDescription,
  deactivateTicket,
};
