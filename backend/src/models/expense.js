import mongoose from 'mongoose';

const ExpenseItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const ExpenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expenseCategory: { type: String, required: true },
  party: { type: String, required: false },
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' }, // Reference to party
  items: { type: [ExpenseItemSchema], required: true },
  totalAmount: { type: Number, required: true },
  paymentType: { type: String, enum: ['Cash', 'Card', 'UPI', 'Cheque', 'Credit'], required: true },
  paymentMethod: { type: String, default: 'Cash' }, // Payment method (Cash, Card, UPI, Cheque, Bank Transfer)
  bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' }, // Reference to bank account
  bankAccountName: { type: String, default: '' }, // Bank account display name
  receivedAmount: { type: Number, default: 0 }, // Amount received for credit payments
  creditAmount: { type: Number, default: 0 }, // Remaining amount to be paid
  expenseDate: { type: Date, required: true },
  expenseNumber: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  partyBalanceAfterTransaction: { type: Number, default: 0 },
});

// Create compound index for userId + expenseNumber to ensure uniqueness per user
ExpenseSchema.index({ userId: 1, expenseNumber: 1 }, { unique: true });

// Update the updatedAt field before saving
ExpenseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Expense', ExpenseSchema);
