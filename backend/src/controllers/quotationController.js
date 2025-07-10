import Quotation from '../models/quotation.js';
import mongoose from 'mongoose';

// Drop problematic single-field unique indexes if they exist
const dropSingleFieldIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('quotations');
    
    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    
    // Check for problematic single-field unique indexes
    const problematicIndexes = indexes.filter(index => 
      index.key && 
      Object.keys(index.key).length === 1 && 
      index.unique === true &&
      (index.key.quotationNo === 1 || index.key.quotationNumber === 1)
    );
    
    console.log('Found problematic indexes:', problematicIndexes);
    
    for (const index of problematicIndexes) {
      console.log('Dropping problematic index:', index.name);
      await collection.dropIndex(index.name);
      console.log('Successfully dropped index:', index.name);
    }
    
    if (problematicIndexes.length === 0) {
      console.log('No problematic single-field indexes found');
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
    
    console.log('Last quotation for user:', lastQuotation);
    
    if (!lastQuotation || !lastQuotation.quotationNo) {
      // No quotations exist for this user, start with QT001
      console.log('No previous quotations found, starting with QT001');
      return 'QT001';
    }
    
    // Extract the number from the last quotation number
    const match = lastQuotation.quotationNo.match(/QT(\d+)/);
    if (match) {
      const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
      const nextQuotationNo = `QT${nextNum}`;
      console.log('Generated next quotation number:', nextQuotationNo);
      return nextQuotationNo;
    }
    
    // Fallback to QT001 if pattern doesn't match
    console.log('Pattern match failed, using QT001');
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
      console.log('Found unique quotation number:', quotationNo);
      return quotationNo;
    }
    
    console.log('Quotation number already exists, trying next...');
    attempts++;
    
    // Force increment the number for next attempt
    const match = quotationNo.match(/QT(\d+)/);
    if (match) {
      const currentNum = parseInt(match[1], 10);
      const nextNum = String(currentNum + attempts).padStart(3, '0');
      const nextQuotationNo = `QT${nextNum}`;
      console.log('Trying next number:', nextQuotationNo);
      
      // Check if this next number is available
      const nextExistingQuotation = await Quotation.findOne({ 
        userId, 
        $or: [
          { quotationNo: nextQuotationNo },
          { quotationNumber: nextQuotationNo }
        ]
      });
      
      if (!nextExistingQuotation) {
        console.log('Found unique next quotation number:', nextQuotationNo);
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
      
      console.log(`Creating quotation with data (attempt ${retryCount + 1}):`, req.body);
      console.log('User ID:', userId);
      
      // Generate unique quotation number for this user
      const quotationNo = await generateUniqueQuotationNumber(userId);
      console.log('Generated unique quotation number:', quotationNo);
      
      // Ensure we have a valid quotation number
      if (!quotationNo) {
        throw new Error('Failed to generate quotation number');
      }
      
      const quotation = new Quotation({
        ...req.body,
        userId,
        quotationNo,
        quotationNumber: quotationNo, // Set both fields to same value
        status: 'Quotation Open',
      });
      await quotation.save();
      console.log('Quotation saved successfully:', quotation._id);
      res.status(201).json({ success: true, data: quotation });
      return;
    } catch (err) {
      console.error(`Quotation creation error (attempt ${retryCount + 1}):`, err);
      
      // Handle specific MongoDB errors
      if (err.code === 11000) {
        console.log('Duplicate key error, retrying...');
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
    
    console.log('Updating quotation status:', { id, status, convertedTo, userId });
    
    // Try to find the quotation with more detailed logging
    const quotation = await Quotation.findOne({ _id: id, userId });
    console.log('Found quotation:', quotation ? 'Yes' : 'No');
    
    if (!quotation) {
      // Try to find without userId constraint to see if it exists
      const anyQuotation = await Quotation.findById(id);
      console.log('Quotation exists without userId constraint:', anyQuotation ? 'Yes' : 'No');
      
      // Try to find by quotation number as well
      const quotationByNumber = await Quotation.findOne({ quotationNo: id });
      console.log('Quotation found by number:', quotationByNumber ? 'Yes' : 'No');
      
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
    
    console.log('Quotation status updated successfully');
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
    console.log('Current quotation indexes:', indexes);
    
    // Check for problematic single-field unique indexes
    const problematicIndexes = indexes.filter(index => 
      index.key && 
      Object.keys(index.key).length === 1 && 
      index.unique === true &&
      (index.key.quotationNo === 1 || index.key.quotationNumber === 1)
    );
    
    console.log('Found problematic indexes:', problematicIndexes);
    
    if (problematicIndexes.length > 0) {
      for (const index of problematicIndexes) {
        console.log('Dropping problematic index:', index.name);
        await collection.dropIndex(index.name);
        console.log('Successfully dropped index:', index.name);
      }
      return { success: true, message: `Fixed ${problematicIndexes.length} problematic index(es)` };
    } else {
      console.log('No problematic single-field indexes found');
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

// Update a quotation (full edit)
export const updateQuotation = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    const { quotationId } = req.params;
    const updateData = req.body;
    const quotation = await Quotation.findOneAndUpdate(
      { _id: quotationId, userId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, data: quotation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export default {
  createQuotation,
  getQuotationsForUser,
  updateQuotationStatus,
  fixQuotationIndexes,
  deleteQuotation,
  updateQuotation,
}; 