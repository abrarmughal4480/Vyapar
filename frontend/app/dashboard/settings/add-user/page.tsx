"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Shield } from 'lucide-react';
import { sendUserInvite } from '@/http/api';
import { canAccessAddUser, getCurrentUserInfo } from '@/lib/roleAccessControl';

const ROLES = ["SALESMAN", "SECONDARY ADMIN", "CA", "PURCHASER", "Custom"];
const PAGES = [
  "Sale", "Payment In", "Sale Order", "Credit Note", "Estimate", "Expense",
  "Purchase Bill", "Payment Out", "Purchase Order", "Debit Note", "Purchase Estimate", "Purchase Expense"
];
const PERMISSIONS = ["view", "add", "edit", "delete", "share", "preview", "reopen", "convert"];

// Role defaults copied from settings/page.tsx
const ROLE_DEFAULTS: Record<string, any[]> = {
  "SALESMAN": [
    { page: "Sale", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: true, reopen: false, convert: true } },
    { page: "Payment In", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false, convert: false } },
    { page: "Sale Order", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: true, reopen: false, convert: true } },
    { page: "Credit Note", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false, convert: true } },
    { page: "Estimate", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false, convert: true } },
    { page: "Expense", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false, convert: false } },
    { page: "Purchase Bill", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Payment Out", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Purchase Order", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Debit Note", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Purchase Estimate", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Purchase Expense", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
  ],
  "SECONDARY ADMIN": PAGES.map(page => ({ page, permissions: Object.fromEntries(PERMISSIONS.map(p => [p, true])) })),
  "CA": PAGES.map(page => ({ page, permissions: Object.fromEntries(PERMISSIONS.map(p => [p, p === 'view'])) })),
  "PURCHASER": [
    { page: "Sale", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Payment In", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Sale Order", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Credit Note", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Estimate", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Expense", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Purchase Bill", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: true, reopen: false } },
    { page: "Payment Out", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    { page: "Purchase Order", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    { page: "Debit Note", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    { page: "Purchase Estimate", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    { page: "Purchase Expense", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
  ],
};

export default function AddUserPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [permissions, setPermissions] = useState(
    PAGES.map(page => ({
      page,
      permissions: Object.fromEntries(PERMISSIONS.map(p => [p, false]))
    }))
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [hasAccess, setHasAccess] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  const handlePermissionChange = (pageIdx: number, perm: string) => {
    setPermissions(prev => prev.map((p, idx) =>
      idx === pageIdx ? { ...p, permissions: { ...p.permissions, [perm]: !p.permissions[perm] } } : p
    ));
  };

  // Auto-fill permissions on role change
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setRole(selected);
    if (selected === 'Custom') {
      setPermissions(PAGES.map(page => ({
        page,
        permissions: Object.fromEntries(PERMISSIONS.map(p => [p, false]))
      })));
    } else if (ROLE_DEFAULTS[selected]) {
      // Map to match the order of PAGES
      const perms = PAGES.map(page => {
        const found = ROLE_DEFAULTS[selected].find((p: any) => p.page === page);
        return found
          ? { page, permissions: { ...found.permissions } }
          : { page, permissions: Object.fromEntries(PERMISSIONS.map(p => [p, false])) };
      });
      setPermissions(perms);
    } else {
      setPermissions(PAGES.map(page => ({
        page,
        permissions: Object.fromEntries(PERMISSIONS.map(p => [p, false]))
      })));
    }
  };

  // Check access on component mount
  useEffect(() => {
    const checkAccess = () => {
      const currentUserInfo = getCurrentUserInfo();
      setUserInfo(currentUserInfo);
      
      if (!canAccessAddUser()) {
        setHasAccess(false);
        console.log(`❌ Access DENIED: ${currentUserInfo?.email} (${currentUserInfo?.role}) cannot access add-user page`);
      } else {
        console.log(`✅ Access GRANTED: ${currentUserInfo?.email} (${currentUserInfo?.role}) can access add-user page`);
      }
    };
    
    checkAccess();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError("");
    
    // Double check access before submitting
    if (!canAccessAddUser()) {
      setError("Access denied. You don't have permission to add users.");
      return;
    }
    
    if (!name || !email || !role) {
      setError("Name, Email, aur Role zaroori hain");
      return;
    }
    setLoading(true);
    try {
      // Get companyName from localStorage or fallback
      let companyName = '';
      if (typeof window !== 'undefined') {
        companyName = localStorage.getItem('businessName') || localStorage.getItem('companyName') || 'Devease Digital';
      }
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
      const apiRes = await sendUserInvite({ email, role, companyName: companyName || 'Your Company' }, token);
      if (apiRes.success) {
        setSuccess(true);
        setName("");
        setEmail("");
        setRole("");
        setPermissions(PAGES.map(page => ({
          page,
          permissions: Object.fromEntries(PERMISSIONS.map(p => [p, false]))
        })));
      } else {
        setError(apiRes.message || "Save nahi hua. Dobara koshish karo.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Save nahi hua. Dobara koshish karo.");
    } finally {
      setLoading(false);
    }
  };

  // Show access denied message if user doesn't have permission
  if (!hasAccess) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-blue-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-blue-600" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-sm text-gray-500 mt-1">You don't have permission to access this page</p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Access Restricted</h2>
          <p className="text-red-600 mb-4">
            Your role <strong>{userInfo?.role}</strong> does not have permission to add new users.
          </p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">
              <strong>Current User:</strong> {userInfo?.email}<br/>
              <strong>Role:</strong> {userInfo?.role}<br/>
              <strong>Context:</strong> {userInfo?.context}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-blue-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-blue-600" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Add New User</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new user and set their permissions</p>
        </div>
        {/* Show current user info */}
        <div className="ml-auto flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-lg border border-green-200">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">{userInfo?.role}</span>
        </div>
      </div>
      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 border border-indigo-100 w-full max-w-none">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-lg">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg"
              placeholder="Enter name"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-lg">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg"
              placeholder="Enter email"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-lg">Role</label>
            <select
              value={role}
              onChange={handleRoleChange}
              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg"
              required
            >
              <option value="">Select Role</option>
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Permissions Table */}
        <div className="bg-white/90 p-6 rounded-3xl shadow-2xl w-full border border-indigo-100 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-indigo-700 text-center border-b pb-4">Set Permissions</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Page</th>
                  {PERMISSIONS.map(perm => (
                    <th key={perm} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 capitalize">{perm}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {permissions.map((p, idx) => (
                  <tr key={p.page}>
                    <td className="px-4 py-3 text-left text-gray-900 font-medium">{p.page}</td>
                    {PERMISSIONS.map(perm => (
                      <td key={perm} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={p.permissions[perm]}
                          onChange={() => handlePermissionChange(idx, perm)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-md"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save User"}
        </button>
        {success && <div className="text-green-600 text-center font-semibold mt-4">User and permissions have been saved!</div>}
        {error && <div className="text-red-600 text-center font-semibold mt-4">{error}</div>}
      </form>
    </div>
  );
} 