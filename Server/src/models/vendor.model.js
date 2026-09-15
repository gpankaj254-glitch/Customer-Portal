const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const vendorSchema = mongoose.Schema(
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
    vendorType: {
      type: String,
      default: "",
    },
    preferredTicketMode: {
      type: String,
      default: "",
    },
    vendorUptime: {
      type: String,
      default: "",
    },
    vendorMTTR: {
      type: String,
      default: "",
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
        // required: true,
      },
      name: {
        type: String,
        // required: true,
      },
      code: {
        type: String,
        // required: true,
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    contactPersons: {
      type: Array,
      default: [],
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

vendorSchema.set("toJSON", {
  transform(doc, ret) {
    ret.updatedAt = doc.updatedAt;
    return ret;
  },
});

// add plugin that converts mongoose to json
vendorSchema.plugin(toJSON);
vendorSchema.plugin(paginate);

/**
 * @param {ObjectId} id
 * @returns {Promise<boolean>}
 */
vendorSchema.statics.isActive = async function (id) {
  const record = await this.findById(id);
  return record.isActive;
};

/**
 * @typedef Vendor
 */
const Vendor = mongoose.model("Vendor", vendorSchema);

module.exports = Vendor;
