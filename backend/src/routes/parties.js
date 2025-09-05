import express from 'express';
import partiesController from '../controllers/partiesController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /parties/ - Add a new party (user must be authenticated)
router.post('/', authMiddleware, partiesController.createParty);

// GET /parties/ - Get all parties for the authenticated user (optimized)
router.get('/', authMiddleware, partiesController.getPartiesByUser);

// PUT /parties/:id - Update a party by ID
router.put('/:id', authMiddleware, partiesController.updateParty);

// DELETE /parties/:id - Delete a party by ID
router.delete('/:id', authMiddleware, partiesController.deleteParty);

// Bulk import route
router.post('/bulk-import', authMiddleware, partiesController.bulkImport);

// GET /parties/:partyId/balance - Get party balance
router.get('/:partyId/balance', authMiddleware, partiesController.getPartyBalance);

export default router; 