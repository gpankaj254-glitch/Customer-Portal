const httpStatus = require("http-status");
const _ = require("lodash");
const ApiError = require("../utils/ApiError");
const pick = require("../utils/pick");
const catchAsync = require("../utils/catchAsync");
const { deliveryOrderService } = require("../services");
const { activeOnly } = require("../utils/filters");

const createDeliveryOrder = catchAsync(async (req, res) => {
  const order = await deliveryOrderService.createDeliveryOrder(req.body, req.user);
  res.status(httpStatus.CREATED).send(order);
});

// search and tab are pulled out separately rather than left in the filter,
// since queryDeliveryOrders treats the filter object as a literal Mongo
// query - a raw "search" key would just fail to match anything (mirrors
// getCircuits/getSites). tab specifically can't be a raw "status" filter
// object like { $ne: "Completed" } sent from the client: express-mongo-
// sanitize (see app.js) strips any $-prefixed key from the request body to
// block NoSQL injection, which would silently empty it to {} and then fail
// to cast against the schema - so the View Open Order / Delivered Orders
// split is built here instead, from a plain "open"/"completed" string.
const getDeliveryOrders = catchAsync(async (req, res) => {
  const search = _.trim(_.get(req.body, "search", ""));
  const baseFilter = _.omit(req.body, ["search", "tab"]);
  const filter = activeOnly(baseFilter);

  if (req.body.tab === "completed") {
    filter.status = "Completed";
  } else if (req.body.tab === "open") {
    filter.status = { $ne: "Completed" };
  }

  if (search) {
    const regex = { $regex: search, $options: "i" };
    _.assign(filter, {
      $or: [
        { orderId: regex },
        { serialNumber: regex },
        { "customer.name": regex },
        { newCustomerName: regex },
        { scloudxOrderReference: regex },
        { siteAddress: regex },
        { city: regex },
        { customerOrderReference: regex },
        { vendorCircuitId: regex },
        { notes: regex },
      ],
    });
  }

  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await deliveryOrderService.queryDeliveryOrders(filter, options);
  res.send(result);
});

const getDeletedDeliveryOrders = catchAsync(async (req, res) => {
  const filter = { active: false };
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await deliveryOrderService.queryDeliveryOrders(filter, options);
  res.send(result);
});

const updateDeliveryOrder = catchAsync(async (req, res) => {
  const order = await deliveryOrderService.updateDeliveryOrderById(req.params.deliveryOrderId, req.body, req.user);
  res.send(order);
});

const deactivateDeliveryOrder = catchAsync(async (req, res) => {
  await deliveryOrderService.deactivateDeliveryOrderById(req.params.deliveryOrderId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const restoreDeliveryOrder = catchAsync(async (req, res) => {
  const order = await deliveryOrderService.restoreDeliveryOrderById(req.params.deliveryOrderId);
  res.send(order);
});

const permanentlyDeleteDeliveryOrder = catchAsync(async (req, res) => {
  await deliveryOrderService.permanentlyDeleteDeliveryOrderById(req.params.deliveryOrderId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkUploadDeliveryOrders = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No file uploaded");
  }
  const { totalRows, failedRows, validRows } = await deliveryOrderService.validateBulkUploadDeliveryOrders(req.file.buffer);

  if (failedRows.length > 0) {
    res.send({ success: false, totalRows, insertedCount: 0, failedRows });
    return;
  }

  const created = await deliveryOrderService.bulkCreateDeliveryOrders(validRows, req.user);
  res.send({ success: true, totalRows, insertedCount: created.length, failedRows: [] });
});

module.exports = {
  createDeliveryOrder,
  getDeliveryOrders,
  getDeletedDeliveryOrders,
  updateDeliveryOrder,
  deactivateDeliveryOrder,
  restoreDeliveryOrder,
  permanentlyDeleteDeliveryOrder,
  bulkUploadDeliveryOrders,
};
