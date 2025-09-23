import Item from '../models/items.js';


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

  const openingQty = data.openingStockQuantity || data.openingQuantity || 0;

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
    asOfDate: data.asOfDate,
    // Initialize batches for opening stock
    batches: openingQty > 0 ? [
      {
        quantity: openingQty,
        purchasePrice: data.purchasePrice || data.atPrice
      }
    ] : []
  };
}

// Add a new item for a user
export const addItem = async (req, res) => {
  try {
    const userId = req.params.userId;
    const data = req.body;
    

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
    
    // Initialize batches from openingQuantity if provided and > 0
    const openingQtyForBatch = processedData.openingQuantity || processedData.openingStockQuantity || 0;
    if (!Array.isArray(processedData.batches)) {
      processedData.batches = [];
    }
    if (openingQtyForBatch > 0 && processedData.batches.length === 0) {
      processedData.batches.push({
        quantity: openingQtyForBatch,
        purchasePrice: processedData.purchasePrice || processedData.atPrice
      });
    }

    // Generate a unique itemId for this user (could use uuid or Date.now())
    const itemId = processedData.itemId || ('ITM' + Date.now());
    const item = new Item({ ...processedData, itemId });
    await item.save();
    const itemObj = item.toObject();
    
    
    // Keep the original unit object structure for frontend price conversion
    res.status(201).json({ success: true, data: itemObj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Bulk import items - Optimized for performance with detailed logging
export const bulkImportItems = async (req, res) => {
  const importId = Date.now().toString();
  
  try {
    const userId = req.params.userId;
    const items = req.body.items || [];
    
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No items provided for bulk import' 
      });
    }

    const startTime = Date.now();

    // Process all items in memory first
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
    
    // Batch check for existing items
    const existingItems = await Item.find({ 
      userId, 
      itemId: { $in: itemIds }
    }).lean();
    
    const existingItemIds = new Set(existingItems.map(item => item.itemId));
    
    // Separate new and existing items
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
    

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Batch insert new items
    if (newItems.length > 0) {
      try {
        const insertStartTime = Date.now();
        const insertResult = await Item.insertMany(newItems, { 
          ordered: false, // Continue on errors
          rawResult: true 
        });
        const insertTime = Date.now() - insertStartTime;
        
        successCount += insertResult.insertedCount || newItems.length;
        
        // Add results for inserted items
        newItems.forEach(item => {
          // Ensure batches exist based on opening quantity
          const openingQty = item.openingStockQuantity || item.openingQuantity || 0;
          if (!Array.isArray(item.batches)) {
            item.batches = [];
          }
          if (openingQty > 0 && item.batches.length === 0) {
            item.batches.push({ quantity: openingQty, purchasePrice: item.purchasePrice || item.atPrice });
          }
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
    }

    // Batch update existing items
    if (updateOperations.length > 0) {
      try {
        const updateStartTime = Date.now();
        const updateResult = await Item.bulkWrite(updateOperations, { 
          ordered: false // Continue on errors
        });
        const updateTime = Date.now() - updateStartTime;
        
        successCount += updateResult.modifiedCount || updateOperations.length;
        
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
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    

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

// Check existing items by item codes
export const checkExistingItems = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { itemCodes } = req.body;
    
    if (!Array.isArray(itemCodes) || itemCodes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No item codes provided' 
      });
    }

    // Find existing items by itemId (which includes itemCode)
    const existingItems = await Item.find({ 
      userId, 
      itemId: { $in: itemCodes }
    }).select('itemId name').lean();
    
    const existingItemIds = existingItems.map(item => item.itemId);
    
    res.status(200).json({
      success: true,
      data: {
        existingItemIds,
        existingItems,
        totalChecked: itemCodes.length,
        duplicatesFound: existingItemIds.length,
        newItems: itemCodes.length - existingItemIds.length
      }
    });
    
  } catch (err) {
    console.error('Check existing items error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while checking existing items',
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
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const items = await Item.find({ userId });
    // Keep the original unit object structure for frontend price conversion
    const itemsWithOriginalUnit = items.map(item => {
      const itemObj = item.toObject();
      // Don't convert unit to string, keep the object structure
      return itemObj;
    });
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
    
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    const data = req.body;
    
    
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

    // Reset or adjust batches on update
    if (!Array.isArray(processedData.batches)) {
      processedData.batches = undefined; // avoid overwriting unless we intend to
    }

    // If openingQuantity is provided, reset batches to one opening batch
    if (data.openingQuantity !== undefined) {
      const openingQty = Number(data.openingQuantity) || 0;
      processedData.batches = openingQty > 0 ? [
        {
          quantity: openingQty,
          purchasePrice: processedData.purchasePrice || processedData.atPrice
        }
      ] : [];
    }

    const updated = await Item.findOneAndUpdate({ userId, itemId }, processedData, { new: true });
    const updatedObj = updated.toObject();
    
    
    // Keep the original unit object structure for frontend price conversion
    res.json({ success: true, data: updatedObj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}; 

export const getItemsPerformanceStats = async (req, res) => {
  try {
    // Example: return performance info
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