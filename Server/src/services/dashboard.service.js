const moment = require("moment");
const _ = require("lodash");
const { Customer, Site, Circuit, Ticket } = require("../models");
const { isCustomerRole } = require("../config/roles");

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
 * Closed-ticket breakdowns for the dashboard, scoped by the optional
 * Start Date/End Date (against closedAt) and Customer filters. A Customer
 * Admin/User is always forced to their own customer.id - the request body's
 * customerId (used by SCX's "Filter By" dropdown) is ignored for them, so
 * one customer can never query another's ticket data - and the
 * customer-wise breakdown is skipped, since every row would just be their
 * own customer.
 * @param {Object} filters
 * @param {string} [filters.startDate]
 * @param {string} [filters.endDate]
 * @param {string} [filters.customerId]
 * @param {Object} actingUser
 * @returns {Promise<Object>}
 */
const getClosedTicketsAnalysis = async ({ startDate, endDate, customerId } = {}, actingUser) => {
  const customerScoped = isCustomerRole(_.get(actingUser, "role"));
  const match = { active: true, closed: true };
  if (customerScoped) {
    match["customer.id"] = _.get(actingUser, "customer.id");
  } else if (customerId) {
    match["customer.id"] = customerId;
  }
  if (startDate || endDate) {
    match.closedAt = {};
    if (startDate) match.closedAt.$gte = moment(startDate).startOf("day").toDate();
    if (endDate) match.closedAt.$lte = moment(endDate).endOf("day").toDate();
  }

  const [totalClosed, customerWiseRaw, categoryWiseRaw] = await Promise.all([
    Ticket.countDocuments(match),
    customerScoped
      ? null
      : Ticket.aggregate([
        { $match: match },
        { $group: { _id: "$customer.name", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    Ticket.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ["$closureDetails.category", ""] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const categoryWise = categoryWiseRaw.map((item) => ({ name: item._id || "Uncategorized", count: item.count }));
  const result = { totalClosed, categoryWise };
  if (!customerScoped) {
    result.customerWise = customerWiseRaw.map((item) => ({ name: item._id || "Unknown", count: item.count }));
  }
  return result;
};

module.exports = { getSummary, getClosedTicketsAnalysis };
