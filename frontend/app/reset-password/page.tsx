'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, CheckCircle, X, ArrowLeft } from 'lucide-react';
import { resetPassword as resetPasswordApi } from '@/http/auth';

interface ResetPasswordData {
  password: string;
  confirmPassword: string;
}

interface ApiResponse {
  success: boolean;
  error?: string;
  message?: string;
}

// Professional Modal Component
function ProfessionalModal({
  title,
  subtitle,
  open,
  onClose,
  children,
  type = 'default',
  size = 'md'
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  type?: 'default' | 'success' | 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  const typeStyles = {
    default: 'bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800',
    success: 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-600',
    error: 'bg-gradient-to-r from-red-600 via-red-700 to-red-600',
    warning: 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600'
  };

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full ${sizeClasses[size]} transform animate-modalSlideIn max-h-[90vh] flex flex-col`}>
        <div className={`${typeStyles[type]} px-8 py-6 rounded-t-3xl relative overflow-hidden flex-shrink-0`}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="relative flex justify-between items-center">
            <div>
              <h2 id="modal-title" className="text-2xl font-bold text-white">{title}</h2>
              {subtitle && <p className="text-white/90 text-sm mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2.5 transition-all duration-300 hover:rotate-90"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="p-8 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// Success Modal
function SuccessModal({ 
  open, 
  onClose 
}: { 
  open: boolean; 
  onClose: () => void; 
}) {
  return (
    <ProfessionalModal
      title="Password Reset Successful!"
      open={open}
      onClose={onClose}
      type="success"
      size="md"
    >
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full animate-ping"></div>
          <CheckCircle className="w-10 h-10 text-emerald-600 relative z-10" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h3>
          <p className="text-gray-600">Your password has been successfully reset. You can now sign in with your new password.</p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          Continue to Sign In
          <ArrowRight className="w-5 h-5 inline ml-2" />
        </button>
      </div>
    </ProfessionalModal>
  );
}

// Loading Overlay
function LoadingOverlay({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{message}</h3>
          <p className="text-gray-500 mt-1">Please wait while we update your password...</p>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<ResetPasswordData>({
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    setMounted(true);
    // Get token from URL params
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      // If no token, redirect to home
      router.replace('/');
    }
  }, [searchParams, router]);

  const checkPasswordStrength = useCallback((password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  }, []);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength < 3) {
      errors.password = 'Password is too weak';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, passwordStrength]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (apiError) {
      setApiError('');
    }
  }, [formErrors, apiError, checkPasswordStrength]);

  const handleSubmit = useCallback(async () => {
    if (isLoading) return;
    if (!validateForm()) return;
    if (!token) {
      setApiError('Invalid reset token');
      return;
    }
    
    setIsLoading(true);
    setApiError('');
    
    try {
      const response = await resetPasswordApi(token, formData.password);
      const result = response.data;
      
      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setApiError(result.message || 'Failed to reset password');
      }
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, validateForm, token, formData.password, router]);

  // Password strength bar
  const renderPasswordStrength = () => {
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = [
      'bg-red-400',
      'bg-orange-400',
      'bg-yellow-400',
      'bg-blue-400',
      'bg-green-500'
    ];
    
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${strengthColors[passwordStrength - 1] || ''}`}
              style={{ width: `${(passwordStrength / 5) * 100}%` }}
            ></div>
          </div>
          <span className={`text-xs font-semibold ${passwordStrength >= 4 ? 'text-green-600' : passwordStrength >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
            {strengthLabels[passwordStrength - 1] || ''}
          </span>
        </div>
      </div>
    );
  };

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-100 to-purple-50 animate-fadeIn overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tr from-blue-400/30 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-indigo-300/20 to-purple-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
        <div className="flex flex-col items-center space-y-8 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto shadow-2xl"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-b-purple-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/devease_logo.svg" alt="Logo" className="w-16 h-16 object-contain drop-shadow-lg animate-logoPop" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-slideInDown drop-shadow-lg">
              Devease Digital
            </h1>
            <h2 className="text-xl md:text-2xl font-bold text-gray-700 animate-slideInUp mt-2 drop-shadow-md">
              Loading...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-300/10 to-purple-300/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-4">
        <div className="max-w-md mx-auto px-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors duration-200 font-medium"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Sign In
            </button>
            <div className="flex items-center">
              <img src="/devease_logo.svg" alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white shadow-lg" />
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent ml-2">
                Devease Digital
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-6">
        <div className="w-full max-w-md">
          {/* Form Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 relative before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-indigo-100/60 before:to-purple-100/40 before:rounded-3xl before:blur-xl before:-z-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <img src="/devease_logo.svg" alt="Logo" className="w-10 h-10 object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
              <p className="text-gray-600">Enter your new password below</p>
            </div>

            {/* Error Display */}
            {apiError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <X className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-sm text-red-700 font-medium">{apiError}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* New Password */}
              <div>
                <label className="block text-base font-bold text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your new password"
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
                      formErrors.password ? 'border-red-500' : 'border-gray-200'
                    }`}
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-500 text-sm mt-2 font-medium">{formErrors.password}</p>
                )}
                {renderPasswordStrength()}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-base font-bold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm your new password"
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
                      formErrors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                    }`}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-2 font-medium">{formErrors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Updating Password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SuccessModal 
        open={showSuccess} 
        onClose={() => {
          setShowSuccess(false);
          router.push('/');
        }} 
      />
      
      {/* Loading Overlay */}
      <LoadingOverlay show={isLoading} message="Updating your password..." />
      
      {/* Global Styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        
        .animate-modalSlideIn {
          animation: modalSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slideInUp {
          animation: slideInUp 1s cubic-bezier(0.4,0,0.2,1) both;
        }
        
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slideInDown {
          animation: slideInDown 1s cubic-bezier(0.4,0,0.2,1) both;
        }
        
        @keyframes logoPop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-logoPop {
          animation: logoPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
             `}</style>
     </div>
   );
 }

// Loading component for Suspense
function ResetPasswordLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-100 to-purple-50 animate-fadeIn overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tr from-blue-400/30 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-indigo-300/20 to-purple-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      <div className="flex flex-col items-center space-y-8 relative z-10">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto shadow-2xl"></div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-b-purple-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/devease_logo.svg" alt="Logo" className="w-16 h-16 object-contain drop-shadow-lg animate-logoPop" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-slideInDown drop-shadow-lg">
            Devease Digital
          </h1>
          <h2 className="text-xl md:text-2xl font-bold text-gray-700 animate-slideInUp mt-2 drop-shadow-md">
            Loading Reset Password...
          </h2>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function ResetPassword() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}