const mongoose = require("mongoose");
// const validator = require("validator");
// const bcrypt = require("bcryptjs");
const { toJSON, paginate } = require("./plugins");
// const { roles } = require("../config/roles");

const regionSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
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
    contactPersons: {
      type: Array,
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
    sites: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
regionSchema.plugin(toJSON);
regionSchema.plugin(paginate);

/**
 * @typedef Region
 */
const Region = mongoose.model("Region", regionSchema);

module.exports = Region;
