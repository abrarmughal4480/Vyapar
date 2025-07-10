import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  itemId: { type: String, required: true }, // unique per user
  name: { type: String, required: true },
  category: { type: String },
  subcategory: { type: String },
  salePrice: { type: Number },
  purchasePrice: { type: Number },
  stock: { type: Number },
  minStock: { type: Number },
  unit: {
    base: { type: String },
    secondary: { type: String },
    conversionFactor: { type: Number },
    customBase: { type: String },
    customSecondary: { type: String }
  },
  sku: { type: String },
  description: { type: String },
  supplier: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'Discontinued'], default: 'Active' },
  type: { type: String, enum: ['Product', 'Service'] },
  imageUrl: { type: String },
  openingQuantity: { type: Number },
  atPrice: { type: Number },
  asOfDate: { type: String },
  location: { type: String },
  wholesalePrice: { type: Number }
});

itemSchema.index({ userId: 1, itemId: 1 }, { unique: true });

export default mongoose.model('Item', itemSchema);
