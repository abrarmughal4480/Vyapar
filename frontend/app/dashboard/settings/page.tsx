"use client";

import React, { useState } from "react";
import { Edit, Trash2, Plus, Mail, User, Crown, AlertTriangle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUserInvites, deleteUserInvite } from '@/http/api';
import { canAccessAddUser, getCurrentUserInfo, canViewInvitedUsers } from '@/lib/roleAccessControl';
import { performLogout } from '@/lib/logout';

// Pages aur unke permissions ka structure
// Naye permissions add kiye: share, preview, reopen

type PagePermission = {
  page: string;
  permissions: {
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
    share: boolean;
    preview: boolean;
    reopen: boolean;
  };
};

const PAGES = [
  "Sale",
  "Payment In",
  "Sale Order",
  "Credit Note",
  "Estimate",
  "Expense",
  // Naye purchase related pages
  "Purchase Bill",
  "Payment Out",
  "Purchase Order",
  "Debit Note",
  "Purchase Estimate",
  "Purchase Expense",
];

// Default permissions set kiye hain jese user ne kaha
const defaultPermissions: PagePermission[] = [
  {
    page: "Sale",
    permissions: {
      view: true,
      add: true,
      edit: false,
      delete: false,
      share: true,
      preview: true,
      reopen: false,
    },
  },
  {
    page: "Payment In",
    permissions: {
      view: true,
      add: true,
      edit: false,
      delete: false,
      share: true,
      preview: false,
      reopen: false,
    },
  },
  {
    page: "Sale Order",
    permissions: {
      view: true,
      add: true,
      edit: false,
      delete: false,
      share: true,
      preview: false,
      reopen: false,
    },
  },
  {
    page: "Credit Note",
    permissions: {
      view: true,
      add: true,
      edit: false,
      delete: false,
      share: true,
      preview: false,
      reopen: false,
    },
  },
  {
    page: "Estimate",
    permissions: {
      view: true,
      add: true,
      edit: false,
      delete: false,
      share: true,
      preview: false,
      reopen: false,
    },
  },
  {
    page: "Expense",
    permissions: {
      view: true,
      add: true,
      edit: false,
      delete: false,
      share: true,
      preview: false,
      reopen: false,
    },
  },
];

// No dummy users, will fetch real invites

export default function SettingsPage() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [currentRole, setCurrentRole] = useState<string>('Admin');
  const [currentEmail, setCurrentEmail] = useState<string>('');
  const router = useRouter();
  // Get current user role and email
  React.useEffect(() => {
    const userInfo = getCurrentUserInfo();
    if (userInfo) {
      setCurrentEmail(userInfo.email);
      setCurrentRole(userInfo.role);
      
      console.log('Current user info:', {
        email: userInfo.email,
        role: userInfo.role,
        context: userInfo.context
      });
    }
  }, []);

  React.useEffect(() => {
    const fetchInvites = async () => {
      setLoadingInvites(true);
      try {
        const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
        const res = await getUserInvites(token);
        console.log('Fetched invites:', res.data);
        setInvites(res.data || []);
    } catch {
        setInvites([]);
      }
      setLoadingInvites(false);
    };
    fetchInvites();
  }, []);

  // Filtered invites for search
  const filteredInvites = invites.filter(invite =>
    (invite.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
    (invite.role || '').toLowerCase().includes(searchUser.toLowerCase())
  );

  // Handle edit user
  const handleEditUser = (invite: any) => {
    console.log('Edit user:', invite);
    // Redirect to add-user page with edit parameters
    const params = new URLSearchParams({
      edit: 'true',
      id: invite._id,
      email: invite.email,
      role: invite.role
    });
    router.push(`/dashboard/settings/add-user?${params.toString()}`);
  };

  // Handle delete user
  const handleDeleteUser = async (invite: any) => {
    if (confirm(`Are you sure you want to delete the invite for ${invite.email}?`)) {
      try {
        console.log('Attempting to delete invite:', invite);
        
        // Validate invite data
        if (!invite._id) {
          alert('Invalid invite: Missing invite ID');
          return;
        }
        
        if (!invite.email) {
          alert('Invalid invite: Missing email');
          return;
        }
        
        const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
        const response = await deleteUserInvite(invite._id, token);
        
        if (response.success) {
          // Remove the deleted invite from the local state
          setInvites(prevInvites => prevInvites.filter(inv => inv._id !== invite._id));
          alert('Invite deleted successfully');
        } else {
          alert('Failed to delete invite: ' + response.message);
        }
      } catch (error: any) {
        console.error('Error deleting invite:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        
        if (error.response?.status === 400) {
          alert('Cannot delete invite: ' + (error.response?.data?.message || 'Bad request'));
        } else if (error.response?.status === 403) {
          alert('Access denied: You are not authorized to delete this invite');
        } else if (error.response?.status === 404) {
          alert('Invite not found');
        } else {
          alert('Error deleting invite. Please try again.');
        }
      }
    }
  };

  // UI update: Dropdown for roles, fields always show, permissions update on role select
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header - sticky, card-like, shadow, rounded */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your users, roles, and permissions</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            {/* Current User Role Display */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-200">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">{currentEmail}</span>
              <span className="text-xs text-blue-600">•</span>
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 font-semibold">{currentRole}</span>
            </div>
            <button
              onClick={() => router.push('/dashboard/settings/join-company')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
            >
              Join Company
            </button>
            {canAccessAddUser() ? (
              <button
                onClick={() => router.push('/dashboard/settings/add-user')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
              >
                <Plus className="w-5 h-5" /> Add New User
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Add User Restricted</span>
              </div>
            )}
            <button
              onClick={performLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
            >
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      </div>
      {/* Search Bar */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-100 z-[1] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:w-80">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">🔍</span>
          <input
            type="text"
            placeholder="Search users..."
            value={searchUser}
            onChange={e => setSearchUser(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
          />
        </div>
      </div>
      {/* Invited Users Table - Only show for admin roles */}
      {canViewInvitedUsers() ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Invited Users</h2>
          </div>
          <div className="overflow-x-auto">
            {loadingInvites ? (
              <div className="py-12 text-center text-gray-500 text-lg">Loading...</div>
            ) : (
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">#</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvites.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-lg font-medium">
                        {searchUser ? `No invites found matching "${searchUser}".` : "No invites found."}
                      </td>
                    </tr>
                  ) : (
                    filteredInvites.map((invite, idx) => (
                      <tr key={invite._id} className="hover:bg-blue-50">
                        <td className="px-6 py-4 text-center text-gray-700 font-semibold">{idx + 1}</td>
                        <td className="px-6 py-4 text-center text-gray-900 font-medium flex items-center gap-2 justify-center"><Mail className="w-4 h-4 text-blue-500" />{invite.email}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">{invite.role}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {invite.status === 'Pending' && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">Pending</span>}
                          {invite.status === 'Accepted' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">Accepted</span>}
                          {invite.status === 'Rejected' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">Rejected</span>}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-500 text-xs">{invite.date ? new Date(invite.date).toLocaleString() : ''}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditUser(invite)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow"
                              title="Edit User"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(invite)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center mb-8">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-yellow-700 mb-2">Access Restricted</h2>
          <p className="text-yellow-600 mb-4">
            Only administrators can view invited users list.
          </p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">
              <strong>Current User:</strong> {currentEmail}<br/>
              <strong>Role:</strong> {currentRole}<br/>
              <strong>Permission:</strong> View Invited Users - ❌ DENIED
            </p>
          </div>
        </div>
      )}
      {/* Add User Form removed, now handled in /dashboard/settings/add-user */}
    </div>
  );
}