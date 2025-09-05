import PaymentOut from '../models/payment-out.js';
import Purchase from '../models/purchase.js';
import mongoose from 'mongoose';
import { clearAllCacheForUser } from './dashboardController.js';

// Create a new payment out record
export const createPaymentOut = async (req, res) => {
  try {
    const { purchaseId, amount, paymentType = 'Cash', description = '', imageUrl = '' } = req.body;
    
    if (!purchaseId || typeof amount !== 'number') {
      return res.status(400).json({ success: false, message: 'Missing purchaseId or amount' });
    }
    
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    // Validate payment amount
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
    }
    
    // Find the purchase record
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }
    
    // Check if purchase belongs to the user
    if (purchase.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to purchase' });
    }
    
    const currentBalance = purchase.balance || 0;
    const currentPaid = purchase.paid || 0;
    
    // Calculate excess amount (if paid amount is more than remaining balance)
    const excessAmount = Math.max(0, amount - currentBalance);
    
    // Remove validation to allow excess payments
    // if (amount > currentBalance) {
    //   return res.status(400).json({ 
    //     success: false, 
    //     message: `Payment amount (${amount}) cannot exceed remaining balance (${currentBalance})` 
    //   });
    // }
    
    // Update purchase payment and balance
    purchase.paid = currentPaid + amount;
    purchase.balance = Math.max(0, currentBalance - amount); // Ensure balance doesn't go negative
    
    await purchase.save();

    // Create payment out record first
    const paymentOut = new PaymentOut({
      userId,
      purchaseId,
      billNo: purchase.billNo,
      supplierName: purchase.supplierName,
      phoneNo: purchase.phoneNo,
      amount,
      total: purchase.grandTotal || 0,
      balance: Math.max(0, currentBalance - amount), // Updated balance after payment
      paymentType,
      paymentDate: new Date(),
      description,
      imageUrl,
      category: 'Payment Out',
      status: (currentBalance - amount) === 0 ? 'Paid' : 'Partial'
    });

    // Update supplier openingBalance (add payment amount)
    try {
      const Party = (await import('../models/parties.js')).default;
      const supplierDoc = await Party.findOne({ name: purchase.supplierName, user: userId });
      if (supplierDoc) {
        const supplierCurrentBalance = supplierDoc.openingBalance || 0;
        supplierDoc.openingBalance = supplierCurrentBalance + amount;
        
        // If there's excess amount, add it as opening balance (credit for future)
        if (excessAmount > 0) {
          supplierDoc.openingBalance = supplierDoc.openingBalance + excessAmount;
        }
        
        // Calculate and update partyBalanceAfterTransaction for payment out
        const partyBalanceAfterTransaction = supplierDoc.openingBalance;
        paymentOut.partyBalanceAfterTransaction = partyBalanceAfterTransaction;
        
        await supplierDoc.save();
      }
    } catch (err) {
      console.error('Failed to update supplier openingBalance on payment out:', err);
    }
    
    await paymentOut.save();
    
    
    res.status(201).json({ 
      success: true, 
      paymentOut, 
      purchase,
      excessAmount: excessAmount > 0 ? excessAmount : 0,
      openingBalanceSet: excessAmount > 0
    });
    clearAllCacheForUser(userId);
  } catch (err) {
    console.error('Payment out creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all payment out records for a user
export const getPaymentOutsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    const paymentOuts = await PaymentOut.find({ userId })
      .sort({ paymentDate: -1 })
      .populate('purchaseId', 'billNo supplierName grandTotal');
    
    res.json({ success: true, paymentOuts });
  } catch (err) {
    console.error('Get payment outs error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get payment out stats for a user
export const getPaymentOutStatsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    let objectUserId;
    try {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.json({ success: true, stats: { totalAmount: 0, totalPayments: 0 } });
    }
    
    const stats = await PaymentOut.aggregate([
      { $match: { userId: objectUserId } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalPayments: { $sum: 1 }
        }
      }
    ]);
    
    const result = stats[0] || { totalAmount: 0, totalPayments: 0 };
    res.json({ success: true, stats: result });
  } catch (err) {
    console.error('Get payment out stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get payment outs by supplier
export const getPaymentOutsBySupplier = async (req, res) => {
  try {
    const { userId, supplierName } = req.params;
    if (!userId || !supplierName) {
      return res.status(400).json({ success: false, message: 'Missing userId or supplierName' });
    }
    
    const paymentOuts = await PaymentOut.find({ 
      userId, 
      supplierName: { $regex: supplierName, $options: 'i' } 
    })
    .sort({ paymentDate: -1 })
    .populate('purchaseId', 'billNo supplierName grandTotal');
    
    res.json({ success: true, paymentOuts });
  } catch (err) {
    console.error('Get payment outs by supplier error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update payment out record
export const updatePaymentOut = async (req, res) => {
  try {
    const { paymentOutId } = req.params;
    const { amount, paymentType, description, imageUrl } = req.body;
    
    if (!paymentOutId) {
      return res.status(400).json({ success: false, message: 'Missing paymentOutId' });
    }
    
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const paymentOut = await PaymentOut.findById(paymentOutId);
    if (!paymentOut) {
      return res.status(404).json({ success: false, message: 'Payment out not found' });
    }
    
    // Check if payment out belongs to the user
    if (paymentOut.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to payment out' });
    }
    
    // Update fields
    if (amount !== undefined) paymentOut.amount = amount;
    if (paymentType !== undefined) paymentOut.paymentType = paymentType;
    if (description !== undefined) paymentOut.description = description;
    if (imageUrl !== undefined) paymentOut.imageUrl = imageUrl;
    
    paymentOut.updatedAt = new Date();
    await paymentOut.save();
    
    res.json({ success: true, paymentOut });
    clearAllCacheForUser(userId);
  } catch (err) {
    console.error('Update payment out error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete payment out record
export const deletePaymentOut = async (req, res) => {
  try {
    const { paymentOutId } = req.params;
    
    if (!paymentOutId) {
      return res.status(400).json({ success: false, message: 'Missing paymentOutId' });
    }
    
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const paymentOut = await PaymentOut.findById(paymentOutId);
    if (!paymentOut) {
      return res.status(404).json({ success: false, message: 'Payment out not found' });
    }
    
    // Check if payment out belongs to the user
    if (paymentOut.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to payment out' });
    }
    
    // Update the corresponding purchase record
    const purchase = await Purchase.findById(paymentOut.purchaseId);
    if (purchase) {
      purchase.paid = Math.max(0, (purchase.paid || 0) - paymentOut.amount);
      purchase.balance = (purchase.balance || 0) + paymentOut.amount;
      await purchase.save();
    }
    
    await PaymentOut.findByIdAndDelete(paymentOutId);
    
    res.json({ success: true, message: 'Payment out deleted successfully' });
    clearAllCacheForUser(userId);
  } catch (err) {
    console.error('Delete payment out error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get payment out overview (total payments per month) for a user
export const getPaymentOutOverview = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    let objectUserId;
    try {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.json({ success: true, overview: [] });
    }
    
    const overview = await PaymentOut.aggregate([
      { $match: { userId: objectUserId } },
      {
        $group: {
          _id: {
            year: { $year: "$paymentDate" },
            month: { $month: "$paymentDate" }
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 }
    ]);
    
    res.json({ success: true, overview });
  } catch (err) {
    console.error('Get payment out overview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// NEW FUNCTION: Make bulk payment to party (distribute across all due purchases)
export const makeBulkPaymentToParty = async (req, res) => {
  try {
    const { supplierName, amount, discount, discountType, paymentType = 'Cash', description = '', imageUrl = '' } = req.body;
    
    if (!supplierName || (typeof amount !== 'number' && amount !== 0)) {
      return res.status(400).json({ success: false, message: 'Missing supplierName or invalid amount' });
    }
    
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    // Find all purchases for this supplier with outstanding balance
    const purchases = await Purchase.find({ 
      userId, 
      supplierName: { $regex: new RegExp(`^${supplierName}$`, 'i') },
      balance: { $gt: 0 }
    }).sort({ createdAt: 1 }); // Pay older purchases first
    
    // Allow payments even when no outstanding purchases (for setting opening balance)
    if (purchases.length === 0 && amount > 0) {
      // If no outstanding purchases but amount > 0, this is setting opening balance
      try {
        const Party = (await import('../models/parties.js')).default;
        const supplierDoc = await Party.findOne({ name: supplierName, user: userId });
        if (supplierDoc) {
          // Add amount as opening balance (credit for future)
          supplierDoc.openingBalance = (supplierDoc.openingBalance || 0) + amount;
          await supplierDoc.save();
        }
        
        res.json({ 
          success: true, 
          message: `Opening balance set for ${supplierName}`,
          updatedPurchases: 0,
          remainingAmount: 0,
          discountApplied: false,
          discountValue: 0,
          totalDiscountApplied: 0,
          newTotalGrandTotal: 0,
          newTotalDueBalance: 0,
          paymentProcessed: false,
          excessAmount: amount,
          openingBalanceSet: true
        });
        
        clearAllCacheForUser(userId);
        return;
      } catch (err) {
        console.error('Failed to set opening balance:', err);
        return res.status(500).json({ success: false, message: 'Failed to set opening balance' });
      }
    } else if (purchases.length === 0 && amount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No outstanding purchases found' 
      });
    }
    
    // Calculate total due balance
    const totalDueBalance = purchases.reduce((sum, purchase) => sum + (purchase.balance || 0), 0);
    const totalGrandTotal = purchases.reduce((sum, purchase) => sum + (purchase.grandTotal || 0), 0);
    
    // Calculate discount if provided
    let discountValue = 0;
    let newTotalGrandTotal = totalGrandTotal;
    let newTotalDueBalance = totalDueBalance;

    if (discount && discount > 0 && discountType) {
      if (discountType === '%') {
        // Percentage discount on total due balance
        discountValue = (totalDueBalance * discount) / 100;
      } else if (discountType === 'PKR') {
        // Fixed PKR discount
        discountValue = Math.min(discount, totalDueBalance);
      }
      
      newTotalDueBalance = Math.max(0, totalDueBalance - discountValue);
      newTotalGrandTotal = Math.max(0, totalGrandTotal - discountValue);
    }
    
    // Calculate excess amount (if paid amount is more than due balance after discount)
    const excessAmount = Math.max(0, amount - newTotalDueBalance);
    
    // Remove validation to allow excess payments
    // if (amount > 0 && amount > newTotalDueBalance) {
    //   return res.status(400).json({ 
    //     success: false, 
    //     message: `Payment amount (${amount}) cannot exceed total due balance (${newTotalDueBalance})` 
    //   });
    // }
    
    // If amount is 0, ensure there's a discount applied
    if (amount === 0 && (!discount || discount <= 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment amount cannot be 0 without discount' 
      });
    }
    
    let remainingAmount = amount;
    const updatedPurchases = [];
    const paymentOutRecords = [];
    let totalDiscountApplied = 0;

    // Distribute payment across purchases (oldest first)
    for (const purchase of purchases) {
      const currentBalance = purchase.balance || 0;
      const currentGrandTotal = purchase.grandTotal || 0;
      
      // Calculate proportional discount for this purchase
      let purchaseDiscount = 0;
      if (discountValue > 0 && totalDueBalance > 0) {
        const discountRatio = currentBalance / totalDueBalance;
        purchaseDiscount = discountValue * discountRatio;
      }
      
      // Apply discount to this purchase
      if (purchaseDiscount > 0) {
        purchase.grandTotal = Math.max(0, currentGrandTotal - purchaseDiscount);
        purchase.balance = Math.max(0, currentBalance - purchaseDiscount);
        purchase.discount = discount;
        purchase.discountType = discountType;
        purchase.discountValue = purchaseDiscount;
        totalDiscountApplied += purchaseDiscount;
      }

      // Process payment only if there's an amount to pay
      if (remainingAmount > 0) {
        const paymentForThisPurchase = Math.min(remainingAmount, purchase.balance);
        
        if (paymentForThisPurchase > 0) {
          // Update purchase
          purchase.paid = (purchase.paid || 0) + paymentForThisPurchase;
          purchase.balance = Math.max(0, purchase.balance - paymentForThisPurchase);
          await purchase.save();
          
          // Create payment out record for this purchase
          const paymentOut = new PaymentOut({
            userId,
            purchaseId: purchase._id,
            billNo: purchase.billNo,
            supplierName: purchase.supplierName,
            phoneNo: purchase.phoneNo,
            amount: paymentForThisPurchase,
            total: purchase.grandTotal || 0,
            balance: purchase.balance,
            paymentType,
            paymentDate: new Date(),
            description: description || `Bulk payment for ${supplierName}`,
            imageUrl,
            category: 'Payment Out',
            status: purchase.balance === 0 ? 'Paid' : 'Partial'
          });
          
          await paymentOut.save();
          
          updatedPurchases.push({
            purchaseId: purchase._id,
            billNo: purchase.billNo,
            paidAmount: paymentForThisPurchase,
            newPaidTotal: purchase.paid,
            newBalance: purchase.balance,
            status: purchase.balance === 0 ? 'Paid' : 'Partial'
          });
          
          paymentOutRecords.push(paymentOut);
          remainingAmount -= paymentForThisPurchase;
        }
      }
    }
    
    // Update supplier openingBalance
    try {
      const Party = (await import('../models/parties.js')).default;
      const supplierDoc = await Party.findOne({ name: supplierName, user: userId });
      if (supplierDoc) {
        if (amount > 0) {
          // Add payment amount to supplier balance
          supplierDoc.openingBalance = (supplierDoc.openingBalance || 0) + amount;
        }
        
        // If there's excess amount, add it as opening balance (credit for future)
        if (excessAmount > 0) {
          supplierDoc.openingBalance = (supplierDoc.openingBalance || 0) + excessAmount;
        }
        
        await supplierDoc.save();
      }
    } catch (err) {
      console.error('Failed to update supplier balance after payment:', err);
    }
    
    const message = amount > 0 
      ? `Payment processed successfully` 
      : 'Discount applied successfully';
    
    res.json({ 
      success: true, 
      message,
      updatedPurchases: updatedPurchases.length,
      remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
      discountApplied: discountValue > 0,
      discountValue,
      totalDiscountApplied,
      newTotalGrandTotal,
      newTotalDueBalance,
      paymentProcessed: amount > 0,
      excessAmount: excessAmount > 0 ? excessAmount : 0,
      openingBalanceSet: excessAmount > 0
    });
    
    clearAllCacheForUser(userId);
  } catch (err) {
    console.error('Bulk payment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}; 