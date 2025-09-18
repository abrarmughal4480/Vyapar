import Quotation from '../models/quotation.js';
import mongoose from 'mongoose';

// Drop problematic single-field unique indexes if they exist
const dropSingleFieldIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('quotations');
    
    // Get all indexes
    const indexes = await collection.indexes();
    
    // Check for problematic single-field unique indexes
    const problematicIndexes = indexes.filter(index => 
      index.key && 
      Object.keys(index.key).length === 1 && 
      index.unique === true &&
      (index.key.quotationNo === 1 || index.key.quotationNumber === 1)
    );
    
    for (const index of problematicIndexes) {
      await collection.dropIndex(index.name);
    }
  } catch (error) {
    console.error('Error dropping indexes:', error);
  }
};

// Generate quotation number for specific user
const generateQuotationNumber = async (userId) => {
  try {
    // First, ensure the problematic indexes are dropped
    await dropSingleFieldIndexes();
    
    // Find the highest quotation number for this specific user
    const lastQuotation = await Quotation.findOne({ 
      userId, 
      quotationNo: { $regex: /^QT\d+$/ } 
    }).sort({ quotationNo: -1 });
    
    
    if (!lastQuotation || !lastQuotation.quotationNo) {
      // No quotations exist for this user, start with QT001
      return 'QT001';
    }
    
    // Extract the number from the last quotation number
    const match = lastQuotation.quotationNo.match(/QT(\d+)/);
    if (match) {
      const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
      const nextQuotationNo = `QT${nextNum}`;
      return nextQuotationNo;
    }
    
    // Fallback to QT001 if pattern doesn't match
    return 'QT001';
  } catch (error) {
    console.error('Error generating quotation number:', error);
    return 'QT001';
  }
};

// Generate unique quotation number with retry logic
const generateUniqueQuotationNumber = async (userId) => {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const quotationNo = await generateQuotationNumber(userId);
    
    // Check if this number is available for this user
    const existingQuotation = await Quotation.findOne({ 
      userId, 
      $or: [
        { quotationNo: quotationNo },
        { quotationNumber: quotationNo }
      ]
    });
    
    if (!existingQuotation) {
      return quotationNo;
    }
    
    attempts++;
    
    // Force increment the number for next attempt
    const match = quotationNo.match(/QT(\d+)/);
    if (match) {
      const currentNum = parseInt(match[1], 10);
      const nextNum = String(currentNum + attempts).padStart(3, '0');
      const nextQuotationNo = `QT${nextNum}`;
      
      // Check if this next number is available
      const nextExistingQuotation = await Quotation.findOne({ 
        userId, 
        $or: [
          { quotationNo: nextQuotationNo },
          { quotationNumber: nextQuotationNo }
        ]
      });
      
      if (!nextExistingQuotation) {
        return nextQuotationNo;
      }
    }
  }
  
  // If we can't find a unique number after max attempts, throw an error
  throw new Error('Unable to generate unique quotation number after multiple attempts');
};

// Create a new quotation with retry mechanism
export const createQuotation = async (req, res) => {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const userId = req.user && (req.user._id || req.user.id);
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      
      // Generate unique quotation number for this user
      const quotationNo = await generateUniqueQuotationNumber(userId);
      
      // Ensure we have a valid quotation number
      if (!quotationNo) {
        throw new Error('Failed to generate quotation number');
      }
      
      // Check if customer exists, if not create it
      const Party = (await import('../models/parties.js')).default;
      let customerDoc = await Party.findOne({ name: req.body.customerName, user: userId });
      let partyCreated = false;
      
      if (!customerDoc) {
        // Create new party with default values
        customerDoc = new Party({
          name: req.body.customerName,
          phone: req.body.customerPhone || '',
          contactNumber: req.body.customerPhone || '',
          email: '',
          address: '',
          gstNumber: '',
          openingBalance: 0,
          firstOpeningBalance: 0,
          pan: '',
          city: '',
          state: '',
          pincode: '',
          tags: [],
          status: 'active',
          note: 'Auto-created from quotation',
          user: userId
        });
        
        await customerDoc.save();
        partyCreated = true;
        console.log(`Auto-created party from quotation: ${req.body.customerName}`);
      }
      
      // Get customer's current balance
      let customerBalance = 0;
      if (customerDoc) {
        customerBalance = customerDoc.openingBalance || 0;
      }

      const quotation = new Quotation({
        ...req.body,
        userId,
        quotationNo,
        quotationNumber: quotationNo, // Set both fields to same value
        status: 'Quotation Open',
        customerBalance,
        partyBalanceAfterTransaction: customerBalance, // For quotations, balance remains same
      });
      await quotation.save();
      res.status(201).json({ success: true, data: quotation, partyCreated });
      return;
    } catch (err) {
      console.error(`Quotation creation error (attempt ${retryCount + 1}):`, err);
      
      // Handle specific MongoDB errors
      if (err.code === 11000) {
        retryCount++;
        if (retryCount >= maxRetries) {
          return res.status(400).json({ 
            success: false, 
            message: 'Quotation number already exists. Please try again.' 
          });
        }
        continue;
      }
      
      if (err.name === 'ValidationError') {
        const validationErrors = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: validationErrors 
        });
      }
      
      // For other errors, don't retry
      res.status(500).json({ success: false, message: err.message });
      return;
    }
  }
  
  // If we get here, all retries failed
  res.status(500).json({ 
    success: false, 
    message: 'Failed to create quotation after multiple attempts. Please try again.' 
  });
};

// Get all quotations for the logged-in user, latest first
export const getQuotationsForUser = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const quotations = await Quotation.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: quotations });
  } catch (err) {
    console.error('Get quotations error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update quotation status
export const updateQuotationStatus = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const { id } = req.params;
    const { status, convertedTo } = req.body;
    
    // Try to find the quotation
    const quotation = await Quotation.findOne({ _id: id, userId });
    
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    
    // Update the quotation status
    quotation.status = status;
    if (convertedTo) {
      if (status.includes('Sale')) {
        quotation.convertedToSale = convertedTo;
      } else if (status.includes('Order')) {
        quotation.convertedToSaleOrder = convertedTo;
      }
    }
    
    await quotation.save();
    
    res.json({ success: true, data: quotation });
  } catch (err) {
    console.error('Update quotation status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Function to fix database indexes
export const fixQuotationIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('quotations');
    
    // Get all indexes
    const indexes = await collection.indexes();
    
    // Check for problematic single-field unique indexes
    const problematicIndexes = indexes.filter(index => 
      index.key && 
      Object.keys(index.key).length === 1 && 
      index.unique === true &&
      (index.key.quotationNo === 1 || index.key.quotationNumber === 1)
    );
    
    if (problematicIndexes.length > 0) {
      for (const index of problematicIndexes) {
        await collection.dropIndex(index.name);
      }
      return { success: true, message: `Fixed ${problematicIndexes.length} problematic index(es)` };
    } else {
      return { success: true, message: 'No problematic indexes found' };
    }
  } catch (error) {
    console.error('Error fixing indexes:', error);
    return { success: false, message: error.message };
  }
};

// Delete a quotation by ID
export const deleteQuotation = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    const { id } = req.params;
    const quotation = await Quotation.findOneAndDelete({ _id: id, userId });
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found or not authorized' });
    }
    res.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get quotation by ID
export const getQuotationById = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    const { id } = req.params;
    const quotation = await Quotation.findOne({ _id: id, userId });
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, data: quotation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Update a quotation (full edit)
export const updateQuotation = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    const { quotationId } = req.params;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check if quotation exists
    const existingQuotation = await Quotation.findOne({ _id: quotationId, userId });
    if (!existingQuotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    // Validate required fields
    if (!updateData.customerName || !updateData.items || updateData.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Customer name and at least one item are required' });
    }

    // Calculate totals if not provided
    const subtotal = updateData.subtotal || updateData.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const totalDiscount = updateData.discount || 0;
    const taxAmount = updateData.tax || 0;
    const totalAmount = subtotal - totalDiscount + taxAmount;

    // Prepare update data
    const quotationUpdateData = {
      ...updateData,
      subtotal,
      totalAmount,
      updatedAt: new Date()
    };

    // Update the quotation
    const quotation = await Quotation.findOneAndUpdate(
      { _id: quotationId, userId },
      quotationUpdateData,
      { new: true, runValidators: true }
    );

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    res.json({ 
      success: true, 
      message: 'Quotation updated successfully',
      data: quotation 
    });
  } catch (err) {
    console.error('Error updating quotation:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

export default {
  createQuotation,
  getQuotationsForUser,
  getQuotationById,
  updateQuotationStatus,
  fixQuotationIndexes,
  deleteQuotation,
  updateQuotation,
}; 