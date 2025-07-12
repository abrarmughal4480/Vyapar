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
    stock: data.openingStockQuantity,
    minStock: data.minimumStockQuantity,
    openingQuantity: data.openingStockQuantity,
    location: data.itemLocation,
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
    atPrice: data.atPrice,
    asOfDate: data.asOfDate
  };
}

// Add a new item for a user
export const addItem = async (req, res) => {
  try {
    const userId = req.params.userId;
    const data = req.body;
    
    // Process bulk import data if it contains bulk import fields
    const processedData = processBulkImportData({ ...data, userId });
    
    // Generate a unique itemId for this user (could use uuid or Date.now())
    const itemId = processedData.itemId || ('ITM' + Date.now());
    const item = new Item({ ...processedData, itemId });
    await item.save();
    const itemObj = item.toObject();
    itemObj.unit = typeof itemObj.unit === 'object' ? getUnitDisplay(itemObj.unit) : itemObj.unit;
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
    
    // Process bulk import data if it contains bulk import fields
    const processedData = processBulkImportData({ ...data, userId, itemId });
    
    const updated = await Item.findOneAndUpdate({ userId, itemId }, processedData, { new: true });
    const updatedObj = updated.toObject();
    updatedObj.unit = typeof updatedObj.unit === 'object' ? getUnitDisplay(updatedObj.unit) : updatedObj.unit;
    res.json({ success: true, data: updatedObj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export default { addItem, bulkImportItems, getItems, deleteItem, updateItem }; 