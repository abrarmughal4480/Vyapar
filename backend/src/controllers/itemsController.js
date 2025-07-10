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

// Add a new item for a user
export const addItem = async (req, res) => {
  try {
    const userId = req.params.userId;
    const data = req.body;
    // Generate a unique itemId for this user (could use uuid or Date.now())
    const itemId = data.itemId || ('ITM' + Date.now());
    const item = new Item({ ...data, userId, itemId });
    await item.save();
    const itemObj = item.toObject();
    itemObj.unit = typeof itemObj.unit === 'object' ? getUnitDisplay(itemObj.unit) : itemObj.unit;
    res.status(201).json({ success: true, data: itemObj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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
    const updated = await Item.findOneAndUpdate({ userId, itemId }, data, { new: true });
    const updatedObj = updated.toObject();
    updatedObj.unit = typeof updatedObj.unit === 'object' ? getUnitDisplay(updatedObj.unit) : updatedObj.unit;
    res.json({ success: true, data: updatedObj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export default { addItem, getItems, deleteItem, updateItem }; 