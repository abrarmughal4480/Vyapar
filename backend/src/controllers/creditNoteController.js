import CreditNote from '../models/creditNote.js';
import Item from '../models/items.js';
import mongoose from 'mongoose';

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
      balance: grandTotal,
      received: 0
    });
    await creditNote.save();
    console.log(`Credit note created: No=${creditNote.creditNoteNo}, Party=${creditNote.partyName}, User=${userId}, Amount=${creditNote.grandTotal}`);
    // Update party openingBalance in DB (subtract grandTotal)
    try {
      const Party = (await import('../models/parties.js')).default;
      const partyDoc = await Party.findOne({ name: creditNote.partyName, user: userId });
      if (partyDoc) {
        partyDoc.openingBalance = (partyDoc.openingBalance || 0) - (creditNote.grandTotal || 0);
        await partyDoc.save();
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