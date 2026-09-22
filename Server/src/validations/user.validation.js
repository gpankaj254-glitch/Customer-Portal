const Joi = require("joi");
const { password, objectId } = require("./custom.validation");

const createUser = {
  body: Joi.array().items(
    Joi.object().keys({
      email: Joi.string().required().email(),
      password: Joi.string().required().custom(password),
      name: Joi.string(),
      description: Joi.string().allow(""),
      role: Joi.string()
        .required()
        .valid(
          "scloudxUser",
          "scloudxAdmin",
          "customerAdmin",
          "customerUser",
          "vendorAdmin",
          "vendorUser",
          "scloudxSalesAdmin",
          "scloudxSalesUser",
          "scloudxFinance",
          "scloudxServiceDelivery",
          "scloudxManagement"
        ),
      regionAccess: Joi.array(),
      domainAccess: Joi.array(),
      customerId: Joi.when("role", [
        {
          is: "customerAdmin",
          then: Joi.string().required(),
        },
        {
          is: "customerUser",
          then: Joi.string().required(),
        },
      ]),
      vendorId: Joi.when("role", [
        {
          is: "vendorAdmin",
          then: Joi.string().required(),
        },
        {
          is: "vendorUser",
          then: Joi.string().required(),
        },
      ]),
    })
  ),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    search: Joi.string().allow(""),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
      description: Joi.string().allow(""),
      role: Joi.string().valid(
        "scloudxUser",
        "scloudxAdmin",
        "customerAdmin",
        "customerUser",
        "vendorAdmin",
        "vendorUser",
        "scloudxSalesAdmin",
        "scloudxSalesUser",
        "scloudxFinance",
        "scloudxServiceDelivery",
        "scloudxManagement"
      ),
      customerId: Joi.when("role", [
        {
          is: "customerAdmin",
          then: Joi.string().required(),
        },
        {
          is: "customerUser",
          then: Joi.string().required(),
        },
      ]),
      vendorId: Joi.when("role", [
        {
          is: "vendorAdmin",
          then: Joi.string().required(),
        },
        {
          is: "vendorUser",
          then: Joi.string().required(),
        },
      ]),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const resetUserPassword = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  resetUserPassword,
  deleteUser,
};
