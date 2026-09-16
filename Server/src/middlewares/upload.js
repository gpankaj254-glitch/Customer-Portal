const multer = require("multer");
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");

const storage = multer.memoryStorage();

const csvFileFilter = (req, file, cb) => {
  const isCsv = /\.csv$/i.test(file.originalname);
  if (!isCsv) {
    cb(new ApiError(httpStatus.BAD_REQUEST, "Only .csv files are accepted"));
    return;
  }
  cb(null, true);
};

const uploadCsv = multer({
  storage,
  fileFilter: csvFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const ticketAttachmentFileFilter = (req, file, cb) => {
  const isAllowed = /\.(jpe?g|png|gif|bmp|webp|pdf|docx?|xlsx?|txt|csv)$/i.test(file.originalname);
  if (!isAllowed) {
    cb(new ApiError(httpStatus.BAD_REQUEST, "Unsupported file type"));
    return;
  }
  cb(null, true);
};

// Ticket attachments (customer-facing and Vendor Communication) are held in
// memory just long enough to stream to S3 - see ticket.service.js's
// addTicketAttachments/addVendorAttachments. Railway's local disk isn't
// persistent across deploys, so files were never safely written there.
const uploadTicketAttachment = multer({
  storage,
  fileFilter: ticketAttachmentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

const uploadVendorAttachment = multer({
  storage,
  fileFilter: ticketAttachmentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

// Supplier Communication attachments (Sales Opportunities) - same
// constraints as ticket attachments.
const uploadSupplierAttachment = multer({
  storage,
  fileFilter: ticketAttachmentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

module.exports = { uploadCsv, uploadTicketAttachment, uploadVendorAttachment, uploadSupplierAttachment };
