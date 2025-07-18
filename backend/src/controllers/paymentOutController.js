import PaymentOut from '../models/payment-out.js';
import Purchase from '../models/purchase.js';
import mongoose from 'mongoose';

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

    // Update supplier openingBalance (add payment amount)
    try {
      const Party = (await import('../models/parties.js')).default;
      const supplierDoc = await Party.findOne({ name: purchase.supplierName, user: userId });
      if (supplierDoc) {
        supplierDoc.openingBalance = (supplierDoc.openingBalance || 0) + amount;
        await supplierDoc.save();
      }
    } catch (err) {
      console.error('Failed to update supplier openingBalance on payment out:', err);
    }

    // Create payment out record
    const paymentOut = new PaymentOut({
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
      category: 'Purchase Payment Out',
      status: purchase.balance === 0 ? 'Paid' : 'Partial'
    });
    
    await paymentOut.save();
    
    console.log(`Payment out processed for purchase ${purchaseId}: Amount=${amount}, New Paid=${purchase.paid}, New Balance=${purchase.balance}`);
    console.log('Payment out record saved:', paymentOut.toObject());
    
    res.status(201).json({ success: true, paymentOut, purchase });
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
      objectUserId = mongoose.Types.ObjectId(userId);
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
      objectUserId = mongoose.Types.ObjectId(userId);
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