import express from 'express';
import quotationController from '../controllers/quotationController.js';
import mongoose from 'mongoose';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a new quotation
router.post('/', quotationController.createQuotation);
// Get all quotations for the logged-in user
router.get('/', quotationController.getQuotationsForUser);
// Update quotation status
router.put('/:id/status', quotationController.updateQuotationStatus);
// Delete a quotation
router.delete('/:id', quotationController.deleteQuotation);

// Temporary route to fix database indexes
router.post('/fix-indexes', async (req, res) => {
  try {
    const result = await quotationController.fixQuotationIndexes();
    res.json(result);
  } catch (error) {
    console.error('Error fixing indexes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/update/:quotationId', authMiddleware, quotationController.updateQuotation);

export default router; 