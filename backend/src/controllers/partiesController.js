import Party from '../models/parties.js';
import Sale from '../models/sale.js';

const partiesController = {
  createParty: async (req, res) => {
    try {
      const {
        name,
        phone,
        contactNumber,
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
      const phoneValue = contactNumber || phone || '';
      const party = new Party({
        name,
        phone: phoneValue,
        contactNumber: phoneValue,
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
        user: req.user.id
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
      const phoneValue = req.body.contactNumber || req.body.phone || '';
      const updateFields = {
        name: req.body.name,
        phone: phoneValue,
        contactNumber: phoneValue,
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
  bulkImport: async (req, res) => {
    try {
      const parties = req.body.parties;
      if (!Array.isArray(parties) || parties.length === 0) {
        return res.status(400).json({ success: false, message: 'No parties to import' });
      }
      const userId = req.user.id;
      const docs = parties
        .filter(p => p.name && String(p.name).trim())
        .map(p => {
          // Calculate openingBalance as receivableBalance - payableBalance
          const receivable = typeof p.receivableBalance === 'number' ? p.receivableBalance : parseFloat(p.receivableBalance) || 0;
          const payable = typeof p.payableBalance === 'number' ? p.payableBalance : parseFloat(p.payableBalance) || 0;
          const openingBalance = receivable - payable;
          return {
            name: p.name,
            phone: p.contactNumber || p.phone || '',
            email: p.email || '',
            address: p.address || '',
            openingBalance,
            user: userId
          };
        });
      if (docs.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid parties with name to import' });
      }
      await Party.insertMany(docs);
      return res.status(201).json({ success: true, message: `${docs.length} parties imported successfully` });
    } catch (err) {
      console.error('Bulk import error:', err);
      return res.status(500).json({ success: false, message: 'Bulk import failed', error: err.message });
    }
  },
  // You can add more party-related methods here (list, update, delete, etc.)
};

export default partiesController; 