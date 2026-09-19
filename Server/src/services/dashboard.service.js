const moment = require("moment");
const _ = require("lodash");
const { Customer, Site, Circuit, Ticket } = require("../models");
const { isCustomerRole } = require("../config/roles");
const { problemTypeOptions, priorityOptions, statusOptions, vendorTicketStatusOptions } = require("../config/ticketOptions");

/**
 * Turn a list of tickets into [{ name, count }] chart data for one field.
 * Values found in `order` come first, in that order (so priorities/statuses
 * read High -> Low / workflow order rather than by whichever is biggest);
 * any other non-blank value follows by count; blank values are last, under
 * `blankLabel`. Zero-count categories are left out.
 */
const countBy = (docs, field, order, blankLabel) => {
  const counts = _.countBy(docs, (doc) => _.get(doc, field) || "");
  const ordered = order.filter((name) => counts[name]).map((name) => ({ name, count: counts[name] }));
  const others = _.orderBy(
    Object.keys(counts)
      .filter((name) => name !== "" && !order.includes(name))
      .map((name) => ({ name, count: counts[name] })),
    ["count"],
    ["desc"]
  );
  const blank = counts[""] ? [{ name: blankLabel, count: counts[""] }] : [];
  return [...ordered, ...others, ...blank];
};

/**
 * Live snapshot counts for the dashboard's top stat tiles - always
 * unfiltered/current, independent of the Closed Tickets Analysis filter. A
 * Customer Admin/User gets the same tiles scoped to their own customer's
 * inventory only, minus "Active Customers" - that count isn't meaningful
 * once it's always going to read 1.
 * @param {Object} actingUser
 * @returns {Promise<Object>}
 */
const getSummary = async (actingUser) => {
  const twoDaysAgo = moment().subtract(2, "days").toDate();
  const customerScoped = isCustomerRole(_.get(actingUser, "role"));
  const scopeFilter = customerScoped ? { "customer.id": _.get(actingUser, "customer.id") } : {};

  const [activeCustomers, activeSites, activeCircuits, openTickets, openTicketsOverTwoDays] = await Promise.all([
    customerScoped ? null : Customer.countDocuments({ active: true }),
    Site.countDocuments({ ...scopeFilter, active: true }),
    Circuit.countDocuments({ ...scopeFilter, active: true }),
    Ticket.countDocuments({ ...scopeFilter, active: true, closed: false }),
    Ticket.countDocuments({ ...scopeFilter, active: true, closed: false, createdAt: { $lte: twoDaysAgo } }),
  ]);

  const summary = { activeSites, activeCircuits, openTickets, openTicketsOverTwoDays };
  if (!customerScoped) {
    summary.activeCustomers = activeCustomers;
  }
  return summary;
};

/**
 * Open-ticket breakdowns (Problem Type / Priority / Status / Vendor Status)
 * plus the detail list behind them, for the dashboard's Main and Open
 * Tickets tabs. The list is sorted by create date, oldest first, with Days
 * Pending being the whole days elapsed since the ticket was created. A
 * Customer Admin/User is always scoped to their own customer.
 * @param {Object} actingUser
 * @returns {Promise<Object>}
 */
const getOpenTicketsAnalysis = async (actingUser) => {
  const match = { active: true, closed: false };
  if (isCustomerRole(_.get(actingUser, "role"))) {
    match["customer.id"] = _.get(actingUser, "customer.id");
  }

  const docs = await Ticket.find(match)
    .select("ticketId customerReference vendorTicketId problemType priority status vendorTicketStatus createdAt")
    .lean();

  const now = moment();
  const tickets = _.orderBy(
    docs.map((doc) => ({
      id: String(doc._id),
      ticketId: doc.ticketId,
      customerReference: doc.customerReference || "",
      vendorTicketId: doc.vendorTicketId || "",
      problemType: doc.problemType,
      status: doc.status,
      vendorTicketStatus: doc.vendorTicketStatus || "",
      createdAt: doc.createdAt,
      daysPending: now.diff(doc.createdAt, "days"),
    })),
    ["createdAt"],
    ["asc"]
  );

  return {
    problemTypeWise: countBy(docs, "problemType", problemTypeOptions, "Not Set"),
    priorityWise: countBy(docs, "priority", priorityOptions, "Not Set"),
    statusWise: countBy(docs, "status", statusOptions, "Not Set"),
    vendorStatusWise: countBy(docs, "vendorTicketStatus", vendorTicketStatusOptions, "Not Set"),
    tickets,
  };
};

/**
 * Closed-ticket breakdowns for the dashboard, scoped by the optional
 * Start Date/End Date (against closedAt) and Customer filters. A Customer
 * Admin/User is always forced to their own customer.id - the request body's
 * customerId (used by SCX's "Filter By" dropdown) is ignored for them, so
 * one customer can never query another's ticket data.
 *
 * closureTime buckets each ticket by how long it took to close (closedAt
 * minus createdAt): within 2 days, over 2 up to 5, over 5 up to 10, and over
 * 10 - so the four always add up to totalClosed.
 * @param {Object} filters
 * @param {string} [filters.startDate]
 * @param {string} [filters.endDate]
 * @param {string} [filters.customerId]
 * @param {Object} actingUser
 * @returns {Promise<Object>}
 */
const getClosedTicketsAnalysis = async ({ startDate, endDate, customerId } = {}, actingUser) => {
  const customerScoped = isCustomerRole(_.get(actingUser, "role"));
  const match = { active: true, closed: true, closedAt: { $ne: null } };
  if (customerScoped) {
    match["customer.id"] = _.get(actingUser, "customer.id");
  } else if (customerId) {
    match["customer.id"] = customerId;
  }
  if (startDate) match.closedAt.$gte = moment(startDate).startOf("day").toDate();
  if (endDate) match.closedAt.$lte = moment(endDate).endOf("day").toDate();

  const docs = await Ticket.find(match)
    .select("createdAt closedAt problemType priority closureDetails.category")
    .lean();

  const closureTime = { within2Days: 0, from2To5Days: 0, from5To10Days: 0, over10Days: 0 };
  docs.forEach((doc) => {
    const days = moment(doc.closedAt).diff(doc.createdAt, "days", true);
    if (days <= 2) closureTime.within2Days += 1;
    else if (days <= 5) closureTime.from2To5Days += 1;
    else if (days <= 10) closureTime.from5To10Days += 1;
    else closureTime.over10Days += 1;
  });

  return {
    totalClosed: docs.length,
    closureTime,
    problemTypeWise: countBy(docs, "problemType", problemTypeOptions, "Not Set"),
    priorityWise: countBy(docs, "priority", priorityOptions, "Not Set"),
    categoryWise: countBy(docs, "closureDetails.category", [], "Uncategorized"),
  };
};

module.exports = { getSummary, getOpenTicketsAnalysis, getClosedTicketsAnalysis };
