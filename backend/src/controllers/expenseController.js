import Expense from '../models/expense.js';
import mongoose from 'mongoose';

// Create new expense
export const createExpense = async (req, res) => {
  try {
    const { expenseCategory, party, partyId, items, totalAmount, paymentType, receivedAmount, expenseDate, description } = req.body;
    
    console.log('Received expense data:', req.body);
    console.log('Party ID:', partyId);
    console.log('Payment Type:', paymentType);
    console.log('Received Amount:', receivedAmount);
    
    if (!expenseCategory || !party || !items || !Array.isArray(items) || items.length === 0 || !totalAmount || !paymentType || !expenseDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Generate expense number
    const lastExpense = await Expense.findOne({ userId }).sort({ createdAt: -1 });
    let expenseNumber = 'EXP-001';
    if (lastExpense) {
      const lastNumber = parseInt(lastExpense.expenseNumber.split('-')[1]);
      expenseNumber = `EXP-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Calculate received amount and credit amount
    let finalReceivedAmount = receivedAmount || 0;
    let creditAmount = 0;
    
    if (paymentType === 'Cash') {
      // For cash payments, received amount is 100% of total
      finalReceivedAmount = totalAmount;
      creditAmount = 0;
    } else if (paymentType === 'Credit') {
      // For credit payments, calculate remaining amount
      creditAmount = totalAmount - (finalReceivedAmount || 0);
    }

    // Get party's current balance and update it
    let partyBalanceAfterTransaction = 0;
    try {
      const Party = (await import('../models/parties.js')).default;
      
             if (partyId) {
         // Find party by ID
         const partyDoc = await Party.findById(partyId);
         if (partyDoc) {
           // Update party's receivable balance
           const currentReceivable = partyDoc.openingBalance || 0;
           const newReceivable = currentReceivable + creditAmount;
           
           console.log('Updating party balance:', {
             partyId,
             partyName: partyDoc.name,
             currentReceivable,
             creditAmount,
             newReceivable
           });
           
           // Update party's receivable balance
           await Party.findByIdAndUpdate(partyId, {
             openingBalance: newReceivable
           });
           
           partyBalanceAfterTransaction = newReceivable;
         } else {
           console.log('Party not found with ID:', partyId);
         }
       } else {
        // Fallback: find party by name
        const partyDoc = await Party.findOne({ name: party, user: userId });
        if (partyDoc) {
          const currentReceivable = partyDoc.openingBalance || 0;
          const newReceivable = currentReceivable + creditAmount;
          
          await Party.findByIdAndUpdate(partyDoc._id, {
            openingBalance: newReceivable
          });
          
          partyBalanceAfterTransaction = newReceivable;
        }
      }
    } catch (err) {
      console.error('Failed to get/update party balance:', err);
    }

    const newExpense = new Expense({
      userId,
      expenseCategory,
      party,
      partyId,
      items,
      totalAmount,
      paymentType,
      receivedAmount: finalReceivedAmount,
      creditAmount,
      expenseDate,
      expenseNumber,
      description,
      partyBalanceAfterTransaction
    });

    await newExpense.save();

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: newExpense
    });

  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all expenses for a user
export const getExpenses = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { page = 1, limit = 10, category, paymentType, dateFrom, dateTo } = req.query;
    
    let query = { userId };
    
    // Apply filters
    if (category) {
      query.expenseCategory = category;
    }
    if (paymentType) {
      query.paymentType = paymentType;
    }
    if (dateFrom || dateTo) {
      query.expenseDate = {};
      if (dateFrom) {
        query.expenseDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.expenseDate.$lte = new Date(dateTo);
      }
    }

    const skip = (page - 1) * limit;
    
    const expenses = await Expense.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(query);

    res.status(200).json({
      success: true,
      data: expenses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get expense by ID
export const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user._id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const expense = await Expense.findOne({ _id: id, userId });
    
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.status(200).json({
      success: true,
      data: expense
    });

  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update expense
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user._id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const expense = await Expense.findOne({ _id: id, userId });
    
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense
    });

  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete expense
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user._id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const expense = await Expense.findOne({ _id: id, userId });
    
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await Expense.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get expense statistics
export const getExpenseStats = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { dateFrom, dateTo } = req.query;
    
    let dateQuery = {};
    if (dateFrom || dateTo) {
      dateQuery.expenseDate = {};
      if (dateFrom) {
        dateQuery.expenseDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateQuery.expenseDate.$lte = new Date(dateTo);
      }
    }

    // Total expenses
    const totalExpenses = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), ...dateQuery } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Expenses by category
    const expensesByCategory = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), ...dateQuery } },
      { $group: { _id: '$expenseCategory', total: { $sum: '$totalAmount' } } },
      { $sort: { total: -1 } }
    ]);

    // Expenses by payment type
    const expensesByPaymentType = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), ...dateQuery } },
      { $group: { _id: '$paymentType', total: { $sum: '$totalAmount' } } },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAmount: totalExpenses[0]?.total || 0,
        byCategory: expensesByCategory,
        byPaymentType: expensesByPaymentType
      }
    });

  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
