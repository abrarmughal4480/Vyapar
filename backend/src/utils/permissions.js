import UserInvite from '../models/userInvite.js';

// Define page permissions for each role
const PAGE_PERMISSIONS = {
  'SECONDARY ADMIN': {
    pages: ['dashboard', 'parties', 'items', 'sales', 'purchases', 'reports', 'settings'],
    operations: ['view', 'add', 'edit', 'delete', 'share', 'preview', 'reopen'],
    restrictedPages: ['add-user'] // SECONDARY ADMIN cannot access add-user page
  },
  'SALESMAN': {
    pages: ['dashboard', 'parties', 'items', 'sales', 'payment-in', 'sale-order', 'credit-note', 'estimate', 'expense'],
    operations: ['view', 'add', 'share', 'preview'],
    restrictedPages: ['add-user', 'purchases', 'payment-out', 'purchase-order', 'debit-note']
  },
  'CA': {
    pages: ['dashboard', 'reports', 'profit-and-loss', 'party-statement'],
    operations: ['view'],
    restrictedPages: ['add-user', 'sales', 'purchases', 'parties', 'items']
  },
  'PURCHASER': {
    pages: ['dashboard', 'purchases', 'payment-out', 'purchase-order', 'debit-note', 'purchase-estimate', 'purchase-expense'],
    operations: ['view', 'add', 'share', 'preview'],
    restrictedPages: ['add-user', 'sales', 'payment-in', 'sale-order', 'credit-note']
  }
};

/**
 * Check if user has access to a specific page
 * @param {string} userEmail - User's email
 * @param {string} companyId - Company ID
 * @param {string} requestedPage - Page being accessed
 * @returns {Promise<boolean>} - Whether access is allowed
 */
export const checkPageAccess = async (userEmail, companyId, requestedPage) => {
  try {
    // Find user's role in this company
    const userInvite = await UserInvite.findOne({
      requestedTo: userEmail,
      requestedBy: companyId,
      status: 'Accepted'
    });

    if (!userInvite) {
      console.log('No accepted invite found for user:', userEmail, 'in company:', companyId);
      return false;
    }

    const role = userInvite.role;
    console.log(`Checking access for ${userEmail} with role ${role} to page ${requestedPage}`);

    // Get role permissions
    const rolePermissions = PAGE_PERMISSIONS[role];
    if (!rolePermissions) {
      console.log(`No permissions defined for role: ${role}`);
      return false;
    }

    // Check if page is restricted for this role
    if (rolePermissions.restrictedPages.includes(requestedPage)) {
      console.log(`Page ${requestedPage} is restricted for role ${role}`);
      return false;
    }

    // Check if page is allowed for this role
    const hasAccess = rolePermissions.pages.includes(requestedPage);
    console.log(`Access ${hasAccess ? 'GRANTED' : 'DENIED'} for ${userEmail} (${role}) to ${requestedPage}`);
    
    return hasAccess;
  } catch (error) {
    console.error('Error checking page access:', error);
    return false;
  }
};

/**
 * Check if user has permission for specific operation
 * @param {string} userEmail - User's email
 * @param {string} companyId - Company ID
 * @param {string} operation - Operation being performed
 * @returns {Promise<boolean>} - Whether operation is allowed
 */
export const checkOperationPermission = async (userEmail, companyId, operation) => {
  try {
    const userInvite = await UserInvite.findOne({
      requestedTo: userEmail,
      requestedBy: companyId,
      status: 'Accepted'
    });

    if (!userInvite) return false;

    const role = userInvite.role;
    const rolePermissions = PAGE_PERMISSIONS[role];
    
    if (!rolePermissions) return false;

    return rolePermissions.operations.includes(operation);
  } catch (error) {
    console.error('Error checking operation permission:', error);
    return false;
  }
};

/**
 * Get user's role in a company
 * @param {string} userEmail - User's email
 * @param {string} companyId - Company ID
 * @returns {Promise<string|null>} - User's role or null
 */
export const getUserRole = async (userEmail, companyId) => {
  try {
    const userInvite = await UserInvite.findOne({
      requestedTo: userEmail,
      requestedBy: companyId,
      status: 'Accepted'
    });

    return userInvite ? userInvite.role : null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

/**
 * Get all permissions for a user in a company
 * @param {string} userEmail - User's email
 * @param {string} companyId - Company ID
 * @returns {Promise<object|null>} - User's permissions or null
 */
export const getUserPermissions = async (userEmail, companyId) => {
  try {
    const userInvite = await UserInvite.findOne({
      requestedTo: userEmail,
      requestedBy: companyId,
      status: 'Accepted'
    });

    if (!userInvite) return null;

    const role = userInvite.role;
    return PAGE_PERMISSIONS[role] || null;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}; 