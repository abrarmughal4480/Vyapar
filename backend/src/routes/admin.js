import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import config from '../config/config.js';

// Import all models
import User from '../models/user.js';
import Party from '../models/parties.js';
import Sale from '../models/sale.js';
import Purchase from '../models/purchase.js';
import Item from '../models/items.js';
import Expense from '../models/expense.js';
import CashBank from '../models/cashBank.js';
import BankAccount from '../models/bankAccount.js';
import BankTransaction from '../models/bankTransaction.js';
import Payment from '../models/payment.js';
import PaymentOut from '../models/payment-out.js';
import LicenseKey from '../models/licenseKey.js';
import UserInvite from '../models/userInvite.js';
import CreditNote from '../models/creditNote.js';
import DeliveryChallan from '../models/deliveryChallan.js';
import PurchaseOrder from '../models/purchaseOrder.js';
import Quotation from '../models/quotation.js';
import SaleOrder from '../models/saleOrder.js';

const router = express.Router();

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to reset user data directly
async function resetUserData(email) {
  try {
    console.log(`🔄 Starting user data reset for email: ${email}`);
    
    // Connect to database if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.dbUrl);
      console.log('✅ Connected to MongoDB');
    }
    
    // Find user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`📋 User ID: ${user._id}`);
    
    const userId = user._id;
    const deletionResults = {};
    
    // Collections that directly reference userId
    const collections = [
      { name: 'Parties', model: Party, field: 'user' },
      { name: 'Sales', model: Sale, field: 'userId' },
      { name: 'Purchases', model: Purchase, field: 'userId' },
      { name: 'Items', model: Item, field: 'userId' },
      { name: 'Expenses', model: Expense, field: 'userId' },
      { name: 'CashBank', model: CashBank, field: 'userId' },
      { name: 'BankAccounts', model: BankAccount, field: 'userId' },
      { name: 'BankTransactions', model: BankTransaction, field: 'userId' },
      { name: 'Payments', model: Payment, field: 'userId' },
      { name: 'PaymentOuts', model: PaymentOut, field: 'userId' },
      { name: 'CreditNotes', model: CreditNote, field: 'userId' },
      { name: 'DeliveryChallans', model: DeliveryChallan, field: 'userId' },
      { name: 'PurchaseOrders', model: PurchaseOrder, field: 'userId' },
      { name: 'Quotations', model: Quotation, field: 'userId' },
      { name: 'SaleOrders', model: SaleOrder, field: 'userId' },
    ];

    // Delete from each collection
    for (const collection of collections) {
      try {
        const query = { [collection.field]: userId };
        const result = await collection.model.deleteMany(query);
        deletionResults[collection.name] = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} documents from ${collection.name}`);
      } catch (error) {
        console.error(`❌ Error deleting from ${collection.name}:`, error.message);
        deletionResults[collection.name] = `Error: ${error.message}`;
      }
    }

    // Handle UserInvite collection (has both requestedBy and requestedTo fields)
    try {
      const inviteResult = await UserInvite.deleteMany({
        $or: [
          { requestedBy: userId },
          { requestedTo: userId }
        ]
      });
      deletionResults['UserInvites'] = inviteResult.deletedCount;
      console.log(`✅ Deleted ${inviteResult.deletedCount} documents from UserInvites`);
    } catch (error) {
      console.error(`❌ Error deleting from UserInvites:`, error.message);
      deletionResults['UserInvites'] = `Error: ${error.message}`;
    }

    // Handle LicenseKey collection (has usedDevices array with userId)
    try {
      const licenseKeys = await LicenseKey.find({
        'usedDevices.userId': userId
      });
      
      let licenseKeyUpdates = 0;
      for (const licenseKey of licenseKeys) {
        const originalLength = licenseKey.usedDevices.length;
        licenseKey.usedDevices = licenseKey.usedDevices.filter(
          device => device.userId.toString() !== userId.toString()
        );
        
        if (licenseKey.usedDevices.length !== originalLength) {
          await licenseKey.save();
          licenseKeyUpdates++;
        }
      }
      
      deletionResults['LicenseKeyUpdates'] = licenseKeyUpdates;
      console.log(`✅ Updated ${licenseKeyUpdates} LicenseKeys (removed user from usedDevices)`);
    } catch (error) {
      console.error(`❌ Error updating LicenseKeys:`, error.message);
      deletionResults['LicenseKeyUpdates'] = `Error: ${error.message}`;
    }

    // Reset user account (keep account but clear sensitive data)
    try {
      const userResult = await User.updateOne(
        { _id: userId },
        {
          $unset: {
            currentToken: 1,
            resetPasswordToken: 1,
            resetPasswordExpires: 1,
            activatedLicenseKey: 1
          },
          $set: {
            emailVerified: false,
            joinedCompanies: []
          }
        }
      );
      deletionResults['UserReset'] = userResult.modifiedCount;
      console.log(`✅ Reset user account data (kept account but cleared sensitive data)`);
    } catch (error) {
      console.error(`❌ Error resetting user:`, error.message);
      deletionResults['UserReset'] = `Error: ${error.message}`;
    }

    console.log('\n📊 Reset Summary:');
    console.log('================');
    Object.entries(deletionResults).forEach(([collection, count]) => {
      console.log(`${collection}: ${count}`);
    });
    
    console.log('\n✅ User data reset completed successfully!');
    console.log('📝 User account has been kept but all data has been cleared.');
    
    return {
      success: true,
      message: `User ${email} has been reset successfully`,
      details: deletionResults
    };

  } catch (error) {
    console.error('❌ Error in reset process:', error);
    throw error;
  }
}

// Admin route to reset user data
router.post('/reset-user', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required'
      });
    }

    console.log(`🔄 Admin reset request for user: ${email}`);
    console.log(`👤 Requesting user: ${req.user?.email || 'Unknown'}`);
    
    // Execute the reset function directly
    const result = await resetUserData(email);
    
    res.json(result);

  } catch (error) {
    console.error('❌ Reset user error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to reset user: ${error.message}`
    });
  }
});

export default router;
