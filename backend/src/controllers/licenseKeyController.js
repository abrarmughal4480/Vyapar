import LicenseKey from '../models/licenseKey.js';
import User from '../models/user.js';

// Generate a unique license key
const generateUniqueKey = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key;
  let isUnique = false;
  
  while (!isUnique) {
    let result = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) {
        result += '-';
      }
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    key = result;
    
    // Check if key already exists
    const existingKey = await LicenseKey.findOne({ key });
    if (!existingKey) {
      isUnique = true;
    }
  }
  
  return key;
};

// Generate license key
export const generateLicenseKey = async (req, res) => {
  try {
    const { duration, maxDevices } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!duration || !maxDevices) {
      return res.status(400).json({
        success: false,
        message: 'Duration and maxDevices are required'
      });
    }

    if (duration < 1 || duration > 10) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 10 years'
      });
    }

    if (maxDevices < 1 || maxDevices > 50) {
      return res.status(400).json({
        success: false,
        message: 'Max devices must be between 1 and 50'
      });
    }

    // Check if user is superadmin
    const user = await User.findById(userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can generate license keys'
      });
    }

    // Generate unique key
    const key = await generateUniqueKey();
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + duration);

    // Create license key
    const licenseKey = new LicenseKey({
      key,
      duration,
      maxDevices,
      expiresAt,
      generatedBy: userId
    });

    await licenseKey.save();

    res.status(201).json({
      success: true,
      message: 'License key generated successfully',
      data: {
        key: licenseKey.key,
        duration: licenseKey.duration,
        maxDevices: licenseKey.maxDevices,
        expiresAt: licenseKey.expiresAt,
        generatedAt: licenseKey.generatedAt
      }
    });

  } catch (error) {
    console.error('Error generating license key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate license key',
      error: error.message
    });
  }
};

// Get all license keys (for superadmin)
export const getAllLicenseKeys = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is superadmin
    const user = await User.findById(userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can view license keys'
      });
    }

    const licenseKeys = await LicenseKey.find()
      .populate('generatedBy', 'name email')
      .populate('usedDevices.userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: licenseKeys
    });

  } catch (error) {
    console.error('Error fetching license keys:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch license keys',
      error: error.message
    });
  }
};

// Validate and activate license key
export const activateLicenseKey = async (req, res) => {
  try {
    const { key, deviceInfo } = req.body;
    const userEmail = req.user.email || req.user.userEmail;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'License key is required'
      });
    }

    // Find license key
    const licenseKey = await LicenseKey.findOne({ key: key.toUpperCase() });
    if (!licenseKey) {
      return res.status(404).json({
        success: false,
        message: 'Invalid license key'
      });
    }

    // Check if key can be used
    if (!licenseKey.canBeUsed()) {
      let errorMessage = 'License key cannot be used';
      
      if (!licenseKey.isActive) {
        errorMessage = 'License key is inactive';
      } else if (licenseKey.expiresAt < new Date()) {
        errorMessage = 'License key has expired';
      } else if (licenseKey.remainingDevices <= 0) {
        errorMessage = 'License key has reached maximum number of devices';
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }

    // Get user info
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has an active license
    const userWithLicense = await User.findOne({ email: userEmail }).populate('activatedLicenseKey');
    
    if (userWithLicense && userWithLicense.activatedLicenseKey) {
      const existingLicense = userWithLicense.activatedLicenseKey;
      
      // Check if the existing license is still valid
      if (existingLicense.isActive && existingLicense.expiresAt > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'User already has an active license'
        });
      }
    }

    // Add device usage
    await licenseKey.addDeviceUsage(
      user._id,
      user.email,
      user.name,
      deviceInfo || 'Unknown device'
    );

    // Update user's license information
    await User.findByIdAndUpdate(user._id, {
      activatedLicenseKey: licenseKey._id,
      licenseActivatedAt: new Date(),
      licenseExpiresAt: licenseKey.expiresAt
    });

    res.json({
      success: true,
      message: 'License key activated successfully',
      data: {
        key: licenseKey.key,
        duration: licenseKey.duration,
        maxDevices: licenseKey.maxDevices,
        currentUsage: licenseKey.currentUsage,
        remainingDevices: licenseKey.remainingDevices,
        expiresAt: licenseKey.expiresAt
      }
    });

  } catch (error) {
    console.error('Error activating license key:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate license key',
      error: error.message
    });
  }
};

// Check user's license status
export const checkLicenseStatus = async (req, res) => {
  try {
    const userEmail = req.user.email || req.user.userEmail;
    const originalUserId = req.user.originalUserId;
    console.log('🔍 Backend License Check - Full req.user:', req.user);
    console.log('📧 Backend License Check - User email:', userEmail);
    console.log('🆔 Backend License Check - User ID:', req.user.id);
    console.log('🆔 Backend License Check - Original User ID:', originalUserId);
    console.log('🏢 Backend License Check - Context:', req.user.context);

    // Step 1: Find user by email
    let user = await User.findOne({ email: userEmail });
    console.log('Current user found by email:', user ? 'Yes' : 'No');
    if (user) {
      console.log('Current user email:', user.email);
      console.log('Current user ID:', user._id);
      console.log('Token user ID:', req.user.id);
      console.log('IDs match:', user._id.toString() === req.user.id);
      console.log('Current user has license:', user.activatedLicenseKey ? 'Yes' : 'No');
    }
    
    // For license checking, we should check if the CURRENT user has a license
    // Not the original user, because the current user is the one who needs to buy a license
    let userForLicenseCheck = user;
    
    // Only check original user if current user doesn't exist
    if (!user && originalUserId) {
      console.log('Current user not found, checking original user...');
      const originalUser = await User.findById(originalUserId);
      if (originalUser) {
        console.log('Found original user:', originalUser.email);
        userForLicenseCheck = originalUser;
      }
    }
    
    console.log('Final user for license check:', userForLicenseCheck ? userForLicenseCheck.email : 'None');
    console.log('This user needs to buy license:', userForLicenseCheck ? (userForLicenseCheck.activatedLicenseKey ? 'No' : 'Yes') : 'Unknown');
    
    if (!userForLicenseCheck) {
      return res.json({
        success: true,
        data: {
          hasValidLicense: false,
          message: 'User not found'
        }
      });
    }

    // Check if user has activatedLicenseKey
    if (!userForLicenseCheck.activatedLicenseKey) {
      console.log('No activatedLicenseKey found in user document');
      return res.json({
        success: true,
        data: {
          hasValidLicense: false,
          message: 'No license key activated'
        }
      });
    }

    console.log('User has activatedLicenseKey ID:', userForLicenseCheck.activatedLicenseKey);

    // Step 2: Find the license key in LicenseKey collection
    const licenseKey = await LicenseKey.findById(userForLicenseCheck.activatedLicenseKey);
    console.log('License key found:', licenseKey ? 'Yes' : 'No');
    
    if (!licenseKey) {
      console.log('License key not found in LicenseKey collection');
      return res.json({
        success: true,
        data: {
          hasValidLicense: false,
          message: 'License key not found'
        }
      });
    }

    // Step 3: Check if user's email exists in usedDevices array
    const userDeviceUsage = licenseKey.usedDevices.find(
      device => device.userEmail === userForLicenseCheck.email
    );
    console.log('User device usage found:', userDeviceUsage ? 'Yes' : 'No');
    console.log('Checking for email in license:', userForLicenseCheck.email);

    if (!userDeviceUsage) {
      console.log('User not found in license key usedDevices array');
      return res.json({
        success: true,
        data: {
          hasValidLicense: false,
          message: 'User not found in license usage'
        }
      });
    }

    // Step 4: Check if license is still valid (not expired)
    const currentTime = new Date();
    const isExpired = licenseKey.expiresAt < currentTime;
    const isActive = licenseKey.isActive;
    
    console.log('License expiry check:', {
      expiresAt: licenseKey.expiresAt,
      currentTime: currentTime,
      isExpired: isExpired,
      isActive: isActive
    });

    if (!isActive || isExpired) {
      console.log('License is inactive or expired');
      return res.json({
        success: true,
        data: {
          hasValidLicense: false,
          message: isExpired ? 'License has expired' : 'License is inactive'
        }
      });
    }

    // License is valid
    console.log('License is valid');
    res.json({
      success: true,
      data: {
        hasValidLicense: true,
        license: {
          key: licenseKey.key,
          duration: licenseKey.duration,
          maxDevices: licenseKey.maxDevices,
          currentUsage: licenseKey.currentUsage,
          remainingDevices: licenseKey.remainingDevices,
          expiresAt: licenseKey.expiresAt,
          activatedAt: userDeviceUsage.activatedAt,
          deviceInfo: userDeviceUsage.deviceInfo
        }
      }
    });

  } catch (error) {
    console.error('Error checking license status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check license status',
      error: error.message
    });
  }
};

// Clear current user's license (user can clear their own license)
export const clearUserLicense = async (req, res) => {
  try {
    console.log('🔍 Clear User License - Request received');
    console.log('🔍 User ID:', req.user.id);
    
    const userId = req.user.id;

    // Find the current user
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has an activated license
    if (!user.activatedLicenseKey) {
      console.log('❌ User has no activated license');
      return res.status(400).json({
        success: false,
        message: 'No license to clear'
      });
    }

    console.log('✅ User has license, clearing it');

    // Clear the user's license
    const updateResult = await User.findByIdAndUpdate(
      userId,
      { 
        $unset: { 
          activatedLicenseKey: 1,
          licenseActivatedAt: 1,
          licenseExpiresAt: 1
        }
      },
      { new: true }
    );

    console.log('✅ License cleared from user:', updateResult);

    res.json({
      success: true,
      message: 'License cleared successfully'
    });

  } catch (error) {
    console.error('❌ Error clearing user license:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear license',
      error: error.message
    });
  }
};

// Delete license key (superadmin only)
export const deleteLicenseKey = async (req, res) => {
  try {
    console.log('🔍 Delete License Key - Request received');
    console.log('🔍 Method:', req.method);
    console.log('🔍 URL:', req.url);
    console.log('🔍 Params:', req.params);
    console.log('🔍 User:', req.user);
    
    const { key } = req.params;
    const userId = req.user.id;

    console.log('🔍 License Key to delete:', key);
    console.log('🔍 User ID:', userId);

    // Check if user is superadmin
    const user = await User.findById(userId);
    if (!user || user.role !== 'superadmin') {
      console.log('❌ User is not superadmin:', user?.role);
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can delete license keys'
      });
    }

    console.log('✅ User is superadmin, proceeding with deletion');

    const licenseKey = await LicenseKey.findOne({ key: key.toUpperCase() });
    if (!licenseKey) {
      console.log('❌ License key not found:', key);
      return res.status(404).json({
        success: false,
        message: 'License key not found'
      });
    }

    console.log('✅ License key found, removing from users and deleting');

    // Remove license key from all users who have it activated
    const userUpdateResult = await User.updateMany(
      { activatedLicenseKey: licenseKey._id },
      { 
        $unset: { 
          activatedLicenseKey: 1,
          licenseActivatedAt: 1,
          licenseExpiresAt: 1
        }
      }
    );

    console.log('✅ Updated users:', userUpdateResult);

    // Delete the license key document
    const deleteResult = await LicenseKey.findByIdAndDelete(licenseKey._id);

    console.log('✅ License key deleted:', deleteResult);

    res.json({
      success: true,
      message: 'License key deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting license key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete license key',
      error: error.message
    });
  }
}; 