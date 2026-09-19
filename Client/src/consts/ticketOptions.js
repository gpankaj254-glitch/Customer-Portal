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
// on the main Edit Ticket form.
export const statusOptions = [
    "Submitted",
    "Assigned",
    "InProgress",
    "Onhold",
    "Waiting for Customer",
    "Verification",
    "Closed",
    "Completed",
]

export const openStatusOptions = statusOptions.filter((option) => option !== "Completed")

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

// RFO = Reason For Outage. Status of the RFO report itself, on the Ticket
// Closure details tab - separate from the ticket's own status.
export const rfoStatusOptions = ["Pending", "Sent", "Closed"]

// Status of the ticket on the vendor's side, on the Vendor Communication tab.
export const vendorTicketStatusOptions = [
    "LEC",
    "Customer",
    "Site Access",
    "Customer Feedback",
    "Resolved",
]
