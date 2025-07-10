import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createSaleOrder,
  getSaleOrdersByUser,
  updateSaleOrderStatus,
  convertSaleOrderToInvoice,
  deleteSaleOrder,
  updateSaleOrder
} from '../controllers/saleOrderController.js';

const router = express.Router();

// Create sale order
router.post('/', authMiddleware, createSaleOrder);
// Get all sale orders for logged-in user
router.get('/', authMiddleware, getSaleOrdersByUser);
// Update status
router.put('/:orderId/status', authMiddleware, updateSaleOrderStatus);
// Convert to invoice
router.post('/:orderId/convert', authMiddleware, convertSaleOrderToInvoice);
// Delete sale order
router.delete('/:orderId', authMiddleware, deleteSaleOrder);
// Update sale order
router.put('/update/:orderId', authMiddleware, updateSaleOrder);

export default router; 