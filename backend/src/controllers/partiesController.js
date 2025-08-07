import Party from '../models/parties.js';
import Sale from '../models/sale.js';
import mongoose from 'mongoose';
import { invalidateDashboardCache } from './dashboardController.js';

// Simple in-memory cache for parties (global scope for logout access)
if (!global.partiesCache) {
  global.partiesCache = new Map();
}
const partiesCache = global.partiesCache;
// No TTL - cache persists until logout

const partiesController = {
  // Cache management functions
  _clearUserCache: (userId) => {
    const cacheKeys = Array.from(partiesCache.keys()).filter(key => key.startsWith(`user_${userId}`));
    cacheKeys.forEach(key => partiesCache.delete(key));
  },
  
  _getCacheKey: (userId, page, limit, search, status, partyType) => {
    return `user_${userId}_page_${page}_limit_${limit}_search_${search || ''}_status_${status || ''}_type_${partyType || ''}`;
  },
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
        openingBalance,
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
      console.log(`Party created successfully: ${party.name} (ID: ${party._id}) by user ${req.user.id}`);
      
      // Clear cache for this user
      partiesController._clearUserCache(req.user.id);
      invalidateDashboardCache(req.user.id); // Invalidate dashboard cache
      
      return res.status(201).json({ success: true, data: party });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to create party', error: err.message });
    }
  },
  getPartiesByUser: async (req, res) => {
    try {
      const { search, status, partyType } = req.query;
      
      // Check cache first
      const cacheKey = partiesController._getCacheKey(req.user.id, 'all', 'all', search, status, partyType);
      const cachedResult = partiesCache.get(cacheKey);
      
      if (cachedResult) {
        console.log('Returning cached parties for user:', req.user.id);
        return res.json(cachedResult.data);
      }
      
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
        .select('name phone email address gstNumber partyType openingBalance pan city state pincode tags status note createdAt')
        .sort({ name: 1 })
        .lean();
      
      const result = { 
        success: true, 
        data: parties
      };
      
      // Cache the result
      partiesCache.set(cacheKey, {
        data: result
      });
      
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
      console.log(`Party updated successfully: ${party.name} (ID: ${party._id}) by user ${req.user.id}`);
      
      // Clear cache for this user
      partiesController._clearUserCache(req.user.id);
      invalidateDashboardCache(req.user.id); // Invalidate dashboard cache
      
      return res.json({ success: true, data: party });
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
      
      // Clear cache for this user
      partiesController._clearUserCache(req.user.id);
      invalidateDashboardCache(req.user.id); // Invalidate dashboard cache
      
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
            user: userId
          };
        });
      if (docs.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid parties with name to import' });
      }
      await Party.insertMany(docs);
      
      // Clear cache for this user after bulk import
      partiesController._clearUserCache(userId);
      invalidateDashboardCache(userId); // Invalidate dashboard cache
      
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
  // Performance monitoring function
  getPerformanceStats: async (req, res) => {
    try {
      const stats = {
        cacheSize: partiesCache.size,
        cacheKeys: Array.from(partiesCache.keys()),
        cacheHitRate: 0, // This would need to be calculated over time
        timestamp: new Date().toISOString()
      };
      
      return res.json({ success: true, data: stats });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to get performance stats', error: err.message });
    }
  },
  // You can add more party-related methods here (list, update, delete, etc.)
};

export default partiesController;