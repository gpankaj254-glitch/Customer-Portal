const allRoles = {
  scloudxUser: [
    "createCustomers",
    "createUsers",
    "createSites",
    "createCircuits",
    "createVendors",
    "createTickets",
    "viewTickets",
    "updateTickets",
    "appendTicketDescription",
    "viewDashboard",
  ],
  scloudxAdmin: [
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
    "viewDashboard",
    "createOpportunities",
    "editOpportunities",
    "deleteOpportunities",
    "permanentlyDeleteOpportunities",
    "viewOpportunities",
  ],
  customerUser: ["createTickets", "viewTickets", "appendTicketDescription", "viewDashboard"],
  customerAdmin: ["createUsers", "editUsers", "deleteUsers", "resetUserPassword", "createTickets", "viewTickets", "appendTicketDescription", "viewDashboard"],
  vendorUser: [],
  vendorAdmin: ["createUsers", "editUsers", "deleteUsers"],
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
  ],
  scloudxSalesUser: ["createOpportunities", "editOpportunities", "viewOpportunities", "viewDashboard"],
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
};

function isScloudxUser(role) {
  if (
    role === roleTypes.scloudxUser ||
    role === roleTypes.scloudxAdmin ||
    role === roleTypes.scloudxSalesAdmin ||
    role === roleTypes.scloudxSalesUser
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

