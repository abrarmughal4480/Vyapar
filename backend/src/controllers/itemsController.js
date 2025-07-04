import Item from '../models/items.js';

// Add a new item for a user
export const addItem = async (req, res) => {
  try {
    const userId = req.params.userId;
    const data = req.body;
    // Generate a unique itemId for this user (could use uuid or Date.now())
    const itemId = data.itemId || ('ITM' + Date.now());
    const item = new Item({ ...data, userId, itemId });
    await item.save();
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get all items for a user
export const getItems = async (req, res) => {
  try {
    const userId = req.params.userId;
    const items = await Item.find({ userId });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all items for the logged-in user (using authMiddleware)
export const getItemsByLoggedInUser = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    console.log('Fetching items for userId:', userId); // Debug log
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const items = await Item.find({ userId });
    res.json({ success: true, items });
  } catch (err) {
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
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export default { addItem, getItems, deleteItem, updateItem }; 