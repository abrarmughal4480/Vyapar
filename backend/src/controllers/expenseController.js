import Expense from '../models/expense.js';
import Party from '../models/parties.js';
import BankAccount from '../models/bankAccount.js';
import BankTransaction from '../models/bankTransaction.js';
import mongoose from 'mongoose';

// Create new expense
export const createExpense = async (req, res) => {
  try {
    const { expenseCategory, party, partyId, items, totalAmount, paymentType, paymentMethod, bankAccountId, bankAccountName, receivedAmount, expenseDate, description } = req.body;
    
    
    if (!expenseCategory || !items || !Array.isArray(items) || items.length === 0 || !totalAmount || !paymentType || !expenseDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Handle party creation if partyId is not provided and party name is not empty
    let finalPartyId = partyId;
    if (!finalPartyId && party && party.trim() !== '') {
      try {
        // Check if party already exists
        let existingParty = await Party.findOne({ 
          name: party, 
          user: userId 
        });
        
        if (existingParty) {
          finalPartyId = existingParty._id;
        } else {
          // Create new party
          const newParty = new Party({
            name: party.trim(),
            phone: '',
            partyType: 'supplier',
            openingBalance: 0,
            user: userId
          });
          
          const savedParty = await newParty.save();
          finalPartyId = savedParty._id;
        }
      } catch (error) {
        console.error('Error handling party creation:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create or find party' 
        });
      }
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
      if (finalPartyId) {
        // Find party by ID
        const partyDoc = await Party.findById(finalPartyId);
        if (partyDoc) {
          // Only update party balance for Credit payments
          if (paymentType === 'Credit' && creditAmount > 0) {
            // Update party's receivable balance
            const currentReceivable = partyDoc.openingBalance || 0;
            const newReceivable = currentReceivable + creditAmount;
            
            // Update party's receivable balance
            await Party.findByIdAndUpdate(finalPartyId, {
              openingBalance: newReceivable
            });
            
            partyBalanceAfterTransaction = newReceivable;
          } else {
            // For Cash payments, no balance change needed
            partyBalanceAfterTransaction = partyDoc.openingBalance || 0;
          }
        }
      }
    } catch (err) {
      console.error('Failed to get/update party balance:', err);
    }

    const newExpense = new Expense({
      userId,
      expenseCategory,
      party,
      partyId: finalPartyId,
      items,
      totalAmount,
      paymentType,
      paymentMethod: paymentMethod || 'Cash',
      bankAccountId: bankAccountId || null,
      bankAccountName: bankAccountName || '',
      receivedAmount: finalReceivedAmount,
      creditAmount,
      expenseDate,
      expenseNumber,
      description,
      partyBalanceAfterTransaction
    });

    await newExpense.save();

    // Handle bank transaction if bank account is selected
    if (bankAccountId && bankAccountName && paymentMethod && paymentMethod !== 'Cash') {
      try {
        // Find the bank account
        const bankAccount = await BankAccount.findOne({ 
          _id: bankAccountId, 
          userId, 
          isActive: true 
        });

        if (bankAccount) {
          // Calculate new balance after expense
          const newBalance = bankAccount.currentBalance - totalAmount;

          // Update bank account balance
          await BankAccount.findByIdAndUpdate(bankAccountId, {
            currentBalance: newBalance,
            updatedAt: new Date()
          });

          // Create bank transaction record
          const bankTransaction = new BankTransaction({
            userId,
            type: 'Payment Out',
            fromAccount: bankAccountName,
            toAccount: party, // Party receiving the payment
            amount: totalAmount,
            description: `Expense Payment - ${expenseNumber}`,
            transactionDate: new Date(expenseDate),
            balanceAfter: newBalance,
            status: 'completed'
          });

          await bankTransaction.save();
        }
      } catch (bankError) {
        console.error('Error creating bank transaction for expense:', bankError);
        // Don't fail the expense creation if bank transaction fails
      }
    }

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

    // Store old bank transaction details for reversal
    const oldBankAccountId = expense.bankAccountId;
    const oldBankAccountName = expense.bankAccountName;
    const oldPaymentMethod = expense.paymentMethod;
    const oldTotalAmount = expense.totalAmount;

    // Recover party balance from old expense before updating
    try {
      const Party = (await import('../models/parties.js')).default;
      
      if (expense.partyId) {
        const partyDoc = await Party.findById(expense.partyId);
        if (partyDoc && expense.creditAmount > 0) {
          // Recover the credit amount from party's receivable balance
          const currentReceivable = partyDoc.openingBalance || 0;
          const newReceivable = Math.max(0, currentReceivable - expense.creditAmount);
          
          
          await Party.findByIdAndUpdate(expense.partyId, {
            openingBalance: newReceivable
          });
          
        }
      } else if (expense.party) {
        // Fallback: find party by name
        const partyDoc = await Party.findOne({ name: expense.party, user: userId });
        if (partyDoc && expense.creditAmount > 0) {
          const currentReceivable = partyDoc.openingBalance || 0;
          const newReceivable = Math.max(0, currentReceivable - expense.creditAmount);
          
          await Party.findByIdAndUpdate(partyDoc._id, {
            openingBalance: newReceivable
          });
          
        }
      }
    } catch (err) {
      console.error('Failed to recover party balance on update:', err);
    }

    // Calculate new party balance for updated expense
    let newPartyBalanceAfterTransaction = 0;
    try {
      const Party = (await import('../models/parties.js')).default;
      const { partyId, party, paymentType, totalAmount, receivedAmount } = req.body;
      
      if (partyId) {
        const partyDoc = await Party.findById(partyId);
        if (partyDoc) {
          const currentReceivable = partyDoc.openingBalance || 0;
          let newReceivable = currentReceivable;
          
          if (paymentType === 'Credit') {
            const creditAmount = totalAmount - (receivedAmount || 0);
            newReceivable = currentReceivable + creditAmount;
            
            await Party.findByIdAndUpdate(partyId, {
              openingBalance: newReceivable
            });
          } else {
            // For Cash payments, no balance change needed
            newReceivable = currentReceivable;
          }
          
          newPartyBalanceAfterTransaction = newReceivable;
           
        }
      } else if (party) {
        const partyDoc = await Party.findOne({ name: party, user: userId });
        if (partyDoc) {
          const currentReceivable = partyDoc.openingBalance || 0;
          let newReceivable = currentReceivable;
          
          if (paymentType === 'Credit') {
            const creditAmount = totalAmount - (receivedAmount || 0);
            newReceivable = currentReceivable + creditAmount;
            
            await Party.findByIdAndUpdate(partyDoc._id, {
              openingBalance: newReceivable
            });
          } else {
            // For Cash payments, no balance change needed
            newReceivable = currentReceivable;
          }
          
          newPartyBalanceAfterTransaction = newReceivable;
        }
      }
    } catch (err) {
      console.error('Failed to update party balance on update:', err);
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      { 
        ...req.body, 
        updatedAt: new Date(),
        partyBalanceAfterTransaction: newPartyBalanceAfterTransaction
      },
      { new: true, runValidators: true }
    );

    // Handle bank transaction reversal and creation
    try {
      // Reverse old bank transaction if it existed
      if (oldBankAccountId && oldBankAccountName && oldPaymentMethod && oldPaymentMethod !== 'Cash') {
        // Find and delete old bank transaction
        await BankTransaction.findOneAndDelete({
          userId,
          type: 'Payment Out',
          fromAccount: oldBankAccountName,
          description: { $regex: `Expense Payment - ${expense.expenseNumber}` }
        });

        // Restore old bank account balance
        const oldBankAccount = await BankAccount.findOne({ 
          _id: oldBankAccountId, 
          userId, 
          isActive: true 
        });
        if (oldBankAccount) {
          await BankAccount.findByIdAndUpdate(oldBankAccountId, {
            currentBalance: oldBankAccount.currentBalance + oldTotalAmount,
            updatedAt: new Date()
          });
        }
      }

      // Create new bank transaction if bank account is selected
      const { bankAccountId, bankAccountName, paymentMethod, totalAmount } = req.body;
      if (bankAccountId && bankAccountName && paymentMethod && paymentMethod !== 'Cash') {
        // Find the bank account
        const bankAccount = await BankAccount.findOne({ 
          _id: bankAccountId, 
          userId, 
          isActive: true 
        });

        if (bankAccount) {
          // Calculate new balance after expense
          const newBalance = bankAccount.currentBalance - totalAmount;

          // Update bank account balance
          await BankAccount.findByIdAndUpdate(bankAccountId, {
            currentBalance: newBalance,
            updatedAt: new Date()
          });

          // Create bank transaction record
          const bankTransaction = new BankTransaction({
            userId,
            type: 'Payment Out',
            fromAccount: bankAccountName,
            toAccount: updatedExpense.party,
            amount: totalAmount,
            description: `Expense Payment - ${updatedExpense.expenseNumber}`,
            transactionDate: new Date(updatedExpense.expenseDate),
            balanceAfter: newBalance,
            status: 'completed'
          });

          await bankTransaction.save();
        }
      }
    } catch (bankError) {
      console.error('Error handling bank transaction for expense update:', bankError);
      // Don't fail the expense update if bank transaction fails
    }

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

    // Recover party balance before deleting expense
    try {
      const Party = (await import('../models/parties.js')).default;
      
      if (expense.partyId) {
        const partyDoc = await Party.findById(expense.partyId);
        if (partyDoc) {
          // Restore party balance for both Cash and Credit payments
          const currentReceivable = partyDoc.openingBalance || 0;
          let newReceivable = currentReceivable;
          
          if (expense.paymentType === 'Credit' && expense.creditAmount > 0) {
            // For credit payments, subtract the credit amount
            newReceivable = Math.max(0, currentReceivable - expense.creditAmount);
          } else if (expense.paymentType === 'Cash') {
            // For cash payments, no balance change needed (already paid)
            newReceivable = currentReceivable;
          }
          
          
          await Party.findByIdAndUpdate(expense.partyId, {
            openingBalance: newReceivable
          });
          
        }
      } else if (expense.party) {
        // Fallback: find party by name
        const partyDoc = await Party.findOne({ name: expense.party, user: userId });
        if (partyDoc) {
          const currentReceivable = partyDoc.openingBalance || 0;
          let newReceivable = currentReceivable;
          
          if (expense.paymentType === 'Credit' && expense.creditAmount > 0) {
            // For credit payments, subtract the credit amount
            newReceivable = Math.max(0, currentReceivable - expense.creditAmount);
          } else if (expense.paymentType === 'Cash') {
            // For cash payments, no balance change needed (already paid)
            newReceivable = currentReceivable;
          }
          
          
          await Party.findByIdAndUpdate(partyDoc._id, {
            openingBalance: newReceivable
          });
          
        }
      }
    } catch (err) {
      console.error('Failed to restore party balance on delete:', err);
    }

    // Handle bank transaction reversal before deleting expense
    try {
      if (expense.bankAccountId && expense.bankAccountName && expense.paymentMethod && expense.paymentMethod !== 'Cash') {
        // Find and delete bank transaction
        await BankTransaction.findOneAndDelete({
          userId,
          type: 'Payment Out',
          fromAccount: expense.bankAccountName,
          description: { $regex: `Expense Payment - ${expense.expenseNumber}` }
        });

        // Restore bank account balance
        const bankAccount = await BankAccount.findOne({ 
          _id: expense.bankAccountId, 
          userId, 
          isActive: true 
        });
        if (bankAccount) {
          await BankAccount.findByIdAndUpdate(expense.bankAccountId, {
            currentBalance: bankAccount.currentBalance + expense.totalAmount,
            updatedAt: new Date()
          });
        }
      }
    } catch (bankError) {
      console.error('Error handling bank transaction reversal for expense deletion:', bankError);
      // Don't fail the expense deletion if bank transaction reversal fails
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

    // Expenses by party (for party balance tracking)
    const expensesByParty = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), ...dateQuery } },
      { $group: { 
        _id: '$party', 
        total: { $sum: '$totalAmount' },
        creditAmount: { $sum: '$creditAmount' },
        receivedAmount: { $sum: '$receivedAmount' }
      }},
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAmount: totalExpenses[0]?.total || 0,
        byCategory: expensesByCategory,
        byPaymentType: expensesByPaymentType,
        byParty: expensesByParty
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

// Get party balance for expenses
export const getPartyExpenseBalance = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { partyId, partyName } = req.query;
    
    if (!partyId && !partyName) {
      return res.status(400).json({ success: false, message: 'Party ID or name is required' });
    }

    let query = { userId };
    if (partyId) {
      query.partyId = partyId;
    } else if (partyName) {
      query.party = partyName;
    }

    // Get all expenses for the party
    const partyExpenses = await Expense.find(query).sort({ expenseDate: -1 });

    // Calculate balance
    let totalExpenseAmount = 0;
    let totalCreditAmount = 0;
    let totalReceivedAmount = 0;

    partyExpenses.forEach(expense => {
      totalExpenseAmount += expense.totalAmount || 0;
      totalCreditAmount += expense.creditAmount || 0;
      totalReceivedAmount += expense.receivedAmount || 0;
    });

    const currentBalance = totalCreditAmount; // Remaining amount to be received

    res.status(200).json({
      success: true,
      data: {
        partyId: partyId || null,
        partyName: partyName || null,
        totalExpenseAmount,
        totalCreditAmount,
        totalReceivedAmount,
        currentBalance,
        expenses: partyExpenses
      }
    });

  } catch (error) {
    console.error('Error fetching party expense balance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
