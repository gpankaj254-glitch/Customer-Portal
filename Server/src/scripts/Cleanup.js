// cleanup.js
const mongoose = require("mongoose");
const config = require("../config/config");
const { Ticket } = require("../models");
mongoose.connect(config.mongoose.url, config.mongoose.options).then(async () => {
  const result = await Ticket.deleteMany({});
  console.log("Deleted tickets:", result.deletedCount);
  process.exit(0);
});