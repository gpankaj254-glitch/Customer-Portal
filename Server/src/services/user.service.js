const httpStatus = require("http-status");
const _ = require("lodash");
const { isCustomerRole, isVendorRole, isSalesRole, roleTypes } = require("../config/roles");
const { User } = require("../models");
const logger = require("../config/logger");

const ApiError = require("../utils/ApiError");
const {
  extractNameAndCode,
  extractUserDetails,
} = require("../utils/extractors");
const { getCustomerById } = require("./customer.service");
const { getVendorById } = require("./vendor.service");
const emailService = require("./email.service");

/**
 * Create a user
 * @param {Object} reqBody
 * @param {Object} user
 * @param {String} reqBody
 * @param {Object} relatedEntity - the customer or vendor this user belongs to, when applicable
 * @returns {Promise<User>}
 */
const createUser = async (reqBody, user, relatedEntity = null) => {
  const userToCreate = _.pick(reqBody, ["name", "email", "role", "password", "description"]);
  const scxAdminOnlyRoles = [roleTypes.scloudxAdmin, roleTypes.scloudxSalesAdmin];
  if (scxAdminOnlyRoles.includes(userToCreate.role) && user.role !== roleTypes.scloudxAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only an SCX Admin can create this role");
  }
  // An SCX Sales Admin manages the Sales function but may only create SCX
  // Sales User accounts - not escalate into any other role.
  if (user.role === roleTypes.scloudxSalesAdmin && userToCreate.role !== roleTypes.scloudxSalesUser) {
    throw new ApiError(httpStatus.FORBIDDEN, "An SCX Sales Admin can only create SCX Sales User accounts");
  }
  if (await User.isEmailTaken(userToCreate.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }
  if (isCustomerRole(userToCreate.role)) {
    userToCreate.customer = extractNameAndCode(relatedEntity);
  } else if (isVendorRole(userToCreate.role)) {
    userToCreate.vendor = extractNameAndCode(relatedEntity);
  }
  logger.debug(`user ----> ${JSON.stringify(user)}`);

  userToCreate.createdBy = extractUserDetails(user);
  const createdUser = await User.create(userToCreate);
  // Best-effort - emailService.sendWelcomeEmail never throws, so a SendGrid
  // outage or misconfiguration can't block user creation from succeeding.
  await emailService.sendWelcomeEmail(createdUser);
  return createdUser;
};

/**
 * Email addresses of every active user belonging to a customer - used to
 * notify "the other party" when SCX updates a ticket, since only SCX can
 * reach the ticket-update endpoint (Customers only append descriptions).
 * @param {string} customerId
 * @returns {Promise<string[]>}
 */
const getCustomerNotificationEmails = async (customerId) => {
  if (!customerId) return [];
  const users = await User.find({ "customer.id": customerId, active: true }).select("email");
  return users.map((u) => u.email);
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Fetch a user, enforcing that the acting user is allowed to manage it - SCX
 * roles can manage anyone; a Customer/Vendor Admin can only manage users
 * belonging to their own customer/vendor; an SCX Sales Admin can only manage
 * SCX Sales Admin/User accounts, not the rest of the user base. Used by
 * every user-management action (edit, reset password, delete, restore) so
 * none of these scoped admins can reach an account outside their own scope.
 * @param {ObjectId} userId
 * @param {Object} actingUser
 * @returns {Promise<User>}
 */
const getAuthorizedUser = async (userId, actingUser) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  if (isCustomerRole(actingUser.role)) {
    if (_.get(user, "customer.id") !== _.get(actingUser, "customer.id")) {
      throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized for this user");
    }
  } else if (isVendorRole(actingUser.role)) {
    if (_.get(user, "vendor.id") !== _.get(actingUser, "vendor.id")) {
      throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized for this user");
    }
  } else if (actingUser.role === roleTypes.scloudxSalesAdmin) {
    if (!isSalesRole(user.role)) {
      throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized for this user");
    }
  }
  return user;
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @param {Object} actingUser
 * @param {Object} [relatedEntity] - the new customer or vendor, when the role is changing to one that needs it
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody, actingUser, relatedEntity = null) => {
  const user = await getAuthorizedUser(userId, actingUser);
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }
  // A Customer/Vendor Admin managing their own users must not be able to
  // escalate one into an SCX role (or the other tenant type) - they may only
  // move a user between the two roles of their own tenant.
  if (updateBody.role !== undefined) {
    if (isCustomerRole(actingUser.role) && !isCustomerRole(updateBody.role)) {
      throw new ApiError(httpStatus.FORBIDDEN, "You can only assign Customer roles");
    }
    if (isVendorRole(actingUser.role) && !isVendorRole(updateBody.role)) {
      throw new ApiError(httpStatus.FORBIDDEN, "You can only assign Vendor roles");
    }
    // An SCX Sales Admin can only move a user to SCX Sales User - same
    // creation-time restriction as createUser, applied to edits too, so they
    // can't promote one of their Sales Users into a Sales Admin themselves.
    if (actingUser.role === roleTypes.scloudxSalesAdmin && updateBody.role !== roleTypes.scloudxSalesUser) {
      throw new ApiError(httpStatus.FORBIDDEN, "You can only assign the SCX Sales User role");
    }
    // An SCX Sales User has no editUsers right, so the only way this code
    // path is reached for one is the self-access exception in auth.js (any
    // authenticated user may PATCH their own /user/:id regardless of
    // rights). Without this, that self-edit would let a Sales User hand
    // themselves the role field directly - e.g. escalate to
    // scloudxSalesAdmin - since none of the branches above cover them.
    if (actingUser.role === roleTypes.scloudxSalesUser && updateBody.role !== roleTypes.scloudxSalesUser) {
      throw new ApiError(httpStatus.FORBIDDEN, "You cannot change your own role");
    }
  }
  // customerId/vendorId are only there to resolve relatedEntity above - they
  // aren't real User fields themselves.
  Object.assign(user, _.omit(updateBody, ["customerId", "vendorId"]));
  // A role change can move a user in or out of a customer/vendor (e.g.
  // promoting a Customer Admin to SCX Admin, or the reverse) - without this,
  // a stale customer/vendor reference keeps that customer's admin able to
  // see the user in their own User Management list, or a newly-assigned
  // customer/vendor role has nothing set at all.
  if (updateBody.role !== undefined) {
    if (isCustomerRole(user.role)) {
      if (relatedEntity) {
        user.customer = extractNameAndCode(relatedEntity);
      }
    } else {
      user.customer = undefined;
    }
    if (isVendorRole(user.role)) {
      if (relatedEntity) {
        user.vendor = extractNameAndCode(relatedEntity);
      }
    } else {
      user.vendor = undefined;
    }
  }
  user.updatedBy = extractUserDetails(actingUser);
  await user.save();
  return user;
};

/**
 * Reset a user's password by id
 * @param {ObjectId} userId
 * @param {string} newPassword
 * @param {Object} actingUser
 * @returns {Promise<User>}
 */
const resetUserPasswordById = async (userId, newPassword, actingUser) => {
  const user = await getAuthorizedUser(userId, actingUser);
  if (!user.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "User is not active");
  }
  user.password = newPassword;
  user.updatedBy = extractUserDetails(actingUser);
  await user.save();
  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @param {Object} actingUser
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId, actingUser) => {
  const user = await getAuthorizedUser(userId, actingUser);
  if (!user.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "User is not active");
  }
  user.active = false;
  user.deletedAt = new Date();
  user.deletedBy = extractUserDetails(actingUser);
  await user.save();
  return user;
};

/**
 * Restore a deleted user by id
 * @param {ObjectId} userId
 * @param {Object} actingUser
 * @returns {Promise<User>}
 */
const restoreUserById = async (userId, actingUser) => {
  const user = await getAuthorizedUser(userId, actingUser);
  if (user.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "User is already active");
  }
  if (_.get(user, "customer.id")) {
    const customer = await getCustomerById(user.customer.id);
    if (!customer || !customer.active) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot restore user: its customer is deleted. Restore the customer first."
      );
    }
  }
  if (_.get(user, "vendor.id")) {
    const vendor = await getVendorById(user.vendor.id);
    if (!vendor || !vendor.active) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot restore user: its vendor is deleted. Restore the vendor first."
      );
    }
  }
  user.active = true;
  user.deletedAt = null;
  user.deletedBy = null;
  await user.save();
  return user;
};

/**
 * Permanently remove a soft-deleted user from the database. Only ever usable
 * on a user that's already soft-deleted (active: false) - this is a one-way
 * admin cleanup action, not a replacement for the normal delete/restore
 * flow. Restricted to SCX Admins at the route level (permanentlyDeleteUsers
 * is not granted to Customer/Vendor Admins), so this looks the user up
 * directly rather than through getAuthorizedUser's customer/vendor scoping.
 * @param {ObjectId} userId
 * @returns {Promise<void>}
 */
const permanentlyDeleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  if (user.active) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      "User must be deleted before it can be permanently removed"
    );
  }
  await User.deleteOne({ _id: userId });
};

module.exports = {
  createUser,
  getCustomerNotificationEmails,
  queryUsers,
  getUserById,
  getUserByEmail,
  getAuthorizedUser,
  updateUserById,
  resetUserPasswordById,
  deleteUserById,
  restoreUserById,
  permanentlyDeleteUserById,
};
