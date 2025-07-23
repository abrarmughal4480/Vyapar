// Quick session validation endpoint
import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Simple session check endpoint
router.get('/session-check', authMiddleware, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Session is valid',
    user: req.user 
  });
});

export default router;
