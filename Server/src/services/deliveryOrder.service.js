const httpStatus = require("http-status");
const _ = require("lodash");
const moment = require("moment");
const { parse } = require("csv-parse/sync");
const { bandwidthOptions, productOptions } = require("../config/circuitOptions");
const { ipRequirementOptions, interfaceOptions } = require("../config/opportunityOptions");
const { milestoneNames, orderTypeOptions, siteTypeOptions } = require("../config/deliveryOrderOptions");
const { DeliveryOrder, Counter, Customer, Vendor, Site } = require("../models");
const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");
const { extractNameAndCode, extractUserDetails } = require("../utils/extractors");
const { createCodeFromName } = require("../utils/creators");
const { getActiveCustomerById } = require("./customer.service");
const { getActiveVendorById } = require("./vendor.service");
const { getActiveSiteById } = require("./site.service");
const circuitService = require("./circuit.service");

// Bulk upload dates, matching the rest of the app's CSV convention (Circuit
// bill start dates - see circuit.service.js).
const BULK_DATE_FORMAT = "DD-MM-YYYY";

function isValidBulkDate(value) {
  if (!value) return true;
  return moment(value, BULK_DATE_FORMAT, true).isValid();
}

// "500M" -> "500 Mbps", the shorthand some order sheets use, aligned with
// the dropdown's own option text. "1Gbps"/"1 Gbps" -> "1 Gbps (1,000 Mbps)"
// (found by prefix in bandwidthOptions itself, not hardcoded, so it still
// works if a new Gbps option is ever added). Anything else (already
// "500 Mbps", a typo, etc.) passes through unchanged and, if it still isn't
// one of bandwidthOptions, is caught by the "is a valid option" check below.
function normalizeBulkBandwidth(value) {
  const mbpsMatch = /^(\d+)\s*M$/i.exec(value);
  if (mbpsMatch) {
    return `${mbpsMatch[1]} Mbps`;
  }
  const gbpsMatch = /^(\d+)\s*Gbps$/i.exec(value);
  if (gbpsMatch) {
    const matchedOption = bandwidthOptions.find((option) => option.startsWith(`${gbpsMatch[1]} Gbps`));
    if (matchedOption) {
      return matchedOption;
    }
  }
  return value;
}

// "/29 WAN IP" (any case/spacing) -> "/29", aligned with the dropdown's own
// option text. Anything else passes through unchanged and, if it still
// isn't one of ipRequirementOptions, is caught by the check below.
function normalizeBulkIpRequirement(value) {
  const match = /^(\/\d+)\s*WAN\s*IP$/i.exec(value);
  return match ? match[1] : value;
}

/**
 * Atomically reserve the next serial and build "DO<YY><MM><4-digit serial>",
 * same pattern as Ticket's ticketId/Opportunity's opportunityId (see
 * ticket.service.js's generateTicketNumber) - scoped to year+month, so it
 * resets every month and stays unique under concurrent creates.
 * @returns {Promise<string>}
 */
const generateOrderNumber = async () => {
  const now = moment();
  const yy = now.format("YY");
  const mm = now.format("MM");
  const counter = await Counter.findOneAndUpdate(
    { _id: `deliveryOrderNumber-${yy}${mm}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const serial = String(counter.seq).padStart(4, "0");
  return `DO${yy}${mm}${serial}`;
};

/**
 * Resolve the "Dropdown (existing) or New" Customer Name field - exactly
 * one of customerId/newCustomerName was already enforced by the Joi schema
 * (see deliveryOrder.validation.js's .xor), so this only needs to look the
 * existing one up.
 * @param {Object} body - customerId or newCustomerName
 * @returns {Promise<{customer: Object|undefined, newCustomerName: string}>}
 */
const resolveOrderCustomer = async (body) => {
  if (body.customerId) {
    const customer = await getActiveCustomerById(body.customerId);
    if (!customer) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Customer not found or inactive");
    }
    return { customer: extractNameAndCode(customer), newCustomerName: "" };
  }
  return { customer: undefined, newCustomerName: body.newCustomerName };
};

/**
 * The fixed milestone checklist every order is created with, in order -
 * blank status, no date, until the View/Edit Orders screen sets one.
 * @returns {Array}
 */
const buildInitialMilestones = () => milestoneNames.map((name) => ({ name, status: "", date: null }));

/**
 * @param {Object} reqBody
 * @param {Object} user - acting user, for createdBy
 * @returns {Promise<DeliveryOrder>}
 */
const createDeliveryOrder = async (reqBody, user) => {
  const vendor = await getActiveVendorById(reqBody.vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Vendor not found or inactive");
  }
  const { customer, newCustomerName } = await resolveOrderCustomer(reqBody);

  const orderId = await generateOrderNumber();
  const orderToCreate = {
    orderId,
    serialNumber: reqBody.serialNumber || "",
    customer,
    newCustomerName,
    scloudxOrderReference: reqBody.scloudxOrderReference,
    orderType: reqBody.orderType || "New",
    relatedOrderId: reqBody.relatedOrderId || "",
    siteAddress: reqBody.siteAddress || "",
    city: reqBody.city || "",
    state: reqBody.state || "",
    country: reqBody.country || "",
    zipCode: reqBody.zipCode || "",
    product: reqBody.product || "",
    bandwidth: reqBody.bandwidth || "",
    contractTerm: reqBody.contractTerm || "",
    ipRequirement: reqBody.ipRequirement || "",
    interface: reqBody.interface || "",
    vendorId: vendor.id,
    customerOrderReference: reqBody.customerOrderReference || "",
    orderDate: new Date(reqBody.orderDate),
    deliveryTimelineDays: reqBody.deliveryTimelineDays ?? null,
    milestones: buildInitialMilestones(),
    createdBy: extractUserDetails(user),
    updatedBy: extractUserDetails(user),
  };

  return DeliveryOrder.create(orderToCreate);
};

/**
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const queryDeliveryOrders = async (filter, options) => {
  return DeliveryOrder.paginate(filter, options);
};

/**
 * @param {string} deliveryOrderId
 * @returns {Promise<DeliveryOrder>}
 */
const getDeliveryOrderById = async (deliveryOrderId) => {
  return DeliveryOrder.findById(deliveryOrderId);
};

const getActiveDeliveryOrderById = async (deliveryOrderId) => {
  const order = await getDeliveryOrderById(deliveryOrderId);
  return order && order.active ? order : null;
};

const EDITABLE_FIELDS = [
  "serialNumber",
  "scloudxOrderReference",
  "orderType",
  "relatedOrderId",
  "siteAddress",
  "city",
  "state",
  "country",
  "zipCode",
  "product",
  "bandwidth",
  "contractTerm",
  "vendorContractTerm",
  "ipRequirement",
  "interface",
  "customerOrderReference",
  "vendorCircuitId",
  "deliveryTimelineDays",
  "status",
  "notes",
  "endUser",
  "customerPM",
  "customerPMDetails",
  "lmpName",
  "lecPM",
  "lecPMDetails",
  "delayDays",
  "customerDelayDays",
  "remarks",
  "siteType",
  "siteId",
  "newSiteName",
];

/**
 * Auto-creates the real Circuit record once a Delivery Order reaches
 * Completed, from data the order already has by then - "Delivery Team
 * Should able to change Circuit Status Under Inventory Module ... We need
 * new circuit only after Delivery process is Completed". Idempotent (a
 * second Save and Complete on an already-completed order is a no-op here)
 * and never throws - a failure (no Site linked, duplicate Vendor Circuit
 * ID, etc.) is logged and reported back via circuitCreationError instead of
 * blocking the order from completing. Vendor Circuit ID/Site/a real
 * Customer are all enforced client-side before Save and Complete is even
 * reachable (see OrderDetails.js), so failures here should be rare.
 * @param {DeliveryOrder} order - already-saved, status "Completed"
 * @param {Object} actingUser
 * @returns {Promise<{circuitId: string, circuitCreationError: string}>}
 */
const createCircuitFromOrder = async (order, actingUser) => {
  if (order.circuitId) {
    return { circuitId: order.circuitId, circuitCreationError: "" };
  }
  try {
    if (!_.get(order, "customer.id")) {
      throw new Error("Order has no registered Customer linked (still a new customer name)");
    }
    if (!order.siteId) {
      throw new Error("Order has no Site linked");
    }
    if (!order.vendorCircuitId) {
      throw new Error("Order has no Vendor Circuit ID");
    }
    const site = await getActiveSiteById(order.siteId);
    const toDateString = (date) => (date ? moment(date).format(BULK_DATE_FORMAT) : "");

    const circuit = await circuitService.createCircuitBySite(site, {
      vendorCircuitId: order.vendorCircuitId,
      vendorId: order.vendorId,
      scloudxOrderReference: order.scloudxOrderReference,
      customerOrderReference: order.customerOrderReference,
      customerCircuitBillStartDate: toDateString(order.customerBillStartDate),
      customerCircuitContractTerm: order.contractTerm,
      vendorCircuitBillStartDate: toDateString(order.vendorBillStartDate),
      vendorCircuitContractTerm: order.vendorContractTerm,
      // "vendorLECName should be same as LMP Name" - reused rather than
      // capturing a separate field.
      vendorLECName: order.lmpName,
      bandwidth: order.bandwidth,
      product: order.product,
    });

    order.circuitId = String(circuit._id);
    order.updatedBy = extractUserDetails(actingUser);
    await order.save();
    return { circuitId: order.circuitId, circuitCreationError: "" };
  } catch (err) {
    logger.warn(`Circuit auto-creation failed for delivery order ${order.orderId}: ${err.message}`);
    return { circuitId: "", circuitCreationError: err.message };
  }
};

/**
 * Moving status to "Completed" (via the "Save and Complete" button, not the
 * plain Status dropdown - see OrderDetails.js) without an explicit
 * handoverDate stamps it with now, mirroring how closing a Ticket defaults
 * closedAt - moving away from "Completed" clears it, so the field never
 * shows a stale date once an order is reopened. The milestone checklist
 * (each entry's own status/date) is a separate array, sent and saved as a
 * whole - see OrderDetails.js, which always renders and resubmits every one
 * of the fixed milestones. Also resolves customerId into a real linked
 * Customer if given - "We should Create New Customer during delivery
 * process like Site Creation" (see OrderDetails.js's Create Customer
 * action), replacing newCustomerName once a prospect is formalized.
 * @param {string} deliveryOrderId
 * @param {Object} updateBody
 * @param {Object} user - acting user, for updatedBy
 * @returns {Promise<DeliveryOrder|Object>}
 */
const updateDeliveryOrderById = async (deliveryOrderId, updateBody, user) => {
  const order = await getActiveDeliveryOrderById(deliveryOrderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Delivery order not found");
  }

  if (updateBody.customerId) {
    const customer = await getActiveCustomerById(updateBody.customerId);
    if (!customer) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Customer not found or inactive");
    }
    order.customer = extractNameAndCode(customer);
    order.newCustomerName = "";
  }

  Object.assign(order, _.pick(updateBody, EDITABLE_FIELDS));

  if (Array.isArray(updateBody.milestones)) {
    const byName = new Map(updateBody.milestones.map((milestone) => [milestone.name, milestone]));
    order.milestones = milestoneNames.map((name) => {
      const submitted = byName.get(name);
      return {
        name,
        status: submitted ? submitted.status || "" : "",
        date: submitted && submitted.date ? new Date(submitted.date) : null,
      };
    });
  }

  if (updateBody.status === "Completed") {
    order.handoverDate = updateBody.handoverDate ? new Date(updateBody.handoverDate) : order.handoverDate || new Date();
  } else if (updateBody.status && updateBody.status !== "Completed") {
    order.handoverDate = null;
  } else if (updateBody.handoverDate !== undefined) {
    order.handoverDate = updateBody.handoverDate ? new Date(updateBody.handoverDate) : null;
  }

  if (updateBody.deliveryDate !== undefined) {
    order.deliveryDate = updateBody.deliveryDate ? new Date(updateBody.deliveryDate) : null;
  }
  if (updateBody.customerBillStartDate !== undefined) {
    order.customerBillStartDate = updateBody.customerBillStartDate ? new Date(updateBody.customerBillStartDate) : null;
  }
  if (updateBody.vendorBillStartDate !== undefined) {
    order.vendorBillStartDate = updateBody.vendorBillStartDate ? new Date(updateBody.vendorBillStartDate) : null;
  }

  order.updatedBy = extractUserDetails(user);
  await order.save();

  if (updateBody.status === "Completed") {
    const { circuitCreationError } = await createCircuitFromOrder(order, user);
    if (circuitCreationError) {
      const result = order.toJSON();
      result.circuitCreationError = circuitCreationError;
      return result;
    }
  }

  return order;
};

/**
 * @param {string} deliveryOrderId
 * @param {Object} user
 * @returns {Promise<DeliveryOrder>}
 */
const deactivateDeliveryOrderById = async (deliveryOrderId, user) => {
  const order = await getActiveDeliveryOrderById(deliveryOrderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Delivery order not found");
  }
  order.active = false;
  order.deletedAt = new Date();
  order.deletedBy = extractUserDetails(user);
  await order.save();
  return order;
};

/**
 * @param {string} deliveryOrderId
 * @returns {Promise<DeliveryOrder>}
 */
const restoreDeliveryOrderById = async (deliveryOrderId) => {
  const order = await getDeliveryOrderById(deliveryOrderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Delivery order not found");
  }
  order.active = true;
  order.deletedAt = null;
  order.deletedBy = undefined;
  await order.save();
  return order;
};

/**
 * @param {string} deliveryOrderId
 * @returns {Promise<DeliveryOrder>}
 */
const permanentlyDeleteDeliveryOrderById = async (deliveryOrderId) => {
  const order = await getDeliveryOrderById(deliveryOrderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Delivery order not found");
  }
  await order.deleteOne();
  return order;
};

const BULK_UPLOAD_COLUMNS = [
  "Serial Number",
  "Customer Name",
  "SCloudX Order Ref",
  "Site Address",
  "City",
  "State",
  "Country",
  "Zip Code",
  "Product",
  "BW",
  "Term",
  "IP",
  "Vendor Name",
  "Customer PO",
  "Order Date",
  "Delivery Timelines (days)",
  "Notes",
];

/**
 * Parse and validate an uploaded CSV buffer of delivery orders. Customer
 * Name is matched against an existing active Customer when possible - if
 * not, the row's Customer Name is kept as newCustomerName instead of
 * failing the row, mirroring the New Order form's "Dropdown (existing) or
 * New" field. Vendor Name must match an existing active Vendor. Does not
 * write anything - the caller only inserts if there are zero failedRows,
 * keeping the upload all-or-nothing.
 * @param {Buffer} fileBuffer
 * @returns {Promise<{totalRows: number, failedRows: Array, validRows: Array}>}
 */
const validateBulkUploadDeliveryOrders = async (fileBuffer) => {
  let records;
  try {
    records = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Could not parse CSV file: ${err.message}`);
  }

  if (records.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "CSV file has no data rows");
  }

  const missingColumns = BULK_UPLOAD_COLUMNS.filter((column) => !(column in records[0]));
  if (missingColumns.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `CSV is missing required column(s): ${missingColumns.join(", ")}`);
  }

  const customerCodes = new Set();
  const vendorCodes = new Set();
  records.forEach((record) => {
    const customerName = _.get(record, "Customer Name", "").trim();
    const vendorName = _.get(record, "Vendor Name", "").trim();
    if (customerName) customerCodes.add(createCodeFromName(customerName));
    if (vendorName) vendorCodes.add(createCodeFromName(vendorName));
  });
  const [customers, vendors] = await Promise.all([
    Customer.find({ code: { $in: [...customerCodes] } }),
    Vendor.find({ code: { $in: [...vendorCodes] } }),
  ]);
  const customersByCode = new Map(customers.map((customer) => [customer.code, customer]));
  const vendorsByCode = new Map(vendors.map((vendor) => [vendor.code, vendor]));

  const failedRows = [];
  const validRows = [];

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const rowNumber = i + 2; // account for the header row, 1-indexed
    const serialNumber = _.get(record, "Serial Number", "").trim();
    const customerName = _.get(record, "Customer Name", "").trim();
    const scloudxOrderReference = _.get(record, "SCloudX Order Ref", "").trim();
    const vendorName = _.get(record, "Vendor Name", "").trim();
    const product = _.get(record, "Product", "").trim();
    const bandwidth = normalizeBulkBandwidth(_.get(record, "BW", "").trim());
    const ipRequirement = normalizeBulkIpRequirement(_.get(record, "IP", "").trim());
    const orderDate = _.get(record, "Order Date", "").trim();
    const deliveryTimelineDays = _.get(record, "Delivery Timelines (days)", "").trim();
    const errors = [];

    if (!customerName) errors.push("Customer Name is required");
    if (!scloudxOrderReference) errors.push("SCloudX Order Ref is required");
    if (!vendorName) errors.push("Vendor Name is required");
    if (product && !productOptions.includes(product)) errors.push(`Product "${product}" is not a valid option`);
    if (bandwidth && !bandwidthOptions.includes(bandwidth)) errors.push(`BW "${bandwidth}" is not a valid option`);
    if (ipRequirement && !ipRequirementOptions.includes(ipRequirement)) errors.push(`IP "${ipRequirement}" is not a valid option`);
    if (!orderDate) errors.push("Order Date is required");
    else if (!isValidBulkDate(orderDate)) errors.push("Order Date must be dd-mm-yyyy");
    if (deliveryTimelineDays && !/^\d+$/.test(deliveryTimelineDays)) errors.push("Delivery Timelines (days) must be a whole number");

    const matchedCustomer = customerName ? customersByCode.get(createCodeFromName(customerName)) : null;

    let vendor = null;
    if (vendorName) {
      const matchedVendor = vendorsByCode.get(createCodeFromName(vendorName));
      if (!matchedVendor || !matchedVendor.active) {
        errors.push("Vendor not found or inactive");
      } else {
        vendor = matchedVendor;
      }
    }

    if (errors.length > 0) {
      failedRows.push({ row: rowNumber, customerName, siteName: "", vendorName, errors: errors.join("; ") });
    } else {
      validRows.push({
        serialNumber,
        customer: matchedCustomer && matchedCustomer.active ? matchedCustomer : null,
        newCustomerName: matchedCustomer && matchedCustomer.active ? "" : customerName,
        scloudxOrderReference,
        siteAddress: _.get(record, "Site Address", "").trim(),
        city: _.get(record, "City", "").trim(),
        state: _.get(record, "State", "").trim(),
        country: _.get(record, "Country", "").trim(),
        zipCode: _.get(record, "Zip Code", "").trim(),
        product,
        bandwidth,
        contractTerm: _.get(record, "Term", "").trim(),
        ipRequirement,
        vendorId: vendor.id,
        customerOrderReference: _.get(record, "Customer PO", "").trim(),
        orderDate: moment(orderDate, BULK_DATE_FORMAT).toDate(),
        deliveryTimelineDays: deliveryTimelineDays ? Number(deliveryTimelineDays) : null,
        notes: _.get(record, "Notes", "").trim(),
      });
    }
  }

  return { totalRows: records.length, failedRows, validRows };
};

/**
 * Insert every delivery order from a validated bulk upload. Order numbers
 * are still assigned one at a time (via the atomic Counter, same as a single
 * create) since each needs its own unique, sequential number.
 * @param {Array} validRows
 * @param {Object} user - acting user, for createdBy
 * @returns {Promise<Array<DeliveryOrder>>}
 */
const bulkCreateDeliveryOrders = async (validRows, user) => {
  const created = [];
  for (const row of validRows) {
    // eslint-disable-next-line no-await-in-loop
    const orderId = await generateOrderNumber();
    // eslint-disable-next-line no-await-in-loop
    const order = await DeliveryOrder.create({
      orderId,
      serialNumber: row.serialNumber,
      customer: row.customer ? extractNameAndCode(row.customer) : undefined,
      newCustomerName: row.newCustomerName,
      scloudxOrderReference: row.scloudxOrderReference,
      siteAddress: row.siteAddress,
      city: row.city,
      state: row.state,
      country: row.country,
      zipCode: row.zipCode,
      product: row.product,
      bandwidth: row.bandwidth,
      contractTerm: row.contractTerm,
      ipRequirement: row.ipRequirement,
      vendorId: row.vendorId,
      customerOrderReference: row.customerOrderReference,
      orderDate: row.orderDate,
      deliveryTimelineDays: row.deliveryTimelineDays,
      notes: row.notes,
      createdBy: extractUserDetails(user),
      updatedBy: extractUserDetails(user),
    });
    created.push(order);
  }
  return created;
};

const CLOSED_BULK_UPLOAD_COLUMNS = [
  "Serial Number",
  "Customer Name",
  "SCloudX Order Ref",
  "Order Type",
  "Site Address",
  "City",
  "State",
  "Country",
  "Zip Code",
  "Product",
  "BW",
  "Term",
  "IP",
  "Interface",
  "Vendor Name",
  "Vendor Circuit ID",
  "Customer PO",
  "Order Date",
  "Delivery Date",
  "Customer Bill Start Date",
  "Vendor Bill Start Date",
  "Delay (Days)",
  "Site Type",
  "Existing Site Name",
  "End User Name",
  "LMP Name",
  "Customer PM",
  "Customer PM Details",
  "LEC PM",
  "LEC PM Details",
  "Notes",
];

/**
 * Parse and validate an uploaded CSV buffer of already-Completed delivery
 * orders (a historical backfill import) - same shape/leniency as
 * validateBulkUploadDeliveryOrders (Customer Name falls back to a new
 * customer name if no match, Vendor Name must match an existing active
 * Vendor), plus every Complete Order Details field. Existing Site Name is
 * optional and scoped to the matched Customer (same lookup pattern as
 * circuit.service.js's own bulk upload) - an unmatched or blank name just
 * leaves the order unlinked to a Site record rather than failing the row.
 * Does not write anything - the caller only inserts if there are zero
 * failedRows, keeping the upload all-or-nothing.
 * @param {Buffer} fileBuffer
 * @returns {Promise<{totalRows: number, failedRows: Array, validRows: Array}>}
 */
const validateBulkUploadClosedDeliveryOrders = async (fileBuffer) => {
  let records;
  try {
    records = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Could not parse CSV file: ${err.message}`);
  }

  if (records.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "CSV file has no data rows");
  }

  const missingColumns = CLOSED_BULK_UPLOAD_COLUMNS.filter((column) => !(column in records[0]));
  if (missingColumns.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `CSV is missing required column(s): ${missingColumns.join(", ")}`);
  }

  const customerCodes = new Set();
  const vendorCodes = new Set();
  records.forEach((record) => {
    const customerName = _.get(record, "Customer Name", "").trim();
    const vendorName = _.get(record, "Vendor Name", "").trim();
    if (customerName) customerCodes.add(createCodeFromName(customerName));
    if (vendorName) vendorCodes.add(createCodeFromName(vendorName));
  });
  const [customers, vendors] = await Promise.all([
    Customer.find({ code: { $in: [...customerCodes] } }),
    Vendor.find({ code: { $in: [...vendorCodes] } }),
  ]);
  const customersByCode = new Map(customers.map((customer) => [customer.code, customer]));
  const vendorsByCode = new Map(vendors.map((vendor) => [vendor.code, vendor]));

  const siteCodes = new Set();
  records.forEach((record) => {
    const customerName = _.get(record, "Customer Name", "").trim();
    const siteName = _.get(record, "Existing Site Name", "").trim();
    const customer = customerName ? customersByCode.get(createCodeFromName(customerName)) : null;
    if (customer && siteName) siteCodes.add(createCodeFromName(siteName, customer.code));
  });
  const sites = await Site.find({ code: { $in: [...siteCodes] } });
  const sitesByCode = new Map(sites.map((site) => [site.code, site]));

  const failedRows = [];
  const validRows = [];

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const rowNumber = i + 2; // account for the header row, 1-indexed
    const serialNumber = _.get(record, "Serial Number", "").trim();
    const customerName = _.get(record, "Customer Name", "").trim();
    const scloudxOrderReference = _.get(record, "SCloudX Order Ref", "").trim();
    const orderType = _.get(record, "Order Type", "").trim() || "New";
    const vendorName = _.get(record, "Vendor Name", "").trim();
    const product = _.get(record, "Product", "").trim();
    const bandwidth = normalizeBulkBandwidth(_.get(record, "BW", "").trim());
    const ipRequirement = normalizeBulkIpRequirement(_.get(record, "IP", "").trim());
    const interfaceValue = _.get(record, "Interface", "").trim();
    const orderDate = _.get(record, "Order Date", "").trim();
    const deliveryDate = _.get(record, "Delivery Date", "").trim();
    const customerBillStartDate = _.get(record, "Customer Bill Start Date", "").trim();
    const vendorBillStartDate = _.get(record, "Vendor Bill Start Date", "").trim();
    const delayDays = _.get(record, "Delay (Days)", "").trim();
    const siteType = _.get(record, "Site Type", "").trim();
    const siteName = _.get(record, "Existing Site Name", "").trim();
    const errors = [];

    if (!customerName) errors.push("Customer Name is required");
    if (!scloudxOrderReference) errors.push("SCloudX Order Ref is required");
    if (!vendorName) errors.push("Vendor Name is required");
    if (orderType && !orderTypeOptions.includes(orderType)) errors.push(`Order Type "${orderType}" is not a valid option`);
    if (product && !productOptions.includes(product)) errors.push(`Product "${product}" is not a valid option`);
    if (bandwidth && !bandwidthOptions.includes(bandwidth)) errors.push(`BW "${bandwidth}" is not a valid option`);
    if (ipRequirement && !ipRequirementOptions.includes(ipRequirement)) errors.push(`IP "${ipRequirement}" is not a valid option`);
    if (interfaceValue && !interfaceOptions.includes(interfaceValue)) errors.push(`Interface "${interfaceValue}" is not a valid option`);
    if (!orderDate) errors.push("Order Date is required");
    else if (!isValidBulkDate(orderDate)) errors.push("Order Date must be dd-mm-yyyy");
    if (!deliveryDate) errors.push("Delivery Date is required");
    else if (!isValidBulkDate(deliveryDate)) errors.push("Delivery Date must be dd-mm-yyyy");
    if (customerBillStartDate && !isValidBulkDate(customerBillStartDate)) errors.push("Customer Bill Start Date must be dd-mm-yyyy");
    if (vendorBillStartDate && !isValidBulkDate(vendorBillStartDate)) errors.push("Vendor Bill Start Date must be dd-mm-yyyy");
    if (delayDays && !/^\d+$/.test(delayDays)) errors.push("Delay (Days) must be a whole number");
    if (siteType && !siteTypeOptions.includes(siteType)) errors.push(`Site Type "${siteType}" is not a valid option`);

    const matchedCustomer = customerName ? customersByCode.get(createCodeFromName(customerName)) : null;

    let vendor = null;
    if (vendorName) {
      const matchedVendor = vendorsByCode.get(createCodeFromName(vendorName));
      if (!matchedVendor || !matchedVendor.active) {
        errors.push("Vendor not found or inactive");
      } else {
        vendor = matchedVendor;
      }
    }

    if (errors.length > 0) {
      failedRows.push({ row: rowNumber, customerName, siteName, vendorName, errors: errors.join("; ") });
    } else {
      const matchedSite = matchedCustomer && siteName ? sitesByCode.get(createCodeFromName(siteName, matchedCustomer.code)) : null;
      validRows.push({
        serialNumber,
        customer: matchedCustomer && matchedCustomer.active ? matchedCustomer : null,
        newCustomerName: matchedCustomer && matchedCustomer.active ? "" : customerName,
        scloudxOrderReference,
        orderType,
        siteAddress: _.get(record, "Site Address", "").trim(),
        city: _.get(record, "City", "").trim(),
        state: _.get(record, "State", "").trim(),
        country: _.get(record, "Country", "").trim(),
        zipCode: _.get(record, "Zip Code", "").trim(),
        product,
        bandwidth,
        contractTerm: _.get(record, "Term", "").trim(),
        ipRequirement,
        interface: interfaceValue,
        vendorId: vendor.id,
        vendorCircuitId: _.get(record, "Vendor Circuit ID", "").trim(),
        customerOrderReference: _.get(record, "Customer PO", "").trim(),
        orderDate: moment(orderDate, BULK_DATE_FORMAT).toDate(),
        deliveryDate: moment(deliveryDate, BULK_DATE_FORMAT).toDate(),
        customerBillStartDate: customerBillStartDate ? moment(customerBillStartDate, BULK_DATE_FORMAT).toDate() : null,
        vendorBillStartDate: vendorBillStartDate ? moment(vendorBillStartDate, BULK_DATE_FORMAT).toDate() : null,
        customerDelayDays: delayDays ? Number(delayDays) : null,
        siteType,
        siteId: matchedSite ? matchedSite.id : "",
        endUser: _.get(record, "End User Name", "").trim(),
        lmpName: _.get(record, "LMP Name", "").trim(),
        customerPM: _.get(record, "Customer PM", "").trim(),
        customerPMDetails: _.get(record, "Customer PM Details", "").trim(),
        lecPM: _.get(record, "LEC PM", "").trim(),
        lecPMDetails: _.get(record, "LEC PM Details", "").trim(),
        notes: _.get(record, "Notes", "").trim(),
      });
    }
  }

  return { totalRows: records.length, failedRows, validRows };
};

/**
 * Insert every already-Completed delivery order from a validated closed-
 * orders bulk upload - same one-at-a-time order-number assignment as
 * bulkCreateDeliveryOrders. Every one of the 10 fixed milestones is stamped
 * Completed and dated to Delivery Date, since there's no per-milestone
 * history to import - the whole checklist is treated as done, matching
 * Status "Completed". handoverDate is also set to Delivery Date, same as
 * what updateDeliveryOrderById stamps when Status is saved as Completed via
 * the UI's own "Save and Complete".
 * @param {Array} validRows
 * @param {Object} user - acting user, for createdBy
 * @returns {Promise<Array<DeliveryOrder>>}
 */
const bulkCreateClosedDeliveryOrders = async (validRows, user) => {
  const created = [];
  for (const row of validRows) {
    // eslint-disable-next-line no-await-in-loop
    const orderId = await generateOrderNumber();
    const completedMilestones = milestoneNames.map((name) => ({ name, status: "Completed", date: row.deliveryDate }));
    // eslint-disable-next-line no-await-in-loop
    const order = await DeliveryOrder.create({
      orderId,
      serialNumber: row.serialNumber,
      customer: row.customer ? extractNameAndCode(row.customer) : undefined,
      newCustomerName: row.newCustomerName,
      scloudxOrderReference: row.scloudxOrderReference,
      orderType: row.orderType,
      siteAddress: row.siteAddress,
      city: row.city,
      state: row.state,
      country: row.country,
      zipCode: row.zipCode,
      product: row.product,
      bandwidth: row.bandwidth,
      contractTerm: row.contractTerm,
      ipRequirement: row.ipRequirement,
      interface: row.interface,
      vendorId: row.vendorId,
      vendorCircuitId: row.vendorCircuitId,
      customerOrderReference: row.customerOrderReference,
      orderDate: row.orderDate,
      status: "Completed",
      milestones: completedMilestones,
      handoverDate: row.deliveryDate,
      deliveryDate: row.deliveryDate,
      customerBillStartDate: row.customerBillStartDate,
      vendorBillStartDate: row.vendorBillStartDate,
      customerDelayDays: row.customerDelayDays,
      siteType: row.siteType,
      siteId: row.siteId,
      endUser: row.endUser,
      lmpName: row.lmpName,
      customerPM: row.customerPM,
      customerPMDetails: row.customerPMDetails,
      lecPM: row.lecPM,
      lecPMDetails: row.lecPMDetails,
      notes: row.notes,
      createdBy: extractUserDetails(user),
      updatedBy: extractUserDetails(user),
    });
    created.push(order);
  }
  return created;
};

module.exports = {
  createDeliveryOrder,
  queryDeliveryOrders,
  getDeliveryOrderById,
  getActiveDeliveryOrderById,
  updateDeliveryOrderById,
  deactivateDeliveryOrderById,
  restoreDeliveryOrderById,
  permanentlyDeleteDeliveryOrderById,
  validateBulkUploadDeliveryOrders,
  bulkCreateDeliveryOrders,
  validateBulkUploadClosedDeliveryOrders,
  bulkCreateClosedDeliveryOrders,
};
