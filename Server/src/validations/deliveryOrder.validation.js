const Joi = require("joi");
const { objectId } = require("./custom.validation");
const { bandwidthOptions, productOptions } = require("../config/circuitOptions");
const { ipRequirementOptions, interfaceOptions } = require("../config/opportunityOptions");
const {
  orderStatusOptions,
  milestoneStatusOptions,
  milestoneNames,
  siteTypeOptions,
  orderTypeOptions,
} = require("../config/deliveryOrderOptions");

const createDeliveryOrder = {
  // Exactly one of customerId ("Dropdown (existing)") / newCustomerName
  // ("New") must be given - enforced here rather than each being merely
  // optional, so a request naming neither (or, confusingly, both) is
  // rejected up front instead of silently creating an orphan order.
  body: Joi.object().keys({
    customerId: Joi.string(),
    newCustomerName: Joi.string(),
  })
    .xor("customerId", "newCustomerName")
    .concat(
      Joi.object().keys({
        serialNumber: Joi.string().allow(""),
        scloudxOrderReference: Joi.string().required(),
        orderType: Joi.string().valid("", ...orderTypeOptions),
        relatedOrderId: Joi.string().allow(""),
        siteAddress: Joi.string().allow(""),
        city: Joi.string().allow(""),
        state: Joi.string().allow(""),
        country: Joi.string().allow(""),
        zipCode: Joi.string().allow(""),
        product: Joi.string().valid("", ...productOptions),
        bandwidth: Joi.string().valid("", ...bandwidthOptions),
        contractTerm: Joi.string().allow(""),
        ipRequirement: Joi.string().valid("", ...ipRequirementOptions),
        interface: Joi.string().valid("", ...interfaceOptions),
        vendorId: Joi.string().required(),
        customerOrderReference: Joi.string().allow(""),
        orderDate: Joi.string().isoDate().required(),
        deliveryTimelineDays: Joi.number().integer().min(0).allow(null),
      })
    ),
};

const getDeliveryOrders = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
  body: Joi.object(),
};

const getDeliveryOrder = {
  params: Joi.object().keys({
    deliveryOrderId: Joi.string().custom(objectId),
  }),
};

// One row of the "VIEW/EDIT ORDERS" milestone checklist - name must be one
// of the fixed milestoneNames (see deliveryOrderOptions.js); status may be
// blank (not yet touched).
const milestoneItem = Joi.object().keys({
  name: Joi.string().valid(...milestoneNames).required(),
  status: Joi.string().valid("", ...milestoneStatusOptions),
  date: Joi.string().isoDate().allow(""),
});

const updateDeliveryOrder = {
  params: Joi.object().keys({
    deliveryOrderId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      serialNumber: Joi.string().allow(""),
      scloudxOrderReference: Joi.string(),
      orderType: Joi.string().valid("", ...orderTypeOptions),
      relatedOrderId: Joi.string().allow(""),
      siteAddress: Joi.string().allow(""),
      city: Joi.string().allow(""),
      state: Joi.string().allow(""),
      country: Joi.string().allow(""),
      zipCode: Joi.string().allow(""),
      product: Joi.string().valid("", ...productOptions),
      bandwidth: Joi.string().valid("", ...bandwidthOptions),
      contractTerm: Joi.string().allow(""),
      ipRequirement: Joi.string().valid("", ...ipRequirementOptions),
      interface: Joi.string().valid("", ...interfaceOptions),
      customerOrderReference: Joi.string().allow(""),
      vendorCircuitId: Joi.string().allow(""),
      deliveryTimelineDays: Joi.number().integer().min(0).allow(null),
      status: Joi.string().valid(...orderStatusOptions),
      notes: Joi.string().allow(""),
      endUser: Joi.string().allow(""),
      customerPM: Joi.string().allow(""),
      customerPMDetails: Joi.string().allow(""),
      lmpName: Joi.string().allow(""),
      lecPM: Joi.string().allow(""),
      lecPMDetails: Joi.string().allow(""),
      milestones: Joi.array().items(milestoneItem),
      handoverDate: Joi.string().isoDate().allow(""),
      delayDays: Joi.number().integer().allow(null),
      deliveryDate: Joi.string().isoDate().allow(""),
      customerBillStartDate: Joi.string().isoDate().allow(""),
      customerDelayDays: Joi.number().integer().allow(null),
      vendorBillStartDate: Joi.string().isoDate().allow(""),
      remarks: Joi.string().allow(""),
      siteType: Joi.string().valid("", ...siteTypeOptions),
      siteId: Joi.string().allow(""),
      newSiteName: Joi.string().allow(""),
    })
    .min(1),
};

const deleteDeliveryOrder = {
  params: Joi.object().keys({
    deliveryOrderId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createDeliveryOrder,
  getDeliveryOrders,
  getDeliveryOrder,
  updateDeliveryOrder,
  deleteDeliveryOrder,
};
