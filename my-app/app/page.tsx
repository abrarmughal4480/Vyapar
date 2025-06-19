'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Shield, Zap, Users, TrendingUp, CheckCircle, Eye, EyeOff, ArrowRight, Star, Award, Globe, Lock, Smartphone, BarChart3, DollarSign, Clock, Menu, X } from 'lucide-react';

// ✅ Import auth function from lib/auth.ts instead of exporting it here
import { setAuthTokenAndUser } from '../lib/auth';

// Type definitions for better TypeScript support
interface FormData {
  name: string;
  email: string;
  password: string;
  businessName: string;
  phone: string;
  businessType: string;
  address: string;
  gstNumber: string;
  website: string;
}

interface ApiResponse {
  success: boolean;
  error?: string;
  data?: any;
  user?: any;
  message?: string;
}

// ✅ REMOVED: The problematic export function setAuthTokenAndUser
// Now imported from @/lib/auth instead

// Professional Animated Background Component
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-300/10 to-purple-300/10 rounded-full blur-3xl animate-pulse delay-500"></div>
    </div>
  );
}

// Professional Modal Component with glassmorphism
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
      className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full ${sizeClasses[size]} transform animate-modalSlideIn`}>
        <div className={`${typeStyles[type]} px-8 py-6 rounded-t-3xl relative overflow-hidden`}>
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
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}

// Enhanced Success Modal
function SuccessModal({ 
  open, 
  onClose, 
  message, 
  type = 'login' 
}: { 
  open: boolean; 
  onClose: () => void; 
  message: string;
  type?: 'login' | 'signup';
}) {
  return (
    <ProfessionalModal
      title="Welcome to Vypar!"
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
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {type === 'signup' ? 'Account Created Successfully!' : 'Welcome Back!'}
          </h3>
          <p className="text-gray-600">{message}</p>
        </div>
        {type === 'signup' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6 text-left">
            <h4 className="font-bold text-indigo-900 mb-3 flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Quick Start Guide:
            </h4>
            <ul className="text-sm text-indigo-700 space-y-2">
              <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-indigo-500" />Complete your business profile</li>
              <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-indigo-500" />Add your inventory items</li>
              <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-indigo-500" />Create customer records</li>
              <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-indigo-500" />Generate your first invoice</li>
            </ul>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          Continue to Dashboard
          <ArrowRight className="w-5 h-5 inline ml-2" />
        </button>
      </div>
    </ProfessionalModal>
  );
}

// Enhanced Loading Overlay
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
          <p className="text-gray-500 mt-1">Please wait while we set things up...</p>
        </div>
      </div>
    </div>
  );
}

// Enhanced Feature Card with hover effects
function FeatureCard({ icon: Icon, title, description, delay = 0 }: { icon: any; title: string; description: string; delay?: number }) {
  return (
    <div 
      className="group bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-indigo-200 transform hover:-translate-y-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

// Enhanced Testimonial Card
function TestimonialCard({ name, business, quote, rating, avatar }: { name: string; business: string; quote: string; rating: number; avatar?: string }) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
        ))}
      </div>
      <p className="text-gray-700 mb-6 italic leading-relaxed">"{quote}"</p>
      <div className="flex items-center">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-bold text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{business}</p>
        </div>
      </div>
    </div>
  );
}

// Navigation Component
function Navigation({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-200/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-white">V</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent ml-3">Vypar</h1>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">Features</a>
            <a href="#testimonials" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">Reviews</a>
            <a href="#pricing" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">Pricing</a>
            <a href="#support" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">Support</a>
            <button 
              onClick={onSignIn}
              className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
            >
              Sign In
            </button>
            <button 
              onClick={onGetStarted}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-600 hover:text-indigo-600"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="#features" className="block px-3 py-2 text-gray-600 hover:text-indigo-600">Features</a>
              <a href="#testimonials" className="block px-3 py-2 text-gray-600 hover:text-indigo-600">Reviews</a>
              <a href="#pricing" className="block px-3 py-2 text-gray-600 hover:text-indigo-600">Pricing</a>
              <a href="#support" className="block px-3 py-2 text-gray-600 hover:text-indigo-600">Support</a>
              <button onClick={onSignIn} className="block w-full text-left px-3 py-2 text-gray-600 hover:text-indigo-600">Sign In</button>
              <button onClick={onGetStarted} className="block w-full text-left px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg mt-2">Get Started</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default function Home() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    businessName: '',
    phone: '',
    businessType: '',
    address: '',
    gstNumber: '',
    website: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize component
  useEffect(() => {
    setMounted(true);
  }, []);

  // Enhanced validation with password strength
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
    
    if (!formData.email) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Please enter a valid email';
    
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    
    if (!isLogin) {
      if (!formData.businessName) errors.businessName = 'Business name is required';
      if (!formData.phone) errors.phone = 'Phone number is required';
      else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) errors.phone = 'Please enter a valid phone number';
      
      if (currentStep === 2) {
        if (!formData.businessType) errors.businessType = 'Please select your business type';
        if (!agreedToTerms) errors.terms = 'Please accept the terms and conditions';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, isLogin, currentStep, agreedToTerms]);

  // Enhanced input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      if (name === 'businessName' && !isLogin) {
        return {
          ...prev,
          businessName: value,
          name: value,
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
    
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
  }, [formErrors, apiError, checkPasswordStrength, isLogin]);

  // Real authentication functions that work with backend API
  const handleLogin = useCallback(async (email: string, password: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store authentication data for dashboard using the imported function
        setAuthTokenAndUser(result.data.token, result.data.user);
        
        console.log('Login successful, stored auth data:', result.data.user);
        return { success: true, user: result.data.user, data: result.data };
      } else {
        return { success: false, error: result.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please check if the backend server is running.' };
    }
  }, []);

  const handleSignup = useCallback(async (userData: FormData): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: userData.name || userData.businessName,
          businessName: userData.businessName,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store authentication data for dashboard using the imported function
        setAuthTokenAndUser(result.data.token, result.data.user);
        
        console.log('Signup successful, stored auth data:', result.data.user);
        return { success: true, user: result.data.user, data: result.data };
      } else {
        return { success: false, error: result.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error. Please check if the backend server is running.' };
    }
  }, []);

  // Enhanced auth check that uses real authentication
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token');
    const userData = localStorage.getItem('user') || localStorage.getItem('vypar_user_session');
    
    if (!token || !userData) {
      console.log('No authentication found, user needs to login');
      return null;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      // Validate required user data
      if (!parsedUser.id || !parsedUser.email || !parsedUser.businessId) {
        console.log('Invalid user data, clearing storage');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('vypar_auth_token');
        localStorage.removeItem('vypar_user_session');
        localStorage.removeItem('businessId');
        return null;
      }
      
      console.log('Auth check successful:', parsedUser.name || parsedUser.email);
      return {
        token,
        user: parsedUser,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
    } catch (error) {
      console.log('Error parsing user data, clearing storage');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('vypar_auth_token');
      localStorage.removeItem('vypar_user_session');
      localStorage.removeItem('businessId');
      return null;
    }
  }, []);

  // Check if user is already logged in on page load
  useEffect(() => {
    if (mounted) {
      const auth = checkAuth();
      if (auth && auth.user) {
        // User is already logged in, redirect to dashboard
        console.log('User already logged in, redirecting to dashboard');
        router.push('/dashboard');
      }
    }
  }, [mounted, checkAuth, router]);

  // Form submission handler
  const handleSubmit = useCallback(async () => {
    if (isLoading) return;
    if (!validateForm()) return;
    
    setIsLoading(true);
    setApiError('');
    
    try {
      let result;
      
      if (isLogin) {
        result = await handleLogin(formData.email, formData.password);
      } else {
        result = await handleSignup(formData);
      }
      
      if (result.success) {
        setShowSuccess(true);
        
        // Navigate to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setApiError(result.error || 'Something went wrong');
        setTimeout(() => setApiError(''), 15000);
      }
    } catch (error: any) {
      setApiError('Something went wrong. Please try again.');
      setTimeout(() => setApiError(''), 15000);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, validateForm, isLogin, formData, handleLogin, handleSignup, router]);

  // Password strength indicator
  const renderPasswordStrength = () => {
    if (!formData.password) return null;
    
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
    
    return (
      <div className="mt-3">
        <div className="flex space-x-1 mb-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                passwordStrength >= level ? strengthColors[passwordStrength - 1] : 'bg-gray-200'
              }`}
            ></div>
          ))}
        </div>
        <p className={`text-sm font-medium ${passwordStrength >= 3 ? 'text-green-600' : 'text-gray-500'}`}>
          {strengthLabels[passwordStrength - 1] || 'Very Weak'}
        </p>
      </div>
    );
  };

  // Step navigation
  const nextStep = () => {
    if (validateForm()) {
      setCurrentStep(2);
    }
  };

  // Step indicator
  const renderStepIndicator = () => {
    if (isLogin) return null;
    
    const steps = [
      { number: 1, title: 'Account Info', icon: Users },
      { number: 2, title: 'Business Details', icon: Globe }
    ];
    
    return (
      <div className="flex justify-center mb-8">
        <div className="flex items-center">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  currentStep >= step.number 
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>
                <span className={`text-sm mt-2 font-medium ${currentStep >= step.number ? 'text-indigo-600' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-20 h-1 mx-4 rounded-full transition-all duration-300 ${
                  currentStep > step.number ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render loading state during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading Vypar...</p>
        </div>
      </div>
    );
  }

  // Enhanced features data
  const features = [
    {
      icon: DollarSign,
      title: 'Cash & Bank Management',
      description: 'Track multiple accounts, transfers, and cash flow with real-time updates and intelligent insights.'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Get detailed insights with interactive reports, charts, and AI-powered financial analytics.'
    },
    {
      icon: Smartphone,
      title: 'Mobile First Design',
      description: 'Access your data anywhere with our responsive mobile-first design and native apps.'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-grade encryption, automated backups, and SOC 2 compliance for data protection.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized performance with sub-second response times and intelligent caching.'
    },
    {
      icon: Globe,
      title: 'API Integration',
      description: 'Seamlessly integrate with 100+ tools through our comprehensive REST API.'
    }
  ];

  // Enhanced testimonials
  const testimonials = [
    {
      name: 'Rajesh Kumar',
      business: 'Kumar Electronics',
      quote: 'Vypar transformed our cash flow management completely. The analytics helped us increase profits by 40%!',
      rating: 5
    },
    {
      name: 'Priya Sharma',
      business: 'Sharma Textiles',
      quote: 'The backup feature saved our business when our old system crashed. Excellent support team!',
      rating: 5
    },
    {
      name: 'Amit Patel',
      business: 'Patel Trading Co.',
      quote: 'Best business software for small businesses. Simple interface but incredibly powerful features.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Navigation */}
      <Navigation 
        onGetStarted={() => {
          setIsLogin(false);
          setCurrentStep(1);
        }}
        onSignIn={() => {
          setIsLogin(true);
          setCurrentStep(1);
        }}
      />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-2 mb-6 border border-indigo-200 shadow-lg">
                <Award className="w-5 h-5 text-indigo-600 mr-2" />
                <span className="text-sm font-medium text-indigo-600">#1 Business Management Platform</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Manage Your Business
                <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Professionally
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-xl">
                Transform your business with our all-in-one platform for inventory, billing, accounting, and customer management. Join 15,000+ successful businesses.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button 
                  onClick={() => {
                    setIsLogin(false);
                    setCurrentStep(1);
                  }}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 flex items-center justify-center"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                <button 
                  onClick={() => {
                    setIsLogin(true);
                    setCurrentStep(1);
                  }}
                  className="bg-white/80 backdrop-blur-sm text-gray-700 px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 font-bold border border-gray-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Sign In
                </button>
              </div>
              
              <div className="flex items-center justify-center lg:justify-start space-x-8 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="font-medium">Free 30-day trial</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="font-medium">No credit card required</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="font-medium">24/7 support</span>
                </div>
              </div>
            </div>

            {/* Right Column - Auth Form */}
            <div className="relative">
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 lg:p-10 relative z-10">
                {/* Auth Toggle */}
                <div className="flex bg-gray-100 rounded-2xl p-1.5 mb-8">
                  <button
                    onClick={() => { 
                      setIsLogin(true); 
                      setCurrentStep(1);
                      setApiError('');
                    }}
                    className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${
                      isLogin 
                        ? 'bg-white text-gray-900 shadow-lg' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { 
                      setIsLogin(false); 
                      setCurrentStep(1);
                      setApiError('');
                    }}
                    className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${
                      !isLogin 
                        ? 'bg-white text-gray-900 shadow-lg' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Step Indicator */}
                {renderStepIndicator()}

                {/* Error Display */}
                {apiError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-sm text-red-700 font-medium">{apiError}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {currentStep === 1 ? (
                    <>
                      {!isLogin && (
                        <>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Business Name
                            </label>
                            <input
                              type="text"
                              name="businessName"
                              placeholder="Your business name"
                              className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
                                formErrors.businessName ? 'border-red-500' : 'border-gray-200'
                              }`}
                              value={formData.businessName}
                              onChange={handleInputChange}
                            />
                            {formErrors.businessName && (
                              <p className="text-red-500 text-sm mt-1 font-medium">{formErrors.businessName}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              placeholder="+91 98765 43210"
                              className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
                                formErrors.phone ? 'border-red-500' : 'border-gray-200'
                              }`}
                              value={formData.phone}
                              onChange={handleInputChange}
                            />
                            {formErrors.phone && (
                              <p className="text-red-500 text-sm mt-1 font-medium">{formErrors.phone}</p>
                            )}
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          placeholder="your@email.com"
                          className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
                            formErrors.email ? 'border-red-500' : 'border-gray-200'
                          }`}
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                        {formErrors.email && (
                          <p className="text-red-500 text-sm mt-1 font-medium">{formErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="••••••••"
                            className={`w-full px-4 py-3.5 pr-12 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
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
                          <p className="text-red-500 text-sm mt-1 font-medium">{formErrors.password}</p>
                        )}
                        {!isLogin && renderPasswordStrength()}
                      </div>

                      {isLogin ? (
                        <button
                          onClick={handleSubmit}
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Signing in...
                            </>
                          ) : (
                            <>
                              Sign In
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={nextStep}
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          Continue
                          <ArrowRight className="w-5 h-5 inline ml-2" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Business Type
                        </label>
                        <select
                          name="businessType"
                          className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
                            formErrors.businessType ? 'border-red-500' : 'border-gray-200'
                          }`}
                          value={formData.businessType}
                          onChange={handleInputChange}
                        >
                          <option value="">Select business type</option>
                          <option value="retail">Retail Store</option>
                          <option value="wholesale">Wholesale Business</option>
                          <option value="service">Service Provider</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="restaurant">Restaurant/Food</option>
                          <option value="other">Other</option>
                        </select>
                        {formErrors.businessType && (
                          <p className="text-red-500 text-sm mt-1 font-medium">{formErrors.businessType}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            GST Number
                          </label>
                          <input
                            type="text"
                            name="gstNumber"
                            placeholder="Optional"
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                            value={formData.gstNumber}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Website
                          </label>
                          <input
                            type="url"
                            name="website"
                            placeholder="Optional"
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                            value={formData.website}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Business Address
                        </label>
                        <textarea
                          name="address"
                          placeholder="Optional"
                          rows={3}
                          className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-medium"
                          value={formData.address}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={agreedToTerms}
                          onChange={() => setAgreedToTerms(!agreedToTerms)}
                          className="w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-indigo-500 mt-0.5"
                        />
                        <label htmlFor="terms" className="ml-3 text-sm text-gray-700 font-medium">
                          I agree to the <a href="#" className="text-indigo-600 hover:text-indigo-700 font-bold">terms and conditions</a> and <a href="#" className="text-indigo-600 hover:text-indigo-700 font-bold">privacy policy</a>
                        </label>
                      </div>
                      {formErrors.terms && (
                        <p className="text-red-500 text-sm font-medium">{formErrors.terms}</p>
                      )}

                      <div className="flex space-x-4">
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-bold"
                        >
                          Back
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={isLoading || !formData.businessType || !agreedToTerms}
                          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Creating...' : 'Create Account'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white/50 backdrop-blur-sm relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-indigo-100 rounded-full px-6 py-2 mb-6">
              <Zap className="w-5 h-5 text-indigo-600 mr-2" />
              <span className="text-sm font-bold text-indigo-600">POWERFUL FEATURES</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Scale Your Business
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed specifically for modern businesses to streamline operations and boost growth
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Trusted by Thousands</h2>
            <p className="text-xl text-white/90">Join the growing community of successful businesses</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold mb-2">15K+</div>
              <div className="text-white/80 font-medium">Active Users</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold mb-2">₹750Cr+</div>
              <div className="text-white/80 font-medium">Transactions</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold mb-2">99.9%</div>
              <div className="text-white/80 font-medium">Uptime</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold mb-2">24/7</div>
              <div className="text-white/80 font-medium">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-gray-50/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-emerald-100 rounded-full px-6 py-2 mb-6">
              <Star className="w-5 h-5 text-emerald-600 mr-2" />
              <span className="text-sm font-bold text-emerald-600">CUSTOMER REVIEWS</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              What Our Customers
              <span className="block bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Are Saying
              </span>
            </h2>
            <p className="text-xl text-gray-600">Real feedback from real businesses using Vypar</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                name={testimonial.name}
                business={testimonial.business}
                quote={testimonial.quote}
                rating={testimonial.rating}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-purple-100 rounded-full px-6 py-2 mb-6">
              <DollarSign className="w-5 h-5 text-purple-600 mr-2" />
              <span className="text-sm font-bold text-purple-600">TRANSPARENT PRICING</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Choose the Perfect
              <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Plan for You
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 hover:border-indigo-300 transition-all duration-300 relative">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <p className="text-gray-500 mb-6">Perfect for small businesses</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">₹0</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <button 
                  onClick={() => {
                    setIsLogin(false);
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                >
                  Get Started Free
                </button>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Up to 100 transactions
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Basic invoicing
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Inventory management
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Email support
                </li>
                <li className="flex items-center text-gray-400">
                  <X className="w-5 h-5 text-gray-300 mr-3" />
                  Advanced analytics
                </li>
                <li className="flex items-center text-gray-400">
                  <X className="w-5 h-5 text-gray-300 mr-3" />
                  API access
                </li>
              </ul>
            </div>

            {/* Professional Plan */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 text-white relative transform scale-105 shadow-2xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-bold">
                  MOST POPULAR
                </span>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">Professional</h3>
                <p className="text-indigo-100 mb-6">For growing businesses</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">₹999</span>
                  <span className="text-indigo-200">/month</span>
                </div>
                <button 
                  onClick={() => {
                    setIsLogin(false);
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full bg-white text-indigo-600 py-3 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Start Free Trial
                </button>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Unlimited transactions
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Advanced invoicing
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Full inventory management
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Priority support
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Advanced analytics
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Multi-user access
                </li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 hover:border-purple-300 transition-all duration-300 relative">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-gray-500 mb-6">For large organizations</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">₹2999</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <button 
                  onClick={() => {
                    setIsLogin(false);
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-colors font-semibold"
                >
                  Contact Sales
                </button>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Everything in Professional
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Custom integrations
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Dedicated account manager
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  24/7 phone support
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  API access
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Custom reports
                </li>
              </ul>
            </div>
          </div>

          {/* Money Back Guarantee */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center bg-green-50 border border-green-200 rounded-full px-6 py-3">
              <Shield className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-700 font-medium">30-day money-back guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-indigo-50 relative">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Ready to Transform
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Your Business?
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Join thousands of businesses already using Vypar to streamline operations and boost growth
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-md mx-auto">
              <button 
                onClick={() => {
                  setIsLogin(false);
                  setCurrentStep(1);
                  // Scroll to top
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 flex items-center justify-center"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
              <button 
                onClick={() => {
                  setIsLogin(true);
                  setCurrentStep(1);
                  // Scroll to top
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto border-2 border-gray-300 text-gray-700 px-10 py-4 rounded-2xl hover:bg-gray-50 transition-all duration-300 font-bold hover:border-gray-400"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Compact Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-lg font-bold text-white">V</span>
                </div>
                <span className="text-xl font-bold text-white ml-2">Vypar</span>
              </div>
              <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                Transform your business with our all-in-one management platform.
              </p>
              <div className="flex space-x-2">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors cursor-pointer">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors cursor-pointer">
                  <Star className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors cursor-pointer">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2 text-sm">Product</h3>
              <ul className="space-y-1">
                <li><a href="#features" className="hover:text-white transition-colors text-sm">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors text-sm">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-sm">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2 text-sm">Support</h3>
              <ul className="space-y-1">
                <li><a href="#" className="hover:text-white transition-colors text-sm">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-sm">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-sm">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-4 flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs mb-2 md:mb-0">© 2024 Vypar. All rights reserved.</p>
            <div className="flex space-x-4 text-xs">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SuccessModal 
        open={showSuccess} 
        onClose={() => {
          setShowSuccess(false);
          router.push('/dashboard');
        }} 
        message="Welcome to Vypar! Redirecting to your dashboard..." 
        type={isLogin ? 'login' : 'signup'} 
      />
      
      {/* Loading Overlay */}
      <LoadingOverlay show={isLoading} message={isLogin ? "Signing you in..." : "Creating your account..."} />
      
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
        
        html {
          scroll-behavior: smooth;
        }
        
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
}