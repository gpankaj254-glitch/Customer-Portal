const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");
const { bandwidthOptions, productOptions } = require("../config/circuitOptions");
const { ipRequirementOptions, interfaceOptions } = require("../config/opportunityOptions");
const { orderStatusOptions, milestoneStatusOptions, siteTypeOptions, orderTypeOptions } = require("../config/deliveryOrderOptions");

// One row of the milestone checklist (Internal order process, ... Handover)
// - see deliveryOrder.service.js's MILESTONE_NAMES for the fixed set every
// order is created with. Status is blank until someone sets it - not
// implicitly "In process".
const milestoneSchema = {
  name: { type: String, required: true },
  status: { type: String, enum: ["", ...milestoneStatusOptions], default: "" },
  date: { type: Date, default: null },
};

// A new circuit install order tracked by SCX Service Delivery, from being
// placed with a vendor through to the circuit being installed and turned up
// ("Completed"). Fields match the real order form/sheet SCX Service Delivery
// already uses (Customer Name, SCloudX Order Ref, Site Address, ... Delivery
// Timelines (days)) rather than linking to an existing Circuit/Site record -
// same active/deletedAt soft-delete convention as every other module.
const deliveryOrderSchema = mongoose.Schema(
  {
    // Human-friendly order number shown to users, e.g. "DO26090001" -
    // separate from the Mongo _id. Assigned atomically via the Counter
    // collection, same pattern as Ticket's ticketId / Opportunity's
    // opportunityId (see deliveryOrder.service.js).
    orderId: {
      type: String,
      unique: true,
    },
    // The order sheet's own row-numbering ("SN") - free text (not
    // auto-generated, unlike orderId above), entered by whoever places the
    // order.
    serialNumber: {
      type: String,
      default: "",
    },
    // "Dropdown (existing) or New" - set when an existing Customer was
    // picked; left unset (newCustomerName carries the name instead) for a
    // customer not yet in the system, same distinction as Opportunity's
    // customer/prospectName.
    customer: {
      id: { type: String },
      name: { type: String },
      code: { type: String },
    },
    newCustomerName: {
      type: String,
      default: "",
    },
    scloudxOrderReference: {
      type: String,
      required: true,
    },
    // "New" by default - the common case. Anything else links this order to
    // an existing one being changed (relatedOrderId, the other order's own
    // orderId - not a Mongo _id, so it displays and searches like every
    // other reference field here).
    orderType: {
      type: String,
      enum: ["", ...orderTypeOptions],
      default: "New",
    },
    relatedOrderId: {
      type: String,
      default: "",
    },
    siteAddress: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    zipCode: {
      type: String,
      default: "",
    },
    product: {
      type: String,
      enum: ["", ...productOptions],
      default: "",
    },
    bandwidth: {
      type: String,
      enum: ["", ...bandwidthOptions],
      default: "",
    },
    // The customer-side contract term - maps to Circuit's own
    // customerCircuitContractTerm once a Circuit is created from this order
    // (see deliveryOrder.service.js's createCircuitFromOrder).
    contractTerm: {
      type: String,
      default: "",
    },
    // The vendor-side contract term - captured on the Edit Order tab,
    // separate from contractTerm above since Circuit itself splits the two
    // (customerCircuitContractTerm/vendorCircuitContractTerm).
    vendorContractTerm: {
      type: String,
      default: "",
    },
    ipRequirement: {
      type: String,
      enum: ["", ...ipRequirementOptions],
      default: "",
    },
    interface: {
      type: String,
      enum: ["", ...interfaceOptions],
      default: "",
    },
    vendorId: {
      type: String,
      required: true,
    },
    // "Aryaka PO" in the source sheet - the customer's own PO/order
    // reference, generalized here since it isn't specific to one customer.
    customerOrderReference: {
      type: String,
      default: "",
    },
    // Filled in once the vendor assigns one - not part of the New Order
    // form, but editable afterwards (see deliveryOrder.validation.js).
    vendorCircuitId: {
      type: String,
      default: "",
    },
    orderDate: {
      type: Date,
      required: true,
    },
    // Estimated days from Order Date to delivery, as given at order time -
    // the actual outcome is handoverDate below, not a target date.
    deliveryTimelineDays: {
      type: Number,
      default: null,
    },
    // Who currently owns moving the order forward (or OnHold/Completed) -
    // the "VIEW/EDIT ORDERS" screen's own Status, separate from each
    // milestone's own status below. Defaults to SCX, since SCX Service
    // Delivery is who creates the order. Set to "Completed" via the client's
    // "Save and Complete" button, not the plain Status dropdown.
    status: {
      type: String,
      enum: orderStatusOptions,
      default: "SCX",
    },
    // Set once a Circuit has been auto-created from this order (on the
    // status transition to "Completed" - see deliveryOrder.service.js's
    // createCircuitFromOrder). Guards against creating a second Circuit if
    // the order is saved again after already completing, and doubles as a
    // record of which Circuit this order became.
    circuitId: {
      type: String,
      default: "",
    },
    // Fixed checklist (see deliveryOrder.service.js's MILESTONE_NAMES) -
    // always created with all of them, in order; never added to/removed
    // from afterwards, only each entry's own status/date edited.
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
    // Activity Log - one entry per real Status transition (plus automatic
    // Circuit creation), with who made it, when, and a description - same
    // shape/purpose as Ticket's own history field (see ticket.model.js),
    // "Activity Log function for Service Delivery Process as created and
    // managed in NOC Management". Seeded with an "Order created" entry (see
    // deliveryOrder.service.js's createDeliveryOrder/appendHistory).
    history: {
      type: Array,
      default: [],
    },
    // Captured once the order reaches Completed status - handoverDate
    // defaults to now the first time status moves to Completed (mirrors
    // Ticket's closedAt) but stays editable/overridable afterwards. Not
    // shown on the Complete Order Details tab directly (Delivery Date below
    // is what's shown there) but kept as an internal record of when Status
    // actually changed.
    handoverDate: {
      type: Date,
      default: null,
    },
    // Superseded by customerDelayDays below (shown as "Delay (Days)" on the
    // Complete Order Details tab) - kept for backward compatibility, no
    // longer written to by the client.
    delayDays: {
      type: Number,
      default: null,
    },
    // "Delivery Date" - the actual date the order was delivered.
    deliveryDate: {
      type: Date,
      default: null,
    },
    // The customer's own Bill Start Date - separate from deliveryDate above
    // and from deliveryTimelineDays (the estimate given at order time, not
    // the actual outcome).
    customerBillStartDate: {
      type: Date,
      default: null,
    },
    // Days of delay attributable to the customer specifically - shown as
    // "Delay (Days)" and feeds "Days (cal)" (see deliveryOrder client's
    // computeDerivedDays), a display-only calculation, not stored.
    customerDelayDays: {
      type: Number,
      default: null,
    },
    vendorBillStartDate: {
      type: Date,
      default: null,
    },
    // Free text specific to completion tracking - separate from notes
    // below, which is the order's general-purpose note field.
    remarks: {
      type: String,
      default: "",
    },
    siteType: {
      type: String,
      enum: ["", ...siteTypeOptions],
      default: "",
    },
    // Set when siteType is "Existing" - an existing Site's id, chosen from a
    // dropdown scoped to this order's linked Customer.
    siteId: {
      type: String,
      default: "",
    },
    // Only meaningful when siteType is "New".
    newSiteName: {
      type: String,
      default: "",
    },
    // The actual end customer/end user for this order - separate from
    // customer/newCustomerName above (who's billed), same distinction as
    // Site's customerSiteIdentifier ("End User" - see site.model.js).
    endUser: {
      type: String,
      default: "",
    },
    customerPM: {
      type: String,
      default: "",
    },
    customerPMDetails: {
      type: String,
      default: "",
    },
    lmpName: {
      type: String,
      default: "",
    },
    lecPM: {
      type: String,
      default: "",
    },
    lecPMDetails: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
    updatedBy: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

deliveryOrderSchema.set("toJSON", {
  transform(doc, ret) {
    ret.updatedAt = doc.updatedAt;
    return ret;
  },
});

deliveryOrderSchema.plugin(toJSON);
deliveryOrderSchema.plugin(paginate);

/**
 * @typedef DeliveryOrder
 */
const DeliveryOrder = mongoose.model("DeliveryOrder", deliveryOrderSchema);

module.exports = DeliveryOrder;
