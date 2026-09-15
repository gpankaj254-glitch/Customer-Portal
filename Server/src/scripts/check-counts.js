const mongoose = require("mongoose");
const config = require("../config/config");
const { Customer, Site, Circuit, Contact, Vendor, Region } = require("../models");
const { Ticket, User } = require("../models");

mongoose.connect(config.mongoose.url, config.mongoose.options).then(async () => {
  console.log("customers:", await Customer.countDocuments());
  console.log("sites:", await Site.countDocuments());
  console.log("circuits:", await Circuit.countDocuments());
  console.log("contacts:", await Contact.countDocuments());
  console.log("vendors:", await Vendor.countDocuments());
  console.log("regions:", await Region.countDocuments());
  console.log("tickets:", await Ticket.countDocuments());
  console.log("users:", await User.countDocuments());
  console.log("users:", await User.countDocuments());
  console.log(await User.find({}, "name email role").lean());
  process.exit(0);
});