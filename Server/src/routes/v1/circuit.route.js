const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { uploadCsv } = require("../../middlewares/upload");

const { circuitValidation } = require("../../validations");
const { circuitController } = require("../../controllers");

const router = express.Router();

router
  .route("/create")
  .post(
    auth("createCircuits"),
    validate(circuitValidation.createCircuit),
    circuitController.createCircuit
  );

router
  .route("/bulk-upload")
  .post(auth("bulkUpload"), uploadCsv.single("file"), circuitController.bulkUploadCircuits);

router
  .route("/get")
  .post(
    auth(),
    validate(circuitValidation.getCircuits),
    circuitController.getCircuits
  );

router
  .route("/deleted")
  .post(
    auth("deleteCircuits"),
    validate(circuitValidation.getCircuits),
    circuitController.getDeletedCircuits
  );

router
  .route("/:circuitId")
  .patch(
    auth("editCircuits"),
    validate(circuitValidation.updateCircuit),
    circuitController.updateCircuit
  )
  .delete(
    auth("deleteCircuits"),
    validate(circuitValidation.deactivateCircuit),
    circuitController.deactivateCircuit
  );

router
  .route("/:circuitId/restore")
  .patch(
    auth("deleteCircuits"),
    validate(circuitValidation.deactivateCircuit),
    circuitController.restoreCircuit
  );

router
  .route("/:circuitId/permanent")
  .delete(
    auth("permanentlyDeleteCircuits"),
    validate(circuitValidation.deactivateCircuit),
    circuitController.permanentlyDeleteCircuit
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Circuits
 *   description: Circuit management and retrieval
 */

/**
 * @swagger
 * /circuit/create:
 *   post:
 *     summary: Create a circuit
 *     description: Only scloudx admins can create other circuits.
 *     tags: [Circuits]
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
 *                $ref: '#/components/schemas/Circuit'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /circuit/get:
 *   post:
 *     summary: Get all circuits
 *     description: Only scloudx admins can retrieve all circuits.
 *     tags: [Circuits]
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
 *         description: Maximum number of circuits
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
 *               $ref: '#/components/schemas/GetCircuitsFilters'
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
 *                     $ref: '#/components/schemas/Circuit'
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
 * /circuit/getDeatils:
 *   post:
 *     summary: Get a circuit
 *     description: Logged in circuits can fetch only their own circuit information. Only admins can fetch other circuits.
 *     tags: [Circuits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Circuit id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Circuit'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 *
 * /circuit/update:
 *   post:
 *     summary: Update a circuit
 *     description: Logged in circuits can only update their own information. Only admins can update other circuits.
 *     tags: [Circuits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/UpdateCircuitRequest'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Circuit'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 *
 * /circuit/deactivate:
 *   delete:
 *     summary: Delete a circuit
 *     description: Only scloudx admins can delete circuits.
 *     tags: [Circuits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/GetCircuitRequest'
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
