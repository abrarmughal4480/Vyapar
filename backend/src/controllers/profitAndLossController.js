import Sale from '../models/sale.js';
import Purchase from '../models/purchase.js';
import Party from '../models/parties.js';
import Expense from '../models/expense.js';
import mongoose from 'mongoose';

export const getProfitAndLoss = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    let objectUserId = userId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      objectUserId = new mongoose.Types.ObjectId(userId);
    }
    
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const creditNotes = await mongoose.model('CreditNote').aggregate([
      { $match: { userId: objectUserId, ...(from || to ? { createdAt: dateFilter } : {}) } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const creditNoteTotal = creditNotes[0]?.total || 0;

    const sales = await Sale.aggregate([
      { $match: { userId: objectUserId, ...(from || to ? { createdAt: dateFilter } : {}) } },
      {
        $addFields: {
          itemsWithActualPrices: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                $let: {
                  vars: {
                    originalPrice: { $multiply: ['$$item.qty', '$$item.price'] },
                    itemDiscount: {
                      $cond: {
                        if: { $ne: ['$$item.discountPercentage', ''] },
                        then: { $divide: [{ $multiply: [{ $multiply: ['$$item.qty', '$$item.price'] }, { $toDouble: '$$item.discountPercentage' }] }, 100] },
                        else: {
                          $cond: {
                            if: { $ne: ['$$item.discountAmount', ''] },
                            then: { $toDouble: '$$item.discountAmount' },
                            else: 0
                          }
                        }
                      }
                    }
                  },
                  in: {
                    $subtract: ['$$originalPrice', '$$itemDiscount']
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $sum: '$itemsWithActualPrices' } },
          saleFA: { $sum: 0 },
          creditNote: { $sum: 0 },
          debitNote: { $sum: 0 },
          taxReceivable: { $sum: 0 },
          tcsReceivable: { $sum: 0 },
          tdsReceivable: { $sum: 0 },
        }
      }
    ]);
    const saleTotal = sales[0]?.total || 0;

    const purchases = await Purchase.aggregate([
      { $match: { userId: objectUserId, ...(from || to ? { createdAt: dateFilter } : {}) } },
      {
        $addFields: {
          itemsWithActualPrices: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                $let: {
                  vars: {
                    originalPrice: { $multiply: ['$$item.qty', '$$item.price'] },
                    itemDiscount: {
                      $cond: {
                        if: { $ne: ['$$item.discountPercentage', ''] },
                        then: { $divide: [{ $multiply: [{ $multiply: ['$$item.qty', '$$item.price'] }, { $toDouble: '$$item.discountPercentage' }] }, 100] },
                        else: {
                          $cond: {
                            if: { $ne: ['$$item.discountAmount', ''] },
                            then: { $toDouble: '$$item.discountAmount' },
                            else: 0
                          }
                        }
                      }
                    }
                  },
                  in: {
                    $subtract: ['$$originalPrice', '$$itemDiscount']
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $sum: '$itemsWithActualPrices' } },
          purchaseFA: { $sum: 0 },
        }
      }
    ]);
    const purchaseTotal = purchases[0]?.total || 0;

    const openingStock = await Party.aggregate([
      { $match: { user: objectUserId } },
      { $group: { _id: null, total: { $sum: '$openingBalance' } } }
    ]);
    const openingStockTotal = openingStock[0]?.total || 0;
    
    const items = await mongoose.model('Item').find({ userId: objectUserId });
    const closingStockTotal = items.reduce((sum, item) => {
      const stock = item.stock || 0;
      const price = item.purchasePrice || 0;
      return sum + (stock * price);
    }, 0);

    const expenses = await Expense.aggregate([
      { $match: { userId: objectUserId, ...(from || to ? { expenseDate: dateFilter } : {}) } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalExpenses = expenses[0]?.total || 0;

    const paymentInDiscounts = await Sale.aggregate([
      { $match: { userId: objectUserId, ...(from || to ? { createdAt: dateFilter } : {}) } },
      { $match: { discountValue: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$discountValue' } } }
    ]);
    const totalPaymentInDiscounts = paymentInDiscounts[0]?.total || 0;

    const netTaxAdjustment = 0;

    const particulars = [
      { name: 'Sale (+)', amount: saleTotal },
      { name: 'Credit Note (-)', amount: creditNoteTotal },
      { name: 'Purchase (-)', amount: purchaseTotal },
      { name: 'Debit Note (+)', amount: 0 },
      { name: 'Opening Stock (-)', amount: openingStockTotal },
      { name: 'Closing Stock (+)', amount: closingStockTotal },
      { name: 'Direct Expenses(-)', amount: totalExpenses },
      { name: 'Other Direct Expenses (-)', amount: 0 },
      { name: 'Net Tax Adjustment', amount: netTaxAdjustment },
      { name: 'Other Income (+)', amount: totalPaymentInDiscounts },
      { name: 'Other Expense', amount: 0 },
      { name: 'Loan Interest Expense', amount: 0 },
      { name: 'Loan Processing Fee Expense', amount: 0 },
      { name: 'Loan Charges Expense', amount: 0 },
    ];

    res.json({ success: true, data: particulars });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getProfitAndLoss }; 