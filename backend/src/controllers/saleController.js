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
      // Find the item by userId and name
      const dbItem = await Item.findOne({ userId: userIdObj.toString(), name: saleItem.item });
      if (dbItem) {
        // Convert quantity to base unit for stock calculation
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
        
        console.log(`Stock cutting for item: ${saleItem.item}`);
        console.log(`Sale quantity: ${saleItem.qty} ${saleItem.unit}`);
        console.log(`Stock quantity to cut: ${stockQuantity}`);
        console.log(`Current stock: ${dbItem.stock}`);
        console.log(`New stock: ${dbItem.stock - stockQuantity}`);
        
        dbItem.stock = (dbItem.stock || 0) - stockQuantity;
        await dbItem.save();
      }
    }
    // Calculate subTotal
    const subTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    // Calculate discountValue
    let discountValue = 0;
    if (req.body.discount && !isNaN(Number(req.body.discount))) {
      if (req.body.discountType === '%') {
        discountValue = subTotal * Number(req.body.discount) / 100;
      } else {
        discountValue = Number(req.body.discount);
      }
    }
    // Calculate taxValue
    let taxType = req.body.taxType || '%';
    let tax = req.body.tax || 0;
    let taxValue = 0;
    if (taxType === '%') {
      taxValue = (subTotal - discountValue) * Number(tax) / 100;
    } else if (taxType === 'PKR') {
      taxValue = Number(tax);
    }
    // Calculate grandTotal
    const grandTotal = Math.max(0, subTotal - discountValue + taxValue);
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
      discountValue,
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
          if (req.body.paymentType === 'Credit') {
            // For credit sales, add the remaining balance (credit amount) to party balance
            // balance = grandTotal - received
            partyDoc.openingBalance = (partyDoc.openingBalance || 0) + balance;
          } else if (req.body.paymentType === 'Cash') {
            // For cash sales, only add remaining balance if there's any unpaid amount
            if (balance > 0) {
              partyDoc.openingBalance = (partyDoc.openingBalance || 0) + balance;
            }
          }
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
        saleObj.items = saleObj.items.map(item => ({
          ...item,
          unit: typeof item.unit === 'object' ? getUnitDisplay(item.unit) : item.unit
        }));
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
    const { saleId, amount } = req.body;
    if (!saleId || typeof amount !== 'number') {
      return res.status(400).json({ success: false, message: 'Missing saleId or amount' });
    }
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    sale.received = (sale.received || 0) + amount;
    sale.balance = (sale.balance || 0) - amount;
    await sale.save();

    // Update party openingBalance (subtract payment amount)
    try {
      const Party = (await import('../models/parties.js')).default;
      const partyDoc = await Party.findOne({ name: sale.partyName, user: sale.userId });
      if (partyDoc) {
        partyDoc.openingBalance = (partyDoc.openingBalance || 0) - amount;
        await partyDoc.save();
      }
    } catch (err) {
      console.error('Failed to update party openingBalance on payment:', err);
    }

    res.json({ success: true, sale });
    clearAllCacheForUser(sale.userId);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Receive payment for party (updates multiple sales starting from oldest)
export const receivePartyPayment = async (req, res) => {
  try {
    const { partyName, amount } = req.body;
    const userId = req.user && (req.user._id || req.user.id);
    
    if (!partyName || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Missing partyName or invalid amount' });
    }

    // Get all sales for this party with balance > 0, sorted by creation date (oldest first)
    const sales = await Sale.find({ 
      partyName: partyName, 
      userId: new mongoose.Types.ObjectId(userId),
      balance: { $gt: 0 } 
    }).sort({ createdAt: 1 });

    if (sales.length === 0) {
      return res.status(404).json({ success: false, message: 'No outstanding sales found for this party' });
    }

    let remainingAmount = amount;
    const updatedSales = [];

    // Update sales starting from oldest
    for (const sale of sales) {
      if (remainingAmount <= 0) break;

      const saleBalance = sale.balance || 0;
      const paymentForThisSale = Math.min(remainingAmount, saleBalance);

      sale.received = (sale.received || 0) + paymentForThisSale;
      sale.balance = saleBalance - paymentForThisSale;
      
      await sale.save();
      updatedSales.push(sale);
      remainingAmount -= paymentForThisSale;
    }

    // Update party openingBalance (subtract payment amount)
    try {
      const Party = (await import('../models/parties.js')).default;
      const partyDoc = await Party.findOne({ name: partyName, user: userId });
      if (partyDoc) {
        partyDoc.openingBalance = (partyDoc.openingBalance || 0) - amount;
        await partyDoc.save();
      }
    } catch (err) {
      console.error('Failed to update party openingBalance on payment:', err);
    }

    res.json({ 
      success: true, 
      message: `Payment of PKR ${amount} processed successfully`,
      updatedSales: updatedSales.length,
      remainingAmount: remainingAmount > 0 ? remainingAmount : 0
    });
    clearAllCacheForUser(userId);
  } catch (err) {
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
        
        console.log(`Restoring stock for item: ${saleItem.item}`);
        console.log(`Sale quantity: ${saleItem.qty} ${saleItem.unit}`);
        console.log(`Stock quantity to restore: ${stockQuantity}`);
        console.log(`Current stock: ${dbItem.stock}`);
        console.log(`New stock: ${dbItem.stock + stockQuantity}`);
        
        dbItem.stock = (dbItem.stock || 0) + stockQuantity;
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

// Update a sale (full edit)
export const updateSale = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const { saleId } = req.params;
    const updateData = req.body;

    // 1. Fetch old sale
    const oldSale = await Sale.findOne({ _id: saleId, userId });
    if (!oldSale) return res.status(404).json({ success: false, message: 'Sale not found' });

    // 2. Handle stock updates for modified items
    const oldItems = oldSale.items || [];
    const newItems = updateData.items || [];
    
    // Create maps for easy comparison
    const oldItemMap = new Map();
    oldItems.forEach(item => {
      oldItemMap.set(item.item, {
        qty: Number(item.qty) || 0,
        unit: item.unit || 'Piece'
      });
    });
    
    const newItemMap = new Map();
    newItems.forEach(item => {
      newItemMap.set(item.item, {
        qty: Number(item.qty) || 0,
        unit: item.unit || 'Piece'
      });
    });
    
    // Update stock for all items
    const allItems = new Set([...oldItemMap.keys(), ...newItemMap.keys()]);
    
    for (const itemName of allItems) {
      const dbItem = await Item.findOne({ userId: userId.toString(), name: itemName });
      if (!dbItem) continue;
      
      const oldItem = oldItemMap.get(itemName);
      const newItem = newItemMap.get(itemName);
      
      // Calculate old stock quantity (what was cut before)
      let oldStockQty = 0;
      if (oldItem) {
        oldStockQty = oldItem.qty;
        // Convert to base unit if needed
        if (dbItem.unit && typeof dbItem.unit === 'object' && dbItem.unit.base && dbItem.unit.secondary) {
          if (oldItem.unit === dbItem.unit.secondary && dbItem.unit.conversionFactor) {
            oldStockQty = oldItem.qty * dbItem.unit.conversionFactor;
          }
        } else if (typeof dbItem.unit === 'string' && dbItem.unit.includes(' / ')) {
          const parts = dbItem.unit.split(' / ');
          if (oldItem.unit === parts[1]) {
            oldStockQty = oldItem.qty * 12; // Default conversion
          }
        }
      }
      
      // Calculate new stock quantity (what should be cut now)
      let newStockQty = 0;
      if (newItem) {
        newStockQty = newItem.qty;
        // Convert to base unit if needed
        if (dbItem.unit && typeof dbItem.unit === 'object' && dbItem.unit.base && dbItem.unit.secondary) {
          if (newItem.unit === dbItem.unit.secondary && dbItem.unit.conversionFactor) {
            newStockQty = newItem.qty * dbItem.unit.conversionFactor;
          }
        } else if (typeof dbItem.unit === 'string' && dbItem.unit.includes(' / ')) {
          const parts = dbItem.unit.split(' / ');
          if (newItem.unit === parts[1]) {
            newStockQty = newItem.qty * 12; // Default conversion
          }
        }
      }
      
      // Adjust stock: add back old quantity, subtract new quantity
      const stockAdjustment = oldStockQty - newStockQty;
      dbItem.stock = (dbItem.stock || 0) + stockAdjustment;
      
      console.log(`Stock adjustment for ${itemName}: old=${oldStockQty}, new=${newStockQty}, adjustment=${stockAdjustment}, final=${dbItem.stock}`);
      
      await dbItem.save();
    }

    // 3. Calculate new grandTotal
    const subTotal = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    let discountValue = 0;
    if (updateData.discount && !isNaN(Number(updateData.discount))) {
      if (updateData.discountType === '%') {
        discountValue = subTotal * Number(updateData.discount) / 100;
      } else {
        discountValue = Number(updateData.discount);
      }
    }
    let taxType = updateData.taxType || '%';
    let tax = updateData.tax || 0;
    let taxValue = 0;
    if (taxType === '%') {
      taxValue = (subTotal - discountValue) * Number(tax) / 100;
    } else if (taxType === 'PKR') {
      taxValue = Number(tax);
    }
    const grandTotal = Math.max(0, subTotal - discountValue + taxValue);

    // 3. Update party balances based on payment type
    const Party = (await import('../models/parties.js')).default;
    
    // Calculate old and new credit amounts
    const oldCreditAmount = oldSale.paymentType === 'Credit' ? (oldSale.balance || 0) : 0;
    const newCreditAmount = updateData.paymentType === 'Credit' ? balance : 0;
    
    if (oldSale.partyName !== updateData.partyName) {
      // Old party: minus old credit amount
      const oldParty = await Party.findOne({ name: oldSale.partyName, user: userId });
      if (oldParty) {
        oldParty.openingBalance = (oldParty.openingBalance || 0) - oldCreditAmount;
        await oldParty.save();
      }
      // New party: plus new credit amount
      const newParty = await Party.findOne({ name: updateData.partyName, user: userId });
      if (newParty) {
        newParty.openingBalance = (newParty.openingBalance || 0) + newCreditAmount;
        await newParty.save();
      }
    } else {
      // Same party: adjust by credit amount difference
      const party = await Party.findOne({ name: updateData.partyName, user: userId });
      if (party) {
        party.openingBalance = (party.openingBalance || 0) - oldCreditAmount + newCreditAmount;
        await party.save();
      }
    }

    // 4. Update sale
    // Calculate new balance
    let received = typeof updateData.received === 'number' ? updateData.received : (oldSale.received || 0);
    const balance = grandTotal - received;
    const sale = await Sale.findOneAndUpdate(
      { _id: saleId, userId },
      { ...updateData, grandTotal, balance, updatedAt: new Date() },
      { new: true }
    );
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    clearAllCacheForUser(userId); // Invalidate all related caches
    res.json({ success: true, data: sale });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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

    // Fetch all items for the user
    const items = await Item.find({ userId }).lean();

    // Helper: for each item, get the latest purchase price from items model
    function getLatestPurchasePrice(itemName) {
      const itemDoc = items.find(i => i.name && i.name.trim().toLowerCase() === itemName.trim().toLowerCase());
      if (itemDoc) {
        return itemDoc.atPrice !== undefined && itemDoc.atPrice !== null
          ? itemDoc.atPrice
          : (itemDoc.purchasePrice !== undefined && itemDoc.purchasePrice !== null
            ? itemDoc.purchasePrice
            : 0);
      }
      return 0;
    }

    // Prepare bill-wise profit data
    let totalProfit = 0;
    const bills = sales.map(sale => {
      let billProfit = 0;
      let itemDetails = [];
      if (Array.isArray(sale.items)) {
        sale.items.forEach(saleItem => {
          const purchasePrice = getLatestPurchasePrice(saleItem.item);
          const salePrice = saleItem.price || 0;
          const qty = saleItem.qty || 0;
          const itemProfit = (salePrice - purchasePrice) * qty;
          billProfit += itemProfit;
          itemDetails.push({
            item: saleItem.item,
            qty: qty,
            salePrice: salePrice,
            purchasePrice: purchasePrice,
            itemProfit: itemProfit
          });
        });
      }
      totalProfit += billProfit;
      return {
        date: sale.createdAt,
        refNo: sale.invoiceNo || sale._id,
        party: sale.partyName,
        totalSaleAmount: sale.grandTotal || 0,
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
  getSalesStatsByUser,
  deleteSale,
  updateSale,
  getBillWiseProfit,
  getItemPurchasePrices,
}; 