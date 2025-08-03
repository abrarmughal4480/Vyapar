import mongoose from 'mongoose';

const userInviteSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User being invited
  companyName: { type: String, required: true }, // This will store the business name
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  date: { type: Date, default: Date.now }
});

export default mongoose.model('UserInvite', userInviteSchema); 