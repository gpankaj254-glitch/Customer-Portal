const config = require("../config/config");
const { sendMail } = require("../utils/mailer");
const { ticketCreatedEmailTemplate, ticketUpdatedEmailTemplate } = require("../utils/alertTemplates");
const { getCustomerNotificationEmails } = require("./user.service");

/**
 * Notify SCX that a new ticket was created. Always goes to the SCX
 * distribution list (config.email.toScloudX), regardless of whether SCX or
 * a Customer created it - a Customer-raised ticket is exactly what SCX
 * needs to be notified about.
 * @param {Object} ticket
 * @param {Object} actingUser
 * @returns {Promise<boolean>}
 */
const ticketCreatedEmail = async (ticket, actingUser) => {
  const { subject, text, html } = ticketCreatedEmailTemplate(ticket, actingUser);
  return sendMail({ to: config.email.toScloudX, subject, text, html });
};

/**
 * Notify "the other party" that a ticket was updated. Only SCX can reach
 * the ticket-update endpoint (Customers only append descriptions via a
 * separate endpoint), so the other party is always the ticket's Customer -
 * every active user belonging to that customer.
 * @param {Object} ticket
 * @param {Object} actingUser
 * @returns {Promise<boolean>}
 */
const ticketUpdatedEmail = async (ticket, actingUser) => {
  const recipients = await getCustomerNotificationEmails(ticket.customer.id);
  const { subject, text, html } = ticketUpdatedEmailTemplate(ticket, actingUser);
  return sendMail({ to: recipients, subject, text, html });
};

module.exports = {
  ticketCreatedEmail,
  ticketUpdatedEmail,
};
