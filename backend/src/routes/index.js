import express from 'express';
import authRoutes from './auth.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePageAccess } from '../middlewares/accessControlMiddleware.js';
import partiesRoutes from './parties.js';
import { addItem, bulkImportItems, getItems, getItemsByLoggedInUser, deleteItem, updateItem, getItemsPerformanceStats } from '../controllers/itemsController.js';
import saleRoutes from './sale.js';
import purchaseRoutes from './purchase.js';
import saleOrderRoutes from './saleOrder.js';
import purchaseOrderRoutes from './purchaseOrder.js';
import quotationRoutes from './quotation.js';
import deliveryChallanRoutes from './deliveryChallan.js';
import paymentOutRoutes from './paymentOut.js';
import profitAndLossController from '../controllers/profitAndLossController.js';
import creditNoteRoutes from './creditNote.js';
import licenseKeyRoutes from './licenseKeys.js';
import expenseRoutes from './expense.js';
import cashBankRoutes from './cashBank.js';
import { getDashboardStats, getSalesOverview, getRecentActivity, getProfile, updateProfile, getReceivablesList, getPayablesList, getDashboardPerformanceStats, testStockValue, getStockSummary, createDashboardIndexes, getPartyBalances } from '../controllers/dashboardController.js';
import sessionCheckRoutes from './sessionCheck.js';
import { sendUserInvite, getUserInvites, getInvitesForMe, respondToInvite, deleteUserInvite, updateUserInvite, updateUserCompanyContext } from '../controllers/userInviteController.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/api', sessionCheckRoutes); // Add session check routes
router.use('/parties', authMiddleware, partiesRoutes);
router.use('/api/sales', saleRoutes);
router.use('/api/purchases', purchaseRoutes);
router.use('/api/sale-orders', saleOrderRoutes);
router.use('/api/purchase-orders', purchaseOrderRoutes);
router.use('/api/delivery-challan', deliveryChallanRoutes);
router.use('/api/payment-out', paymentOutRoutes);
router.use('/api/credit-notes', creditNoteRoutes);
router.use('/api/license-keys', licenseKeyRoutes);
router.use('/api/expenses', expenseRoutes);
router.use('/api/cash-bank', cashBankRoutes);
router.use('/quotations', authMiddleware, quotationRoutes);

// Dashboard stats route
router.get('/dashboard/stats', authMiddleware, getDashboardStats);

// Add new routes for sales overview and recent activity (no user ID required)
router.get('/dashboard/sales-overview', authMiddleware, getSalesOverview);
router.get('/dashboard/recent-activity', authMiddleware, getRecentActivity);

// Add the new route for receivables and payables
router.get('/api/dashboard/receivables', authMiddleware, getReceivablesList);
router.get('/api/dashboard/payables', authMiddleware, getPayablesList);

// Add the new route for sales overview (with user ID - keep for backward compatibility)
router.get('/api/dashboard/sales-overview/:userId', authMiddleware, getSalesOverview);

// Add the new route for recent activity (with user ID - keep for backward compatibility)
router.get('/dashboard/recent-activity/:userId', authMiddleware, getRecentActivity);

// Profile routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

// Parties count route
router.get('/parties/count', authMiddleware, (req, res) => {
  res.json({ success: true, data: { count: 42 } });
});

// Items count route
router.get('/items/count', authMiddleware, (req, res) => {
  res.json({ success: true, data: { count: 99 } });
});

// Items routes
router.get('/items', authMiddleware, getItemsByLoggedInUser);
router.post('/items/:userId', authMiddleware, addItem);
router.post('/items/:userId/bulk-import', authMiddleware, bulkImportItems);
router.get('/items/:userId', authMiddleware, getItems);
router.delete('/items/:userId/:itemId', authMiddleware, deleteItem);
router.put('/items/:userId/:itemId', authMiddleware, updateItem);

// Items performance monitoring route
router.get('/items/stats/performance', authMiddleware, getItemsPerformanceStats);

// Dashboard performance monitoring route
router.get('/dashboard/stats/performance', authMiddleware, getDashboardPerformanceStats);

// Create database indexes for better performance
router.post('/dashboard/create-indexes', authMiddleware, createDashboardIndexes);

// Test stock value calculation route
router.get('/dashboard/test-stock-value', authMiddleware, testStockValue);

// Stock summary route
router.get('/dashboard/stock-summary', authMiddleware, getStockSummary);

// Party balances route
router.get('/dashboard/party-balances', authMiddleware, getPartyBalances);

// Profit and Loss report route
router.get('/api/reports/profit-and-loss', authMiddleware, profitAndLossController.getProfitAndLoss);

// User invite route - restricted to non-SECONDARY ADMIN roles
router.post('/api/user-invite', authMiddleware, requirePageAccess('add-user'), sendUserInvite);

// Get all invites sent by the logged-in user
router.get('/api/user-invites', authMiddleware, getUserInvites);
router.put('/api/user-invite/:inviteId', authMiddleware, updateUserInvite);
router.delete('/api/user-invite/:inviteId', authMiddleware, deleteUserInvite);

// Get invites for the logged-in user's email
router.get('/api/invites/for-me', authMiddleware, getInvitesForMe);
// Accept or reject an invite
router.post('/api/invites/respond', authMiddleware, respondToInvite);
// Update user company context when joining a company
router.post('/api/invites/update-company-context', authMiddleware, updateUserCompanyContext);

router.get('/', (req, res) => {
  res.send('Hello from Express backend!');
});

// Test route for bulk import
router.get('/test-bulk-import', (req, res) => {
  res.json({ success: true, message: 'Bulk import route is accessible' });
});

export default router; 