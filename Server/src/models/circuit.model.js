const mongoose = require("mongoose");
// const validator = require("validator");
// const bcrypt = require("bcryptjs");
const { toJSON, paginate } = require("./plugins");
const { circuitStatusOptions, circuitChangeTypeOptions } = require("../config/circuitOptions");
// const { roles } = require("../config/roles");

const circuitSchema = mongoose.Schema(
  {
    // name: {
    //   type: String,
    //   required: true,
    //   unique: true,
    // },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    site: {
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
      contactPersons: {
        type: Array,
        default: [],
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
    customerCircuitId: {
      type: String,
      default: "",
    },
    vendorCircuitId: {
      type: String,
      default: "",
    },
    scloudxOrderReference: {
      type: String,
      required: true,
    },
    vendorOrderReference: {
      type: String,
      // required: true,
    },
    customerOrderReference: {
      type: String,
      // required: true,
    },
    // customerOrderReference: {
    //   type: String,
    //   // required: true,
    // },
    customerCircuitBillStartDate: {
      type: String,
      // required: true,
    },
    customerCircuitContractTerm: {
      type: String,
      // required: true,
    },
    vendorCircuitBillStartDate: {
      type: String,
      // required: true,
    },
    vendorCircuitContractTerm: {
      type: String,
      // required: true,
    },
    vendorId: {
      type: String,
      required: true,
    },
    vendorLECName: {
      type: String,
      required: true,
    },
    bandwidth: {
      type: String,
      // required: true,
    },
    product: {
      type: String,
      // required: true,
    },
    vendorUptime: {
      type: String,
      // required: true,
    },
    vendorMTTR: {
      type: String,
      // required: true,
    },
    // "Every Circuit Should have following status ... Delivery Team Should
    // able to change Circuit Status Under Inventory Module" - "Live" needs
    // no extra capture here (it reuses customerCircuitBillStartDate above,
    // already shown/edited elsewhere); "Ceased" captures billStopDate;
    // "Changed" captures changeType/changeOrderNumber/changeDate. Edited
    // through its own dedicated endpoint (see circuit.service.js's
    // updateCircuitStatusById), open to SCX Admin and SCX Service Delivery -
    // not the general circuit edit, which stays SCX Admin only.
    status: {
      type: String,
      enum: ["", ...circuitStatusOptions],
      default: "Live",
    },
    billStopDate: {
      type: String,
      default: "",
    },
    changeType: {
      type: String,
      enum: ["", ...circuitChangeTypeOptions],
      default: "",
    },
    changeOrderNumber: {
      type: String,
      default: "",
    },
    changeDate: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
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

circuitSchema.set("toJSON", {
  transform(doc, ret) {
    ret.updatedAt = doc.updatedAt;
    return ret;
  },
});

// add plugin that converts mongoose to json
circuitSchema.plugin(toJSON);
circuitSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} circuitId - The circuit's email
 * @param {ObjectId} [excludeCircuitId] - The id of the circuit to be excluded
 * @returns {Promise<boolean>}
 */
circuitSchema.statics.isCircuitTaken = async function (
  circuitId,
  excludeCircuitId
) {
  const circuit = await this.findOne({
    circuitId,
    _id: { $ne: excludeCircuitId },
  });
  return !!circuit;
};

/**
 * Check if email is taken
 * @param {string} circuitId - The circuit's email
 * @param {ObjectId} [excludeCircuitId] - The id of the circuit to be excluded
 * @returns {Promise<boolean>}
 */
circuitSchema.statics.isVendorCircuitIdTaken = async function (
  vendorCircuitId,
  excludeVendorCircuitId
) {
  const circuit = await this.findOne({
    vendorCircuitId,
    _id: { $ne: excludeVendorCircuitId },
  });
  return !!circuit;
};

/**
 * Check if email is taken
 * @param {string} code - The circuit's code
 * @param {ObjectId} [excludeCircuitId] - The id of the circuit to be excluded
 * @returns {Promise<boolean>}
 */
circuitSchema.statics.isCodeTaken = async function (code, excludeCircuitId) {
  const circuit = await this.findOne({
    code,
    _id: { $ne: excludeCircuitId },
  });
  return !!circuit;
};

/**
 * @typedef Circuit
 */
const Circuit = mongoose.model("Circuit", circuitSchema);

module.exports = Circuit;
