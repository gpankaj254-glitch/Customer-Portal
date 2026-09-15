const mongoose = require("mongoose");
// const validator = require("validator");
// const bcrypt = require("bcryptjs");
const { toJSON, paginate } = require("./plugins");
// const { roles } = require("../config/roles");

const contactSchema = mongoose.Schema(
  {
    name: {
      type: String,
      // required: true,
      trim: true,
    },
    code: {
      type: String,
      // required: true,
      // unique: true,
      // trim: true,
      // lowercase: true,
    },
    phoneNumbers: {
      type: Array,
      default: [],
    },
    con: {
      type: String,
      default: "",
    },
    emailIds: {
      type: Array,
      default: [],
    },
    site: {
      id: {
        type: String,
      },
      name: {
        type: String,
      },
      code: {
        type: String,
      },
    },
    region: {
      id: {
        type: String,
      },
      name: {
        type: String,
      },
      code: {
        type: String,
      },
    },
    customer: {
      id: {
        type: String,
      },
      name: {
        type: String,
      },
      code: {
        type: String,
      },
    },
    vendor: {
      id: {
        type: String,
      },
      name: {
        type: String,
      },
      code: {
        type: String,
      },
    },
    level: {
      type: Number,
      trim: true,
      default: 0,
    },
    comments: {
      type: String,
      trim: true,
      default: "",
    },
    mappedTo: {
      type: String,
      trim: true,
      // required: true,
      default: "site",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
contactSchema.plugin(toJSON);
contactSchema.plugin(paginate);

/**
 * Check if contactCode is taken
 * @param {string} contactCode
 * @returns {Promise<boolean>}
 */
contactSchema.statics.isContactCodeTaken = async function (contactCode) {
  const contact = await this.findOne({
    contactCode,
  });
  return !!contact;
};

// /**
//  * @param {ObjectId} id
//  * @returns {Promise<boolean>}
//  */
// contactSchema.statics.isActive = async function (id) {
//   const record = await this.findById(id);
//   return record.isActive;
// };

/**
 * @typedef Contact
 */
const Contact = mongoose.model("Contact", contactSchema);

module.exports = Contact;
