const config = require("../config/config");

const TICKET_URL = `${config.appUrl}/tickets`;

/**
 * @param {Object} ticket
 * @param {Object} actingUser
 * @returns {{subject: string, text: string, html: string}}
 */
function ticketCreatedEmailTemplate(ticket, actingUser) {
  const subject = `New Ticket Created - ${ticket.ticketId}`;
  const text = `A new ticket has been created.\n\nTicket: ${ticket.ticketId}\nCustomer: ${ticket.customer.name}\nSite: ${ticket.site.name}\nProblem Type: ${ticket.problemType}\nPriority: ${ticket.priority}\nCreated by: ${actingUser.name}\n\nView it here: ${TICKET_URL}`;
  const html = `<p>A new ticket has been created.</p><p>Ticket: <strong>${ticket.ticketId}</strong><br/>Customer: ${ticket.customer.name}<br/>Site: ${ticket.site.name}<br/>Problem Type: ${ticket.problemType}<br/>Priority: ${ticket.priority}<br/>Created by: ${actingUser.name}</p><p><a href="${TICKET_URL}">View it here</a></p>`;
  return { subject, text, html };
}

/**
 * @param {Object} ticket
 * @param {Object} actingUser
 * @returns {{subject: string, text: string, html: string}}
 */
function ticketUpdatedEmailTemplate(ticket, actingUser) {
  const subject = `Ticket ${ticket.ticketId} Updated - Status: ${ticket.status}`;
  const comment = ticket.latestUpdate && ticket.latestUpdate.comment ? ticket.latestUpdate.comment : "";
  const text = `Ticket ${ticket.ticketId} has been updated.\n\nStatus: ${ticket.status}\nUpdated by: ${actingUser.name}${comment ? `\nComment: ${comment}` : ""}\n\nView it here: ${TICKET_URL}`;
  const html = `<p>Ticket <strong>${ticket.ticketId}</strong> has been updated.</p><p>Status: ${ticket.status}<br/>Updated by: ${actingUser.name}${comment ? `<br/>Comment: ${comment}` : ""}</p><p><a href="${TICKET_URL}">View it here</a></p>`;
  return { subject, text, html };
}

module.exports = { ticketCreatedEmailTemplate, ticketUpdatedEmailTemplate };
