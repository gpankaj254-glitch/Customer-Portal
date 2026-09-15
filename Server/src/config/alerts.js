const emailAlertTypes = {
  ticketCreated: "ticketCreated",
  ticketUpdated: "ticketUpdated",
  ticketClosed: "ticketClosed",
  // ticketCreated : "",
};

// const emailAlertTemplates = {
//   ticketCreatedScloudX: "ticketCreated",
//   ticketUpdated: "ticketUpdated",
//   ticketClosed: "ticketClosed",
//   // ticketCreated : "",
// };

const emailAlertSubjects = {
  ticketCreated: "New Ticket Created",
  ticketUpdated: "Ticket Updated",
  ticketClosed: "Ticket Closed",
  // ticketCreated : "",
};

module.exports = {
  emailAlertTypes,
  emailAlertSubjects,
  // emailAlertRecipientTemplates,
};
