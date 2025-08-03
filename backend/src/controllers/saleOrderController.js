import SaleOrder from '../models/saleOrder.js';
import mongoose from 'mongoose';

// Create a new sale order
export const createSaleOrder = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const data = req.body;

    // Generate next order number for this user
    const lastOrder = await SaleOrder.findOne({ userId }).sort({ createdAt: -1 });
    let nextNumber = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const match = lastOrder.orderNumber.match(/SO(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const orderNumber = `SO${String(nextNumber).padStart(3, '0')}`;

    const saleOrder = new SaleOrder({
      ...data,
      userId,
      orderNumber,
      balance: data.balance !== undefined ? data.balance : data.total,
      status: data.status || 'Draft',
      orderDate: data.orderDate || new Date(),
      dueDate: data.dueDate || null,
    });
    await saleOrder.save();
    res.status(201).json({ success: true, data: saleOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get all sale orders for the logged-in user
export const getSaleOrdersByUser = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const saleOrders = await SaleOrder.find({ userId }).sort({ createdAt: 1 });
    res.json({ success: true, data: saleOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update sale order status
export const updateSaleOrderStatus = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { orderId } = req.params;
    const { status } = req.body;
    const saleOrder = await SaleOrder.findOneAndUpdate(
      { _id: orderId, userId },
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!saleOrder) return res.status(404).json({ success: false, message: 'Sale order not found' });
    res.json({ success: true, data: saleOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Convert sale order to invoice (just update status to Completed for now)
export const convertSaleOrderToInvoice = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { orderId } = req.params;
    const saleOrder = await SaleOrder.findOneAndUpdate(
      { _id: orderId, userId },
      { status: 'Completed', updatedAt: new Date() },
      { new: true }
    );
    if (!saleOrder) return res.status(404).json({ success: false, message: 'Sale order not found' });
    res.json({ success: true, data: saleOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete a sale order by ID
export const deleteSaleOrder = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { orderId } = req.params;
    console.log("Delete sale order request: orderId =", orderId, "userId =", userId);
    // Try to find by _id only first
    const saleOrderById = await SaleOrder.findOne({ _id: orderId });
    console.log("Sale order found by _id only:", saleOrderById);
    if (saleOrderById) {
      console.log("Sale order userId in DB:", saleOrderById.userId, "Type:", typeof saleOrderById.userId);
      console.log("Request userId:", userId, "Type:", typeof userId);
    }
    // Defensive ObjectId cast
    let objectUserId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } else if (userId instanceof mongoose.Types.ObjectId) {
      objectUserId = userId;
    } else {
      console.log("Invalid userId for ObjectId cast:", userId);
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    const saleOrder = await SaleOrder.findOneAndDelete({ _id: orderId, userId: objectUserId });
    if (!saleOrder) {
      return res.status(404).json({ success: false, message: 'Sale order not found or not authorized' });
    }
    res.json({ success: true, message: 'Sale order deleted successfully' });
  } catch (err) {
    console.error('Delete sale order error:', err);
    if (err && err.stack) {
      console.error('Stack trace:', err.stack);
    }
    res.status(500).json({ success: false, message: err && err.message ? err.message : 'Internal server error', error: err });
  }
};

// Update a sale order by ID
export const updateSaleOrder = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { orderId } = req.params;
    const updateData = req.body;
    // Only allow updating certain fields
    const allowedFields = [
      'customerName', 'customerPhone', 'customerAddress', 'items',
      'subtotal', 'tax', 'total', 'balance', 'status', 'orderDate', 'dueDate'
    ];
    const update = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) update[key] = updateData[key];
    }
    update.updatedAt = new Date();
    const saleOrder = await SaleOrder.findOneAndUpdate(
      { _id: orderId, userId },
      update,
      { new: true }
    );
    if (!saleOrder) return res.status(404).json({ success: false, message: 'Sale order not found' });
    res.json({ success: true, data: saleOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export default {
  createSaleOrder,
  getSaleOrdersByUser,
  updateSaleOrderStatus,
  convertSaleOrderToInvoice,
  deleteSaleOrder,
  updateSaleOrder,
}; 