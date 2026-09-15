// Predefined values for Ticket fields. Keep these in sync with
// Server/src/config/ticketOptions.js.

export const problemTypeOptions = [
    "Link Down",
    "Packet Loss",
    "Latency",
    "Other",
    "Low Speed Issue",
]

export const priorityOptions = ["High", "Medium", "Low"]

// Site Access Hours is its own mutually-exclusive radio group within the
// Site Checklist - "Other" pairs with a free-text box.
export const siteAccessHoursOptions = ["24x7", "Mon - Fri 9-5", "Other"]

export const statusOptions = [
    "Submitted",
    "Assigned",
    "InProgress",
    "Onhold",
    "Waiting for Customer",
    "Verification",
    "Completed",
    "Rejected",
    "AutoResolved",
    "Cancelled",
    "Raised By Mistake",
    "Closed",
]

// RFO = Reason For Outage. Status of the RFO report itself, on the Ticket
// Closure details tab - separate from the ticket's own status.
export const rfoStatusOptions = ["Pending", "Sent", "Closed"]
