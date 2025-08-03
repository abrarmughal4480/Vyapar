import mongoose from 'mongoose';

const partySchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  gstNumber: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user who created the party
  partyType: { type: String },
  openingBalance: { type: Number, default: 0 },
  pan: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  tags: [{ type: String }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  note: { type: String },
}, { timestamps: true });

// Add indexes for better performance
partySchema.index({ user: 1 }); // Index on user field for faster queries
partySchema.index({ name: 1, user: 1 }); // Compound index for name + user queries
partySchema.index({ status: 1, user: 1 }); // Index for status filtering
partySchema.index({ partyType: 1, user: 1 }); // Index for party type filtering

const Party = mongoose.model('Party', partySchema);
export default Party;
