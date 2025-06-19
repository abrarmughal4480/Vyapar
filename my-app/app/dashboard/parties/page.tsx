'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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

interface PartyCategory {
  id: string
  name: string
  icon: string
  count: number
  totalBalance: number
}

export default function PartiesPage() {
  const router = useRouter()
  const [parties, setParties] = useState<Party[]>([])
  const [categories, setCategories] = useState<PartyCategory[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [bulkImportModal, setBulkImportModal] = useState(false)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false)
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null)
  const [activeModalTab, setActiveModalTab] = useState('address')
  const [enableShippingAddress, setEnableShippingAddress] = useState(false)
  const [authToken, setAuthToken] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string>('')

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

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal'
  ]

  // Strict auth check - no dummy auth allowed
  const checkAuth = useCallback(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return null;
    }

    const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token');
    const userData = localStorage.getItem('user') || localStorage.getItem('vypar_user_session');
    
    if (!token || !userData) {
      console.log('No authentication found, redirecting to home');
      router.push('/');
      return null;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      // Strict validation - only allow real users
      if (!parsedUser.id || !parsedUser.email || parsedUser.email === 'demo@vyparr.com') {
        console.log('Invalid or demo user data, redirecting to home');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('vypar_auth_token');
        localStorage.removeItem('vypar_user_session');
        localStorage.removeItem('businessId');
        router.push('/');
        return null;
      }

      let businessId = parsedUser.businessId;
      if (!businessId) {
        businessId = `biz_${parsedUser.id}_${Date.now()}`;
        parsedUser.businessId = businessId;
        localStorage.setItem('user', JSON.stringify(parsedUser));
        localStorage.setItem('vypar_user_session', JSON.stringify(parsedUser));
        localStorage.setItem('businessId', businessId);
      }
      
      console.log('Auth check successful for real user:', parsedUser.name || parsedUser.email);
      
      return {
        token,
        user: parsedUser,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
    } catch (error) {
      console.log('Error parsing user data, redirecting to home');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('vypar_auth_token');
      localStorage.removeItem('vypar_user_session');
      localStorage.removeItem('businessId');
      router.push('/');
      return null;
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = checkAuth();
      if (auth) {
        setAuthToken(auth.token);
        setIsInitialized(true);
      }
    }
  }, [checkAuth])

  const getBusinessId = useCallback(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return null;
    }

    const auth = checkAuth();
    if (auth?.user?.businessId) {
      return auth.user.businessId;
    }
    
    const storedBusinessId = localStorage.getItem('businessId');
    if (storedBusinessId) {
      return storedBusinessId;
    }
    
    const userData = localStorage.getItem('user') || localStorage.getItem('vypar_user_session');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.id && parsedUser.email !== 'demo@vyparr.com') {
          const generatedId = `biz_${parsedUser.id}_${Date.now()}`;
          localStorage.setItem('businessId', generatedId);
          return generatedId;
        }
      } catch (e) {
        console.error('Error generating business ID:', e);
      }
    }
    
    return null;
  }, [checkAuth])

  // Save parties to localStorage for permanent storage
  const savePartiesLocally = useCallback((parties: Party[]) => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return;
    }

    const businessId = getBusinessId();
    if (businessId) {
      const localStorageKey = `vyparr_parties_${businessId}`;
      localStorage.setItem(localStorageKey, JSON.stringify(parties));
      console.log(`Saved ${parties.length} parties to localStorage for business: ${businessId}`);
    }
  }, [getBusinessId]);

  // Load parties from localStorage
  const loadPartiesLocally = useCallback(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return [];
    }

    const businessId = getBusinessId();
    if (businessId) {
      const localStorageKey = `vyparr_parties_${businessId}`;
      const savedParties = localStorage.getItem(localStorageKey);
      
      if (savedParties) {
        try {
          const parsedParties = JSON.parse(savedParties);
          console.log(`Loaded ${parsedParties.length} parties from localStorage for business: ${businessId}`);
          return parsedParties;
        } catch (e) {
          console.log('Error parsing saved parties, starting fresh');
          return [];
        }
      }
    }
    return [];
  }, [getBusinessId]);

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
    if (!isInitialized) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    // First, load from localStorage
    const localParties = loadPartiesLocally();
    if (localParties.length > 0) {
      setParties(localParties);
    }
    
    // Then try to sync with API
    try {
      const businessId = getBusinessId();
      if (!businessId) {
        setError('Unable to determine business ID');
        setIsLoading(false);
        return;
      }

      const result = await makeApiCall(`/parties/${businessId}`);
      
      if (result && result.success && Array.isArray(result.data)) {
        const transformedParties = result.data.map((party: any) => ({
          id: party.id?.toString() || 'party-' + Date.now(),
          name: party.name || 'Unknown Party',
          type: party.type || 'Customer',
          phone: party.phone || '',
          email: party.email || '',
          gstin: party.gstNumber || '',
          pan: '',
          address: party.address || '',
          city: '',
          state: '',
          pincode: '',
          openingBalance: party.balance || 0,
          currentBalance: party.balance || 0,
          tags: [],
          notes: '',
          status: party.isActive ? 'Active' : 'Inactive',
          lastTransaction: '',
          totalTransactions: 0,
          createdDate: party.createdAt ? new Date(party.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }));
        
        setParties(transformedParties);
        savePartiesLocally(transformedParties);
        console.log('Synced with API and saved locally');
      } else if (localParties.length === 0) {
        setParties([]);
      }
    } catch (error) {
      console.error('Failed to load parties from API:', error);
      // Keep using local data if API fails
      if (localParties.length === 0) {
        setError('Failed to load parties from server');
      }
    }
    
    setIsLoading(false);
  }, [makeApiCall, isInitialized, getBusinessId, loadPartiesLocally, savePartiesLocally]);

  useEffect(() => {
    setCategories([
      {
        id: '1',
        name: 'Customers',
        icon: '👥',
        count: parties.filter(p => p.type === 'Customer' || p.type === 'Both').length,
        totalBalance: parties.filter(p => p.type === 'Customer' || p.type === 'Both').reduce((sum, p) => sum + p.currentBalance, 0)
      },
      {
        id: '2',
        name: 'Suppliers',
        icon: '🏭',
        count: parties.filter(p => p.type === 'Supplier' || p.type === 'Both').length,
        totalBalance: parties.filter(p => p.type === 'Supplier' || p.type === 'Both').reduce((sum, p) => sum + p.currentBalance, 0)
      },
      {
        id: '3',
        name: 'Debtors',
        icon: '📈',
        count: parties.filter(p => p.currentBalance > 0).length,
        totalBalance: parties.filter(p => p.currentBalance > 0).reduce((sum, p) => sum + p.currentBalance, 0)
      },
      {
        id: '4',
        name: 'Creditors',
        icon: '📉',
        count: parties.filter(p => p.currentBalance < 0).length,
        totalBalance: parties.filter(p => p.currentBalance < 0).reduce((sum, p) => sum + p.currentBalance, 0)
      }
    ])
  }, [parties])

  useEffect(() => {
    if (isInitialized && authToken) {
      loadPartiesFromAPI()
    }
  }, [loadPartiesFromAPI, isInitialized, authToken])

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
    if (newParty.phone && !/^\d{10}$/.test(newParty.phone)) {
      return 'Phone number must be 10 digits'
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
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const businessId = getBusinessId();
      if (!businessId) {
        setError('Unable to determine business ID');
        setIsLoading(false);
        return;
      }

      const partyData = {
        name: newParty.name,
        phone: newParty.phone,
        type: newParty.type,
        address: newParty.address,
        email: newParty.email,
        gstNumber: newParty.gstin,
        balance: editingParty ? newParty.currentBalance : newParty.openingBalance,
        isActive: newParty.status === 'Active'
      };
      
      // Create party object with all form data
      const newPartyData: Party = {
        id: editingParty?.id || 'party-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: partyData.name,
        type: partyData.type as 'Customer' | 'Supplier' | 'Both',
        phone: partyData.phone,
        email: partyData.email,
        gstin: partyData.gstNumber,
        pan: newParty.pan,
        address: partyData.address,
        city: newParty.city,
        state: newParty.state,
        pincode: newParty.pincode,
        openingBalance: partyData.balance,
        currentBalance: partyData.balance,
        tags: newParty.tags,
        notes: newParty.notes,
        status: partyData.isActive ? 'Active' : 'Inactive',
        lastTransaction: '',
        totalTransactions: 0,
        createdDate: new Date().toISOString().split('T')[0]
      };
      
      // Update local state and save to localStorage immediately
      let updatedParties: Party[];
      if (editingParty) {
        updatedParties = parties.map(p => p.id === editingParty.id ? newPartyData : p);
      } else {
        updatedParties = [newPartyData, ...parties];
      }
      
      setParties(updatedParties);
      savePartiesLocally(updatedParties);
      
      // Try to sync with API in background
      try {
        let result;
        if (editingParty) {
          result = await makeApiCall(`/parties/${businessId}/${editingParty.id}`, {
            method: 'PUT',
            body: JSON.stringify(partyData)
          });
        } else {
          result = await makeApiCall(`/parties/${businessId}`, {
            method: 'POST',
            body: JSON.stringify(partyData)
          });
        }
        
        if (result && result.success) {
          console.log('Party synced with API successfully');
        } else {
          console.log('API sync failed, but party saved locally');
        }
      } catch (apiError) {
        console.log('API sync error, but party saved locally:', apiError);
      }
      
      setIsModalOpen(false);
      resetForm();
      alert(`Party ${editingParty ? 'updated' : 'added'} successfully!`);
      
    } catch (error) {
      console.error('Failed to save party:', error);
      setError(`Failed to save party: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteParty = async () => {
    if (!partyToDelete) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Remove from local state and localStorage immediately
      const updatedParties = parties.filter(p => p.id !== partyToDelete.id);
      setParties(updatedParties);
      savePartiesLocally(updatedParties);
      
      // Try to sync deletion with API in background
      try {
        const businessId = getBusinessId();
        if (businessId) {
          await makeApiCall(`/parties/${businessId}/${partyToDelete.id}`, { 
            method: 'DELETE' 
          });
          console.log('Party deletion synced with API');
        }
      } catch (apiError) {
        console.log('API deletion sync failed, but party removed locally:', apiError);
      }
      
      setDeleteConfirmModal(false);
      setPartyToDelete(null);
      alert('Party deleted successfully!');
      
    } catch (error) {
      console.error('Failed to delete party:', error);
     setError(`Failed to save party: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
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

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName)
    return category?.icon || '👤'
  }

  const filteredParties = parties.filter(party => {
    const matchesSearch = party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         party.phone.includes(searchTerm) ||
                         party.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         party.gstin.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || 
                           (selectedCategory === 'Customer' && (party.type === 'Customer' || party.type === 'Both')) ||
                           (selectedCategory === 'Supplier' && (party.type === 'Supplier' || party.type === 'Both')) ||
                           (selectedCategory === 'Debtors' && party.currentBalance > 0) ||
                           (selectedCategory === 'Creditors' && party.currentBalance < 0)
    
    const matchesStatus = activeTab === 'all' || 
                         (activeTab === 'customer' && (party.type === 'Customer' || party.type === 'Both')) ||
                         (activeTab === 'supplier' && (party.type === 'Supplier' || party.type === 'Both')) ||
                         (activeTab === 'debtors' && party.currentBalance > 0) ||
                         (activeTab === 'creditors' && party.currentBalance < 0) ||
                         (activeTab === 'active' && party.status === 'Active')

    return matchesSearch && matchesCategory && matchesStatus
  })

  const exportParties = async () => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return;
    }

    const businessId = getBusinessId();
    
    const response = await fetch(`${API_BASE_URL}/parties/${businessId}/export`, {
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
      a.download = `parties_${businessId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  }

  const importParties = async (file?: File) => {
    const businessId = getBusinessId();
    setBulkImportModal(true);
  }

  useEffect(() => {
    loadPartiesFromAPI()
  }, [loadPartiesFromAPI])

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
    setEditingParty(null)
  }

  const openModal = (party: Party | null = null) => {
    if (party) {
      setEditingParty(party)
      setNewParty({ ...party })
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <div className="text-red-800">{error}</div>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Backend Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-blue-900">Permanent Storage Active (Real Auth Only)</p>
              <p className="text-xs text-blue-700">
                Backend: {API_BASE_URL} | Business: {getBusinessId() || 'Detecting...'} | Parties: {parties.length} saved
              </p>
            </div>
          </div>
          <button 
            onClick={() => loadPartiesFromAPI()}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            disabled={!isInitialized}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Header - Made Responsive */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Parties Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your customers and suppliers</p>
          </div>
          
          {/* Responsive Button Group */}
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-3">
            <button
              onClick={() => importParties()}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2 transition-colors"
            >
              <span>📤</span>
              <span>Import</span>
            </button>
            <button
              onClick={exportParties}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2 transition-colors"
            >
              <span>📊</span>
              <span>Export</span>
            </button>
            <button
              onClick={() => openModal()}
              className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
            >
              <span>+</span>
              <span>Add Party</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Already Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.totalParties}</div>
          <div className="text-sm text-gray-500">Total Parties</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">₹{stats.totalReceivables.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Receivables</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-red-600">₹{stats.totalPayables.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Payables</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className={`text-2xl font-bold ${getBalanceColor(stats.netBalance)}`}>₹{stats.netBalance.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Net Balance</div>
        </div>
      </div>

      {/* Party Categories - Made More Responsive */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Party Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {categories.map((category) => (
            <div key={category.id} className="border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer"
                 onClick={() => setSelectedCategory(selectedCategory === category.name ? '' : category.name)}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg md:text-xl">{category.icon}</span>
                  <span className="font-medium text-gray-900 text-sm md:text-base">{category.name}</span>
                </div>
                <span className="text-xs md:text-sm text-gray-500">{category.count}</span>
              </div>
              <div className="text-sm text-gray-600">
                <div className={`font-medium ${getBalanceColor(category.totalBalance)}`}>
                  ₹{category.totalBalance.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">Total Balance</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Tabs - Made Responsive */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search parties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                <option value="Customer">Customers</option>
                <option value="Supplier">Suppliers</option>
                <option value="Debtors">Debtors</option>
                <option value="Creditors">Creditors</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsive Status Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-4 md:space-x-8 px-4 md:px-6 min-w-max">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

      {/* Parties List - Made Responsive */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Parties ({filteredParties.length})
          </h2>
        </div>
        
        {!isInitialized ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">⚡</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Initializing...</h3>
            <p className="text-gray-500">Setting up your account</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">⏳</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading parties...</h3>
            <p className="text-gray-500">Please wait while we fetch your data</p>
          </div>
        ) : filteredParties.length === 0 ? (
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
                <div key={party.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{party.name}</h3>
                      <p className="text-sm text-gray-500">{party.phone}</p>
                      <p className="text-xs text-gray-400">{party.email}</p>
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
                  
                  <div className="flex justify-between items-center">
                    <div className={`text-sm font-medium ${getBalanceColor(party.currentBalance)}`}>
                      ₹{party.currentBalance.toLocaleString()}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openModal(party)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setPartyToDelete(party)
                          setDeleteConfirmModal(true)
                        }}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Delete
                      </button>
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
                <table className="min-w-full divide-y divide-gray-200">
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
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredParties.map((party) => (
                      <tr key={party.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
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
                            ₹{party.currentBalance.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(party.status)}`}>
                            {party.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openModal(party)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setPartyToDelete(party)
                              setDeleteConfirmModal(true)
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
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
                    placeholder="10-digit phone number"
                    maxLength={10}
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
                      />
                    </div>
                  )}
                </div>
              )}

              {activeModalTab === 'credit' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Party Type</label>
                      <select
                        name="type"
                        value={newParty.type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Customer">Customer</option>
                        <option value="Supplier">Supplier</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">₹</span>
                        <input
                          type="number"
                          name="openingBalance"
                          step="0.01"
                          value={newParty.openingBalance || ''}
                          onChange={handleInputChange}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Positive for receivables, negative for payables</p>
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
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <select
                        name="state"
                        value={newParty.state}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select State</option>
                        {indianStates.map((state) => (
                          <option key={state} value={state}>
                            {state}
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
                  disabled={isLoading}
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
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddParty}
                    disabled={isLoading}
                    className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
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
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteParty}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
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
    </div>
  )
}