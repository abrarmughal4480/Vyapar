import CashBank from '../models/cashBank.js';
import Sale from '../models/sale.js';
import Purchase from '../models/purchase.js';
import CreditNote from '../models/creditNote.js';
import Expense from '../models/expense.js';
import mongoose from 'mongoose';

// Get cash in hand summary
export const getCashInHandSummary = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    let cashInHand = 0;

    // Fetch transaction data
    const sales = await Sale.find({ userId })
      .select('invoiceNo partyName grandTotal received balance paymentType createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    const purchases = await Purchase.find({ userId })
      .select('billNo supplierName grandTotal paid balance paymentType createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    const creditNotes = await CreditNote.find({ userId })
      .select('creditNoteNo partyName amount type createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    const expenses = await Expense.find({ userId })
      .select('expenseNumber party totalAmount paymentType expenseDate createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate transaction totals
    const totalSales = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
    const totalReceived = sales.reduce((sum, sale) => sum + (sale.received || 0), 0);
    const totalSalesBalance = sales.reduce((sum, sale) => sum + (sale.balance || 0), 0);

    const totalPurchases = purchases.reduce((sum, purchase) => sum + (purchase.grandTotal || 0), 0);
    const totalPaid = purchases.reduce((sum, purchase) => sum + (purchase.paid || 0), 0);
    const totalPurchaseBalance = purchases.reduce((sum, purchase) => sum + (purchase.balance || 0), 0);

    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.totalAmount || 0), 0);

    const totalCreditNotes = creditNotes.reduce((sum, note) => {
      const amount = Number(note.amount) || 0;
      if (isNaN(amount)) return sum;
      
      if (note.type === 'Sale') {
        return sum + amount;
      } else {
        return sum - amount;
      }
    }, 0);

    // Fetch cash adjustments
    const cashAdjustments = await CashBank.find({ userId }).sort({ createdAt: 1 });
    const totalCashAdjustments = cashAdjustments.reduce((sum, adjustment) => {
      if (adjustment.type === 'Income') {
        return sum + adjustment.amount;
      } else if (adjustment.type === 'Expense') {
        return sum - adjustment.amount;
      }
      return sum;
    }, 0);

    // Calculate net cash flow
    const netCashFlow = totalReceived - totalPaid - totalExpenses + totalCreditNotes;
    
    // Calculate final cash in hand
    cashInHand = netCashFlow + totalCashAdjustments;

    res.status(200).json({
      success: true,
      data: {
        cashInHand,
        summary: {
          totalSales,
          totalReceived,
          totalSalesBalance,
          totalPurchases,
          totalPaid,
          totalPurchaseBalance,
          totalExpenses,
          totalCreditNotes,
          netCashFlow
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

// Get detailed cash flow
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

    // Fetch transactions by date range
    const sales = await Sale.find({ userId, ...dateQuery })
      .select('invoiceNo partyName grandTotal received balance paymentType createdAt')
      .sort({ createdAt: -1 });

    const purchases = await Purchase.find({ userId, ...dateQuery })
      .select('billNo supplierName grandTotal paid balance paymentType createdAt')
      .sort({ createdAt: -1 });

    const creditNotes = await CreditNote.find({ userId, ...dateQuery })
      .select('creditNoteNo partyName amount type createdAt')
      .sort({ createdAt: -1 });

    const expenses = await Expense.find({ userId, ...dateQuery })
      .select('expenseNumber party totalAmount paymentType expenseDate createdAt')
      .sort({ createdAt: -1 });

    // Format and combine transactions
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

// Add cash adjustment
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

    // Calculate current balance
    const [sales, purchases, creditNotes, expenses, existingCashAdjustments] = await Promise.all([
      Sale.find({ userId }).select('grandTotal received'),
      Purchase.find({ userId }).select('grandTotal paid'),
      CreditNote.find({ userId }).select('amount type'),
      Expense.find({ userId }).select('totalAmount'),
      CashBank.find({ userId }).sort({ createdAt: 1 })
    ]);

    // Calculate business cash flow
    const totalReceived = sales.reduce((sum, sale) => sum + (sale.received || 0), 0);
    const totalPaid = purchases.reduce((sum, purchase) => sum + (purchase.paid || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.totalAmount || 0), 0);
    const totalCreditNotes = creditNotes.reduce((sum, note) => {
      const amount = Number(note.amount) || 0;
      if (isNaN(amount)) return sum;
      if (note.type === 'Sale') {
        return sum + amount;
      } else {
        return sum - amount;
      }
    }, 0);

    const businessNetCashFlow = totalReceived - totalPaid - totalExpenses + totalCreditNotes;

    // Calculate existing adjustments
    const totalExistingAdjustments = existingCashAdjustments.reduce((sum, adjustment) => {
      if (adjustment.type === 'Income') {
        return sum + adjustment.amount;
      } else if (adjustment.type === 'Expense') {
        return sum - adjustment.amount;
      }
      return sum;
    }, 0);
    
    // Calculate current balance
    const currentBalance = businessNetCashFlow + totalExistingAdjustments;

    // Apply new adjustment
    let newBalance = currentBalance;
    if (type === 'Income') {
      newBalance += Number(amount);
    } else if (type === 'Expense') {
      newBalance -= Number(amount);
    }

    // Save new transaction
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

// Get all transactions
export const getCashBankTransactions = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { page = 1, limit = 20, type } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Fetch all transaction types
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

    // Format and combine transactions
    const allTransactions = [
      ...sales.map(sale => ({
        id: sale._id.toString(),
        type: 'Sale',
        reference: sale.invoiceNo,
        party: (sale.partyName && sale.partyName !== 'Unknown' && sale.partyName !== 'unknown') ? sale.partyName : '',
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
        party: (purchase.supplierName && purchase.supplierName !== 'Unknown' && purchase.supplierName !== 'unknown') ? purchase.supplierName : '',
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
        party: (note.partyName && note.partyName !== 'Unknown' && note.partyName !== 'unknown') ? note.partyName : '',
        amount: Number(note.amount) || 0,
        noteType: note.type,
        date: note.createdAt,
        category: 'Credit Notes'
      })),
      ...expenses.map(expense => ({
        id: expense._id.toString(),
        type: 'Expense',
        reference: expense.expenseNumber,
        party: (expense.party && expense.party !== 'Unknown' && expense.party !== 'unknown') ? expense.party : '',
        amount: expense.totalAmount,
        paymentType: expense.paymentType,
        date: expense.expenseDate,
        category: 'Expenses'
      })),
      ...cashAdjustments.map(adjustment => ({
        id: adjustment._id.toString(),
        type: adjustment.type,
        reference: `Cash Adjustment`,
        party: '',
        amount: adjustment.amount,
        description: adjustment.description,
        date: adjustment.date,
        category: 'Cash Adjustments'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate pagination totals
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

// Update cash adjustment
export const updateCashAdjustment = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { id } = req.params;
    const { type, amount, description, date } = req.body;
    
    if (!type || !amount || !date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Find the existing transaction
    const existingTransaction = await CashBank.findById(id);
    if (!existingTransaction || existingTransaction.userId.toString() !== userId.toString()) {
      return res.status(404).json({ success: false, message: 'Cash adjustment not found' });
    }

    // Calculate current cash balance using the same logic as getCashInHandSummary
    const [sales, purchases, creditNotes, expenses, existingCashAdjustments] = await Promise.all([
      Sale.find({ userId }).select('grandTotal received'),
      Purchase.find({ userId }).select('grandTotal paid'),
      CreditNote.find({ userId }).select('amount type'),
      Expense.find({ userId }).select('totalAmount'),
      CashBank.find({ userId }).sort({ createdAt: 1 })
    ]);

    // Calculate business cash flow
    const totalReceived = sales.reduce((sum, sale) => sum + (sale.received || 0), 0);
    const totalPaid = purchases.reduce((sum, purchase) => sum + (purchase.paid || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.totalAmount || 0), 0);
    const totalCreditNotes = creditNotes.reduce((sum, note) => {
      const amount = Number(note.amount) || 0;
      if (isNaN(amount)) return sum;
      if (note.type === 'Sale') {
        return sum + amount;
      } else {
        return sum - amount;
      }
    }, 0);

    const businessNetCashFlow = totalReceived - totalPaid - totalExpenses + totalCreditNotes;

    // Calculate existing adjustments (excluding the one being updated)
    const totalExistingAdjustments = existingCashAdjustments
      .filter(adj => adj._id.toString() !== id)
      .reduce((sum, adjustment) => {
        if (adjustment.type === 'Income') {
          return sum + adjustment.amount;
        } else if (adjustment.type === 'Expense') {
          return sum - adjustment.amount;
        }
        return sum;
      }, 0);
    
    // Calculate current balance
    const currentBalance = businessNetCashFlow + totalExistingAdjustments;

    // Apply new adjustment
    let newBalance = currentBalance;
    if (type === 'Income') {
      newBalance += Number(amount);
    } else if (type === 'Expense') {
      newBalance -= Number(amount);
    }

    // Update the transaction
    const updatedTransaction = await CashBank.findByIdAndUpdate(
      id,
      {
        type,
        amount: Number(amount),
        description,
        date: new Date(date),
        cashInHand: newBalance
      },
      { new: true }
    );


    res.status(200).json({
      success: true,
      message: 'Cash adjustment updated successfully',
      data: {
        transaction: updatedTransaction,
        newBalance: newBalance
      }
    });

  } catch (error) {
    console.error('Error updating cash adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete cash adjustment
export const deleteCashAdjustment = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { id } = req.params;

    // Find the existing transaction
    const existingTransaction = await CashBank.findById(id);
    if (!existingTransaction || existingTransaction.userId.toString() !== userId.toString()) {
      return res.status(404).json({ success: false, message: 'Cash adjustment not found' });
    }

    // Delete the transaction
    await CashBank.findByIdAndDelete(id);


    res.status(200).json({
      success: true,
      message: 'Cash adjustment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting cash adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
