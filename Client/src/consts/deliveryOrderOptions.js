// Predefined values for the Delivery Order / "VIEW/EDIT ORDERS" fields.
// Keep milestoneNames in sync with Server/src/config/deliveryOrderOptions.js
// - a delivery order is always created with exactly these milestones, in
// this order.

// The order's own workflow Status dropdown (Edit Order tab) - "Completed" is
// deliberately left out: it's reachable only via the "Save and Complete"
// button (see OrderDetails.js), never a direct dropdown selection. The
// server still accepts "Completed" as a status value (see the server's own
// orderStatusOptions) - it's just not offered here.
export const orderStatusOptions = ["SCX", "LEC", "Customer", "OnHold", "Delivered"]

// Blank by default (not "In process") - a milestone starts untouched, not
// implicitly started.
export const milestoneStatusOptions = ["In process", "Completed"]

export const milestoneNames = [
    "Internal order process",
    "Ordering on LEC",
    "LEC design team task",
    "Site survey",
    "Scope of work",
    "Civil work",
    "Inbuilding work",
    "Device installation work",
    "Configuration provisioning and testing",
    "Handover",
]

export const siteTypeOptions = ["New", "Existing"]

// "If Not new, Ask to Choose Existing Order Number to Change" - orderType
// other than "New" links this order to an existing one (relatedOrderId).
export const orderTypeOptions = ["New", "Upgrade", "Downgrade", "Move", "Other"]
