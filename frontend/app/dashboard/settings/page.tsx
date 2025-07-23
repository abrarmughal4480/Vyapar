"use client";

import React, { useState } from "react";

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

// Roles aur unke default permissions
const ROLES = [
  "SALESMAN",
  "SECONDARY ADMIN",
  "CA",
  "PURCHASER",
];

// Har role ke liye default permissions
const ROLE_DEFAULTS: Record<string, PagePermission[]> = {
  "SALESMAN": [
    // Sale: create, share, preview allowed; edit, delete, reopen not allowed
    { page: "Sale", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: true, reopen: false } },
    // Payment In: create, share allowed; edit, delete, reopen not allowed
    { page: "Payment In", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    // Sale Order: not allowed (all false)
    { page: "Sale Order", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Credit Note: not allowed (all false)
    { page: "Credit Note", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Estimate: create, share allowed; edit, delete, reopen not allowed
    { page: "Estimate", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    // Expense: create, share allowed; edit, delete, reopen not allowed
    { page: "Expense", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    // Purchase Bill
    { page: "Purchase Bill", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Payment Out
    { page: "Payment Out", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Purchase Order
    { page: "Purchase Order", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Debit Note
    { page: "Debit Note", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Purchase Estimate
    { page: "Purchase Estimate", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Purchase Expense
    { page: "Purchase Expense", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
  ],
  "SECONDARY ADMIN": [
    // All Sales/Purchase Entries: full access
    { page: "Sale", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Payment In", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Sale Order", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Credit Note", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Estimate", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Expense", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Purchase Bill", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Payment Out", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Purchase Order", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Debit Note", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Purchase Estimate", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    { page: "Purchase Expense", permissions: { view: true, add: true, edit: true, delete: true, share: true, preview: true, reopen: true } },
    // Reports: full visibility (view only)
    { page: "Reports", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Users/Roles: no access
    { page: "Users/Roles", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Settings: limited (view only, no edit/delete)
    { page: "Settings", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
  ],
  "CA": [
    // All transactions: view only
    { page: "Sale", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Payment In", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Sale Order", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Credit Note", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Estimate", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Expense", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Purchase Bill", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Payment Out", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Purchase Order", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Debit Note", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Purchase Estimate", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    { page: "Purchase Expense", permissions: { view: true, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Reports: view + share (export)
    { page: "Reports", permissions: { view: true, add: false, edit: false, delete: false, share: true, preview: false, reopen: false } },
    // Users/Roles: no access
    { page: "Users/Roles", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Settings: no access
    { page: "Settings", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
  ],
  "PURCHASER": [
    // Sale
    { page: "Sale", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Payment In
    { page: "Payment In", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Sale Order
    { page: "Sale Order", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Credit Note
    { page: "Credit Note", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Estimate
    { page: "Estimate", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Expense
    { page: "Expense", permissions: { view: false, add: false, edit: false, delete: false, share: false, preview: false, reopen: false } },
    // Purchase Bill
    { page: "Purchase Bill", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: true, reopen: false } },
    // Payment Out
    { page: "Payment Out", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    // Purchase Order
    { page: "Purchase Order", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    // Debit Note
    { page: "Debit Note", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    // Purchase Estimate
    { page: "Purchase Estimate", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
    // Purchase Expense
    { page: "Purchase Expense", permissions: { view: true, add: true, edit: false, delete: false, share: true, preview: false, reopen: false } },
  ],
};

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Role state
  const [selectedRole, setSelectedRole] = useState<string>("");
  // By default, sab unchecked (false) hon jab tak role select na ho
  const emptyPermissions: PagePermission[] = PAGES.map(page => ({
    page,
    permissions: {
      view: false,
      add: false,
      edit: false,
      delete: false,
      share: false,
      preview: false,
      reopen: false,
    },
  }));
  const [permissions, setPermissions] = useState<PagePermission[]>(emptyPermissions);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Role select karne par permissions set karo
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    if (ROLE_DEFAULTS[role]) {
      setPermissions(ROLE_DEFAULTS[role]);
    } else {
      setPermissions(emptyPermissions);
    }
  };

  // Permissions change karne ka handler
  const handlePermissionChange = (pageIdx: number, perm: keyof PagePermission["permissions"]) => {
    setPermissions(prev => prev.map((p, idx) =>
      idx === pageIdx ? { ...p, permissions: { ...p.permissions, [perm]: !p.permissions[perm] } } : p
    ));
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError("");
    if (!name || !email) {
      setError("Name aur Email dono zaroori hain");
      return;
    }
    setLoading(true);
    try {
      // Yahan API call karo (dummy)
      await new Promise(res => setTimeout(res, 1000));
      setSuccess(true);
      setName("");
      setEmail("");
      setPermissions(defaultPermissions);
    } catch {
      setError("Save nahi hua. Dobara koshish karo.");
    } finally {
      setLoading(false);
    }
  };

  // UI update: Dropdown for roles, fields always show, permissions update on role select
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      {/* User Info Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-indigo-100 w-full mb-8">
        <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b pb-2">User Information</h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 mb-6 md:mb-0">
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
          <div className="flex-1 mb-6 md:mb-0">
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
        </div>
      </div>
      {/* Role Selection Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-indigo-100 w-full mb-8">
        <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b pb-2">Role Selection</h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-gray-700 font-semibold mb-2 text-lg">Role</label>
            <select
              value={selectedRole}
              onChange={e => handleRoleChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg"
            >
              <option value="">Select Role</option>
              {ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Permissions Section */}
      <div className="bg-white/90 p-6 rounded-3xl shadow-2xl w-full border border-indigo-100">
        <h3 className="text-2xl font-bold mb-6 text-indigo-700 text-center border-b pb-4">Set Permissions</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {permissions.map((p, idx) => (
              <div key={p.page} className="border-b pb-2 mb-2">
                <div className="font-semibold text-gray-800 mb-1 text-lg">{p.page}</div>
                <div className="flex gap-6 flex-wrap">
                  {(["view", "add", "edit", "delete", "share", "preview", "reopen"] as const).map(perm => (
                    <label key={perm} className="flex items-center gap-2 text-base cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={p.permissions[perm]}
                        onChange={() => handlePermissionChange(idx, perm)}
                      />
                      <span>{perm.charAt(0).toUpperCase() + perm.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-md"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Permissions"}
          </button>
          {success && <div className="text-green-600 text-center font-semibold">User and permissions have been saved!</div>}
          {error && <div className="text-red-600 text-center font-semibold">{error === "Name aur Email dono zaroori hain" ? "Name and Email are required" : error === "Save nahi hua. Dobara koshish karo." ? "Could not save. Please try again." : error}</div>}
        </form>
      </div>
    </div>
  );
}
