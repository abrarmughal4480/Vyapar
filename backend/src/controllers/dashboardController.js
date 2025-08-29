import Sale from '../models/sale.js';
import Purchase from '../models/purchase.js';
import Party from '../models/parties.js';
import Item from '../models/items.js';
import mongoose from 'mongoose';
import CreditNote from '../models/creditNote.js';
import User from '../models/user.js';
import Expense from '../models/expense.js';
import CashBank from '../models/cashBank.js';
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

// Fast cache invalidation - only clear specific cache types
const _invalidateSpecificCache = (userId, cacheType) => {
  const cacheKey = _getDashboardCacheKey(userId, cacheType);
  dashboardCache.delete(cacheKey);
  console.log(`Fast cache invalidation: ${cacheKey}`);
};

// Optimized helper function to get expense stats using existing controller logic
const _getExpenseStatsForUser = async (userId) => {
  try {
    // Use aggregation with lean() for better performance
    const totalExpenses = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).allowDiskUse(true); // Allow disk usage for large datasets
    return totalExpenses[0]?.total || 0;
  } catch (error) {
    console.error('Error getting expense stats:', error);
    return 0;
  }
};

// Optimized helper function to get cash in hand using existing controller logic
const _getCashInHandForUser = async (userId) => {
  try {
    // Convert userId to ObjectId for aggregation
    const objectUserId = new mongoose.Types.ObjectId(userId);
    
    // Use aggregation pipeline for better performance with large datasets
    const cashFlowData = await Sale.aggregate([
      { $match: { userId: objectUserId } },
      { $group: { 
        _id: null, 
        totalReceived: { $sum: { $ifNull: ['$received', 0] } },
        totalSalesBalance: { $sum: { $ifNull: ['$balance', 0] } }
      }}
    ]).allowDiskUse(true);

    const purchaseData = await Purchase.aggregate([
      { $match: { userId: objectUserId } },
      { $group: { 
        _id: null, 
        totalPaid: { $sum: { $ifNull: ['$paid', 0] } },
        totalPurchaseBalance: { $sum: { $ifNull: ['$balance', 0] } }
      }}
    ]).allowDiskUse(true);

    const expenseData = await Expense.aggregate([
      { $match: { userId: objectUserId } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$totalAmount', 0] } } }}
    ]).allowDiskUse(true);

    const creditNotesData = await CreditNote.aggregate([
      { $match: { userId: objectUserId } },
      { $group: { 
        _id: '$type', 
        total: { $sum: { $ifNull: ['$amount', 0] } }
      }}
    ]).allowDiskUse(true);

    const cashAdjustmentsData = await CashBank.aggregate([
      { $match: { userId: objectUserId } },
      { $group: { 
        _id: '$type', 
        total: { $sum: { $ifNull: ['$amount', 0] } }
      }}
    ]).allowDiskUse(true);

    // Extract values with fallbacks
    const totalReceived = cashFlowData[0]?.totalReceived || 0;
    const totalExpenses = expenseData[0]?.total || 0;
    
    // Calculate net effect of credit notes
    let totalCreditNotes = 0;
    creditNotesData.forEach(note => {
      const amount = Number(note.total) || 0;
      if (note._id === 'Sale') {
        totalCreditNotes += amount; // Credit note reduces sales (adds to cash)
      } else {
        totalCreditNotes -= amount; // Credit note reduces purchases (reduces cash)
      }
    });

    // Calculate total cash adjustments
    let totalCashAdjustments = 0;
    cashAdjustmentsData.forEach(adjustment => {
      const amount = Number(adjustment.total) || 0;
      if (adjustment._id === 'Income') {
        totalCashAdjustments += amount;
      } else if (adjustment._id === 'Expense') {
        totalCashAdjustments -= amount;
      }
    });
    
    // Calculate net cash flow from business operations
    const netCashFlow = totalReceived - totalExpenses + totalCreditNotes;
    
    // Final cash in hand = Business net cash flow + total cash adjustments
    const finalCashInHand = netCashFlow + totalCashAdjustments;

    console.log('Cash In Hand Calculation:', {
      userId,
      totalReceived,
      totalExpenses,
      totalCreditNotes,
      netCashFlow,
      totalCashAdjustments,
      finalCashInHand
    });

    return finalCashInHand;
  } catch (error) {
    console.error('Error getting cash in hand:', error);
    return 0;
  }
};

// Optimized dashboard stats with lazy loading for expensive calculations
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
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);

    // Optimize queries by using lean() and specific field selection
    // Use allowDiskUse for large datasets and add timeout
    const queryOptions = { 
      allowDiskUse: true,
      maxTimeMS: 30000 // 30 second timeout
    };

    // Parallel execution of optimized aggregations
    const [sales, purchases, customers, items, revenueAgg, thisMonthAgg, lastMonthAgg, thisMonthOrders, lastMonthOrders, thisMonthProducts, lastMonthProducts, thisMonthCustomers, lastMonthCustomers, totalOrders, creditNotesAgg, stockValueAgg, lowStockItems] = await Promise.all([
      Sale.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }], queryOptions),
      Purchase.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }], queryOptions),
      Party.countDocuments({ user: userId }).lean(),
      Item.countDocuments({ userId }).lean(),
      Sale.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' } } }], queryOptions),
      Sale.aggregate([
        { $match: { userId: objectUserId, createdAt: { $gte: startOfThisMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ], queryOptions),
      Sale.aggregate([
        { $match: { userId: objectUserId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ], queryOptions),
      Sale.countDocuments({ userId: objectUserId, createdAt: { $gte: startOfThisMonth } }).lean(),
      Sale.countDocuments({ userId: objectUserId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).lean(),
      Item.countDocuments({ userId, createdAt: { $gte: startOfThisMonth } }).lean(),
      Item.countDocuments({ userId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).lean(),
      Party.countDocuments({ user: userId, createdAt: { $gte: startOfThisMonth } }).lean(),
      Party.countDocuments({ user: userId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).lean(),
      Sale.countDocuments({ userId: objectUserId }).lean(), // <-- total orders
      // New: total credit notes
      CreditNote.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }], queryOptions),
      // New: stock value calculation (stock quantity * purchase price) - optimized
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
      ], queryOptions),
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
      ], queryOptions),
      // New: Get total expenses amount using existing controller logic
      Expense.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }], queryOptions),
      // New: Get cash in hand using existing controller logic
      CashBank.findOne({ userId: objectUserId }).sort({ createdAt: -1 }).select('cashInHand').lean(),
    ]);

    // Get expense and cash in hand using helper functions (existing controller logic)
    const totalExpenses = await _getExpenseStatsForUser(userId);
    const cashInHand = await _getCashInHandForUser(userId);

    // Calculate party balances using the same logic as the parties page
    const parties = await Party.find({ user: objectUserId }).select('name _id openingBalance').lean();
    
    // Calculate total payable and receivable based on party opening balances only
    // This matches the logic used in the parties page
    let totalPayable = 0;
    let totalReceivable = 0;
    
    parties.forEach(party => {
      const openingBalance = party.openingBalance || 0;
      
      if (openingBalance > 0) {
        // They owe us money (receivable)
        totalReceivable += openingBalance;
      } else if (openingBalance < 0) {
        // We owe them money (payable)
        totalPayable += Math.abs(openingBalance);
      }
    });

    const totalSales = sales && sales.length > 0 ? sales[0].total || 0 : 0;
    const totalCreditNotes = creditNotesAgg && creditNotesAgg.length > 0 ? creditNotesAgg[0].total || 0 : 0;
    const netRevenue = totalSales - totalCreditNotes;

    const thisMonthRevenue = thisMonthAgg && thisMonthAgg.length > 0 ? thisMonthAgg[0].total || 0 : 0;
    const lastMonthRevenue = lastMonthAgg && lastMonthAgg.length > 0 ? lastMonthAgg[0].total || 0 : 0;
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

    const totalStockValue = stockValueAgg && stockValueAgg.length > 0 ? stockValueAgg[0].totalStockValue || 0 : 0;
    const totalStockIssues = lowStockItems && lowStockItems.length > 0 ? lowStockItems[0].total || 0 : 0;
    
    // Also log some sample items to see what data we have
    const sampleItems = await Item.find({ userId: userId }).select('name stock purchasePrice').limit(5).lean();

    const result = {
      success: true,
      data: {
        totalSales: totalSales,
        totalPurchases: purchases && purchases.length > 0 ? purchases[0].total || 0 : 0,
        totalCustomers: customers,
        itemsInStock: items,
        totalRevenue: netRevenue,
        revenueChange,
        totalOrdersChange,
        productsChange,
        customersChange,
        totalOrders: totalOrders || 0,
        totalReceivable: totalReceivable,
        totalPayable: totalPayable,
        totalStockValue: totalStockValue,
        lowStockItems: totalStockIssues || 0,
        outOfStockItems: 0, // Will be calculated in detailed view
        negativeStockItems: 0, // Will be calculated in detailed view
        totalExpenses: totalExpenses,
        cashInHand: cashInHand,
      }
    };

    // Cache the result
    dashboardCache.set(cacheKey, {
      data: result,
      timestamp: new Date().toISOString(),
      userId: userId
    });

    // Also invalidate party balances cache to ensure consistency
    _invalidateSpecificCache(userId, 'party_balances');

    console.log(`📊 Dashboard stats cached for user: ${userId}, cache key: ${cacheKey}`);

    res.json(result);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSalesOverview = async (req, res) => {
  try {
    // Get userId from params or from authenticated user
    const userId = req.params.userId || (req.user && (req.user._id || req.user.id));
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

    // Check if this is a businessId (company user) or userId (individual user)
    const user = await User.findById(userId).select('businessId context');
    let queryUserId = objectUserId;
    
    if (user && user.businessId && user.context === 'company') {
      // This is a user who joined a company, use businessId for queries
      queryUserId = new mongoose.Types.ObjectId(user.businessId);
      console.log('🔍 Company user detected, using businessId for sales overview:', {
        userId: userId,
        businessId: user.businessId,
        context: user.context
      });
    } else if (user && user.context === 'company') {
      // This might be the businessId itself, use it directly
      queryUserId = objectUserId;
      console.log('🔍 Business ID passed directly, using for sales overview:', userId);
    } else if (!user) {
      // No user found with this ID, it might be a business ID itself
      // Check if there are any users with this as their businessId
      const companyUser = await User.findOne({ businessId: userId, context: 'company' });
      if (companyUser) {
        queryUserId = objectUserId;
        console.log('🔍 Business ID confirmed, using for sales overview:', userId);
      } else {
        console.log('🔍 Individual user detected, using userId for sales overview:', userId);
      }
    } else {
      console.log('🔍 Individual user detected, using userId for sales overview:', userId);
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate sales by day using the correct ID
    const salesAgg = await Sale.aggregate([
      { $match: { userId: queryUserId, createdAt: { $gte: thirtyDaysAgo } } },
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

    // Aggregate credit notes by day using the correct ID
    const CreditNote = (await import('../models/creditNote.js')).default;
    const creditAgg = await CreditNote.aggregate([
      { $match: { userId: queryUserId, createdAt: { $gte: thirtyDaysAgo } } },
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
    // Get userId from params or from authenticated user
    const userId = req.params.userId || (req.user && (req.user._id || req.user.id));
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
    
    console.log('🔍 Profile request for user:', {
      userId: userId,
      name: user.name,
      email: user.email,
      context: user.context,
      businessId: user.businessId,
      role: user.role
    });
    
    // For users who joined a company, we want to show their personal info, not company info
    let profileData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      profileImage: user.profileImage,
      role: user.role,
      context: user.context || 'individual'
    };
    
    // If user joined a company, show their personal business info, not the company's
    if (user.businessId && user.context === 'company') {
      // User joined a company - show their personal business info
      // For company users, their businessName should be their personal business name
      profileData = {
        ...profileData,
        businessName: user.businessName || `${user.name}'s Business`,
        businessType: user.businessType || 'Individual',
        gstNumber: user.gstNumber || '',
        website: user.website || '',
        joinedCompany: true,
        companyId: user.businessId
      };
      
      console.log('🔍 Company user profile data:', {
        personalBusinessName: profileData.businessName,
        personalBusinessType: profileData.businessType,
        joinedCompanyId: user.businessId
      });
    } else {
      // Individual user - show their business info
      profileData = {
        ...profileData,
        businessName: user.businessName,
        businessType: user.businessType,
        gstNumber: user.gstNumber,
        website: user.website,
        joinedCompany: false
      };
      
      console.log('🔍 Individual user profile data:', {
        businessName: profileData.businessName,
        businessType: profileData.businessType
      });
    }
    
    res.json({ success: true, user: profileData });
  } catch (err) {
    console.error('Error fetching profile:', err);
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
  // Fast invalidation - only clear stats cache, keep other caches
  _invalidateSpecificCache(userId, 'stats');
  console.log(`Fast dashboard cache invalidation for user: ${userId}`);
};

// Invalidate party balances cache specifically
export const invalidatePartyBalancesCache = (userId) => {
  _invalidateSpecificCache(userId, 'party_balances');
  console.log(`Party balances cache invalidation for user: ${userId}`);
};

// Invalidate all dashboard caches for a user
export const invalidateAllDashboardCaches = (userId) => {
  _invalidateSpecificCache(userId, 'stats');
  _invalidateSpecificCache(userId, 'party_balances');
  _invalidateSpecificCache(userId, 'receivables');
  _invalidateSpecificCache(userId, 'payables');
  
  // Also clear any other cache keys that might exist for this user
  if (global.dashboardCache) {
    const allKeys = Array.from(global.dashboardCache.keys());
    const userKeys = allKeys.filter(key => key.includes(userId.toString()));
    userKeys.forEach(key => {
      global.dashboardCache.delete(key);
      console.log(`Additional dashboard cache cleared: ${key}`);
    });
  }
  
  console.log(`All dashboard caches invalidated for user: ${userId}`);
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
  
  // Clear dashboard cache - IMPORTANT: Clear ALL dashboard cache keys for this user
  if (global.dashboardCache) {
    const dashboardCacheKeys = Array.from(global.dashboardCache.keys()).filter(key => key.startsWith(`dashboard_${userId}`));
    dashboardCacheKeys.forEach(key => {
      global.dashboardCache.delete(key);
      console.log(`Dashboard cache cleared: ${key}`);
    });
  }
  
  // Also clear any other cache keys that might exist
  if (global.dashboardCache) {
    const allKeys = Array.from(global.dashboardCache.keys());
    const userKeys = allKeys.filter(key => key.includes(userId.toString()));
    userKeys.forEach(key => {
      global.dashboardCache.delete(key);
      console.log(`Additional cache cleared: ${key}`);
    });
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

// Force refresh dashboard data by clearing cache and fetching fresh data
export const forceRefreshDashboard = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    console.log(`🔄 Force refreshing dashboard for user: ${userId}`);
    
    // Clear all dashboard cache for this user
    if (global.dashboardCache) {
      const allKeys = Array.from(global.dashboardCache.keys());
      const userKeys = allKeys.filter(key => key.includes(userId.toString()));
      userKeys.forEach(key => {
        global.dashboardCache.delete(key);
        console.log(`Cache cleared: ${key}`);
      });
    }
    
    // Now fetch fresh data by calling the main dashboard function
    // We'll simulate the request to get fresh data
    const freshData = await getDashboardStats(req, res);
    
    console.log(`✅ Dashboard force refreshed for user: ${userId}`);
    
    return res.json({ success: true, message: 'Dashboard refreshed successfully' });
  } catch (err) {
    console.error('Error force refreshing dashboard:', err);
    return res.status(500).json({ success: false, message: 'Failed to refresh dashboard', error: err.message });
  }
};

// Manual cache clearing function for testing/debugging
export const clearUserCache = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    console.log(`🧹 Manually clearing cache for user: ${userId}`);
    
    // Clear all cache types for this user
    clearAllCacheForUser(userId);
    
    return res.json({ 
      success: true, 
      message: 'Cache cleared successfully',
      userId: userId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error clearing user cache:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear cache', error: err.message });
  }
};

// Debug function to check what's in the cache
export const debugCache = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const cacheInfo = {
      totalCacheSize: dashboardCache.size,
      userCacheKeys: [],
      allCacheKeys: Array.from(dashboardCache.keys()),
      timestamp: new Date().toISOString()
    };
    
    // Find all cache keys for this user
    if (global.dashboardCache) {
      const allKeys = Array.from(global.dashboardCache.keys());
      cacheInfo.userCacheKeys = allKeys.filter(key => key.includes(userId.toString()));
      
      // Get cache values for this user
      cacheInfo.userCacheData = {};
      cacheInfo.userCacheKeys.forEach(key => {
        const cached = global.dashboardCache.get(key);
        cacheInfo.userCacheData[key] = {
          hasData: !!cached,
          timestamp: cached?.timestamp || 'N/A',
          userId: cached?.userId || 'N/A'
        };
      });
    }
    
    return res.json({ 
      success: true, 
      message: 'Cache debug info',
      userId: userId,
      cacheInfo: cacheInfo
    });
  } catch (err) {
    console.error('Error debugging cache:', err);
    return res.status(500).json({ success: false, message: 'Failed to debug cache', error: err.message });
  }
};

// Force refresh specific cache type
export const refreshSpecificCache = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { cacheType } = req.params; // e.g., 'stats', 'party_balances', 'receivables', 'payables'
    
    if (!cacheType) {
      return res.status(400).json({ success: false, message: 'Cache type is required' });
    }
    
    console.log(`🔄 Refreshing specific cache: ${cacheType} for user: ${userId}`);
    
    // Clear specific cache
    _invalidateSpecificCache(userId, cacheType);
    
    return res.json({ 
      success: true, 
      message: `Cache ${cacheType} refreshed successfully`,
      userId: userId,
      cacheType: cacheType,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error refreshing specific cache:', err);
    return res.status(500).json({ success: false, message: 'Failed to refresh cache', error: err.message });
  }
};

// Function to create database indexes for better performance
export const createDashboardIndexes = async (req, res) => {
  try {
    console.log('🔧 Creating database indexes for dashboard performance...');
    
    // Create indexes for better aggregation performance
    await Promise.all([
      // Sale indexes
      Sale.collection.createIndex({ userId: 1, createdAt: -1 }),
      Sale.collection.createIndex({ userId: 1, balance: 1 }),
      Sale.collection.createIndex({ userId: 1, grandTotal: 1 }),
      
      // Purchase indexes
      Purchase.collection.createIndex({ userId: 1, createdAt: -1 }),
      Purchase.collection.createIndex({ userId: 1, balance: 1 }),
      Purchase.collection.createIndex({ userId: 1, grandTotal: 1 }),
      
      // Item indexes
      Item.collection.createIndex({ userId: 1, stock: 1 }),
      Item.collection.createIndex({ userId: 1, purchasePrice: 1 }),
      Item.collection.createIndex({ userId: 1, minStock: 1 }),
      
      // Party indexes
      Party.collection.createIndex({ user: 1, createdAt: -1 }),
      
      // Expense indexes
      Expense.collection.createIndex({ userId: 1, totalAmount: 1 }),
      
      // Credit Note indexes
      CreditNote.collection.createIndex({ userId: 1, type: 1 }),
      CreditNote.collection.createIndex({ userId: 1, amount: 1 }),
      
      // Cash Bank indexes
      CashBank.collection.createIndex({ userId: 1, type: 1 }),
      CashBank.collection.createIndex({ userId: 1, amount: 1 }),
    ]);
    
    console.log('✅ Database indexes created successfully');
    return res.json({ success: true, message: 'Database indexes created successfully' });
  } catch (err) {
    console.error('❌ Error creating database indexes:', err);
    return res.status(500).json({ success: false, message: 'Failed to create indexes', error: err.message });
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

// Get party balances and categorize them as payable or receivable
export const getPartyBalances = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    // Check cache first
    const cacheKey = _getDashboardCacheKey(userId, 'party_balances');
    const cachedResult = dashboardCache.get(cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached party balances for user:', userId);
      return res.json(cachedResult.data);
    }
    
    const objectUserId = new mongoose.Types.ObjectId(userId);
    
    // Get all parties for this user
    const parties = await Party.find({ user: objectUserId }).select('name _id openingBalance').lean();
    
    // Process each party and categorize them based on opening balance only
    // This matches the logic used in the parties page
    const partyBalances = parties.map(party => {
      const openingBalance = party.openingBalance || 0;
      
      // Determine category based on opening balance
      let category = 'neutral';
      let amount = 0;
      
      if (openingBalance > 0) {
        // They owe us money (receivable)
        category = 'receivable';
        amount = openingBalance;
      } else if (openingBalance < 0) {
        // We owe them money (payable)
        category = 'payable';
        amount = Math.abs(openingBalance);
      }
      
      return {
        _id: party._id,
        name: party.name,
        openingBalance: openingBalance,
        salesBalance: 0, // Not used in this calculation
        purchaseBalance: 0, // Not used in this calculation
        netBalance: openingBalance,
        category: category,
        amount: amount
      };
    });
    
    // Separate into payable and receivable lists
    const payables = partyBalances.filter(p => p.category === 'payable');
    const receivables = partyBalances.filter(p => p.category === 'receivable');
    
    const result = {
      success: true,
      data: {
        payables: payables.sort((a, b) => b.amount - a.amount),
        receivables: receivables.sort((a, b) => b.amount - a.amount),
        totalPayable: payables.reduce((sum, p) => sum + p.amount, 0),
        totalReceivable: receivables.reduce((sum, p) => sum + p.amount, 0),
        totalParties: parties.length
      }
    };
    
    // Cache the result
    dashboardCache.set(cacheKey, {
      data: result,
    });
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching party balances:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}; 