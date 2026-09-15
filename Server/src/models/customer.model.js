const mongoose = require("mongoose");
// const validator = require("validator");
// const bcrypt = require("bcryptjs");
const { toJSON, paginate } = require("./plugins");
// const { roles } = require("../config/roles");

const customerSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    defaultRegion: {
      type: String,
      // required: true,
      // unique: false,
      trim: true,
      lowercase: true,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    regions: {
      type: Array,
      default: [],
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

customerSchema.set("toJSON", {
  transform(doc, ret) {
    ret.updatedAt = doc.updatedAt;
    return ret;
  },
});

// add plugin that converts mongoose to json
customerSchema.plugin(toJSON);
customerSchema.plugin(paginate);

/**
 * Check if customerCode is taken
 * @param {string} customerCode
 * @returns {Promise<boolean>}
 */
customerSchema.statics.isCustomerCodeTaken = async function (customerCode) {
  const customer = await this.findOne({
    customerCode,
  });
  return !!customer;
};

// /**
//  * @param {ObjectId} id
//  * @returns {Promise<boolean>}
//  */
// customerSchema.statics.isActive = async function (id) {
//   const record = await this.findById(id);
//   return record.isActive;
// };

/**
 * @typedef Customer
 */
const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
