const mongoose = require("mongoose");
// const validator = require("validator");
// const bcrypt = require("bcryptjs");
const { toJSON, paginate } = require("./plugins");
const { problemTypeOptions, priorityOptions, siteAccessHoursOptions, statusOptions, closureCodeOptions, rfoStatusOptions } = require("../config/ticketOptions");
// const { roles } = require("../config/roles");

const attachmentSchema = {
  // New uploads are stored in S3 and keyed here. Entries from before
  // attachments moved to S3 only have the legacy `filename` field below -
  // their underlying file no longer exists (Railway's local disk isn't
  // persistent across deploys), so they're kept only as a historical
  // record, not downloadable.
  key: { type: String, default: "" },
  filename: { type: String },
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

const ticketSchema = mongoose.Schema(
  {
    // Human-friendly ticket number shown to users - separate from the Mongo
    // _id. Format: <prefix><YY><MM><4-digit serial>, e.g. "A26093002" for a
    // customer named Aryaka, or "INT26090012" for an SCX-created ticket.
    // Assigned atomically via the Counter collection.
    ticketId: {
      type: String,
      unique: true,
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
    circuit: {
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
    customerReference: {
      type: String,
      default: "",
    },
    // "Vendor Ticket Number" on the Vendor Communication tab.
    vendorTicketId: {
      type: String,
      default: "",
    },
    source: {
      type: String,
    },
    // Auto-filled from the circuit's vendor at creation - not user-editable.
    vendor: {
      id: { type: String },
      name: { type: String },
      code: { type: String },
    },
    // Auto-filled from the circuit's own vendorCircuitId at creation.
    vendorCircuitId: {
      type: String,
      default: "",
    },
    vendorTicketCreateDate: {
      type: String,
      default: "",
    },
    vendorTicketStatus: {
      type: String,
      default: "",
    },
    vendorTicketClosureDate: {
      type: String,
      default: "",
    },
    // Append-only, like description - see appendVendorDescription.
    vendorDescription: {
      type: String,
      default: "",
    },
    vendorAttachments: {
      type: [attachmentSchema],
      default: [],
    },
    problemType: {
      type: String,
      enum: problemTypeOptions,
      required: true,
    },
    problemStartDate: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: priorityOptions,
      required: true,
    },
    status: {
      type: String,
      enum: statusOptions,
      default: "Submitted",
    },
    siteChecklist: {
      powerAvailable: {
        type: Boolean,
        default: false,
      },
      physicalConnectionCheck: {
        type: Boolean,
        default: false,
      },
      siteAccessHours: {
        type: String,
        enum: [...siteAccessHoursOptions, ""],
        default: "",
      },
      siteAccessHoursOtherText: {
        type: String,
        default: "",
      },
    },
    scxInternalComments: {
      type: String,
      default: "",
    },
    assignedUser: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
    },
    latestUpdate: {
      status: {
        type: String,
        // required: true,
      },
      comment: {
        type: String,
        // required: true,
      },
      user: {
        id: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          // required: true,
        },
      },
      updatedAt: {
        type: String,
        required: true,
      },
    },
    subject: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    closed: {
      type: Boolean,
      default: false,
    },
    // Set once, the first time status transitions to "Closed" - used for
    // dashboard reporting (Closed Tickets Analysis date filter) since a
    // ticket's updatedAt can move later if Closure details are edited after.
    closedAt: {
      type: Date,
      default: null,
    },
    // Why the ticket was closed - required to close a ticket (see
    // ticket.service.js's updateTicket) and shown in place of Status on the
    // Closed Tickets list.
    closureCode: {
      type: String,
      enum: ["", ...closureCodeOptions],
      default: "",
    },
    downTime: {
      type: Number,
      default: null,
    },
    // Ticket Closure details tab - SCX-only, only shown once status is
    // "Closed". Purely manual entry for now (no auto-calculation).
    closureDetails: {
      rfoStatus: {
        type: String,
        enum: ["", ...rfoStatusOptions],
        default: "",
      },
      ticketStartDateTime: { type: String, default: "" },
      actualIssueStartDateTime: { type: String, default: "" },
      reportedToSupplier: { type: String, default: "" },
      resolvedFromSupplier: { type: String, default: "" },
      issueReportedResolvedToAryaka: { type: String, default: "" },
      actualDownTimeMinutes: { type: Number, default: null },
      issueResolvedDateTime: { type: String, default: "" },
      overallDownTime: { type: Number, default: null },
      rfo: { type: String, default: "" },
      reason: { type: String, default: "" },
      reasonCode: { type: String, default: "" },
      remarks: { type: String, default: "" },
      scloudxBucket: { type: Number, default: null },
      supplierBucket: { type: Number, default: null },
      customerBucket: { type: Number, default: null },
      category: { type: String, default: "" },
      totalMinutes: { type: Number, default: null },
      downTimeMinutes: { type: Number, default: null },
      uptimePercent: { type: Number, default: null },
      downTimeHours: { type: Number, default: null },
    },
    history: {
      type: Array,
      default: [],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
ticketSchema.plugin(toJSON);
ticketSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} ticketId - The ticket's email
 * @param {ObjectId} [excludeTicketId] - The id of the ticket to be excluded
 * @returns {Promise<boolean>}
 */
ticketSchema.statics.isTicketTaken = async function (
  ticketId,
  excludeTicketId
) {
  const ticket = await this.findOne({
    ticketId,
    _id: { $ne: excludeTicketId },
  });
  return !!ticket;
};

/**
 * @typedef Ticket
 */
const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
