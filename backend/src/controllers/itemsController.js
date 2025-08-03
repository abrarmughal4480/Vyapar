import Item from '../models/items.js';

// Simple in-memory cache for items
const itemsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    stock: data.openingStockQuantity || data.openingQuantity || 0, // Current stock = opening stock
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
        // Unit conversion fields - preserve the original unit object
        unit: data.unit || {
          base: 'Piece',
          secondary: 'None',
          conversionFactor: 1,
          customBase: '',
          customSecondary: ''
        },
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
    itemObj.unit = typeof itemObj.unit === 'object' ? getUnitDisplay(itemObj.unit) : itemObj.unit;
    // Log what was actually saved
    console.log('SAVED openingQuantity:', itemObj.openingQuantity, 'minStock:', itemObj.minStock, 'location:', itemObj.location);
    console.log('SAVED unit:', itemObj.unit);
    res.status(201).json({ success: true, data: itemObj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Bulk import items
export const bulkImportItems = async (req, res) => {
  try {
    console.log('Bulk import request received');
    console.log('Request body:', req.body);
    console.log('Request params:', req.params);
    
    const userId = req.params.userId;
    const items = req.body.items || [];
    
    console.log('UserId:', userId);
    console.log('Items count:', items.length);
    
    if (!Array.isArray(items) || items.length === 0) {
      console.log('No items provided for bulk import');
      return res.status(400).json({ 
        success: false, 
        message: 'No items provided for bulk import' 
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    console.log('Starting to process items...');

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
        
        // Check if item already exists
        const existingItem = await Item.findOne({ 
          userId, 
          itemId: processedData.itemId 
        });

        if (existingItem) {
          // Update existing item
          const updatedItem = await Item.findOneAndUpdate(
            { userId, itemId: processedData.itemId },
            processedData,
            { new: true }
          );
          results.push({
            itemId: processedData.itemId,
            status: 'updated',
            data: updatedItem.toObject()
          });
          successCount++;
        } else {
          // Create new item
          const newItem = new Item(processedData);
          await newItem.save();
          results.push({
            itemId: processedData.itemId,
            status: 'created',
            data: newItem.toObject()
          });
          successCount++;
        }
      } catch (error) {
        console.error('Error processing item:', error);
        results.push({
          itemId: itemData.itemCode || `item_${i}`,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    console.log(`Bulk import completed. Success: ${successCount}, Errors: ${errorCount}`);

    res.status(200).json({
      success: true,
      message: `Bulk import completed. ${successCount} items processed successfully, ${errorCount} failed.`,
      data: {
        totalItems: items.length,
        successCount,
        errorCount,
        results
      }
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Bulk import failed: ' + err.message 
    });
  }
};

// Get all items for a user
export const getItems = async (req, res) => {
  try {
    const userId = req.params.userId;
    const items = await Item.find({ userId });
    const itemsWithUnitString = items.map(item => {
      const itemObj = item.toObject();
      itemObj.unit = typeof itemObj.unit === 'object' ? getUnitDisplay(itemObj.unit) : itemObj.unit;
      return itemObj;
    });
    res.json({ success: true, data: itemsWithUnitString });
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
    const itemsWithUnitString = items.map(item => {
      const itemObj = item.toObject();
      itemObj.unit = typeof itemObj.unit === 'object' ? getUnitDisplay(itemObj.unit) : itemObj.unit;
      return itemObj;
    });
    console.log('Found items:', items);
    res.json({ success: true, data: itemsWithUnitString });
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
        // Unit conversion fields - preserve the original unit object
        unit: data.unit || {
          base: 'Piece',
          secondary: 'None',
          conversionFactor: 1,
          customBase: '',
          customSecondary: ''
        },
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
    updatedObj.unit = typeof updatedObj.unit === 'object' ? getUnitDisplay(updatedObj.unit) : updatedObj.unit;
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