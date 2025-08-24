'use client';

import { CheckCircle, X, DollarSign, Shield, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { activateLicenseKey, checkLicenseStatus, clearUserLicense } from '@/http/license-keys';

interface PlanAndPricingProps {
  onGetStarted: () => void;
}

export default function PlanAndPricing({ onGetStarted }: PlanAndPricingProps) {
  const [showLicenseActivation, setShowLicenseActivation] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState('');
  const [activationType, setActivationType] = useState<'working' | 'success' | 'error' | ''>('');
  const [userLicenseStatus, setUserLicenseStatus] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isEditingLicense, setIsEditingLicense] = useState(false);
  const [isClearingLicense, setIsClearingLicense] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleInputChange = (value: string) => {
    // Remove any non-alphanumeric characters and convert to uppercase
    const cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Limit to 16 characters
    if (cleanValue.length <= 16) {
      setLicenseKey(cleanValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    console.log('Pasted text:', pastedText);
    
    // Extract license key from pasted text
    let extractedKey = '';
    
    // Pattern 1: Direct license key format (XXXX-XXXX-XXXX-XXXX)
    const directMatch = pastedText.match(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
    if (directMatch) {
      extractedKey = directMatch[0].replace(/-/g, '');
    }
    
    // Pattern 2: License Key: XXXXXXXX format
    const keyMatch = pastedText.match(/License Key:\s*([A-Z0-9-]+)/);
    if (keyMatch) {
      extractedKey = keyMatch[1].replace(/-/g, '');
    }
    
    // Pattern 3: Just the key without dashes
    const cleanMatch = pastedText.match(/[A-Z0-9]{16}/);
    if (cleanMatch && !extractedKey) {
      extractedKey = cleanMatch[0];
    }
    
    console.log('Extracted key:', extractedKey);
    
    if (extractedKey && extractedKey.length === 16) {
      setLicenseKey(extractedKey);
      setActivationType('success');
      setActivationMessage('License key detected from clipboard!');
      setTimeout(() => {
        setActivationType('');
        setActivationMessage('');
      }, 2000);
    } else {
      // If no valid key found, use normal paste behavior
      const cleanValue = pastedText.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (cleanValue.length <= 16) {
        setLicenseKey(cleanValue);
      }
    }
  };

  const formatLicenseKey = (key: string) => {
    // Add dashes after every 4 characters
    return key.replace(/(.{4})/g, '$1-').replace(/-$/, '');
  };

  const handleActivate = async () => {
    if (!isKeyComplete || isActivating) return;

    console.log('=== License Activation Debug ===');
    console.log('License Key:', licenseKey);
    console.log('Is Key Complete:', isKeyComplete);
    
    // Check authentication
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('Token exists:', !!token);
    console.log('User exists:', !!user);
    
    if (!token) {
      setActivationType('error');
      setActivationMessage('Please login first to activate license key');
      return;
    }

    setIsActivating(true);
    setActivationType('working');
    setActivationMessage('Validating license key...');

    try {
      // Get device info
      const deviceInfo = `${navigator.userAgent} - ${navigator.platform}`;
      console.log('Device Info:', deviceInfo);
      
      console.log('Sending activation request...');
      console.log('License key being sent:', licenseKey);
      console.log('License key length:', licenseKey.length);
      console.log('Formatted license key:', formatLicenseKey(licenseKey));
      
      // Try both formats: with and without dashes
      const keyWithDashes = formatLicenseKey(licenseKey);
      const keyWithoutDashes = licenseKey;
      
      console.log('Trying key with dashes:', keyWithDashes);
      console.log('Trying key without dashes:', keyWithoutDashes);
      
      const response = await activateLicenseKey({
        key: keyWithDashes, // Send with dashes as stored in database
        deviceInfo
      });
      
      console.log('Activation response:', response);

      if (response.success) {
        setActivationType('success');
        setActivationMessage('License activated successfully!');
        
        // Refresh license status
        try {
          console.log('Refreshing license status...');
          const statusResponse = await checkLicenseStatus();
          console.log('Status response:', statusResponse);
          setUserLicenseStatus(statusResponse.data);
        } catch (error) {
          console.error('Error refreshing license status:', error);
        }
        
        // Clear the form after successful activation
        setTimeout(() => {
          setLicenseKey('');
          setShowLicenseActivation(false);
          setActivationType('');
          setActivationMessage('');
          
          // Refresh the entire page after successful license activation
          console.log('Refreshing page after successful license activation...');
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Activation error:', error);
      console.error('Error response:', error.response);
      setActivationType('error');
      setActivationMessage(error.message || 'Failed to activate license key');
    } finally {
      setIsActivating(false);
    }
  };

  const isKeyComplete = licenseKey.length === 16;

  // Clear user's license
  const handleClearLicense = async () => {
    if (!confirm('Are you sure you want to clear your license? This action cannot be undone.')) {
      return;
    }

    setIsClearingLicense(true);
    try {
      const response = await clearUserLicense();
      if (response.success) {
        // Refresh license status
        const statusResponse = await checkLicenseStatus();
        setUserLicenseStatus(statusResponse.data);
        setShowClearConfirm(false);
        
        // Show success message
        alert('License cleared successfully!');
      }
    } catch (error: any) {
      console.error('Error clearing license:', error);
      alert('Failed to clear license: ' + error.message);
    } finally {
      setIsClearingLicense(false);
    }
  };

  // Check user's license status on component mount
  useEffect(() => {
    const checkUserLicense = async () => {
      console.log('=== License Status Check Debug ===');
      
      // Check authentication first
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      console.log('Token exists:', !!token);
      console.log('User exists:', !!user);
      
      if (!token) {
        console.log('No token found, skipping license status check');
        setUserLicenseStatus({
          hasValidLicense: false,
          message: 'Please login to check license status'
        });
        return;
      }
      
      setIsCheckingStatus(true);
      try {
        console.log('Checking license status...');
        const response = await checkLicenseStatus();
        console.log('License status response:', response);
        setUserLicenseStatus(response.data);
        
        // Prefill license key if user has an active license
        if (response.data?.hasValidLicense && response.data?.license?.key) {
          setLicenseKey(response.data.license.key.replace(/-/g, ''));
        }
      } catch (error: any) {
        console.error('Error checking license status:', error);
        console.error('Error response:', error.response);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkUserLicense();
  }, []);

  // Show loading state while checking license status
  if (isCheckingStatus) {
    return (
      <section id="pricing" className="py-24 bg-white relative overflow-hidden min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Loading Pricing
              <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent pb-2 leading-[1.15]">
                Information
              </span>
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Please wait while we load your plan details...
            </p>
            <div className="flex justify-center">
              <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (showLicenseActivation) {
    return (
      <section id="pricing" className="py-24 bg-white relative overflow-hidden min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <button
              onClick={() => setShowLicenseActivation(false)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-6 inline-flex items-center"
            >
              ← Back to Plans
            </button>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white font-bold">🔑</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              License Key
              <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent pb-2 leading-[1.15]">
                Activation
              </span>
            </h2>
            <p className="text-lg text-purple-700 mb-2">
              {userLicenseStatus?.hasValidLicense 
                ? 'Your current license key' 
                : 'Enter your 16-character license key to activate your plan'
              }
            </p>
            
            {!isCheckingStatus && !localStorage.getItem('token') && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-yellow-600 mr-2" />
                  <div>
                    <h3 className="font-semibold text-yellow-800">Login Required</h3>
                    <p className="text-sm text-yellow-700">
                      Please login to activate your license key
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-3xl border-2 border-gray-200 p-10 shadow-xl">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={19}
                    value={formatLicenseKey(licenseKey)}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onPaste={handlePaste}
                    disabled={userLicenseStatus?.hasValidLicense && !isEditingLicense}
                    className={`w-full h-16 text-center text-xl font-mono font-bold border-2 rounded-lg transition-all uppercase px-4 ${
                      userLicenseStatus?.hasValidLicense && !isEditingLicense
                        ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                  />
                </div>

                <div className="text-center">
                  {userLicenseStatus?.hasValidLicense && !isEditingLicense ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => setIsEditingLicense(true)}
                        className="w-full py-3 px-6 rounded-xl font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200"
                      >
                        Change License Key
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={handleActivate}
                        disabled={!isKeyComplete || isActivating}
                        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center ${
                          isKeyComplete && !isActivating
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isActivating ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Activating...
                          </>
                        ) : (
                          'Activate License'
                        )}
                      </button>
                      {isEditingLicense && (
                        <button
                          onClick={() => {
                            setIsEditingLicense(false);
                            // Reset to original license key if available
                            if (userLicenseStatus?.license?.key) {
                              setLicenseKey(userLicenseStatus.license.key.replace(/-/g, ''));
                            }
                          }}
                          className="w-full py-2 px-4 rounded-lg font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Activation Status Popup */}
                {activationType && (
                  <div className={`p-4 rounded-lg border-2 ${
                    activationType === 'working' 
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : activationType === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center">
                      {activationType === 'working' && (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      )}
                      {activationType === 'success' && (
                        <CheckCircle className="w-5 h-5 mr-2" />
                      )}
                      {activationType === 'error' && (
                        <X className="w-5 h-5 mr-2" />
                      )}
                      <span className="font-medium">{activationMessage}</span>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Need a license key?</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Contact our sales team to get your license key or upgrade your plan.
                  </p>
                  <button 
                    onClick={() => setShowLicenseActivation(false)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Plans →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 bg-white relative overflow-hidden min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {userLicenseStatus?.hasValidLicense ? (
          // Active License View
          <div className="text-center">
            <div className="inline-flex items-center bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-full px-6 py-3 mb-8 shadow-sm">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <span className="text-green-800 font-medium">LICENSE ACTIVE</span>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Your License is
              <span className="block bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent pb-2 leading-[1.15]">
                Active & Ready
              </span>
            </h2>
            
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
              Congratulations! Your license is successfully activated and you have access to all premium features.
            </p>
            
            {/* License Details Card */}
            <div className="max-w-4xl mx-auto bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/80 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔑</span>
                  </div>
                  <h3 className="font-bold text-green-800 mb-2">License Key</h3>
                  <p className="text-lg font-mono text-green-700 bg-white px-3 py-2 rounded-lg border">
                    {userLicenseStatus?.license?.key || 'N/A'}
                  </p>
                </div>
                
                <div className="bg-white/80 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📅</span>
                  </div>
                  <h3 className="font-bold text-blue-800 mb-2">Expires On</h3>
                  <p className="text-lg text-blue-700">
                    {userLicenseStatus?.license?.expiresAt 
                      ? new Date(userLicenseStatus.license.expiresAt).toLocaleDateString()
                      : 'N/A'
                    }
                  </p>
                </div>
                
                <div className="bg-white/80 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="font-bold text-purple-800 mb-2">Status</h3>
                  <div className="flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-lg font-medium text-green-700">Active</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-green-200">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setShowLicenseActivation(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
                  >
                    Manage License
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear License
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Original Pricing View (when no active license)
          <>
            <div className="text-center mb-10 animate-fadeInUp">
              <div className="inline-flex items-center bg-purple-100 rounded-full px-6 py-2 mb-6">
                <DollarSign className="w-5 h-5 text-purple-600 mr-2" />
                <span className="text-sm font-bold text-purple-600">TRANSPARENT PRICING</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
                Choose Your
                <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent pb-2 leading-[1.15]">
                  Device Plan
                </span>
              </h2>
              <p className="text-lg text-purple-700 mb-2 animate-fadeInUp delay-200">Flexible device-based licensing for your business needs.</p>
              <p className="text-base text-gray-600 animate-fadeInUp delay-400">Choose between single device, multi-device, and business pro plans.</p>
              
              {/* License Key Link */}
              <div className="mt-6">
                <button
                  onClick={() => setShowLicenseActivation(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                >
                  Already have a license key? Activate here
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6">
              {/* Single Device - Desktop - 1 Year */}
              <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-lg rounded-3xl border-2 border-gray-200 p-8 shadow-xl transition-transform duration-300 hover:scale-105 hover:border-blue-300 animate-fadeInUp" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Single Device</h3>
                  <p className="text-gray-500 mb-4 text-sm">Desktop Only</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-gray-900">PKR 18,000</span>
                    <span className="text-gray-500 text-sm block">1 Year</span>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Get Started
                  </button>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    1 Desktop Device
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Full Feature Access
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Unlimited Transactions
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Priority Support
                  </li>
                </ul>
              </div>

              {/* Single Device - Desktop - 3 Years */}
              <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-lg rounded-3xl border-2 border-gray-200 p-8 shadow-xl transition-transform duration-300 hover:scale-105 hover:border-green-300 animate-fadeInUp" style={{ animationDelay: '520ms', animationFillMode: 'both' }}>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Single Device</h3>
                  <p className="text-gray-500 mb-4 text-sm">Desktop Only</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-gray-900">PKR 40,000</span>
                    <span className="text-gray-500 text-sm block">3 Years</span>
                    <span className="text-green-600 text-xs font-medium">Save PKR 14,000</span>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors font-semibold"
                  >
                    Get Started
                  </button>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    1 Desktop Device
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Full Feature Access
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Unlimited Transactions
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Priority Support
                  </li>
                </ul>
              </div>

              {/* Desktop + Mobile - 1 Year */}
              <div className="w-full max-w-lg mx-auto bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl p-10 text-white relative shadow-2xl border-2 border-purple-400 scale-105 animate-fadeInUp" style={{ animationDelay: '640ms', animationFillMode: 'both' }}>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">Desktop + Mobile</h3>
                  <p className="text-purple-100 mb-4 text-sm">1 Desktop + 1 Mobile</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">PKR 23,000</span>
                    <span className="text-purple-200 text-sm block">1 Year</span>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full bg-white text-purple-600 py-3 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Get Started
                  </button>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    1 Desktop Device
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    1 Mobile Device
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Full Feature Access
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Priority Support
                  </li>
                </ul>
              </div>

              {/* Desktop + Mobile - 3 Years */}
              <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-lg rounded-3xl border-2 border-gray-200 p-8 shadow-xl transition-transform duration-300 hover:scale-105 hover:border-indigo-300 animate-fadeInUp" style={{ animationDelay: '760ms', animationFillMode: 'both' }}>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Desktop + Mobile</h3>
                  <p className="text-gray-500 mb-4 text-sm">1 Desktop + 1 Mobile</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-gray-900">PKR 45,000</span>
                    <span className="text-gray-500 text-sm block">3 Years</span>
                    <span className="text-green-600 text-xs font-medium">Save PKR 24,000</span>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition-colors font-semibold"
                  >
                    Get Started
                  </button>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    1 Desktop Device
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    1 Mobile Device
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Full Feature Access
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Priority Support
                  </li>
                </ul>
              </div>
            </div>

            {/* Business Pro Cards - Split into two parts */}
            <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Business Pro - 1 Year */}
              <div className="w-full max-w-lg mx-auto bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-10 text-white shadow-2xl border-2 border-orange-400 animate-fadeInUp" style={{ animationDelay: '880ms', animationFillMode: 'both' }}>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">Business Pro</h3>
                  <p className="text-orange-100 mb-4">2 Desktop + 1 Mobile</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">PKR 26,500</span>
                    <span className="text-orange-200 text-sm block">1 Year</span>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full bg-white text-orange-600 py-3 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Get Started
                  </button>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    2 Desktop Devices
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    1 Mobile Device
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Full Feature Access
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Priority Support
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Multi-User Management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Advanced Analytics
                  </li>
                </ul>
              </div>

              {/* Business Pro - 3 Years */}
              <div className="w-full max-w-lg mx-auto bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl p-10 text-white shadow-2xl border-2 border-red-400 animate-fadeInUp" style={{ animationDelay: '1000ms', animationFillMode: 'both' }}>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">Business Pro</h3>
                  <p className="text-red-100 mb-4">2 Desktop + 1 Mobile</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">PKR 48,000</span>
                    <span className="text-red-200 text-sm block">3 Years</span>
                    <span className="text-yellow-300 text-xs font-medium">Save PKR 31,500</span>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full bg-white text-red-600 py-3 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Get Started
                  </button>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    2 Desktop Devices
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    1 Mobile Device
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Full Feature Access
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Priority Support
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Multi-User Management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Advanced Analytics
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Clear License Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Clear License
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to clear your license? This action will remove your current license and you'll need to activate a new one to continue using premium features.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearLicense}
                  disabled={isClearingLicense}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isClearingLicense
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isClearingLicense ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Clearing...
                    </>
                  ) : (
                    'Clear License'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
} 