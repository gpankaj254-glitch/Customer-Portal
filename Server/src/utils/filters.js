const _ = require("lodash");
const logger = require("../config/logger");
const { isScloudxUser, isVendorRole } = require("../config/roles");

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
  // Was "!isScloudxUser(user.role)" - scoped to the requester's OWN vendor
  // record for any non-SCX role, which incorrectly swept in Customer roles
  // too (they have no user.vendor.id at all, so the filter silently became
  // {_id: null} - zero vendors - breaking any Customer-visible Vendor Name
  // lookup, e.g. Customer Admin Dashboard's Open Orders tab). Only an
  // actual Vendor-role login should ever be scoped to just its own record
  // here; a Customer fetching this list needs the full, unscoped set (same
  // as SCX) to resolve vendor names on their own orders/circuits.
  if (isVendorRole(user.role)) {
    _.set(filter, "_id", _.get(user, "vendor.id", null));
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
