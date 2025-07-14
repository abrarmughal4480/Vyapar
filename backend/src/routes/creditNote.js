import express from 'express';
import { createCreditNote, getCreditNotesByUser } from '../controllers/creditNoteController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a credit note
router.post('/', authMiddleware, createCreditNote);

// Get all credit notes for a user
router.get('/user/:userId', authMiddleware, getCreditNotesByUser);

export default router; 