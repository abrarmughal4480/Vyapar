import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  businessName: { type: String, required: true },
  phone: { type: String, required: true },
  businessType: { type: String, required: true },
  address: { type: String },
  gstNumber: { type: String },
  website: { type: String }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
