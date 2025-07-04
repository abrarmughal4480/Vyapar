import Quotation from '../models/quotation.js';

// Generate quotation number for specific user
const generateQuotationNumber = async (userId) => {
  try {
    // Find the highest quotation number for this specific user
    const lastQuotation = await Quotation.findOne({ userId, quotationNo: { $ne: null } }).sort({ quotationNo: -1 });
    
    if (!lastQuotation || !lastQuotation.quotationNo) {
      // Check if QT001 already exists for this user
      const existingQT001 = await Quotation.findOne({ userId, quotationNo: 'QT001' });
      if (existingQT001) {
        // Find the next available number for this user
        const allQuotations = await Quotation.find({ userId, quotationNo: { $regex: /^QT\d+$/ } }).sort({ quotationNo: -1 });
        if (allQuotations.length > 0) {
          const lastNumber = allQuotations[0].quotationNo;
          const match = lastNumber.match(/QT(\d+)/);
          if (match) {
            const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
            return `QT${nextNum}`;
          }
        }
        return 'QT002';
      }
      return 'QT001';
    }
    
    const match = lastQuotation.quotationNo.match(/QT(\d+)/);
    if (match) {
      const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
      return `QT${nextNum}`;
    }
    return 'QT001';
  } catch (error) {
    console.error('Error generating quotation number:', error);
    return 'QT001';
  }
};

// Create a new quotation
export const createQuotation = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    console.log('Creating quotation with data:', req.body);
    console.log('User ID:', userId);
    
    // Generate quotation number for this user
    const quotationNo = await generateQuotationNumber(userId);
    console.log('Generated quotation number:', quotationNo);
    
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
  } catch (err) {
    console.error('Quotation creation error:', err);
    
    // Handle specific MongoDB errors
    if (err.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quotation number already exists. Please try again.' 
      });
    }
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ success: false, message: err.message });
  }
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