// Role-based access control for frontend
// This file handles all permission checks before making API calls

// Define role types
type UserRole = 'SECONDARY ADMIN' | 'SALESMAN' | 'CA' | 'PURCHASER' | 'Default Admin';

// Define user info interface
interface UserInfo {
  email: string;
  role: UserRole;
  context: string;
  companyId: string | null;
  originalUserId?: string;
}

// Define page permissions for each role
const PAGE_PERMISSIONS: Record<UserRole, {
  pages: string[];
  operations: string[];
  restrictedPages: string[];
  restrictedOperations: string[];
}> = {
  'SECONDARY ADMIN': {
    pages: ['dashboard', 'parties', 'items', 'sales', 'purchases', 'reports', 'settings'],
    operations: ['view', 'add', 'edit', 'delete', 'share', 'preview', 'reopen'],
    restrictedPages: ['add-user'], // SECONDARY ADMIN cannot access add-user page
    restrictedOperations: ['add-user', 'delete-user', 'edit-user-permissions']
  },
  'SALESMAN': {
    pages: ['dashboard', 'parties', 'items', 'sales', 'payment-in', 'sale-order', 'credit-note', 'estimate', 'expense'],
    operations: ['view', 'add', 'share', 'preview', 'convert'],
    restrictedPages: ['add-user', 'purchases', 'payment-out', 'purchase-order', 'debit-note', 'purchase-estimate', 'purchase-expense'],
    restrictedOperations: ['add-user', 'delete-user', 'edit-user-permissions', 'delete', 'edit']
  },
  'CA': {
    pages: ['dashboard', 'parties', 'items', 'sales', 'purchases', 'reports', 'settings', 'cash-bank', 'barcode', 'backup-restore'],
    operations: ['view'],
    restrictedPages: ['add-user'],
    restrictedOperations: ['add-user', 'delete-user', 'edit-user-permissions', 'add', 'edit', 'delete', 'share', 'preview', 'reopen', 'convert']
  },
  'PURCHASER': {
    pages: ['dashboard', 'purchases', 'payment-out', 'purchase-order', 'debit-note', 'purchase-estimate', 'purchase-expense'],
    operations: ['view', 'add', 'share', 'preview'],
    restrictedPages: ['add-user', 'sales', 'payment-in', 'sale-order', 'credit-note', 'estimate', 'expense'],
    restrictedOperations: ['add-user', 'delete-user', 'edit-user-permissions', 'delete', 'edit']
  },
  'Default Admin': {
    pages: ['all'],
    operations: ['all'],
    restrictedPages: [],
    restrictedOperations: []
  }
};

// Get current user info from token
export const getCurrentUserInfo = (): UserInfo | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    
    return {
      email: tokenPayload.email || tokenPayload.userEmail,
      role: (tokenPayload.context === 'company' ? tokenPayload.role : 'Default Admin') as UserRole,
      context: tokenPayload.context,
      companyId: tokenPayload.context === 'company' ? tokenPayload.id : null,
      originalUserId: tokenPayload.originalUserId
    };
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

// Get original user email for license checking
export const getOriginalUserEmail = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    
    // If user is in company context and has originalUserId, we need to get the original email
    if (tokenPayload.context === 'company' && tokenPayload.originalUserId) {
      // For now, return the current email, but in a real scenario, you might need to make an API call
      // to get the original user's email based on originalUserId
      return tokenPayload.email || tokenPayload.userEmail;
    }
    
    return tokenPayload.email || tokenPayload.userEmail;
  } catch (error) {
    console.error('Error parsing token for original email:', error);
    return null;
  }
};

// Check if user has access to a specific page
export const canAccessPage = (pageName: string): boolean => {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return false;

  // If user is not in company context, they have full access
  if (userInfo.context !== 'company') return true;

  const role = userInfo.role;
  const rolePermissions = PAGE_PERMISSIONS[role];

  if (!rolePermissions) {
    console.log(`No permissions defined for role: ${role}`);
    return false;
  }

  // Check if page is restricted for this role
  if (rolePermissions.restrictedPages.includes(pageName)) {
    console.log(`❌ Access DENIED: ${userInfo.email} (${role}) cannot access ${pageName}`);
    return false;
  }

  // Check if page is allowed for this role
  const hasAccess = rolePermissions.pages.includes(pageName);
  console.log(`🔒 Page Access Check: ${userInfo.email} (${role}) ${hasAccess ? '✅ GRANTED' : '❌ DENIED'} to ${pageName}`);
  
  return hasAccess;
};

// Check if user can perform a specific operation
export const canPerformOperation = (operation: string): boolean => {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return false;

  // If user is not in company context, they have full access
  if (userInfo.context !== 'company') return true;

  const role = userInfo.role;
  const rolePermissions = PAGE_PERMISSIONS[role];

  if (!rolePermissions) return false;

  // Check if operation is restricted for this role
  if (rolePermissions.restrictedOperations.includes(operation)) {
    console.log(`❌ Operation DENIED: ${userInfo.email} (${role}) cannot perform ${operation}`);
    return false;
  }

  // Check if operation is allowed for this role
  const hasPermission = rolePermissions.operations.includes(operation);
  console.log(`🔒 Operation Check: ${userInfo.email} (${role}) ${hasPermission ? '✅ GRANTED' : '❌ DENIED'} for ${operation}`);
  
  return hasPermission;
};

// Check if user can access specific data/API endpoint
export const canAccessAPI = (endpoint: string, method: string = 'GET'): boolean => {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return false;

  // If user is not in company context, they have full access
  if (userInfo.context !== 'company') return true;

  const role = userInfo.role;
  
  // Map API endpoints to operations
  const endpointToOperation: { [key: string]: string } = {
    '/api/user-invite': 'add-user',
    '/api/parties': method === 'GET' ? 'view' : method === 'POST' ? 'add' : method === 'PUT' ? 'edit' : 'delete',
    '/api/items': method === 'GET' ? 'view' : method === 'POST' ? 'add' : method === 'PUT' ? 'edit' : 'delete',
    '/api/sales': method === 'GET' ? 'view' : method === 'POST' ? 'add' : method === 'PUT' ? 'edit' : 'delete',
    '/api/purchases': method === 'GET' ? 'view' : method === 'POST' ? 'add' : method === 'PUT' ? 'edit' : 'delete',
    '/api/reports': 'view',
    '/dashboard/stats': 'view'
  };

  const operation = endpointToOperation[endpoint];
  if (!operation) return true; // If endpoint not mapped, allow access

  return canPerformOperation(operation);
};

// Get user's current role and permissions
export const getUserPermissions = () => {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return null;

  if (userInfo.context !== 'company') {
    return {
      role: 'Default Admin',
      pages: ['all'],
      operations: ['all'],
      restrictedPages: [],
      restrictedOperations: []
    };
  }

  return {
    role: userInfo.role,
    ...PAGE_PERMISSIONS[userInfo.role]
  };
};

// Check if user can access settings/add-user page
export const canAccessAddUser = (): boolean => {
  return canAccessPage('add-user');
};

// Check if user can access settings page
export const canAccessSettings = (): boolean => {
  return canAccessPage('settings');
};

// Check if user can view invited users (only admin can view)
export const canViewInvitedUsers = (): boolean => {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return false;

  // If user is not in company context (Default Admin), they can view
  if (userInfo.context !== 'company') return true;

  // Only admin roles can view invited users
  const adminRoles = ['ADMIN', 'OWNER', 'PRIMARY ADMIN'];
  return adminRoles.includes(userInfo.role);
};

// Check if user can view reports
export const canViewReports = (): boolean => {
  return canAccessPage('reports');
};

// Check if user can edit data
export const canEditData = (): boolean => {
  return canPerformOperation('edit');
};

// Check if user can delete data
export const canDeleteData = (): boolean => {
  return canPerformOperation('delete');
};

// Check if user can add new data
export const canAddData = (): boolean => {
  return canPerformOperation('add');
};

// Check if user can edit sales data (SALESMAN can create but not edit)
export const canEditSalesData = (): boolean => {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return false;

  // If user is not in company context, they have full access
  if (userInfo.context !== 'company') return true;

  const role = userInfo.role;
  
  // SALESMAN can create but not edit sales
  if (role === 'SALESMAN') {
    console.log(`❌ Sales Edit DENIED: ${userInfo.email} (${role}) cannot edit sales data`);
    return false;
  }

  return canPerformOperation('edit');
};

// Check if user can delete sales data (SALESMAN cannot delete)
export const canDeleteSalesData = (): boolean => {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return false;

  // If user is not in company context, they have full access
  if (userInfo.context !== 'company') return true;

  const role = userInfo.role;
  
  // SALESMAN cannot delete sales
  if (role === 'SALESMAN') {
    console.log(`❌ Sales Delete DENIED: ${userInfo.email} (${role}) cannot delete sales data`);
    return false;
  }

  return canPerformOperation('delete');
};

// Check if user can share sales data (SALESMAN can share)
export const canShareSalesData = (): boolean => {
  return canPerformOperation('share');
};

// Get restricted pages for current user
export const getRestrictedPages = (): string[] => {
  const userInfo = getCurrentUserInfo();
  if (!userInfo || userInfo.context !== 'company') return [];

  const rolePermissions = PAGE_PERMISSIONS[userInfo.role];
  return rolePermissions ? rolePermissions.restrictedPages : [];
};

// Get allowed pages for current user
export const getAllowedPages = (): string[] => {
  const userInfo = getCurrentUserInfo();
  if (!userInfo || userInfo.context !== 'company') return ['all'];

  const rolePermissions = PAGE_PERMISSIONS[userInfo.role];
  return rolePermissions ? rolePermissions.pages : [];
}; 