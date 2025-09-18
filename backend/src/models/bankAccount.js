import mongoose from 'mongoose';

const BankAccountSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Basic account details
  accountDisplayName: { 
    type: String, 
    required: true 
  },
  openingBalance: { 
    type: Number, 
    default: 0 
  },
  asOfDate: { 
    type: Date, 
    default: Date.now 
  },
  
  // Bank details
  accountNumber: { 
    type: String, 
    default: '' 
  },
  ifscCode: { 
    type: String, 
    default: '' 
  },
  upiId: { 
    type: String, 
    default: '' 
  },
  bankName: { 
    type: String, 
    default: '' 
  },
  accountHolderName: { 
    type: String, 
    default: '' 
  },
  
  // Settings
  printBankDetails: { 
    type: Boolean, 
    default: false 
  },
  
  // Current balance (calculated from transactions)
  currentBalance: { 
    type: Number, 
    default: 0 
  },
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
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
BankAccountSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('BankAccount', BankAccountSchema);

