// Quick session validation endpoint
import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import User from '../models/user.js';

const router = express.Router();

// Enhanced session check endpoint that verifies token is still current
router.get('/session-check', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!currentToken) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_MISSING',
        message: 'No token provided'
      });
    }
    
    // Check if this token is still the current token in the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }
    
    // If user has currentToken field and it doesn't match, force logout
    if (user.currentToken && user.currentToken !== currentToken) {
      return res.status(401).json({
        success: false,
        code: 'SESSION_EXPIRED',
        message: 'Another device has logged in with this account'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Session is valid',
      user: req.user 
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

export default router;
