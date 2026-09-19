const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");

const { dashboardValidation } = require("../../validations");
const { dashboardController } = require("../../controllers");

const router = express.Router();

router.route("/summary").post(auth("viewDashboard"), dashboardController.getSummary);

router.route("/open-tickets-analysis").post(auth("viewDashboard"), dashboardController.getOpenTicketsAnalysis);

router
  .route("/closed-tickets-analysis")
  .post(
    auth("viewDashboard"),
    validate(dashboardValidation.getClosedTicketsAnalysis),
    dashboardController.getClosedTicketsAnalysis
  );

module.exports = router;
