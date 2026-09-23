const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");
const {
  stageOptions,
  quoteStatusOptions,
  supplierQuoteStatusOptions,
  linkTypeOptions,
  ipRequirementOptions,
  interfaceOptions,
} = require("../config/opportunityOptions");
const { bandwidthOptions, productOptions } = require("../config/circuitOptions");
const { currencyOptions } = require("../config/currencyOptions");
const currencyCodes = currencyOptions.map((option) => option.code);

// Same shape as Ticket's attachmentSchema (Server/src/models/ticket.model.js)
// - files live in S3, keyed here.
const attachmentSchema = {
  key: { type: String, default: "" },
  originalName: { type: String, required: true },
  mimeType: { type: String },
  size: { type: Number },
  uploadedBy: {
    id: { type: String },
    name: { type: String },
    email: { type: String },
  },
  uploadedAt: { type: String },
};

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
    // Sales Portal Template 15Sep26.xlsx - captured once, at creation time
    // (fixed fields, not a repeatable list, same shape as convertedOrder
    // below). Supplier quotes remain a repeatable list since a customer
    // request can go out to several suppliers over its lifetime.
    customerRequest: {
      requestId: { type: String, default: "" },
      requestDate: { type: String, default: "" },
      linkType: { type: String, enum: ["", ...linkTypeOptions], default: "" },
      siteAddress: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zipCode: { type: String, default: "" },
      country: { type: String, default: "" },
      product: { type: String, enum: ["", ...productOptions], default: "" },
      ipRequirement: { type: String, enum: ["", ...ipRequirementOptions], default: "" },
      interface: { type: String, enum: ["", ...interfaceOptions], default: "" },
      downBandwidth: { type: String, enum: ["", ...bandwidthOptions], default: "" },
      upBandwidth: { type: String, enum: ["", ...bandwidthOptions], default: "" },
      contractTerm: { type: String, default: "" },
      quoteSubmitDate: { type: String, default: "" },
      quoteStatus: { type: String, enum: quoteStatusOptions, default: "Pending" },
      currency: { type: String, enum: ["", ...currencyCodes], default: "" },
      nrc: { type: Number, default: null },
      mrc: { type: Number, default: null },
      // Every quoteStatus this Customer Request has been set to, in order,
      // including the initial value at creation - see
      // opportunity.service.js's createOpportunity/updateOpportunityById.
      // currency/nrc/mrc are a snapshot of those fields as of that change,
      // not just the status itself. A new entry is also logged when
      // currency/nrc/mrc change on their own, status unchanged ("capture
      // ... for every price change even if the status does not change"),
      // and every entry records who made that change.
      statusHistory: {
        type: [
          {
            status: { type: String },
            changedAt: { type: String },
            currency: { type: String },
            nrc: { type: Number },
            mrc: { type: Number },
            user: {
              id: { type: String },
              name: { type: String },
              email: { type: String },
              role: { type: String },
            },
          },
        ],
        default: [],
      },
    },
    supplierCommunications: {
      type: [
        {
          supplier: { type: String, default: "" },
          quoteRequestDate: { type: String, default: "" },
          currency: { type: String, enum: ["", ...currencyCodes], default: "" },
          lec: { type: String, default: "" },
          nrc: { type: Number, default: null },
          mrc: { type: Number, default: null },
          quoteSubmitDate: { type: String, default: "" },
          quoteStatus: { type: String, enum: supplierQuoteStatusOptions, default: "Pending" },
          // Every quoteStatus this entry has been set to, in order, including
          // the initial value at creation. currency/nrc/mrc are a snapshot
          // of those fields as of that change, not just the status itself. A
          // new entry is also logged when currency/nrc/mrc change on their
          // own, status unchanged, and every entry records who made that
          // change - same as customerRequest.statusHistory above.
          statusHistory: {
            type: [
              {
                status: { type: String },
                changedAt: { type: String },
                currency: { type: String },
                nrc: { type: Number },
                mrc: { type: Number },
                user: {
                  id: { type: String },
                  name: { type: String },
                  email: { type: String },
                  role: { type: String },
                },
              },
            ],
            default: [],
          },
          attachments: {
            type: [attachmentSchema],
            default: [],
          },
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
