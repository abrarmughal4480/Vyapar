// Quick session validation endpoint
import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import User from '../models/user.js';

const router = express.Router();

// Enhanced session check endpoint that verifies token is still current
router.get('/session-check', authMiddleware, async (req, res) => {
  try {
    let userId = req.user.id;
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!currentToken) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_MISSING',
        message: 'No token provided'
      });
    }
    
    // If user is in company context, use originalUserId for token validation
    if (req.user.context === 'company' && req.user.originalUserId) {
      userId = req.user.originalUserId;
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
    
    // For company context, don't check token match as multiple contexts are allowed
    // For user context, check if token matches current active token
    if (req.user.context !== 'company') {
      if (user.currentToken && user.currentToken !== currentToken) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_EXPIRED',
          message: 'Another device has logged in with this account'
        });
      }
    }
    // For company context, just verify the user exists and has access to the company
    // (this is already done in authMiddleware)
    
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
