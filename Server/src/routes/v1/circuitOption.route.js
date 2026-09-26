const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { circuitOptionValidation } = require("../../validations");
const { circuitOptionController } = require("../../controllers");

const router = express.Router();

// "Once this is changed, these values should be visible in various dropdown
// menus" - open to any authenticated role (no specific right), same as
// every other option list this app's dropdowns already read.
router
  .route("/get")
  .get(
    auth(),
    validate(circuitOptionValidation.getCircuitOptions),
    circuitOptionController.getCircuitOptions
  );

// "Create Product Management Function for SCX Admin" - the management
// page's own list (admin-added options only); create/rename/deactivate
// are SCX Admin only (see roles.js's manageCircuitOptions).
router
  .route("/managed")
  .get(
    auth("manageCircuitOptions"),
    validate(circuitOptionValidation.getCircuitOptions),
    circuitOptionController.getManagedCircuitOptions
  );

router
  .route("/create")
  .post(
    auth("manageCircuitOptions"),
    validate(circuitOptionValidation.createCircuitOption),
    circuitOptionController.createCircuitOption
  );

router
  .route("/:circuitOptionId/rename")
  .patch(
    auth("manageCircuitOptions"),
    validate(circuitOptionValidation.renameCircuitOption),
    circuitOptionController.renameCircuitOption
  );

router
  .route("/:circuitOptionId")
  .delete(
    auth("manageCircuitOptions"),
    validate(circuitOptionValidation.deactivateCircuitOption),
    circuitOptionController.deactivateCircuitOption
  );

module.exports = router;
