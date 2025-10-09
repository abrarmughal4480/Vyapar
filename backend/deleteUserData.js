import mongoose from 'mongoose';
import config from './src/config/config.js';

// Import all models
import User from './src/models/user.js';
import Party from './src/models/parties.js';
import Sale from './src/models/sale.js';
import Purchase from './src/models/purchase.js';
import Item from './src/models/items.js';
import Expense from './src/models/expense.js';
import CashBank from './src/models/cashBank.js';
import BankAccount from './src/models/bankAccount.js';
import BankTransaction from './src/models/bankTransaction.js';
import Payment from './src/models/payment.js';
import PaymentOut from './src/models/payment-out.js';
import LicenseKey from './src/models/licenseKey.js';
import UserInvite from './src/models/userInvite.js';
import CreditNote from './src/models/creditNote.js';
import DeliveryChallan from './src/models/deliveryChallan.js';
import PurchaseOrder from './src/models/purchaseOrder.js';
import Quotation from './src/models/quotation.js';
import SaleOrder from './src/models/saleOrder.js';

/**
 * Script to reset all user data by email (keeps user account)
 * This script will:
 * 1. Find user by email
 * 2. Get user's ObjectId
 * 3. Delete all documents associated with that user from all collections
 * 4. Reset user account (clear sensitive data but keep account)
 */

async function connectToDatabase() {
  try {
    await mongoose.connect(config.dbUrl);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function findUserByEmail(email) {
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`📋 User ID: ${user._id}`);
    return user._id;
  } catch (error) {
    console.error('❌ Error finding user:', error.message);
    throw error;
  }
}

async function deleteUserData(userId) {
  const deletionResults = {};
  
  try {
    console.log(`\n🗑️  Starting deletion process for user ID: ${userId}`);
    
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

    return deletionResults;

  } catch (error) {
    console.error('❌ Error in deletion process:', error);
    throw error;
  }
}

async function main() {
  // Get email from command line arguments
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Please provide an email address as an argument');
    console.log('Usage: node deleteUserData.js <email>');
    process.exit(1);
  }

  console.log(`🚀 Starting user data reset for email: ${email}`);
  
  try {
    await connectToDatabase();
    
    const userId = await findUserByEmail(email);
    const deletionResults = await deleteUserData(userId);
    
    console.log('\n📊 Reset Summary:');
    console.log('================');
    Object.entries(deletionResults).forEach(([collection, count]) => {
      console.log(`${collection}: ${count}`);
    });
    
    console.log('\n✅ User data reset completed successfully!');
    console.log('📝 User account has been kept but all data has been cleared.');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
main().catch(console.error);
