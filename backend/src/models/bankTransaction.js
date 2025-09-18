import mongoose from 'mongoose';

const BankTransactionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Transaction details
  type: { 
    type: String, 
    enum: [
      'Opening Balance',
      'Bank to Cash Transfer',
      'Cash to Bank Transfer', 
      'Bank to Bank Transfer',
      'Bank Adjustment Entry',
      'Payment In',
      'Payment Out',
      'Sale',
      'Purchase'
    ], 
    required: true 
  },
  
  // Account references
  fromAccount: { 
    type: String, 
    required: true 
  },
  toAccount: { 
    type: String, 
    required: true 
  },
  
  // Transaction amount
  amount: { 
    type: Number, 
    required: true 
  },
  
  // Transaction details
  description: { 
    type: String, 
    default: '' 
  },
  transactionDate: { 
    type: Date, 
    default: Date.now 
  },
  
  // For adjustment entries
  adjustmentType: { 
    type: String, 
    enum: ['Increase balance', 'Decrease balance'],
    default: null 
  },
  
  // Image attachment
  imageUrl: { 
    type: String, 
    default: null 
  },
  
  // Balance after transaction
  balanceAfter: { 
    type: Number, 
    required: true 
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['completed', 'pending', 'cancelled'],
    default: 'completed' 
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
BankTransactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
BankTransactionSchema.index({ userId: 1, transactionDate: -1 });
BankTransactionSchema.index({ userId: 1, fromAccount: 1 });
BankTransactionSchema.index({ userId: 1, toAccount: 1 });

export default mongoose.model('BankTransaction', BankTransactionSchema);

