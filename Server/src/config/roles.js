const allRoles = {
  scloudxUser: [
    "moveCircuits",
    "createUsers",
    // createSites/createCustomers/createCircuits removed - all three now
    // belong to SCX Admin (the general Customer/Site/Inventory Management
    // modules) and SCX Service Delivery (inline, while completing a
    // Delivery Order - see scloudxServiceDelivery below).
    // Vendor Management is read-only for SCX NOC - SCX Service Delivery has
    // full read/write access instead (see scloudxServiceDelivery below).
    "createTickets",
    "viewTickets",
    "updateTickets",
    "appendTicketDescription",
    "viewDashboard",
  ],
  scloudxAdmin: [
    "moveCircuits",
    "createCustomers",
    "editCustomers",
    "deleteCustomers",
    "permanentlyDeleteCustomers",
    "createUsers",
    "editUsers",
    "deleteUsers",
    "permanentlyDeleteUsers",
    "createSites",
    "editSites",
    "deleteSites",
    "permanentlyDeleteSites",
    "createCircuits",
    "editCircuits",
    "updateCircuitStatus",
    "deleteCircuits",
    "permanentlyDeleteCircuits",
    "createVendors",
    "editVendors",
    "deleteVendors",
    "bulkUpload",
    "resetUserPassword",
    "createTickets",
    "viewTickets",
    "updateTickets",
    "appendTicketDescription",
    "deleteTickets",
    "permanentlyDeleteTickets",
    "viewDashboard",
    "createOpportunities",
    "editOpportunities",
    "deleteOpportunities",
    "permanentlyDeleteOpportunities",
    "viewOpportunities",
    "bulkUploadOpportunities",
    "createDeliveryOrders",
    "viewDeliveryOrders",
    "updateDeliveryOrders",
    "deleteDeliveryOrders",
    "permanentlyDeleteDeliveryOrders",
  ],
  customerUser: ["createTickets", "viewTickets", "appendTicketDescription", "viewDashboard"],
  customerAdmin: ["createUsers", "editUsers", "deleteUsers", "resetUserPassword", "createTickets", "viewTickets", "appendTicketDescription", "viewDashboard"],
  vendorUser: [],
  vendorAdmin: ["createUsers", "editUsers", "deleteUsers"],
  // SCX Finance has no rights yet - what it should be able to do is still to
  // be decided.
  scloudxFinance: [],
  // SCX Service Delivery's own module is Delivery Orders - it's the
  // "admin" for that one module, same shape as SCX Admin's rights for it.
  // Full read/write access to Vendor Management too (create/edit/delete) -
  // Service Delivery orders a circuit from a Vendor, so it needs to be able
  // to add one that isn't in the system yet and keep vendor details current
  // (SCX NOC's own Vendor Management access is read-only instead - see
  // scloudxUser above).
  scloudxServiceDelivery: [
    "bulkUpload",
    "createVendors",
    "editVendors",
    "deleteVendors",
    // Needed for a delivery order's "Site - New" flow (Complete Order
    // Details tab) - creating the new Site record directly from the order.
    "createSites",
    // "We should Create New Customer during delivery process like Site
    // Creation" - formalizes a prospect (newCustomerName) into a real
    // Customer directly from the order (see OrderDetails.js).
    "createCustomers",
    "createDeliveryOrders",
    "viewDeliveryOrders",
    "updateDeliveryOrders",
    // deleteDeliveryOrders/permanentlyDeleteDeliveryOrders removed -
    // "Remove Delete option for Order for Delivery User, should only with
    // SCX Admin". Service Delivery keeps full create/edit rights on
    // Delivery Orders, just not deletion.
    // "Delivery Team Should able to change Circuit Status Under Inventory
    // Module" - scoped to just Circuit Status (see
    // circuit.service.js's updateCircuitStatusById); not the general
    // "editCircuits" right, which stays SCX Admin only.
    "updateCircuitStatus",
  ],
  // SCX Management's dashboard rolls up the Sales and NOC (SCX User)
  // dashboards under their own tabs, and it also gets read-only access to
  // Customer/Site/Inventory Management, Sales Opportunities, Tickets and
  // Delivery Orders (see permissions.js) - so it needs the view rights those
  // pages' own data calls are gated behind. It has no rights beyond viewing
  // - no create/edit/delete of anything (Customer/Site/Inventory Management
  // need no right at all to view; see site.route.js/customer.route.js).
  scloudxManagement: ["viewDashboard", "viewOpportunities", "viewTickets", "viewDeliveryOrders"],
  scloudxSalesAdmin: [
    "createUsers",
    "editUsers",
    "deleteUsers",
    "resetUserPassword",
    "createOpportunities",
    "editOpportunities",
    "deleteOpportunities",
    "viewOpportunities",
    "viewDashboard",
    "createVendors",
    "bulkUploadOpportunities",
  ],
  // "Add Sales Opportunity Upload facility to Sales User Also" - Sales
  // Admin's own bulkUploadOpportunities, granted here too.
  scloudxSalesUser: ["createOpportunities", "editOpportunities", "viewOpportunities", "viewDashboard", "bulkUploadOpportunities"],
};


const roleTypes = {
  scloudxUser: "scloudxUser",
  scloudxAdmin: "scloudxAdmin",
  customerUser: "customerUser",
  customerAdmin: "customerAdmin",
  vendorUser: "vendorUser",
  vendorAdmin: "vendorAdmin",
  scloudxSalesAdmin: "scloudxSalesAdmin",
  scloudxSalesUser: "scloudxSalesUser",
  scloudxFinance: "scloudxFinance",
  scloudxServiceDelivery: "scloudxServiceDelivery",
  scloudxManagement: "scloudxManagement",
};

function isScloudxUser(role) {
  if (
    role === roleTypes.scloudxUser ||
    role === roleTypes.scloudxAdmin ||
    role === roleTypes.scloudxSalesAdmin ||
    role === roleTypes.scloudxSalesUser ||
    role === roleTypes.scloudxFinance ||
    role === roleTypes.scloudxServiceDelivery ||
    role === roleTypes.scloudxManagement
  ) {
    return true;
  }
  return false;
}

function isCustomerRole(role) {
  return role === roleTypes.customerAdmin || role === roleTypes.customerUser;
}

function isVendorRole(role) {
  return role === roleTypes.vendorAdmin || role === roleTypes.vendorUser;
}

function isSalesRole(role) {
  return role === roleTypes.scloudxSalesAdmin || role === roleTypes.scloudxSalesUser;
}

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
  roleTypes,
  isScloudxUser,
  isCustomerRole,
  isVendorRole,
  isSalesRole,
};

