import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getCashInHandSummary,
  getCashFlowDetails,
  addCashAdjustment,
  getCashBankTransactions,
  updateCashAdjustment,
  deleteCashAdjustment
} from '../controllers/cashBankController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get cash in hand summary
router.get('/summary', getCashInHandSummary);

// Get detailed cash flow for a date range
router.get('/details', getCashFlowDetails);

// Add cash adjustment
router.post('/adjustment', addCashAdjustment);

// Get cash bank transactions with pagination
router.get('/transactions', getCashBankTransactions);

// Update cash adjustment
router.put('/adjustment/:id', updateCashAdjustment);

// Delete cash adjustment
router.delete('/adjustment/:id', deleteCashAdjustment);

export default router;
