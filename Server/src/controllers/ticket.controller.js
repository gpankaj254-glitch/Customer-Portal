const path = require("path");
const httpStatus = require("http-status");
const _ = require("lodash");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { ticketService, circuitService, alertService } = require("../services");
// const logger = require("../config/logger");
const { filterByCustomerId } = require("../utils/filters");
const { TICKET_UPLOADS_ROOT } = require("../middlewares/upload");

// const { isTicket } = require("../config/roles");

const createTicket = catchAsync(async (req, res) => {
  const reqBody = req.body[0];
  const circuit = await circuitService.getAuthorizedCircuit(
    reqBody.circuitId,
    req.user
  );
  try {
    const ticket = await ticketService.createTicket(reqBody, circuit, req.user);
    await alertService.ticketCreatedEmail(ticket, req.user);
    res.status(httpStatus.CREATED).send([ticket]);
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, err);
  }
});

const bulkUploadTickets = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No file uploaded");
  }
  const result = await ticketService.bulkUploadTickets(req.file.buffer, req.user);
  res.send(result);
});

const getTickets = catchAsync(async (req, res) => {
  // search is pulled out separately rather than left in the filter object -
  // it isn't itself a Ticket field, so leaving it in would require every
  // document to literally have a "search" field matching the term.
  const search = _.trim(_.get(req.body, "search", ""));
  const baseFilter = _.omit(req.body, "search");
  const filter = filterByCustomerId(req.user, baseFilter);

  if (search) {
    const orConditions = [
      { ticketId: { $regex: search, $options: "i" } },
      { customerReference: { $regex: search, $options: "i" } },
      { problemType: { $regex: search, $options: "i" } },
      { status: { $regex: search, $options: "i" } },
      { "circuit.name": { $regex: search, $options: "i" } },
    ];
    _.assign(filter, { $or: orConditions });
  }

  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await ticketService.queryTickets(filter, options);

  res.send(result);
});

const getTicket = catchAsync(async (req, res) => {
  const ticket = await ticketService.getTicketById(req.params.ticketId);
  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket not found");
  }
  res.send(ticket);
});

const updateTicket = catchAsync(async (req, res) => {
  const ticket = await ticketService.updateTicket(req.body[0], req.user);
  await alertService.ticketUpdatedEmail(ticket, req.user);

  res.send([ticket]);
});

const appendDescription = catchAsync(async (req, res) => {
  const ticket = await ticketService.appendTicketDescription(req.body[0], req.user);

  res.send([ticket]);
});

const uploadAttachment = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No files uploaded");
  }
  const ticket = await ticketService.addTicketAttachments(req.params.ticketId, req.files, req.user);

  res.send([ticket]);
});

const downloadAttachment = catchAsync(async (req, res) => {
  const { ticketId, filename } = req.params;
  const attachment = await ticketService.getTicketAttachment(ticketId, filename, req.user);
  const filePath = path.join(TICKET_UPLOADS_ROOT, ticketId, filename);

  res.download(filePath, attachment.originalName);
});

const appendVendorDescription = catchAsync(async (req, res) => {
  const ticket = await ticketService.appendVendorDescription(req.body[0], req.user);

  res.send([ticket]);
});

const uploadVendorAttachment = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No files uploaded");
  }
  const ticket = await ticketService.addVendorAttachments(req.params.ticketId, req.files, req.user);

  res.send([ticket]);
});

const downloadVendorAttachment = catchAsync(async (req, res) => {
  const { ticketId, filename } = req.params;
  const attachment = await ticketService.getVendorAttachment(ticketId, filename, req.user);
  const filePath = path.join(TICKET_UPLOADS_ROOT, ticketId, "vendor", filename);

  res.download(filePath, attachment.originalName);
});

const deactivateTicket = catchAsync(async (req, res) => {
  await ticketService.deactivateTicketById(req.params.ticketId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createTicket,
  bulkUploadTickets,
  getTickets,
  getTicket,
  updateTicket,
  appendDescription,
  uploadAttachment,
  downloadAttachment,
  appendVendorDescription,
  uploadVendorAttachment,
  downloadVendorAttachment,
  deactivateTicket,
};
