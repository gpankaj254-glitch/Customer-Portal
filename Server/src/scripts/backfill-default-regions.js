/**
 * One-time backfill: creates a default "global" Region for any existing,
 * active Customer that doesn't already have customer.defaultRegion set.
 *
 * Needed because createCustomer only started auto-creating a default region
 * going forward — customers created before that fix (e.g. "Fluence") have
 * defaultRegion: null and would fail site creation until backfilled.
 *
 * Usage: node src/scripts/backfill-default-regions.js
 *
 * NOTE: adjust the mongoose connection block below to match however
 * ticket-import.js / inventory-v1.2.js connect in this repo if it differs.
 */

const mongoose = require("mongoose");
const config = require("../config/config");
const { Customer } = require("../models");
const { createDefaultRegion } = require("../services/region.service");

const run = async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.error("connected to mongo");

  const customers = await Customer.find({
    active: true,
    $or: [{ defaultRegion: null }, { defaultRegion: { $exists: false } }],
  });

  console.error(`found ${customers.length} customer(s) needing a default region`);

  let successCount = 0;
  let failCount = 0;

  for (const customer of customers) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await createDefaultRegion(customer);
      console.error(`OK   ${customer.name} (${customer.id})`);
      successCount += 1;
    } catch (err) {
      console.error(`FAIL ${customer.name} (${customer.id}): ${err.message}`);
      failCount += 1;
    }
  }

  console.error(`done. success=${successCount} fail=${failCount}`);
  process.exit(0);
};

run().catch((err) => {
  console.error("fatal error running backfill:", err);
  process.exit(1);
});
