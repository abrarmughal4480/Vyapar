import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  // Bank Account Management
  createBankAccount,
  getBankAccounts,
  getBankAccount,
  updateBankAccount,
  deleteBankAccount,
  
  // Bank Transactions
  createBankTransaction,
  getAccountTransactions,
  getAllBankTransactions,
  updateBankTransaction,
  deleteBankTransaction,
  
  // Legacy Cash in Hand functions
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

// ==================== BANK ACCOUNT MANAGEMENT ====================

// Create a new bank account
router.post('/accounts', createBankAccount);

// Get all bank accounts for a user
router.get('/accounts', getBankAccounts);

// Get a specific bank account
router.get('/accounts/:id', getBankAccount);

// Update a bank account
router.put('/accounts/:id', updateBankAccount);

// Delete a bank account (soft delete)
router.delete('/accounts/:id', deleteBankAccount);

// ==================== BANK TRANSACTIONS ====================

// Create a bank transaction
router.post('/transactions', createBankTransaction);

// Get transactions for a specific account
router.get('/accounts/:accountName/transactions', getAccountTransactions);

// Get all bank transactions
router.get('/transactions', getAllBankTransactions);

// Update a bank transaction
router.put('/transactions/:id', updateBankTransaction);

// Delete a bank transaction
router.delete('/transactions/:id', deleteBankTransaction);

// ==================== LEGACY CASH IN HAND FUNCTIONS ====================

// Get cash in hand summary
router.get('/summary', getCashInHandSummary);

// Get detailed cash flow for a date range
router.get('/details', getCashFlowDetails);

// Add cash adjustment
router.post('/adjustment', addCashAdjustment);

// Get cash bank transactions with pagination
router.get('/legacy-transactions', getCashBankTransactions);

// Update cash adjustment
router.put('/adjustment/:id', updateCashAdjustment);

// Delete cash adjustment
router.delete('/adjustment/:id', deleteCashAdjustment);

export default router;