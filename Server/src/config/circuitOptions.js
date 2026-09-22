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
  "75 Mbps",
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

const productOptions = ["DIA", "Pt to Pt", "BroadBand"];

// Circuit Status (Inventory module) - "Live" needs no extra capture (it
// reuses the circuit's own Customer Bill Start Date, already shown/edited
// elsewhere); "Ceased" captures Bill Stop Date; "Changed" captures Change
// Type/Change Order Number/Change Date - see circuit.service.js's
// updateCircuitStatusById.
const circuitStatusOptions = ["Live", "Ceased", "Changed"];

const circuitChangeTypeOptions = ["Upgrade", "Downgrade", "Move", "Other"];

module.exports = { bandwidthOptions, productOptions, circuitStatusOptions, circuitChangeTypeOptions };
