import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { 
  generateLicenseKey, 
  getAllLicenseKeys, 
  activateLicenseKey, 
  checkLicenseStatus, 
  deactivateLicenseKey 
} from '../controllers/licenseKeyController.js';

const router = express.Router();

// Generate license key (superadmin only)
router.post('/generate', authMiddleware, generateLicenseKey);

// Get all license keys (superadmin only)
router.get('/all', authMiddleware, getAllLicenseKeys);

// Activate license key
router.post('/activate', authMiddleware, activateLicenseKey);

// Check license status
router.get('/status', authMiddleware, checkLicenseStatus);

// Deactivate license key (superadmin only)
router.put('/deactivate/:key', authMiddleware, deactivateLicenseKey);

export default router; 