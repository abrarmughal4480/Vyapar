import Item from '../models/items.js';

// Simple in-memory cache for items
const itemsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Import dashboard cache invalidation function
import { invalidateDashboardCache } from './dashboardController.js';

// Add this helper at the top after imports
function getUnitDisplay(unit) {
  if (!unit) return '';
  const base = unit.base === 'custom' ? unit.customBase : unit.base;
  const secondary = unit.secondary && unit.secondary !== 'None'
    ? (unit.secondary === 'custom' ? unit.customSecondary : unit.secondary)
    : '';
  return secondary ? `${base} / ${secondary}` : base;
}

// Helper function to process bulk import data
function processBulkImportData(data) {
  // Process tax logic: if raw equals 'inclusive' then true, if 'exclusive' then false
  let inclusiveOfTax = false;
  if (data.inclusiveOfTaxRaw) {
    inclusiveOfTax = data.inclusiveOfTaxRaw.toLowerCase() === 'inclusive';
  }

  // Process conversion rate
  let conversionFactor = null;
  if (data.conversionRateRaw && data.conversionRateRaw !== '') {
    conversionFactor = parseFloat(data.conversionRateRaw);
  }

  // Generate unique itemId if not provided
  let itemId = data.itemCode || data.itemId;
  if (!itemId || itemId.trim() === '') {
    // Generate unique ID based on name and timestamp
    const timestamp = Date.now();
    const nameSlug = (data.name || 'item').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    itemId = `${nameSlug}_${timestamp}`;
  }

  return {
    userId: data.userId,
    itemId: itemId,
    name: data.name,
    category: data.category,
    hsn: data.hsn,
    salePrice: data.salePrice,
    purchasePrice: data.purchasePrice,
    wholesalePrice: data.wholesalePrice,
    minimumWholesaleQuantity: data.minimumWholesaleQuantity,
    discountType: data.discountType,
    saleDiscount: data.saleDiscount,
    stock: data.openingStockQuantity || data.openingQuantity || 0,
    minStock: data.minimumStockQuantity,
    openingQuantity: data.openingStockQuantity || data.openingQuantity || 0,
    location: data.itemLocation,
    subcategory: data.subcategory,
    openingStockQuantity: data.openingStockQuantity || data.openingQuantity || 0,
    // Tax related fields
    taxRate: data.taxRate,
    inclusiveOfTax: inclusiveOfTax,
    // Unit conversion fields
    unit: {
      base: data.baseUnit,
      secondary: data.secondaryUnit,
      conversionFactor: conversionFactor,
      customBase: data.baseUnit,
      customSecondary: data.secondaryUnit
    },
    conversionRate: conversionFactor,
    // Additional fields
    sku: data.itemCode,
    description: data.description || '',
    supplier: data.supplier || '',
    status: data.status || 'Active',
    type: data.type || 'Product',
    imageUrl: data.imageUrl || '',
    // Set atPrice to purchasePrice if undefined
    atPrice: data.atPrice !== undefined ? data.atPrice : data.purchasePrice,
    asOfDate: data.asOfDate
  };
}

// Add a new item for a user
export const addItem = async (req, res) => {
  try {
    const userId = req.params.userId;
    const data = req.body;
    
    // Log the incoming data for debugging
    console.log('Incoming data:', JSON.stringify(data, null, 2));
    console.log('Unit data:', data.unit);

    // Check if this is a bulk import request or regular item creation
    const isBulkImport = data.baseUnit || data.secondaryUnit || data.conversionRateRaw;
    
    let processedData;
    if (isBulkImport) {
      // Process bulk import data if it contains bulk import fields
      processedData = processBulkImportData({ ...data, userId });
    } else {
      // Process unit data to handle custom units
      let processedUnit = data.unit || {
        base: 'Piece',
        secondary: 'None',
        conversionFactor: 1,
        customBase: '',
        customSecondary: ''
      };

      // If base unit is "custom", replace it with the actual custom value
      if (processedUnit.base === 'custom' && processedUnit.customBase) {
        processedUnit.base = processedUnit.customBase;
      }

      // If secondary unit is "custom", replace it with the actual custom value
      if (processedUnit.secondary === 'custom' && processedUnit.customSecondary) {
        processedUnit.secondary = processedUnit.customSecondary;
      }

      // Regular item creation - preserve the unit object structure
      processedData = {
        userId: data.userId,
        itemId: data.itemId || data.itemCode,
        name: data.name,
        category: data.category,
        hsn: data.hsn,
        salePrice: data.salePrice,
        purchasePrice: data.purchasePrice,
        wholesalePrice: data.wholesalePrice,
        minimumWholesaleQuantity: data.minimumWholesaleQuantity,
        discountType: data.discountType,
        saleDiscount: data.saleDiscount,
        stock: data.openingQuantity || data.stock || 0,
        minStock: data.minStock,
        openingQuantity: data.openingQuantity || 0,
        location: data.location,
        subcategory: data.subcategory,
        openingStockQuantity: data.openingQuantity || 0,
        // Tax related fields
        taxRate: data.taxRate,
        inclusiveOfTax: data.inclusiveOfTax || false,
        // Unit conversion fields - use processed unit data
        unit: processedUnit,
        conversionRate: data.conversionRate,
        // Additional fields
        sku: data.itemCode || data.sku,
        description: data.description || '',
        supplier: data.supplier || '',
        status: data.status || 'Active',
        type: data.type || 'Product',
        imageUrl: data.imageUrl || '',
        atPrice: data.atPrice !== undefined ? data.atPrice : data.purchasePrice,
        asOfDate: data.asOfDate
      };
    }

    // Explicitly set openingQuantity, minStock, and location from req.body if present
    if (data.openingQuantity !== undefined) {
      processedData.openingQuantity = data.openingQuantity;
      // Also set current stock to opening stock
      processedData.stock = data.openingQuantity;
    }
    if (data.minStock !== undefined) {
      processedData.minStock = data.minStock;
    }
    if (data.location !== undefined) {
      processedData.location = data.location;
    } else if (data.itemLocation !== undefined) {
      processedData.location = data.itemLocation;
    }
    
    // Generate a unique itemId for this user (could use uuid or Date.now())
    const itemId = processedData.itemId || ('ITM' + Date.now());
    const item = new Item({ ...processedData, itemId });
    await item.save();
    const itemObj = item.toObject();
    
    // Invalidate dashboard cache to ensure stats update immediately
    invalidateDashboardCache(userId);
    
    // Keep the original unit object structure for frontend price conversion
    // Log what was actually saved
    console.log('SAVED openingQuantity:', itemObj.openingQuantity, 'minStock:', itemObj.minStock, 'location:', itemObj.location);
    console.log('SAVED unit:', itemObj.unit);
    res.status(201).json({ success: true, data: itemObj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Bulk import items - Optimized for performance with detailed logging
export const bulkImportItems = async (req, res) => {
  const importId = Date.now().toString();
  console.log(`[${importId}] Bulk import request received`);
  
  try {
    const userId = req.params.userId;
    const items = req.body.items || [];
    
    console.log(`[${importId}] UserId: ${userId}`);
    console.log(`[${importId}] Items count: ${items.length}`);
    
    if (!Array.isArray(items) || items.length === 0) {
      console.log(`[${importId}] No items provided for bulk import`);
      return res.status(400).json({ 
        success: false, 
        message: 'No items provided for bulk import' 
      });
    }

    console.log(`[${importId}] Starting optimized bulk import...`);
    const startTime = Date.now();

    // Process all items in memory first
    console.log(`[${importId}] Step 1: Processing items in memory...`);
    const processedItems = [];
    const itemIds = [];
    
    for (let i = 0; i < items.length; i++) {
      const itemData = items[i];
      try {
        // Process each item data
        const processedData = processBulkImportData({ ...itemData, userId });
        
        // Add index to make itemId unique if there are duplicates
        if (!itemData.itemCode || itemData.itemCode.trim() === '') {
          const timestamp = Date.now();
          const nameSlug = (itemData.name || 'item').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
          processedData.itemId = `${nameSlug}_${timestamp}_${i}`;
        }
        
        processedItems.push(processedData);
        itemIds.push(processedData.itemId);
      } catch (error) {
        console.error(`[${importId}] Error processing item ${i}:`, error);
      }
    }
    
    console.log(`[${importId}] Step 1 completed: ${processedItems.length} items processed`);

    // Batch check for existing items
    console.log(`[${importId}] Step 2: Checking for existing items...`);
    const existingItems = await Item.find({ 
      userId, 
      itemId: { $in: itemIds } 
    }).lean();
    
    console.log(`[${importId}] Found ${existingItems.length} existing items`);

    const existingItemIds = new Set(existingItems.map(item => item.itemId));
    
    // Separate new and existing items
    console.log(`[${importId}] Step 3: Separating new and existing items...`);
    const newItems = [];
    const updateOperations = [];
    
    processedItems.forEach(processedData => {
      if (existingItemIds.has(processedData.itemId)) {
        // Prepare update operation
        updateOperations.push({
          updateOne: {
            filter: { userId, itemId: processedData.itemId },
            update: { $set: processedData },
            upsert: false
          }
        });
      } else {
        // Prepare insert operation
        newItems.push(processedData);
      }
    });
    
    console.log(`[${importId}] Step 3 completed: ${newItems.length} new items, ${updateOperations.length} updates`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Batch insert new items
    if (newItems.length > 0) {
      console.log(`[${importId}] Step 4: Inserting ${newItems.length} new items...`);
      try {
        const insertStartTime = Date.now();
        const insertResult = await Item.insertMany(newItems, { 
          ordered: false, // Continue on errors
          rawResult: true 
        });
        const insertTime = Date.now() - insertStartTime;
        
        successCount += insertResult.insertedCount || newItems.length;
        console.log(`[${importId}] Insert completed in ${insertTime}ms: ${insertResult.insertedCount || newItems.length} items inserted`);
        
        // Add results for inserted items
        newItems.forEach(item => {
          results.push({
            itemId: item.itemId,
            status: 'created',
            data: item
          });
        });
      } catch (error) {
        console.error(`[${importId}] Error in batch insert:`, error);
        errorCount += newItems.length;
        newItems.forEach(item => {
          results.push({
            itemId: item.itemId,
            status: 'error',
            error: error.message
          });
        });
      }
    } else {
      console.log(`[${importId}] No new items to insert`);
    }

    // Batch update existing items
    if (updateOperations.length > 0) {
      console.log(`[${importId}] Step 5: Updating ${updateOperations.length} existing items...`);
      try {
        const updateStartTime = Date.now();
        const updateResult = await Item.bulkWrite(updateOperations, { 
          ordered: false // Continue on errors
        });
        const updateTime = Date.now() - updateStartTime;
        
        successCount += updateResult.modifiedCount || updateOperations.length;
        console.log(`[${importId}] Update completed in ${updateTime}ms: ${updateResult.modifiedCount || updateOperations.length} items updated`);
        
        // Add results for updated items
        updateOperations.forEach(op => {
          results.push({
            itemId: op.updateOne.filter.itemId,
            status: 'updated',
            data: op.updateOne.update.$set
          });
        });
      } catch (error) {
        console.error(`[${importId}] Error in batch update:`, error);
        errorCount += updateOperations.length;
        updateOperations.forEach(op => {
          results.push({
            itemId: op.updateOne.filter.itemId,
            status: 'error',
            error: error.message
          });
        });
      }
    } else {
      console.log(`[${importId}] No items to update`);
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Invalidate dashboard cache to ensure stats update immediately after bulk import
    invalidateDashboardCache(userId);
    
    console.log(`[${importId}] Bulk import completed in ${processingTime}ms. Success: ${successCount}, Errors: ${errorCount}`);
    console.log(`[${importId}] Sending response to client...`);

    res.status(200).json({
      success: true,
      message: `Bulk import completed in ${processingTime}ms. ${successCount} items processed successfully, ${errorCount} failed.`,
      data: {
        totalItems: items.length,
        successCount,
        errorCount,
        processingTime,
        results: results.slice(0, 100) // Limit results to first 100 for performance
      }
    });
    
    console.log(`[${importId}] Response sent successfully`);
  } catch (err) {
    console.error(`[${importId}] Bulk import error:`, err);
    console.error(`[${importId}] Error stack:`, err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during bulk import',
      error: err.message 
    });
  }
};

// Get all items for a user
export const getItems = async (req, res) => {
  try {
    const userId = req.params.userId;
    const items = await Item.find({ userId });
    // Keep the original unit object structure for frontend price conversion
    const itemsWithOriginalUnit = items.map(item => {
      const itemObj = item.toObject();
      // Don't convert unit to string, keep the object structure
      return itemObj;
    });
    res.json({ success: true, data: itemsWithOriginalUnit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all items for the logged-in user (using authMiddleware)
export const getItemsByLoggedInUser = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    console.log('Fetching items for userId:', userId); // Debug log
    console.log('Request headers:', req.headers);
    console.log('User object:', req.user);
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const items = await Item.find({ userId });
    // Keep the original unit object structure for frontend price conversion
    const itemsWithOriginalUnit = items.map(item => {
      const itemObj = item.toObject();
      // Don't convert unit to string, keep the object structure
      return itemObj;
    });
    console.log('Found items:', items);
    res.json({ success: true, data: itemsWithOriginalUnit });
  } catch (err) {
    console.error('Error in getItemsByLoggedInUser:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    await Item.deleteOne({ userId, itemId });
    
    // Invalidate dashboard cache to ensure stats update immediately
    invalidateDashboardCache(userId);
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    const data = req.body;
    
    // Log the incoming data for debugging
    console.log('Update - Incoming data:', JSON.stringify(data, null, 2));
    console.log('Update - Unit data:', data.unit);
    
    // Check if this is a bulk import request or regular item update
    const isBulkImport = data.baseUnit || data.secondaryUnit || data.conversionRateRaw;
    
    let processedData;
    if (isBulkImport) {
      // Process bulk import data if it contains bulk import fields
      processedData = processBulkImportData({ ...data, userId, itemId });
    } else {
      // Process unit data to handle custom units
      let processedUnit = data.unit || {
        base: 'Piece',
        secondary: 'None',
        conversionFactor: 1,
        customBase: '',
        customSecondary: ''
      };

      // If base unit is "custom", replace it with the actual custom value
      if (processedUnit.base === 'custom' && processedUnit.customBase) {
        processedUnit.base = processedUnit.customBase;
      }

      // If secondary unit is "custom", replace it with the actual custom value
      if (processedUnit.secondary === 'custom' && processedUnit.customSecondary) {
        processedUnit.secondary = processedUnit.customSecondary;
      }

      // Regular item update - preserve the unit object structure
      processedData = {
        userId: data.userId,
        itemId: data.itemId || data.itemCode,
        name: data.name,
        category: data.category,
        hsn: data.hsn,
        salePrice: data.salePrice,
        purchasePrice: data.purchasePrice,
        wholesalePrice: data.wholesalePrice,
        minimumWholesaleQuantity: data.minimumWholesaleQuantity,
        discountType: data.discountType,
        saleDiscount: data.saleDiscount,
        stock: data.openingQuantity || data.stock || 0,
        minStock: data.minStock,
        openingQuantity: data.openingQuantity || 0,
        location: data.location,
        subcategory: data.subcategory,
        openingStockQuantity: data.openingQuantity || 0,
        // Tax related fields
        taxRate: data.taxRate,
        inclusiveOfTax: data.inclusiveOfTax || false,
        // Unit conversion fields - use processed unit data
        unit: processedUnit,
        conversionRate: data.conversionRate,
        // Additional fields
        sku: data.itemCode || data.sku,
        description: data.description || '',
        supplier: data.supplier || '',
        status: data.status || 'Active',
        type: data.type || 'Product',
        imageUrl: data.imageUrl || '',
        atPrice: data.atPrice !== undefined ? data.atPrice : data.purchasePrice,
        asOfDate: data.asOfDate
      };
    }
    
    // Explicitly set openingQuantity, minStock, and location from req.body if present
    if (data.openingQuantity !== undefined) {
      processedData.openingQuantity = data.openingQuantity;
      processedData.stock = data.openingQuantity;
    }
    if (data.minStock !== undefined) {
      processedData.minStock = data.minStock;
    }
    if (data.location !== undefined) {
      processedData.location = data.location;
    } else if (data.itemLocation !== undefined) {
      processedData.location = data.itemLocation;
    }

    const updated = await Item.findOneAndUpdate({ userId, itemId }, processedData, { new: true });
    const updatedObj = updated.toObject();
    
    // Invalidate dashboard cache to ensure stats update immediately
    invalidateDashboardCache(userId);
    
    // Keep the original unit object structure for frontend price conversion
    // Log what was actually updated
    console.log('UPDATED openingQuantity:', updatedObj.openingQuantity, 'minStock:', updatedObj.minStock, 'location:', updatedObj.location);
    console.log('UPDATED unit:', updatedObj.unit);
    res.json({ success: true, data: updatedObj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}; 

export const getItemsPerformanceStats = async (req, res) => {
  try {
    // Example: return cache stats or any performance info you want
    res.json({ success: true, data: { message: 'Items performance stats endpoint working!' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  addItem,
  bulkImportItems,
  getItems,
  getItemsByLoggedInUser,
  deleteItem,
  updateItem,
  getItemsPerformanceStats,
}; 