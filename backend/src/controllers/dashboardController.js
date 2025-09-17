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


const _getExpenseStatsForUser = async (userId) => {
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout')), 10000)
    );
    
    const expensePromise = Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).allowDiskUse(true);
    
    const totalExpenses = await Promise.race([expensePromise, timeoutPromise]);
    return totalExpenses[0]?.total || 0;
  } catch (error) {
    return 0;
  }
};

const _calculatePartyOutstandingBalances = async (userId, partyName) => {
  try {
    const objectUserId = new mongoose.Types.ObjectId(userId);
    
    const [sales, purchases, paymentsIn, paymentsOut, creditNotes] = await Promise.all([
      Sale.find({ 
        userId: objectUserId, 
        partyName: partyName 
      }).select('grandTotal received balance').lean(),
      
      Purchase.find({ 
        userId: objectUserId, 
        supplierName: partyName 
      }).select('grandTotal paid balance').lean(),
      
      Sale.find({ 
        userId: objectUserId, 
        partyName: partyName,
        received: { $gt: 0 }
      }).select('received').lean(),
      
      Purchase.find({ 
        userId: objectUserId, 
        supplierName: partyName,
        paid: { $gt: 0 }
      }).select('paid').lean(),
      
      CreditNote.find({ 
        userId: objectUserId, 
        partyName: partyName 
      }).select('grandTotal type').lean()
    ]);
    
    let totalReceivable = 0;
    let totalPayable = 0;
    
    const calculations = await Promise.all([
      Promise.resolve(sales.reduce((sum, sale) => {
        const outstanding = (sale.grandTotal || 0) - (sale.received || 0);
        return sum + outstanding;
      }, 0)),
      
      Promise.resolve(purchases.reduce((sum, purchase) => {
        const outstanding = (purchase.grandTotal || 0) - (purchase.paid || 0);
        return sum + outstanding;
      }, 0)),
      
      Promise.resolve(paymentsIn.reduce((sum, payment) => sum - (payment.received || 0), 0)),
      Promise.resolve(paymentsOut.reduce((sum, payment) => sum - (payment.paid || 0), 0)),
      
      Promise.resolve(creditNotes.reduce((sum, note) => {
        if (note.type === 'Sale') {
          return sum + (note.grandTotal || 0);
        } else {
          return sum - (note.grandTotal || 0);
        }
      }, 0))
    ]);
    
    totalReceivable = calculations[0] + calculations[2] + calculations[4];
    totalPayable = calculations[1] + calculations[3] - calculations[4];
    
    return { totalReceivable, totalPayable };
  } catch (error) {
    return { totalReceivable: 0, totalPayable: 0 };
  }
};

const _getCashInHandForUser = async (userId) => {
  try {
    const objectUserId = new mongoose.Types.ObjectId(userId);
    
    const [cashFlowData, purchaseData, expenseData, creditNotesData, cashAdjustmentsData] = await Promise.all([
      Sale.aggregate([
        { $match: { userId: objectUserId } },
        { $group: { 
          _id: null, 
          totalReceived: { $sum: { $ifNull: ['$received', 0] } },
          totalSalesBalance: { $sum: { $ifNull: ['$balance', 0] } }
        }}
      ]).allowDiskUse(true),

      Purchase.aggregate([
        { $match: { userId: objectUserId } },
        { $group: { 
          _id: null, 
          totalPaid: { $sum: { $ifNull: ['$paid', 0] } },
          totalPurchaseBalance: { $sum: { $ifNull: ['$balance', 0] } }
        }}
      ]).allowDiskUse(true),

      Expense.aggregate([
        { $match: { userId: objectUserId } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$totalAmount', 0] } } }}
      ]).allowDiskUse(true),

      CreditNote.aggregate([
        { $match: { userId: objectUserId } },
        { $group: { 
          _id: '$type', 
          total: { $sum: { $ifNull: ['$amount', 0] } }
        }}
      ]).allowDiskUse(true),

      CashBank.aggregate([
        { $match: { userId: objectUserId } },
        { $group: { 
          _id: '$type', 
          total: { $sum: { $ifNull: ['$amount', 0] } }
        }}
      ]).allowDiskUse(true)
    ]);

    const calculations = await Promise.all([
      Promise.resolve({
        totalReceived: cashFlowData[0]?.totalReceived || 0,
        totalPaid: purchaseData[0]?.totalPaid || 0,
        totalExpenses: expenseData[0]?.total || 0
      }),
      
      Promise.resolve(creditNotesData.reduce((sum, note) => {
        const amount = Number(note.total) || 0;
        return note._id === 'Sale' ? sum + amount : sum - amount;
      }, 0)),
      
      Promise.resolve(cashAdjustmentsData.reduce((sum, adjustment) => {
        const amount = Number(adjustment.total) || 0;
        if (adjustment._id === 'Income') {
          return sum + amount;
        } else if (adjustment._id === 'Expense') {
          return sum - amount;
        }
        return sum;
      }, 0))
    ]);

    const { totalReceived, totalPaid, totalExpenses } = calculations[0];
    const totalCreditNotes = calculations[1];
    const totalCashAdjustments = calculations[2];
    
    const netCashFlow = totalReceived - totalPaid - totalExpenses + totalCreditNotes;
    const finalCashInHand = netCashFlow + totalCashAdjustments;

    return finalCashInHand;
  } catch (error) {
    return 0;
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(userId).select('role name email');


    const objectUserId = new mongoose.Types.ObjectId(userId);

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);

    const queryOptions = { 
      allowDiskUse: true,
      maxTimeMS: 30000
    };

    const [
      basicStats,
      revenueStats,
      monthlyStats,
      stockStats,
      additionalStats
    ] = await Promise.all([
      Promise.all([
        Sale.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }], queryOptions),
        Purchase.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }], queryOptions),
        Party.countDocuments({ user: userId }).lean(),
        Item.countDocuments({ userId }).lean(),
        Sale.countDocuments({ userId: objectUserId }).lean()
      ]),
      
      Promise.all([
        Sale.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' } } }], queryOptions),
        CreditNote.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }], queryOptions)
      ]),
      
      Promise.all([
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
        Party.countDocuments({ user: userId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).lean()
      ]),
      
      Promise.all([
        Item.aggregate([
          { $match: { userId: userId } },
          { 
            $project: { 
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
                      { $ne: ['$salePrice', null] },
                      { $gte: ['$salePrice', 0] }
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
                      '$salePrice'
                    ]
                  },
                  else: 0
                }
              } 
            } 
          },
          { $group: { _id: null, totalStockValue: { $sum: '$stockValue' } } }
        ], queryOptions),
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
                  { $lt: [{ $ifNull: ['$stock', '$openingQuantity'] }, 0] },
                  { $eq: [{ $ifNull: ['$stock', '$openingQuantity'] }, 0] },
                  {
                    $and: [
                      { $gt: [{ $ifNull: ['$stock', '$openingQuantity'] }, 0] },
                      { $lte: [{ $ifNull: ['$stock', '$openingQuantity'] }, { $ifNull: ['$minStock', 0] }] }
                    ]
                  }
                ]
              }
            }
          },
          { $match: { hasStockIssue: true } },
          { $count: "total" }
        ], queryOptions)
      ]),
      
      Promise.all([
        Expense.aggregate([{ $match: { userId: objectUserId } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }], queryOptions),
        CashBank.findOne({ userId: objectUserId }).sort({ createdAt: -1 }).select('cashInHand').lean()
      ])
    ]);

    const [sales, purchases, customers, items, totalOrders] = basicStats;
    const [revenueAgg, creditNotesAgg] = revenueStats;
    const [thisMonthAgg, lastMonthAgg, thisMonthOrders, lastMonthOrders, thisMonthProducts, lastMonthProducts, thisMonthCustomers, lastMonthCustomers] = monthlyStats;
    const [stockValueAgg, lowStockItems] = stockStats;
    const [expenseAgg, cashBankData] = additionalStats;

    const [totalExpenses, cashInHand, parties] = await Promise.all([
      _getExpenseStatsForUser(userId),
      _getCashInHandForUser(userId),
      Party.find({ user: objectUserId }).select('name _id openingBalance firstOpeningBalance').lean()
    ]);

    const partyBalanceCalculations = await Promise.all(
      parties.map(async (party) => {
        const openingBalance = party.openingBalance || 0;
        return {
          receivable: openingBalance > 0 ? openingBalance : 0,
          payable: openingBalance < 0 ? Math.abs(openingBalance) : 0
        };
      })
    );

    const totalPayable = partyBalanceCalculations.reduce((sum, calc) => sum + calc.payable, 0);
    const totalReceivable = partyBalanceCalculations.reduce((sum, calc) => sum + calc.receivable, 0);

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

    let totalOrdersChange = 0;
    if (lastMonthOrders > 0) {
      totalOrdersChange = ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;
    } else if (thisMonthOrders > 0) {
      totalOrdersChange = 100;
    }

    let productsChange = 0;
    if (lastMonthProducts > 0) {
      productsChange = ((thisMonthProducts - lastMonthProducts) / lastMonthProducts) * 100;
    } else if (thisMonthProducts > 0) {
      productsChange = 100;
    }

    let customersChange = 0;
    if (lastMonthCustomers > 0) {
      customersChange = ((thisMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100;
    } else if (thisMonthCustomers > 0) {
      customersChange = 100;
    }

    const totalStockValue = stockValueAgg && stockValueAgg.length > 0 ? stockValueAgg[0].totalStockValue || 0 : 0;
    const totalStockIssues = lowStockItems && lowStockItems.length > 0 ? lowStockItems[0].total || 0 : 0;
    
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
        calculationMethod: 'transaction_based',
        totalStockValue: totalStockValue,
        lowStockItems: totalStockIssues || 0,
        outOfStockItems: 0,
        negativeStockItems: 0,
        totalExpenses: totalExpenses,
        cashInHand: cashInHand,
      }
    };


    return res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSalesOverview = async (req, res) => {
  try {
    const userId = req.params.userId || (req.user && (req.user._id || req.user.id));
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    
    let objectUserId;
    try {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.json({ success: true, overview: [] });
    }

    const user = await User.findById(userId).select('businessId context');
    let queryUserId = objectUserId;
    
    if (user && user.businessId && user.context === 'company') {
      queryUserId = new mongoose.Types.ObjectId(user.businessId);
    } else if (user && user.context === 'company') {
      queryUserId = objectUserId;
    } else if (!user) {
      const companyUser = await User.findOne({ businessId: userId, context: 'company' });
      if (companyUser) {
        queryUserId = objectUserId;
      } else {
      }
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [salesAgg, creditAgg] = await Promise.all([
      Sale.aggregate([
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
      ]),
      (async () => {
        const CreditNote = (await import('../models/creditNote.js')).default;
        return CreditNote.aggregate([
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
      })()
    ]);

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

    return res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const userId = req.params.userId || (req.user && (req.user._id || req.user.id));
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    
    let objectUserId;
    try {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.json({ success: true, activities: [] });
    }

    const [Sale, Purchase, CreditNote, DeliveryChallan, Quotation, Item, Party] = await Promise.all([
      import('../models/sale.js').then(m => m.default),
      import('../models/purchase.js').then(m => m.default),
      import('../models/creditNote.js').then(m => m.default),
      import('../models/deliveryChallan.js').then(m => m.default),
      import('../models/quotation.js').then(m => m.default),
      import('../models/items.js').then(m => m.default),
      import('../models/parties.js').then(m => m.default),
    ]);

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

    const sorted = activities
      .filter(a => a.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);

    const result = { success: true, activities: sorted };

    return res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
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
    
    if (user.businessId && user.context === 'company') {
      profileData = {
        ...profileData,
        businessName: user.businessName || `${user.name}'s Business`,
        businessType: user.businessType || 'Individual',
        gstNumber: user.gstNumber || '',
        website: user.website || '',
        joinedCompany: true,
        companyId: user.businessId
      };
      
    } else {
      profileData = {
        ...profileData,
        businessName: user.businessName,
        businessType: user.businessType,
        gstNumber: user.gstNumber,
        website: user.website,
        joinedCompany: false
      };
      
    }
    
    return res.json({ success: true, user: profileData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const form = formidable({ multiples: false });
    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(400).json({ success: false, message: 'Form parse error' });
      
      const updateData = {};
      Object.keys(fields).forEach(key => {
        let value = fields[key];
        if (Array.isArray(value)) {
          value = value[0];
        }
        updateData[key] = value;
      });
      
      if (files.profileImage) {
        const file = files.profileImage;
        if (file && file.filepath && typeof file.filepath === 'string') {
          try {
            const fileBuffer = await fs.promises.readFile(file.filepath);
            const imageUrl = await uploadProfileImage(fileBuffer, `${userId}_profile`);
            updateData.profileImage = imageUrl;
          } catch (fileError) {
            return res.status(400).json({ success: false, message: 'Error processing uploaded file' });
          }
        } else {
          return res.status(400).json({ success: false, message: 'Invalid file upload' });
        }
      }
      delete updateData.password;
      const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select('-password');
      res.json({ success: true, user });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 

export const getReceivablesList = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection not available',
        data: []
      });
    }
    
    const objectUserId = new mongoose.Types.ObjectId(userId);
    
    const parties = await Party.find({ user: objectUserId }).select('name _id openingBalance firstOpeningBalance').lean();
    
    const receivables = [];
    
    for (const party of parties) {
      const openingBalance = party.openingBalance || 0;
      
      if (openingBalance > 0) {
        receivables.push({
          name: party.name,
          _id: party._id,
          amount: openingBalance,
          openingBalance: openingBalance
        });
      }
    }
    
    receivables.sort((a, b) => b.amount - a.amount);
    
    const response = { success: true, data: receivables };
    
    return res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPayablesList = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection not available',
        data: []
      });
    }
    
    const objectUserId = new mongoose.Types.ObjectId(userId);
    
    const parties = await Party.find({ user: objectUserId }).select('name _id openingBalance firstOpeningBalance').lean();
    
    const payables = [];
    
    for (const party of parties) {
      const openingBalance = party.openingBalance || 0;
      
      if (openingBalance < 0) {
        payables.push({
          name: party.name,
          _id: party._id,
          amount: Math.abs(openingBalance),
          openingBalance: openingBalance
        });
      }
    }
    
    payables.sort((a, b) => b.amount - a.amount);
    
    const response = { success: true, data: payables };
    
    return res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 


export const getDashboardPerformanceStats = async (req, res) => {
  try {
    const stats = {
      timestamp: new Date().toISOString(),
      parallelProcessing: {
        enabled: true,
        maxConcurrentOperations: 20,
        averageResponseTime: 'optimized',
        databaseConnections: 'pooled'
      }
    };
    
    return res.json({ success: true, data: stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get performance stats', error: err.message });
  }
};

export const getParallelProcessingDemo = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const startTime = Date.now();
    
    const [
      salesCount,
      purchasesCount,
      partiesCount,
      itemsCount,
      expensesCount,
      creditNotesCount
    ] = await Promise.all([
      Sale.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }).lean(),
      Purchase.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }).lean(),
      Party.countDocuments({ user: userId }).lean(),
      Item.countDocuments({ userId }).lean(),
      Expense.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }).lean(),
      CreditNote.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }).lean()
    ]);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    const result = {
      success: true,
      data: {
        parallelProcessing: {
          enabled: true,
          totalOperations: 6,
          processingTime: `${processingTime}ms`,
          averageTimePerOperation: `${Math.round(processingTime / 6)}ms`,
          efficiency: processingTime < 1000 ? 'Excellent' : processingTime < 2000 ? 'Good' : 'Needs Optimization'
        },
        counts: {
          sales: salesCount,
          purchases: purchasesCount,
          parties: partiesCount,
          items: itemsCount,
          expenses: expensesCount,
          creditNotes: creditNotesCount
        },
        timestamp: new Date().toISOString()
      }
    };
    
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to run parallel processing demo', error: err.message });
  }
};


export const createDashboardIndexes = async (req, res) => {
  try {
    await Promise.all([
      Sale.collection.createIndex({ userId: 1, createdAt: -1 }),
      Sale.collection.createIndex({ userId: 1, balance: 1 }),
      Sale.collection.createIndex({ userId: 1, grandTotal: 1 }),
      
      Purchase.collection.createIndex({ userId: 1, createdAt: -1 }),
      Purchase.collection.createIndex({ userId: 1, balance: 1 }),
      Purchase.collection.createIndex({ userId: 1, grandTotal: 1 }),
      
      Item.collection.createIndex({ userId: 1, stock: 1 }),
      Item.collection.createIndex({ userId: 1, purchasePrice: 1 }),
      Item.collection.createIndex({ userId: 1, minStock: 1 }),
      
      Party.collection.createIndex({ user: 1, createdAt: -1 }),
      
      Expense.collection.createIndex({ userId: 1, totalAmount: 1 }),
      
      CreditNote.collection.createIndex({ userId: 1, type: 1 }),
      CreditNote.collection.createIndex({ userId: 1, amount: 1 }),
      
      CashBank.collection.createIndex({ userId: 1, type: 1 }),
      CashBank.collection.createIndex({ userId: 1, amount: 1 }),
    ]);
    
    return res.json({ success: true, message: 'Database indexes created successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create indexes', error: err.message });
  }
};

export const testStockValue = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const items = await Item.find({ userId: userId }).select('name stock salePrice openingQuantity openingStockQuantity').lean();
    
    let totalStockValue = 0;
    const itemDetails = [];
    
    items.forEach(item => {
      const currentStock = item.stock || item.openingQuantity || item.openingStockQuantity || 0;
      const stockValue = currentStock * (item.salePrice || 0);
      totalStockValue += stockValue;
      itemDetails.push({
        name: item.name,
        stock: item.stock || 0,
        openingQuantity: item.openingQuantity || 0,
        openingStockQuantity: item.openingStockQuantity || 0,
        currentStock: currentStock,
        salePrice: item.salePrice || 0,
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
        itemsWithPrice: items.filter(item => (item.salePrice || 0) > 0).length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to test stock value', error: err.message });
  }
};

export const getStockSummary = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

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

export const getPartyBalances = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection not available',
        data: {
          payables: [],
          receivables: [],
          totalPayable: 0,
          totalReceivable: 0,
          totalParties: 0,
          calculationMethod: 'offline_mode'
        }
      });
    }
    
    const objectUserId = new mongoose.Types.ObjectId(userId);
    
    const [parties, transactionData] = await Promise.all([
      Party.find({ user: objectUserId }).select('name _id openingBalance firstOpeningBalance').lean(),
      (async () => {
        const allParties = await Party.find({ user: objectUserId }).select('name').lean();
        return Promise.all(
          allParties.map(async (party) => {
            const balances = await _calculatePartyOutstandingBalances(userId, party.name);
            return {
              name: party.name,
              transactionReceivable: balances.totalReceivable,
              transactionPayable: balances.totalPayable
            };
          })
        );
      })()
    ]);
    
    const partyBalanceCalculations = await Promise.all(
      parties.map(async (party, index) => {
        const openingBalance = party.openingBalance || 0;
        const partyTransactionData = transactionData[index] || { transactionReceivable: 0, transactionPayable: 0 };
        
        let category = 'neutral';
        let amount = 0;
        
        if (openingBalance > 0) {
          category = 'receivable';
          amount = openingBalance;
        } else if (openingBalance < 0) {
          category = 'payable';
          amount = Math.abs(openingBalance);
        }
        
        return {
          _id: party._id,
          name: party.name,
          openingBalance: openingBalance,
          category: category,
          amount: amount,
          transactionReceivable: partyTransactionData.transactionReceivable,
          transactionPayable: partyTransactionData.transactionPayable
        };
      })
    );
    
    const [payables, receivables] = await Promise.all([
      Promise.resolve(partyBalanceCalculations.filter(p => p.category === 'payable').sort((a, b) => b.amount - a.amount)),
      Promise.resolve(partyBalanceCalculations.filter(p => p.category === 'receivable').sort((a, b) => b.amount - a.amount))
    ]);
    
    const result = {
      success: true,
      data: {
        payables: payables,
        receivables: receivables,
        totalPayable: payables.reduce((sum, p) => sum + p.amount, 0),
        totalReceivable: receivables.reduce((sum, p) => sum + p.amount, 0),
        totalParties: parties.length,
        calculationMethod: 'opening_balance_with_transactions'
      }
    };
    
    
    return res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 