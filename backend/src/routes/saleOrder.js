import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createSaleOrder,
  getSaleOrdersByUser,
  updateSaleOrderStatus,
  convertSaleOrderToInvoice
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

export default router; 