const express = require("express");
const authRoute = require("./auth.route");
const userRoute = require("./user.route");
const customerRoute = require("./customer.route");
const regionRoute = require("./region.route");
const vendorRoute = require("./vendor.route");
const ticketRoute = require("./ticket.route");
const contactRoute = require("./contact.route");
const circuitRoute = require("./circuit.route");
const siteRoute = require("./site.route");
const dashboardRoute = require("./dashboard.route");
const opportunityRoute = require("./opportunity.route");

const docsRoute = require("./docs.route");
const config = require("../../config/config");

const router = express.Router();

const defaultRoutes = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/user",
    route: userRoute,
  },
  {
    path: "/customer",
    route: customerRoute,
  },
  {
    path: "/region",
    route: regionRoute,
  },
  {
    path: "/vendor",
    route: vendorRoute,
  },
  {
    path: "/site",
    route: siteRoute,
  },
  {
    path: "/circuit",
    route: circuitRoute,
  },
  {
    path: "/ticket",
    route: ticketRoute,
  },
  {
    path: "/contact",
    route: contactRoute,
  },
  {
    path: "/dashboard",
    route: dashboardRoute,
  },
  {
    path: "/opportunity",
    route: opportunityRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: "/docs",
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === "development") {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
