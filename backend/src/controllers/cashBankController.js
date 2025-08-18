import CashBank from '../models/cashBank.js';
import Sale from '../models/sale.js';
import Purchase from '../models/purchase.js';
import CreditNote from '../models/creditNote.js';
import Expense from '../models/expense.js';
import mongoose from 'mongoose';

// Get cash in hand summary with all related data
export const getCashInHandSummary = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Get current cash balance - look for the most recent transaction to get current balance
    let cashInHand = 0;
    const latestTransaction = await CashBank.findOne({ userId }).sort({ createdAt: -1 });
    if (latestTransaction) {
      cashInHand = latestTransaction.cashInHand;
    }

    // Get sales data
    const sales = await Sale.find({ userId })
      .select('invoiceNo partyName grandTotal received balance paymentType createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get purchases data
    const purchases = await Purchase.find({ userId })
      .select('billNo supplierName grandTotal paid balance paymentType createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get credit notes data
    const creditNotes = await CreditNote.find({ userId })
      .select('creditNoteNo partyName amount type createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get expenses data
    const expenses = await Expense.find({ userId })
      .select('expenseNumber party totalAmount paymentType expenseDate createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate totals
    const totalSales = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
    const totalReceived = sales.reduce((sum, sale) => sum + (sale.received || 0), 0);
    const totalSalesBalance = sales.reduce((sum, sale) => sum + (sale.balance || 0), 0);

    const totalPurchases = purchases.reduce((sum, purchase) => sum + (purchase.grandTotal || 0), 0);
    const totalPaid = purchases.reduce((sum, purchase) => sum + (purchase.paid || 0), 0);
    const totalPurchaseBalance = purchases.reduce((sum, purchase) => sum + (purchase.balance || 0), 0);

    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.totalAmount || 0), 0);

    const totalCreditNotes = creditNotes.reduce((sum, note) => {
      const amount = Number(note.amount) || 0;
      if (isNaN(amount)) return sum; // Skip invalid amounts
      
      if (note.type === 'Sale') {
        return sum + amount; // Reduce from sales (credit note reduces sales)
      } else {
        return sum - amount; // Add to purchases (credit note reduces purchases)
      }
    }, 0);

    // Calculate net cash flow - this represents the actual cash available
    // Net Cash Flow = Total Received - Total Expenses + Credit Notes (if they add cash)
    const netCashFlow = totalReceived - totalExpenses + totalCreditNotes;
    
    // Calculate final cash in hand
    // Cash in Hand = Net Cash Flow + Cash Adjustments
    let totalCashAdjustments = 0;
    if (latestTransaction) {
      // Get all cash adjustments and sum them up
      const allCashAdjustments = await CashBank.find({ userId }).sort({ createdAt: 1 });
      totalCashAdjustments = allCashAdjustments.reduce((sum, adjustment) => {
        if (adjustment.type === 'Income') {
          return sum + adjustment.amount;
        } else if (adjustment.type === 'Expense') {
          return sum - adjustment.amount;
        }
        return sum;
      }, 0);
    }
    
    // Final cash in hand = Business net cash flow + total cash adjustments
    cashInHand = netCashFlow + totalCashAdjustments;

    res.status(200).json({
      success: true,
      data: {
        cashInHand: cashInHand, // Current cash balance (from adjustments or calculated from net cash flow)
        summary: {
          totalSales,           // Total sales amount
          totalReceived,         // Total cash received from sales
          totalSalesBalance,     // Outstanding sales balance
          totalPurchases,        // Total purchases amount
          totalPaid,            // Total cash paid for purchases
          totalPurchaseBalance,  // Outstanding purchase balance
          totalExpenses,        // Total expenses paid
          totalCreditNotes,     // Net effect of credit notes
          netCashFlow           // Net cash flow = Total Received - Total Expenses + Credit Notes
        },
        recentTransactions: {
          sales: sales.slice(0, 10),
          purchases: purchases.slice(0, 10),
          creditNotes: creditNotes.slice(0, 10),
          expenses: expenses.slice(0, 10)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching cash in hand summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get detailed cash flow for a date range
export const getCashFlowDetails = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { startDate, endDate, type } = req.query;
    
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    let typeQuery = {};
    if (type) {
      typeQuery = { type };
    }

    // Get sales in date range
    const sales = await Sale.find({ userId, ...dateQuery })
      .select('invoiceNo partyName grandTotal received balance paymentType createdAt')
      .sort({ createdAt: -1 });

    // Get purchases in date range
    const purchases = await Purchase.find({ userId, ...dateQuery })
      .select('billNo supplierName grandTotal paid balance paymentType createdAt')
      .sort({ createdAt: -1 });

    // Get credit notes in date range
    const creditNotes = await CreditNote.find({ userId, ...dateQuery })
      .select('creditNoteNo partyName amount type createdAt')
      .sort({ createdAt: -1 });

    // Get expenses in date range
    const expenses = await Expense.find({ userId, ...dateQuery })
      .select('expenseNumber party totalAmount paymentType expenseDate createdAt')
      .sort({ createdAt: -1 });

    // Combine all transactions
    const allTransactions = [
      ...sales.map(sale => ({
        type: 'Sale',
        reference: sale.invoiceNo,
        party: sale.partyName,
        amount: sale.grandTotal,
        received: sale.received,
        balance: sale.balance,
        paymentType: sale.paymentType,
        date: sale.createdAt,
        category: 'Sales'
      })),
      ...purchases.map(purchase => ({
        type: 'Purchase',
        reference: purchase.billNo,
        party: purchase.supplierName,
        amount: purchase.grandTotal,
        paid: purchase.paid,
        balance: purchase.balance,
        paymentType: purchase.paymentType,
        date: purchase.createdAt,
        category: 'Purchases'
      })),
      ...creditNotes.map(note => ({
        type: 'Credit Note',
        reference: note.creditNoteNo,
        party: note.partyName,
        amount: note.amount,
        noteType: note.type,
        date: note.createdAt,
        category: 'Credit Notes'
      })),
      ...expenses.map(expense => ({
        type: 'Expense',
        reference: expense.expenseNumber,
        party: expense.party,
        amount: expense.totalAmount,
        paymentType: expense.paymentType,
        date: expense.expenseDate,
        category: 'Expenses'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      data: allTransactions
    });

  } catch (error) {
    console.error('Error fetching cash flow details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Add cash adjustment transaction
export const addCashAdjustment = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { type, amount, description, date } = req.body;
    
    if (!type || !amount || !date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Calculate current cash balance
    // First, get the net cash flow from business operations
    const [sales, purchases, creditNotes, expenses] = await Promise.all([
      Sale.find({ userId }).select('grandTotal received'),
      Purchase.find({ userId }).select('grandTotal paid'),
      CreditNote.find({ userId }).select('amount type'),
      Expense.find({ userId }).select('totalAmount')
    ]);

    // Calculate net cash flow from business operations
    const totalReceived = sales.reduce((sum, sale) => sum + (sale.received || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.totalAmount || 0), 0);
    const totalCreditNotes = creditNotes.reduce((sum, note) => {
      const amount = Number(note.amount) || 0;
      if (isNaN(amount)) return sum;
      if (note.type === 'Sale') {
        return sum + amount; // Credit note reduces sales
      } else {
        return sum - amount; // Credit note reduces purchases
      }
    }, 0);

    const businessNetCashFlow = totalReceived - totalExpenses + totalCreditNotes;

    // Calculate current balance from business operations + existing cash adjustments
    let currentBalance = businessNetCashFlow;
    
    // Get all existing cash adjustments and add them to business net cash flow
    const existingCashAdjustments = await CashBank.find({ userId }).sort({ createdAt: 1 });
    const totalExistingAdjustments = existingCashAdjustments.reduce((sum, adjustment) => {
      if (adjustment.type === 'Income') {
        return sum + adjustment.amount;
      } else if (adjustment.type === 'Expense') {
        return sum - adjustment.amount;
      }
      return sum;
    }, 0);
    
    currentBalance = businessNetCashFlow + totalExistingAdjustments;

    // Calculate new balance
    let newBalance = currentBalance;
    if (type === 'Income') {
      newBalance += Number(amount);
    } else if (type === 'Expense') {
      newBalance -= Number(amount);
    }

    // Add transaction with updated balance
    const newTransaction = new CashBank({
      userId,
      type,
      amount: Number(amount),
      description,
      date: new Date(date),
      cashInHand: newBalance
    });

    await newTransaction.save();

    res.status(201).json({
      success: true,
      message: 'Cash adjustment added successfully',
      data: {
        transaction: newTransaction,
        newBalance: newBalance
      }
    });

  } catch (error) {
    console.error('Error adding cash adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get cash bank transactions
export const getCashBankTransactions = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { page = 1, limit = 20, type } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Get all types of transactions
    const [sales, purchases, creditNotes, expenses, cashAdjustments] = await Promise.all([
      Sale.find({ userId })
        .select('invoiceNo partyName grandTotal received balance paymentType createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Purchase.find({ userId })
        .select('billNo supplierName grandTotal paid balance paymentType createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CreditNote.find({ userId })
        .select('creditNoteNo partyName amount type createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.find({ userId })
        .select('expenseNumber party totalAmount paymentType expenseDate createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CashBank.find({ userId })
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
    ]);

    // Combine all transactions
    const allTransactions = [
      ...sales.map(sale => ({
        id: sale._id.toString(),
        type: 'Sale',
        reference: sale.invoiceNo,
        party: sale.partyName,
        amount: sale.grandTotal,
        received: sale.received,
        balance: sale.balance,
        paymentType: sale.paymentType,
        date: sale.createdAt,
        category: 'Sales'
      })),
      ...purchases.map(purchase => ({
        id: purchase._id.toString(),
        type: 'Purchase',
        reference: purchase.billNo,
        party: purchase.supplierName,
        amount: purchase.grandTotal,
        paid: purchase.paid,
        balance: purchase.balance,
        paymentType: purchase.paymentType,
        date: purchase.createdAt,
        category: 'Purchases'
      })),
      ...creditNotes.map(note => ({
        id: note._id.toString(),
        type: 'Credit Note',
        reference: note.creditNoteNo,
        party: note.partyName,
        amount: Number(note.amount) || 0,
        noteType: note.type,
        date: note.createdAt,
        category: 'Credit Notes'
      })),
      ...expenses.map(expense => ({
        id: expense._id.toString(),
        type: 'Expense',
        reference: expense.expenseNumber,
        party: expense.party,
        amount: expense.totalAmount,
        paymentType: expense.paymentType,
        date: expense.expenseDate,
        category: 'Expenses'
      })),
      ...cashAdjustments.map(adjustment => ({
        id: adjustment._id.toString(),
        type: adjustment.type,
        reference: `Cash Adjustment`,
        party: '-',
        amount: adjustment.amount,
        description: adjustment.description,
        date: adjustment.date,
        category: 'Cash Adjustments'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Get total count for pagination
    const [salesCount, purchasesCount, creditNotesCount, expensesCount, cashAdjustmentsCount] = await Promise.all([
      Sale.countDocuments({ userId }),
      Purchase.countDocuments({ userId }),
      CreditNote.countDocuments({ userId }),
      Expense.countDocuments({ userId }),
      CashBank.countDocuments({ userId })
    ]);

    const total = salesCount + purchasesCount + creditNotesCount + expensesCount + cashAdjustmentsCount;

    res.status(200).json({
      success: true,
      data: allTransactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching cash bank transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
