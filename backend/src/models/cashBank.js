import mongoose from 'mongoose';

const CashBankSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Basic cash details
  cashInHand: { 
    type: Number, 
    default: 0 
  },
  
  // Simple transaction fields
  type: { 
    type: String, 
    enum: ['Income', 'Expense'], 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  description: { 
    type: String 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('CashBank', CashBankSchema);