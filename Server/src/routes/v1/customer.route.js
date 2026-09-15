const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
// const { createGetCustomerFilter } = require("../../middlewares/customer");

const { customerValidation } = require("../../validations");
const { customerController } = require("../../controllers");

const router = express.Router();

router
  .route("/create")
  .post(
    auth("createCustomers"),
    validate(customerValidation.createCustomer),
    customerController.createCustomer
  );

router.route("/get").post(
  auth(),
  validate(customerValidation.getCustomers),
  // createGetCustomerFilter,
  customerController.getCustomers
);

router
  .route("/deleted")
  .post(
    auth("deleteCustomers"),
    validate(customerValidation.getCustomers),
    customerController.getDeletedCustomers
  );

// router
//   .route("/getDetails")
//   .post(
//     validate(customerValidation.getCustomer),
//     customerController.getCustomer
//   );

router
  .route("/:customerId")
  .patch(
    auth("editCustomers"),
    validate(customerValidation.updateCustomer),
    customerController.updateCustomer
  )
  .delete(
    auth("deleteCustomers"),
    validate(customerValidation.deactivateCustomer),
    customerController.deactivateCustomer
  );

router
  .route("/:customerId/restore")
  .patch(
    auth("deleteCustomers"),
    validate(customerValidation.deactivateCustomer),
    customerController.restoreCustomer
  );

router
  .route("/:customerId/permanent")
  .delete(
    auth("permanentlyDeleteCustomers"),
    validate(customerValidation.deactivateCustomer),
    customerController.permanentlyDeleteCustomer
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer management and retrieval
 */

/**
 * @swagger
 * /customer/create:
 *   post:
 *     summary: Create a customer
 *     description: Only scloudx admins can create other customers.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *            type: array
 *            items:
 *               $ref: '#/components/schemas/CreateCustomerRequest'
 *
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                $ref: '#/components/schemas/Customer'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /customer/get:
 *   post:
 *     summary: Get all customers
 *     description: Only scloudx admins can retrieve all customers.
 *     tags: [Customers]
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
 *         description: Maximum number of customers
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
 *               $ref: '#/components/schemas/GetCustomersFilters'
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
 *                     $ref: '#/components/schemas/Customer'
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
 * /customer/getDeatils:
 *   post:
 *     summary: Get a customer
 *     description: Logged in customers can fetch only their own customer information. Only admins can fetch other customers.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Customer'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /customer/{customerId}:
 *   patch:
 *     summary: Update a customer
 *     description: Only scloudx admins can update customers.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/UpdateCustomerRequest'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Customer'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a customer
 *     description: Only scloudx admins can delete customers.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer id
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
