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
  const [companySwitchLoading, setCompanySwitchLoading] = useState<boolean>(false);
  const joinedCompanies = invites.filter(invite => invite.status === 'Accepted');
  
  // Debug logging for joined companies
  React.useEffect(() => {
    console.log('📊 Joined companies data:', {
      totalInvites: invites.length,
      joinedCompanies: joinedCompanies.length,
      joinedCompaniesData: joinedCompanies.map(c => ({
        id: c._id,
        companyName: c.companyName,
        requestedBy: c.requestedBy,
        status: c.status,
        fullInvite: c
      })),
      currentUserId,
      selectedCompany,
      selectedCompanyId
    });
  }, [invites, joinedCompanies, currentUserId, selectedCompany, selectedCompanyId]);
  
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
            console.log('🔍 Token payload:', tokenPayload);
            
            // If user is in company context, use originalUserId
            if (tokenPayload.originalUserId) {
              currentUserIdFromStorage = tokenPayload.originalUserId;
              setCurrentUserId(tokenPayload.originalUserId);
              localStorage.setItem('currentUserId', tokenPayload.originalUserId);
              console.log('🏢 User in company context, using originalUserId:', tokenPayload.originalUserId);
            } else if (tokenPayload.userId) {
              currentUserIdFromStorage = tokenPayload.userId;
              setCurrentUserId(tokenPayload.userId);
              localStorage.setItem('currentUserId', tokenPayload.userId);
              console.log('👤 User in user context, using userId:', tokenPayload.userId);
            } else if (tokenPayload.id) {
              currentUserIdFromStorage = tokenPayload.id;
              setCurrentUserId(tokenPayload.id);
              localStorage.setItem('currentUserId', tokenPayload.id);
              console.log('🆔 Using token id:', tokenPayload.id);
            }
          } catch (e) {
            console.error('❌ Error parsing token:', e);
          }
        } else if (currentUserIdFromStorage) {
          setCurrentUserId(currentUserIdFromStorage);
        }
        
        // Always re-parse token to get the correct user ID, even if we have it in localStorage
        if (token) {
          try {
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            console.log('🔄 Re-parsing token for user ID:', {
              fullPayload: tokenPayload,
              hasOriginalUserId: !!tokenPayload.originalUserId,
              hasUserId: !!tokenPayload.userId,
              hasId: !!tokenPayload.id,
              context: tokenPayload.context,
              currentUserIdBeforeUpdate: currentUserId
            });
            
            // If user is in company context, use originalUserId
            if (tokenPayload.originalUserId) {
              const correctUserId = tokenPayload.originalUserId;
              console.log('🏢 Found originalUserId in token:', correctUserId);
              if (currentUserId !== correctUserId) {
                console.log('🔄 Updating currentUserId from', currentUserId, 'to', correctUserId);
                setCurrentUserId(correctUserId);
                localStorage.setItem('currentUserId', correctUserId);
              } else {
                console.log('✅ currentUserId already correct:', correctUserId);
              }
            } else if (tokenPayload.userId) {
              const correctUserId = tokenPayload.userId;
              console.log('👤 Found userId in token:', correctUserId);
              if (currentUserId !== correctUserId) {
                console.log('🔄 Updating currentUserId from', currentUserId, 'to', correctUserId);
                setCurrentUserId(correctUserId);
                localStorage.setItem('currentUserId', correctUserId);
              } else {
                console.log('✅ currentUserId already correct:', correctUserId);
              }
            } else {
              console.log('❌ No originalUserId or userId found in token, using id:', tokenPayload.id);
              // Even if no originalUserId, we should use the id from token if it's different
              const correctUserId = tokenPayload.id;
              if (currentUserId !== correctUserId) {
                console.log('🔄 Updating currentUserId from', currentUserId, 'to', correctUserId);
                setCurrentUserId(correctUserId);
                localStorage.setItem('currentUserId', correctUserId);
                console.log('✅ currentUserId updated to:', correctUserId);
              } else {
                console.log('✅ currentUserId already correct:', correctUserId);
              }
            }
          } catch (e) {
            console.error('❌ Error re-parsing token:', e);
          }
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
      if (!originalToken) {
        console.error('❌ No token found in localStorage');
        return;
      }

      // Call backend to get a new token with company context
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const url = `${API_BASE_URL}/auth/switch-context`;
      
      console.log('🔄 Starting company switch:', {
        companyId,
        url,
        hasToken: !!originalToken,
        tokenPreview: originalToken.substring(0, 20) + '...'
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${originalToken}`
        },
        body: JSON.stringify({
          companyId: companyId
        })
      });

      console.log('📡 API Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Company switch successful:', data);
        
        // Update localStorage with new token
        localStorage.setItem('token', data.token);
        localStorage.setItem('originalToken', originalToken); // Keep original for reset
        
        console.log('💾 Token updated in localStorage');
        
        // Notify session manager about token change
        try {
          const sessionManager = await import('../../../../lib/sessionManager');
          sessionManager.default.refreshToken();
        } catch (error) {
          console.log('Session manager not available');
        }
        
        setToast({
          show: true,
          message: `Successfully switched to company context!`,
          type: 'success'
        });

        // Auto refresh page after 1 second to update all components
        setTimeout(() => {
          console.log('🔄 Refreshing page...');
          window.location.reload();
        }, 1000);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('❌ Company switch failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        setToast({
          show: true,
          message: `Failed to switch to company context: ${errorData.message || 'Unknown error'}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('💥 Company switch error:', error);
      setToast({
        show: true,
        message: `Error switching context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  // Function to reset JWT token to original user
  const resetJWTTokenToUser = async () => {
    try {
      console.log('🔄 Resetting to user context...');
      const originalToken = localStorage.getItem('originalToken');
      if (originalToken) {
        console.log('✅ Original token found, switching back');
        localStorage.setItem('token', originalToken);
        localStorage.removeItem('originalToken');
        
        // Notify session manager about token change
        try {
          const sessionManager = await import('../../../../lib/sessionManager');
          sessionManager.default.refreshToken();
        } catch (error) {
          console.log('Session manager not available');
        }
        
        setToast({
          show: true,
          message: 'Successfully switched back to user context!',
          type: 'success'
        });

        // Auto refresh page after 1 second to update all components
        setTimeout(() => {
          console.log('🔄 Refreshing page after user context reset...');
          window.location.reload();
        }, 1000);
      } else {
        console.log('❌ No original token found');
      }
    } catch (error) {
      console.error('💥 Error resetting to user context:', error);
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
                <div className="flex gap-2 items-center">
                  <select
                  value={selectedCompany || ''}
                  onChange={async (e) => {
                    console.log('🎯 Company dropdown changed:', {
                      selectedValue: e.target.value,
                      currentUserId,
                      joinedCompanies: joinedCompanies.length
                    });
                    
                    setCompanySwitchLoading(true);
                    try {
                      const oldCompanyId = selectedCompanyId;
                      const selectedInvite = joinedCompanies.find(c => c.companyName === e.target.value);
                      // The user is joining the company that invited them, so we use requestedBy as the company ID
                      let newCompanyId = selectedInvite ? selectedInvite.requestedBy : null;
                      
                      console.log('🔍 Company selection details:', {
                        selectedInvite,
                        newCompanyId,
                        oldCompanyId,
                        isOwnCompany: !e.target.value,
                        currentUserId,
                        shouldSwitch: newCompanyId !== oldCompanyId,
                        // Database data from selectedInvite
                        dbData: selectedInvite ? {
                          inviteId: selectedInvite._id,
                          companyName: selectedInvite.companyName,
                          requestedBy: selectedInvite.requestedBy, // Company ID
                          requestedTo: selectedInvite.requestedTo, // User ID
                          status: selectedInvite.status
                        } : null
                      });
                      
                      setSelectedCompany(e.target.value);
                      setSelectedCompanyId(newCompanyId);
                      
                      // Handle company context switching
                      if (!e.target.value) {
                        // Empty selection = My Own Company - reset to user context
                        console.log('🏠 Switching to own company - resetting to user context');
                        await resetJWTTokenToUser();
                      } else if (newCompanyId && newCompanyId !== oldCompanyId) {
                        // Company selected - switch to company context
                        console.log('🔄 Calling updateJWTTokenWithCompanyContext with:', newCompanyId);
                        await updateJWTTokenWithCompanyContext(newCompanyId);
                      } else {
                        console.log('⚠️ No action needed - same company selected');
                      }
                    } catch (error) {
                      console.error('💥 Error switching company context:', error);
                    } finally {
                      console.log('🏁 Company switch process completed');
                      setCompanySwitchLoading(false);
                    }
                  }}
                  className={`w-full px-4 py-2 border-2 border-indigo-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 ${companySwitchLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={companySwitchLoading}
                                  >
                    <option value="">-- My Own Company --</option>
                    {joinedCompanies.map(c => (
                      <option key={c._id} value={c.companyName}>{c.companyName}</option>
                    ))}
                  </select>
                  {companySwitchLoading && (
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
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