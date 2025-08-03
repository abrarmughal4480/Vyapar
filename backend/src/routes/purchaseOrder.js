import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createPurchaseOrder,
  getPurchaseOrdersByUser,
  updatePurchaseOrderStatus,
  convertPurchaseOrderToInvoice,
  updatePurchaseOrderTotals,
  updatePurchaseOrder,
  fixCompletedPurchaseOrders,
  deletePurchaseOrder
} from '../controllers/purchaseOrderController.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create a new purchase order
router.post('/', createPurchaseOrder);

// Get all purchase orders for the logged-in user
router.get('/', getPurchaseOrdersByUser);

// Update purchase order status
router.patch('/:orderId/status', updatePurchaseOrderStatus);

// Convert purchase order to invoice
router.patch('/:orderId/convert', convertPurchaseOrderToInvoice);

// Update totals for existing purchase orders (utility route)
router.post('/update-totals', updatePurchaseOrderTotals);

// Add this route for full update
router.put('/:orderId', updatePurchaseOrder);

// Fix completed purchase orders without invoice numbers
router.post('/fix-completed', fixCompletedPurchaseOrders);

// Delete a purchase order
router.delete('/:orderId', deletePurchaseOrder);

export default router; 