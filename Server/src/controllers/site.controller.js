const httpStatus = require("http-status");
const _ = require("lodash");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { siteService, contactService, circuitService } = require("../services");
const logger = require("../config/logger");
const { filterByCustomerId, activeOnly } = require("../utils/filters");

// const { isSite } = require("../config/roles");

const createSite = catchAsync(async (req, res) => {
  const site = await siteService.createSite(req.body[0]);
  logger.debug(`site ----> ${JSON.stringify(site)}`);

  if (!site) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to create Site"
    );
  }
  res.status(httpStatus.CREATED).send([site]);
});

const attachContacts = async (site) => {
  const contactList = await contactService.getActiveContactsById(
    site.contactPersons
  );
  // logger.debug(`result ----> ${JSON.stringify(contacts)}`);
  const updatedSite = _.assign({}, { contactList }, site);
  return updatedSite;
};

const attachCircuits = async (site) => {
  const circuitList = await circuitService.getActiveCircuitsById(site.circuits);
  // logger.debug(`result ----> ${JSON.stringify(circuitList)}`);

  const updatedSite = _.assign(
    {},
    { circuitList, circuitCount: circuitList.length },
    site
  );
  return updatedSite;
};

const getSites = catchAsync(async (req, res) => {
  // search is pulled out separately rather than left in req.body, since
  // filterByCustomerId (and querySites -> Site.paginate) treats the filter
  // object as a literal Mongo query - a raw "search" key would just fail to
  // match anything instead of actually searching.
  const search = _.trim(_.get(req.body, "search", ""));
  const baseFilter = _.omit(req.body, "search");
  const filter = activeOnly(filterByCustomerId(req.user, baseFilter));

  if (search) {
    _.assign(filter, {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "location.town": { $regex: search, $options: "i" } },
      ],
    });
  }

  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await siteService.querySites(filter, options);
  result.results = await Promise.all(
    result.results.map(async (site) => {
      const siteObj = site.toJSON();
      const siteWithCircuits = await attachCircuits(siteObj);
      return attachContacts(siteWithCircuits);
    })
  );

  logger.debug(`result ----> ${JSON.stringify(result.results)}`);

  res.send(result);
});

const getSite = catchAsync(async (req, res) => {
  const site = await siteService.getAuthorizedSite(req.params.siteId, req.user);
  if (!site) {
    throw new ApiError(httpStatus.NOT_FOUND, "Site not found");
  }
  res.send(site);
});

const updateSite = catchAsync(async (req, res) => {
  const site = await siteService.updateSiteById(req.params.siteId, req.body, req.user);
  res.send(site);
});

const deactivateSite = catchAsync(async (req, res) => {
  await siteService.deactivateSiteById(req.params.siteId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const getDeletedSites = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await siteService.querySites({ active: false }, options);
  res.send(result);
});

const restoreSite = catchAsync(async (req, res) => {
  const site = await siteService.restoreSiteById(req.params.siteId);
  res.send(site);
});

const permanentlyDeleteSite = catchAsync(async (req, res) => {
  await siteService.permanentlyDeleteSiteById(req.params.siteId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkUploadSites = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No file uploaded");
  }
  const result = await siteService.bulkUploadSites(req.file.buffer);
  res.send(result);
});

// const getOrCreateSiteByCustomerAndName = async (customer, name) => {
//   let site = await siteService.getSiteByCustomerAndName(customer, name);
//   if (!site) {
//     site = await siteService.create(customer, name);
//   }
//   return site;
// };

module.exports = {
  createSite,
  getSites,
  getSite,
  updateSite,
  deactivateSite,
  getDeletedSites,
  restoreSite,
  permanentlyDeleteSite,
  bulkUploadSites,
  // getOrCreateSiteByCustomerAndName,
};
