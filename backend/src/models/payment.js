import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  // For purchase payments
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: false },
  billNo: { type: String, required: false },
  supplierName: { type: String, required: false },
  
  // For sale payments  
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: false },
  invoiceNo: { type: String, required: false },
  customerName: { type: String, required: false },
  
  // Common fields
  partyName: { type: String, required: true }, // This will be either supplierName or customerName
  phoneNo: { type: String },
  amount: { type: Number, required: true },
  total: { type: Number, required: false }, // For specific bills
  balance: { type: Number, default: 0 },
  paymentType: { type: String, enum: ['Cash', 'Cheque', 'Card', 'UPI', 'Credit'], default: 'Cash' },
  bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: false },
  paymentDate: { type: Date, default: Date.now },
  description: { type: String },
  imageUrl: { type: String },
  category: { type: String, default: 'Payment' },
  status: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Paid' },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['%', 'PKR'], default: 'PKR' },
  discountAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  partyBalanceAfterTransaction: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create indexes for efficient querying
PaymentSchema.index({ userId: 1, purchaseId: 1 });
PaymentSchema.index({ userId: 1, saleId: 1 });
PaymentSchema.index({ userId: 1, paymentDate: -1 });
PaymentSchema.index({ userId: 1, partyName: 1 });

export default mongoose.model('Payment', PaymentSchema);
