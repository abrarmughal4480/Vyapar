import Purchase from '../models/purchase.js';
import Item from '../models/items.js';
import Payment from '../models/payment.js';
import Party from '../models/parties.js';
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

    // Handle party creation if partyId is not provided
    let partyId = req.body.partyId;
    if (!partyId && supplierName) {
      try {
        // Check if party already exists
        let existingParty = await Party.findOne({ 
          name: supplierName, 
          user: userId 
        });
        
        if (existingParty) {
          partyId = existingParty._id;
        } else {
          // Create new party
          const newParty = new Party({
            name: supplierName.trim(),
            phone: req.body.phoneNo || '',
            partyType: 'supplier',
            openingBalance: 0,
            user: userId
          });
          
          const savedParty = await newParty.save();
          partyId = savedParty._id;
        }
      } catch (error) {
        console.error('Error handling party creation:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create or find supplier' 
        });
      }
    }
    
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
        
        // Add stock as a new batch with purchase price
        const updatedItem = await dbItem.addStock(stockQuantity, Number(purchaseItem.price));

      }
    }
    
    // Calculate original subtotal (before discounts) and final subtotal
    const originalSubTotal = items.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return sum + (qty * price);
    }, 0);
    
    // Calculate item-level discounts
    const totalItemDiscount = items.reduce((total, item) => {
      let itemDiscount = 0;
      if (item.discountPercentage) {
        const qty = Number(item.qty) || 0;
        const price = Number(item.price) || 0;
        itemDiscount = (qty * price * Number(item.discountPercentage)) / 100;
      } else if (item.discountAmount) {
        itemDiscount = Number(item.discountAmount) || 0;
      }
      return total + itemDiscount;
    }, 0);
    
    // Calculate discountValue
    let discountValue = 0;
    if (req.body.discount && !isNaN(Number(req.body.discount))) {
      if (req.body.discountType === '%') {
        discountValue = originalSubTotal * Number(req.body.discount) / 100;
      } else {
        discountValue = Number(req.body.discount);
      }
    }
    
    // Total discount is item discounts + global discount
    const totalDiscount = totalItemDiscount + discountValue;
    
    // Calculate taxValue
    let taxType = req.body.taxType || '%';
    let tax = req.body.tax || 0;
    let taxValue = 0;
    if (taxType === '%') {
      taxValue = (originalSubTotal - totalDiscount) * Number(tax) / 100;
    } else if (taxType === 'PKR') {
      taxValue = Number(tax);
    }
    
    // Calculate grandTotal
    const grandTotal = Math.max(0, originalSubTotal - totalDiscount + taxValue);
    
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
      partyId, // Include the party ID
      paymentType: 'Credit', // Force all purchases to be Credit
      paymentMethod: req.body.paymentMethod || 'Cash', // Use payment method from request or default to Cash
      discountValue: totalDiscount, // Use total discount (item + global)
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
    
    // Handle bank account transaction if payment method is bank transfer and there's a paid amount
    if (req.body.paymentMethod && (req.body.paymentMethod.startsWith('bank_') || req.body.paymentMethod === 'Bank Transfer') && paid > 0) {
      try {
        const BankAccount = (await import('../models/bankAccount.js')).default;
        const BankTransaction = (await import('../models/bankTransaction.js')).default;
        
        const bankAccountId = req.body.paymentMethod.startsWith('bank_') 
          ? req.body.paymentMethod.replace('bank_', '') 
          : req.body.bankAccountId;
        const bankAccount = await BankAccount.findOne({ 
          _id: bankAccountId, 
          userId: userId, 
          isActive: true 
        });
        
        if (bankAccount) {
          const newBalance = bankAccount.currentBalance - paid;
          await BankAccount.findByIdAndUpdate(bankAccountId, { 
            currentBalance: newBalance,
            updatedAt: new Date()
          });
          
          const bankTransaction = new BankTransaction({
            userId: userId,
            type: 'Purchase',
            fromAccount: bankAccount.accountDisplayName,
            toAccount: supplierName,
            amount: paid,
            description: `Purchase payment made for bill ${billNo}`,
            transactionDate: new Date(),
            balanceAfter: newBalance,
            status: 'completed'
          });
          await bankTransaction.save();
        }
      } catch (bankError) {
        console.error('Bank transaction error:', bankError);
      }
    }
    
    // Note: Purchase order status update is now handled in the frontend
    // to match the pattern used in sales conversion
    
    // Update supplier openingBalance in DB (only for credit payments)
    try {
      const supplierDoc = await Party.findById(partyId);
      if (supplierDoc) {
        // Store supplier's current balance before transaction
        const supplierCurrentBalance = supplierDoc.openingBalance || 0;
        
        // All purchases are now Credit, so always update balance
        // For Credit payment: decrease by unpaid amount (grandTotal - paid)
        const unpaidAmount = purchase.grandTotal - (purchase.paid || 0);
        supplierDoc.openingBalance = supplierCurrentBalance - unpaidAmount;
        
        // Calculate and update partyBalanceAfterTransaction
        const partyBalanceAfterTransaction = supplierDoc.openingBalance;
        purchase.partyBalanceAfterTransaction = partyBalanceAfterTransaction;
        await purchase.save();
        
        await supplierDoc.save();
      }
    } catch (err) {
      console.error('Failed to update supplier openingBalance:', err);
    }
    
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
    
    // Calculate actual purchase amounts after item-level discounts
    const purchasesWithActualAmounts = purchases.map(purchase => {
      const purchaseObj = purchase.toObject();
      if (Array.isArray(purchaseObj.items)) {
        let actualPurchaseAmount = 0;
        purchaseObj.items = purchaseObj.items.map(item => {
          const originalAmount = (item.qty || 0) * (item.price || 0);
          let itemDiscount = 0;
          
          if (item.discountPercentage) {
            itemDiscount = (originalAmount * parseFloat(item.discountPercentage)) / 100;
          } else if (item.discountAmount) {
            itemDiscount = parseFloat(item.discountAmount) || 0;
          }
          
          const actualAmount = originalAmount - itemDiscount;
          actualPurchaseAmount += actualAmount;
          
          return {
            ...item,
            originalAmount,
            itemDiscount,
            actualAmount
          };
        });
        
        // Add the calculated actual purchase amount
        purchaseObj.actualPurchaseAmount = actualPurchaseAmount;
      }
      return purchaseObj;
    });
    
    res.json({ success: true, purchases: purchasesWithActualAmounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Make payment for a purchase
export const makePayment = async (req, res) => {
  try {
    const { purchaseId, amount, discount, discountType, paymentType = 'Cash', description = '', imageUrl = '' } = req.body;
    if (!purchaseId || (typeof amount !== 'number' && amount !== 0)) {
      return res.status(400).json({ success: false, message: 'Missing purchaseId or invalid amount' });
    }
    
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }
    
    // Calculate discount and update purchase totals
    let discountValue = 0;
    let newGrandTotal = purchase.grandTotal;
    let newBalance = purchase.balance;

    if (discount && discount > 0 && discountType) {
      if (discountType === '%') {
        // Percentage discount
        discountValue = (purchase.grandTotal * discount) / 100;
      } else if (discountType === 'PKR') {
        // Fixed PKR discount
        discountValue = discount;
      }
      
      // Update purchase totals after discount
      newGrandTotal = Math.max(0, purchase.grandTotal - discountValue);
      newBalance = Math.max(0, purchase.balance - discountValue);
      
      // Update purchase with new totals
      purchase.grandTotal = newGrandTotal;
      purchase.balance = newBalance;
      purchase.discount = discount;
      purchase.discountType = discountType;
      purchase.discountValue = discountValue;
    }

    // Validate payment amount after discount
    if (amount > 0 && amount > newBalance) {
      return res.status(400).json({ 
        success: false, 
        message: `Payment amount (${amount}) cannot exceed remaining balance (${newBalance})` 
      });
    }
    
    // If amount is 0, ensure there's a discount applied
    if (amount === 0 && (!discount || discount <= 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment amount cannot be 0 unless a discount is applied' 
      });
    }
    
    const currentBalance = newBalance;
    const currentPaid = purchase.paid || 0;
    
    // Process payment (amount can be 0 if discount covers everything)
    if (amount > 0) {
      purchase.paid = currentPaid + amount;
      purchase.balance = Math.max(0, currentBalance - amount);
    } else {
      // If amount is 0, the discount has already been applied above
      purchase.balance = currentBalance;
    }
    
    await purchase.save();
    
    // Handle bank account transaction if payment method is bank transfer and there's a payment
    if ((paymentType === 'Bank Transfer' || paymentType.startsWith('bank_')) && amount > 0) {
      try {
        const BankAccount = (await import('../models/bankAccount.js')).default;
        const BankTransaction = (await import('../models/bankTransaction.js')).default;
        
        const bankAccountId = paymentType.startsWith('bank_') 
          ? paymentType.replace('bank_', '') 
          : purchase.bankAccountId;
        const bankAccount = await BankAccount.findOne({ 
          _id: bankAccountId, 
          userId: purchase.userId, 
          isActive: true 
        });
        
        if (bankAccount) {
          const newBalance = bankAccount.currentBalance - amount;
          await BankAccount.findByIdAndUpdate(bankAccountId, { 
            currentBalance: newBalance,
            updatedAt: new Date()
          });
          
          const bankTransaction = new BankTransaction({
            userId: purchase.userId,
            type: 'Payment Out',
            fromAccount: bankAccount.accountDisplayName,
            toAccount: purchase.supplierName,
            amount: amount,
            description: `Payment made for purchase bill ${purchase.billNo}`,
            transactionDate: new Date(),
            balanceAfter: newBalance,
            status: 'completed'
          });
          await bankTransaction.save();
        }
      } catch (bankError) {
        console.error('Bank transaction error:', bankError);
      }
    }
    
    // Create payment record only if there's an actual payment
    let payment = null;
    if (amount > 0) {
      // Calculate discount amount if provided
      let discountAmount = 0;
      if (discount && discount > 0 && discountType) {
        if (discountType === '%') {
          discountAmount = (amount * discount) / 100;
        } else if (discountType === 'PKR') {
          discountAmount = Math.min(discount, amount);
        }
      }

      // Calculate final amount after discount
      const finalAmount = Math.max(0, amount - discountAmount);

      payment = new Payment({
        userId,
        purchaseId,
        billNo: purchase.billNo,
        supplierName: purchase.supplierName,
        partyName: purchase.supplierName, // Unified field
        phoneNo: purchase.phoneNo,
        amount: finalAmount,
        paymentType,
        paymentDate: new Date(),
        description,
        imageUrl,
        category: 'Purchase Payment',
        status: purchase.balance === 0 ? 'Paid' : 'Partial',
        discount: discount || 0,
        discountType: discountType || 'PKR',
        discountAmount,
        finalAmount
      });
      
      await payment.save();
    }
    
    // Update supplier balance when payment is made
    if (amount > 0) {
      try {
        const Party = (await import('../models/parties.js')).default;
        const supplierDoc = await Party.findOne({ name: purchase.supplierName, user: userId });
        if (supplierDoc) {
          // Increase supplier balance by the payment amount (you're paying them, reducing debt)
          supplierDoc.openingBalance = (supplierDoc.openingBalance || 0) + amount;
          await supplierDoc.save();
        }
      } catch (err) {
        console.error('Failed to update supplier balance after payment:', err);
      }
    }
    
    
    res.json({ 
      success: true, 
      purchase, 
      payment,
      discountApplied: discountValue > 0,
      discountValue,
      newGrandTotal,
      newBalance: purchase.balance,
      paymentProcessed: amount > 0
    });
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
    
    // Find the purchase before deleting to get all the data we need
    const purchase = await Purchase.findOne({ _id: purchaseId, userId });
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found or not authorized' });
    }
    
    // Step 1: Revert stock for all items
    if (purchase.items && Array.isArray(purchase.items)) {
      for (const purchaseItem of purchase.items) {
        const dbItem = await Item.findOne({ userId: userId.toString(), name: purchaseItem.item });
        if (dbItem) {
          let stockQuantity = Number(purchaseItem.qty);
          
          // Handle unit conversion for stock reversal
          if (dbItem.unit) {
            const itemUnit = dbItem.unit;
            const purchaseUnit = purchaseItem.unit;
            
            if (typeof itemUnit === 'object' && itemUnit.base && itemUnit.secondary) {
              if (purchaseUnit === itemUnit.secondary && itemUnit.conversionFactor) {
                stockQuantity = Number(purchaseItem.qty) * itemUnit.conversionFactor;
              } else if (purchaseUnit === itemUnit.base) {
                stockQuantity = Number(purchaseItem.qty);
              }
            } else if (typeof itemUnit === 'string' && itemUnit.includes(' / ')) {
              const parts = itemUnit.split(' / ');
              const baseUnit = parts[0];
              const secondaryUnit = parts[1];
              
              if (purchaseUnit === secondaryUnit) {
                stockQuantity = Number(purchaseItem.qty) * 12; // Default conversion factor
              } else if (purchaseUnit === baseUnit) {
                stockQuantity = Number(purchaseItem.qty);
              }
            }
          }
          
          // Use reduceStock method to properly handle batch removal
          try {
            await dbItem.reduceStock(stockQuantity);
          } catch (error) {
            // If reduceStock fails due to insufficient stock, do simple reduction
            console.warn(`Reduce stock failed for ${purchaseItem.item} during delete, doing simple reduction:`, error.message);
            dbItem.stock = Math.max(0, (dbItem.stock || 0) - stockQuantity);
            await dbItem.save();
          }
        }
      }
    }
    
    // Step 2: Restore supplier balance
    try {
      const Party = (await import('../models/parties.js')).default;
      const supplierDoc = await Party.findOne({ name: purchase.supplierName, user: userId });
      if (supplierDoc) {
        // Calculate the unpaid amount that was affecting the supplier balance
        const unpaidAmount = purchase.grandTotal - (purchase.paid || 0);
        
        // All purchases are now Credit, so always restore the balance
        supplierDoc.openingBalance = (supplierDoc.openingBalance || 0) + unpaidAmount;
        await supplierDoc.save();
      }
    } catch (err) {
      console.error('Failed to restore supplier balance:', err);
    }
    
    // Step 3: Handle bank transaction reversal if payment was made through bank
    if (purchase.paymentMethod && (purchase.paymentMethod.startsWith('bank_') || purchase.paymentMethod === 'Bank Transfer') && purchase.paid > 0) {
      try {
        const BankAccount = (await import('../models/bankAccount.js')).default;
        const BankTransaction = (await import('../models/bankTransaction.js')).default;
        
        const bankAccountId = purchase.paymentMethod.startsWith('bank_') 
          ? purchase.paymentMethod.replace('bank_', '') 
          : purchase.bankAccountId;
        const bankAccount = await BankAccount.findOne({ 
          _id: bankAccountId, 
          userId: userId, 
          isActive: true 
        });
        
        if (bankAccount) {
          // Restore the bank balance
          const newBalance = bankAccount.currentBalance + purchase.paid;
          await BankAccount.findByIdAndUpdate(bankAccountId, { 
            currentBalance: newBalance,
            updatedAt: new Date()
          });
          
          // Delete related bank transactions
          await BankTransaction.deleteMany({
            userId: userId,
            description: { $regex: `purchase bill ${purchase.billNo}`, $options: 'i' }
          });
        }
      } catch (bankError) {
        console.error('Bank transaction reversal error:', bankError);
      }
    }
    
    // Step 4: Delete the purchase
    await Purchase.findByIdAndDelete(purchaseId);
    
    res.json({ success: true, message: 'Purchase deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a purchase (full edit)
export const updatePurchase = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const { purchaseId } = req.params;
    const updateData = req.body;
    
    // Find the existing purchase
    const existingPurchase = await Purchase.findById(purchaseId);
    if (!existingPurchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }
    
    // Check if user owns this purchase
    if (existingPurchase.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this purchase' });
    }
    
    // Store old items for stock reversal
    const oldItems = existingPurchase.items || [];
    const newItems = updateData.items || [];
    
    // Step 1: Revert old stock (remove items that were added)
    for (const oldItem of oldItems) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: oldItem.item });
      if (dbItem) {
        let stockQuantity = Number(oldItem.qty);
        
        // Handle unit conversion for stock reversal
        if (dbItem.unit) {
          const itemUnit = dbItem.unit;
          const oldItemUnit = oldItem.unit;
          
          if (typeof itemUnit === 'object' && itemUnit.base && itemUnit.secondary) {
            if (oldItemUnit === itemUnit.secondary && itemUnit.conversionFactor) {
              stockQuantity = Number(oldItem.qty) * itemUnit.conversionFactor;
            } else if (oldItemUnit === itemUnit.base) {
              stockQuantity = Number(oldItem.qty);
            }
          } else if (typeof itemUnit === 'string' && itemUnit.includes(' / ')) {
            const parts = itemUnit.split(' / ');
            const baseUnit = parts[0];
            const secondaryUnit = parts[1];
            
            if (oldItemUnit === secondaryUnit) {
              stockQuantity = Number(oldItem.qty) * 12;
            } else if (oldItemUnit === baseUnit) {
              stockQuantity = Number(oldItem.qty);
            }
          }
        }
        
        // Use reduceStock method to properly handle batch removal
        try {
          await dbItem.reduceStock(stockQuantity);
        } catch (error) {
          // If reduceStock fails due to insufficient stock, do simple reduction
          console.warn(`Reduce stock failed for ${oldItem.item}, doing simple reduction:`, error.message);
          dbItem.stock = Math.max(0, (dbItem.stock || 0) - stockQuantity);
          await dbItem.save();
        }
      }
    }
    
    // Step 2: Add new stock for updated items
    for (const newItem of newItems) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: newItem.item });
      if (dbItem) {
        let stockQuantity = Number(newItem.qty);
        
        // Handle unit conversion for new stock
        if (dbItem.unit) {
          const itemUnit = dbItem.unit;
          const newItemUnit = newItem.unit;
          
          if (typeof itemUnit === 'object' && itemUnit.base && itemUnit.secondary) {
            if (newItemUnit === itemUnit.secondary && itemUnit.conversionFactor) {
              stockQuantity = Number(newItem.qty) * itemUnit.conversionFactor;
            } else if (newItemUnit === itemUnit.base) {
              stockQuantity = Number(newItem.qty);
            }
          } else if (typeof itemUnit === 'string' && itemUnit.includes(' / ')) {
            const parts = itemUnit.split(' / ');
            const baseUnit = parts[0];
            const secondaryUnit = parts[1];
            
            if (newItemUnit === secondaryUnit) {
              stockQuantity = Number(newItem.qty) * 12;
            } else if (newItemUnit === baseUnit) {
              stockQuantity = Number(newItem.qty);
            }
          }
        }
        
        // Use addStock method to properly handle batch creation
        await dbItem.addStock(stockQuantity, Number(newItem.price));
      }
    }
    
    // Step 3: Recalculate totals based on new data
    const originalSubTotal = newItems.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return sum + (qty * price);
    }, 0);
    
    // Calculate item-level discounts
    const totalItemDiscount = newItems.reduce((total, item) => {
      let itemDiscount = 0;
      if (item.discountPercentage) {
        const qty = Number(item.qty) || 0;
        const price = Number(item.price) || 0;
        itemDiscount = (qty * price * Number(item.discountPercentage)) / 100;
      } else if (item.discountAmount) {
        itemDiscount = Number(item.discountAmount) || 0;
      }
      return total + itemDiscount;
    }, 0);
    
    // Calculate global discount
    let discountValue = 0;
    if (updateData.discount && !isNaN(Number(updateData.discount))) {
      if (updateData.discountType === '%') {
        discountValue = originalSubTotal * Number(updateData.discount) / 100;
      } else {
        discountValue = Number(updateData.discount);
      }
    }
    
    // Total discount is item discounts + global discount
    const totalDiscount = totalItemDiscount + discountValue;
    
    // Calculate tax
    let taxType = updateData.taxType || '%';
    let tax = updateData.tax || 0;
    let taxValue = 0;
    if (taxType === '%') {
      taxValue = (originalSubTotal - totalDiscount) * Number(tax) / 100;
    } else if (taxType === 'PKR') {
      taxValue = Number(tax);
    }
    
    // Calculate new grand total
    const newGrandTotal = Math.max(0, originalSubTotal - totalDiscount + taxValue);
    
    // Calculate new balance (considering new paid amount from updateData)
    const newPaid = Number(updateData.paid || updateData.paidAmount || existingPurchase.paid) || 0;
    const newBalance = Math.max(0, newGrandTotal - newPaid);
    
    
    // Step 4: Update supplier balance if supplier name changed
    if (updateData.supplierName && updateData.supplierName !== existingPurchase.supplierName) {
      try {
        const Party = (await import('../models/parties.js')).default;
        
        // Revert old supplier balance
        const oldSupplierDoc = await Party.findOne({ name: existingPurchase.supplierName, user: userId });
        if (oldSupplierDoc) {
          const oldUnpaidAmount = existingPurchase.grandTotal - (existingPurchase.paid || 0);
          oldSupplierDoc.openingBalance = (oldSupplierDoc.openingBalance || 0) + oldUnpaidAmount;
          await oldSupplierDoc.save();
        }
        
        // Update new supplier balance
        const newSupplierDoc = await Party.findOne({ name: updateData.supplierName, user: userId });
        if (newSupplierDoc) {
          const newUnpaidAmount = newGrandTotal - newPaid;
          newSupplierDoc.openingBalance = (newSupplierDoc.openingBalance || 0) - newUnpaidAmount;
          await newSupplierDoc.save();
        }
      } catch (err) {
        console.error('Failed to update supplier balances:', err);
      }
    } else if (existingPurchase.supplierName === updateData.supplierName) {
      // Same supplier, update balance for amount changes
      try {
        const Party = (await import('../models/parties.js')).default;
        const supplierDoc = await Party.findOne({ name: existingPurchase.supplierName, user: userId });
        if (supplierDoc) {
          const oldUnpaidAmount = existingPurchase.grandTotal - (existingPurchase.paid || 0);
          const newUnpaidAmount = newGrandTotal - newPaid;
          const balanceAdjustment = oldUnpaidAmount - newUnpaidAmount;
          
          supplierDoc.openingBalance = (supplierDoc.openingBalance || 0) + balanceAdjustment;
          await supplierDoc.save();
        }
      } catch (err) {
        console.error('Failed to update supplier balance:', err);
      }
    }
    
    // Step 5: Update the purchase record
    const updatedPurchase = await Purchase.findByIdAndUpdate(
      purchaseId,
      {
        ...updateData,
        paymentType: 'Credit', // Force all purchases to be Credit
        paymentMethod: updateData.paymentMethod || 'Cash', // Use payment method from update or default to Cash
        discountValue: totalDiscount,
        taxType,
        tax,
        taxValue,
        grandTotal: newGrandTotal,
        balance: newBalance,
        paid: newPaid,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    // Handle bank account transaction if payment method is bank transfer and there's a paid amount
    if (updateData.paymentMethod && (updateData.paymentMethod.startsWith('bank_') || updateData.paymentMethod === 'Bank Transfer') && newPaid > 0) {
      try {
        const BankAccount = (await import('../models/bankAccount.js')).default;
        const BankTransaction = (await import('../models/bankTransaction.js')).default;
        
        const bankAccountId = updateData.paymentMethod.startsWith('bank_') 
          ? updateData.paymentMethod.replace('bank_', '') 
          : updateData.bankAccountId;
        const bankAccount = await BankAccount.findOne({ 
          _id: bankAccountId, 
          userId: userId, 
          isActive: true 
        });
        
        if (bankAccount) {
          // First, restore the old bank balance if there was a previous payment
          const oldPaid = existingPurchase.paid || 0;
          if (oldPaid > 0) {
            const oldBankAccountId = existingPurchase.paymentMethod?.startsWith('bank_') 
              ? existingPurchase.paymentMethod.replace('bank_', '') 
              : existingPurchase.bankAccountId;
            
            if (oldBankAccountId) {
              const oldBankAccount = await BankAccount.findOne({ 
                _id: oldBankAccountId, 
                userId: userId, 
                isActive: true 
              });
              
              if (oldBankAccount) {
                // Restore old balance
                const restoredBalance = oldBankAccount.currentBalance + oldPaid;
                await BankAccount.findByIdAndUpdate(oldBankAccountId, { 
                  currentBalance: restoredBalance,
                  updatedAt: new Date()
                });
                
                // Delete old transaction
                await BankTransaction.deleteMany({
                  userId: userId,
                  description: { $regex: `purchase bill ${existingPurchase.billNo}`, $options: 'i' }
                });
              }
            }
          }
          
          // Now process the new payment
          const newBalance = bankAccount.currentBalance - newPaid;
          await BankAccount.findByIdAndUpdate(bankAccountId, { 
            currentBalance: newBalance,
            updatedAt: new Date()
          });
          
          // Create new transaction only if there's a payment
          if (newPaid > 0) {
            const bankTransaction = new BankTransaction({
              userId: userId,
              type: 'Payment Out',
              fromAccount: bankAccount.accountDisplayName,
              toAccount: updatedPurchase.supplierName,
              amount: newPaid,
              description: `Payment made for purchase bill ${updatedPurchase.billNo}`,
              transactionDate: new Date(),
              balanceAfter: newBalance,
              status: 'completed'
            });
            await bankTransaction.save();
          }
        }
      } catch (bankError) {
        console.error('Bank transaction error:', bankError);
      }
    } else if (existingPurchase.paid > 0 && existingPurchase.paymentMethod && (existingPurchase.paymentMethod.startsWith('bank_') || existingPurchase.paymentMethod === 'Bank Transfer')) {
      // If switching away from bank payment, restore the bank balance
      try {
        const BankAccount = (await import('../models/bankAccount.js')).default;
        const BankTransaction = (await import('../models/bankTransaction.js')).default;
        
        const oldBankAccountId = existingPurchase.paymentMethod.startsWith('bank_') 
          ? existingPurchase.paymentMethod.replace('bank_', '') 
          : existingPurchase.bankAccountId;
        
        if (oldBankAccountId) {
          const oldBankAccount = await BankAccount.findOne({ 
            _id: oldBankAccountId, 
            userId: userId, 
            isActive: true 
          });
          
          if (oldBankAccount) {
            // Restore old balance
            const restoredBalance = oldBankAccount.currentBalance + existingPurchase.paid;
            await BankAccount.findByIdAndUpdate(oldBankAccountId, { 
              currentBalance: restoredBalance,
              updatedAt: new Date()
            });
            
            // Delete old transaction
            await BankTransaction.deleteMany({
              userId: userId,
              description: { $regex: `purchase bill ${existingPurchase.billNo}`, $options: 'i' }
            });
          }
        }
      } catch (bankError) {
        console.error('Bank transaction reversal error:', bankError);
      }
    }
    
    if (!updatedPurchase) {
      return res.status(500).json({ success: false, message: 'Failed to update purchase' });
    }
    
    res.json({ 
      success: true, 
      data: updatedPurchase,
      message: 'Purchase updated successfully'
    });
    
  } catch (err) {
    console.error('Purchase update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all payments for a user
export const getPaymentsByUser = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    
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