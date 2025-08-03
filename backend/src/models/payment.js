import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
  billNo: { type: String, required: true },
  supplierName: { type: String, required: true },
  phoneNo: { type: String },
  amount: { type: Number, required: true },
  paymentType: { type: String, enum: ['Cash', 'Cheque', 'Card', 'UPI'], default: 'Cash' },
  paymentDate: { type: Date, default: Date.now },
  description: { type: String },
  imageUrl: { type: String },
  category: { type: String, default: 'Purchase Payment' },
  status: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Paid' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create indexes for efficient querying
PaymentSchema.index({ userId: 1, purchaseId: 1 });
PaymentSchema.index({ userId: 1, paymentDate: -1 });
PaymentSchema.index({ userId: 1, supplierName: 1 });

export default mongoose.model('Payment', PaymentSchema); 