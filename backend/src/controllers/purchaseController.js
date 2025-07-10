import Purchase from '../models/purchase.js';
import Item from '../models/items.js';
import mongoose from 'mongoose';

export const createPurchase = async (req, res) => {
  try {
    const { supplierName, items } = req.body;
    if (!supplierName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    console.log('Backend received due date:', {
      dueDate: req.body.dueDate,
      type: typeof req.body.dueDate,
      fullBody: req.body
    });
    
    // Increment stock for each item
    for (const purchaseItem of items) {
      // Find the item by userId and name
      const dbItem = await Item.findOne({ userId: userId.toString(), name: purchaseItem.item });
      if (dbItem) {
        dbItem.stock = (dbItem.stock || 0) + Number(purchaseItem.qty);
        await dbItem.save();
      }
    }
    
    // Calculate subTotal
    const subTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    // Calculate discountValue
    let discountValue = 0;
    if (req.body.discount && !isNaN(Number(req.body.discount))) {
      if (req.body.discountType === '%') {
        discountValue = subTotal * Number(req.body.discount) / 100;
      } else {
        discountValue = Number(req.body.discount);
      }
    }
    
    // Calculate taxValue
    let taxType = req.body.taxType || '%';
    let tax = req.body.tax || 0;
    let taxValue = 0;
    if (taxType === '%') {
      taxValue = (subTotal - discountValue) * Number(tax) / 100;
    } else if (taxType === 'PKR') {
      taxValue = Number(tax);
    }
    
    // Calculate grandTotal
    const grandTotal = Math.max(0, subTotal - discountValue + taxValue);
    
    // Generate bill number for this user
    let billNo = 'PUR001';
    const lastPurchase = await Purchase.findOne({ userId }).sort({ createdAt: -1 });
    if (lastPurchase && lastPurchase.billNo) {
      const match = lastPurchase.billNo.match(/PUR(\d+)/);
      if (match) {
        const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
        billNo = `PUR${nextNum}`;
      }
    }
    
    const purchase = new Purchase({
      ...req.body,
      userId,
      discountValue,
      taxType,
      tax,
      taxValue,
      grandTotal,
      billNo,
      balance: grandTotal, // Default balance equals grandTotal (unpaid amount)
      paid: 0,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null
    });
    
    await purchase.save();
    
    console.log('Purchase saved to database:', {
      _id: purchase._id,
      billNo: purchase.billNo,
      supplierName: purchase.supplierName,
      dueDate: purchase.dueDate,
      dueDateType: typeof purchase.dueDate,
      fullPurchase: purchase.toObject()
    });
    
    // Note: Purchase order status update is now handled in the frontend
    // to match the pattern used in sales conversion
    
    // Update supplier openingBalance in DB (decrease balance for purchase)
    try {
      const Party = (await import('../models/parties.js')).default;
      const supplierDoc = await Party.findOne({ name: purchase.supplierName, user: userId });
      if (supplierDoc) {
        supplierDoc.openingBalance = (supplierDoc.openingBalance || 0) - (purchase.grandTotal || 0);
        await supplierDoc.save();
      }
    } catch (err) {
      console.error('Failed to update supplier openingBalance:', err);
    }
    
    console.log(`Successfully created purchase bill for user: ${purchase.userId} with bill number: ${purchase.billNo} and total: ${purchase.grandTotal}`);
    res.status(201).json({ success: true, purchase });
  } catch (err) {
    console.error('Purchase creation error:', err);
    console.error('Request body:', req.body);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPurchasesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    const purchases = await Purchase.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, purchases });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Make payment for a purchase
export const makePayment = async (req, res) => {
  try {
    const { purchaseId, amount } = req.body;
    if (!purchaseId || typeof amount !== 'number') {
      return res.status(400).json({ success: false, message: 'Missing purchaseId or amount' });
    }
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }
    purchase.paid = (purchase.paid || 0) + amount;
    purchase.balance = (purchase.balance || 0) - amount;
    await purchase.save();
    res.json({ success: true, purchase });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get purchase stats (sum of grandTotal, balance, paid) for a user
export const getPurchaseStatsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    let objectUserId;
    try {
      objectUserId = mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.json({ success: true, stats: { totalGrandTotal: 0, totalBalance: 0, totalPaid: 0 } });
    }
    const stats = await Purchase.aggregate([
      { $match: { userId: objectUserId } },
      {
        $group: {
          _id: null,
          totalGrandTotal: { $sum: "$grandTotal" },
          totalBalance: { $sum: "$balance" },
          totalPaid: { $sum: "$paid" }
        }
      }
    ]);
    const result = stats[0] || { totalGrandTotal: 0, totalBalance: 0, totalPaid: 0 };
    res.json({ success: true, stats: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a purchase by ID
export const deletePurchase = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { purchaseId } = req.params;
    const purchase = await Purchase.findOneAndDelete({ _id: purchaseId, userId });
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found or not authorized' });
    }
    res.json({ success: true, message: 'Purchase deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a purchase (full edit)
export const updatePurchase = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { purchaseId } = req.params;
    const updateData = req.body;
    const purchase = await Purchase.findOneAndUpdate(
      { _id: purchaseId, userId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, data: purchase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export default {
  createPurchase,
  getPurchasesByUser,
  makePayment,
  getPurchaseStatsByUser,
  deletePurchase,
  updatePurchase,
}; 