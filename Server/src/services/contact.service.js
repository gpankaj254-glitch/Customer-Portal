const httpStatus = require("http-status");
const _ = require("lodash");
const { Contact } = require("../models");
const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");
const { extractNameAndCode } = require("../utils/extractors");

/**
 * @param {ObjectId} contactId
 * @returns {Promise<Contact>}
 */
const getContactById = async (contactId) => {
  logger.debug(`getContactById ----> ${contactId}`);
  return Contact.findOne({ _id: contactId });
};

/**
 * @param {ObjectId} contactId
 * @returns {Promise<Contact>}
 */
const getActiveContactById = async (contactId) => {
  const contact = await getContactById(contactId);
  logger.debug(`getActiveContactById ----> ${contact}`);

  if (!contact) {
    logger.debug(`getActiveContactById ----> ${contactId}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Contact not found");
  } else if (!contact.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Contact is not active");
  }
  return contact;
};

/**
 * @param {Array} contactIds
 * @returns {Promise<Contact>}
 */
const getActiveContactsById = async (contactIds) => {
  const contacts = await Promise.all(
    contactIds.map(async (contactId) => {
      const contact = await getContactById(contactId);
      if (contact && contact.active) {
        // return contact;
        return _.pick(contact, [
          "code",
          "level",
          // "id",
          "name",
          "emailIds",
          "phoneNumbers",
        ]);
      }
    })
  );
  return _.compact(contacts);
};

/**
 * @param {ObjectId} contactId
 * @returns {Promise<Contact>}
 */
const getContactNameAndCodeById = async (contactId) => {
  const contact = await getActiveContactById(contactId);
  // return extractContactNameAndCode(contact);
  return extractNameAndCode(contact);
};

/**
 * Create a contact
 * @param {Object} contactBody
 * @returns {Promise<Contact>}
 */
const createContact = async (contactBody) => {
  return Contact.create(contactBody);
};

/**
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryContacts = async (filter, options) => {
  const contacts = await Contact.paginate(filter, options);
  return contacts;
};

/**
 * Update contact by id
 * @param {ObjectId} contactId
 * @param {Object} updateBody
 * @returns {Promise<Contact>}
 */
const updateContactById = async (contactId, updateBody) => {
  const contact = await getActiveContactById(contactId);
  Object.assign(contact, updateBody);
  await contact.save();
  return contact;
};

/**
 * Delete contact by id
 * @param {ObjectId} contactId
 * @returns {Promise<Contact>}
 */
const deactivateContactById = async (contactId) => {
  const contact = await getContactById(contactId);
  if (!contact) {
    throw new ApiError(httpStatus.NOT_FOUND, "Contact not found");
  } else if (!contact.active) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Contact is not active");
  }
  contact.active = false;
  await contact.save();
  return contact;
};

module.exports = {
  getContactById,
  getActiveContactById,
  createContact,
  queryContacts,
  updateContactById,
  deactivateContactById,
  getContactNameAndCodeById,
  getActiveContactsById,
};
