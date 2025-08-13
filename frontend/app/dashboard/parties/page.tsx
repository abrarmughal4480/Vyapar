'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactDOM from 'react-dom'
import { createParty, fetchPartiesByUserId, updateParty, deleteParty } from '@/http/parties'
import Toast from '../../components/Toast'
import { useExport, ExportColumn } from '../../hooks/useExport'
import PartiesSearchParamsClient from './PartiesSearchParamsClient';
import { getCurrentUserInfo, canAddData, canEditData, canDeleteData } from '../../../lib/roleAccessControl'

interface Party {
  id: string
  name: string
  type: 'Customer' | 'Supplier' | 'Both'
  phone: string
  email: string
  gstin: string
  pan: string
  address: string
  city: string
  state: string
  pincode: string
  openingBalance: number
  currentBalance: number
  tags: string[]
  notes: string
  status: 'Active' | 'Inactive'
  lastTransaction?: string
  totalTransactions: number
  createdDate: string
}



function PartiesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  // Remove direct useSearchParams usage from here
  // The following state will be controlled by the Suspense-wrapped client component if needed
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [parties, setParties] = useState<Party[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [bulkImportModal, setBulkImportModal] = useState(false)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false)
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null)
  const [activeModalTab, setActiveModalTab] = useState('address')
  const [enableShippingAddress, setEnableShippingAddress] = useState(false)
  const [authToken, setAuthToken] = useState<string>('')

  const [hasFetched, setHasFetched] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [exportModal, setExportModal] = useState(false)
  const { exportCSV, exportExcel } = useExport()

  const [balanceType, setBalanceType] = useState<'toReceive' | 'toPay'>('toReceive')
  
  // Role-based access control
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const [newParty, setNewParty] = useState<Omit<Party, 'id' | 'createdDate'>>({
    name: '',
    type: 'Customer',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    openingBalance: 0,
    currentBalance: 0,
    tags: [],
    notes: '',
    status: 'Active',
    totalTransactions: 0
  })

  const pakistaniProvinces = [
    'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Gilgit-Baltistan',
    'Azad Jammu and Kashmir', 'Islamabad Capital Territory'
  ]

  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`
    
    // Check if we're in the browser before accessing localStorage
    let token = '';
    if (typeof window !== 'undefined') {
      token = authToken || localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
      
      if (!token) {
        token = 'dev_token_' + Date.now()
        localStorage.setItem('token', token)
      }
    }

    const headers: any = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
    
    const response = await fetch(url, { 
      ...options, 
      headers 
    })
    
    if (response.status === 404 || response.status === 401 || !response.ok) {
      return { success: true, data: [] }
    }
    
    const data = await response.json()
    return data
  }, [API_BASE_URL, authToken])

  const loadPartiesFromAPI = useCallback(async () => {
    try {
      const token = authToken || localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
      const result = await fetchPartiesByUserId(token);
      if (result && result.success && Array.isArray(result.data)) {
        const transformedParties = result.data.map((party: any) => ({
          id: party._id || party.id,
          name: party.name || 'Unknown Party',
          type: party.partyType || 'Customer',
          phone: party.phone || '',
          email: party.email || '',
          gstin: party.gstNumber || '',
          pan: party.pan || '',
          address: party.address || '',
          city: party.city || '',
          state: party.state || '',
          pincode: party.pincode || '',
          openingBalance: party.openingBalance || 0,
          currentBalance: party.openingBalance || 0,
          tags: party.tags || [],
          notes: party.note || '',
          status: party.status === 'active' ? 'Active' : 'Inactive',
          lastTransaction: '',
          totalTransactions: 0,
          createdDate: party.createdAt ? new Date(party.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }));
        setParties(transformedParties);
      } else {
        setParties([]);
      }
    } catch (error) {
      setToast({ message: 'Failed to load parties from server', type: 'error' });
    }
    setHasFetched(true);
  }, [authToken]);



  useEffect(() => {
    // Set client-side flag for hydration safety
    setIsClient(true);
    
    // Get current user info for role-based access
    const currentUserInfo = getCurrentUserInfo();
    setUserInfo(currentUserInfo);
    
    if (authToken) {
      loadPartiesFromAPI()
    }
  }, [loadPartiesFromAPI, authToken])

  useEffect(() => {
    // This useEffect is now handled by PartiesSearchParamsClient
    // const filter = searchParams.get('filter');
    // if (filter === 'debtor') {
    //   setSelectedCategory('Debtors');
    //   setActiveTab('debtors');
    // } else if (filter === 'creditor') {
    //   setSelectedCategory('Creditors');
    //   setActiveTab('creditors');
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const addPartyParam = searchParams.get('addParty');
    const returnUrlParam = searchParams.get('returnUrl');
    
    if (addPartyParam === '1') {
      setShowAddPartyModal(true);
      setIsModalOpen(true); // Open the actual modal
      
      // Store return URL if provided
      if (returnUrlParam) {
        setReturnUrl(returnUrlParam);
        
        // If coming from purchase add page, set type to Supplier
        if (returnUrlParam.includes('purchaseAdd')) {
          setNewParty(prev => ({ ...prev, type: 'Supplier' }));
        }
      }
      
      // Remove the parameters from URL without page reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('addParty');
      newUrl.searchParams.delete('returnUrl');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  const calculateStats = () => {
    const totalParties = parties.length
    const totalReceivables = parties.filter(p => p.currentBalance > 0).reduce((sum, p) => sum + p.currentBalance, 0)
    const totalPayables = Math.abs(parties.filter(p => p.currentBalance < 0).reduce((sum, p) => sum + p.currentBalance, 0))
    const netBalance = parties.reduce((sum, p) => sum + p.currentBalance, 0)

    return { totalParties, totalReceivables, totalPayables, netBalance }
  }

  const stats = calculateStats()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewParty(prev => ({
      ...prev,
      [name]: ['openingBalance', 'currentBalance'].includes(name) 
        ? parseFloat(value) || 0 
        : value
    }))
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
    setNewParty(prev => ({ ...prev, tags }))
  }

  // Validation function for party data
  const validateParty = () => {
    if (!newParty.name.trim()) {
      return 'Party name is required'
    }
    if (newParty.email && !/^\S+@\S+\.\S+$/.test(newParty.email)) {
      return 'Please enter a valid email address'
    }
    if (newParty.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(newParty.gstin)) {
      return 'Please enter a valid GSTIN'
    }
    return null
  }

  const handleAddParty = async () => {
    const validationError = validateParty();
    if (validationError) {
      setToast({ message: validationError, type: 'error' });
      return;
    }
    try {
      // Prepare party data for backend
      const partyData = {
        name: newParty.name,
        partyType: newParty.type,
        phone: newParty.phone,
        email: newParty.email,
        gstNumber: newParty.gstin,
        pan: newParty.pan,
        address: newParty.address,
        city: newParty.city,
        state: newParty.state,
        pincode: newParty.pincode,
        openingBalance: balanceType === 'toPay' ? -Math.abs(newParty.openingBalance) : Math.abs(newParty.openingBalance),
        tags: newParty.tags,
        status: newParty.status === 'Active' ? 'active' : 'inactive',
        note: newParty.notes,
      };
      // Get token
      const token = authToken || localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
      let result;
      if (editingParty) {
        // Edit mode
        result = await updateParty(editingParty.id, partyData, token);
      } else {
        // Add mode
        result = await createParty(partyData, token);
      }
      if (result && result.success && result.data) {
        if (editingParty) {
          // Update local state for edit
          setParties(parties.map(p => p.id === editingParty.id ? {
            ...result.data,
            id: result.data._id || result.data.id,
            type: result.data.partyType || 'Customer',
            gstin: result.data.gstNumber || '',
            notes: result.data.note || '',
            status: result.data.status === 'active' ? 'Active' : 'Inactive',
            createdDate: result.data.createdAt ? new Date(result.data.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            currentBalance: result.data.openingBalance || 0,
            totalTransactions: 0,
            lastTransaction: '',
          } : p));
          setIsModalOpen(false);
          resetForm();
          setToast({ message: 'Party updated successfully!', type: 'success' });
        } else {
          // Add to local state for add
          setParties([...parties, {
            ...result.data,
            id: result.data._id || result.data.id,
            type: result.data.partyType || 'Customer',
            gstin: result.data.gstNumber || '',
            notes: result.data.note || '',
            status: result.data.status === 'active' ? 'Active' : 'Inactive',
            createdDate: result.data.createdAt ? new Date(result.data.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            currentBalance: result.data.openingBalance || 0,
            totalTransactions: 0,
            lastTransaction: '',
          }]);
          setIsModalOpen(false);
          resetForm();
          
          if (returnUrl && !editingParty) {
            setToast({ message: 'Party added successfully! Redirecting back...', type: 'success' });
            // Redirect back to return URL if provided (for new parties only)
            setTimeout(() => {
              // Add the newly created supplier info to the return URL
              const url = new URL(returnUrl, window.location.origin);
              url.searchParams.set('newSupplier', result.data.name);
              url.searchParams.set('newSupplierId', result.data._id || result.data.id);
              router.push(url.toString());
            }, 1000); // Small delay to show success message
          } else {
            setToast({ message: 'Party added successfully!', type: 'success' });
          }
        }
      } else {
        setToast({ message: editingParty ? 'Failed to update party' : 'Failed to add party', type: 'error' });
      }
    } catch (error) {
      setToast({ message: (editingParty ? 'Failed to update party: ' : 'Failed to add party: ') + String(error), type: 'error' });
    }
  };

  const handleDeleteParty = async () => {
    if (!partyToDelete) return;
    try {
      // Remove from local state immediately
      const updatedParties = parties.filter(p => p.id !== partyToDelete.id);
      setParties(updatedParties);
      // Try to sync deletion with API in background
      try {
        const token = authToken || localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
        await deleteParty(partyToDelete.id, token);
        setToast({ message: 'Party deleted successfully!', type: 'success' });
      } catch (apiError) {
        setToast({ message: 'API deletion sync failed, but party removed locally', type: 'error' });
      }
      setDeleteConfirmModal(false);
      setPartyToDelete(null);
    } catch (error) {
      setToast({ message: 'Failed to delete party: ' + String(error), type: 'error' });
    }
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600'
    if (balance < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Customer': return 'bg-blue-100 text-blue-800'
      case 'Supplier': return 'bg-purple-100 text-purple-800'
      case 'Both': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }



  const filteredParties = parties.filter(party => {
    const matchesSearch = party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         party.phone.includes(searchTerm) ||
                         party.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         party.gstin.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = activeTab === 'all' || 
                         (activeTab === 'customer' && (party.type === 'Customer' || party.type === 'Both')) ||
                         (activeTab === 'supplier' && (party.type === 'Supplier' || party.type === 'Both')) ||
                         (activeTab === 'debtors' && party.currentBalance > 0) ||
                         (activeTab === 'creditors' && party.currentBalance < 0) ||
                         (activeTab === 'active' && party.status === 'Active')

    return matchesSearch && matchesStatus
  })

  const exportColumns: ExportColumn[] = [
    { label: 'Name', key: 'name' },
    { label: 'Type', key: 'type' },
    { label: 'Phone', key: 'phone' },
    { label: 'Email', key: 'email' },
    { label: 'GSTIN', key: 'gstin' },
    { label: 'PAN', key: 'pan' },
    { label: 'Address', key: 'address' },
    { label: 'City', key: 'city' },
    { label: 'State', key: 'state' },
    { label: 'Pincode', key: 'pincode' },
    { label: 'Opening Balance', key: 'openingBalance' },
    { label: 'Tags', key: 'tags' },
    { label: 'Status', key: 'status' },
    { label: 'Notes', key: 'notes' },
  ];

  const exportParties = async () => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/parties/${'biz_12345'}/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken || localStorage.getItem('token') || localStorage.getItem('vypar_auth_token')}`,
      },
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `parties_${'biz_12345'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  }

  const importParties = async (file?: File) => {
    router.push('/dashboard/bulk-imports/import-parties')
  }

  const resetForm = () => {
    setNewParty({
      name: '',
      type: 'Customer',
      phone: '',
      email: '',
      gstin: '',
      pan: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      openingBalance: 0,
      currentBalance: 0,
      tags: [],
      notes: '',
      status: 'Active',
      totalTransactions: 0
    })
    setBalanceType('toReceive')
    setEditingParty(null)
  }

  const openModal = (party: Party | null = null) => {
    if (party) {
      setEditingParty(party)
      setNewParty({ ...party })
      // Set balance type based on existing opening balance
      setBalanceType(party.openingBalance < 0 ? 'toPay' : 'toReceive')
    } else {
      setEditingParty(null)
      resetForm()
    }
    setIsModalOpen(true)
  }

  // Tab definitions as an array
  const statusTabs = [
    {
      id: 'all',
      name: 'All',
      fullName: 'All Parties',
      count: parties.length
    },
    {
      id: 'customer',
      name: 'Customers',
      fullName: 'Customers',
      count: parties.filter(p => p.type === 'Customer' || p.type === 'Both').length
    },
    {
      id: 'supplier',
      name: 'Suppliers',
      fullName: 'Suppliers',
      count: parties.filter(p => p.type === 'Supplier' || p.type === 'Both').length
    },
    {
      id: 'debtors',
      name: 'Debtors',
      fullName: 'Debtors',
      count: parties.filter(p => p.currentBalance > 0).length
    },
    {
      id: 'creditors',
      name: 'Creditors',
      fullName: 'Creditors',
      count: parties.filter(p => p.currentBalance < 0).length
    },
    {
      id: 'active',
      name: 'Active',
      fullName: 'Active',
      count: parties.filter(p => p.status === 'Active').length
    }
  ];

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    const anyModalOpen = isModalOpen || deleteConfirmModal || bulkImportModal || exportModal;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, deleteConfirmModal, bulkImportModal, exportModal]);

  // Set authToken from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
      setAuthToken(token);
    }
  }, []);
  
  // Update dropdown position when opening




  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Suspense>
        <PartiesSearchParamsClient
          onParams={params => {
            const filter = params.get('filter');
            if (filter === 'debtor') {
              setActiveTab('debtors');
            } else if (filter === 'creditor') {
              setActiveTab('creditors');
            }
            const search = params.get('search') || '';
            setSearchTerm(search);
          }}
        />
      </Suspense>
      {/* Header - sticky, card-like, shadow, rounded */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Parties Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your customers and suppliers</p>
          </div>
          
          {/* Responsive Button Group */}
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-3">
            {isClient && canAddData() ? (
              <button
                onClick={() => importParties()}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2 transition-colors"
              >
                <span>📤</span>
                <span>Import</span>
              </button>
            ) : (
              <div className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-400 flex items-center justify-center space-x-2">
                <span>📤</span>
                <span>Import (Restricted)</span>
              </div>
            )}
            {isClient && canAddData() ? (
              <button
                onClick={() => setExportModal(true)}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2 transition-colors"
              >
                <span>⬇️</span>
                <span>Export</span>
              </button>
            ) : (
              <div className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-400 flex items-center justify-center space-x-2">
                <span>⬇️</span>
                <span>Export (Restricted)</span>
              </div>
            )}
            {isClient && canAddData() ? (
              <button
                onClick={() => openModal()}
                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
              >
                <span>+</span>
                <span>Add Party</span>
              </button>
            ) : (
              <div className="w-full md:w-auto px-6 py-2 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center space-x-2">
                <span>+</span>
                <span>Add Party (Restricted)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - colored icons, backgrounds, hover */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">👥</div>
          <div className="text-2xl font-bold text-blue-700">{stats.totalParties}</div>
          <div className="text-sm text-gray-500">Total Parties</div>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500 text-white mb-3 text-xl">PKR</div>
          <div className="text-2xl font-bold text-green-700">PKR {Math.abs(stats.totalReceivables).toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Receivables</div>
        </div>
        <div className="bg-gradient-to-br from-red-100 to-red-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500 text-white mb-3 text-xl">PKR</div>
          <div className="text-2xl font-bold text-red-700">PKR {Math.abs(stats.totalPayables).toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Payables</div>
        </div>
        <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500 text-white mb-3 text-xl">Σ</div>
          <div className={`text-2xl font-bold ${getBalanceColor(stats.netBalance)}`}>PKR {Math.abs(stats.netBalance).toLocaleString()}</div>
          <div className="text-sm text-gray-500">Net Balance</div>
        </div>
      </div>



      {/* Filters and Tabs - modern underline, color */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow mb-6 border border-gray-100">
        <div className="p-4 md:p-6 border-b border-gray-100">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
              {/* Enhanced Search Bar */}
              <div className="relative w-full sm:w-72">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">🔍</span>
                <input
                  type="text"
                  placeholder="Search parties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
                  suppressHydrationWarning={true}
                  autoComplete="off"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Responsive Status Tabs */}
        <div className="border-b border-gray-100 overflow-x-auto">
          <nav className="flex space-x-4 md:space-x-8 px-4 md:px-6 min-w-max">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm('');
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="hidden sm:inline">{tab.fullName}</span>
                <span className="sm:hidden">{tab.name}</span>
                <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Parties List/Table - alternating rows, avatars, hover */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow border border-gray-100 z-[1]">
        <div className="p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            Parties ({filteredParties.length})
          </h2>
        </div>
        {filteredParties.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No parties found</h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'all' 
                ? 'Add your first party to get started'
                : `No ${activeTab} parties found`
              }
            </p>
            <button 
              onClick={() => openModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Party
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden">
              {filteredParties.map((party) => (
                <div key={party.id} className="border-b border-gray-100 p-4 bg-white/80 rounded-xl mb-3 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base">
                        {party.name[0]}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{party.name}</h3>
                        <p className="text-sm text-gray-500">{party.phone}</p>
                        <p className="text-xs text-gray-400">{party.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(party.type)}`}>
                        {party.type}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(party.status)}`}>
                        {party.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className={`text-sm font-medium ${getBalanceColor(party.currentBalance)}`}> 
                      PKR {Math.abs(party.currentBalance).toLocaleString()}
                    </div>
                    <div className="flex space-x-2">
                      {isClient && canEditData() ? (
                        <button
                          onClick={() => openModal(party)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Edit
                        </button>
                      ) : (
                        <div className="text-gray-400 text-sm">Edit</div>
                      )}
                      {isClient && canDeleteData() ? (
                        <button
                          onClick={() => {
                            setPartyToDelete(party)
                            setDeleteConfirmModal(true)
                          }}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      ) : (
                        <div className="text-gray-400 text-sm">Delete</div>
                      )}
                    </div>
                  </div>
                  {party.gstin && (
                    <div className="mt-2 text-xs text-gray-500">
                      GSTIN: {party.gstin}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  {/* Table header */}
                  {filteredParties.length > 0 && (
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                  )}
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredParties.map((party, idx) => (
                        <tr key={party.id} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-6 py-4 whitespace-nowrap flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base">
                              {party.name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{party.name}</div>
                              {party.gstin && (
                                <div className="text-xs text-gray-500">GSTIN: {party.gstin}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(party.type)}`}>
                              {party.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{party.phone}</div>
                            <div className="text-xs text-gray-500">{party.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${getBalanceColor(party.currentBalance)}`}>
                              PKR {Math.abs(party.currentBalance).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(party.status)}`}>
                              {party.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {isClient && canEditData() ? (
                              <button
                                onClick={() => openModal(party)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Edit
                              </button>
                            ) : (
                              <div className="text-gray-400 text-sm mr-4">Edit</div>
                            )}
                            {isClient && canDeleteData() ? (
                              <button
                                onClick={() => {
                                  setPartyToDelete(party)
                                  setDeleteConfirmModal(true)
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            ) : (
                              <div className="text-gray-400 text-sm">Delete</div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Party Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeinup">
          <div className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-4xl max-h-screen overflow-y-auto animate-scalein">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingParty ? 'Edit Party' : 'Add New Party'}
                </h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Party Name and Phone */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Party Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={newParty.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter party name"
                    required
                    suppressHydrationWarning={true}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={newParty.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Phone number"
                    suppressHydrationWarning={true}
                  />
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'address', name: 'Address' },
                  { id: 'credit', name: 'Credit & Balance' },
                  { id: 'additional', name: 'Additional Fields' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeModalTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {activeModalTab === 'address' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
                    <input
                      type="email"
                      name="email"
                      value={newParty.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="email@example.com"
                      suppressHydrationWarning={true}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                    <textarea
                      name="address"
                      value={newParty.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Enter complete billing address"
                      suppressHydrationWarning={true}
                    />
                  </div>

                  <div className="flex items-center space-x-2 text-blue-600 cursor-pointer" onClick={() => setEnableShippingAddress(!enableShippingAddress)}>
                    <span>+</span>
                    <span className="text-sm font-medium">Enable Shipping Address</span>
                  </div>

                  {enableShippingAddress && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Enter shipping address (if different from billing)"
                        suppressHydrationWarning={true}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeModalTab === 'credit' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">PKR</span>
                        <input
                          type="number"
                          name="openingBalance"
                          step="0.01"
                          value={newParty.openingBalance || ''}
                          onChange={handleInputChange}
                          className="w-full pl-14 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          suppressHydrationWarning={true}
                        />
                      </div>
                      
                      {/* Balance Type Radio Buttons */}
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-900 mb-3">Balance Type</label>
                        <div className="flex space-x-6">
                          <div 
                            className={`flex items-center cursor-pointer group p-3 rounded-lg transition-all duration-200 ${
                              balanceType === 'toReceive' 
                                ? 'bg-green-50' 
                                : 'hover:bg-green-25'
                            }`}
                            onClick={() => setBalanceType('toReceive')}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                              balanceType === 'toReceive'
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-400 bg-white'
                            }`}>
                              {balanceType === 'toReceive' && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                                To Receive (+)
                              </span>
                            </span>
                          </div>
                          
                          <div 
                            className={`flex items-center cursor-pointer group p-3 rounded-lg transition-all duration-200 ${
                              balanceType === 'toPay' 
                                ? 'bg-red-50' 
                                : 'hover:bg-red-25'
                            }`}
                            onClick={() => setBalanceType('toPay')}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                              balanceType === 'toPay'
                                ? 'border-red-500 bg-red-500'
                                : 'border-gray-400 bg-white'
                            }`}>
                              {balanceType === 'toPay' && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-900 group-hover:text-red-600 transition-colors">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">
                                To Pay (-)
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                      <input
                        type="text"
                        name="gstin"
                        value={newParty.gstin}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="GSTIN (15 characters)"
                        maxLength={15}
                        style={{ textTransform: 'uppercase' }}
                        suppressHydrationWarning={true}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                      <input
                        type="text"
                        name="pan"
                        value={newParty.pan}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="PAN (10 characters)"
                        maxLength={10}
                        style={{ textTransform: 'uppercase' }}
                        suppressHydrationWarning={true}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'additional' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={newParty.city}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter city"
                        suppressHydrationWarning={true}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                      <select
                        name="state"
                        value={newParty.state}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Province</option>
                        {pakistaniProvinces.map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        name="pincode"
                        value={newParty.pincode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="6-digit pincode"
                        maxLength={6}
                        suppressHydrationWarning={true}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                      <input
                        type="text"
                        value={newParty.tags.join(', ')}
                        onChange={handleTagsChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter tags separated by commas"
                        suppressHydrationWarning={true}
                      />
                      <p className="text-xs text-gray-500 mt-1">e.g., Wholesale, Premium, Electronics</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        name="status"
                        value={newParty.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      value={newParty.notes}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Additional notes about the party"
                      suppressHydrationWarning={true}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    handleAddParty().then(() => {
                      resetForm()
                      setActiveModalTab('address')
                    })
                  }}
                  className="px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Save & New
                </button>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      resetForm()
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddParty}
                    className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeinup">
          <div className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-md animate-scalein">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Delete Party</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <strong>{partyToDelete?.name}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeleteConfirmModal(false)
                    setPartyToDelete(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteParty}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeinup">
          <div className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-md animate-scalein">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Import Parties</h2>
                <button 
                  onClick={() => setBulkImportModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📤</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Import Parties</h3>
                <p className="text-gray-500 mb-4">Upload CSV or Excel file to import multiple parties</p>
                <div className="space-y-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Choose File
                  </button>
                  <div className="text-sm text-gray-500">
                    <a href="#" className="text-blue-600 hover:underline">Download sample template</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeinup">
          <div className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-md animate-scalein">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Export Parties</h2>
              <button onClick={() => setExportModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={parties.length === 0}
                onClick={() => { if (parties.length > 0) { exportCSV(parties, exportColumns, 'parties.csv'); setExportModal(false); } }}
              >Export as CSV</button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={parties.length === 0}
                onClick={() => { if (parties.length > 0) { exportExcel(parties, exportColumns, 'parties.xlsx'); setExportModal(false); } }}
              >Export as Excel</button>
              {parties.length === 0 && (
                <div className="text-center text-sm text-gray-500 mt-2">No parties to export.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Add animation keyframes at the end */}
      <style jsx global>{`
        @keyframes fadeinup {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeinup {
          animation: fadeinup 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes scalein {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-scalein {
          animation: scalein 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  );
}

export default function PartiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PartiesPageContent />
    </Suspense>
  );
}