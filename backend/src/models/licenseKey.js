import mongoose from 'mongoose';

const licenseKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  maxDevices: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },
  usedDevices: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userEmail: String,
    userName: String,
    activatedAt: {
      type: Date,
      default: Date.now
    },
    deviceInfo: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries (key index is automatically created by unique: true)
licenseKeySchema.index({ isActive: 1 });
licenseKeySchema.index({ expiresAt: 1 });

// Virtual for current usage count
licenseKeySchema.virtual('currentUsage').get(function() {
  return this.usedDevices.length;
});

// Virtual for remaining devices
licenseKeySchema.virtual('remainingDevices').get(function() {
  return this.maxDevices - this.usedDevices.length;
});

// Virtual for isExpired
licenseKeySchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Method to check if key can be used
licenseKeySchema.methods.canBeUsed = function() {
  return this.isActive && !this.isExpired && this.remainingDevices > 0;
};

// Method to add device usage
licenseKeySchema.methods.addDeviceUsage = function(userId, userEmail, userName, deviceInfo) {
  if (!this.canBeUsed()) {
    throw new Error('License key cannot be used');
  }
  
  // Check if user already using this key
  const existingUsage = this.usedDevices.find(device => device.userId.toString() === userId.toString());
  if (existingUsage) {
    throw new Error('User already using this license key');
  }
  
  this.usedDevices.push({
    userId,
    userEmail,
    userName,
    deviceInfo
  });
  
  return this.save();
};

export default mongoose.model('LicenseKey', licenseKeySchema); 