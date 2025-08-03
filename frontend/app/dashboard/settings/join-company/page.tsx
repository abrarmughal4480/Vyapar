"use client";
import React, { useState } from "react";
import { ArrowLeft, CheckCircle, XCircle, Send, Building2, UserCheck, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getInvitesForMe, respondToInvite } from '@/http/api';
import Toast from '../../../components/Toast';

// Dummy companies data
const dummyCompanies = [
  { id: 1, name: 'Devease Pvt Ltd', status: 'Pending' },
  { id: 2, name: 'Vyapar Solutions', status: 'Accepted' },
  { id: 3, name: 'ABC Enterprises', status: 'Rejected' },
  { id: 4, name: 'NewCo', status: '' }, // Not requested yet
];

const statusBadge = (status: string) => {
  if (status === 'Accepted') return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold"><CheckCircle className="w-4 h-4" /> Joined</span>;
  if (status === 'Pending') return <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold"><Send className="w-4 h-4" /> Pending</span>;
  if (status === 'Rejected') return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold"><XCircle className="w-4 h-4" /> Rejected</span>;
  return null;
};

export default function JoinCompanyPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const joinedCompanies = invites.filter(invite => invite.status === 'Accepted');
  
  // Load selected company from localStorage on component mount
  React.useEffect(() => {
    const savedCompany = localStorage.getItem('selectedCompany');
    const savedCompanyId = localStorage.getItem('selectedCompanyId');
    const savedCurrentUserId = localStorage.getItem('currentUserId');
    
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    }
    if (savedCompanyId) {
      setSelectedCompanyId(savedCompanyId);
    }
    if (savedCurrentUserId) {
      setCurrentUserId(savedCurrentUserId);
    }
  }, []);

  React.useEffect(() => {
    const fetchInvites = async () => {
      setLoading(true);
      try {
        const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
        const res = await getInvitesForMe(token);
        setInvites(res.data || []);
        

        
        // Get current user ID from token or localStorage
        let currentUserIdFromStorage = localStorage.getItem('currentUserId');
        if (!currentUserIdFromStorage && token) {
          // If not in localStorage, try to get from token payload
          try {
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            if (tokenPayload.userId) {
              currentUserIdFromStorage = tokenPayload.userId;
              setCurrentUserId(tokenPayload.userId);
              localStorage.setItem('currentUserId', tokenPayload.userId);
            } else if (tokenPayload.id) {
              currentUserIdFromStorage = tokenPayload.id;
              setCurrentUserId(tokenPayload.id);
              localStorage.setItem('currentUserId', tokenPayload.id);
            }
          } catch (e) {
            // Silent error handling
          }
        } else if (currentUserIdFromStorage) {
          setCurrentUserId(currentUserIdFromStorage);
        }
      } catch {
        setInvites([]);
      }
      setLoading(false);
    };
    fetchInvites();
  }, []);

  // Save selected company to localStorage whenever it changes
  React.useEffect(() => {
    if (selectedCompany) {
      localStorage.setItem('selectedCompany', selectedCompany);
    } else {
      localStorage.removeItem('selectedCompany');
    }
    if (selectedCompanyId) {
      localStorage.setItem('selectedCompanyId', selectedCompanyId);
    } else {
      localStorage.removeItem('selectedCompanyId');
    }
    if (currentUserId) {
      localStorage.setItem('currentUserId', currentUserId);
    } else {
      localStorage.removeItem('currentUserId');
    }
  }, [selectedCompany, selectedCompanyId, currentUserId]);

  const handleRespond = async (inviteId: string, action: 'Accepted' | 'Rejected') => {
    setActionLoading(inviteId + action);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
      await respondToInvite(inviteId, action, token);
      setInvites(prev => prev.map(inv => inv._id === inviteId ? { ...inv, status: action } : inv));
      
      // If accepted, send request to backend to update user context
      if (action === 'Accepted') {
        await updateUserCompanyContext(inviteId, token);
      }
    } catch {}
    setActionLoading(null);
  };

  // Function to update user's company context in backend
  const updateUserCompanyContext = async (inviteId: string, token: string) => {
    try {
      const invite = invites.find(inv => inv._id === inviteId);
      if (!invite) return;

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Send request to backend to update user's company context
      const response = await fetch(`${API_BASE_URL}/user-invite/update-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          inviteId,
          companyId: invite.requestedBy, // Company's ID
          userId: currentUserId // Current user's ID
        })
      });

      if (response.ok) {

        setToast({
          show: true,
          message: 'Company context updated successfully!',
          type: 'success'
        });
      } else {

      }
    } catch (error) {
      // Silent error handling
    }
  };

  // Function to update JWT token with company context
  const updateJWTTokenWithCompanyContext = async (companyId: string) => {
    try {
      const originalToken = localStorage.getItem('token');
      if (!originalToken) return;

      // Call backend to get a new token with company context
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/auth/switch-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${originalToken}`
        },
        body: JSON.stringify({
          companyId: companyId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update localStorage with new token
        localStorage.setItem('token', data.token);
        localStorage.setItem('originalToken', originalToken); // Keep original for reset
        

        
        setToast({
          show: true,
          message: `Token updated with company ID: ${companyId}`,
          type: 'success'
        });
      } else {

        setToast({
          show: true,
          message: 'Failed to switch to company context',
          type: 'error'
        });
      }
    } catch (error) {
              // Silent error handling
      setToast({
        show: true,
        message: 'Error switching context',
        type: 'error'
      });
    }
  };

  // Function to reset JWT token to original user
  const resetJWTTokenToUser = () => {
    try {
      const originalToken = localStorage.getItem('originalToken');
      if (originalToken) {
        localStorage.setItem('token', originalToken);
        localStorage.removeItem('originalToken');
        

        
        setToast({
          show: true,
          message: 'Token reset to original user',
          type: 'success'
        });
      }
    } catch (error) {
              // Silent error handling
    }
  };



  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-8 sticky top-0 z-30 border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-blue-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-blue-600" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Join Company</h1>
            <p className="text-sm text-gray-500 mt-1">Send a join request to your company and track status</p>
          </div>
        </div>
        <div className="w-full md:w-auto flex justify-end">
          {joinedCompanies.length > 0 && (
            <div className="w-full max-w-xs md:mt-0 mt-2">
              <label className="block text-gray-700 font-semibold mb-2 text-base">Select Joined Company</label>
              <div className="flex gap-2">
                <select
                  value={selectedCompany || ''}
                  onChange={e => {
                    const oldCompanyId = selectedCompanyId;
                    const selectedInvite = joinedCompanies.find(c => c.companyName === e.target.value);
                    let newCompanyId = selectedInvite ? selectedInvite.requestedBy : null;
                    
                    
                    
                    // If no company selected, use current user's ID
                    if (!e.target.value && currentUserId) {
                      newCompanyId = currentUserId;
                    }
                    
                    setSelectedCompany(e.target.value);
                    setSelectedCompanyId(newCompanyId);
                    
                    // Update JWT token with company context
                    if (newCompanyId && newCompanyId !== currentUserId) {
                      updateJWTTokenWithCompanyContext(newCompanyId);
                    } else if (!e.target.value && currentUserId) {
                      // Reset to original user token
                      resetJWTTokenToUser();
                    }
                    



                  }}
                  className="w-full px-4 py-2 border-2 border-indigo-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">-- Select Company --</option>
                  {joinedCompanies.map(c => (
                    <option key={c._id} value={c.companyName}>{c.companyName}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {joinedCompanies.length === 0 && (
            <div className="mt-4 text-gray-500 text-sm">No joined companies yet.</div>
          )}
        </div>
      </div>
      {/* Illustration */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full flex items-center justify-center shadow-lg mb-4">
          <Building2 className="w-14 h-14 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Company Requests</h2>
        <p className="text-gray-500 mb-2 text-center max-w-xl">Here you can see all companies you can join. Send a request to join and track the status. Once accepted, you'll be able to access company resources.</p>

      </div>
      {/* Invites Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Building2 className="w-16 h-16 text-gray-300 mb-4" />
          <div className="text-gray-500 text-lg">Loading...</div>
        </div>
      ) : invites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Building2 className="w-16 h-16 text-gray-300 mb-4" />
          <div className="text-gray-500 text-lg">No invitations found.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {invites.filter(invite => invite.status !== 'Rejected').map(invite => (
            <div key={invite._id} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center border border-gray-100 hover:shadow-2xl transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-3">
                <Building2 className="w-7 h-7 text-blue-600" />
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-1">{invite.companyName}</div>
              <div className="mb-1 text-sm text-gray-500">Role: <span className="font-semibold text-indigo-700">{invite.role}</span></div>
              <div className="mb-3">
                {invite.status === 'Accepted' && <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold"><UserCheck className="w-4 h-4" /> Joined</span>}
                {invite.status === 'Rejected' && <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold"><UserX className="w-4 h-4" /> Rejected</span>}
                {invite.status === 'Pending' && <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold"><Send className="w-4 h-4" /> Pending</span>}
              </div>
              {invite.status === 'Pending' && (
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => handleRespond(invite._id, 'Accepted')}
                    disabled={actionLoading === invite._id + 'Accepted'}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow disabled:opacity-60"
                  >
                    <UserCheck className="w-4 h-4" /> Accept
                  </button>
                  <button
                    onClick={() => handleRespond(invite._id, 'Rejected')}
                    disabled={actionLoading === invite._id + 'Rejected'}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow disabled:opacity-60"
                  >
                    <UserX className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  );
}
