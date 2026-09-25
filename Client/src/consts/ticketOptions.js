// Predefined values for Ticket fields. Keep these in sync with
// Server/src/config/ticketOptions.js.

export const problemTypeOptions = [
    "Link Down",
    "Packet Loss",
    "Latency",
    "Other",
    "Low Speed Issue",
    "RFO Request",
]

export const priorityOptions = ["High", "Medium", "Low"]

// Site Access Hours is its own mutually-exclusive radio group within the
// Site Checklist - "Other" pairs with a free-text box.
export const siteAccessHoursOptions = ["24x7", "Mon - Fri 9-5", "Other"]

// "Completed" is a real status, but it's only reachable as a follow-on
// transition from "Closed" (via the Ticket Closure details tab) - it's
// deliberately left out of openStatusOptions, used for the Status dropdown
// on the main Edit Ticket form. "RFO Closed" is the same kind of carve-out -
// only reachable via the RFO Request tab's own "Save and Closed" button,
// behaves like "Closed" otherwise (shows in the Closed Tickets list).
export const statusOptions = [
    "Submitted",
    "Assigned",
    "InProgress",
    "Onhold",
    "Waiting for Customer",
    "Verification",
    "Under Observation",
    "Closed",
    "Completed",
    "RFO Closed",
]

export const openStatusOptions = statusOptions.filter((option) => option !== "Completed" && option !== "RFO Closed")

// Only meaningful once status is set to "Closed" - captures why the ticket
// was closed. Required to close a ticket, and shown in place of Status on
// the Closed/Completed Tickets lists.
export const closureCodeOptions = [
    "Resolved",
    "Rejected",
    "AutoResolved",
    "Cancelled",
    "Raised By Mistake",
]

// RFO = Reason For Outage. Legacy status field from the old Ticket Closure
// details tab - superseded by rfoRequestStatusOptions below, kept unused so
// the export doesn't dangle for anything still importing it.
export const rfoStatusOptions = ["Pending", "Sent", "Closed"]

// "SCX NOC Users/Admin: EDIT Modify Ticket" - the new RFO Request tab (and
// its mirrored fields on the redesigned Ticket Closure Details tab). "Not
// Received" was added on top of the original Received/Awaiting from LEC/
// Shared with Customer/Closed, as the sensible default before any RFO has
// actually been requested.
export const rfoRequestStatusOptions = ["Not Received", "Received", "Awaiting from LEC", "Shared with Customer", "Closed"]

// RFO Code - "Network Issue" is a category covering the first four values,
// flattened into one list (same shape as every other option list here)
// rather than a nested group, since it's still a single-select field.
export const rfoCodeOptions = [
    "Network Issue - Fibre Cut",
    "Network Issue - Hardware Issue",
    "Network Issue - Latency Packet Loss",
    "Network Issue - Site Equipment",
    "Customer Site Issue",
    "Force Majeure",
]

// Status of the ticket on the vendor's side, on the Vendor Communication tab.
export const vendorTicketStatusOptions = [
    "LEC WIP",
    "Customer Response",
    "Site Access",
    "Customer Feedback",
    "On Hold",
    "Resolved",
]
