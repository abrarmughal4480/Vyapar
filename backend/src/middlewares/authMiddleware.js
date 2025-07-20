import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // DEV PATCH: Always allow and set a fake user for local dev
    req.user = { id: 'testuser' };
    return next();
    // return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id && !decoded._id) {
      decoded._id = decoded.id;
    }
    req.user = decoded;
    next();
  } catch (err) {
    // DEV PATCH: Always allow and set a fake user for local dev
    req.user = { id: 'testuser' };
    return next();
    // return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export default authMiddleware; 