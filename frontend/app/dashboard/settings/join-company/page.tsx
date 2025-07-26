"use client";
import React, { useState } from "react";
import { ArrowLeft, CheckCircle, XCircle, Send, Building2, UserCheck, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getInvitesForMe, respondToInvite } from '@/http/api';

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
  const joinedCompanies = invites.filter(invite => invite.status === 'Accepted');
  React.useEffect(() => {
    const fetchInvites = async () => {
      setLoading(true);
      try {
        const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
        const res = await getInvitesForMe(token);
        setInvites(res.data || []);
      } catch {
        setInvites([]);
      }
      setLoading(false);
    };
    fetchInvites();
  }, []);

  const handleRespond = async (inviteId: string, action: 'Accepted' | 'Rejected') => {
    setActionLoading(inviteId + action);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
      await respondToInvite(inviteId, action, token);
      setInvites(prev => prev.map(inv => inv._id === inviteId ? { ...inv, status: action } : inv));
    } catch {}
    setActionLoading(null);
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
              <select
                value={selectedCompany || ''}
                onChange={e => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 border-2 border-indigo-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">-- Select Company --</option>
                {joinedCompanies.map(c => (
                  <option key={c._id} value={c.companyName}>{c.companyName}</option>
                ))}
              </select>
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
    </div>
  );
}
