import User from '../models/user.js';
import UserInvite from '../models/userInvite.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../services/emailService.js';
import crypto from 'crypto';
import config from '../config/config.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = '100y';

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      name: user.name, 
      role: user.role,
      isSuperAdmin: user.role === 'superadmin'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const authController = {
  // Generate and send OTP for email verification
  sendOTP: async (req, res) => {
    try {
      const { email } = req.body;
      console.log('=== OTP SEND REQUEST ===');
      console.log('Email:', email);
      console.log('Timestamp:', new Date().toISOString());
      
      if (!email) {
        console.log('ERROR: Email is required');
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log('ERROR: User already exists with email:', email);
        return res.status(409).json({ success: false, message: 'User already exists with this email' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      
      console.log('Generated OTP:', otp);
      console.log('OTP Expiry:', otpExpiry.toISOString());

      // Store OTP in temporary storage (you might want to use Redis in production)
      // For now, we'll store it in a global variable (not recommended for production)
      if (!global.otpStorage) {
        global.otpStorage = new Map();
      }
      global.otpStorage.set(email, { otp, expiry: otpExpiry });
      console.log('OTP stored for email:', email);

      // Send OTP via email
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #4f46e5; font-size: 32px; margin: 0; letter-spacing: 4px;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `;

      try {
        console.log('Sending OTP email to:', email);
        await sendEmail({
          to: email,
          subject: 'Email Verification - Devease Digital',
          html: emailContent
        });
        console.log('OTP email sent successfully to:', email);
        console.log('=== OTP SEND COMPLETED ===');
        return res.json({ success: true, message: 'OTP sent successfully' });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        console.log('ERROR: Failed to send OTP email to:', email);
        // For development/testing, you might want to return the OTP in response
        // In production, you should handle this differently
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: Returning OTP in response');
          return res.json({ 
            success: true, 
            message: 'OTP sent successfully (development mode)', 
            otp: otp // Only in development!
          });
        } else {
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to send OTP. Please try again later.' 
          });
        }
      }
    } catch (err) {
      console.error('OTP send error:', err);
      return res.status(500).json({ success: false, message: 'Failed to send OTP', error: err.message });
    }
  },

  // Verify OTP and register user
  verifyOTPAndRegister: async (req, res) => {
    try {
      const { email, password, name, businessName, phone, businessType, address, gstNumber, website, otp } = req.body;
      
      console.log('=== OTP VERIFICATION REQUEST ===');
      console.log('Email:', email);
      console.log('OTP Provided:', otp);
      console.log('Timestamp:', new Date().toISOString());
      
      if (!email || !password || !name || !businessName || !phone || !businessType || !otp) {
        console.log('ERROR: Missing required fields');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log('ERROR: User already exists with email:', email);
        return res.status(409).json({ success: false, message: 'User already exists' });
      }

      // Verify OTP
      if (!global.otpStorage || !global.otpStorage.has(email)) {
        console.log('ERROR: OTP not found in storage for email:', email);
        return res.status(400).json({ success: false, message: 'OTP not found or expired' });
      }

      const storedOTPData = global.otpStorage.get(email);
      console.log('Stored OTP:', storedOTPData.otp);
      console.log('Stored OTP Expiry:', storedOTPData.expiry.toISOString());
      
      if (storedOTPData.otp !== otp) {
        console.log('ERROR: Invalid OTP provided');
        console.log('Expected:', storedOTPData.otp);
        console.log('Received:', otp);
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }

      if (new Date() > storedOTPData.expiry) {
        console.log('ERROR: OTP has expired');
        console.log('Current time:', new Date().toISOString());
        console.log('Expiry time:', storedOTPData.expiry.toISOString());
        global.otpStorage.delete(email);
        return res.status(400).json({ success: false, message: 'OTP has expired' });
      }

      console.log('OTP verification successful');
      // Clear OTP after successful verification
      global.otpStorage.delete(email);
      console.log('OTP cleared from storage');

      // Create user
      console.log('Creating new user account');
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ 
        email, 
        password: hashedPassword, 
        name, 
        businessName, 
        phone, 
        businessType, 
        address, 
        gstNumber, 
        website,
        emailVerified: true // Mark email as verified
      });
      await user.save();
      console.log('User created successfully with ID:', user._id);
      
      const token = generateToken(user);
      console.log('JWT token generated for user:', user._id);
      console.log('=== OTP VERIFICATION COMPLETED ===');
      return res.status(201).json({ success: true, data: { user }, token });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
    }
  },

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
      
      // For company context, don't update currentToken - keep the original user token
      // Company context tokens are validated differently in session check
      

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
  },

  // Reset back to user context from company context
  resetToUserContext: async (req, res) => {
    try {
      const userId = req.user && (req.user.originalUserId || req.user.id);
      
      if (!userId) {
        return res.status(400).json({ success: false, message: 'Missing user ID' });
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Generate new token with user context
      const tokenPayload = {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        context: 'user'
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      
      // Update user's currentToken in database
      const updateResult = await User.findByIdAndUpdate(userId, { currentToken: token });


      return res.json({ 
        success: true, 
        message: 'Context reset to user successfully',
        token,
        data: {
          userId: user._id,
          userName: user.name,
          userEmail: user.email
        }
      });
    } catch (err) {
      console.error('Error resetting to user context:', err);
      return res.status(500).json({ success: false, message: 'Failed to reset context', error: err.message });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email, frontendUrl } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token to user
      await User.findByIdAndUpdate(user._id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry
      });

      // Create reset URL - use provided frontend URL or fallback to config
      const resetUrl = `${frontendUrl || config.frontendUrl}/reset-password?token=${resetToken}`;

      // Send email
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Devease Digital</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Reset Request</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-bottom: 20px;">Hello ${user.name || user.businessName},</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password for your Devease Digital account. 
              If you didn't make this request, you can safely ignore this email.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 10px; 
                        font-weight: bold; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 15px;">
              This link will expire in 1 hour for security reasons.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 15px;">
              If the button above doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="background: #f3f4f6; padding: 15px; border-radius: 8px; word-break: break-all; color: #374151; font-family: monospace; font-size: 14px;">
              ${resetUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: 'Reset Your Password - Devease Digital',
        html: emailContent,
        fromName: 'Devease Digital Support'
      });

      return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (err) {
      console.error('Error in forgot password:', err);
      return res.status(500).json({ success: false, message: 'Failed to process password reset request' });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token and password are required' });
      }

      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password and clear reset token
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined
      });

      return res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (err) {
      console.error('Error in reset password:', err);
      return res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  }
};

export default authController; 