import Sale from '../models/sale.js';
import Purchase from '../models/purchase.js';
import Party from '../models/parties.js';
import Item from '../models/items.js';
import mongoose from 'mongoose';
import CreditNote from '../models/creditNote.js';
import User from '../models/user.js';
import { uploadProfileImage } from '../services/cloudinaryService.js';
import formidable from 'formidable';
import fs from 'fs';

// Simple in-memory cache for dashboard data (global scope for logout access)
if (!global.dashboardCache) {
  global.dashboardCache = new Map();
}
const dashboardCache = global.dashboardCache;
// No TTL - cache persists until logout

// Cache management functions
const _clearUserDashboardCache = (userId) => {
  const cacheKeys = Array.from(dashboardCache.keys()).filter(key => key.startsWith(`dashboard_${userId}`));
  cacheKeys.forEach(key => dashboardCache.delete(key));
};

const _getDashboardCacheKey = (userId, type) => {
  return `dashboard_${userId}_${type}`;
};

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Get user role and log it
    const user = await User.findById(userId).select('role name email');
    if (user) {
      console.log('🔐 User Role Check:', {
        userId: userId,
        name: user.name,
        email: user.email,
        role: user.role || 'user (default)'
      });
    }

    // Check cache first
    const cacheKey = _getDashboardCacheKey(userId, 'stats');
    const cachedResult = dashboardCache.get(cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached dashboard stats for user:', userId);
      return res.json(cachedResult.data);
    }

    // Convert userId to ObjectId for aggregation
    const objectUserId = new mongoose.Types.ObjectId(userId);

    // Dates for current and previous month
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Optimize queries by using lean() and specific field selection
    const [sales, purchases, customers, items, revenueAgg, thisMonthAgg, lastMonthAgg, thisMonthOrders, lastMonthOrders, thisMonthProducts, lastMonthProducts, thisMonthCustomers, lastMonthCustomers, totalOrders, totalReceivableAgg, totalPayableAgg, creditNotesAgg, stockValueAgg, lowStockItems, outOfStockItems, negativeStockItems] = await Promise.all([
      Sale.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Purchase.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Party.countDocuments({ user: userId }).lean(),
      Item.countDocuments({ userId }).lean(),
      Sale.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' } } }]),
      Sale.aggregate([
        { $match: { userId: objectUserId, createdAt: { $gte: startOfThisMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      Sale.aggregate([
        { $match: { userId: objectUserId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      Sale.countDocuments({ userId: objectUserId, createdAt: { $gte: startOfThisMonth } }).lean(),
      Sale.countDocuments({ userId: objectUserId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).lean(),
      Item.countDocuments({ userId, createdAt: { $gte: startOfThisMonth } }).lean(),
      Item.countDocuments({ userId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).lean(),
      Party.countDocuments({ user: userId, createdAt: { $gte: startOfThisMonth } }).lean(),
      Party.countDocuments({ user: userId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).lean(),
      Sale.countDocuments({ userId: objectUserId }).lean(), // <-- total orders
      // New: total receivable and payable
      Sale.aggregate([{ $match: { userId: objectUserId, balance: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$balance' } } }]),
      Purchase.aggregate([{ $match: { userId: objectUserId, balance: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$balance' } } }]),
      // New: total credit notes
      CreditNote.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      // New: stock value calculation (stock quantity * purchase price)
      Item.aggregate([
        { $match: { userId: userId } },
        { 
          $project: { 
            // Use current stock, or fall back to opening stock if current stock is 0/null
            currentStock: {
              $cond: {
                if: { $and: [{ $ne: ['$stock', null] }, { $gt: ['$stock', 0] }] },
                then: '$stock',
                else: {
                  $cond: {
                    if: { $and: [{ $ne: ['$openingQuantity', null] }, { $gt: ['$openingQuantity', 0] }] },
                    then: '$openingQuantity',
                    else: {
                      $cond: {
                        if: { $and: [{ $ne: ['$openingStockQuantity', null] }, { $gt: ['$openingStockQuantity', 0] }] },
                        then: '$openingStockQuantity',
                        else: 0
                      }
                    }
                  }
                }
              }
            },
            stockValue: { 
              $cond: {
                if: { 
                  $and: [
                    { $ne: ['$purchasePrice', null] },
                    { $gte: ['$purchasePrice', 0] }
                  ]
                },
                then: { 
                  $multiply: [
                    {
                      $cond: {
                        if: { $and: [{ $ne: ['$stock', null] }, { $gt: ['$stock', 0] }] },
                        then: '$stock',
                        else: {
                          $cond: {
                            if: { $and: [{ $ne: ['$openingQuantity', null] }, { $gt: ['$openingQuantity', 0] }] },
                            then: '$openingQuantity',
                            else: {
                              $cond: {
                                if: { $and: [{ $ne: ['$openingStockQuantity', null] }, { $gt: ['$openingStockQuantity', 0] }] },
                                then: '$openingStockQuantity',
                                else: 0
                              }
                            }
                          }
                        }
                      }
                    },
                    '$purchasePrice'
                  ]
                },
                else: 0
              }
            } 
          } 
        },
        { $group: { _id: null, totalStockValue: { $sum: '$stockValue' } } }
      ]),
      // Count items with stock issues (using aggregation for proper field comparison)
      Item.aggregate([
        { $match: { userId: userId } },
        {
          $project: {
            name: 1,
            stock: 1,
            minStock: 1,
            openingQuantity: 1,
            currentStock: {
              $cond: {
                if: { $ne: ['$stock', null] },
                then: '$stock',
                else: { $ifNull: ['$openingQuantity', 0] }
              }
            },
            hasStockIssue: {
              $or: [
                { $lt: [{ $ifNull: ['$stock', '$openingQuantity'] }, 0] }, // Negative stock
                { $eq: [{ $ifNull: ['$stock', '$openingQuantity'] }, 0] }, // Out of stock
                {
                  $and: [
                    { $gt: [{ $ifNull: ['$stock', '$openingQuantity'] }, 0] }, // Has stock
                    { $lte: [{ $ifNull: ['$stock', '$openingQuantity'] }, { $ifNull: ['$minStock', 0] }] } // But <= minStock
                  ]
                }
              ]
            }
          }
        },
        { $match: { hasStockIssue: true } },
        { $count: "total" }
      ]),
    ]);

    const totalSales = sales[0]?.total || 0;
    const totalCreditNotes = creditNotesAgg[0]?.total || 0;
    const netRevenue = totalSales - totalCreditNotes;

    const thisMonthRevenue = thisMonthAgg[0]?.total || 0;
    const lastMonthRevenue = lastMonthAgg[0]?.total || 0;
    let revenueChange = 0;
    if (lastMonthRevenue > 0) {
      revenueChange = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (thisMonthRevenue > 0) {
      revenueChange = 100;
    }

    // Total Orders Change
    let totalOrdersChange = 0;
    if (lastMonthOrders > 0) {
      totalOrdersChange = ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;
    } else if (thisMonthOrders > 0) {
      totalOrdersChange = 100;
    }

    // Products Change
    let productsChange = 0;
    if (lastMonthProducts > 0) {
      productsChange = ((thisMonthProducts - lastMonthProducts) / lastMonthProducts) * 100;
    } else if (thisMonthProducts > 0) {
      productsChange = 100;
    }

    // Customers Change
    let customersChange = 0;
    if (lastMonthCustomers > 0) {
      customersChange = ((thisMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100;
    } else if (thisMonthCustomers > 0) {
      customersChange = 100;
    }

    const totalStockValue = stockValueAgg[0]?.totalStockValue || 0;
    const totalStockIssues = stockValueAgg[0]?.total || 0;
    
    // Debug log for stock value
    console.log('Stock Value Calculation:', {
      stockValueAgg,
      totalStockValue,
      totalStockIssues,
      userId
    });

    // Also log some sample items to see what data we have
    const sampleItems = await Item.find({ userId: userId }).select('name stock purchasePrice').limit(5).lean();
    console.log('Sample Items for Stock Value:', sampleItems);

    const result = {
      success: true,
      data: {
        totalSales: totalSales,
        totalPurchases: purchases[0]?.total || 0,
        totalCustomers: customers,
        itemsInStock: items,
        totalRevenue: netRevenue,
        revenueChange,
        totalOrdersChange,
        productsChange,
        customersChange,
        totalOrders: totalOrders || 0,
        totalReceivable: totalReceivableAgg[0]?.total || 0,
        totalPayable: totalPayableAgg[0]?.total || 0,
        totalStockValue: totalStockValue,
        lowStockItems: totalStockIssues || 0,
        outOfStockItems: 0, // Will be calculated in detailed view
        negativeStockItems: 0, // Will be calculated in detailed view

      }
    };

    // Cache the result
    dashboardCache.set(cacheKey, {
      data: result,
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSalesOverview = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    // Check cache first
    const cacheKey = _getDashboardCacheKey(userId, 'sales_overview');
    const cachedResult = dashboardCache.get(cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached sales overview for user:', userId);
      return res.json(cachedResult.data);
    }
    
    let objectUserId;
    try {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.json({ success: true, overview: [] });
    }
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate sales by day
    const salesAgg = await Sale.aggregate([
      { $match: { userId: objectUserId, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          totalSales: { $sum: "$grandTotal" }
        }
      }
    ]);

    // Aggregate credit notes by day
    const CreditNote = (await import('../models/creditNote.js')).default;
    const creditAgg = await CreditNote.aggregate([
      { $match: { userId: objectUserId, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          totalCredit: { $sum: "$grandTotal" }
        }
      }
    ]);

    // Merge sales and credit notes by date
    const dayMap = {};
    for (const s of salesAgg) {
      const key = `${s._id.year}-${s._id.month.toString().padStart(2, '0')}-${s._id.day.toString().padStart(2, '0')}`;
      dayMap[key] = { date: key, totalSales: s.totalSales, totalCredit: 0 };
    }
    for (const c of creditAgg) {
      const key = `${c._id.year}-${c._id.month.toString().padStart(2, '0')}-${c._id.day.toString().padStart(2, '0')}`;
      if (!dayMap[key]) dayMap[key] = { date: key, totalSales: 0, totalCredit: c.totalCredit };
      else dayMap[key].totalCredit = c.totalCredit;
    }
    const formatted = Object.values(dayMap)
      .map(item => ({
        date: item.date,
        netSales: item.totalSales - item.totalCredit,
        totalSales: item.totalSales,
        totalCredit: item.totalCredit
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const result = { success: true, overview: formatted };
    
    // Cache the result
    dashboardCache.set(cacheKey, {
      data: result,
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching sales overview:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    // Check cache first
    const cacheKey = _getDashboardCacheKey(userId, 'recent_activity');
    const cachedResult = dashboardCache.get(cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached recent activity for user:', userId);
      return res.json(cachedResult.data);
    }
    
    let objectUserId;
    try {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.json({ success: true, activities: [] });
    }

    // Import models dynamically to avoid circular deps
    const [Sale, Purchase, CreditNote, DeliveryChallan, Quotation, Item, Party] = await Promise.all([
      import('../models/sale.js').then(m => m.default),
      import('../models/purchase.js').then(m => m.default),
      import('../models/creditNote.js').then(m => m.default),
      import('../models/deliveryChallan.js').then(m => m.default),
      import('../models/quotation.js').then(m => m.default),
      import('../models/items.js').then(m => m.default),
      import('../models/parties.js').then(m => m.default),
    ]);

    // Fetch last 3 from each with lean() for better performance
    const [sales, purchases, creditNotes, challans, quotations, items, parties] = await Promise.all([
      Sale.find({ userId: objectUserId })
        .select('grandTotal partyName invoiceNo createdAt')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Purchase.find({ userId: objectUserId })
        .select('grandTotal supplierName billNo createdAt')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      CreditNote.find({ userId: objectUserId })
        .select('grandTotal partyName creditNoteNo createdAt')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      DeliveryChallan.find({ userId: objectUserId })
        .select('total customerName partyName challanNumber createdAt')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Quotation.find({ userId: objectUserId })
        .select('grandTotal total customerName partyName quotationNo createdAt')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Item.find({ userId: objectUserId })
        .select('openingQuantity stock name itemId createdAt')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Party.find({ user: objectUserId })
        .select('openingBalance name createdAt')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
    ]);

    // Map to unified activity format
    const activities = [
      ...sales.map(s => ({
        type: 'Sale',
        date: s.createdAt,
        amount: s.grandTotal,
        party: s.partyName,
        refNo: s.invoiceNo || s._id,
      })),
      ...purchases.map(p => ({
        type: 'Purchase',
        date: p.createdAt,
        amount: p.grandTotal,
        party: p.supplierName,
        refNo: p.billNo || p._id,
      })),
      ...creditNotes.map(cn => ({
        type: 'Credit Note',
        date: cn.createdAt,
        amount: cn.grandTotal,
        party: cn.partyName,
        refNo: cn.creditNoteNo || cn._id,
      })),
      ...challans.map(dc => ({
        type: 'Delivery Challan',
        date: dc.createdAt,
        amount: dc.total || 0,
        party: dc.customerName || dc.partyName,
        refNo: dc.challanNumber || dc._id,
      })),
      ...quotations.map(q => ({
        type: 'Estimate',
        date: q.createdAt,
        amount: q.grandTotal || q.total || 0,
        party: q.customerName || q.partyName,
        refNo: q.quotationNo || q._id,
      })),
      ...items.map(i => ({
        type: 'Item',
        date: i.createdAt,
        amount: (typeof i.openingQuantity === 'number' && !isNaN(i.openingQuantity)) ? i.openingQuantity : (typeof i.stock === 'number' && !isNaN(i.stock) ? i.stock : 0),
        party: i.name,
        refNo: i.itemId || i._id,
      })),
      ...parties.map(p => ({
        type: 'Party',
        date: p.createdAt,
        amount: p.openingBalance || 0,
        party: p.name,
        refNo: p._id,
      })),
    ];

    // Sort all by date desc, take top 3
    const sorted = activities
      .filter(a => a.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);

    const result = { success: true, activities: sorted };
    
    // Cache the result
    dashboardCache.set(cacheKey, {
      data: result,
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Use formidable for file upload
    const form = formidable({ multiples: false });
    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(400).json({ success: false, message: 'Form parse error' });
      
      // Convert array fields to strings (formidable can return arrays)
      const updateData = {};
      Object.keys(fields).forEach(key => {
        let value = fields[key];
        if (Array.isArray(value)) {
          value = value[0]; // Take the first element if it's an array
        }
        updateData[key] = value;
      });
      
      // Handle image upload
      if (files.profileImage) {
        const file = files.profileImage;
        const fileBuffer = await fs.promises.readFile(file.filepath);
        const imageUrl = await uploadProfileImage(fileBuffer, `${userId}_profile`);
        updateData.profileImage = imageUrl;
      }
      // Remove fields that shouldn't be updated
      delete updateData.password;
      const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select('-password');
      res.json({ success: true, user });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 

// GET /api/dashboard/receivables
export const getReceivablesList = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    // Check cache first
    const cacheKey = _getDashboardCacheKey(userId, 'receivables');
    const cachedResult = dashboardCache.get(cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached receivables for user:', userId);
      return res.json(cachedResult.data);
    }
    
    const objectUserId = new mongoose.Types.ObjectId(userId);
    // Group by partyName, sum balance where balance > 0
    const receivables = await Sale.aggregate([
      { $match: { userId: objectUserId, balance: { $gt: 0 } } },
      { $group: { _id: '$partyName', total: { $sum: '$balance' } } },
      { $sort: { total: -1 } }
    ]);
    // Optionally, get party _id for linking
    const parties = await Party.find({ user: userId }).select('name _id').lean();
    const result = receivables.map(r => {
      const party = parties.find(p => p.name === r._id);
      return { name: r._id, _id: party ? party._id : undefined, amount: r.total };
    });
    
    const response = { success: true, data: result };
    
    // Cache the result
    dashboardCache.set(cacheKey, {
      data: response,
    });
    
    res.json(response);
  } catch (err) {
    console.error('Error fetching receivables:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/dashboard/payables
export const getPayablesList = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    // Check cache first
    const cacheKey = _getDashboardCacheKey(userId, 'payables');
    const cachedResult = dashboardCache.get(cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached payables for user:', userId);
      return res.json(cachedResult.data);
    }
    
    const objectUserId = new mongoose.Types.ObjectId(userId);
    // Group by supplierName, sum balance where balance > 0
    const payables = await Purchase.aggregate([
      { $match: { userId: objectUserId, balance: { $gt: 0 } } },
      { $group: { _id: '$supplierName', total: { $sum: '$balance' } } },
      { $sort: { total: -1 } }
    ]);
    // Optionally, get party _id for linking
    const parties = await Party.find({ user: userId }).select('name _id').lean();
    const result = payables.map(r => {
      const party = parties.find(p => p.name === r._id);
      return { name: r._id, _id: party ? party._id : undefined, amount: r.total };
    });
    
    const response = { success: true, data: result };
    
    // Cache the result
    dashboardCache.set(cacheKey, {
      data: response,
    });
    
    res.json(response);
  } catch (err) {
    console.error('Error fetching payables:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}; 

// Cache invalidation functions for other controllers to call
export const invalidateDashboardCache = (userId) => {
  _clearUserDashboardCache(userId);
  console.log(`Dashboard cache cleared for user: ${userId}`);
};

// Utility function to clear all cache for a user
export const clearAllCacheForUser = (userId) => {
  // Clear parties cache
  if (global.partiesCache) {
    const partiesCacheKeys = Array.from(global.partiesCache.keys()).filter(key => key.startsWith(`user_${userId}`));
    partiesCacheKeys.forEach(key => global.partiesCache.delete(key));
  }
  
  // Clear items cache
  if (global.itemsCache) {
    const itemsCacheKeys = Array.from(global.itemsCache.keys()).filter(key => key.startsWith(`user_${userId}`));
    itemsCacheKeys.forEach(key => global.itemsCache.delete(key));
  }
  
  // Clear dashboard cache
  if (global.dashboardCache) {
    const dashboardCacheKeys = Array.from(global.dashboardCache.keys()).filter(key => key.startsWith(`dashboard_${userId}`));
    dashboardCacheKeys.forEach(key => global.dashboardCache.delete(key));
  }
  
  console.log(`All cache cleared for user: ${userId}`);
};

// Performance monitoring function for dashboard
export const getDashboardPerformanceStats = async (req, res) => {
  try {
    const stats = {
      cacheSize: dashboardCache.size,
      cacheKeys: Array.from(dashboardCache.keys()),
      cacheHitRate: 0, // This would need to be calculated over time
      timestamp: new Date().toISOString()
    };
    
    return res.json({ success: true, data: stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get performance stats', error: err.message });
  }
};

// Test endpoint for stock value calculation
export const testStockValue = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Get all items for this user
    const items = await Item.find({ userId: userId }).select('name stock purchasePrice openingQuantity openingStockQuantity').lean();
    
    // Calculate stock value manually
    let totalStockValue = 0;
    const itemDetails = [];
    
    items.forEach(item => {
      // Use current stock, or fall back to opening stock if current stock is 0/null
      const currentStock = item.stock || item.openingQuantity || item.openingStockQuantity || 0;
      const stockValue = currentStock * (item.purchasePrice || 0);
      totalStockValue += stockValue;
      itemDetails.push({
        name: item.name,
        stock: item.stock || 0,
        openingQuantity: item.openingQuantity || 0,
        openingStockQuantity: item.openingStockQuantity || 0,
        currentStock: currentStock,
        purchasePrice: item.purchasePrice || 0,
        stockValue: stockValue
      });
    });

    return res.json({ 
      success: true, 
      data: {
        totalItems: items.length,
        totalStockValue,
        itemDetails,
        itemsWithStock: items.filter(item => (item.stock || 0) > 0).length,
        itemsWithPrice: items.filter(item => (item.purchasePrice || 0) > 0).length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to test stock value', error: err.message });
  }
};

// Get detailed stock summary data
export const getStockSummary = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Get all items with stock issues using aggregation
    const itemsWithIssues = await Item.aggregate([
      { $match: { userId: userId } },
      {
        $project: {
          name: 1,
          stock: 1,
          minStock: 1,
          openingQuantity: 1,
          currentStock: {
            $cond: {
              if: { $ne: ['$stock', null] },
              then: '$stock',
              else: { $ifNull: ['$openingQuantity', 0] }
            }
          },
          issueType: {
            $cond: {
              if: { $lt: [{ $ifNull: ['$stock', '$openingQuantity'] }, 0] },
              then: 'negative',
              else: {
                $cond: {
                  if: { $eq: [{ $ifNull: ['$stock', '$openingQuantity'] }, 0] },
                  then: 'outOfStock',
                  else: {
                    $cond: {
                      if: {
                        $and: [
                          { $gt: [{ $ifNull: ['$stock', '$openingQuantity'] }, 0] },
                          { $lte: [{ $ifNull: ['$stock', '$openingQuantity'] }, { $ifNull: ['$minStock', 0] }] }
                        ]
                      },
                      then: 'lowStock',
                      else: 'normal'
                    }
                  }
                }
              }
            }
          }
        }
      },
      { $match: { issueType: { $ne: 'normal' } } },
      { $sort: { issueType: 1, name: 1 } }
    ]);

    return res.json({ 
      success: true, 
      data: {
        items: itemsWithIssues.map(item => ({
          name: item.name,
          currentStock: item.currentStock,
          minStock: item.minStock || 0,
          issueType: item.issueType
        }))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get stock summary', error: err.message });
  }
}; 