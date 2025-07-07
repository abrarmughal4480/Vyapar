import express from 'express';
import { createQuotation, getQuotationsForUser, updateQuotationStatus, fixQuotationIndexes, deleteQuotation } from '../controllers/quotationController.js';
import mongoose from 'mongoose';

const router = express.Router();

// Create a new quotation
router.post('/', createQuotation);
// Get all quotations for the logged-in user
router.get('/', getQuotationsForUser);
// Update quotation status
router.put('/:id/status', updateQuotationStatus);
// Delete a quotation
router.delete('/:id', deleteQuotation);

// Temporary route to fix database indexes
router.post('/fix-indexes', async (req, res) => {
  try {
    const result = await fixQuotationIndexes();
    res.json(result);
  } catch (error) {
    console.error('Error fixing indexes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router; 