import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  itemId: { type: String, required: true }, // unique per user
  name: { type: String, required: true },
  category: { type: String },
  subcategory: { type: String },
  hsn: { type: String }, // HSN code for tax purposes
  salePrice: { type: Number },
  purchasePrice: { type: Number },
  wholesalePrice: { type: Number },
  minimumWholesaleQuantity: { type: Number, default: 0 },
  discountType: { type: String }, // Percentage, Fixed, etc.
  saleDiscount: { type: Number, default: 0 },
  stock: { type: Number },
  minStock: { type: Number },
  openingQuantity: { type: Number },
  openingStockQuantity: { type: Number },
  location: { type: String },
  // Tax related fields
  taxRate: { type: Number, default: 0 },
  taxRateRaw: { type: String }, // Original string from import
  inclusiveOfTax: { type: Boolean, default: false },
  inclusiveOfTaxRaw: { type: String }, // Original string from import
  // Unit conversion fields
  unit: {
    base: { type: String },
    secondary: { type: String },
    conversionFactor: { type: Number },
    customBase: { type: String },
    customSecondary: { type: String }
  },
  conversionRate: { type: Number }, // For unit conversion
  conversionRateRaw: { type: String }, // Original string from import
  // Additional fields
  sku: { type: String },
  description: { type: String },
  supplier: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'Discontinued'], default: 'Active' },
  type: { type: String, enum: ['Product', 'Service'], default: 'Product' },
  imageUrl: { type: String },
  atPrice: { type: Number },
  asOfDate: { type: String }
}, { timestamps: true }); // <-- Enable timestamps

itemSchema.index({ userId: 1, itemId: 1 }, { unique: true });

// Add additional indexes for better performance
itemSchema.index({ userId: 1, name: 1 }); // For name-based searches
itemSchema.index({ userId: 1, category: 1 }); // For category filtering
itemSchema.index({ userId: 1, status: 1 }); // For status filtering
itemSchema.index({ userId: 1, type: 1 }); // For type filtering
itemSchema.index({ userId: 1, hsn: 1 }); // For HSN code searches

export default mongoose.model('Item', itemSchema);
