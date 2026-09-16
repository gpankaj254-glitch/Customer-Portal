// Predefined values for Sales Opportunity fields.

const stageOptions = [
  "New",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Converted",
  "Lost",
];

// Customer Request's Quote Status field.
const quoteStatusOptions = ["Pending", "Won", "Lost"];

const linkTypeOptions = ["Primary", "Secondary"];

const ipRequirementOptions = ["/30", "/29", "/28"];

const interfaceOptions = ["RJ45", "Fiber SMF", "Fiber MMF"];

module.exports = {
  stageOptions,
  quoteStatusOptions,
  linkTypeOptions,
  ipRequirementOptions,
  interfaceOptions,
};
