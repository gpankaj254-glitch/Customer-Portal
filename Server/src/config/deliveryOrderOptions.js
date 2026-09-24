// Predefined values for the Delivery Order / "VIEW/EDIT ORDERS" fields.
// Keep milestoneNames in sync with Client/src/consts/deliveryOrderOptions.js
// - a delivery order is always created with exactly these milestones, in
// this order (see deliveryOrder.service.js's createDeliveryOrder).

// The order's own workflow Status. "Completed" is reachable only via the
// "Save and Complete" button (see OrderDetails.js) - the plain Status
// dropdown itself only goes up to "Delivered" (see the client's own
// orderStatusOptions, which leaves "Completed" out of the dropdown's
// options). Both values are kept here since the model/validation still need
// to accept "Completed" once Save and Complete sets it.
const orderStatusOptions = ["SCX", "LEC", "Customer", "OnHold", "Delivered", "Completed"];

// Blank by default (not "In process") - a milestone starts untouched, not
// implicitly started. "Not Required" is for a milestone that doesn't apply
// to this particular order (see OrderDetails.js's previousDone, which
// treats it the same as "Completed" for unlocking the next milestone -
// otherwise marking one "Not Required" would permanently block the rest of
// the checklist).
const milestoneStatusOptions = ["In process", "Completed", "Not Required"];

const milestoneNames = [
  "Internal order process",
  "Ordering on LEC",
  "LEC design team task",
  "Site survey",
  "Site/ City Permission",
  "Scope of work",
  "Civil work",
  "Inbuilding work",
  "Device installation work",
  "Configuration provisioning and testing",
  "Handover",
];

const siteTypeOptions = ["New", "Existing"];

// "If Not new, Ask to Choose Existing Order Number to Change" - orderType
// other than "New" links this order to an existing one (relatedOrderId).
const orderTypeOptions = ["New", "Upgrade", "Downgrade", "Move", "Other"];

module.exports = {
  orderStatusOptions,
  milestoneStatusOptions,
  milestoneNames,
  siteTypeOptions,
  orderTypeOptions,
};
