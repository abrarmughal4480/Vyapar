import mongoose from 'mongoose';

const PurchaseOrderItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  qty: { type: Number, required: true },
  unit: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  customUnit: { type: String }
}, { _id: false });

const PurchaseOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderNumber: { type: String, required: true },
  supplierName: { type: String, required: true },
  supplierPhone: { type: String },
  supplierAddress: { type: String },
  items: { type: [PurchaseOrderItemSchema], required: true },
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  partyBalanceAfterTransaction: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Created', 'Completed', 'Cancelled'], default: 'Draft' },
  orderDate: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  invoiceNumber: { type: String, default: null },
  convertedToInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save middleware to calculate total from items
PurchaseOrderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.total = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    this.subtotal = this.total;
  }
  next();
});

// Create compound index for userId + orderNumber to ensure uniqueness per user
PurchaseOrderSchema.index({ userId: 1, orderNumber: 1 }, { unique: true });

export default mongoose.model('PurchaseOrder', PurchaseOrderSchema); 