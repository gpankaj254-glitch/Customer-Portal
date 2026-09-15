const _ = require("lodash");

function extractNameAndCode(obj) {
  return {
    id: _.get(obj, "id"),
    name: _.get(obj, "name", ""),
    code: _.get(obj, "code", ""),
  };
}

function extractUserDetails(obj) {
  return {
    id: _.get(obj, "id"),
    name: _.get(obj, "name", ""),
    email: _.get(obj, "email", ""),
    role: _.get(obj, "role", ""),
  };
}

module.exports = {
  extractNameAndCode,
  extractUserDetails,
};
