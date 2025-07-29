import User from '../models/user.js';
import UserInvite from '../models/userInvite.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { clearAllCacheForUser } from './dashboardController.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = '100y';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const authController = {
  register: async (req, res) => {
    try {
      const { email, password, name, businessName, phone, businessType, address, gstNumber, website } = req.body;
      if (!email || !password || !name || !businessName || !phone || !businessType) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User already exists' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ email, password: hashedPassword, name, businessName, phone, businessType, address, gstNumber, website });
      await user.save();
      const token = generateToken(user);
      return res.status(201).json({ success: true, data: { user }, token });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
    }
  },
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Missing email or password' });
      }
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const token = generateToken(user);
      
      // Update user's current token for single device login
      await User.findByIdAndUpdate(user._id, { currentToken: token });
      
      return res.json({ success: true, data: { user }, token });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Login failed', error: err.message });
    }
  },
  logout: async (req, res) => {
    try {
      // Clear the current token from user document
      if (req.user && req.user.id) {
        await User.findByIdAndUpdate(req.user.id, { currentToken: null });
        clearAllCacheForUser(req.user.id);
      }
      return res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Logout failed', error: err.message });
    }
  },
  
  switchContext: async (req, res) => {
    try {
      const { companyId } = req.body;
      const userId = req.user && (req.user._id || req.user.id);
      
      if (!companyId || !userId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Check if user has access to this company
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Check if user has joined this company
      if (!user.joinedCompanies || !user.joinedCompanies.includes(companyId)) {
        return res.status(403).json({ success: false, message: 'Access denied to this company' });
      }

      // Check if the company exists
      const company = await User.findById(companyId);
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found' });
      }

      // Get user's role in this company
      const userInvite = await UserInvite.findOne({
        requestedTo: user._id,
        requestedBy: companyId,
        status: 'Accepted'
      });

      if (!userInvite) {
        return res.status(403).json({ success: false, message: 'No accepted invite found for this company' });
      }

      // Generate new token with company context and role
      const tokenPayload = {
        id: companyId, // Use company ID as the main ID
        email: user.email, // Keep user's email for role lookup
        name: company.businessName, // Use company name
        originalUserId: userId, // Keep original user ID for reference
        userEmail: user.email, // Add userEmail for permission checks
        role: userInvite.role, // Add role from UserInvite
        context: 'company' // Indicate this is a company context
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      
      // Update user's current token (but don't update for company context tokens)
      // Only update for user context tokens to avoid logout issues
      if (tokenPayload.context !== 'company') {
        await User.findByIdAndUpdate(userId, { currentToken: token });
      }

      console.log(`User ${userId} switched to company context: ${companyId}`);

      return res.json({ 
        success: true, 
        message: 'Context switched successfully',
        token,
        data: {
          companyId,
          companyName: company.businessName,
          originalUserId: userId
        }
      });
    } catch (err) {
      console.error('Error switching context:', err);
      return res.status(500).json({ success: false, message: 'Failed to switch context', error: err.message });
    }
  }
};

export default authController; 