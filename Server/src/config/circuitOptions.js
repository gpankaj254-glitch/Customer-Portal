// Predefined values for Circuit Bandwidth and Product fields. Keep these two
// arrays in sync with Client/src/consts/circuitOptions.js - edit both when
// adding/removing a choice. Used to validate circuit create/update requests
// and (later) Inventory bulk upload rows.

const bandwidthOptions = [
  "10 Mbps",
  "20 Mbps",
  "30 Mbps",
  "40 Mbps",
  "50 Mbps",
  "60 Mbps",
  "70 Mbps",
  "80 Mbps",
  "90 Mbps",
  "100 Mbps",
  "150 Mbps",
  "200 Mbps",
  "250 Mbps",
  "300 Mbps",
  "400 Mbps",
  "500 Mbps",
  "600 Mbps",
  "700 Mbps",
  "800 Mbps",
  "900 Mbps",
  "1 Gbps (1,000 Mbps)",
  "2 Gbps (2000 Mbps)",
];

const productOptions = ["DIA", "Pt to Pt", "Broad Band"];

module.exports = { bandwidthOptions, productOptions };
