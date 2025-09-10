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
  asOfDate: { type: String },

  // Batch-wise inventory tracking
  batches: [
    {
      batchId: { type: String },
      quantity: { type: Number, required: true },
      purchasePrice: { type: Number },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

itemSchema.index({ userId: 1, itemId: 1 }, { unique: true });
itemSchema.index({ userId: 1, name: 1 });
itemSchema.index({ userId: 1, category: 1 });
itemSchema.index({ userId: 1, status: 1 });
itemSchema.index({ userId: 1, type: 1 });
itemSchema.index({ userId: 1, hsn: 1 });

itemSchema.methods.addStock = function(quantity, purchasePrice, purchaseId, supplier) {
  // CRITICAL FIX: Update stock based on batches for consistency
  if (!Array.isArray(this.batches)) {
    this.batches = [];
  }

  this.batches.push({ quantity, purchasePrice, createdAt: new Date() });
  
  // Recalculate stock from batches to ensure consistency
  this.stock = this.batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
  this.purchasePrice = purchasePrice;
  
  return this.save();
};

itemSchema.methods.reduceStock = function(quantity) {
  let remainingToDeduct = quantity;
  if (!Array.isArray(this.batches)) {
    this.batches = [];
  }

  // Calculate total available stock from all batches
  const totalAvailableStock = this.batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
  
  // Always allow negative stock - no more "Insufficient stock" errors
  if (totalAvailableStock >= quantity) {
    // Normal FIFO consumption from batches when sufficient stock is available
    for (let index = 0; index < this.batches.length && remainingToDeduct > 0; index++) {
      const batch = this.batches[index];
      const deduction = Math.min(batch.quantity || 0, remainingToDeduct);
      batch.quantity = (batch.quantity || 0) - deduction;
      remainingToDeduct -= deduction;
    }
  }
  
  // If there's still remaining quantity to deduct (insufficient stock), 
  // add it as negative quantity to the last batch or create a new batch
  if (remainingToDeduct > 0) {
    const lastBatch = this.batches[this.batches.length - 1];
    if (lastBatch) {
      // Use the last batch and make it more negative
      lastBatch.quantity = (lastBatch.quantity || 0) - remainingToDeduct;
    } else {
      // If no batches exist, create a new one with negative quantity
      this.batches.push({ 
        quantity: -remainingToDeduct, 
        purchasePrice: this.purchasePrice || 0,
        createdAt: new Date() 
      });
    }
  }

  // Remove empty batches (but keep negative quantity batches)
  this.batches = this.batches.filter(b => (b.quantity || 0) !== 0);

  // CRITICAL FIX: Recalculate stock from batches instead of manual update
  this.stock = this.batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
  
  return this.save();
};

itemSchema.methods.getStockDetails = function() {
  const details = {
    totalStock: this.stock || 0
  };
  
  return details;
};

export default mongoose.model('Item', itemSchema);
