import Party from '../models/parties.js';
import Sale from '../models/sale.js';

const partiesController = {
  createParty: async (req, res) => {
    try {
      const {
        name,
        phone,
        email,
        address,
        gstNumber,
        partyType,
        openingBalance,
        pan,
        city,
        state,
        pincode,
        tags,
        status,
        note
      } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Party name is required' });
      }
      const party = new Party({
        name,
        phone,
        email,
        address,
        gstNumber,
        partyType,
        openingBalance,
        pan,
        city,
        state,
        pincode,
        tags,
        status,
        note,
        user: req.user.id // user id from authMiddleware
      });
      await party.save();
      console.log(`Party created successfully: ${party.name} (ID: ${party._id}) by user ${req.user.id}`);
      return res.status(201).json({ success: true, data: party });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to create party', error: err.message });
    }
  },
  getPartiesByUser: async (req, res) => {
    try {
      const parties = await Party.find({
        $or: [
          { user: req.user.id },
          { user: { $exists: false } },
          { user: null }
        ]
      });
      return res.json({ success: true, data: parties });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch parties', error: err.message });
    }
  },
  updateParty: async (req, res) => {
    try {
      const partyId = req.params.id;
      const updateFields = {
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email,
        address: req.body.address,
        gstNumber: req.body.gstNumber,
        partyType: req.body.partyType,
        openingBalance: req.body.openingBalance,
        pan: req.body.pan,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        tags: req.body.tags,
        status: req.body.status,
        note: req.body.note
      };
      const party = await Party.findOneAndUpdate(
        { _id: partyId, user: req.user.id },
        { $set: updateFields },
        { new: true }
      );
      if (!party) {
        return res.status(404).json({ success: false, message: 'Party not found or not authorized' });
      }
      console.log(`Party updated successfully: ${party.name} (ID: ${party._id}) by user ${req.user.id}`);
      return res.json({ success: true, data: party });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update party', error: err.message });
    }
  },
  deleteParty: async (req, res) => {
    try {
      const partyId = req.params.id;
      const party = await Party.findOneAndDelete({ _id: partyId, user: req.user.id });
      if (!party) {
        return res.status(404).json({ success: false, message: 'Party not found or not authorized' });
      }
      console.log(`Party deleted successfully: ${party.name} (ID: ${party._id}) by user ${req.user.id}`);
      return res.json({ success: true, message: 'Party deleted successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete party', error: err.message });
    }
  },
  getPartyBalance: async (req, res) => {
    try {
      const partyName = req.query.name;
      const userId = req.user.id;
      if (!partyName) {
        return res.status(400).json({ success: false, message: 'Party name is required' });
      }
      // Find party
      const party = await Party.findOne({ name: partyName, user: userId });
      if (!party) {
        return res.status(404).json({ success: false, message: 'Party not found' });
      }
      // Just return opening balance
      const openingBalance = party.openingBalance || 0;
      return res.json({ success: true, balance: openingBalance });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch party balance', error: err.message });
    }
  },
  // You can add more party-related methods here (list, update, delete, etc.)
};

export default partiesController; 