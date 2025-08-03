import { checkPageAccess, getUserRole } from '../utils/permissions.js';

/**
 * Middleware to check page access permissions
 * @param {string} pageName - Name of the page being accessed
 * @returns {Function} - Express middleware function
 */
export const requirePageAccess = (pageName) => {
  return async (req, res, next) => {
    try {
      // Only check permissions if user is in company context
      if (req.user.context !== 'company') {
        console.log('User not in company context, skipping permission check');
        return next();
      }

      const userEmail = req.user.userEmail || req.user.email;
      const companyId = req.user.id;

      if (!userEmail || !companyId) {
        console.log('Missing user email or company ID for permission check');
        return res.status(403).json({ 
          message: 'Access denied: Missing user information' 
        });
      }

      console.log(`🔒 Checking access for ${userEmail} to page: ${pageName}`);

      // Check if user has access to this page
      const hasAccess = await checkPageAccess(userEmail, companyId, pageName);
      
      if (!hasAccess) {
        const userRole = await getUserRole(userEmail, companyId);
        console.log(`❌ Access DENIED for ${userEmail} (${userRole}) to ${pageName}`);
        
        return res.status(403).json({ 
          message: `Access denied. Your role (${userRole || 'Unknown'}) cannot access this page.`,
          error: 'INSUFFICIENT_PERMISSIONS',
          page: pageName,
          role: userRole
        });
      }

      console.log(`✅ Access GRANTED for ${userEmail} to ${pageName}`);
      next();
    } catch (error) {
      console.error('Error in access control middleware:', error);
      return res.status(500).json({ 
        message: 'Internal server error during permission check' 
      });
    }
  };
};

/**
 * Middleware to check operation permissions
 * @param {string} operation - Operation being performed
 * @returns {Function} - Express middleware function
 */
export const requireOperationPermission = (operation) => {
  return async (req, res, next) => {
    try {
      // Only check permissions if user is in company context
      if (req.user.context !== 'company') {
        return next();
      }

      const userEmail = req.user.userEmail || req.user.email;
      const companyId = req.user.id;

      if (!userEmail || !companyId) {
        return res.status(403).json({ 
          message: 'Access denied: Missing user information' 
        });
      }

      // Import here to avoid circular dependency
      const { checkOperationPermission } = await import('../utils/permissions.js');
      
      const hasPermission = await checkOperationPermission(userEmail, companyId, operation);
      
      if (!hasPermission) {
        const userRole = await getUserRole(userEmail, companyId);
        return res.status(403).json({ 
          message: `Operation denied. Your role (${userRole || 'Unknown'}) cannot perform this operation.`,
          error: 'INSUFFICIENT_PERMISSIONS',
          operation: operation,
          role: userRole
        });
      }

      next();
    } catch (error) {
      console.error('Error in operation permission middleware:', error);
      return res.status(500).json({ 
        message: 'Internal server error during permission check' 
      });
    }
  };
};

/**
 * Middleware to add user permissions to request object
 */
export const addUserPermissions = async (req, res, next) => {
  try {
    // Only add permissions if user is in company context
    if (req.user.context !== 'company') {
      return next();
    }

    const userEmail = req.user.userEmail || req.user.email;
    const companyId = req.user.id;

    if (!userEmail || !companyId) {
      return next();
    }

    // Import here to avoid circular dependency
    const { getUserPermissions, getUserRole } = await import('../utils/permissions.js');
    
    const permissions = await getUserPermissions(userEmail, companyId);
    const role = await getUserRole(userEmail, companyId);

    // Add permissions to request object
    req.userPermissions = permissions;
    req.userRole = role;

    console.log(`📋 Added permissions for ${userEmail} (${role}):`, permissions?.pages || []);

    next();
  } catch (error) {
    console.error('Error adding user permissions:', error);
    next(); // Continue even if permissions can't be loaded
  }
}; 