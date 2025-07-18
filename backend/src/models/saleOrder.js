import mongoose from 'mongoose';

const SaleOrderItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  qty: { type: Number, required: true },
  unit: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  customUnit: { type: String }
}, { _id: false });

const SaleOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  customerAddress: { type: String },
  items: { type: [SaleOrderItemSchema], required: true },
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Created', 'Completed', 'Cancelled'], default: 'Draft' },
  orderDate: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  invoiceNumber: { type: String, default: null },
  convertedToInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create compound index for userId + orderNumber to ensure uniqueness per user
SaleOrderSchema.index({ userId: 1, orderNumber: 1 }, { unique: true });

export default mongoose.model('SaleOrder', SaleOrderSchema); 