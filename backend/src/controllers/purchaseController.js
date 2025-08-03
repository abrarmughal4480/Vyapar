import Purchase from '../models/purchase.js';
import Item from '../models/items.js';
import Payment from '../models/payment.js';
import mongoose from 'mongoose';
import { clearAllCacheForUser } from './dashboardController.js';

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
        // Convert quantity to base unit for stock calculation
        let stockQuantity = Number(purchaseItem.qty);
        
        // Check if unit conversion is needed
        if (dbItem.unit) {
          const itemUnit = dbItem.unit;
          const purchaseUnit = purchaseItem.unit;
          
          // Handle object format unit
          if (typeof itemUnit === 'object' && itemUnit.base && itemUnit.secondary) {
            // If purchase unit is secondary unit, convert to base unit
            if (purchaseUnit === itemUnit.secondary && itemUnit.conversionFactor) {
              stockQuantity = Number(purchaseItem.qty) * itemUnit.conversionFactor;
            }
            // If purchase unit is base unit, use as is
            else if (purchaseUnit === itemUnit.base) {
              stockQuantity = Number(purchaseItem.qty);
            }
            // For custom units or other cases, use as is
            else {
              stockQuantity = Number(purchaseItem.qty);
            }
          }
          // Handle string format unit (like "Piece / Dozen")
          else if (typeof itemUnit === 'string' && itemUnit.includes(' / ')) {
            const parts = itemUnit.split(' / ');
            const baseUnit = parts[0];
            const secondaryUnit = parts[1];
            
            // If purchase unit is secondary unit, convert to base unit (assuming 1:12 ratio)
            if (purchaseUnit === secondaryUnit) {
              stockQuantity = Number(purchaseItem.qty) * 12; // Default conversion factor
            }
            // If purchase unit is base unit, use as is
            else if (purchaseUnit === baseUnit) {
              stockQuantity = Number(purchaseItem.qty);
            }
            // For other cases, use as is
            else {
              stockQuantity = Number(purchaseItem.qty);
            }
          }
          // For simple string units, use as is
          else {
            stockQuantity = Number(purchaseItem.qty);
          }
        }
        
        console.log(`Stock adding for item: ${purchaseItem.item}`);
        console.log(`Purchase quantity: ${purchaseItem.qty} ${purchaseItem.unit}`);
        console.log(`Stock quantity to add: ${stockQuantity}`);
        console.log(`Current stock: ${dbItem.stock}`);
        console.log(`New stock: ${dbItem.stock + stockQuantity}`);
        
        dbItem.stock = (dbItem.stock || 0) + stockQuantity;
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
    
    // Generate bill number for this user (unique per user)
    let billNo = 'PO001';
    const lastPurchase = await Purchase.findOne({ userId }).sort({ createdAt: -1 });
    if (lastPurchase && lastPurchase.billNo) {
      const match = lastPurchase.billNo.match(/PO(\d+)/);
      if (match) {
        const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
        billNo = `PO${nextNum}`;
      }
    }
    
    // Handle paid amount for all payment types
    let paid = 0;
    if (req.body.paid !== undefined && req.body.paid !== null) {
      paid = Number(req.body.paid) || 0;
    }
    const balance = grandTotal - paid;
    const purchase = new Purchase({
      ...req.body,
      userId,
      discountValue,
      taxType,
      tax,
      taxValue,
      grandTotal,
      billNo,
      balance, // Default balance equals grandTotal (unpaid amount) or grandTotal - paid
      paid,
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
    
    // Update supplier openingBalance in DB (decrease only balance for purchase if paid is provided)
    try {
      const Party = (await import('../models/parties.js')).default;
      const supplierDoc = await Party.findOne({ name: purchase.supplierName, user: userId });
      if (supplierDoc) {
        if (req.body.paymentType === 'Cash' && req.body.paid !== undefined && req.body.paid !== null) {
          supplierDoc.openingBalance = (supplierDoc.openingBalance || 0) - balance;
        } else {
          supplierDoc.openingBalance = (supplierDoc.openingBalance || 0) - (purchase.grandTotal || 0);
        }
        await supplierDoc.save();
      }
    } catch (err) {
      console.error('Failed to update supplier openingBalance:', err);
    }
    
    console.log(`Successfully created purchase bill for user: ${purchase.userId} with bill number: ${purchase.billNo} and total: ${purchase.grandTotal}`);
    res.status(201).json({ success: true, purchase });
    clearAllCacheForUser(userId);
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
    const { purchaseId, amount, paymentType = 'Cash', description = '', imageUrl = '' } = req.body;
    if (!purchaseId || typeof amount !== 'number') {
      return res.status(400).json({ success: false, message: 'Missing purchaseId or amount' });
    }
    
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }
    
    // Validate payment amount
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
    }
    
    const currentBalance = purchase.balance || 0;
    const currentPaid = purchase.paid || 0;
    
    // Check if payment amount exceeds remaining balance
    if (amount > currentBalance) {
      return res.status(400).json({ 
        success: false, 
        message: `Payment amount (${amount}) cannot exceed remaining balance (${currentBalance})` 
      });
    }
    
    // Update purchase payment and balance
    purchase.paid = currentPaid + amount;
    purchase.balance = Math.max(0, currentBalance - amount); // Ensure balance doesn't go negative
    
    await purchase.save();
    
    // Create payment record
    const payment = new Payment({
      userId,
      purchaseId,
      billNo: purchase.billNo,
      supplierName: purchase.supplierName,
      phoneNo: purchase.phoneNo,
      amount,
      paymentType,
      paymentDate: new Date(),
      description,
      imageUrl,
      category: 'Purchase Payment',
      status: purchase.balance === 0 ? 'Paid' : 'Partial'
    });
    
    await payment.save();
    
    console.log(`Payment processed for purchase ${purchaseId}: Amount=${amount}, New Paid=${purchase.paid}, New Balance=${purchase.balance}`);
    console.log('Payment record saved:', payment.toObject());
    
    res.json({ success: true, purchase, payment });
    clearAllCacheForUser(userId);
  } catch (err) {
    console.error('Payment error:', err);
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
      objectUserId = new mongoose.Types.ObjectId(userId);
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
    clearAllCacheForUser(userId);
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
    clearAllCacheForUser(userId);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get all payments for a user
export const getPaymentsByUser = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    console.log('Fetching payments for userId:', userId);
    
    // First, let's check if there are any payments at all
    const paymentCount = await Payment.countDocuments({ userId });
    console.log('Total payments found:', paymentCount);
    
    // Let's also check all payments for this user to see what's in the database
    const allPayments = await Payment.find({ userId });
    console.log('All payments for user:', allPayments.map(p => ({ id: p._id, amount: p.amount, billNo: p.billNo, supplierName: p.supplierName })));
    
    // Convert userId to ObjectId safely
    let objectUserId;
    try {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      console.error('Invalid userId format:', userId);
      return res.json({ success: true, payments: [] });
    }
    
    // Use aggregation to join payments with purchase data
    let payments;
    try {
      payments = await Payment.aggregate([
        { $match: { userId: objectUserId } },
        {
          $lookup: {
            from: 'purchases',
            localField: 'purchaseId',
            foreignField: '_id',
            as: 'purchase'
          }
        },
        { $unwind: { path: '$purchase', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            userId: 1,
            purchaseId: 1,
            billNo: 1,
            supplierName: 1,
            phoneNo: 1,
            amount: 1,
            paymentType: 1,
            paymentDate: 1,
            description: 1,
            imageUrl: 1,
            category: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            billTotal: { $ifNull: ['$purchase.grandTotal', 0] },
            remainingBalance: { $ifNull: ['$purchase.balance', 0] }
          }
        },
        { $sort: { paymentDate: -1 } }
      ]);
    } catch (aggregationError) {
      console.error('Aggregation failed, falling back to simple query:', aggregationError);
      // Fallback to simple query without aggregation
      const simplePayments = await Payment.find({ userId }).sort({ paymentDate: -1 });
      payments = simplePayments.map(payment => ({
        ...payment.toObject(),
        billTotal: 0,
        remainingBalance: 0
      }));
    }
    
    console.log('Payments with aggregation:', payments);
    res.json({ success: true, payments });
  } catch (err) {
    console.error('Error fetching payments:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  createPurchase,
  getPurchasesByUser,
  makePayment,
  getPurchaseStatsByUser,
  deletePurchase,
  updatePurchase,
  getPaymentsByUser,
}; 