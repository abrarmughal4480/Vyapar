import Sale from '../models/sale.js';
import Purchase from '../models/purchase.js';
import Party from '../models/parties.js';
import mongoose from 'mongoose';
// Add other models as needed (e.g., Payment, Items)

/**
 * Get Profit and Loss report for a user and date range
 * Returns all particulars needed for the frontend P&L table
 */
export const getProfitAndLoss = async (req, res) => {
  try {
    console.log("[P&L] API hit");
    console.log("[P&L] req.user:", req.user);
    const userId = req.user && (req.user._id || req.user.id);
    console.log("[P&L] userId:", userId);
    if (!userId) {
      console.log("[P&L] No userId found, returning 401");
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    console.log("[P&L] userId length:", userId.length, "value:", JSON.stringify(userId));
    let objectUserId = userId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      objectUserId = new mongoose.Types.ObjectId(userId);
      console.log("[P&L] objectUserId (as ObjectId):", objectUserId);
    } else {
      console.log("[P&L] objectUserId (as String):", objectUserId);
    }
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    // Credit Notes
    const creditNotes = await mongoose.model('CreditNote').aggregate([
      { $match: { userId: objectUserId, ...(from || to ? { createdAt: dateFilter } : {}) } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const creditNoteTotal = creditNotes[0]?.total || 0;

    // Sales - Calculate actual sale amounts after item-level discounts
    const sales = await Sale.aggregate([
      { $match: { userId: objectUserId, ...(from || to ? { createdAt: dateFilter } : {}) } },
      {
        $addFields: {
          // Calculate actual sale amount for each item (after discounts)
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
          saleFA: { $sum: 0 }, // Placeholder for Sale FA
          creditNote: { $sum: 0 }, // Placeholder for Credit Note
          debitNote: { $sum: 0 }, // Placeholder for Debit Note
          taxReceivable: { $sum: 0 }, // Placeholder for Tax Receivable
          tcsReceivable: { $sum: 0 }, // Placeholder for TCS Receivable
          tdsReceivable: { $sum: 0 }, // Placeholder for TDS Receivable
        }
      }
    ]);
    const saleTotal = sales[0]?.total || 0;

    // Purchases - Calculate actual purchase amounts after item-level discounts
    const purchases = await Purchase.aggregate([
      { $match: { userId: objectUserId, ...(from || to ? { createdAt: dateFilter } : {}) } },
      {
        $addFields: {
          // Calculate actual purchase amount for each item (after discounts)
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
          purchaseFA: { $sum: 0 }, // Placeholder for Purchase FA
        }
      }
    ]);
    const purchaseTotal = purchases[0]?.total || 0;

    // Opening/Closing Stock (for now, use openingBalance from parties as opening stock, closing stock logic can be added)
    const openingStock = await Party.aggregate([
      { $match: { user: objectUserId } },
      { $group: { _id: null, total: { $sum: '$openingBalance' } } }
    ]);
    const openingStockTotal = openingStock[0]?.total || 0;
    // For closing stock, you may need a separate logic or model
    // Closing Stock (sum of all items' stock * purchasePrice)
    const items = await mongoose.model('Item').find({ userId: objectUserId });
    const closingStockTotal = items.reduce((sum, item) => {
      const stock = item.stock || 0;
      const price = item.purchasePrice || 0;
      return sum + (stock * price);
    }, 0);

    // Direct/Indirect Expenses, Taxes, Other Income/Expense, etc. (placeholders)
    // You can add more aggregation from other models as needed
    const particulars = [
      { name: 'Sale (+)', amount: saleTotal },
      { name: 'Credit Note (-)', amount: creditNoteTotal },
      { name: 'Sale FA (+)', amount: 0 },
      { name: 'Purchase (-)', amount: purchaseTotal },
      { name: 'Debit Note (+)', amount: 0 },
      { name: 'Purchase FA (-)', amount: 0 },
      { name: 'Direct Expenses(-)', amount: 0 },
      { name: 'Other Direct Expenses (-)', amount: 0 },
      { name: 'Payment-in Discount (-)', amount: 0 },
      { name: 'Tax Payable (-)', amount: 0 },
      { name: 'TCS Payable (-)', amount: 0 },
      { name: 'TDS Payable (-)', amount: 0 },
      { name: 'Tax Receivable (+)', amount: 0 },
      { name: 'TCS Receivable (+)', amount: 0 },
      { name: 'TDS Receivable (+)', amount: 0 },
      { name: 'Opening Stock (-)', amount: openingStockTotal },
      { name: 'Closing Stock (+)', amount: closingStockTotal },
      { name: 'Opening Stock FA (-)', amount: 0 },
      { name: 'Closing Stock FA (+)', amount: 0 },
      { name: 'Other Income (+)', amount: 0 },
      { name: 'Other Expense', amount: 0 },
      { name: 'Loan Interest Expense', amount: 0 },
      { name: 'Loan Processing Fee Expense', amount: 0 },
      { name: 'Loan Charges Expense', amount: 0 },
    ];

    res.json({ success: true, data: particulars });
  } catch (err) {
    console.log("[P&L] Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getProfitAndLoss }; 