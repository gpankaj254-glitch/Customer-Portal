const httpStatus = require("http-status");
const _ = require("lodash");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const {
  contactService,
  regionService,
  circuitService,
  siteService,
  customerService,
  vendorService,
} = require("../services");
const logger = require("../config/logger");
const { filterByCustomerId } = require("../utils/filters");
const { extractNameAndCode } = require("../utils/extractors");
const { createCodeFromName } = require("../utils/creators");

// const { isContact } = require("../config/roles");

function cleanPhoneNumbers(phoneNumbers) {
  const clean = phoneNumbers.map((phoneNumber) => {
    return phoneNumber.replace(/[^0-9]/g, "");
  });
  return clean;
}

const createSiteContact = async (site, contactDetails) => {
  const contactToCreate = _.pick(contactDetails, [
    "name",
    "phoneNumbers",
    "emailIds",
    "code",
    "level",
  ]);
  contactToCreate.code = createCodeFromName(contactDetails.name, site.code);
  contactToCreate.customer = site.customer;
  contactToCreate.region = site.region;
  contactToCreate.site = extractNameAndCode(site);
  contactToCreate.mappedTo = "site";

  const contact = await contactService.createContact(contactToCreate);
  await siteService.addContact(site.id, contact.id);
  return contact;
};

const createRegionContact = async (region, contactDetails) => {
  const contactToCreate = _.pick(contactDetails, [
    "name",
    "phoneNumbers",
    "emailIds",
  ]);
  contactToCreate.customer = region.customer;
  contactToCreate.region = extractNameAndCode(region);
  contactToCreate.mappedTo = "region";

  const contact = await contactService.createContact(contactToCreate);
  await regionService.addContact(region.id, contact.id);
  return contact;
};

const createCustomerContact = async (customer, contactDetails) => {
  const contactToCreate = _.pick(contactDetails, [
    "name",
    "code",
    "phoneNumbers",
    "emailIds",
  ]);
  contactToCreate.customer = extractNameAndCode(customer);
  contactToCreate.mappedTo = "customer";

  const contact = await contactService.createContact(contactToCreate);
  await customerService.addContact(customer.id, contact.id);
  return contact;
};

const createVendorContact = async (vendor, contactDetails) => {
  const contactToCreate = _.pick(contactDetails, ["level", "con"]);
  contactToCreate.vendor = extractNameAndCode(vendor);
  contactToCreate.mappedTo = "vendor";

  const contact = await contactService.createContact(contactToCreate);
  await vendorService.addContact(vendor.id, contact.id);
  return contact;
};

const createCircuitContact = async (circuit, contactDetails) => {
  const contactToCreate = contactDetails;
  contactToCreate.customer = circuit.customer;
  contactToCreate.region = circuit.region;
  contactToCreate.site = circuit.site;
  contactToCreate.circuit = extractNameAndCode(circuit);
  contactToCreate.mappedTo = "circuit";
  const contact = await contactService.createContact(contactToCreate);
  await circuitService.addContact(circuit.id, contact.id);
  return contact;
};

const createContact = catchAsync(async (req, res) => {
  const reqBody = req.body[0];
  const contactToCreate = _.pick(reqBody, ["name", "emailIds"]);
  contactToCreate.phoneNumbers = cleanPhoneNumbers(
    _.get(reqBody, "phoneNumbers", [])
  );
  const circuitId = _.get(reqBody, "circuitId", null);
  const siteId = _.get(reqBody, "siteId", null);
  const regionId = _.get(reqBody, "regionId", null);
  const customerId = _.get(reqBody, "customerId", null);

  let contact = null;

  if (circuitId) {
    const circuit = await circuitService.getActiveCircuitById(circuitId);
    contact = await createCircuitContact(circuit, contactToCreate);
  } else if (siteId) {
    const site = await siteService.getActiveSiteById(siteId);
    contact = await createSiteContact(site, contactToCreate);
  } else if (regionId) {
    const region = await regionService.getActiveRegionById(regionId);
    contact = await createRegionContact(region, contactToCreate);
  } else if (customerId) {
    const customer = await customerService.getActiveCustomerById(customerId);
    contact = await createCustomerContact(customer, contactToCreate);
  } else {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to create Contact"
    );
  }

  res.status(httpStatus.CREATED).send([contact]);
});

// const createContact = catchAsync(async (req, res) => {
//   const contact = await contactService.createContact(req.body[0]);
//   // logger.debug(`createContact --> ${req.user}`);
//   // logger.debug(`contact ----> ${JSON.stringify(contact)}`);

//   // // const { id, name } = contact;
//   // logger.debug(`contact ----> ${JSON.stringify(contact[0].id)}`);

//   // const globalRegion = await regionService.createRegion({
//   //   contactId: contact[0].id,
//   //   regionCode: `${contact[0].name}-R001`,
//   //   regionName: "global",
//   // });
//   // const newContact = await contactService.updateContactById(contact[0].id, {
//   //   defaultRegion: globalRegion.id,
//   // });
//   if (!contact) {
//     throw new ApiError(
//       httpStatus.INTERNAL_SERVER_ERROR,
//       "Unable to create Contact"
//     );
//   }

//   res.status(httpStatus.CREATED).send(contact);
// });

const getContacts = catchAsync(async (req, res) => {
  // const filter = pick(req.query, ["name"]);
  logger.debug(`contact ----> ${JSON.stringify(req.body)}`);
  logger.debug(`createContact --> ${req.user}`);
  const filter = filterByCustomerId(req.user, req.body);
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await contactService.queryContacts(filter, options);
  res.send(result);
});

const getContact = catchAsync(async (req, res) => {
  const contact = await contactService.getContactById(req.params.contactId);
  if (!contact) {
    throw new ApiError(httpStatus.NOT_FOUND, "Contact not found");
  }

  res.send(contact);
});

const updateContact = catchAsync(async (req, res) => {
  const contact = await contactService.updateContactById(
    req.params.contactId,
    req.body
  );
  res.send(contact);
});

const deactivateContact = catchAsync(async (req, res) => {
  await contactService.deactivateContactById(req.params.contactId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deactivateContact,
  cleanPhoneNumbers,
  createCircuitContact,
  createCustomerContact,
  createVendorContact,
  createRegionContact,
  createSiteContact,
};
