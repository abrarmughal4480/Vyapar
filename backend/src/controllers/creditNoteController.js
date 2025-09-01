import CreditNote from '../models/creditNote.js';
import Item from '../models/items.js';
import User from '../models/user.js';
import Party from '../models/parties.js';
import mongoose from 'mongoose';
import { clearAllCacheForUser } from './dashboardController.js';

export const createCreditNote = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const { partyName, items } = req.body;
    if (!partyName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Increment stock for each item (reverse of sale) with batch tracking
    for (const noteItem of items) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: noteItem.item });
      // Restore stock for the item
      if (dbItem) {
        const quantity = noteItem.qty || 0;
        
        // Add stock as a new batch with the original sale price (if available)
        // For credit notes, we typically restore at the original cost
        const restorePrice = noteItem.purchasePrice || dbItem.purchasePrice || 0;
        
        // Use addStock method to create a new batch
        await dbItem.addStock(quantity, restorePrice);
        
        console.log(`Restored ${quantity} units to ${noteItem.item} via credit note at price ${restorePrice}, new stock: ${dbItem.stock}`);
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
    // Get paid amount from request body
    const paidAmount = req.body.paid || 0;
    // Calculate balance (grandTotal - paidAmount)
    // For credit notes, balance represents how much the customer still owes
    const balance = grandTotal - paidAmount;
    
    // Generate credit note number for this user
    let creditNoteNo = 'CN001';
    const lastNote = await CreditNote.findOne({ userId }).sort({ createdAt: -1 });
    if (lastNote && lastNote.creditNoteNo) {
      const match = lastNote.creditNoteNo.match(/CN(\d+)/);
      if (match) {
        const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
        creditNoteNo = `CN${nextNum}`;
      }
    }
    const creditNote = new CreditNote({
      ...req.body,
      userId,
      discountValue,
      taxType,
      tax,
      taxValue,
      grandTotal,
      creditNoteNo,
      balance: balance,
      received: paidAmount,
      paid: paidAmount
    });
    await creditNote.save();
    // Update company balance and party balance in DB
    try {
      // First, update company balance (add the credit note amount to company balance)
      const userDoc = await User.findById(userId);
      
      if (userDoc) {
        // Store company's current balance before transaction
        const companyCurrentBalance = userDoc.openingBalance || 0;
        
        // Add the credit note amount to company balance (since it's money coming back to company)
        const creditNoteAmount = creditNote.grandTotal || 0;
        userDoc.openingBalance = companyCurrentBalance + creditNoteAmount;
        
        // Save company balance update
        await userDoc.save();
      }
      
      // Then, update party balance (subtract the remaining balance from party)
      const partyDoc = await Party.findOne({ name: creditNote.partyName, user: userId });
      
      if (partyDoc) {
        // Store party's current balance before transaction
        const partyCurrentBalance = partyDoc.openingBalance || 0;
        
        // Use the balance we calculated earlier, not the one from the saved document
        const balanceAmount = balance; // Use the local balance variable, not creditNote.balance
        
        // For credit notes, if balance is positive, it means customer owes money
        // If balance is negative, it means customer has overpaid
        if (balanceAmount > 0) {
          // Customer still owes money - subtract from party balance
          partyDoc.openingBalance = partyCurrentBalance - balanceAmount;
        } else if (balanceAmount < 0) {
          // Customer has overpaid - add to party balance (they get money back)
          partyDoc.openingBalance = partyCurrentBalance + Math.abs(balanceAmount);
        }
        // If balance is exactly 0, no change needed
        
        // Calculate and update partyBalanceAfterTransaction
        const partyBalanceAfterTransaction = partyDoc.openingBalance;
        creditNote.partyBalanceAfterTransaction = partyBalanceAfterTransaction;
        await creditNote.save();
        
        await partyDoc.save();
      } else {
        // Party not found - this shouldn't happen in normal operation
        // Try to find all parties for this user to debug
        const allParties = await Party.find({ user: userId });
      }
      
      // Clear all cache for this user after balance updates
      clearAllCacheForUser(userId);
    } catch (err) {
      console.error('Failed to update balances:', err);
    }
    res.status(201).json({ success: true, creditNote });
  } catch (err) {
    console.error('Credit note creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCreditNotesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    const notes = await CreditNote.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, creditNotes: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 