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
    
    // Get supplier's current balance before creating purchase order
    let supplierBalance = 0;
    try {
      const Party = (await import('../models/parties.js')).default;
      const supplierDoc = await Party.findOne({ name: data.supplierName, user: userId });
      if (supplierDoc) {
        supplierBalance = supplierDoc.openingBalance || 0;
      }
    } catch (err) {
      console.error('Failed to get supplier balance:', err);
    }
    
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
      partyBalanceAfterTransaction: supplierBalance, // For purchase orders, balance remains same
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

// Fix completed purchase orders that don't have invoice numbers
export const fixCompletedPurchaseOrders = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    
    // Find all completed purchase orders without invoice numbers
    const completedOrders = await PurchaseOrder.find({ 
      userId, 
      status: 'Completed',
      $or: [
        { invoiceNumber: { $exists: false } },
        { invoiceNumber: "" },
        { invoiceNumber: null }
      ]
    });
    
    
    let fixedCount = 0;
    for (const order of completedOrders) {
      // Generate a dummy invoice number for these orders
      const dummyInvoiceNumber = `PUR${String(order.orderNumber.replace('PO', '')).padStart(3, '0')}`;
      
      order.invoiceNumber = dummyInvoiceNumber;
      order.convertedToInvoice = null; // Since we don't have the actual purchase ID
      await order.save();
      fixedCount++;
      
    }
    
    res.json({ 
      success: true, 
      message: `Fixed ${fixedCount} completed purchase orders`,
      fixedCount 
    });
  } catch (err) {
    console.error('Error fixing completed purchase orders:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a purchase order by ID
export const deletePurchaseOrder = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { orderId } = req.params;
    const order = await PurchaseOrder.findOneAndDelete({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found or not authorized' });
    }
    res.json({ success: true, message: 'Purchase order deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  createPurchaseOrder,
  getPurchaseOrdersByUser,
  updatePurchaseOrderStatus,
  convertPurchaseOrderToInvoice,
  updatePurchaseOrderTotals,
  updatePurchaseOrder,
  fixCompletedPurchaseOrders,
  deletePurchaseOrder,
}; 