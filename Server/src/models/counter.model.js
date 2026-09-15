const mongoose = require("mongoose");

// Backs simple atomic auto-increment sequences (e.g. human-friendly Ticket
// Id numbers) via findOneAndUpdate's $inc, which Mongo applies atomically -
// safe under concurrent creates, unlike counting existing documents.
const counterSchema = mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

const Counter = mongoose.model("Counter", counterSchema);

module.exports = Counter;
