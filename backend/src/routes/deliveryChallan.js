import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createDeliveryChallan,
  getDeliveryChallansByUser,
  updateDeliveryChallanStatus,
  getDeliveryChallanById,
  deleteDeliveryChallan,
  updateDeliveryChallan
} from '../controllers/deliveryChallanController.js';

const router = express.Router();

// Create delivery challan
router.post('/', authMiddleware, createDeliveryChallan);
// Get all delivery challans for logged-in user
router.get('/', authMiddleware, getDeliveryChallansByUser);
// Get delivery challan by ID
router.get('/:challanId', authMiddleware, getDeliveryChallanById);
// Update status
router.put('/:challanId/status', authMiddleware, updateDeliveryChallanStatus);
// Delete delivery challan
router.delete('/:challanId', authMiddleware, deleteDeliveryChallan);
// Update delivery challan by ID
router.put('/update/:challanId', authMiddleware, updateDeliveryChallan);

export default router; 