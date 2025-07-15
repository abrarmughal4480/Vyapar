import Sale from '../models/sale.js';
import Purchase from '../models/purchase.js';
import Party from '../models/parties.js';
import Item from '../models/items.js';
import mongoose from 'mongoose';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Dates for current and previous month
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [sales, purchases, customers, items, revenueAgg, thisMonthAgg, lastMonthAgg, thisMonthOrders, lastMonthOrders, thisMonthProducts, lastMonthProducts, thisMonthCustomers, lastMonthCustomers, totalOrders] = await Promise.all([
      Sale.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Purchase.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Party.countDocuments({ user: userId }),
      Item.countDocuments({ userId }),
      Sale.aggregate([{ $match: { userId } }, { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' } } }]),
      Sale.aggregate([
        { $match: { userId, createdAt: { $gte: startOfThisMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      Sale.aggregate([
        { $match: { userId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      Sale.countDocuments({ userId, createdAt: { $gte: startOfThisMonth } }),
      Sale.countDocuments({ userId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Item.countDocuments({ userId, createdAt: { $gte: startOfThisMonth } }),
      Item.countDocuments({ userId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Party.countDocuments({ user: userId, createdAt: { $gte: startOfThisMonth } }),
      Party.countDocuments({ user: userId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Sale.countDocuments({ userId }), // <-- total orders
    ]);

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

    res.json({
      success: true,
      data: {
        totalSales: sales[0]?.total || 0,
        totalPurchases: purchases[0]?.total || 0,
        totalCustomers: customers,
        itemsInStock: items,
        totalRevenue: revenueAgg[0]?.totalRevenue || 0,
        revenueChange,
        totalOrdersChange,
        productsChange,
        customersChange,
        totalOrders: totalOrders || 0,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSalesOverview = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
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

    res.json({ success: true, overview: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
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

    // Fetch last 3 from each, then merge and sort
    const [sales, purchases, creditNotes, challans, quotations, items, parties] = await Promise.all([
      Sale.find({ userId: objectUserId }).sort({ createdAt: -1 }).limit(3),
      Purchase.find({ userId: objectUserId }).sort({ createdAt: -1 }).limit(3),
      CreditNote.find({ userId: objectUserId }).sort({ createdAt: -1 }).limit(3),
      DeliveryChallan.find({ userId: objectUserId }).sort({ createdAt: -1 }).limit(3),
      Quotation.find({ userId: objectUserId }).sort({ createdAt: -1 }).limit(3),
      Item.find({ userId: objectUserId }).sort({ createdAt: -1 }).limit(3),
      Party.find({ user: objectUserId }).sort({ createdAt: -1 }).limit(3),
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

    res.json({ success: true, activities: sorted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 