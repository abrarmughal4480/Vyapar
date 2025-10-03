'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, CheckCircle, ChevronDown, Key, Users, Calendar, Trash2, Edit } from 'lucide-react';
import { generateLicenseKey, getAllLicenseKeys, deleteLicenseKey, updateLicenseKey, LicenseKey } from '@/http/license-keys';
import Toast from '@/components/Toast';

export default function LicenseGenerator() {
  const router = useRouter();
  const [generatedKeys, setGeneratedKeys] = useState<LicenseKey[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [licenseDuration, setLicenseDuration] = useState<number>(0.5);
  const [numberOfDevices, setNumberOfDevices] = useState<number>(1);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showDevicesDropdown, setShowDevicesDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [editingKey, setEditingKey] = useState<LicenseKey | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    duration: 0.5,
    maxDevices: 1
  });

  const durationOptions = [
    { value: 0.5, label: '6 Months' },
    { value: 1, label: '1 Year' },
    { value: 2, label: '2 Years' },
    { value: 3, label: '3 Years' },
    { value: 5, label: '5 Years' },
    { value: 10, label: '10 Years' }
  ];

  const deviceOptions = Array.from({ length: 10 }, (_, index) => ({
    value: index + 1,
    label: `${index + 1} Device${index + 1 > 1 ? 's' : ''}`
  }));

  // Fetch all license keys on component mount
  useEffect(() => {
    fetchLicenseKeys();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.duration-dropdown') && !target.closest('.devices-dropdown')) {
        setShowDurationDropdown(false);
        setShowDevicesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchLicenseKeys = async () => {
    try {
      setIsLoading(true);
      const response = await getAllLicenseKeys();
      // Sort license keys by generation date (newest first)
      const sortedKeys = response.data.sort((a: LicenseKey, b: LicenseKey) => 
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );
      setGeneratedKeys(sortedKeys);
    } catch (error: any) {
      showToastMessage(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate license key using backend API
  const generateKeys = async () => {
    try {
      setIsGenerating(true);
      const response = await generateLicenseKey({
        duration: licenseDuration,
        maxDevices: numberOfDevices
      });
      
      showToastMessage('License key generated successfully!', 'success');
      
      // Refresh the list
      await fetchLicenseKeys();
    } catch (error: any) {
      showToastMessage(error.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy key to clipboard
  const copyToClipboard = async (licenseKey: LicenseKey, index: number) => {
    try {
      const keyInfo = `License Key: ${licenseKey.key}\nDuration: ${licenseKey.duration} year(s)\nMax Devices: ${licenseKey.maxDevices}\nCurrent Usage: ${licenseKey.currentUsage}\nRemaining Devices: ${licenseKey.remainingDevices}\nExpires: ${new Date(licenseKey.expiresAt).toLocaleDateString()}\nGenerated: ${new Date(licenseKey.generatedAt).toLocaleDateString()}`;
      await navigator.clipboard.writeText(keyInfo);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      showToastMessage('License key copied to clipboard!', 'success');
    } catch (err) {
      showToastMessage('Failed to copy to clipboard', 'error');
    }
  };

  // Delete license key
  const handleDeleteKey = async (key: string) => {
    if (!confirm('Are you sure you want to delete this license key? This action cannot be undone and will remove the license from all users.')) {
      return;
    }

    try {
      const result = await deleteLicenseKey(key);
      showToastMessage('License key deleted successfully!', 'success');
      await fetchLicenseKeys();
    } catch (error: any) {
      showToastMessage(error.message, 'error');
    }
  };

  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Handle edit license key
  const handleEditKey = (licenseKey: LicenseKey) => {
    setEditingKey(licenseKey);
    setEditFormData({
      duration: licenseKey.duration,
      maxDevices: licenseKey.maxDevices
    });
    setShowEditModal(true);
  };

  // Save edited license key
  const handleSaveEdit = async () => {
    if (!editingKey) return;
    
    try {
      await updateLicenseKey(editingKey.key, editFormData);
      showToastMessage('License key updated successfully!', 'success');
      setShowEditModal(false);
      setEditingKey(null);
      await fetchLicenseKeys();
    } catch (error: any) {
      showToastMessage(error.message, 'error');
    }
  };

  // Close edit modal
  const handleCloseEdit = () => {
    setShowEditModal(false);
    setEditingKey(null);
  };

  const getSelectedDurationLabel = () => {
    return durationOptions.find(option => option.value === licenseDuration)?.label || '1 Year';
  };

  const getSelectedDevicesLabel = () => {
    return deviceOptions.find(option => option.value === numberOfDevices)?.label || '1 Device';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2 sm:px-4 md:px-8">
      <div className="w-full h-auto bg-white/90 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto my-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-200 flex justify-between items-center px-6 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">License Key Generator</h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Configuration */}
            <div className="lg:col-span-1 space-y-6">
              {/* License Configuration */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center space-x-2 mb-6">
                  <h2 className="text-xl font-bold text-gray-900">License Configuration</h2>
                </div>
                
                {/* Duration Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Calendar className="w-4 h-4 inline mr-2 text-blue-600" />
                    License Duration
                  </label>
                  <div className="relative duration-dropdown">
                    <button
                      onClick={() => setShowDurationDropdown(!showDurationDropdown)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-xl hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      <span className="text-gray-900">{getSelectedDurationLabel()}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showDurationDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showDurationDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-auto">
                        {durationOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setLicenseDuration(option.value);
                              setShowDurationDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl"
                          >
                            <span className="text-gray-900">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Devices Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Users className="w-4 h-4 inline mr-2 text-purple-600" />
                    Number of Devices
                  </label>
                  <div className="relative devices-dropdown">
                    <button
                      onClick={() => setShowDevicesDropdown(!showDevicesDropdown)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-xl hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                    >
                      <span className="text-gray-900">{getSelectedDevicesLabel()}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showDevicesDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showDevicesDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-auto">
                        {deviceOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setNumberOfDevices(option.value);
                              setShowDevicesDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl"
                          >
                            <span className="text-gray-900">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Configuration Display */}
                <div className="bg-white/80 rounded-xl p-4 border border-blue-200 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Configuration</h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>{getSelectedDurationLabel()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>{getSelectedDevicesLabel()}</span>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateKeys}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
                >
                  {isGenerating ? (
                    <span className="text-xl">⏳</span>
                  ) : (
                    <span className="text-xl">🔑</span>
                  )}
                  <span>{isGenerating ? 'Generating...' : 'Generate License Key'}</span>
                </button>
              </div>
            </div>

            {/* Right Column - Generated Keys */}
            <div className="lg:col-span-2">
              {isLoading ? (
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12 text-center border border-gray-200">
                  <div className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
                  <p className="text-gray-500">Loading license keys...</p>
                </div>
              ) : generatedKeys.length > 0 ? (
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Generated License Keys
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {generatedKeys.length} key(s) generated • Click to copy
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>Format: XXXX-XXXX-XXXX-XXXX</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {generatedKeys.map((licenseKey, index) => (
                      <div
                        key={licenseKey.key}
                        className={`flex items-center justify-between p-4 bg-white/80 rounded-xl border transition-all duration-200 hover:shadow-md ${
                          isExpired(licenseKey.expiresAt) 
                            ? 'border-red-200 bg-red-50/50' 
                            : licenseKey.currentUsage >= licenseKey.maxDevices
                            ? 'border-orange-200 bg-orange-50/50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm min-w-[32px] min-h-[32px] ${
                            isExpired(licenseKey.expiresAt)
                              ? 'bg-red-100 text-red-600'
                              : licenseKey.currentUsage >= licenseKey.maxDevices
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {generatedKeys.length - index}
                          </div>
                          <div>
                            <span className="font-mono text-lg font-bold text-gray-900">{licenseKey.key}</span>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{licenseKey.duration} year(s)</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{licenseKey.currentUsage}/{licenseKey.maxDevices} devices</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <span>🕒</span>
                                <span>Expires: {formatDate(licenseKey.expiresAt)}</span>
                              </span>
                              {licenseKey.usedDevices.length > 0 && (
                                <span className="flex items-center space-x-1">
                                  <span>👥</span>
                                  <span>{licenseKey.usedDevices.length} user(s)</span>
                                </span>
                              )}
                            </div>
                            {licenseKey.usedDevices.length > 0 && (
                              <div className="mt-2 text-xs text-gray-400">
                                <span>Used by: {licenseKey.usedDevices.map((d: any) => d.userEmail).join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyToClipboard(licenseKey, index)}
                            className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                            title={copiedIndex === index ? "Copied!" : "Copy"}
                          >
                            {copiedIndex === index ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleEditKey(licenseKey)}
                            className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
                            title="Edit Key"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteKey(licenseKey.key)}
                            className="flex items-center justify-center w-10 h-10 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
                            title="Delete Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12 text-center border border-gray-200">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Key className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No License Keys Generated</h3>
                  <p className="text-gray-500 mb-6">
                    Configure your license settings and generate your first license key
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                    <span>⚙️</span>
                    <span>Select duration and devices to get started</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Instructions & Guidelines
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Select Configuration</h4>
                    <p className="text-sm text-gray-600">Choose license duration and number of devices using dropdowns</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Key Format</h4>
                    <p className="text-sm text-gray-600">Generated keys follow format: <code className="bg-blue-100 px-2 py-1 rounded">XXXX-XXXX-XXXX-XXXX</code></p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Copy & Share</h4>
                    <p className="text-sm text-gray-600">Copy keys and share them with your customers</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Database Storage</h4>
                    <p className="text-sm text-gray-600">Keys are stored in database with usage tracking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit License Key</h2>
              <button
                onClick={handleCloseEdit}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Key
                </label>
                <input
                  type="text"
                  value={editingKey.key}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (Years)
                </label>
                <select
                  value={editFormData.duration}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Devices
                </label>
                <select
                  value={editFormData.maxDevices}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, maxDevices: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {deviceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={handleCloseEdit}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
} 