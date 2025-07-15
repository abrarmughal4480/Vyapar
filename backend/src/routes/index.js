import express from 'express';
import authRoutes from './auth.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import partiesRoutes from './parties.js';
import * as itemsController from '../controllers/itemsController.js';
import saleRoutes from './sale.js';
import purchaseRoutes from './purchase.js';
import partiesController from '../controllers/partiesController.js';
import saleOrderRoutes from './saleOrder.js';
import purchaseOrderRoutes from './purchaseOrder.js';
import quotationRoutes from './quotation.js';
import deliveryChallanRoutes from './deliveryChallan.js';
import paymentOutRoutes from './paymentOut.js';
import profitAndLossController from '../controllers/profitAndLossController.js';
import creditNoteRoutes from './creditNote.js';
import * as dashboardController from '../controllers/dashboardController.js';
import { getDashboardStats, getSalesOverview, getRecentActivity } from '../controllers/dashboardController.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/parties', authMiddleware, partiesRoutes);
router.use('/api/sales', saleRoutes);
router.use('/api/purchases', purchaseRoutes);
router.use('/api/sale-orders', saleOrderRoutes);
router.use('/api/purchase-orders', purchaseOrderRoutes);
router.use('/api/delivery-challan', deliveryChallanRoutes);
router.use('/api/payment-out', paymentOutRoutes);
router.use('/api/credit-notes', creditNoteRoutes);
router.use('/quotations', authMiddleware, quotationRoutes);

// Dashboard stats route
router.get('/dashboard/stats', authMiddleware, dashboardController.getDashboardStats);

// Add the new route for sales overview
router.get('/api/dashboard/sales-overview/:userId', authMiddleware, getSalesOverview);

// Add the new route for recent activity
router.get('/dashboard/recent-activity/:userId', getRecentActivity);

// Parties count route
router.get('/parties/count', authMiddleware, (req, res) => {
  res.json({ success: true, data: { count: 42 } });
});

// Items count route
router.get('/items/count', authMiddleware, (req, res) => {
  res.json({ success: true, data: { count: 99 } });
});

// Items routes
router.get('/items', authMiddleware, itemsController.getItemsByLoggedInUser);
router.post('/items/:userId', itemsController.addItem);
router.post('/items/:userId/bulk-import', itemsController.bulkImportItems);
router.get('/items/:userId', itemsController.getItems);
router.delete('/items/:userId/:itemId', itemsController.deleteItem);
router.put('/items/:userId/:itemId', itemsController.updateItem);

router.get('/parties/balance', authMiddleware, partiesController.getPartyBalance);

// Profit and Loss report route
router.get('/api/reports/profit-and-loss', authMiddleware, profitAndLossController.getProfitAndLoss);

router.get('/', (req, res) => {
  res.send('Hello from Express backend!');
});

// Test route for bulk import
router.get('/test-bulk-import', (req, res) => {
  res.json({ success: true, message: 'Bulk import route is accessible' });
});

export default router; 