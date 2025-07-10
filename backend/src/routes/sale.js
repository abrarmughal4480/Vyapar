import express from 'express';
import { createSale, getSalesByUser, receivePayment, getSalesStatsByUser, getSalesOverview, deleteSale, updateSale } from '../controllers/saleController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import Sale from '../models/sale.js';

const router = express.Router();

router.post('/', authMiddleware, createSale);
router.get('/:userId', authMiddleware, getSalesByUser);
router.get('/next-invoice-no', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    let nextInvoiceNo = 'INV001';
    const lastSale = await Sale.findOne({ userId }).sort({ createdAt: -1 });
    if (lastSale && lastSale.invoiceNo) {
      const match = lastSale.invoiceNo.match(/INV(\d+)/);
      if (match) {
        const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
        nextInvoiceNo = `INV${nextNum}`;
      }
    }
    res.json({ nextInvoiceNo });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch next invoice number' });
  }
});

router.get('/by-id/:saleId', authMiddleware, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.saleId);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, sale });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/payment-in', receivePayment);

router.get('/stats/:userId', authMiddleware, getSalesStatsByUser);

router.get('/overview/:userId', authMiddleware, getSalesOverview);

router.delete('/:saleId', authMiddleware, deleteSale);

router.put('/update/:saleId', authMiddleware, updateSale);

export default router; 