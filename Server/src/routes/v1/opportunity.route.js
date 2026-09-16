const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { uploadSupplierAttachment } = require("../../middlewares/upload");

const { opportunityValidation } = require("../../validations");
const { opportunityController } = require("../../controllers");

const router = express.Router();

router
  .route("/create")
  .post(
    auth("createOpportunities"),
    validate(opportunityValidation.createOpportunity),
    opportunityController.createOpportunity
  );

router
  .route("/get")
  .post(
    auth("viewOpportunities"),
    validate(opportunityValidation.getOpportunities),
    opportunityController.getOpportunities
  );

router
  .route("/dashboard-summary")
  .post(auth("viewDashboard"), opportunityController.getSalesDashboardSummary);

router
  .route("/deleted")
  .post(
    auth("deleteOpportunities"),
    validate(opportunityValidation.getOpportunities),
    opportunityController.getDeletedOpportunities
  );

router
  .route("/:opportunityId")
  .get(
    auth("viewOpportunities"),
    validate(opportunityValidation.getOpportunity),
    opportunityController.getOpportunity
  )
  .patch(
    auth("editOpportunities"),
    validate(opportunityValidation.updateOpportunity),
    opportunityController.updateOpportunity
  )
  .delete(
    auth("deleteOpportunities"),
    validate(opportunityValidation.deactivateOpportunity),
    opportunityController.deactivateOpportunity
  );

router
  .route("/:opportunityId/restore")
  .patch(
    auth("deleteOpportunities"),
    validate(opportunityValidation.deactivateOpportunity),
    opportunityController.restoreOpportunity
  );

router
  .route("/:opportunityId/permanent")
  .delete(
    auth("permanentlyDeleteOpportunities"),
    validate(opportunityValidation.deactivateOpportunity),
    opportunityController.permanentlyDeleteOpportunity
  );

router
  .route("/:opportunityId/supplier-communications/:entryId/attachment")
  .post(
    auth("editOpportunities"),
    uploadSupplierAttachment.array("files", 5),
    opportunityController.uploadSupplierCommunicationAttachment
  );

router
  .route("/:opportunityId/supplier-communications/:entryId/attachment/:attachmentId")
  .get(auth("viewOpportunities"), opportunityController.downloadSupplierCommunicationAttachment);

module.exports = router;
