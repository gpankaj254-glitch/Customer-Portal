// One-time (but safely re-runnable) migration for the Product Management
// feature - "Display existing Product/Bandwidth options in Dropdown ... Can
// we also change existing product/BW Value?". Before this, the built-in
// Product/Bandwidth names lived only in config/circuitOptions.js and
// couldn't be renamed or removed. This seeds them into the CircuitOption
// collection (builtIn: true) alongside anything an admin has already added,
// so every option - built-in or not - is the same kind of record and is
// equally editable through the Product Management page from here on.
// config/circuitOptions.js itself is unchanged and still used elsewhere
// (circuitStatusOptions, circuitChangeTypeOptions) - only its
// bandwidthOptions/productOptions arrays are consumed here, once, as seed
// data.
//
// Idempotent: skips any name that already exists for that type
// (case-insensitively), so running it again after someone has already added
// or renamed options is harmless.
//
// Run with: node src/scripts/seed-circuit-options.js
const mongoose = require("mongoose");
const config = require("../config/config");
const { CircuitOption } = require("../models");
const { bandwidthOptions, productOptions } = require("../config/circuitOptions");

const STATIC_OPTIONS = { product: productOptions, bandwidth: bandwidthOptions };

async function seedType(type, names) {
  const existing = await CircuitOption.find({ type }).select("name").lean();
  const existingLower = new Set(existing.map((o) => o.name.toLowerCase()));
  let created = 0;
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    if (existingLower.has(name.toLowerCase())) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await CircuitOption.create({
      type,
      name,
      active: true,
      builtIn: true,
      sortOrder: (i + 1) * 10,
    });
    created += 1;
  }
  console.log(`${type}: seeded ${created} of ${names.length} built-in name(s) (${names.length - created} already present)`);
}

mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(async () => {
    await seedType("product", STATIC_OPTIONS.product);
    await seedType("bandwidth", STATIC_OPTIONS.bandwidth);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
