const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");

const { regionValidation } = require("../../validations");
const { regionController } = require("../../controllers");

const router = express.Router();

router
  .route("/create")
  .post(
    auth(),
    validate(regionValidation.createRegion),
    regionController.createRegion
  );

router
  .route("/get")
  .post(
    auth(),
    validate(regionValidation.getRegions),
    regionController.getRegions
  );

// router
//   .route("/getDetails")
//   .post(
//     validate(regionValidation.getRegion),
//     regionController.getRegion
//   );

router
  .route("/update")
  .post(validate(regionValidation.updateRegion), regionController.updateRegion);

router
  .route("/deactivate")
  .post(
    validate(regionValidation.deactivateRegion),
    regionController.deactivateRegion
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Regions
 *   description: Region management and retrieval
 */

/**
 * @swagger
 * /region/create:
 *   post:
 *     summary: Create a region
 *     description: Only scloudx admins can create other regions.
 *     tags: [Regions]
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
 *                $ref: '#/components/schemas/Region'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /region/get:
 *   post:
 *     summary: Get all regions
 *     description: Only scloudx admins can retrieve all regions.
 *     tags: [Regions]
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
 *         description: Maximum number of regions
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
 *               $ref: '#/components/schemas/GetRegionsFilters'
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
 *                     $ref: '#/components/schemas/Region'
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
 * /region/getDeatils:
 *   post:
 *     summary: Get a region
 *     description: Logged in regions can fetch only their own region information. Only admins can fetch other regions.
 *     tags: [Regions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Region id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Region'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 *
 * /region/update:
 *   post:
 *     summary: Update a region
 *     description: Logged in regions can only update their own information. Only admins can update other regions.
 *     tags: [Regions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/UpdateRegionRequest'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Region'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 *
 * /region/deactivate:
 *   delete:
 *     summary: Delete a region
 *     description: Only scloudx admins can delete regions.
 *     tags: [Regions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/GetRegionRequest'
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
