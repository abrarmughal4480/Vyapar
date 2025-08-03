import express from 'express';
import * as paymentOutController from '../controllers/paymentOutController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create a new payment out
router.post('/', paymentOutController.createPaymentOut);

// NEW ROUTE: Make bulk payment to party
router.post('/bulk-payment', paymentOutController.makeBulkPaymentToParty);

// Get all payment outs for a user
router.get('/user/:userId', paymentOutController.getPaymentOutsByUser);

// Get payment out stats for a user
router.get('/stats/:userId', paymentOutController.getPaymentOutStatsByUser);

// Get payment outs by supplier
router.get('/supplier/:userId/:supplierName', paymentOutController.getPaymentOutsBySupplier);

// Get payment out overview
router.get('/overview/:userId', paymentOutController.getPaymentOutOverview);

// Update payment out
router.put('/:paymentOutId', paymentOutController.updatePaymentOut);

// Delete payment out
router.delete('/:paymentOutId', paymentOutController.deletePaymentOut);

export default router; 