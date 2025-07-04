import express from 'express';
import { createQuotation, getQuotationsForUser, updateQuotationStatus } from '../controllers/quotationController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a new quotation
router.post('/', authMiddleware, createQuotation);
// Get all quotations for the logged-in user
router.get('/', authMiddleware, getQuotationsForUser);
// Update quotation status
router.put('/:id/status', authMiddleware, updateQuotationStatus);

export default router; 