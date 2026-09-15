const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");
const { stageOptions } = require("../config/opportunityOptions");

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
