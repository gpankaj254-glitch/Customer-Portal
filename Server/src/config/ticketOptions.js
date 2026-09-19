// Predefined values for Ticket fields. Keep these in sync with
// Client/src/consts/ticketOptions.js.

const problemTypeOptions = [
  "Link Down",
  "Packet Loss",
  "Latency",
  "Other",
  "Low Speed Issue",
];

const priorityOptions = ["High", "Medium", "Low"];

// Site Access Hours is its own mutually-exclusive radio group within the
// Site Checklist - "Other" pairs with a free-text box on the client.
const siteAccessHoursOptions = ["24x7", "Mon - Fri 9-5", "Other"];

// "Completed" is a real status, but it's only reachable as a follow-on
// transition from "Closed" (via the Ticket Closure details tab) - it's
// deliberately left out of the Status dropdown on the main Edit Ticket form,
// see ticket.service.js's updateTicket for the two-step enforcement.
const statusOptions = [
  "Submitted",
  "Assigned",
  "InProgress",
  "Onhold",
  "Waiting for Customer",
  "Verification",
  "Closed",
  "Completed",
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
// Closure details tab - separate from the ticket's own status.
const rfoStatusOptions = ["Pending", "Sent", "Closed"];

module.exports = {
  problemTypeOptions,
  priorityOptions,
  siteAccessHoursOptions,
  statusOptions,
  closureCodeOptions,
  rfoStatusOptions,
};
