// Predefined values for Ticket fields. Keep these in sync with
// Client/src/consts/ticketOptions.js.

const problemTypeOptions = [
  "Link Down",
  "Packet Loss",
  "Latency",
  "Other",
  "Low Speed Issue",
  "RFO Request",
];

const priorityOptions = ["High", "Medium", "Low"];

// Site Access Hours is its own mutually-exclusive radio group within the
// Site Checklist - "Other" pairs with a free-text box on the client.
const siteAccessHoursOptions = ["24x7", "Mon - Fri 9-5", "Other"];

// "Completed" is a real status, but it's only reachable as a follow-on
// transition from "Closed" (via the Ticket Closure details tab) - it's
// deliberately left out of the Status dropdown on the main Edit Ticket form,
// see ticket.service.js's updateTicket for the two-step enforcement. "RFO
// Closed" is the same kind of carve-out - only reachable via the RFO
// Request tab's own "Save and Closed" button (see ticket.service.js's
// saveTicketRfo), behaves like "Closed" otherwise (closed=true, shows in
// the Closed Tickets list - see ticket.controller.js's getTickets).
const statusOptions = [
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
];

// Only meaningful once status is set to "Closed" - captures why the ticket
// was closed. Required to close a ticket (see ticket.service.js's
// updateTicket) and shown in place of Status on the Closed/Completed
// Tickets lists.
const closureCodeOptions = [
  "Resolved",
  "Rejected",
  "AutoResolved",
  "Cancelled",
  "Raised By Mistake",
];

// RFO = Reason For Outage. Status of the RFO report itself, on the Ticket
// Closure details tab - separate from the ticket's own status. Superseded by
// rfoRequestStatusOptions below (kept only so any already-saved legacy
// closureDetails.rfoStatus value on an older ticket still passes the schema
// enum - no longer written or shown by the current UI).
const rfoStatusOptions = ["Pending", "Sent", "Closed"];

// "SCX NOC Users/Admin: EDIT Modify Ticket" - the new RFO Request tab (and
// its mirrored read-only/editable fields on the redesigned Ticket Closure
// Details tab). Status of the RFO request itself, kept on ticket.rfo.status.
// "Not Received" was added (on top of the original Received/Awaiting from
// LEC/Shared with Customer/Closed) as the sensible default before any RFO
// has actually been requested.
const rfoRequestStatusOptions = ["Not Received", "Received", "Awaiting from LEC", "Shared with Customer", "Closed"];

// RFO Code - "Network Issue" is a category covering the first four values,
// flattened into one list (same shape as every other option list here)
// rather than a nested group, since it's still a single-select field.
const rfoCodeOptions = [
  "Network Issue - Fibre Cut",
  "Network Issue - Hardware Issue",
  "Network Issue - Latency Packet Loss",
  "Network Issue - Site Equipment",
  "Customer Site Issue",
  "Force Majeure",
];

// Status of the ticket on the vendor's side, on the Vendor Communication tab.
const vendorTicketStatusOptions = [
  "LEC WIP",
  "Customer Response",
  "Site Access",
  "Customer Feedback",
  "On Hold",
  "Resolved",
];

module.exports = {
  problemTypeOptions,
  priorityOptions,
  siteAccessHoursOptions,
  statusOptions,
  closureCodeOptions,
  rfoStatusOptions,
  rfoRequestStatusOptions,
  rfoCodeOptions,
  vendorTicketStatusOptions,
};
