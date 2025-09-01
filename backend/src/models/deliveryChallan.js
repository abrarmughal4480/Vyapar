import mongoose from 'mongoose';

const DeliveryChallanItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  qty: { type: Number, required: true },
  unit: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  customUnit: { type: String },
  // Batch consumption planning for when challan is converted to sale
  plannedBatches: [{
    quantity: { type: Number, required: true },
    purchasePrice: { type: Number, required: true }
  }]
}, { _id: false });

const DeliveryChallanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  challanNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  items: { type: [DeliveryChallanItemSchema], required: true },
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['%', 'PKR'], default: '%' },
  taxType: { type: String, enum: ['%', 'PKR'], default: '%' },
  description: { type: String },
  imageUrl: { type: String },
  status: { type: String, enum: ['Draft', 'Created', 'Completed', 'Cancelled'], default: 'Draft' },
  challanDate: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  refNo: { type: String },
  invoiceNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  partyBalanceAfterTransaction: { type: Number, default: 0 },
  // Stock check results when challan was created
  stockCheckResults: [{
    item: { type: String, required: true },
    available: { type: Boolean, required: true },
    requestedQty: { type: Number, required: true },
    availableStock: { type: Number, required: true },
    plannedBatches: [{
      quantity: { type: Number, required: true },
      purchasePrice: { type: Number, required: true }
    }],
    message: { type: String }
  }]
});

// Create compound index for userId + challanNumber to ensure uniqueness per user
DeliveryChallanSchema.index({ userId: 1, challanNumber: 1 }, { unique: true });

export default mongoose.model('DeliveryChallan', DeliveryChallanSchema); 