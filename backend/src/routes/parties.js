import express from 'express';
import partiesController from '../controllers/partiesController.js';

const router = express.Router();

// POST /parties/ - Add a new party (user must be authenticated)
router.post('/', partiesController.createParty);

// GET /parties/ - Get all parties for the authenticated user
router.get('/', partiesController.getPartiesByUser);

// PUT /parties/:id - Update a party by ID
router.put('/:id', partiesController.updateParty);

// DELETE /parties/:id - Delete a party by ID
router.delete('/:id', partiesController.deleteParty);

export default router; 