/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
const _ = require("lodash");
const fs = require("fs");
const { parse } = require("csv-parse");
const mongoose = require("mongoose");
const logger = require("../config/logger");
const config = require("../config/config");
const ApiError = require("../utils/ApiError");

const {
  customerController,
  regionController,
  contactController,
  vendorController,

  // siteController,
  circuitController,
} = require("../controllers");
const { siteService, circuitService, vendorService } = require("../services");
const {
  Customer,
  Contact,
  Vendor,
  Site,
  Region,
  Circuit,
} = require("../models");
// const customerService = require("../services/customer.service");

const addSiteContact = async (name, phoneNumbers, emailIds, site, level) => {
  if (name) {
    const conToCreate = {
      name,
      phoneNumbers: contactController.cleanPhoneNumbers(
        phoneNumbers.split("/")
      ),
      emailIds: emailIds.split("/"),
      level,
    };

    await contactController.createSiteContact(site, conToCreate);
  }
};

// const addSiteContact = async getOrCreateSite

const addVendorContact = async (con, vendor, level) => {
  const conToCreate = {
    con,
    level,
  };

  await contactController.createVendorContact(vendor, conToCreate);
};

const getOrCreateVendorByName = async (
  name,
  vendorCon1,
  vendorCon2,
  vendorCon3
) => {
  let vendor = await vendorService.getVendorByName(name);
  if (vendor) {
    // validateAndUpdateContacts
  } else {
    vendor = await vendorService.createVendor({ name });
    await addVendorContact(vendorCon1, vendor, 1);
    await addVendorContact(vendorCon2, vendor, 2);
    await addVendorContact(vendorCon3, vendor, 3);
  }
  return vendor;
};

const saveRecord = async (sNo, row) => {
  try {
    // Explicit index mapping — matches inv-v1.2.csv header order exactly.
    const customerName = row[0];
    const siteName = row[1];
    const scloudxOrderReference = row[2];
    const customerOrderReference = row[3];
    const vendorOrderReference = row[4];
    const vendorCircuitId = row[5];
    const vendorName = row[6];
    const vendorLECName = row[7];
    const bandwidth = row[8];
    const product = row[9];
    const vendorUptime = row[10];
    const vendorMTTR = row[11];
    const vendorCon1 = row[12];
    const vendorCon2 = row[13];
    const vendorCon3 = row[14];
    const siteAddress = row[15];
    const postalCode = row[16];
    const town = row[17];
    const country = row[18];
    const endUser = row[19];
    const lcon1Name = row[20];
    const lcon2Name = row[21];
    const lcon1Email = row[22];
    const lcon2Email = row[23];
    const lcon1Phone = row[24];
    const lcon2Phone = row[25];
    const customerCircuitBillStartDate = row[26];
    const customerCircuitContractTerm = row[27];
    const vendorCircuitBillStartDate = row[28];
    const vendorCircuitContractTerm = row[29];
    const regionName = null;

    const customer = await customerController.getOrCreateCustomerByName(customerName);
    if (!customer) {
      throw new Error("customer not created!");
    }
    const vendor = await vendorController.getOrCreateVendorByName(vendorName);
    if (!vendor) {
      throw new Error("vendor not created!");
    }
    let regionId = null;
    if (regionName) {
      const region = await regionController.getOrCreateRegionByCustomerAndName(customer, regionName);
      regionId = _.get(region, "_id");
    } else {
      regionId = _.get(customer, "defaultRegion");
    }
    const site = await siteService.getOrCreateSite({
      name: siteName,
      address: siteAddress,
      postalCode,
      town,
      country,
      endUser,
      regionId,
      customer,
    });

    if (!site) {
      throw new Error("site not created!");
    }

    await addSiteContact(lcon1Name, lcon1Phone, lcon1Email, site, 1);
    await addSiteContact(lcon2Name, lcon2Phone, lcon2Email, site, 2);

    const circuitToCreate = {
      vendorId: vendor._id,
      vendorCircuitId,
      scloudxOrderReference,
      vendorOrderReference,
      customerOrderReference,
      customerCircuitBillStartDate,
      customerCircuitContractTerm,
      vendorCircuitBillStartDate,
      vendorCircuitContractTerm,
      vendorLECName,
      bandwidth,
      product,
      vendorUptime,
      vendorMTTR,
    };

    const circuit = await circuitController.createCircuitBySite(site, circuitToCreate);
    if (!circuit) {
      throw new Error("circuit not created!");
    }
  } catch (err) {
    logger.debug(`ERROR in creating row ${sNo} :: ${err}`);
  }
};

async function runInventory(data) {
  let i = 0;
  for (const row of data) {
    i += 1;
    await saveRecord(i, row);
  }
}

mongoose.set("debug", true);
// const sites = [];
// const contacts = [];
// const inventory = [];
const data = [];

mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(async () => {
    logger.info("Connected to MongoDB");
    await Customer.collection.drop();
    await Contact.collection.drop();
    await Vendor.collection.drop();
    await Site.collection.drop();
    await Region.collection.drop();
    await Circuit.collection.drop();
    // await Customer.collection.drop();

    fs.createReadStream("src/files/inv-v1.2.csv")
      .pipe(parse({ delimiter: ",", from_line: 2 }))
      .on("data", async function (row) {
        data.push(row);
      })
      .on("end", async function saveSites() {
        await runInventory(data);
        logger.info("Import complete");
        process.exit(0);
      });
  });

module.exports = {
  // createSite,
  // createContact,
};
