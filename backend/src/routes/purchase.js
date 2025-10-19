import express from 'express';
import { createPurchase, getPurchasesByUser, makePayment, getPurchaseStatsByUser, deletePurchase, updatePurchase, getPaymentsByUser, editPaymentOut, deletePaymentOut } from '../controllers/purchaseController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import Purchase from '../models/purchase.js';

const router = express.Router();

router.post('/', authMiddleware, createPurchase);
router.get('/payments', authMiddleware, getPaymentsByUser);
router.get('/next-bill-no', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    let nextBillNo = 'PO001';
    const lastPurchase = await Purchase.findOne({ userId }).sort({ createdAt: -1 });
    if (lastPurchase && lastPurchase.billNo) {
      const match = lastPurchase.billNo.match(/PO(\d+)/);
      if (match) {
        const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
        nextBillNo = `PO${nextNum}`;
      }
    }
    res.json({ nextBillNo });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch next bill number' });
  }
});

router.get('/by-id/:purchaseId', authMiddleware, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.purchaseId);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, purchase });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/payment-out', authMiddleware, makePayment);

router.get('/stats/:userId', authMiddleware, getPurchaseStatsByUser);
router.get('/:userId', authMiddleware, getPurchasesByUser);

router.delete('/:purchaseId', authMiddleware, deletePurchase);

router.put('/update/:purchaseId', authMiddleware, updatePurchase);

// Edit payment out record
router.put('/edit-payment/:paymentId', authMiddleware, editPaymentOut);

// Delete payment out record
router.delete('/delete-payment/:paymentId', authMiddleware, deletePaymentOut);

export default router; 