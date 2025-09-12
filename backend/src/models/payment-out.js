import mongoose from 'mongoose';

const PaymentOutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: false }, // Made optional for party payments
  billNo: { type: String, required: false }, // Made optional for party payments
  supplierName: { type: String, required: true },
  phoneNo: { type: String },
  amount: { type: Number, required: true },
  total: { type: Number, required: false }, // Made optional for party payments
  balance: { type: Number, default: 0 },
  paymentType: { type: String, enum: ['Cash', 'Cheque', 'Card', 'UPI'], default: 'Cash' },
  paymentDate: { type: Date, default: Date.now },
  description: { type: String },
  imageUrl: { type: String },
  category: { type: String, default: 'Purchase Payment Out' },
  status: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Paid' },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['%', 'PKR'], default: 'PKR' },
  discountAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true }, // Amount after discount
  partyBalanceAfterTransaction: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create indexes for efficient querying
PaymentOutSchema.index({ userId: 1, purchaseId: 1 });
PaymentOutSchema.index({ userId: 1, paymentDate: -1 });
PaymentOutSchema.index({ userId: 1, supplierName: 1 });

export default mongoose.model('PaymentOut', PaymentOutSchema);
