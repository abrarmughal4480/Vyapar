import Sale from '../models/sale.js';
import Item from '../models/items.js';
import mongoose from 'mongoose';

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
        dbItem.stock = (dbItem.stock || 0) - Number(saleItem.qty);
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
    
    // Update party openingBalance in DB (add only balance, not full grandTotal, if receivedAmount is provided)
    try {
      const Party = (await import('../models/parties.js')).default;
      const partyDoc = await Party.findOne({ name: sale.partyName, user: userId });
      if (partyDoc) {
        if (req.body.paymentType === 'Cash' && req.body.receivedAmount !== undefined && req.body.receivedAmount !== null) {
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) + balance;
        } else {
          partyDoc.openingBalance = (partyDoc.openingBalance || 0) + (sale.grandTotal || 0);
        }
        await partyDoc.save();
      }
    } catch (err) {
      console.error('Failed to update party openingBalance:', err);
    }
    console.log(`Successfully created sale invoice for user: ${sale.userId}`);
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
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    const sales = await Sale.find({ userId }).sort({ createdAt: -1 });
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
    await Sale.deleteOne({ _id: saleId });
    res.json({ success: true, message: 'Sale deleted successfully' });
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

    // 2. Calculate new grandTotal
    const items = updateData.items || [];
    const subTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
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

    // 3. Update party balances
    const Party = (await import('../models/parties.js')).default;
    if (oldSale.partyName !== updateData.partyName) {
      // Old party: minus old grandTotal
      const oldParty = await Party.findOne({ name: oldSale.partyName, user: userId });
      if (oldParty) {
        oldParty.openingBalance = (oldParty.openingBalance || 0) - (oldSale.grandTotal || 0);
        await oldParty.save();
      }
      // New party: plus new grandTotal
      const newParty = await Party.findOne({ name: updateData.partyName, user: userId });
      if (newParty) {
        newParty.openingBalance = (newParty.openingBalance || 0) + grandTotal;
        await newParty.save();
      }
    } else {
      // Same party: adjust by difference
      const party = await Party.findOne({ name: updateData.partyName, user: userId });
      if (party) {
        party.openingBalance = (party.openingBalance || 0) - (oldSale.grandTotal || 0) + grandTotal;
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