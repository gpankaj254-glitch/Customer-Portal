const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { uploadTicketAttachment, uploadVendorAttachment, uploadCsv } = require("../../middlewares/upload");

const { ticketValidation } = require("../../validations");
const { ticketController } = require("../../controllers");

const router = express.Router();

router
  .route("/create")
  .post(
    auth("createTickets"),
    validate(ticketValidation.createTicket),
    ticketController.createTicket
  );

router
  .route("/bulk-upload")
  .post(auth("bulkUpload"), uploadCsv.single("file"), ticketController.bulkUploadTickets);

router
  .route("/get")
  .post(
    auth("viewTickets"),
    validate(ticketValidation.getTickets),
    ticketController.getTickets
  );

router
  .route("/update")
  .post(
    auth("updateTickets"),
    validate(ticketValidation.updateTicket),
    ticketController.updateTicket
  );

router
  .route("/append-description")
  .post(
    auth("appendTicketDescription"),
    validate(ticketValidation.appendDescription),
    ticketController.appendDescription
  );

router
  .route("/upload-attachment/:ticketId")
  .post(
    auth("appendTicketDescription"),
    uploadTicketAttachment.array("files", 5),
    ticketController.uploadAttachment
  );

router
  .route("/attachment/:ticketId/:attachmentId")
  .get(auth("viewTickets"), ticketController.downloadAttachment);

// Vendor Communication is SCX-only (not visible to customers), so every
// route below is gated with the same right as the main /update endpoint,
// not the shared appendTicketDescription/viewTickets rights customers hold.
router
  .route("/append-vendor-description")
  .post(
    auth("updateTickets"),
    validate(ticketValidation.appendDescription),
    ticketController.appendVendorDescription
  );

router
  .route("/upload-vendor-attachment/:ticketId")
  .post(
    auth("updateTickets"),
    uploadVendorAttachment.array("files", 5),
    ticketController.uploadVendorAttachment
  );

router
  .route("/vendor-attachment/:ticketId/:attachmentId")
  .get(auth("updateTickets"), ticketController.downloadVendorAttachment);

router
  .route("/deleted")
  .post(
    auth("deleteTickets"),
    validate(ticketValidation.getTickets),
    ticketController.getDeletedTickets
  );

router
  .route("/:ticketId")
  .delete(
    auth("deleteTickets"),
    validate(ticketValidation.deactivateTicket),
    ticketController.deactivateTicket
  );

router
  .route("/:ticketId/restore")
  .patch(
    auth("deleteTickets"),
    validate(ticketValidation.deactivateTicket),
    ticketController.restoreTicket
  );

router
  .route("/:ticketId/permanent")
  .delete(
    auth("permanentlyDeleteTickets"),
    validate(ticketValidation.deactivateTicket),
    ticketController.permanentlyDeleteTicket
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management and retrieval
 */

/**
 * @swagger
 * /ticket/create:
 *   post:
 *     summary: Create a ticket
 *     description: Only scloudx admins can create other tickets.
 *     tags: [Tickets]
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
 *                $ref: '#/components/schemas/Ticket'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /ticket/get:
 *   post:
 *     summary: Get all tickets
 *     description: Only scloudx admins can retrieve all tickets.
 *     tags: [Tickets]
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
 *         description: Maximum number of tickets
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
 *               $ref: '#/components/schemas/GetTicketsFilters'
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
 *                     $ref: '#/components/schemas/Ticket'
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
 * /ticket/getDeatils:
 *   post:
 *     summary: Get a ticket
 *     description: Logged in tickets can fetch only their own ticket information. Only admins can fetch other tickets.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Ticket'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 *
 * /ticket/update:
 *   post:
 *     summary: Update a ticket
 *     description: Logged in tickets can only update their own information. Only admins can update other tickets.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/UpdateTicketRequest'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Ticket'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 *
 * /ticket/deactivate:
 *   delete:
 *     summary: Delete a ticket
 *     description: Only scloudx admins can delete tickets.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/GetTicketRequest'
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
