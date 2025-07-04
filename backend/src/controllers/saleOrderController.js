import SaleOrder from '../models/saleOrder.js';

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

export default {
  createSaleOrder,
  getSaleOrdersByUser,
  updateSaleOrderStatus,
  convertSaleOrderToInvoice,
}; 