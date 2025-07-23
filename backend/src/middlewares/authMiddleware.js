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
      const user = await User.findById(decoded.id);
      if (!user || user.currentToken !== token) {
        return res.status(401).json({ 
          success: false, 
          message: 'Session expired. You have been logged in from another device.',
          code: 'SESSION_EXPIRED'
        });
      }
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export default authMiddleware; 