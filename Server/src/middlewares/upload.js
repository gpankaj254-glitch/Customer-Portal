const fs = require("fs");
const path = require("path");
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

const TICKET_UPLOADS_ROOT = path.join(__dirname, "../../uploads/tickets");

// The ticket id comes from the URL (:ticketId), not the multipart body, so
// the destination is known before multer has parsed any body fields.
const ticketAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(TICKET_UPLOADS_ROOT, req.params.ticketId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const ticketAttachmentFileFilter = (req, file, cb) => {
  const isAllowed = /\.(jpe?g|png|gif|bmp|webp|pdf|docx?|xlsx?|txt|csv)$/i.test(file.originalname);
  if (!isAllowed) {
    cb(new ApiError(httpStatus.BAD_REQUEST, "Unsupported file type"));
    return;
  }
  cb(null, true);
};

const uploadTicketAttachment = multer({
  storage: ticketAttachmentStorage,
  fileFilter: ticketAttachmentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

// Vendor Communication attachments live in their own subfolder, separate
// from the customer-facing ones, even though both are keyed by ticket id.
const vendorAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(TICKET_UPLOADS_ROOT, req.params.ticketId, "vendor");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const uploadVendorAttachment = multer({
  storage: vendorAttachmentStorage,
  fileFilter: ticketAttachmentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

module.exports = { uploadCsv, uploadTicketAttachment, uploadVendorAttachment, TICKET_UPLOADS_ROOT };
