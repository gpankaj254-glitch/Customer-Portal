const httpStatus = require("http-status");
const _ = require("lodash");
const pick = require("../utils/pick");
const catchAsync = require("../utils/catchAsync");
const { userService, customerService, vendorService } = require("../services");
const { isCustomerRole, isVendorRole } = require("../config/roles");
const { filterByCustomerId, filterByVendorId, activeOnly } = require("../utils/filters");

const createUser = catchAsync(async (req, res) => {
  const role = _.get(req, "body[0].role");
  const customerId = _.get(req, "body[0].customerId");
  const vendorId = _.get(req, "body[0].vendorId");
  let relatedEntity = null;
  if (isCustomerRole(role)) {
    relatedEntity = await customerService.getAuthorizedCustomer(
      customerId,
      req.user
    );
  } else if (isVendorRole(role)) {
    relatedEntity = await vendorService.getAuthorizedVendor(
      vendorId,
      req.user
    );
  }
  const createdUser = await userService.createUser(
    req.body[0],
    req.user,
    relatedEntity
  );
  res.status(httpStatus.CREATED).send(createdUser);
});
const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ["name", "role"]);
  let newFilter = activeOnly(filter);
  if (isCustomerRole(req.user.role)) {
    newFilter = filterByCustomerId(req.user, newFilter);
  } else if (isVendorRole(req.user.role)) {
    newFilter = filterByVendorId(req.user, newFilter);
  }

  const search = _.trim(_.get(req.query, "search", ""));
  if (search) {
    _.assign(newFilter, {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    });
  }

  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await userService.queryUsers(newFilter, options);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  // getAuthorizedUser scopes this the same way update/delete/reset-password
  // already do: SCX can view anyone, a Customer/Vendor Admin only their own
  // tenant's users - and since it's a no-op comparison when userId is the
  // acting user's own id, a non-admin can still always view themselves (the
  // auth("editUsers") route guard separately allows that self-access case
  // even without the edit right - see middlewares/auth.js).
  const user = await userService.getAuthorizedUser(req.params.userId, req.user);
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  const role = _.get(req, "body.role");
  const customerId = _.get(req, "body.customerId");
  const vendorId = _.get(req, "body.vendorId");
  let relatedEntity = null;
  if (isCustomerRole(role)) {
    relatedEntity = await customerService.getAuthorizedCustomer(
      customerId,
      req.user
    );
  } else if (isVendorRole(role)) {
    relatedEntity = await vendorService.getAuthorizedVendor(
      vendorId,
      req.user
    );
  }
  const user = await userService.updateUserById(req.params.userId, req.body, req.user, relatedEntity);
  res.send(user);
});

const resetUserPassword = catchAsync(async (req, res) => {
  const user = await userService.resetUserPasswordById(req.params.userId, req.body.password, req.user);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const getDeletedUsers = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  let filter = { active: false };
  if (isCustomerRole(req.user.role)) {
    filter = filterByCustomerId(req.user, filter);
  } else if (isVendorRole(req.user.role)) {
    filter = filterByVendorId(req.user, filter);
  }
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const restoreUser = catchAsync(async (req, res) => {
  const user = await userService.restoreUserById(req.params.userId, req.user);
  res.send(user);
});

const permanentlyDeleteUser = catchAsync(async (req, res) => {
  await userService.permanentlyDeleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  getDeletedUsers,
  restoreUser,
  permanentlyDeleteUser,
};
