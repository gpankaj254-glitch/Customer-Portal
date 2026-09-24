// Customer Request and Supplier Communication dropdown values. Keep in sync
// with Server/src/config/opportunityOptions.js.

export const quoteStatusOptions = ["Pending", "Submitted", "Reopened", "Won", "Lost"]

// Supplier Communication's own Quote Status field - a separate set of
// values from quoteStatusOptions above (no Won/Lost - a supplier quote is
// tracked as Received or No Bid instead).
export const supplierQuoteStatusOptions = ["Pending", "Submitted", "Reopened", "No Bid", "Received"]

export const linkTypeOptions = ["Primary", "Secondary"]

export const ipRequirementOptions = ["/30", "/29", "/28", "/27"]

export const interfaceOptions = ["RJ45", "Fiber SMF", "Fiber MMF"]
