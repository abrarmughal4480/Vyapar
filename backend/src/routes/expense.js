import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  getPartyExpenseBalance
} from '../controllers/expenseController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Create new expense
router.post('/', createExpense);

// Get all expenses with filters and pagination
router.get('/', getExpenses);

// Get expense statistics
router.get('/stats', getExpenseStats);

// Get party expense balance
router.get('/party-balance', getPartyExpenseBalance);

// Get expense by ID
router.get('/:id', getExpenseById);

// Update expense
router.put('/:id', updateExpense);

// Delete expense
router.delete('/:id', deleteExpense);

export default router;
