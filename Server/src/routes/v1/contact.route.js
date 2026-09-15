const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
// const { createGetContactFilter } = require("../../middlewares/contact");

const { contactValidation } = require("../../validations");
const { contactController } = require("../../controllers");

const router = express.Router();

router
  .route("/create")
  .post(
    auth(),
    validate(contactValidation.createContact),
    contactController.createContact
  );

router.route("/get").post(
  auth(),
  validate(contactValidation.getContacts),
  // createGetContactFilter,
  contactController.getContacts
);

// router
//   .route("/getDetails")
//   .post(
//     validate(contactValidation.getContact),
//     contactController.getContact
//   );

router.route("/update").post(
  // auth("manageContacts"),
  validate(contactValidation.updateContact),
  contactController.updateContact
);

router.route("/deactivate").post(
  // auth("manageContacts"),
  validate(contactValidation.deactivateContact),
  contactController.deactivateContact
);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Contacts
 *   description: Contact management and retrieval
 */

/**
 * @swagger
 * /contact/create:
 *   post:
 *     summary: Create a contact
 *     description: Only scloudx admins can create other contacts.
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *            type: array
 *            items:
 *               $ref: '#/components/schemas/CreateContactRequest'
 *
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                $ref: '#/components/schemas/Contact'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /contact/get:
 *   post:
 *     summary: Get all contacts
 *     description: Only scloudx admins can retrieve all contacts.
 *     tags: [Contacts]
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
 *         description: Maximum number of contacts
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
 *               $ref: '#/components/schemas/GetContactsFilters'
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
 *                     $ref: '#/components/schemas/Contact'
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
 * /contact/getDeatils:
 *   post:
 *     summary: Get a contact
 *     description: Logged in contacts can fetch only their own contact information. Only admins can fetch other contacts.
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Contact'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /contact/update:
 *   post:
 *     summary: Update a contact
 *     description: Logged in contacts can only update their own information. Only admins can update other contacts.
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/UpdateContactRequest'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Contact'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /contact/deactivate:
 *   delete:
 *     summary: Delete a contact
 *     description: Only scloudx admins can delete contacts.
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/GetContactRequest'
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
