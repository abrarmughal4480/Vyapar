import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String },
  subcategory: { type: String },
  hsn: { type: String },
  salePrice: { type: Number },
  purchasePrice: { type: Number },
  wholesalePrice: { type: Number },
  minimumWholesaleQuantity: { type: Number, default: 0 },
  discountType: { type: String },
  saleDiscount: { type: Number, default: 0 },
  stock: { type: Number },
  minStock: { type: Number },
  openingQuantity: { type: Number },
  openingStockQuantity: { type: Number },
  location: { type: String },
  
  taxRate: { type: Number, default: 0 },
  taxRateRaw: { type: String },
  inclusiveOfTax: { type: Boolean, default: false },
  inclusiveOfTaxRaw: { type: String },
  
  unit: {
    base: { type: String },
    secondary: { type: String },
    conversionFactor: { type: Number },
    customBase: { type: String },
    customSecondary: { type: String }
  },
  conversionRate: { type: Number },
  conversionRateRaw: { type: String },
  
  sku: { type: String },
  description: { type: String },
  supplier: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'Discontinued'], default: 'Active' },
  type: { type: String, enum: ['Product', 'Service'], default: 'Product' },
  imageUrl: { type: String },
  atPrice: { type: Number },
  asOfDate: { type: String }
}, { timestamps: true });

itemSchema.index({ userId: 1, itemId: 1 }, { unique: true });
itemSchema.index({ userId: 1, name: 1 });
itemSchema.index({ userId: 1, category: 1 });
itemSchema.index({ userId: 1, status: 1 });
itemSchema.index({ userId: 1, type: 1 });
itemSchema.index({ userId: 1, hsn: 1 });

itemSchema.methods.addStock = function(quantity, purchasePrice, purchaseId, supplier) {
  this.stock = (this.stock || 0) + quantity;
  this.purchasePrice = purchasePrice;
  
  return this.save();
};

itemSchema.methods.reduceStock = function(quantity) {
  if ((this.stock || 0) < quantity) {
    throw new Error('Insufficient stock available');
  }
  
  this.stock -= quantity;
  return this.save();
};

itemSchema.methods.getStockDetails = function() {
  const details = {
    totalStock: this.stock || 0
  };
  
  return details;
};

export default mongoose.model('Item', itemSchema);
