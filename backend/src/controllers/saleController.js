import Sale from '../models/sale.js';
import Item from '../models/items.js';
import Payment from '../models/payment.js';
import mongoose from 'mongoose';

const getUnitDisplay = unit => {
  if (!unit) return '';
  const base = unit.base === 'custom' ? unit.customBase : unit.base;
  const secondary = unit.secondary && unit.secondary !== 'None'
    ? (unit.secondary === 'custom' ? unit.customSecondary : unit.secondary)
    : '';
  return secondary ? `${base} / ${secondary}` : base;
};

export const createSale = async (req, res) => {
  try {
    const { partyName, items } = req.body;
    if (!partyName || !items?.length) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const userIdObj = new mongoose.Types.ObjectId(userId);
    
    const Party = (await import('../models/parties.js')).default;
    let party = await Party.findOne({ name: partyName, user: userId });
    let partyCreated = false;
    
    if (!party) {
      party = new Party({
        name: partyName,
        phone: req.body.phoneNo || '',
        contactNumber: req.body.phoneNo || '',
        email: '',
        address: '',
        gstNumber: '',
        openingBalance: 0,
        firstOpeningBalance: 0,
        pan: '',
        city: '',
        state: '',
        pincode: '',
        tags: [],
        status: 'active',
        note: 'Auto-created from sale',
        user: userId
      });
      await party.save();
      partyCreated = true;
    }
    
    for (const saleItem of items) {
      let stockQuantity = Number(saleItem.qty);
      const dbItem = await Item.findOne({ userId: userIdObj.toString(), name: saleItem.item });
      if (dbItem?.unit) {
        const { unit: itemUnit } = dbItem;
        const saleUnit = saleItem.unit;
        
        if (typeof itemUnit === 'object' && itemUnit.base && itemUnit.secondary) {
          stockQuantity = saleUnit === itemUnit.secondary && itemUnit.conversionFactor
            ? Number(saleItem.qty) * itemUnit.conversionFactor
            : Number(saleItem.qty);
        } else if (typeof itemUnit === 'string' && itemUnit.includes(' / ')) {
          const [baseUnit, secondaryUnit] = itemUnit.split(' / ');
          stockQuantity = saleUnit === secondaryUnit 
            ? Number(saleItem.qty) * 12
            : Number(saleItem.qty);
        }
      }
      
      if (dbItem) {
        try {
          const originalBatches = JSON.parse(JSON.stringify(dbItem.batches || []));
          await dbItem.reduceStock(stockQuantity);
          
          const consumedBatches = [];
          const requestQty = Number(stockQuantity) || 0;
          let remainingToAllocate = requestQty;
          
          for (let i = 0; i < originalBatches.length && remainingToAllocate > 0; i++) {
            const { quantity: originalQty = 0, purchasePrice = dbItem.purchasePrice || 0 } = originalBatches[i];
            const currentQty = dbItem.batches[i]?.quantity || 0;
            const consumedFromBatch = Math.min(originalQty, originalQty - currentQty, remainingToAllocate);
            
            if (consumedFromBatch > 0) {
              consumedBatches.push({ quantity: consumedFromBatch, purchasePrice });
              remainingToAllocate -= consumedFromBatch;
            }
          }
          
          if (remainingToAllocate > 0) {
            const lastBatch = dbItem.batches[dbItem.batches.length - 1];
            consumedBatches.push({
              quantity: remainingToAllocate,
              purchasePrice: lastBatch?.purchasePrice || dbItem.purchasePrice || 0
            });
          }
          
          const totalCost = consumedBatches.reduce((sum, b) => sum + (Number(b.quantity || 0) * Number(b.purchasePrice || 0)), 0);
          Object.assign(saleItem, { consumedBatches, totalCost });
          
        } catch (error) {
          try {
            const currentStock = dbItem.stock || 0;
            const requestQty = Number(stockQuantity) || 0;
            const toDeduct = Math.min(currentStock, requestQty);
            if (!Array.isArray(dbItem.batches)) dbItem.batches = [];
            
            let remaining = toDeduct;
            const consumed = [];
            for (let i = 0; i < dbItem.batches.length && remaining > 0; i++) {
              const batch = dbItem.batches[i];
              const canDeduct = Math.min(batch.quantity || 0, remaining);
              batch.quantity = (batch.quantity || 0) - canDeduct;
              remaining -= canDeduct;
              if (canDeduct > 0) {
                consumed.push({ 
                  quantity: canDeduct, 
                  purchasePrice: batch.purchasePrice || dbItem.purchasePrice || 0 
                });
              }
            }
            dbItem.batches = dbItem.batches.filter(b => (b.quantity || 0) > 0);
            dbItem.stock = (dbItem.stock || 0) - toDeduct;
            await dbItem.save();
            const totalCost = consumed.reduce((sum, b) => sum + (Number(b.quantity || 0) * Number(b.purchasePrice || 0)), 0);
            Object.assign(saleItem, { consumedBatches: consumed, totalCost });
          } catch (fallbackErr) {
            dbItem.stock = Math.max(0, (dbItem.stock || 0) - (Number(stockQuantity) || 0));
            await dbItem.save();
          }
        }
      }
    }
    
    const originalSubTotal = items.reduce((sum, { qty = 0, price = 0 }) => 
      sum + (Number(qty) * Number(price)), 0);
    
    const totalItemDiscount = items.reduce((total, item) => {
      const { qty = 0, price = 0, discountPercentage, discountAmount } = item;
      const itemDiscount = discountPercentage 
        ? (Number(qty) * Number(price) * Number(discountPercentage)) / 100
        : Number(discountAmount) || 0;
      return total + itemDiscount;
    }, 0);
    
    const { discount, discountType, taxType = '%', tax = 0 } = req.body;
    const discountValue = discount && !isNaN(Number(discount))
      ? discountType === '%' ? originalSubTotal * Number(discount) / 100 : Number(discount)
      : 0;
    
    const totalDiscount = totalItemDiscount + discountValue;
    const finalSubTotal = originalSubTotal - totalItemDiscount;
    
    const taxValue = taxType === '%' 
      ? (originalSubTotal - totalDiscount) * Number(tax) / 100
      : Number(tax);
    
    const grandTotal = Math.max(0, originalSubTotal - totalDiscount + taxValue);
    
    let invoiceNo = 'INV001';
    const lastSale = await Sale.findOne({ userId: userIdObj }).sort({ createdAt: -1 });
    if (lastSale?.invoiceNo) {
      const match = lastSale.invoiceNo.match(/INV(\d+)/);
      if (match) {
        const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
        invoiceNo = `INV${nextNum}`;
      }
    }
    
    const received = req.body.receivedAmount !== undefined && req.body.receivedAmount !== null
      ? Number(req.body.receivedAmount) || 0
      : 0;
    const balance = grandTotal - received;

    const paymentType = req.body.paymentType || 'Credit';
    if (!['Cash', 'Credit'].includes(paymentType)) {
      return res.status(400).json({ success: false, message: 'Invalid paymentType. Must be Cash or Credit.' });
    }
    
    let paymentMethod = req.body.paymentMethod || 'Cash';
    if (paymentMethod.startsWith('bank_')) paymentMethod = 'Bank Transfer';
    
    if (!['Cash', 'Cheque', 'Bank Transfer'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid paymentMethod. Must be Cash, Cheque, or Bank Transfer.' });
    }
    
    const { bankAccountId = null, bankAccountName = '' } = req.body;

    if (paymentMethod === 'Bank Transfer' && bankAccountId && received > 0) {
      try {
        const BankAccount = (await import('../models/bankAccount.js')).default;
        const BankTransaction = (await import('../models/bankTransaction.js')).default;
        
        const bankAccount = await BankAccount.findOne({ 
          _id: bankAccountId, 
          userId: userIdObj, 
          isActive: true 
        });
        
        if (bankAccount) {
          const newBalance = bankAccount.currentBalance + received;
          await BankAccount.findByIdAndUpdate(bankAccountId, { 
            currentBalance: newBalance,
            updatedAt: new Date()
          });
          
          const bankTransaction = new BankTransaction({
            userId: userIdObj,
            type: 'Sale',
            fromAccount: partyName,
            toAccount: bankAccount.accountDisplayName,
            amount: received,
            description: `Sale payment received for invoice ${invoiceNo}`,
            transactionDate: new Date(),
            balanceAfter: newBalance,
            status: 'completed'
          });
          await bankTransaction.save();
        }
      } catch (bankError) {}
    }
    
    const sale = new Sale({
      ...req.body,
      userId: userIdObj,
      discountValue: totalDiscount,
      taxType,
      tax,
      taxValue,
      grandTotal,
      invoiceNo,
      balance,
      received,
      paymentType,
      paymentMethod,
      bankAccountId,
      bankAccountName
    });
    await sale.save();
    
    const saleObj = sale.toObject();
    if (Array.isArray(saleObj.items)) {
      saleObj.items = saleObj.items.map(item => ({
        ...item,
        unit: typeof item.unit === 'object' ? getUnitDisplay(item.unit) : item.unit
      }));
    }
    
    if (req.body.sourceOrderId) {
      try {
        const SaleOrder = (await import('../models/saleOrder.js')).default;
        const saleOrder = await SaleOrder.findById(req.body.sourceOrderId);
        if (saleOrder) {
          Object.assign(saleOrder, {
            status: 'Completed',
            invoiceNumber: sale.invoiceNo,
            convertedToInvoice: sale._id
          });
          await saleOrder.save();
        }
      } catch (err) {}
    }
    
    try {
      
      if (party) {
        
        const partyCurrentBalance = party.openingBalance || 0;
        
        if (paymentType === 'Credit') {
          party.openingBalance = partyCurrentBalance + balance;
        } else if (paymentType === 'Cash' && balance > 0) {
          party.openingBalance = partyCurrentBalance + balance;
        }
        const partyBalanceAfterTransaction = party.openingBalance;
        sale.partyBalanceAfterTransaction = partyBalanceAfterTransaction;
        await sale.save();
        await party.save();
      }
    } catch (err) {}
    
    res.status(201).json({ success: true, sale: saleObj, partyCreated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSalesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyName } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    const filter = { userId, ...(companyName && { companyName }) };
    const sales = await Sale.find(filter).sort({ createdAt: -1 });
    
    const salesWithUnitString = sales.map(sale => {
      const saleObj = sale.toObject();
      if (Array.isArray(saleObj.items)) {
        let actualSaleAmount = 0;
        saleObj.items = saleObj.items.map(item => {
          const { qty = 0, price = 0, discountPercentage, discountAmount } = item;
          const originalAmount = qty * price;
          const itemDiscount = discountPercentage 
            ? (originalAmount * parseFloat(discountPercentage)) / 100
            : parseFloat(discountAmount) || 0;
          const actualAmount = originalAmount - itemDiscount;
          actualSaleAmount += actualAmount;
          
          return {
            ...item,
            unit: typeof item.unit === 'object' ? getUnitDisplay(item.unit) : item.unit,
            originalAmount,
            itemDiscount,
            actualAmount
          };
        });
        saleObj.actualSaleAmount = actualSaleAmount;
      }
      return saleObj;
    });
    res.json({ success: true, sales: salesWithUnitString });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const receivePayment = async (req, res) => {
  try {
    const { saleId, amount, discount, discountType, paymentType, bankAccountId } = req.body;
    if (!saleId || (typeof amount !== 'number' && amount !== 0)) {
      return res.status(400).json({ success: false, message: 'Missing saleId or invalid amount' });
    }
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    let discountValue = 0;
    let newGrandTotal = sale.grandTotal;
    let newBalance = sale.balance;

    if (discount && discount > 0 && discountType) {
      discountValue = discountType === '%' 
        ? (sale.grandTotal * discount) / 100 
        : discount;
      
      newGrandTotal = Math.max(0, sale.grandTotal - discountValue);
      newBalance = Math.max(0, sale.balance - discountValue);
      
      Object.assign(sale, {
        grandTotal: newGrandTotal,
        balance: newBalance,
        discount,
        discountType,
        discountValue
      });
    }

    
    const excessAmount = Math.max(0, amount - newBalance);
    
    
    if (amount > 0) {
      sale.received = (sale.received || 0) + amount;
      sale.balance = Math.max(0, newBalance - amount);
      
      // Handle bank account payment
      const isBankTransfer = (paymentType && paymentType.startsWith('bank_')) || 
                            (sale.paymentMethod === 'Bank Transfer' && sale.bankAccountId);
      const targetBankAccountId = (paymentType && paymentType.startsWith('bank_')) ? 
                                 paymentType.replace('bank_', '') : 
                                 (bankAccountId || sale.bankAccountId);
      
      if (isBankTransfer && targetBankAccountId) {
        try {
          const BankAccount = (await import('../models/bankAccount.js')).default;
          const BankTransaction = (await import('../models/bankTransaction.js')).default;
          
          const bankAccount = await BankAccount.findOne({ 
            _id: targetBankAccountId, 
            userId: sale.userId, 
            isActive: true 
          });
          
          if (bankAccount) {
            const newBalance = bankAccount.currentBalance + amount;
            await BankAccount.findByIdAndUpdate(targetBankAccountId, { 
              currentBalance: newBalance,
              updatedAt: new Date()
            });
            
            const bankTransaction = new BankTransaction({
              userId: sale.userId,
              type: 'Payment In',
              fromAccount: sale.customerName,
              toAccount: bankAccount.accountDisplayName,
              amount: amount,
              description: `Payment received for sale invoice ${sale.invoiceNo}`,
              transactionDate: new Date(),
              balanceAfter: newBalance,
              status: 'completed'
            });
            await bankTransaction.save();
          }
        } catch (bankError) {
          console.error('Bank account update error:', bankError);
        }
      }
    } else {
      sale.balance = newBalance;
    }
    
    await sale.save();

    if (amount > 0) {
      try {
        const paymentRecord = new Payment({
          userId: sale.userId,
          saleId: saleId,
          invoiceNo: sale.invoiceNo,
          customerName: sale.partyName,
          partyName: sale.partyName, 
          phoneNo: sale.phoneNo || '',
          amount: amount,
          total: sale.grandTotal,
          balance: sale.balance,
          paymentType: sale.paymentType || 'Cash',
          paymentDate: new Date(),
          description: `Payment received for invoice ${sale.invoiceNo}`,
          imageUrl: '',
          category: 'Invoice Payment In',
          status: sale.balance === 0 ? 'Paid' : 'Partial',
          discount: discount || 0,
          discountType: discountType || 'PKR',
          discountAmount: discountValue,
          finalAmount: amount,
          partyBalanceAfterTransaction: 0 
        });
        await paymentRecord.save();
      } catch (paymentErr) {}
    }

    try {
      const Party = (await import('../models/parties.js')).default;
      const partyDoc = await Party.findOne({ name: sale.partyName, user: sale.userId });
      if (partyDoc) {
        if (amount > 0) {
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) - amount;
        }
        if (excessAmount > 0) {
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) + excessAmount;
        }
        await partyDoc.save();
        
        if (amount > 0) {
          try {
            await Payment.findOneAndUpdate(
              { saleId: saleId, amount: amount },
              { partyBalanceAfterTransaction: partyDoc.openingBalance }
            );
          } catch (updateErr) {}
        }
      }
    } catch (err) {}

    res.json({ 
      success: true, 
      sale,
      discountApplied: discountValue > 0,
      discountValue,
      newGrandTotal,
      newBalance: sale.balance,
      paymentProcessed: amount > 0,
      excessAmount: excessAmount > 0 ? excessAmount : 0,
      openingBalanceSet: excessAmount > 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const receivePartyPayment = async (req, res) => {
  try {
    const { partyName, amount, discount, discountType, paymentType = 'Cash', description = '', imageUrl = '', bankAccountId } = req.body;
    const userId = req.user?._id || req.user?.id;
    
    if (!partyName || (typeof amount !== 'number' && amount !== 0) || amount < 0) {
      return res.status(400).json({ success: false, message: 'Missing partyName or invalid amount' });
    }

    try {
      const Party = (await import('../models/parties.js')).default;
      const partyDoc = await Party.findOne({ name: partyName, user: userId });
      
      if (!partyDoc) {
        return res.status(404).json({ success: false, message: 'Party not found' });
      }

      const discountAmount = discount && discount > 0 && discountType
        ? discountType === '%' ? (amount * discount) / 100 : Math.min(discount, amount)
        : 0;

      const finalAmount = Math.max(0, amount - discountAmount);
      partyDoc.openingBalance = (partyDoc.openingBalance || 0) - finalAmount;
      await partyDoc.save();

      // Handle bank account payment
      const isBankTransfer = paymentType && paymentType.startsWith('bank_');
      const targetBankAccountId = isBankTransfer ? 
                                 paymentType.replace('bank_', '') : 
                                 bankAccountId;
      
      if (isBankTransfer && targetBankAccountId) {
        try {
          const BankAccount = (await import('../models/bankAccount.js')).default;
          const BankTransaction = (await import('../models/bankTransaction.js')).default;
          
          const bankAccount = await BankAccount.findOne({ 
            _id: targetBankAccountId, 
            userId: userId, 
            isActive: true 
          });
          
          if (bankAccount) {
            const newBalance = bankAccount.currentBalance + finalAmount;
            await BankAccount.findByIdAndUpdate(targetBankAccountId, { 
              currentBalance: newBalance,
              updatedAt: new Date()
            });
            
            const bankTransaction = new BankTransaction({
              userId: userId,
              type: 'Payment In',
              fromAccount: partyName,
              toAccount: bankAccount.accountDisplayName,
              amount: finalAmount,
              description: `Party payment received from ${partyName}`,
              transactionDate: new Date(),
              balanceAfter: newBalance,
              status: 'completed'
            });
            await bankTransaction.save();
          }
        } catch (bankError) {
          console.error('Bank account update error:', bankError);
        }
      }

      try {
        const paymentRecord = new Payment({
          userId,
          saleId: null, 
          invoiceNo: null, 
          customerName: partyName,
          partyName: partyName, 
          phoneNo: partyDoc.phoneNo || partyDoc.contactNumber || '',
          amount: finalAmount,
          total: null, 
          balance: 0, 
          paymentType,
          paymentDate: new Date(),
          description: description || `Party payment received from ${partyName}`,
          imageUrl,
          category: 'Party Payment In',
          status: 'Paid',
          discount: discount || 0,
          discountType: discountType || 'PKR',
          discountAmount,
          finalAmount,
          partyBalanceAfterTransaction: partyDoc.openingBalance
        });
        await paymentRecord.save();
      } catch (paymentErr) {}

      res.json({ 
        success: true, 
        message: `Payment received for ${partyName}`,
        amount: finalAmount,
        discountApplied: discountAmount > 0,
        discountAmount,
        newOpeningBalance: partyDoc.openingBalance
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update party balance' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getSalesStatsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    let objectUserId;
    try {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.json({ success: true, stats: { totalGrandTotal: 0, totalBalance: 0, totalReceived: 0 } });
    }
    
    const stats = await Sale.aggregate([
      { $match: { userId: objectUserId } },
      {
        $group: {
          _id: null,
          totalGrandTotal: { $sum: "$grandTotal" },
          totalBalance: { $sum: "$balance" },
          totalReceived: { $sum: "$received" }
        }
      }
    ]);
    const result = stats[0] || { totalGrandTotal: 0, totalBalance: 0, totalReceived: 0 };
    res.json({ success: true, stats: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const deleteSale = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { saleId } = req.params;
    const sale = await Sale.findOne({ _id: saleId });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    if (String(sale.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this sale' });
    }
    
    
    const items = sale.items || [];
    for (const saleItem of items) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: saleItem.item });
      if (dbItem) {
        
        let stockQuantity = Number(saleItem.qty);
        
        
        if (dbItem.unit) {
          const itemUnit = dbItem.unit;
          const saleUnit = saleItem.unit;
          
          
          if (typeof itemUnit === 'object' && itemUnit.base && itemUnit.secondary) {
            
            if (saleUnit === itemUnit.secondary && itemUnit.conversionFactor) {
              stockQuantity = Number(saleItem.qty) * itemUnit.conversionFactor;
            }
            
            else if (saleUnit === itemUnit.base) {
              stockQuantity = Number(saleItem.qty);
            }
            
            else {
              stockQuantity = Number(saleItem.qty);
            }
          }
          
          else if (typeof itemUnit === 'string' && itemUnit.includes(' / ')) {
            const parts = itemUnit.split(' / ');
            const baseUnit = parts[0];
            const secondaryUnit = parts[1];
            
            
            if (saleUnit === secondaryUnit) {
              stockQuantity = Number(saleItem.qty) * 12; 
            }
            
            else if (saleUnit === baseUnit) {
              stockQuantity = Number(saleItem.qty);
            }
            
            else {
              stockQuantity = Number(saleItem.qty);
            }
          }
          
          else {
            stockQuantity = Number(saleItem.qty);
          }
        }
        
        
        if (dbItem) {
          
          dbItem.stock = (dbItem.stock || 0) + stockQuantity;
        }
        
        await dbItem.save();
      }
    }
    
    
    try {
      if (sale.paymentType === 'Credit' && sale.balance > 0) {
        const Party = (await import('../models/parties.js')).default;
        const partyDoc = await Party.findOne({ name: sale.partyName, user: userId });
        if (partyDoc) {
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) - sale.balance;
          await partyDoc.save();
        }
      }
    } catch (err) {
      
    }

    
    try {
      if (sale.paymentMethod === 'Bank Transfer' && sale.bankAccountId && sale.received > 0) {
        const BankAccount = (await import('../models/bankAccount.js')).default;
        const BankTransaction = (await import('../models/bankTransaction.js')).default;
        
        
        const bankAccount = await BankAccount.findOne({ 
          _id: sale.bankAccountId, 
          userId: userId, 
          isActive: true 
        });
        
        if (bankAccount) {
          
          const newBalance = bankAccount.currentBalance - sale.received;
          await BankAccount.findByIdAndUpdate(sale.bankAccountId, { 
            currentBalance: Math.max(0, newBalance), 
            updatedAt: new Date()
          });
          
          
          await BankTransaction.deleteMany({
            userId: userId,
            description: { $regex: `invoice ${sale.invoiceNo}`, $options: 'i' }
          });
          
          
          
        }
      }
    } catch (bankError) {
      
      
    }
    
    await Sale.deleteOne({ _id: saleId });
    res.json({ success: true, message: 'Sale deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};




export const updateSale = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { saleId } = req.params;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    
    const oldSale = await Sale.findOne({ _id: saleId, userId });
    if (!oldSale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }


    
    const oldItems = oldSale.items || [];
    const newItems = updateData.items || [];
    
    for (const oldItem of oldItems) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: oldItem.item });
      if (dbItem) {
        
        const newItem = newItems.find(item => item.item === oldItem.item);
        const oldQty = Number(oldItem.qty);
        const newQty = newItem ? Number(newItem.qty) : 0;
        
        
        const quantityToRestore = Math.max(0, oldQty - newQty);
        
        if (quantityToRestore > 0) {
          
          const stockBeforeRestore = dbItem.stock || 0;
          
          
          let stockQuantity = quantityToRestore;
          
          
          if (dbItem.unit) {
            const itemUnit = dbItem.unit;
            const saleUnit = oldItem.unit;
            
            if (typeof itemUnit === 'object' && itemUnit.base && itemUnit.secondary) {
              if (saleUnit === itemUnit.secondary && itemUnit.conversionFactor) {
                stockQuantity = quantityToRestore * itemUnit.conversionFactor;
              }
            } else if (typeof itemUnit === 'string' && itemUnit.includes(' / ')) {
              const parts = itemUnit.split(' / ');
              const secondaryUnit = parts[1];
              if (saleUnit === secondaryUnit) {
                stockQuantity = quantityToRestore * 12; 
              }
            }
          }
          
          
          if (oldItem.consumedBatches && Array.isArray(oldItem.consumedBatches) && oldItem.consumedBatches.length > 0) {
            
            const oldTotalQuantity = oldItem.consumedBatches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
            const restoreRatio = oldTotalQuantity > 0 ? quantityToRestore / oldTotalQuantity : 0;
            
            let remainingToRestore = quantityToRestore;
            
            for (const consumedBatch of oldItem.consumedBatches) {
              if (remainingToRestore <= 0) break;
              
              const batchQty = consumedBatch.quantity || 0;
              const batchPrice = consumedBatch.purchasePrice || 0;
              
              
              const restoreFromBatch = Math.min(remainingToRestore, Math.round(batchQty * restoreRatio));
              
              if (restoreFromBatch > 0) {
                
                await dbItem.addStock(restoreFromBatch, batchPrice);
                remainingToRestore -= restoreFromBatch;
              }
            }
            
            
            if (remainingToRestore > 0) {
              await dbItem.addStock(remainingToRestore, oldItem.purchasePrice || dbItem.purchasePrice || 0);
            }
          } else {
            
            await dbItem.addStock(stockQuantity, oldItem.purchasePrice || dbItem.purchasePrice || 0);
          }
        }
      }
    }

    
    try {
      const Party = (await import('../models/parties.js')).default;
      const oldParty = await Party.findOne({ name: oldSale.partyName, user: userId });
      if (oldParty) {
        
        if (oldSale.balance > 0) {
          oldParty.openingBalance = (oldParty.openingBalance || 0) - oldSale.balance;
          await oldParty.save();
        }
      }
    } catch (err) {
      
    }

    

    
    for (const newItem of newItems) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: newItem.item });
      if (dbItem) {
        
        const oldSaleItem = oldItems.find(oldItem => oldItem.item === newItem.item);
        const oldQty = oldSaleItem ? Number(oldSaleItem.qty) : 0;
        const newQty = Number(newItem.qty);
        
        
        const additionalQty = Math.max(0, newQty - oldQty);
        
        
        const quantityChange = newQty - oldQty;
        
        if (quantityChange !== 0) {
          
          const oldConsumedBatches = oldSaleItem ? (oldSaleItem.consumedBatches || []) : [];
          
          if (quantityChange > 0) {
            
            
            
            
            const consumedBatches = [];
            let totalCost = 0;
            let remainingToConsume = additionalQty;
            
            
            for (let i = 0; i < dbItem.batches.length && remainingToConsume > 0; i++) {
              const batch = dbItem.batches[i];
              const availableInBatch = batch.quantity || 0;
              const consumeFromBatch = Math.min(availableInBatch, remainingToConsume);
              
              if (consumeFromBatch > 0) {
                
                consumedBatches.push({
                  quantity: consumeFromBatch,
                  purchasePrice: batch.purchasePrice || dbItem.purchasePrice || 0
                });
                
                
                totalCost += consumeFromBatch * (batch.purchasePrice || dbItem.purchasePrice || 0);
                
                
                remainingToConsume -= consumeFromBatch;
                
              }
            }
            
            
            if (remainingToConsume > 0) {
              
              consumedBatches.push({
                quantity: remainingToConsume,
                purchasePrice: dbItem.purchasePrice || 0
              });
              
              totalCost += remainingToConsume * (dbItem.purchasePrice || 0);
            }
            
            
            await dbItem.reduceStock(additionalQty);
            
            
            newItem.consumedBatches = consumedBatches;
            newItem.totalCost = totalCost;
            
          } else {
            
            
            
            const oldTotalQuantity = oldConsumedBatches.reduce((sum, b) => sum + b.quantity, 0);
            const newQuantity = newQty;
            const reductionRatio = oldTotalQuantity > 0 ? newQuantity / oldTotalQuantity : 0;
            
            
            const newConsumedBatches = [];
            let totalCost = 0;
            
            for (const oldBatch of oldConsumedBatches) {
              const oldQty = oldBatch.quantity;
              const newQty = Math.round(oldQty * reductionRatio);
              
              if (newQty > 0) {
                newConsumedBatches.push({
                  quantity: newQty,
                  purchasePrice: oldBatch.purchasePrice
                });
                totalCost += newQty * oldBatch.purchasePrice;
              }
            }
            
            
            newItem.consumedBatches = newConsumedBatches;
            newItem.totalCost = totalCost;
            
          }
          
        } else {
          
          newItem.consumedBatches = oldSaleItem ? (oldSaleItem.consumedBatches || []) : [];
          newItem.totalCost = oldSaleItem ? (oldSaleItem.totalCost || 0) : 0;
        }

      }
    }

    
    const originalSubTotal = newItems.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return sum + (qty * price);
    }, 0);
    
    
    const totalItemDiscount = newItems.reduce((total, item) => {
      let itemDiscount = 0;
      if (item.discountPercentage) {
        const qty = Number(item.qty) || 0;
        const price = Number(item.price) || 0;
        itemDiscount = (qty * price * Number(item.discountPercentage)) / 100;
      } else if (item.discountAmount) {
        itemDiscount = Number(item.discountAmount) || 0;
      }
      return total + itemDiscount;
    }, 0);
    
    
    let discountValue = 0;
    if (updateData.discount && !isNaN(Number(updateData.discount))) {
      if (updateData.discountType === '%') {
        discountValue = originalSubTotal * Number(updateData.discount) / 100;
      } else {
        discountValue = Number(updateData.discount);
      }
    }
    
    
    const totalDiscount = totalItemDiscount + discountValue;
    
    
    let taxType = updateData.taxType || '%';
    let tax = updateData.tax || 0;
    let taxValue = 0;
    if (taxType === '%') {
      taxValue = (originalSubTotal - totalDiscount) * Number(tax) / 100;
    } else if (taxType === 'PKR') {
      taxValue = Number(tax);
    }
    
    const grandTotal = Math.max(0, originalSubTotal - totalDiscount + taxValue);
    
    
    let received = Number(updateData.receivedAmount || updateData.received) || 0;
    const balance = grandTotal - received;
    
    
    const paymentType = updateData.paymentType || 'Credit';
    if (!['Cash', 'Credit'].includes(paymentType)) {
      return res.status(400).json({ success: false, message: 'Invalid paymentType. Must be Cash or Credit.' });
    }
    
    let paymentMethod = updateData.paymentMethod || 'Cash';
    
    
    if (paymentMethod.startsWith('bank_')) {
      paymentMethod = 'Bank Transfer';
    }
    
    if (!['Cash', 'Cheque', 'Bank Transfer'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid paymentMethod. Must be Cash, Cheque, or Bank Transfer.' });
    }
    

    
    let partyCreated = false;
    try {
      const Party = (await import('../models/parties.js')).default;
      let newParty = await Party.findOne({ name: updateData.partyName, user: userId });
      
      
      if (!newParty) {
        newParty = new Party({
          name: updateData.partyName,
          phone: updateData.phoneNo || '',
          contactNumber: updateData.phoneNo || '',
          email: '',
          address: '',
          gstNumber: '',
          openingBalance: 0,
          firstOpeningBalance: 0,
          pan: '',
          city: '',
          state: '',
          pincode: '',
        tags: [],
        status: 'active',
        note: 'Auto-created from sale update',
          user: userId
        });
        
        await newParty.save();
        partyCreated = true;
        
      }
      
      if (newParty) {
        if (paymentType === 'Credit') {
          
          newParty.openingBalance = (newParty.openingBalance || 0) + balance;
        } else if (paymentType === 'Cash') {
          
          if (balance > 0) {
            newParty.openingBalance = (newParty.openingBalance || 0) + balance;
          }
        }
        
        
        const partyBalanceAfterTransaction = newParty.openingBalance;
        
        await newParty.save();
        
        
        updateData.partyBalanceAfterTransaction = partyBalanceAfterTransaction;
      }
    } catch (err) {
      
    }

    
    try {
      const newPaymentMethod = updateData.paymentMethod || 'Cash';
      const newBankAccountId = updateData.bankAccountId || null;
      const newBankAccountName = updateData.bankAccountName || '';
      
      
      let actualNewPaymentMethod = newPaymentMethod;
      if (newPaymentMethod.startsWith('bank_')) {
        actualNewPaymentMethod = 'Bank Transfer';
      }
      
      const BankAccount = (await import('../models/bankAccount.js')).default;
      const BankTransaction = (await import('../models/bankTransaction.js')).default;
      
      
      const oldReceived = oldSale.received || 0;
      const newReceived = received || 0;
      const receivedDifference = newReceived - oldReceived;
      
      
      const bankAccountChanged = oldSale.bankAccountId && newBankAccountId && 
        oldSale.bankAccountId.toString() !== newBankAccountId.toString();
      
      
      if (receivedDifference !== 0 || bankAccountChanged || 
          (oldSale.paymentMethod !== actualNewPaymentMethod)) {
        
        if (oldSale.paymentMethod === 'Bank Transfer' && actualNewPaymentMethod === 'Bank Transfer' && 
            oldSale.bankAccountId && newBankAccountId && 
            oldSale.bankAccountId.toString() === newBankAccountId.toString()) {
          
          
          const bankAccount = await BankAccount.findOne({ 
            _id: newBankAccountId, 
            userId: userId, 
            isActive: true 
          });
          
          if (bankAccount) {
            const newBalance = bankAccount.currentBalance + receivedDifference;
            await BankAccount.findByIdAndUpdate(newBankAccountId, { 
              currentBalance: newBalance,
              updatedAt: new Date()
            });
            
            
            const existingTransaction = await BankTransaction.findOne({
              userId: userId,
              description: { $regex: `invoice ${oldSale.invoiceNo}`, $options: 'i' },
              type: 'Cash to Bank Transfer',
              toAccount: bankAccount.accountDisplayName
            }).sort({ transactionDate: -1 });
            
            if (existingTransaction) {
              
              await BankTransaction.findByIdAndUpdate(existingTransaction._id, {
                amount: newReceived,
                balanceAfter: newBalance,
                updatedAt: new Date()
              });
              
            } else {
              
              const bankTransaction = new BankTransaction({
                userId: userId,
                type: 'Cash to Bank Transfer',
                fromAccount: 'Cash',
                toAccount: bankAccount.accountDisplayName,
                amount: newReceived,
                description: `Payment received for sale invoice ${oldSale.invoiceNo}`,
                transactionDate: new Date(),
                balanceAfter: newBalance,
                status: 'completed'
              });
              
              await bankTransaction.save();
              
            }
          }
        } else if (oldSale.paymentMethod === 'Bank Transfer' && actualNewPaymentMethod === 'Bank Transfer' && 
                   oldSale.bankAccountId && newBankAccountId && 
                   oldSale.bankAccountId.toString() !== newBankAccountId.toString()) {
          
          // Bank account changed - restore old bank and create new transaction
          
          // First, restore the old bank account
          if (oldSale.bankAccountId && oldSale.received > 0) {
            const oldBankAccount = await BankAccount.findOne({ 
              _id: oldSale.bankAccountId, 
              userId: userId, 
              isActive: true 
            });
            
            if (oldBankAccount) {
              const restoredBalance = oldBankAccount.currentBalance - oldSale.received;
              await BankAccount.findByIdAndUpdate(oldSale.bankAccountId, { 
                currentBalance: Math.max(0, restoredBalance),
                updatedAt: new Date()
              });
              
              // Delete old transaction
              await BankTransaction.deleteMany({
                userId: userId,
                description: { $regex: `invoice ${oldSale.invoiceNo}`, $options: 'i' },
                type: 'Cash to Bank Transfer',
                toAccount: oldBankAccount.accountDisplayName
              });
            }
          }
          
          // Now create new transaction for new bank account
          if (newBankAccountId && newReceived > 0) {
            const newBankAccount = await BankAccount.findOne({ 
              _id: newBankAccountId, 
              userId: userId, 
              isActive: true 
            });
            
            if (newBankAccount) {
              const newBalance = newBankAccount.currentBalance + newReceived;
              await BankAccount.findByIdAndUpdate(newBankAccountId, { 
                currentBalance: newBalance,
                updatedAt: new Date()
              });
              
              const bankTransaction = new BankTransaction({
                userId: userId,
                type: 'Cash to Bank Transfer',
                fromAccount: 'Cash',
                toAccount: newBankAccount.accountDisplayName,
                amount: newReceived,
                description: `Payment received for sale invoice ${oldSale.invoiceNo}`,
                transactionDate: new Date(),
                balanceAfter: newBalance,
                status: 'completed'
              });
              
              await bankTransaction.save();
            }
          }
        } else {
          
          
          
          if (oldSale.paymentMethod === 'Bank Transfer' && oldSale.bankAccountId && oldSale.received > 0) {
            const oldBankAccount = await BankAccount.findOne({ 
              _id: oldSale.bankAccountId, 
              userId: userId, 
              isActive: true 
            });
            
            if (oldBankAccount) {
              
              const oldTransaction = await BankTransaction.findOne({
                userId: userId,
                description: { $regex: `invoice ${oldSale.invoiceNo}`, $options: 'i' },
                type: 'Cash to Bank Transfer',
                toAccount: oldBankAccount.accountDisplayName
              }).sort({ transactionDate: -1 });
              
              if (oldTransaction) {
                
                const restoredBalance = oldBankAccount.currentBalance - oldSale.received;
                await BankAccount.findByIdAndUpdate(oldSale.bankAccountId, { 
                  currentBalance: Math.max(0, restoredBalance),
                  updatedAt: new Date()
                });
                
                
                await BankTransaction.findByIdAndDelete(oldTransaction._id);
                
              }
            }
          }
          
          
          if (actualNewPaymentMethod === 'Bank Transfer' && newBankAccountId && newReceived > 0) {
            const newBankAccount = await BankAccount.findOne({ 
              _id: newBankAccountId, 
              userId: userId, 
              isActive: true 
            });
            
            if (newBankAccount) {
              const newBalance = newBankAccount.currentBalance + newReceived;
              await BankAccount.findByIdAndUpdate(newBankAccountId, { 
                currentBalance: newBalance,
                updatedAt: new Date()
              });
              
              
              const bankTransaction = new BankTransaction({
                userId: userId,
                type: 'Cash to Bank Transfer',
                fromAccount: 'Cash',
                toAccount: newBankAccount.accountDisplayName,
                amount: newReceived,
                description: `Payment received for sale invoice ${updateData.invoiceNo || oldSale.invoiceNo || 'N/A'}`,
                transactionDate: new Date(),
                balanceAfter: newBalance,
                status: 'completed'
              });
              
              await bankTransaction.save();
              
            }
          }
        }
      }
    } catch (bankError) {
      
      
    }

    
    const updatedSale = await Sale.findOneAndUpdate(
      { _id: saleId, userId },
      {
        ...updateData,
        discountValue: totalDiscount,
        taxType,
        tax,
        taxValue,
        grandTotal,
        balance,
        received,
        paymentType,
        paymentMethod,
        bankAccountId: updateData.bankAccountId || null,
        bankAccountName: updateData.bankAccountName || '',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedSale) {
      return res.status(404).json({ success: false, message: 'Sale not found after update' });
    }

    
    const saleObj = updatedSale.toObject();
    if (Array.isArray(saleObj.items)) {
      saleObj.items = saleObj.items.map(item => ({
        ...item,
        unit: typeof item.unit === 'object' ? getUnitDisplay(item.unit) : item.unit
      }));
    }

    
    res.json({ success: true, sale: saleObj, partyCreated });
  } catch (err) {
    
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getBillWiseProfit = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { party } = req.query;

    
    const saleQuery = { userId };
    if (party) saleQuery.partyName = party;
    const sales = await Sale.find(saleQuery).sort({ createdAt: -1 }).lean();

    

    
    let totalProfit = 0;
    const bills = sales.map(sale => {
      let billProfit = 0;
      let itemDetails = [];
      if (Array.isArray(sale.items)) {
        sale.items.forEach(saleItem => {
          const originalPrice = Number(saleItem.price) || 0;
          const qty = Number(saleItem.qty) || 0;

          
          let itemDiscount = 0;
          if (saleItem.discountPercentage) {
            itemDiscount = Math.max(0, (originalPrice * parseFloat(saleItem.discountPercentage)) / 100);
          } else if (saleItem.discountAmount) {
            itemDiscount = Math.max(0, parseFloat(saleItem.discountAmount) || 0);
          }

          const actualSalePrice = Math.max(0, originalPrice - itemDiscount);

          
          if (Array.isArray(saleItem.consumedBatches) && saleItem.consumedBatches.length > 0) {
            saleItem.consumedBatches.forEach((batch, index) => {
              const bQty = Number(batch.quantity || 0);
              const bCost = Number(batch.purchasePrice || 0);
              if (bQty > 0) {
                const lineProfit = (actualSalePrice - bCost) * bQty;
                billProfit += lineProfit;
                itemDetails.push({
                  item: `${saleItem.item} (${index + 1})`,
                  qty: bQty,
                  originalPrice: originalPrice,
                  salePrice: actualSalePrice,
                  purchasePrice: bCost,
                  itemDiscount: Math.abs(itemDiscount),
                  itemProfit: lineProfit
                });
              }
            });
          } else {
            
            let totalCost = 0;
            if (typeof saleItem.totalCost === 'number') {
              totalCost = Number(saleItem.totalCost) || 0;
            }
            const purchasePriceAvg = qty > 0 ? (totalCost / qty) : 0;
            const itemProfit = (actualSalePrice - purchasePriceAvg) * qty;
            billProfit += itemProfit;
            itemDetails.push({
              item: saleItem.item,
              qty: qty,
              originalPrice: originalPrice,
              salePrice: actualSalePrice,
              purchasePrice: purchasePriceAvg,
              itemDiscount: Math.abs(itemDiscount),
              itemProfit: itemProfit
            });
          }
        });
      }
      totalProfit += billProfit;
      
      const totalSaleAmount = itemDetails.reduce((sum, item) => sum + item.salePrice * item.qty, 0);
      
      return {
        date: sale.createdAt,
        refNo: sale.invoiceNo || sale._id,
        party: sale.partyName,
        totalSaleAmount: totalSaleAmount,
        profit: billProfit,
        details: itemDetails,
      };
    });

    res.json({ success: true, bills, totalProfit });
  } catch (err) {
    
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getItemPurchasePrices = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    
    const { items } = req.body; 
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Items array is required' });
    }
    
    
    function getLatestPurchasePrice(itemName) {
      let latestPrice = 0;
      let latestDate = null;
      
      
      Sale.find({ userId }).then(sales => {
        sales.forEach(sale => {
          if (Array.isArray(sale.items)) {
            for (const saleItem of sale.items) {
              const saleItemName = saleItem.item?.trim().toLowerCase() || '';
              const itemNameLower = itemName?.trim().toLowerCase() || '';
              
              
              const exactMatch = saleItemName === itemNameLower;
              const partialMatch = saleItemName.includes(itemNameLower) || itemNameLower.includes(saleItemName);
              
              if (saleItem.item && itemName && (exactMatch || partialMatch)) {
                
                const itemPrice = saleItem.atPrice !== undefined && saleItem.atPrice !== null ? saleItem.atPrice : (saleItem.purchasePrice !== undefined && saleItem.purchasePrice !== null ? saleItem.purchasePrice : saleItem.price) || 0;
                if (itemPrice > 0) {
                  
                  if (!latestDate || new Date(sale.createdAt) > latestDate) {
                    latestPrice = itemPrice;
                    latestDate = new Date(sale.createdAt);
                  }
                }
              }
            }
          }
        });
      }).catch(err => {
        
      });
      
      return latestPrice;
    }
    
    
    const itemPrices = {};
    items.forEach(itemName => {
      itemPrices[itemName] = getLatestPurchasePrice(itemName);
    });
    
    res.json({ success: true, itemPrices });
  } catch (err) {
    
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getPaymentRecords = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    
    const payments = await Payment.find({ 
      userId,
      $or: [
        { category: 'Party Payment In' },
        { category: 'Invoice Payment In' },
        { saleId: { $exists: true, $ne: null } }
      ]
    })
      .sort({ paymentDate: -1 })
      .populate({
        path: 'saleId',
        select: 'invoiceNo customerName grandTotal',
        options: { strictPopulate: false }
      });
    
    res.json({ success: true, paymentIns: payments });
  } catch (err) {
    
    res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  createSale,
  getSalesByUser,
  receivePayment,
  receivePartyPayment,
  getSalesStatsByUser,
  deleteSale,
  updateSale,
  getBillWiseProfit,
  getItemPurchasePrices,
  getPaymentRecords,
}; 