import CreditNote from '../models/creditNote.js';
import Item from '../models/items.js';
import mongoose from 'mongoose';
import { clearAllCacheForUser } from './dashboardController.js';

export const createCreditNote = async (req, res) => {
  try {
    const { partyName, items } = req.body;
    if (!partyName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    // Increment stock for each item (reverse of sale)
    for (const noteItem of items) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: noteItem.item });
      if (dbItem) {
        dbItem.stock = (dbItem.stock || 0) + Number(noteItem.qty);
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
    // Get paid amount from request body
    const paidAmount = req.body.paid || 0;
    // Calculate balance (grandTotal - paidAmount)
    const balance = Math.max(0, grandTotal - paidAmount);
    
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
    console.log(`Credit note created: No=${creditNote.creditNoteNo}, Party=${creditNote.partyName}, User=${userId}, Amount=${creditNote.grandTotal}`);
    // Update party openingBalance in DB (subtract balance amount - grandTotal - paid)
    try {
      const Party = (await import('../models/parties.js')).default;
      console.log(`Looking for party: ${creditNote.partyName}, userId: ${userId}`);
      
      const partyDoc = await Party.findOne({ name: creditNote.partyName, user: userId });
      console.log(`Party found:`, partyDoc ? 'Yes' : 'No');
      
      if (partyDoc) {
        // Subtract only the remaining balance (grandTotal - paid) from party balance
        const balanceAmount = creditNote.balance || 0;
        const previousBalance = partyDoc.openingBalance || 0;
        partyDoc.openingBalance = previousBalance - balanceAmount;
        await partyDoc.save();
        console.log(`Updated party balance: ${creditNote.partyName}, Previous: ${previousBalance}, New: ${partyDoc.openingBalance}, Deducted: ${balanceAmount}`);
        // Clear all cache for this user after party balance update
        clearAllCacheForUser(userId);
        console.log(`Cleared cache for user: ${userId}`);
      } else {
        console.log(`Party not found: ${creditNote.partyName} for user: ${userId}`);
        // Try to find all parties for this user to debug
        const allParties = await Party.find({ user: userId });
        console.log(`All parties for user ${userId}:`, allParties.map(p => p.name));
      }
    } catch (err) {
      console.error('Failed to update party openingBalance:', err);
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