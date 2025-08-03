import mongoose from 'mongoose';

const SaleItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  qty: { type: Number, required: true },
  unit: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  customUnit: { type: String }
}, { _id: false });

const SaleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  partyName: { type: String, required: true },
  phoneNo: { type: String },
  items: { type: [SaleItemSchema], required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['%', 'PKR'], default: '%' },
  discountValue: { type: Number, default: 0 },
  taxType: { type: String, enum: ['%', 'PKR'], default: '%' },
  tax: { type: Number, default: 0 },
  taxValue: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  invoiceNo: { type: String, required: true },
  paymentType: { type: String, default: 'Credit' },
  description: { type: String },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  balance: { type: Number, default: 0 },
  received: { type: Number, default: 0 },
});

// Create compound index for userId + invoiceNo to ensure uniqueness per user
SaleSchema.index({ userId: 1, invoiceNo: 1 }, { unique: true });

export default mongoose.model('Sale', SaleSchema); 