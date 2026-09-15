const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const siteSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    location: {
      address: {
        type: String,
        default: "",
      },
      postalCode: {
        type: String,
        default: "",
      },
      country: {
        type: String,
        default: "",
      },
      town: {
        type: String,
        default: "",
      },
    },
    region: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      code: {
        type: String,
        required: true,
      },
    },
    customer: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      code: {
        type: String,
        required: true,
      },
    },
    customerSiteIdentifier: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
    hardware: {
      type: Array,
      default: [],
    },
    circuits: {
      type: Array,
      default: [],
    },
    services: {
      type: Array,
      default: [],
    },
    contactPersons: {
      type: Array,
      default: [],
    },
    category: {
      type: String,
      // required: true,
      lowercase: true,
      default: null,
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
    // Circuits that were active and got cascade-deactivated when this site
    // was deleted - restoring the site only reactivates these, not any
    // circuit that was already independently inactive beforehand.
    cascadeDeactivatedCircuitIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

siteSchema.set("toJSON", {
  transform(doc, ret) {
    ret.updatedAt = doc.updatedAt;
    return ret;
  },
});

// add plugin that converts mongoose to json
siteSchema.plugin(toJSON);
siteSchema.plugin(paginate);

/**
 * @param {ObjectId} id
 * @returns {Promise<boolean>}
 */
siteSchema.statics.isActive = async function (id) {
  const record = await this.findById(id);
  return record.isActive;
};

/**
 * @typedef Site
 */
const Site = mongoose.model("Site", siteSchema);

module.exports = Site;
