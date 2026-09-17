const httpStatus = require("http-status");
const _ = require("lodash");
const ApiError = require("../utils/ApiError");
const pick = require("../utils/pick");
const catchAsync = require("../utils/catchAsync");
const { opportunityService, customerService } = require("../services");
const { activeOnly } = require("../utils/filters");
const { getObjectStream } = require("../utils/s3");

/**
 * Set headers and pipe an S3 object's stream as a file download - mirrors
 * ticket.controller.js's streamAttachmentDownload.
 * @param {import("express").Response} res
 * @param {{Body: NodeJS.ReadableStream, ContentType?: string}} object
 * @param {string} originalName
 * @param {string} mimeType
 */
const streamAttachmentDownload = (res, object, originalName, mimeType) => {
  const safeName = originalName.replace(/[\r\n"\\]/g, "_");
  res.setHeader("Content-Type", mimeType || object.ContentType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(originalName)}`
  );
  object.Body.pipe(res);
};

const getRelatedCustomer = async (customerId, user) => {
  if (!customerId) {
    return null;
  }
  return customerService.getAuthorizedCustomer(customerId, user);
};

const createOpportunity = catchAsync(async (req, res) => {
  const customerId = _.get(req, "body[0].customerId");
  const relatedCustomer = await getRelatedCustomer(customerId, req.user);
  const opportunity = await opportunityService.createOpportunity(req.body[0], req.user, relatedCustomer);
  res.status(httpStatus.CREATED).send(opportunity);
});

const getOpportunities = catchAsync(async (req, res) => {
  const filter = activeOnly({});
  const search = _.trim(_.get(req.body, "search", ""));
  if (search) {
    _.assign(filter, {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { opportunityId: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { prospectName: { $regex: search, $options: "i" } },
      ],
    });
  }
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await opportunityService.queryOpportunities(filter, options);
  res.send(result);
});

const getSalesDashboardSummary = catchAsync(async (req, res) => {
  const summary = await opportunityService.getSalesDashboardSummary();
  res.send(summary);
});

const getOpportunity = catchAsync(async (req, res) => {
  const opportunity = await opportunityService.getActiveOpportunityById(req.params.opportunityId);
  res.send(opportunity);
});

const updateOpportunity = catchAsync(async (req, res) => {
  const customerId = _.get(req, "body.customerId");
  const relatedCustomer = await getRelatedCustomer(customerId, req.user);
  const opportunity = await opportunityService.updateOpportunityById(
    req.params.opportunityId,
    req.body,
    req.user,
    relatedCustomer
  );
  res.send(opportunity);
});

const deactivateOpportunity = catchAsync(async (req, res) => {
  await opportunityService.deactivateOpportunityById(req.params.opportunityId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const getDeletedOpportunities = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await opportunityService.queryOpportunities({ active: false }, options);
  res.send(result);
});

const restoreOpportunity = catchAsync(async (req, res) => {
  const opportunity = await opportunityService.restoreOpportunityById(req.params.opportunityId);
  res.send(opportunity);
});

const permanentlyDeleteOpportunity = catchAsync(async (req, res) => {
  await opportunityService.permanentlyDeleteOpportunityById(req.params.opportunityId);
  res.status(httpStatus.NO_CONTENT).send();
});

const uploadSupplierCommunicationAttachment = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No files uploaded");
  }
  const opportunity = await opportunityService.addSupplierCommunicationAttachments(
    req.params.opportunityId,
    req.params.entryId,
    req.files,
    req.user
  );
  res.send(opportunity);
});

const downloadSupplierCommunicationAttachment = catchAsync(async (req, res) => {
  const { opportunityId, entryId, attachmentId } = req.params;
  const attachment = await opportunityService.getSupplierCommunicationAttachment(
    opportunityId,
    entryId,
    attachmentId
  );
  const object = await getObjectStream(attachment.key);

  streamAttachmentDownload(res, object, attachment.originalName, attachment.mimeType);
});

const bulkUploadOpportunities = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No file uploaded");
  }
  const result = await opportunityService.bulkUploadOpportunities(req.file.buffer, req.user);
  res.send(result);
});

const bulkUploadSupplierResponses = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No file uploaded");
  }
  const result = await opportunityService.bulkUploadSupplierResponses(req.file.buffer, req.user);
  res.send(result);
});

module.exports = {
  createOpportunity,
  getOpportunities,
  getSalesDashboardSummary,
  getOpportunity,
  updateOpportunity,
  deactivateOpportunity,
  getDeletedOpportunities,
  restoreOpportunity,
  permanentlyDeleteOpportunity,
  uploadSupplierCommunicationAttachment,
  downloadSupplierCommunicationAttachment,
  bulkUploadOpportunities,
  bulkUploadSupplierResponses,
};
