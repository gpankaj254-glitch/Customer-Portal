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
const quoteStatusOptions = ["Pending", "Submitted", "Reopened", "Won", "Lost"];

// Supplier Communication's own Quote Status field - a separate set of
// values from customerRequest's above (no Won/Lost - a supplier quote is
// tracked as Received or No Bid instead).
const supplierQuoteStatusOptions = ["Pending", "Submitted", "Reopened", "No Bid", "Received"];

const linkTypeOptions = ["Primary", "Secondary"];

const ipRequirementOptions = ["/30", "/29", "/28", "/27"];

const interfaceOptions = ["RJ45", "Fiber SMF", "Fiber MMF"];

module.exports = {
  stageOptions,
  quoteStatusOptions,
  supplierQuoteStatusOptions,
  linkTypeOptions,
  ipRequirementOptions,
  interfaceOptions,
};
