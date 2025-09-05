import Party from '../models/parties.js';
import Sale from '../models/sale.js';
import mongoose from 'mongoose';

const partiesController = {
  createParty: async (req, res) => {
    try {
      const {
        name,
        phone,
        contactNumber,
        email,
        address,
        gstNumber,
        partyType,
        openingBalance,
        pan,
        city,
        state,
        pincode,
        tags,
        status,
        note
      } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Party name is required' });
      }
      const phoneValue = contactNumber || phone || '';
      const party = new Party({
        name,
        phone: phoneValue,
        contactNumber: phoneValue,
        email,
        address,
        gstNumber,
        partyType,
        openingBalance: openingBalance || 0,
        firstOpeningBalance: openingBalance || 0, // Save the first opening balance
        pan,
        city,
        state,
        pincode,
        tags,
        status,
        note,
        user: req.user.id
      });
      
      await party.save();
      
      console.log(`Party created successfully: ${party.name} (ID: ${party._id}) by user ${req.user.id} with first opening balance: ${openingBalance || 0}`);
      
      return res.status(201).json({ 
        success: true, 
        data: party,
        message: `Party "${party.name}" created successfully with opening balance: ${openingBalance || 0}`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to create party', error: err.message });
    }
  },
  getPartiesByUser: async (req, res) => {
    try {
      const { search, status, partyType } = req.query;
      
      // Build query more efficiently
      const query = { user: req.user.id };
      
      // Add search filter if provided
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { gstNumber: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Add status filter
      if (status) {
        query.status = status;
      }
      
      // Add party type filter
      if (partyType) {
        query.partyType = partyType;
      }
      
      // Use lean() for better performance when you don't need Mongoose document methods
      const parties = await Party.find(query)
        .select('name phone email address gstNumber partyType openingBalance firstOpeningBalance pan city state pincode tags status note createdAt')
        .sort({ name: 1 })
        .lean();
      
      const result = { 
        success: true, 
        data: parties
      };
      
      return res.json(result);
    } catch (err) {
      console.error('Error fetching parties:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch parties', error: err.message });
    }
  },
  updateParty: async (req, res) => {
    try {
      const partyId = req.params.id;
      const phoneValue = req.body.contactNumber || req.body.phone || '';
      
      // Ensure name is a string (handle array case)
      let name = req.body.name;
      if (Array.isArray(name)) {
        name = name[0]; // Take the first element if it's an array
      }
      
      const updateFields = {
        name: name,
        phone: phoneValue,
        contactNumber: phoneValue,
        email: req.body.email,
        address: req.body.address,
        gstNumber: req.body.gstNumber,
        partyType: req.body.partyType,
        openingBalance: req.body.openingBalance,
        // Note: firstOpeningBalance is NOT included here - it should never change
        pan: req.body.pan,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        tags: req.body.tags,
        status: req.body.status,
        note: req.body.note
      };
      
      const party = await Party.findOneAndUpdate(
        { _id: partyId, user: req.user.id },
        { $set: updateFields },
        { new: true }
      );
      
      if (!party) {
        return res.status(404).json({ success: false, message: 'Party not found or not authorized' });
      }
      
      console.log(`Party updated successfully: ${party.name} (ID: ${party._id}) by user ${req.user.id}. Opening balance changed to: ${req.body.openingBalance}, First opening balance remains: ${party.firstOpeningBalance}`);
      
      return res.json({ 
        success: true, 
        data: party,
        message: `Party "${party.name}" updated successfully. Opening balance: ${req.body.openingBalance}, First opening balance: ${party.firstOpeningBalance}`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update party', error: err.message });
    }
  },
  deleteParty: async (req, res) => {
    try {
      const partyId = req.params.id;
      const party = await Party.findOneAndDelete({ _id: partyId, user: req.user.id });
      if (!party) {
        return res.status(404).json({ success: false, message: 'Party not found or not authorized' });
      }
      console.log(`Party deleted successfully: ${party.name} (ID: ${party._id}) by user ${req.user.id}`);
      
      return res.json({ success: true, message: 'Party deleted successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete party', error: err.message });
    }
  },
  bulkImport: async (req, res) => {
    try {
      const parties = req.body.parties;
      if (!Array.isArray(parties) || parties.length === 0) {
        return res.status(400).json({ success: false, message: 'No parties to import' });
      }
      const userId = req.user.id;
      const docs = parties
        .filter(p => p.name && String(p.name).trim())
        .map(p => {
          // Calculate openingBalance as receivableBalance - payableBalance
          const receivable = typeof p.receivableBalance === 'number' ? p.receivableBalance : parseFloat(p.receivableBalance) || 0;
          const payable = typeof p.payableBalance === 'number' ? p.payableBalance : parseFloat(p.payableBalance) || 0;
          const openingBalance = receivable - payable;
          return {
            name: p.name,
            phone: p.contactNumber || p.phone || '',
            email: p.email || '',
            address: p.address || '',
            openingBalance,
            firstOpeningBalance: openingBalance, // Save the first opening balance
            user: userId
          };
        });
      if (docs.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid parties with name to import' });
      }
      await Party.insertMany(docs);
      
      return res.status(201).json({ success: true, message: `${docs.length} parties imported successfully` });
    } catch (err) {
      console.error('Bulk import error:', err);
      return res.status(500).json({ success: false, message: 'Bulk import failed', error: err.message });
    }
  },
  getPartyBalance: async (req, res) => {
    try {
      const partyId = req.params.partyId;
      const userId = req.user.id;
      
      // Get party info
      const party = await Party.findOne({ _id: partyId, user: userId });
      if (!party) {
        return res.status(404).json({ success: false, message: 'Party not found' });
      }
      
      // Import Purchase model
      const Purchase = (await import('../models/purchase.js')).default;
      
      // Calculate total due balance from all sales for this party (sum of balance field)
      const salesAgg = await Sale.aggregate([
        { $match: { partyName: party.name, userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { 
            _id: null, 
            totalBalance: { $sum: "$balance" },
            totalReceived: { $sum: "$received" },
            totalGrandTotal: { $sum: "$grandTotal" }
          } 
        }
      ]);
      
      // Calculate total due balance from all purchases for this party (sum of balance field)
      const purchasesAgg = await Purchase.aggregate([
        { $match: { supplierName: party.name, userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { 
            _id: null, 
            totalBalance: { $sum: "$balance" },
            totalPaid: { $sum: "$paid" },
            totalGrandTotal: { $sum: "$grandTotal" }
          } 
        }
      ]);
      
      const salesData = salesAgg[0] || { totalBalance: 0, totalReceived: 0, totalGrandTotal: 0 };
      const purchasesData = purchasesAgg[0] || { totalBalance: 0, totalPaid: 0, totalGrandTotal: 0 };
      const partyOpeningBalance = party.openingBalance || 0;
      
      // For customers: Total due = party's opening balance + sum of all sales balances
      // For suppliers: Total due = party's opening balance + sum of all purchase balances
      const totalDue = partyOpeningBalance + salesData.totalBalance + purchasesData.totalBalance;
      
      return res.json({ 
        success: true, 
        data: { 
          partyName: party.name,
          openingBalance: partyOpeningBalance,
          firstOpeningBalance: party.firstOpeningBalance || 0,
          salesBalance: salesData.totalBalance,
          salesReceived: salesData.totalReceived,
          salesGrandTotal: salesData.totalGrandTotal,
          purchasesBalance: purchasesData.totalBalance,
          purchasesPaid: purchasesData.totalPaid,
          purchasesGrandTotal: purchasesData.totalGrandTotal,
          totalDue: totalDue
        } 
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to get party balance', error: err.message });
    }
  },

  // Get opening balance history for a party
  getOpeningBalanceHistory: async (req, res) => {
    try {
      const partyId = req.params.partyId;
      const userId = req.user.id;
      
      // Get party info
      const party = await Party.findOne({ _id: partyId, user: userId });
      if (!party) {
        return res.status(404).json({ success: false, message: 'Party not found' });
      }
      
      return res.json({ 
        success: true, 
        data: { 
          partyName: party.name,
          currentOpeningBalance: party.openingBalance || 0,
          firstOpeningBalance: party.firstOpeningBalance || 0,
          balanceChange: (party.openingBalance || 0) - (party.firstOpeningBalance || 0),
          createdAt: party.createdAt,
          updatedAt: party.updatedAt
        } 
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to get opening balance history', error: err.message });
    }
  }
  // You can add more party-related methods here (list, update, delete, etc.)
};

export default partiesController;