import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const ENABLE_SINGLE_DEVICE_LOGIN = process.env.ENABLE_SINGLE_DEVICE_LOGIN !== 'false'; // Default to true

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id && !decoded._id) {
      decoded._id = decoded.id;
    }
    
    // Check if this token matches the user's current active token (single device login)
    if (ENABLE_SINGLE_DEVICE_LOGIN) {
      // For company context tokens, check against original user's token
      const userIdToCheck = decoded.originalUserId || decoded.id;
      const user = await User.findById(userIdToCheck);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found.',
          code: 'SESSION_EXPIRED'
        });
      }
      
      // For company context, we don't check token match (allow multiple contexts)
      if (decoded.context === 'company') {
        // Just verify the user exists and has access to the company
        if (!user.joinedCompanies || !user.joinedCompanies.includes(decoded.id)) {
          return res.status(403).json({ 
            success: false, 
            message: 'Access denied to this company.',
            code: 'ACCESS_DENIED'
          });
        }
      } else {
        // For user context, check token match
        if (user.currentToken !== token) {
          return res.status(401).json({ 
            success: false, 
            message: 'Session expired. You have been logged in from another device.',
            code: 'SESSION_EXPIRED'
          });
        }
      }
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export default authMiddleware; 