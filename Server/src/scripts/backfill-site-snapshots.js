/**
 * One-time (but safely re-runnable) backfill: Circuit and Ticket each keep
 * their own frozen site.name/site.code snapshot from whenever they were
 * created (unlike DeliveryOrder, which only ever stores a live siteId
 * reference). Before site.service.js's updateSite started cascading a Site
 * rename to those snapshots, any circuit/ticket created before a past
 * rename was left showing the site's old name/code indefinitely.
 *
 * This walks every Site once and re-syncs any Circuit/Ticket whose own
 * site.name/site.code snapshot doesn't match that site's CURRENT name/code
 * - catching every rename that ever happened before this fix existed, not
 * just the most recent one. Idempotent: only writes documents that are
 * actually out of sync, so running it again after nothing's changed is a
 * no-op.
 *
 * Usage: node src/scripts/backfill-site-snapshots.js
 */

const mongoose = require("mongoose");
const config = require("../config/config");
const { Site, Circuit, Ticket } = require("../models");

async function backfillForCollection(Model, label) {
  const sites = await Site.find({}).select("name code").lean();
  let staleCount = 0;
  for (let i = 0; i < sites.length; i += 1) {
    const site = sites[i];
    const siteIdStr = String(site._id);
    // eslint-disable-next-line no-await-in-loop
    const result = await Model.updateMany(
      {
        "site.id": siteIdStr,
        $or: [{ "site.name": { $ne: site.name } }, { "site.code": { $ne: site.code } }],
      },
      { $set: { "site.name": site.name, "site.code": site.code } }
    );
    // This codebase's driver returns the older {n, nModified, ok} shape,
    // not {matchedCount, modifiedCount} - modifiedCount would silently be
    // undefined here (NaN once summed), same gotcha confirmed elsewhere
    // this session reading a raw updateOne() result directly.
    staleCount += result.nModified;
  }
  console.log(`${label}: ${staleCount} document(s) had a stale site snapshot, now synced.`);
}

mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(async () => {
    await backfillForCollection(Circuit, "Circuits");
    await backfillForCollection(Ticket, "Tickets");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
