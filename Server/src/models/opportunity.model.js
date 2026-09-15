const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");
const { stageOptions, orderStatusOptions } = require("../config/opportunityOptions");

const opportunitySchema = mongoose.Schema(
  {
    // Human-friendly opportunity number shown to users, e.g. "OPP26090001" -
    // separate from the Mongo _id. Assigned atomically via the Counter
    // collection, same pattern as Ticket's ticketId.
    opportunityId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional link to an existing Customer - left unset for a prospect that
    // isn't a customer yet, in which case prospectName carries the name.
    customer: {
      id: { type: String },
      name: { type: String },
      code: { type: String },
    },
    prospectName: {
      type: String,
      default: "",
    },
    value: {
      type: Number,
      default: null,
    },
    stage: {
      type: String,
      enum: stageOptions,
      default: "New",
    },
    expectedCloseDate: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    owner: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
    },
    // Populated once stage moves to "Converted" - manual entry, no separate
    // Order record.
    convertedOrder: {
      orderNumber: { type: String, default: "" },
      orderValue: { type: Number, default: null },
      convertedAt: { type: Date, default: null },
    },
    latestUpdate: {
      stage: { type: String },
      comment: { type: String },
      user: {
        id: { type: String },
        name: { type: String },
        email: { type: String },
        role: { type: String },
      },
      updatedAt: { type: String },
    },
    history: {
      type: Array,
      default: [],
    },
    // Sales Portal Template 15Sep26.xlsx - each opportunity can have several
    // customer requests and several supplier quotes over its lifetime, so
    // both are repeatable lists rather than a single fixed set of fields.
    customerCommunications: {
      type: [
        {
          customerName: { type: String, default: "" },
          requestDate: { type: String, default: "" },
          requestRef: { type: String, default: "" },
          linkCategory: { type: String, default: "" },
          address: { type: String, default: "" },
          cityTown: { type: String, default: "" },
          stateProvince: { type: String, default: "" },
          postalCode: { type: String, default: "" },
          country: { type: String, default: "" },
          product: { type: String, default: "" },
          ip: { type: String, default: "" },
          interface: { type: String, default: "" },
          downBandwidth: { type: Number, default: null },
          upBandwidth: { type: Number, default: null },
          termMonths: { type: Number, default: null },
          quoteSentToCustomer: { type: String, default: "" },
          orderStatus: { type: String, enum: orderStatusOptions, default: "Pending" },
        },
      ],
      default: [],
    },
    supplierCommunications: {
      type: [
        {
          supplier: { type: String, default: "" },
          quoteRequestDate: { type: String, default: "" },
          quoteReceivedDate: { type: String, default: "" },
          lec: { type: String, default: "" },
          currency: { type: String, default: "" },
          nrc: { type: Number, default: null },
          mrc: { type: Number, default: null },
        },
      ],
      default: [],
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

opportunitySchema.set("toJSON", {
  transform(doc, ret) {
    ret.updatedAt = doc.updatedAt;
    return ret;
  },
});

opportunitySchema.plugin(toJSON);
opportunitySchema.plugin(paginate);

/**
 * @typedef Opportunity
 */
const Opportunity = mongoose.model("Opportunity", opportunitySchema);

module.exports = Opportunity;
