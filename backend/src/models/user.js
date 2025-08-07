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
  website: { type: String },
  profileImage: { type: String },
  currentToken: { type: String }, // For single device login
  joinedCompanies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of company user IDs that this user has joined
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  emailVerified: { type: Boolean, default: false },
  role: { 
    type: String, 
    enum: ['user', 'superadmin'], 
    default: 'user' 
  },
  // License key tracking
  activatedLicenseKey: { type: mongoose.Schema.Types.ObjectId, ref: 'LicenseKey' },

}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
