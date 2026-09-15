const _ = require("lodash");
const logger = require("../config/logger");
const { isScloudxUser } = require("../config/roles");

function createGetCustomerFilter(user, filter) {
  logger.debug(`user ----> ${JSON.stringify(user)}`);
  if (!isScloudxUser(user.role)) {
    _.set(filter, "_id", _.get(user, "customer.id", null));
    // return [user.customerId];
  }
  return filter;
  //
}

function createGetVendorFilter(user, filter) {
  logger.debug(`user ----> ${JSON.stringify(user)}`);
  if (!isScloudxUser(user.role)) {
    _.set(filter, "_id", _.get(user, "vendor.id", null));
    // return [user.customerId];
  }
  return filter;
  //
}

function filterByCustomerId(user, filter) {
  if (!isScloudxUser(user.role)) {
    _.assign(filter, { "customer.id": _.get(user, "customer.id", null) });
  }
  return filter;
  //
}

function filterByVendorId(user, filter) {
  if (!isScloudxUser(user.role)) {
    _.assign(filter, { "vendor.id": _.get(user, "vendor.id", null) });
  }
  return filter;
  //
}

// function filterByCustomerId(user, filter) {
//   if (!isScloudxUser(user.role)) {
//     _.assign(filter, { "customer.id": _.get(user, "customer.id", null) });
//   }
//   return filter;
//   //
// }
function activeOnly(filter) {
  _.set(filter, "active", true);
  return filter;
}

module.exports = {
  createGetCustomerFilter,
  createGetVendorFilter,
  filterByCustomerId,
  filterByVendorId,
  activeOnly,
};
