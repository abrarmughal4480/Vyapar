import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { 
  generateLicenseKey, 
  getAllLicenseKeys, 
  activateLicenseKey, 
  checkLicenseStatus, 
  deleteLicenseKey,
  clearUserLicense
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

// Test route to verify routing
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'License keys route is working' });
});

// Delete license key (superadmin only) - using POST method as fallback
router.delete('/delete/:key', authMiddleware, deleteLicenseKey);
router.post('/delete/:key', authMiddleware, deleteLicenseKey); // Fallback for DELETE issues

// Alternative delete route using PUT method
router.put('/remove/:key', authMiddleware, deleteLicenseKey);

// Clear current user's license
router.post('/clear', authMiddleware, clearUserLicense);

export default router; 