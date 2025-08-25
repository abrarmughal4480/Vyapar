import DeliveryChallan from '../models/deliveryChallan.js';
import mongoose from 'mongoose';

// Create a new delivery challan
export const createDeliveryChallan = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const data = req.body;

    // Generate next challan number for this user
    const lastChallan = await DeliveryChallan.findOne({ userId }).sort({ createdAt: -1 });
    let nextNumber = 1;
    if (lastChallan && lastChallan.challanNumber) {
      const match = lastChallan.challanNumber.match(/DC(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const challanNumber = `DC${String(nextNumber).padStart(3, '0')}`;

    // Get customer's current balance before creating delivery challan
    let customerBalance = 0;
    try {
      const Party = (await import('../models/parties.js')).default;
      const customerDoc = await Party.findOne({ name: data.customerName, user: userId });
      if (customerDoc) {
        customerBalance = customerDoc.openingBalance || 0;
      }
    } catch (err) {
      console.error('Failed to get customer balance:', err);
    }

    const deliveryChallan = new DeliveryChallan({
      ...data,
      userId,
      challanNumber,
      status: data.status || 'Created',
      challanDate: data.date || new Date(),
      dueDate: data.dueDate || null,
      partyBalanceAfterTransaction: customerBalance, // For delivery challans, balance remains same
    });
    await deliveryChallan.save();
    res.status(201).json({ success: true, data: deliveryChallan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get all delivery challans for the logged-in user
export const getDeliveryChallansByUser = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const deliveryChallans = await DeliveryChallan.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: deliveryChallans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update delivery challan status
export const updateDeliveryChallanStatus = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { challanId } = req.params;
    const { status, invoiceNumber } = req.body;
    
    console.log('=== UPDATE DELIVERY CHALLAN STATUS ===');
    console.log('User ID:', userId);
    console.log('Challan ID:', challanId);
    console.log('Request body:', req.body);
    console.log('Status:', status);
    console.log('Invoice Number:', invoiceNumber);
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(challanId)) {
      console.log('Invalid ObjectId:', challanId);
      console.log('ObjectId validation failed for:', challanId);
      console.log('ObjectId type:', typeof challanId);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid challan ID format',
        details: {
          providedId: challanId,
          type: typeof challanId,
          isValid: mongoose.Types.ObjectId.isValid(challanId)
        }
      });
    }
    
    // Map frontend status to backend status
    let backendStatus = status;
    if (status === 'Close' || status === 'Completed') {
      backendStatus = 'Completed';
    } else if (status === 'Open' || status === 'Created') {
      backendStatus = 'Created';
    } else if (status === 'Draft') {
      backendStatus = 'Draft';
    } else if (status === 'Cancelled') {
      backendStatus = 'Cancelled';
    }
    
    console.log('Mapped backend status:', backendStatus);
    
    const updateData = { 
      status: backendStatus, 
      updatedAt: new Date() 
    };
    
    // If invoice number is provided, add it to the update
    if (invoiceNumber) {
      updateData.invoiceNumber = invoiceNumber;
    }
    
    console.log('Update data:', updateData);
    console.log('Query filter:', { _id: challanId, userId });
    
    const deliveryChallan = await DeliveryChallan.findOneAndUpdate(
      { _id: challanId, userId },
      updateData,
      { new: true }
    );
    
    console.log('Find result:', deliveryChallan);
    
    if (!deliveryChallan) {
      console.log('Challan not found!');
      console.log('Search criteria:', { _id: challanId, userId });
      return res.status(404).json({ success: false, message: 'Delivery challan not found' });
    }
    
    console.log('Successfully updated delivery challan:', deliveryChallan);
    console.log('Updated status:', deliveryChallan.status);
    console.log('Updated invoice number:', deliveryChallan.invoiceNumber);
    res.json({ success: true, data: deliveryChallan });
  } catch (err) {
    console.error('Error updating delivery challan:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get delivery challan by ID
export const getDeliveryChallanById = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { challanId } = req.params;
    const deliveryChallan = await DeliveryChallan.findOne({ _id: challanId, userId });
    if (!deliveryChallan) return res.status(404).json({ success: false, message: 'Delivery challan not found' });
    res.json({ success: true, data: deliveryChallan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a delivery challan by ID
export const deleteDeliveryChallan = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { challanId } = req.params;
    const challan = await DeliveryChallan.findOneAndDelete({ _id: challanId, userId });
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Delivery challan not found or not authorized' });
    }
    res.json({ success: true, message: 'Delivery challan deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a delivery challan (full edit)
export const updateDeliveryChallan = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { challanId } = req.params;
    const updateData = req.body;
    const deliveryChallan = await DeliveryChallan.findOneAndUpdate(
      { _id: challanId, userId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    if (!deliveryChallan) return res.status(404).json({ success: false, message: 'Delivery challan not found' });
    res.json({ success: true, data: deliveryChallan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export default {
  createDeliveryChallan,
  getDeliveryChallansByUser,
  updateDeliveryChallanStatus,
  getDeliveryChallanById,
  deleteDeliveryChallan,
  updateDeliveryChallan,
}; 