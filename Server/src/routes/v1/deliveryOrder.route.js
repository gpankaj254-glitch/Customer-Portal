const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { uploadCsv } = require("../../middlewares/upload");

const { deliveryOrderValidation } = require("../../validations");
const { deliveryOrderController } = require("../../controllers");

const router = express.Router();

router
  .route("/create")
  .post(
    auth("createDeliveryOrders"),
    validate(deliveryOrderValidation.createDeliveryOrder),
    deliveryOrderController.createDeliveryOrder
  );

router
  .route("/bulk-upload")
  .post(auth("bulkUpload"), uploadCsv.single("file"), deliveryOrderController.bulkUploadDeliveryOrders);

router
  .route("/get")
  .post(
    auth("viewDeliveryOrders"),
    validate(deliveryOrderValidation.getDeliveryOrders),
    deliveryOrderController.getDeliveryOrders
  );

router
  .route("/deleted")
  .post(
    auth("deleteDeliveryOrders"),
    validate(deliveryOrderValidation.getDeliveryOrders),
    deliveryOrderController.getDeletedDeliveryOrders
  );

router
  .route("/:deliveryOrderId")
  .patch(
    auth("updateDeliveryOrders"),
    validate(deliveryOrderValidation.updateDeliveryOrder),
    deliveryOrderController.updateDeliveryOrder
  )
  .delete(
    auth("deleteDeliveryOrders"),
    validate(deliveryOrderValidation.deleteDeliveryOrder),
    deliveryOrderController.deactivateDeliveryOrder
  );

router
  .route("/:deliveryOrderId/restore")
  .patch(
    auth("deleteDeliveryOrders"),
    validate(deliveryOrderValidation.deleteDeliveryOrder),
    deliveryOrderController.restoreDeliveryOrder
  );

router
  .route("/:deliveryOrderId/permanent")
  .delete(
    auth("permanentlyDeleteDeliveryOrders"),
    validate(deliveryOrderValidation.deleteDeliveryOrder),
    deliveryOrderController.permanentlyDeleteDeliveryOrder
  );

module.exports = router;
