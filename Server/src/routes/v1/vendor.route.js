const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { uploadCsv } = require("../../middlewares/upload");

const { vendorValidation } = require("../../validations");
const { vendorController } = require("../../controllers");

const router = express.Router();

router
  .route("/create")
  .post(
    auth("createVendors"),
    validate(vendorValidation.createVendor),
    vendorController.createVendor
  );

router
  .route("/bulk-upload")
  .post(auth("bulkUpload"), uploadCsv.single("file"), vendorController.bulkUploadVendors);

router
  .route("/get")
  .post(
    auth(),
    validate(vendorValidation.getVendors),
    vendorController.getVendors
  );

router
  .route("/deleted")
  .post(
    auth("deleteVendors"),
    validate(vendorValidation.getVendors),
    vendorController.getDeletedVendors
  );

router
  .route("/:vendorId")
  .patch(
    auth("editVendors"),
    validate(vendorValidation.updateVendor),
    vendorController.updateVendor
  )
  .delete(
    auth("deleteVendors"),
    validate(vendorValidation.deactivateVendor),
    vendorController.deactivateVendor
  );

router
  .route("/:vendorId/restore")
  .patch(
    auth("deleteVendors"),
    validate(vendorValidation.deactivateVendor),
    vendorController.restoreVendor
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Vendor management and retrieval
 */

/**
 * @swagger
 * /vendor/create:
 *   post:
 *     summary: Create a vendor
 *     description: Only scloudx admins can create other vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *            type: array
 *
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                $ref: '#/components/schemas/Vendor'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /vendor/get:
 *   post:
 *     summary: Get all vendors
 *     description: Only scloudx admins can retrieve all vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of vendors
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *               $ref: '#/components/schemas/GetVendorsFilters'
 *
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vendor'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * /vendor/getDeatils:
 *   post:
 *     summary: Get a vendor
 *     description: Logged in vendors can fetch only their own vendor information. Only admins can fetch other vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Vendor'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 *
 * /vendor/update:
 *   post:
 *     summary: Update a vendor
 *     description: Logged in vendors can only update their own information. Only admins can update other vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/UpdateVendorRequest'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Vendor'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 *
 * /vendor/deactivate:
 *   delete:
 *     summary: Delete a vendor
 *     description: Only scloudx admins can delete vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/GetVendorRequest'
 *
 *     responses:
 *       "200":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
