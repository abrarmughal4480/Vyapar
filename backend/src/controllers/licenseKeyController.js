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

    // Step 1: Find user by email
    let user = await User.findOne({ email: userEmail });
    if (user) {
      // User found
    }
    
    // For license checking, we should check if the CURRENT user has a license
    // Not the original user, because the current user is the one who needs to buy a license
    let userForLicenseCheck = user;
    
    // Only check original user if current user doesn't exist
    if (!user && originalUserId) {
      const originalUser = await User.findById(originalUserId);
      if (originalUser) {
        userForLicenseCheck = originalUser;
      }
    }
    
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
      return res.json({
        success: true,
        data: {
          hasValidLicense: false,
          message: 'No license key activated'
        }
      });
    }

    // Step 2: Find the license key in LicenseKey collection
    const licenseKey = await LicenseKey.findById(userForLicenseCheck.activatedLicenseKey);
    
    if (!licenseKey) {
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

    if (!userDeviceUsage) {
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
    

    if (!isActive || isExpired) {
      return res.json({
        success: true,
        data: {
          hasValidLicense: false,
          message: isExpired ? 'License has expired' : 'License is inactive'
        }
      });
    }

    // License is valid
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
    
    const userId = req.user.id;

    // Find the current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has an activated license
    if (!user.activatedLicenseKey) {
      return res.status(400).json({
        success: false,
        message: 'No license to clear'
      });
    }


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

// Update license key (superadmin only)
export const updateLicenseKey = async (req, res) => {
  try {
    const { key } = req.params;
    const { duration, maxDevices } = req.body;
    const userId = req.user.id;

    // Check if user is superadmin
    const user = await User.findById(userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can update license keys'
      });
    }

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

    // Find the license key
    const licenseKey = await LicenseKey.findOne({ key: key.toUpperCase() });
    if (!licenseKey) {
      return res.status(404).json({
        success: false,
        message: 'License key not found'
      });
    }

    // Check if new maxDevices is less than current usage
    if (maxDevices < licenseKey.currentUsage) {
      return res.status(400).json({
        success: false,
        message: `Cannot set max devices to ${maxDevices}. Current usage is ${licenseKey.currentUsage}`
      });
    }

    // Calculate new expiration date based on current date + new duration
    const newExpiresAt = new Date();
    newExpiresAt.setFullYear(newExpiresAt.getFullYear() + duration);

    // Update the license key
    const updatedLicenseKey = await LicenseKey.findByIdAndUpdate(
      licenseKey._id,
      {
        duration,
        maxDevices,
        expiresAt: newExpiresAt,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('generatedBy', 'name email')
     .populate('usedDevices.userId', 'name email');

    res.json({
      success: true,
      message: 'License key updated successfully',
      data: {
        key: updatedLicenseKey.key,
        duration: updatedLicenseKey.duration,
        maxDevices: updatedLicenseKey.maxDevices,
        currentUsage: updatedLicenseKey.currentUsage,
        remainingDevices: updatedLicenseKey.remainingDevices,
        expiresAt: updatedLicenseKey.expiresAt,
        updatedAt: updatedLicenseKey.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error updating license key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update license key',
      error: error.message
    });
  }
};

// Delete license key (superadmin only)
export const deleteLicenseKey = async (req, res) => {
  try {
    
    const { key } = req.params;
    const userId = req.user.id;


    // Check if user is superadmin
    const user = await User.findById(userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can delete license keys'
      });
    }


    const licenseKey = await LicenseKey.findOne({ key: key.toUpperCase() });
    if (!licenseKey) {
      return res.status(404).json({
        success: false,
        message: 'License key not found'
      });
    }


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


    // Delete the license key document
    const deleteResult = await LicenseKey.findByIdAndDelete(licenseKey._id);


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