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
  firstOpeningBalance: { type: Number, default: 0 },
  pan: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  tags: [{ type: String }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  note: { type: String },
}, { timestamps: true });

partySchema.index({ user: 1 }); 
partySchema.index({ name: 1, user: 1 }); 
partySchema.index({ status: 1, user: 1 }); 
partySchema.index({ partyType: 1, user: 1 });

const Party = mongoose.model('Party', partySchema);
export default Party;
