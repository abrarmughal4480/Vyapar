import express from 'express';
import authController from '../controllers/authController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import User from '../models/user.js';

const router = express.Router();

router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp-register', authController.verifyOTPAndRegister);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.post('/switch-context', authMiddleware, authController.switchContext);
router.post('/reset-to-user-context', authMiddleware, authController.resetToUserContext);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Example protected route
router.get('/me', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 /auth/me - req.user:', req.user);
    
    let user;
    
    // If user is in company context and has originalUserId, find the current user
    if (req.user.context === 'company' && req.user.originalUserId) {
      console.log('User is in company context, finding current user by originalUserId');
      user = await User.findById(req.user.originalUserId).select('-password');
    } else {
      // Find user by the ID in the token
      console.log('Finding user by token ID');
      user = await User.findById(req.user.id).select('-password');
    }
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('Found user:', { email: user.email, name: user.name, role: user.role });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error in /auth/me:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: err.message });
  }
});

export default router; 