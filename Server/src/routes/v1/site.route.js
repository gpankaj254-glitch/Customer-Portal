const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { uploadCsv } = require("../../middlewares/upload");

const { siteValidation } = require("../../validations");
const { siteController } = require("../../controllers");

const router = express.Router();

router
  .route("/create")
  .post(auth("createSites"), validate(siteValidation.createSite), siteController.createSite);

router
  .route("/bulk-upload")
  .post(auth("bulkUpload"), uploadCsv.single("file"), siteController.bulkUploadSites);

router
  .route("/:siteId")
  .get(auth(), siteController.getSite)
  .patch(
    auth("editSites"),
    validate(siteValidation.updateSite),
    siteController.updateSite
  )
  .delete(
    auth("deleteSites"),
    validate(siteValidation.deactivateSite),
    siteController.deactivateSite
  );

router
 .route("/get")  .post(auth(), validate(siteValidation.getSites), siteController.getSites);

router
  .route("/deleted")
  .post(auth("deleteSites"), validate(siteValidation.getSites), siteController.getDeletedSites);

router
  .route("/:siteId/restore")
  .patch(
    auth("deleteSites"),
    validate(siteValidation.deactivateSite),
    siteController.restoreSite
  );

router
  .route("/:siteId/permanent")
  .delete(
    auth("permanentlyDeleteSites"),
    validate(siteValidation.deactivateSite),
    siteController.permanentlyDeleteSite
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Sites
 *   description: Site management and retrieval
 */

/**
 * @swagger
 * /site/create:
 *   post:
 *     summary: Create a site
 *     description: Only scloudx admins can create other sites.
 *     tags: [Sites]
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
 *                $ref: '#/components/schemas/Site'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /site/get:
 *   post:
 *     summary: Get all sites
 *     description: Only scloudx admins can retrieve all sites.
 *     tags: [Sites]
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
 *         description: Maximum number of sites
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
 *               $ref: '#/components/schemas/GetSitesFilters'
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
 *                     $ref: '#/components/schemas/Site'
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
 * /site/getDeatils:
 *   post:
 *     summary: Get a site
 *     description: Logged in sites can fetch only their own site information. Only admins can fetch other sites.
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Site id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Site'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /site/{siteId}:
 *   patch:
 *     summary: Update a site
 *     description: Only scloudx admins can update sites.
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Site id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/UpdateSiteRequest'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Site'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a site
 *     description: Only scloudx admins can delete sites.
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Site id
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
