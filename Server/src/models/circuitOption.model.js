const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

// "Create Product Management Function for SCX Admin - Allow Admin to
// Create/Change New/Existing Product Name and allow to Add/Change
// Bandwidth Name" - one shared collection for both (identical shape and
// operations), distinguished by `type`. `name` is a plain string, the same
// one Circuit/DeliveryOrder/Opportunity's own product/bandwidth fields
// already store directly (not a reference) - renaming an option here does
// not retroactively touch already-saved records, same as any other
// free-text-turned-managed-list in this app (Vendor name, Customer name,
// etc.). Deactivating (not deleting) keeps history/reporting on already-used
// values intact while removing the option from new dropdowns.
const circuitOptionSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["product", "bandwidth"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    // True for the original predefined names (seeded once from
    // config/circuitOptions.js - see scripts/seed-circuit-options.js), false
    // for anything an admin has added since. Both are stored the same way
    // and are equally renameable/deactivatable through this feature - "Can
    // we also change existing product/BW Value?" - this flag is purely
    // informational (shown as a badge in the Product Management UI).
    builtIn: {
      type: Boolean,
      default: false,
    },
    // Preserves the original static arrays' deliberate display order (e.g.
    // bandwidths ascending numerically, not alphabetically) - lower sorts
    // first. Anything added through the UI gets pushed to the end.
    sortOrder: {
      type: Number,
      default: 0,
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
  },
  {
    timestamps: true,
  }
);

circuitOptionSchema.plugin(toJSON);
circuitOptionSchema.plugin(paginate);

/**
 * Case-insensitive duplicate check within one type (Product names and
 * Bandwidth names are two separate namespaces - "DIA" as a Product and
 * some future "DIA" Bandwidth, if that ever happened, wouldn't collide).
 * @param {string} type - "product" or "bandwidth"
 * @param {string} name
 * @param {ObjectId} [excludeId] - the option being renamed, excluded from its own check
 * @returns {Promise<boolean>}
 */
circuitOptionSchema.statics.isNameTaken = async function (type, name, excludeId) {
  const escaped = String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = await this.findOne({
    type,
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
    _id: { $ne: excludeId },
  });
  return !!existing;
};

/**
 * @typedef CircuitOption
 */
const CircuitOption = mongoose.model("CircuitOption", circuitOptionSchema);

module.exports = CircuitOption;
