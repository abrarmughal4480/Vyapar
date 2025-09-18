import mongoose from 'mongoose';

const PurchaseItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  qty: { type: Number, required: true },
  unit: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  customUnit: { type: String },
  discountPercentage: { type: String, default: '' },
  discountAmount: { type: String, default: '' }
}, { _id: false });

const PurchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  supplierName: { type: String, required: true },
  phoneNo: { type: String },
  items: { type: [PurchaseItemSchema], required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['%', 'PKR'], default: '%' },
  discountValue: { type: Number, default: 0 },
  taxType: { type: String, enum: ['%', 'PKR'], default: '%' },
  tax: { type: Number, default: 0 },
  taxValue: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  billNo: { type: String, required: true },
  paymentType: { type: String, default: 'Credit' },
  paymentMethod: { type: String, default: 'Cash' },
  description: { type: String },
  imageUrl: { type: String },
  dueDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  balance: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  partyBalanceAfterTransaction: { type: Number, default: 0 },
});

// Create compound index for userId + billNo to ensure uniqueness per user
PurchaseSchema.index({ userId: 1, billNo: 1 }, { unique: true });

export default mongoose.model('Purchase', PurchaseSchema); 