import Sale from '../models/sale.js';
import Item from '../models/items.js';
import mongoose from 'mongoose';
import { clearAllCacheForUser } from './dashboardController.js';

function getUnitDisplay(unit) {
  if (!unit) return '';
  const base = unit.base === 'custom' ? unit.customBase : unit.base;
  const secondary = unit.secondary && unit.secondary !== 'None'
    ? (unit.secondary === 'custom' ? unit.customSecondary : unit.secondary)
    : '';
  return secondary ? `${base} / ${secondary}` : base;
}

export const createSale = async (req, res) => {
  try {
    const { partyName, items } = req.body;
    if (!partyName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const userIdObj = new mongoose.Types.ObjectId(userId);
    
    // Decrement stock for each item
    for (const saleItem of items) {
      // Convert quantity to base unit for stock calculation
      let stockQuantity = Number(saleItem.qty);
      
      // Check if unit conversion is needed
      const dbItem = await Item.findOne({ userId: userIdObj.toString(), name: saleItem.item });
      if (dbItem && dbItem.unit) {
        const itemUnit = dbItem.unit;
        const saleUnit = saleItem.unit;
        
        // Handle object format unit
        if (typeof itemUnit === 'object' && itemUnit.base && itemUnit.secondary) {
          // If sale unit is secondary unit, convert to base unit
          if (saleUnit === itemUnit.secondary && itemUnit.conversionFactor) {
            stockQuantity = Number(saleItem.qty) * itemUnit.conversionFactor;
          }
          // If sale unit is base unit, use as is
          else if (saleUnit === itemUnit.base) {
            stockQuantity = Number(saleItem.qty);
          }
          // For custom units or other cases, use as is
          else {
            stockQuantity = Number(saleItem.qty);
          }
        }
        // Handle string format unit (like "Piece / Dozen")
        else if (typeof itemUnit === 'string' && itemUnit.includes(' / ')) {
          const parts = itemUnit.split(' / ');
          const baseUnit = parts[0];
          const secondaryUnit = parts[1];
          
          // If sale unit is secondary unit, convert to base unit (assuming 1:12 ratio)
          if (saleUnit === secondaryUnit) {
            stockQuantity = Number(saleItem.qty) * 12; // Default conversion factor
          }
          // If sale unit is base unit, use as is
          else if (saleUnit === baseUnit) {
            stockQuantity = Number(saleItem.qty);
          }
          // For other cases, use as is
          else {
            stockQuantity = Number(saleItem.qty);
          }
        }
        // For simple string units, use as is
        else {
          stockQuantity = Number(saleItem.qty);
        }
      }
      
      // Use simple stock reduction method
      if (dbItem) {
        try {
          // Plan FIFO batches to consume for cost capture
          const plannedBatches = [];
          let remainingPlan = Number(stockQuantity) || 0;
          if (!Array.isArray(dbItem.batches)) dbItem.batches = [];
          for (let i = 0; i < dbItem.batches.length && remainingPlan > 0; i++) {
            const batch = dbItem.batches[i];
            const take = Math.min(batch.quantity || 0, remainingPlan);
            if (take > 0) {
              plannedBatches.push({ quantity: take, purchasePrice: batch.purchasePrice || dbItem.purchasePrice || 0 });
              remainingPlan -= take;
            }
          }

          // Use the reduceStock method from the items model
          await dbItem.reduceStock(stockQuantity);
          
          console.log(`Stock reduction for ${saleItem.item}:`, {
            quantity: stockQuantity,
            currentStock: dbItem.stock
          });
          
          // Persist consumed batches into sale item
          const consumedBatches = plannedBatches;
          const totalCost = consumedBatches.reduce((sum, b) => sum + (Number(b.quantity || 0) * Number(b.purchasePrice || 0)), 0);
          saleItem.consumedBatches = consumedBatches;
          saleItem.totalCost = totalCost;
          
        } catch (error) {
          console.error(`Stock reduction failed for ${saleItem.item}:`, error.message);
          // Fallback: batch-aware FIFO reduction
          try {
            const currentStock = dbItem.stock || 0;
            const requestQty = Number(stockQuantity) || 0;
            const toDeduct = Math.min(currentStock, requestQty);
            if (!Array.isArray(dbItem.batches)) {
              dbItem.batches = [];
            }
            let remaining = toDeduct;
            const consumed = [];
            for (let i = 0; i < dbItem.batches.length && remaining > 0; i++) {
              const batch = dbItem.batches[i];
              const canDeduct = Math.min(batch.quantity || 0, remaining);
              batch.quantity = (batch.quantity || 0) - canDeduct;
              remaining -= canDeduct;
              if (canDeduct > 0) {
                consumed.push({ quantity: canDeduct, purchasePrice: batch.purchasePrice || dbItem.purchasePrice || 0 });
              }
            }
            dbItem.batches = dbItem.batches.filter(b => (b.quantity || 0) > 0);
            dbItem.stock = (dbItem.stock || 0) - toDeduct;
            await dbItem.save();
            const totalCost = consumed.reduce((sum, b) => sum + (Number(b.quantity || 0) * Number(b.purchasePrice || 0)), 0);
            saleItem.consumedBatches = consumed;
            saleItem.totalCost = totalCost;
          } catch (fallbackErr) {
            // Final fallback to safeguard
            dbItem.stock = Math.max(0, (dbItem.stock || 0) - (Number(stockQuantity) || 0));
            await dbItem.save();
          }
        }
      }
    }
    
    // Calculate original subtotal (before discounts) and final subtotal
    const originalSubTotal = items.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return sum + (qty * price);
    }, 0);
    
    // Calculate item-level discounts
    const totalItemDiscount = items.reduce((total, item) => {
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
    
    // Calculate global discount
    let discountValue = 0;
    if (req.body.discount && !isNaN(Number(req.body.discount))) {
      if (req.body.discountType === '%') {
        discountValue = originalSubTotal * Number(req.body.discount) / 100;
      } else {
        discountValue = Number(req.body.discount);
      }
    }
    
    // Total discount is item discounts + global discount
    const totalDiscount = totalItemDiscount + discountValue;
    
    // Calculate final subtotal after item discounts
    const finalSubTotal = originalSubTotal - totalItemDiscount;
    
    // Calculate taxValue
    let taxType = req.body.taxType || '%';
    let tax = req.body.tax || 0;
    let taxValue = 0;
    if (taxType === '%') {
      taxValue = (originalSubTotal - totalDiscount) * Number(tax) / 100;
    } else if (taxType === 'PKR') {
      taxValue = Number(tax);
    }
    
    // Calculate grandTotal
    const grandTotal = Math.max(0, originalSubTotal - totalDiscount + taxValue);
    
    // Generate invoice number for this user
    let invoiceNo = 'INV001';
    const lastSale = await Sale.findOne({ userId: userIdObj }).sort({ createdAt: -1 });
    if (lastSale && lastSale.invoiceNo) {
      const match = lastSale.invoiceNo.match(/INV(\d+)/);
      if (match) {
        const nextNum = String(parseInt(match[1], 10) + 1).padStart(3, '0');
        invoiceNo = `INV${nextNum}`;
      }
    }
    
    // Handle received amount for all payment types
    let received = 0;
    if (req.body.receivedAmount !== undefined && req.body.receivedAmount !== null) {
      received = Number(req.body.receivedAmount) || 0;
    }
    const balance = grandTotal - received;
    
    const sale = new Sale({
      ...req.body,
      userId: userIdObj,
      discountValue: totalDiscount, // Use total discount (item + global)
      taxType,
      tax,
      taxValue,
      grandTotal,
      invoiceNo,
      balance,
      received
    });
    
    await sale.save();
    
    // Map unit fields for frontend
    const saleObj = sale.toObject();
    if (Array.isArray(saleObj.items)) {
      saleObj.items = saleObj.items.map(item => ({
        ...item,
        unit: typeof item.unit === 'object' ? getUnitDisplay(item.unit) : item.unit
      }));
    }
    
    // If this sale was converted from a sales order, update the order status
    if (req.body.sourceOrderId) {
      try {
        const SaleOrder = (await import('../models/saleOrder.js')).default;
        const saleOrder = await SaleOrder.findById(req.body.sourceOrderId);
        if (saleOrder) {
          saleOrder.status = 'Completed';
          saleOrder.invoiceNumber = sale.invoiceNo;
          saleOrder.convertedToInvoice = sale._id;
          await saleOrder.save();
          console.log(`Updated sales order ${req.body.sourceOrderId} to completed status`);
        }
      } catch (err) {
        console.error('Failed to update sales order status:', err);
      }
    }
    
    // Update party openingBalance in DB based on payment type
    // balance = grandTotal - received (remaining amount to be paid)
    try {
      const Party = (await import('../models/parties.js')).default;
      const partyDoc = await Party.findOne({ name: sale.partyName, user: userId });
      if (partyDoc) {
        // Store party's current balance before transaction
        const partyCurrentBalance = partyDoc.openingBalance || 0;
        
        if (req.body.paymentType === 'Credit') {
          // For credit sales, add the remaining balance (credit amount) to party balance
          // balance = grandTotal - received
          partyDoc.openingBalance = partyCurrentBalance + balance;
        } else if (req.body.paymentType === 'Cash') {
          // For cash sales, only add remaining balance if there's any unpaid amount
          if (balance > 0) {
            partyDoc.openingBalance = partyCurrentBalance + balance;
          }
        }
        
        // Calculate and update partyBalanceAfterTransaction
        const partyBalanceAfterTransaction = partyDoc.openingBalance;
        sale.partyBalanceAfterTransaction = partyBalanceAfterTransaction;
        await sale.save();
        
        await partyDoc.save();
      }
    } catch (err) {
      console.error('Failed to update party openingBalance:', err);
    }
    
    console.log(`Successfully created sale invoice for user: ${sale.userId}`);
    clearAllCacheForUser(userId); // Invalidate all related caches
    res.status(201).json({ success: true, sale: saleObj });
  } catch (err) {
    console.error('Sale creation error:', err);
    console.error('Request body:', req.body);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSalesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyName } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    const filter = { userId };
    if (companyName) filter.companyName = companyName;
    const sales = await Sale.find(filter).sort({ createdAt: -1 });
    const salesWithUnitString = sales.map(sale => {
      const saleObj = sale.toObject();
      if (Array.isArray(saleObj.items)) {
        // Calculate actual sale amount after item-level discounts
        let actualSaleAmount = 0;
        saleObj.items = saleObj.items.map(item => {
          const originalAmount = (item.qty || 0) * (item.price || 0);
          let itemDiscount = 0;
          
          if (item.discountPercentage) {
            itemDiscount = (originalAmount * parseFloat(item.discountPercentage)) / 100;
          } else if (item.discountAmount) {
            itemDiscount = parseFloat(item.discountAmount) || 0;
          }
          
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
        
        // Add the calculated actual sale amount
        saleObj.actualSaleAmount = actualSaleAmount;
      }
      return saleObj;
    });
    res.json({ success: true, sales: salesWithUnitString });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Receive payment for a sale
export const receivePayment = async (req, res) => {
  try {
    const { saleId, amount, discount, discountType } = req.body;
    if (!saleId || (typeof amount !== 'number' && amount !== 0)) {
      return res.status(400).json({ success: false, message: 'Missing saleId or invalid amount' });
    }
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    // Calculate discount and update sale totals
    let discountValue = 0;
    let newGrandTotal = sale.grandTotal;
    let newBalance = sale.balance;

    if (discount && discount > 0 && discountType) {
      if (discountType === '%') {
        // Percentage discount
        discountValue = (sale.grandTotal * discount) / 100;
      } else if (discountType === 'PKR') {
        // Fixed PKR discount
        discountValue = discount;
      }
      
      // Update sale totals after discount
      newGrandTotal = Math.max(0, sale.grandTotal - discountValue);
      newBalance = Math.max(0, sale.balance - discountValue);
      
      // Update sale with new totals
      sale.grandTotal = newGrandTotal;
      sale.balance = newBalance;
      sale.discount = discount;
      sale.discountType = discountType;
      sale.discountValue = discountValue;
    }

    // Calculate excess amount (if received amount is more than due balance)
    const excessAmount = Math.max(0, amount - newBalance);
    
    // Process payment (amount can be 0 if discount covers everything)
    if (amount > 0) {
      sale.received = (sale.received || 0) + amount;
      sale.balance = Math.max(0, newBalance - amount);
    } else {
      // If amount is 0, the discount has already been applied above
      sale.balance = newBalance;
    }
    
    await sale.save();

    // Update party openingBalance
    try {
      const Party = (await import('../models/parties.js')).default;
      const partyDoc = await Party.findOne({ name: sale.partyName, user: sale.userId });
      if (partyDoc) {
        if (amount > 0) {
          // Reduce party balance by the actual payment amount
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) - amount;
        }
        
        // If there's excess amount, add it as opening balance (credit for future)
        if (excessAmount > 0) {
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) + excessAmount;
        }
        
        await partyDoc.save();
      }
    } catch (err) {
      console.error('Failed to update party openingBalance on payment:', err);
    }

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
    
    // Only clear cache if user context exists
    if (sale.userId) {
      clearAllCacheForUser(sale.userId);
    }
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Receive payment for party (updates multiple sales starting from oldest)
export const receivePartyPayment = async (req, res) => {
  try {
    const { partyName, amount, discount, discountType } = req.body;
    const userId = req.user && (req.user._id || req.user.id);
    
    if (!partyName || (typeof amount !== 'number' && amount !== 0) || amount < 0) {
      return res.status(400).json({ success: false, message: 'Missing partyName or invalid amount' });
    }

    // Get all sales for this party with balance > 0, sorted by creation date (oldest first)
    const sales = await Sale.find({ 
      partyName: partyName, 
      userId: new mongoose.Types.ObjectId(userId),
      balance: { $gt: 0 } 
    }).sort({ createdAt: 1 });

    // Allow payments even when no outstanding sales (for setting opening balance)
    if (sales.length === 0 && amount > 0) {
      // If no outstanding sales but amount > 0, this is setting opening balance
      try {
        const Party = (await import('../models/parties.js')).default;
        const partyDoc = await Party.findOne({ name: partyName, user: userId });
        if (partyDoc) {
          // Add amount as opening balance (credit for future)
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) + amount;
          await partyDoc.save();
        }
        
        res.json({ 
          success: true, 
          message: `Opening balance set for ${partyName}`,
          updatedSales: 0,
          remainingAmount: 0,
          discountApplied: false,
          discountValue: 0,
          totalDiscountApplied: 0,
          newTotalGrandTotal: 0,
          newTotalOutstandingBalance: 0,
          paymentProcessed: false,
          excessAmount: amount,
          openingBalanceSet: true
        });
        
        clearAllCacheForUser(userId);
        return;
      } catch (err) {
        console.error('Failed to set opening balance:', err);
        return res.status(500).json({ success: false, message: 'Failed to set opening balance' });
      }
    } else if (sales.length === 0 && amount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No outstanding sales found' 
      });
    }

    // Calculate total outstanding balance for all sales
    const totalOutstandingBalance = sales.reduce((sum, sale) => sum + (sale.balance || 0), 0);
    const totalGrandTotal = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);

    // Calculate discount if provided
    let discountValue = 0;
    let newTotalGrandTotal = totalGrandTotal;
    let newTotalOutstandingBalance = totalOutstandingBalance;

    if (discount && discount > 0 && discountType) {
      if (discountType === '%') {
        // Percentage discount on total outstanding balance
        discountValue = (totalOutstandingBalance * discount) / 100;
      } else if (discountType === 'PKR') {
        // Fixed PKR discount
        discountValue = Math.min(discount, totalOutstandingBalance);
      }
      
      newTotalOutstandingBalance = Math.max(0, totalOutstandingBalance - discountValue);
      newTotalGrandTotal = Math.max(0, totalGrandTotal - discountValue);
    }

    // Calculate excess amount (if received amount is more than due balance after discount)
    const excessAmount = Math.max(0, amount - newTotalOutstandingBalance);

    let remainingAmount = amount;
    const updatedSales = [];
    let totalDiscountApplied = 0;

    // Update sales starting from oldest, applying discount proportionally
    for (const sale of sales) {
      const saleBalance = sale.balance || 0;
      const saleGrandTotal = sale.grandTotal || 0;
      
      // Calculate proportional discount for this sale
      let saleDiscount = 0;
      if (discountValue > 0 && totalOutstandingBalance > 0) {
        const discountRatio = saleBalance / totalOutstandingBalance;
        saleDiscount = discountValue * discountRatio;
      }
      
      // Apply discount to this sale
      if (saleDiscount > 0) {
        sale.grandTotal = Math.max(0, saleGrandTotal - saleDiscount);
        sale.balance = Math.max(0, saleBalance - saleDiscount);
        sale.discount = discount;
        sale.discountType = discountType;
        sale.discountValue = saleDiscount;
        totalDiscountApplied += saleDiscount;
      }

      // Process payment only if there's an amount to pay
      if (remainingAmount > 0) {
        const paymentForThisSale = Math.min(remainingAmount, sale.balance);
        sale.received = (sale.received || 0) + paymentForThisSale;
        sale.balance = sale.balance - paymentForThisSale;
        remainingAmount -= paymentForThisSale;
      }
      
      await sale.save();
      updatedSales.push(sale);
    }

    // Update party openingBalance
    try {
      const Party = (await import('../models/parties.js')).default;
      const partyDoc = await Party.findOne({ name: partyName, user: userId });
      if (partyDoc) {
        if (amount > 0) {
          // Reduce party balance by the actual payment amount
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) - amount;
        }
        
        // If there's excess amount, add it as opening balance (credit for future)
        if (excessAmount > 0) {
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) + excessAmount;
        }
        
        await partyDoc.save();
      }
    } catch (err) {
      console.error('Failed to update party openingBalance on payment:', err);
    }

    res.json({ 
      success: true, 
      message: amount > 0 ? `Payment processed successfully` : 'Discount applied successfully',
      updatedSales: updatedSales.length,
      remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
      discountApplied: discountValue > 0,
      discountValue,
      totalDiscountApplied,
      newTotalGrandTotal,
      newTotalOutstandingBalance,
      paymentProcessed: amount > 0,
      excessAmount: excessAmount > 0 ? excessAmount : 0,
      openingBalanceSet: excessAmount > 0
    });
    
    // Only clear cache if user context exists
    if (userId) {
      clearAllCacheForUser(userId);
    }
  } catch (err) {
    console.error('Party payment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get sales stats (sum of grandTotal, balance, received) for a user
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

// Delete a sale by ID
export const deleteSale = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { saleId } = req.params;
    console.log('Delete sale request by user:', userId, 'for saleId:', saleId);
    const sale = await Sale.findOne({ _id: saleId });
    console.log('Sale found:', sale);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    if (String(sale.userId) !== String(userId)) {
      console.log('UserId mismatch:', sale.userId, '!=', userId);
      return res.status(403).json({ success: false, message: 'Not authorized to delete this sale' });
    }
    
    // Restore stock for all items in the sale
    const items = sale.items || [];
    for (const saleItem of items) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: saleItem.item });
      if (dbItem) {
        // Convert quantity to base unit for stock restoration
        let stockQuantity = Number(saleItem.qty);
        
        // Check if unit conversion is needed
        if (dbItem.unit) {
          const itemUnit = dbItem.unit;
          const saleUnit = saleItem.unit;
          
          // Handle object format unit
          if (typeof itemUnit === 'object' && itemUnit.base && itemUnit.secondary) {
            // If sale unit is secondary unit, convert to base unit
            if (saleUnit === itemUnit.secondary && itemUnit.conversionFactor) {
              stockQuantity = Number(saleItem.qty) * itemUnit.conversionFactor;
            }
            // If sale unit is base unit, use as is
            else if (saleUnit === itemUnit.base) {
              stockQuantity = Number(saleItem.qty);
            }
            // For custom units or other cases, use as is
            else {
              stockQuantity = Number(saleItem.qty);
            }
          }
          // Handle string format unit (like "Piece / Dozen")
          else if (typeof itemUnit === 'string' && itemUnit.includes(' / ')) {
            const parts = itemUnit.split(' / ');
            const baseUnit = parts[0];
            const secondaryUnit = parts[1];
            
            // If sale unit is secondary unit, convert to base unit (assuming 1:12 ratio)
            if (saleUnit === secondaryUnit) {
              stockQuantity = Number(saleItem.qty) * 12; // Default conversion factor
            }
            // If sale unit is base unit, use as is
            else if (saleUnit === baseUnit) {
              stockQuantity = Number(saleItem.qty);
            }
            // For other cases, use as is
            else {
              stockQuantity = Number(saleItem.qty);
            }
          }
          // For simple string units, use as is
          else {
            stockQuantity = Number(saleItem.qty);
          }
        }
        
        // Handle simple stock restoration
        if (dbItem) {
          console.log(`Restoring stock for item: ${saleItem.item}`);
          
          // Simple stock restoration
          dbItem.stock = (dbItem.stock || 0) + stockQuantity;
          
          console.log(`Restored stock for item: ${saleItem.item}`);
          console.log(`Sale quantity: ${saleItem.qty} ${saleItem.unit}`);
          console.log(`Stock quantity restored: ${stockQuantity}`);
          console.log(`Current stock: ${dbItem.stock}`);
        }
        
        await dbItem.save();
      }
    }
    
    // Update party balance if this was a credit sale
    try {
      if (sale.paymentType === 'Credit' && sale.balance > 0) {
        const Party = (await import('../models/parties.js')).default;
        const partyDoc = await Party.findOne({ name: sale.partyName, user: userId });
        if (partyDoc) {
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) - sale.balance;
          await partyDoc.save();
          console.log(`Updated party balance for deleted credit sale: -${sale.balance}`);
        }
      }
    } catch (err) {
      console.error('Failed to update party balance on sale deletion:', err);
    }
    
    await Sale.deleteOne({ _id: saleId });
    res.json({ success: true, message: 'Sale deleted successfully' });
    clearAllCacheForUser(userId); // Invalidate all related caches
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// Update a sale with proper stock and party balance management
export const updateSale = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { saleId } = req.params;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // 1. Fetch old sale
    const oldSale = await Sale.findOne({ _id: saleId, userId });
    if (!oldSale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    console.log('Updating sale:', saleId, 'for user:', userId);

    // 2. First restore stock from old sale items
    const oldItems = oldSale.items || [];
    for (const oldItem of oldItems) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: oldItem.item });
      if (dbItem) {
        // Log stock before restoration
        const stockBeforeRestore = dbItem.stock || 0;
        
        // Convert quantity to base unit for stock restoration
        let stockQuantity = Number(oldItem.qty);
        
        // Handle unit conversion for restoration
        if (dbItem.unit) {
          const itemUnit = dbItem.unit;
          const saleUnit = oldItem.unit;
          
          if (typeof itemUnit === 'object' && itemUnit.base && itemUnit.secondary) {
            if (saleUnit === itemUnit.secondary && itemUnit.conversionFactor) {
              stockQuantity = Number(oldItem.qty) * itemUnit.conversionFactor;
            }
          } else if (typeof itemUnit === 'string' && itemUnit.includes(' / ')) {
            const parts = itemUnit.split(' / ');
            const secondaryUnit = parts[1];
            if (saleUnit === secondaryUnit) {
              stockQuantity = Number(oldItem.qty) * 12; // Default conversion factor
            }
          }
        }
        
        // CRITICAL FIX: Restore stock with proper batch structure from old consumed batches
        if (oldItem.consumedBatches && Array.isArray(oldItem.consumedBatches) && oldItem.consumedBatches.length > 0) {
          // Restore each consumed batch individually to maintain FIFO structure
          console.log(`   🔄 Restoring ${oldItem.consumedBatches.length} batches with original purchase prices`);
          
          for (const consumedBatch of oldItem.consumedBatches) {
            const batchQty = consumedBatch.quantity || 0;
            const batchPrice = consumedBatch.purchasePrice || 0;
            
            if (batchQty > 0) {
              // Add each batch back with its original purchase price
              await dbItem.addStock(batchQty, batchPrice);
              console.log(`   ✅ Restored batch: ${batchQty} units at price ${batchPrice}`);
            }
          }
        } else {
          // Fallback: use addStock with item's current purchase price
          await dbItem.addStock(stockQuantity, oldItem.purchasePrice || dbItem.purchasePrice || 0);
          console.log(`   ⚠️ No consumed batches found, using fallback restoration`);
        }
        
        console.log(`📦 STOCK RESTORATION for ${oldItem.item}:`);
        console.log(`   Before restore: ${stockBeforeRestore} units`);
        console.log(`   Restored: +${stockQuantity} units (old sale quantity)`);
        console.log(`   After restore: ${dbItem.stock} units`);
      }
    }

    // 3. Revert old party balance
    try {
      const Party = (await import('../models/parties.js')).default;
      const oldParty = await Party.findOne({ name: oldSale.partyName, user: userId });
      if (oldParty) {
        // Revert old credit balance
        if (oldSale.paymentType === 'Credit' && oldSale.balance > 0) {
          oldParty.openingBalance = (oldParty.openingBalance || 0) - oldSale.balance;
          await oldParty.save();
          console.log(`Reverted party balance for ${oldSale.partyName}: -${oldSale.balance}`);
        }
      }
    } catch (err) {
      console.error('Failed to revert old party balance:', err);
    }

    // 4. Process new sale items and reduce stock
    const newItems = updateData.items || [];
    for (const newItem of newItems) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: newItem.item });
      if (dbItem) {
        // Find old sale item to compare quantities
        const oldSaleItem = oldItems.find(oldItem => oldItem.item === newItem.item);
        const oldQty = oldSaleItem ? Number(oldSaleItem.qty) : 0;
        const newQty = Number(newItem.qty);
        
        // Calculate additional quantity needed (only consume the difference)
        const additionalQty = Math.max(0, newQty - oldQty);
        
        console.log(`Item: ${newItem.item}, Old qty: ${oldQty}, New qty: ${newQty}, Additional needed: ${additionalQty}`);
        
        // SIMPLE LOGIC: Calculate quantity change and adjust accordingly
        const quantityChange = newQty - oldQty;
        console.log(`📊 QUANTITY CHANGE for ${newItem.item}: ${oldQty} → ${newQty} (change: ${quantityChange > 0 ? '+' : ''}${quantityChange} units)`);
        
        if (quantityChange !== 0) {
          // Get old consumed batches
          const oldConsumedBatches = oldSaleItem ? (oldSaleItem.consumedBatches || []) : [];
          
          if (quantityChange > 0) {
            // Quantity increased - consume TOTAL NEW QUANTITY from stock
            console.log(`   📈 Quantity increased: consuming TOTAL NEW QUANTITY (${newQty}) from stock`);
            
            // IMPORTANT: First consume from actual batches, then update stock
            console.log(`   Consuming ${newQty} units from actual batches using FIFO method`);
            
            // Store original batches before consumption
            const originalBatches = JSON.parse(JSON.stringify(dbItem.batches || []));
            
            // Manual FIFO batch consumption for total new quantity
            const consumedBatches = [];
            let remainingToConsume = newQty;
            let totalCost = 0;
            
            // Process batches in FIFO order
            for (let i = 0; i < dbItem.batches.length && remainingToConsume > 0; i++) {
              const batch = dbItem.batches[i];
              const availableInBatch = batch.quantity || 0;
              const consumeFromBatch = Math.min(availableInBatch, remainingToConsume);
              
              if (consumeFromBatch > 0) {
                // Add to consumed batches
                consumedBatches.push({
                  quantity: consumeFromBatch,
                  purchasePrice: batch.purchasePrice || dbItem.purchasePrice || 0
                });
                
                // Update batch quantity
                batch.quantity = availableInBatch - consumeFromBatch;
                
                // Update remaining to consume
                remainingToConsume -= consumeFromBatch;
                
                // Calculate cost
                totalCost += consumeFromBatch * (batch.purchasePrice || dbItem.purchasePrice || 0);
                
                console.log(`   Consumed ${consumeFromBatch} units from batch at price ${batch.purchasePrice}, remaining in batch: ${batch.quantity}`);
              }
            }
            
            // Handle case where we need more stock than available in batches
            if (remainingToConsume > 0) {
              console.log(`   ⚠️ Warning: Need ${remainingToConsume} more units than available in batches`);
              
              // Add remaining units as consumed from current purchase price
              consumedBatches.push({
                quantity: remainingToConsume,
                purchasePrice: dbItem.purchasePrice || 0
              });
              
              totalCost += remainingToConsume * (dbItem.purchasePrice || 0);
              console.log(`   Added ${remainingToConsume} units at current purchase price: ${dbItem.purchasePrice || 0}`);
            }
            
            // Keep all batches (even empty ones) for tracking purposes
            // Only remove completely consumed batches
            dbItem.batches = dbItem.batches.filter(b => b !== null && b !== undefined);
            
            // CRITICAL FIX: Use reduceStock method for proper FIFO-based stock reduction
            await dbItem.reduceStock(newQty);
            
            console.log(`   ✅ Stock reduced using FIFO method: ${newQty} units consumed`);
            
            console.log(`   Stock after consuming total new quantity: ${dbItem.stock} units`);
            console.log(`   Batches after consumption:`, dbItem.batches);
            
            // Use consumed batches from actual consumption
            newItem.consumedBatches = consumedBatches;
            newItem.totalCost = totalCost;
            
            console.log(`   ✅ Consumed batches from actual stock:`, consumedBatches);
            console.log(`   ✅ Total cost: ${totalCost}`);
            
          } else {
            // Quantity decreased - we need to consume the NEW quantity from stock
            console.log(`   📉 Quantity decreased: consuming NEW quantity (${newQty}) from stock`);
            
            // IMPORTANT: We restore old stock (+15) but then consume NEW quantity (-13)
            // So final stock = restored stock - new quantity = 20 - 13 = 7 units
            const stockToConsume = newQty;
            console.log(`   🔄 Consuming ${stockToConsume} units (new sale quantity) from restored stock`);
            
            // CRITICAL FIX: Use reduceStock method for proper FIFO-based stock reduction
            await dbItem.reduceStock(stockToConsume);
            console.log(`   📦 Stock after consuming new quantity: ${dbItem.stock} units`);
            
            // CORRECT APPROACH: New sale quantity is newQty, so consumed batches should total newQty
            // We need to reduce from old consumed batches to match newQty
            const targetQuantity = newQty; // This is the new sale quantity
            const oldTotalQuantity = oldConsumedBatches.reduce((sum, b) => sum + b.quantity, 0);
            const reductionNeeded = oldTotalQuantity - targetQuantity;
            
            console.log(`   📊 Old consumed batches total: ${oldTotalQuantity} units`);
            console.log(`   🎯 Target quantity (new sale): ${targetQuantity} units`);
            console.log(`   🔄 Need to reduce: ${reductionNeeded} units`);
            
            if (reductionNeeded > 0) {
              // Start reducing from last batch (LIFO)
              let remainingToReduce = reductionNeeded;
              let newConsumedBatches = [...oldConsumedBatches];
              
              for (let i = newConsumedBatches.length - 1; i >= 0 && remainingToReduce > 0; i--) {
                const batch = newConsumedBatches[i];
                const currentQty = batch.quantity;
                const reduceFromBatch = Math.min(currentQty, remainingToReduce);
                
                if (reduceFromBatch > 0) {
                  const oldQty = batch.quantity;
                  batch.quantity = currentQty - reduceFromBatch;
                  remainingToReduce -= reduceFromBatch;
                  console.log(`   Reduced ${reduceFromBatch} units from batch at price ${batch.purchasePrice}: ${oldQty} → ${batch.quantity}`);
                }
              }
              
              // Remove batches with 0 quantity
              newConsumedBatches = newConsumedBatches.filter(b => b.quantity > 0);
              
              console.log(`   📊 New consumed batches:`, newConsumedBatches);
              newItem.consumedBatches = newConsumedBatches;
            } else {
              // No reduction needed, keep old batches
              console.log(`   No reduction needed, keeping old consumed batches`);
              newItem.consumedBatches = oldConsumedBatches;
            }
            // Calculate total cost based on final consumed batches
            newItem.totalCost = newItem.consumedBatches.reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);
            
            console.log(`   ✅ Reduced consumed batches, new total: ${newItem.consumedBatches.reduce((sum, b) => sum + b.quantity, 0)} units`);
          }
          
          console.log(`   Final consumed batches:`, newItem.consumedBatches);
          console.log(`   Final total cost: ${newItem.totalCost}`);
          
        } else {
          // No quantity change - keep old consumed batches
          console.log(`   No quantity change - keeping old consumed batches`);
          newItem.consumedBatches = oldSaleItem ? (oldSaleItem.consumedBatches || []) : [];
          newItem.totalCost = oldSaleItem ? (oldSaleItem.totalCost || 0) : 0;
        }

      }
    }

    // 5. Calculate new totals
    const originalSubTotal = newItems.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return sum + (qty * price);
    }, 0);
    
    // Calculate item-level discounts
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
    
    // Calculate global discount
    let discountValue = 0;
    if (updateData.discount && !isNaN(Number(updateData.discount))) {
      if (updateData.discountType === '%') {
        discountValue = originalSubTotal * Number(updateData.discount) / 100;
      } else {
        discountValue = Number(updateData.discount);
      }
    }
    
    // Total discount is item discounts + global discount
    const totalDiscount = totalItemDiscount + discountValue;
    
    // Calculate tax
    let taxType = updateData.taxType || '%';
    let tax = updateData.tax || 0;
    let taxValue = 0;
    if (taxType === '%') {
      taxValue = (originalSubTotal - totalDiscount) * Number(tax) / 100;
    } else if (taxType === 'PKR') {
      taxValue = Number(tax);
    }
    
    const grandTotal = Math.max(0, originalSubTotal - totalDiscount + taxValue);
    
    // Calculate balance
    let received = Number(updateData.received) || 0;
    const balance = grandTotal - received;

    // 6. Update party balance for new sale
    try {
      const Party = (await import('../models/parties.js')).default;
      const newParty = await Party.findOne({ name: updateData.partyName, user: userId });
      if (newParty) {
        if (updateData.paymentType === 'Credit') {
          // Add new credit balance
          newParty.openingBalance = (newParty.openingBalance || 0) + balance;
        } else if (updateData.paymentType === 'Cash' && balance > 0) {
          // Add remaining balance if any unpaid amount
          newParty.openingBalance = (newParty.openingBalance || 0) + balance;
        }
        
        // Calculate and store party balance after this transaction
        const partyBalanceAfterTransaction = newParty.openingBalance;
        
        await newParty.save();
        console.log(`Updated party balance for ${updateData.partyName}: +${balance}, new balance: ${partyBalanceAfterTransaction}`);
        
        // Store the party balance after transaction for this sale
        updateData.partyBalanceAfterTransaction = partyBalanceAfterTransaction;
      }
    } catch (err) {
      console.error('Failed to update new party balance:', err);
    }

    // 7. Update the sale record
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
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedSale) {
      return res.status(404).json({ success: false, message: 'Sale not found after update' });
    }

    // Map unit fields for frontend
    const saleObj = updatedSale.toObject();
    if (Array.isArray(saleObj.items)) {
      saleObj.items = saleObj.items.map(item => ({
        ...item,
        unit: typeof item.unit === 'object' ? getUnitDisplay(item.unit) : item.unit
      }));
    }

    console.log(`Successfully updated sale ${saleId} for user: ${userId}`);
    clearAllCacheForUser(userId); // Invalidate all related caches
    
    res.json({ success: true, sale: saleObj });
  } catch (err) {
    console.error('Sale update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Bill Wise Profit report
export const getBillWiseProfit = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { party } = req.query;

    // Fetch all sales for the user (optionally filter by party)
    const saleQuery = { userId };
    if (party) saleQuery.partyName = party;
    const sales = await Sale.find(saleQuery).sort({ createdAt: -1 }).lean();

    // We now derive purchase cost from sale item batch costs saved in the sale schema

    // Prepare bill-wise profit data
    let totalProfit = 0;
    const bills = sales.map(sale => {
      let billProfit = 0;
      let itemDetails = [];
      if (Array.isArray(sale.items)) {
        sale.items.forEach(saleItem => {
          const originalPrice = Number(saleItem.price) || 0;
          const qty = Number(saleItem.qty) || 0;

          // Calculate actual sale price after item-level discount
          let itemDiscount = 0;
          if (saleItem.discountPercentage) {
            itemDiscount = Math.max(0, (originalPrice * parseFloat(saleItem.discountPercentage)) / 100);
          } else if (saleItem.discountAmount) {
            itemDiscount = Math.max(0, parseFloat(saleItem.discountAmount) || 0);
          }

          const actualSalePrice = Math.max(0, originalPrice - itemDiscount);

          // If consumedBatches exists, split lines per batch with numbering
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
            // Fallback: single-line using average purchase cost if available
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
      // Calculate total sale amount from actual sale prices (after discounts)
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
    console.error('Bill Wise Profit Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get purchase prices for items (for sale creation)
export const getItemPurchasePrices = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    
    const { items } = req.body; // Array of item names
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Items array is required' });
    }
    
    // Helper function to get latest purchase price for an item
    function getLatestPurchasePrice(itemName) {
      let latestPrice = 0;
      let latestDate = null;
      
      // Fetch all sales for the user to find purchase prices
      Sale.find({ userId }).then(sales => {
        sales.forEach(sale => {
          if (Array.isArray(sale.items)) {
            for (const saleItem of sale.items) {
              const saleItemName = saleItem.item?.trim().toLowerCase() || '';
              const itemNameLower = itemName?.trim().toLowerCase() || '';
              
              // Try exact match first, then partial match
              const exactMatch = saleItemName === itemNameLower;
              const partialMatch = saleItemName.includes(itemNameLower) || itemNameLower.includes(saleItemName);
              
              if (saleItem.item && itemName && (exactMatch || partialMatch)) {
                // Use atPrice first, if undefined then use purchasePrice, otherwise fall back to price
                const itemPrice = saleItem.atPrice !== undefined && saleItem.atPrice !== null ? saleItem.atPrice : (saleItem.purchasePrice !== undefined && saleItem.purchasePrice !== null ? saleItem.purchasePrice : saleItem.price) || 0;
                if (itemPrice > 0) {
                  // Use the latest purchase
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
        console.error('Error fetching sales for item purchase prices:', err);
      });
      
      return latestPrice;
    }
    
    // Get purchase prices for each item
    const itemPrices = {};
    items.forEach(itemName => {
      itemPrices[itemName] = getLatestPurchasePrice(itemName);
    });
    
    res.json({ success: true, itemPrices });
  } catch (err) {
    console.error('Get Item Purchase Prices Error:', err);
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
}; 