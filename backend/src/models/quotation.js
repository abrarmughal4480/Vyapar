import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  item: String,
  qty: Number,
  unit: String,
  customUnit: String,
  price: Number,
  amount: Number,
  discountPercentage: { type: String, default: '' },
  discountAmount: { type: String, default: '' }
}, { _id: false });

const quotationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  items: [itemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Quotation Open' },
  date: { type: Date, default: Date.now },
  refNo: { type: String },
  quotationNo: { type: String, required: true },
  quotationNumber: { type: String, required: true },
  discount: { type: Number, default: 0 },
  description: { type: String },
  customerBalance: { type: Number, default: 0 },
  partyBalanceAfterTransaction: { type: Number, default: 0 },
  convertedToSale: { type: String },
  convertedToSaleOrder: { type: String },
}, { timestamps: true });

// Create compound indexes for userId + quotationNo to ensure uniqueness per user
quotationSchema.index({ userId: 1, quotationNo: 1 }, { unique: true });
quotationSchema.index({ userId: 1, quotationNumber: 1 }, { unique: true });

// Drop any existing single-field unique indexes that might cause conflicts
// This ensures that quotation numbers can be the same across different users
quotationSchema.on('index', function(error) {
  if (error) {
    console.error('Index creation error:', error);
  }
});

export default mongoose.model('Quotation', quotationSchema); 