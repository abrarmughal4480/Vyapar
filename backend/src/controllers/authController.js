import User from '../models/user.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = '7d';

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
      return res.json({ success: true, data: { user }, token });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Login failed', error: err.message });
    }
  },
  logout: (req, res) => {
    // For stateless JWT/localStorage auth, just respond with success
    return res.json({ success: true, message: 'Logged out successfully' });
  }
};

export default authController; 