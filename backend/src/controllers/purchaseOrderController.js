import PurchaseOrder from '../models/purchaseOrder.js';

// Create a new purchase order
export const createPurchaseOrder = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const data = req.body;

    // Generate next order number for this user
    const lastOrder = await PurchaseOrder.findOne({ userId }).sort({ createdAt: -1 });
    let nextNumber = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const match = lastOrder.orderNumber.match(/PO(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const orderNumber = `PO${String(nextNumber).padStart(3, '0')}`;

    // Calculate total from items
    const total = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const purchaseOrder = new PurchaseOrder({
      ...data,
      userId,
      orderNumber,
      total: total,
      subtotal: total,
      balance: data.balance !== undefined ? data.balance : total,
      status: data.status || 'Draft',
      orderDate: data.orderDate || new Date(),
      dueDate: data.dueDate || null,
    });
    await purchaseOrder.save();
    res.status(201).json({ success: true, data: purchaseOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get all purchase orders for the logged-in user
export const getPurchaseOrdersByUser = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const purchaseOrders = await PurchaseOrder.find({ userId }).sort({ createdAt: 1 });
    res.json({ success: true, data: purchaseOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update purchase order status
export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { orderId } = req.params;
    const { status } = req.body;
    const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
      { _id: orderId, userId },
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!purchaseOrder) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    res.json({ success: true, data: purchaseOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Convert purchase order to invoice (just update status to Completed for now)
export const convertPurchaseOrderToInvoice = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { orderId } = req.params;
    const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
      { _id: orderId, userId },
      { status: 'Completed', updatedAt: new Date() },
      { new: true }
    );
    if (!purchaseOrder) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    res.json({ success: true, data: purchaseOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Update totals for existing purchase orders (utility function)
export const updatePurchaseOrderTotals = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    
    const purchaseOrders = await PurchaseOrder.find({ userId });
    let updatedCount = 0;
    
    for (const order of purchaseOrders) {
      if (order.items && order.items.length > 0) {
        const total = order.items.reduce((sum, item) => sum + (item.amount || 0), 0);
        if (order.total !== total) {
          await PurchaseOrder.findByIdAndUpdate(order._id, {
            total: total,
            subtotal: total,
            updatedAt: new Date()
          });
          updatedCount++;
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Updated totals for ${updatedCount} purchase orders`,
      updatedCount 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a purchase order (full update, for use by frontend)
export const updatePurchaseOrder = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { orderId } = req.params;
    const updateData = req.body;
    const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
      { _id: orderId, userId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    if (!purchaseOrder) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    res.json({ success: true, data: purchaseOrder });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export default {
  createPurchaseOrder,
  getPurchaseOrdersByUser,
  updatePurchaseOrderStatus,
  convertPurchaseOrderToInvoice,
  updatePurchaseOrderTotals,
  updatePurchaseOrder,
}; 