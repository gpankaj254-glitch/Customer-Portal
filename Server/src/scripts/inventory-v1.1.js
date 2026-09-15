/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-undef */
const _ = require("lodash");
const fs = require("fs");
const { parse } = require("csv-parse");
const mongoose = require("mongoose");
const logger = require("../config/logger");
// const config = require("./config/config");
const config = require("../config/config");

const {
  customerController,
  regionController,
  contactController,
  siteController,
  // circuitController,
} = require("../controllers");
const { siteService, circuitService } = require("../services");
const customerService = require("../services/customer.service");
const { createCodeFromName } = require("../utils/creators");

// const createSite = async (
//   customerName,
//   regionName,
//   siteName,
//   siteAddress,
//   postalCode,
//   town,
//   country,
//   endUser
// ) => {
//   try {
//     const customer = await customerController.getOrCreateCustomerByName(
//       customerName
//     );
//     let regionId = null;
//     if (regionName) {
//       const region = await regionController.getOrCreateRegionByCustomerAndName(
//         customer,
//         regionName
//       );
//       regionId = _.get(region, "_id");
//     } else {
//       regionId = _.get(customer, "defaultRegion");
//     }
//     const createdSite = await siteService.createSite({
//       name: siteName,
//       address: siteAddress,
//       postalCode,
//       town,
//       country,
//       endUser,
//       regionId,
//     });
//     return createdSite;
//   } catch (err) {
//     logger.debug(err);
//   }
// };

const createContact = async (
  contactName,
  phone,
  email,
  customerName,
  siteName
) => {
  try {
    const customer = await customerService.getCustomerByName(customerName);
    if (!customer) {
      logger.debug(`cannot find customer :${customerName}`);
      return;
    }
    if (siteName) {
      const site = await siteService.getSiteByCustomerAndName(
        customer,
        siteName
      );
      if (!site) {
        logger.debug(
          `cannot find site :${siteName}, creating customer contact`
        );
      } else {
        const contactToCreate = {
          name: contactName,
          phoneNumbers: contactController.cleanPhoneNumbers(phone.split("/")),
          emailIds: email.split("/"),
          code: createCodeFromName(contactName, site.code),
        };
        return contactController.createSiteContact(site, contactToCreate);
      }
    }
    const contactToCreate = {
      name: contactName,
      phoneNumbers: contactController.cleanPhoneNumbers(phone.split("/")),
      emailIds: email.split("/"),
      code: createCodeFromName(contactName, customer.code),
    };
    return contactController.createCustomerContact(customer, contactToCreate);
  } catch (err) {
    logger.debug(err);
  }
};

const createInventory = async (
  type,
  orderReference,
  customerName,
  siteName,
  providerInventoryId,
  providerName
) => {
  try {
    const customer = await customerService.getCustomerByName(customerName);
    if (!customer) {
      logger.debug(`cannot find customer :${customerName}`);
      return;
    }
    const site = await siteService.getSiteByCustomerAndName(customer, siteName);
    if (!site) {
      logger.debug(`cannot find site :${siteName}, creating customer contact`);
      return;
    }
    const circuitToCreate = {
      providerCircuitId: providerInventoryId,
      code: createCodeFromName(providerInventoryId, site.code),
      provider: providerName,
      orderReference,
    };
    return circuitService.createCircuitBySite(site, circuitToCreate);
  } catch (err) {
    logger.debug(err);
  }
};

const saveRecord = async (
  orderReference,
  customerName,
  siteName,
  providerCircuitId,
  providerName,
  siteAddress,
  postalCode,
  town,
  country,
  lcon1Name,
  lcon1Phone,
  lcon1Email,
  lcon2Name,
  lcon2Phone,
  lcon2Email,
  endUser,
  regionName = null
) => {
  try {
    const customer = await customerController.getOrCreateCustomerByName(
      customerName
    );
    let regionId = null;
    if (regionName) {
      const region = await regionController.getOrCreateRegionByCustomerAndName(
        customer,
        regionName
      );
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

    if (lcon1Name) {
      const lcon1ToCreate = {
        name: lcon1Name,
        phoneNumbers: contactController.cleanPhoneNumbers(
          lcon1Phone.split("/")
        ),
        emailIds: lcon1Email.split("/"),
        level: 1,
      };

      await contactController.createSiteContact(site, lcon1ToCreate);
    }

    if (lcon2Name) {
      const lcon2ToCreate = {
        name: lcon2Name,
        phoneNumbers: contactController.cleanPhoneNumbers(
          lcon2Phone.split("/")
        ),
        emailIds: lcon2Email.split("/"),
        level: 2,
      };

      await contactController.createSiteContact(site, lcon2ToCreate);
    }

    const circuitToCreate = {
      providerCircuitId,
      provider: providerName,
      orderReference,
    };

    await circuitService.createCircuitBySite(site, circuitToCreate);

    // return site;
  } catch (err) {
    logger.debug(err);
  }
};

// async function runSites(data) {
//   for (const row of data) {
//     await createSite(...row);
//     // await createContact(...row);
//     // await createInventory(...row);
//   }
// }

// async function runContacts(data) {
//   for (const row of data) {
//     // await createSite(...row);
//     await createContact(...row);
//     // await createInventory(...row);
//   }
// }

async function runInventory(data) {
  // eslint-disable-next-line no-restricted-syntax
  for (const row of data) {
    // await createSite(...row);
    // await createContact(...row);
    await saveRecord(...row);
  }
}

mongoose.set("debug", true);
const sites = [];
const contacts = [];
const inventory = [];
const data = [];

mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(async () => {
    logger.info("Connected to MongoDB");
    fs.createReadStream("src/files/inventory-1.csv")
      // fs.createReadStream("src/files/contacts.csv")
      // fs.createReadStream("src/files/inventory.csv")
      .pipe(parse({ delimiter: ",", from_line: 2 }))
      .on("data", async function (row) {
        data.push(row);
        // logger.debug(`data${data}`);
      })
      .on("end", async function saveSites() {
        await runInventory(data);
        // fs.createReadStream("src/files/contacts.csv")
        //   // fs.createReadStream("src/files/inventory.csv")
        //   .pipe(parse({ delimiter: ",", from_line: 2 }))
        //   .on("data", async function (row) {
        //     contacts.push(row);
        //     // logger.debug(`data${data}`);
        //   })
        //   .on("end", async function saveContacts() {
        //     // await runContacts(contacts);
        //     // fs.createReadStream("src/files/contacts.csv")
        //     fs.createReadStream("src/files/inventory.csv")
        //       .pipe(parse({ delimiter: ",", from_line: 2 }))
        //       .on("data", async function (row) {
        //         inventory.push(row);
        //         // logger.debug(`data${data}`);
        //       })
        //       .on("end", async function saveInventory() {
        //         await runInventory(inventory);
        //       });
        //   });
      });
  });

module.exports = {
  // createSite,
  // createContact,
};
