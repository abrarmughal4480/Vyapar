'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Shield, Zap, Users, TrendingUp, CheckCircle, Eye, EyeOff, ArrowRight, Star, Award, Globe, Lock, Smartphone, BarChart3, DollarSign, Clock, Menu, X } from 'lucide-react';
import { register as registerApi, login as loginApi, forgotPassword as forgotPasswordApi, sendOTP, verifyOTPAndRegister } from '@/http/auth';
import PlanAndPricing from './components/PlanAndPricing';

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
      title="Welcome to Devease Digital!"
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
  // Get initials from name
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
        ))}
      </div>
      <p className="text-gray-700 mb-6 italic leading-relaxed">"{quote}"</p>
      <div className="flex items-center justify-center">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
          <span>{initials}</span>
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
    <nav className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-white/80 via-indigo-50/80 to-white/80 shadow-lg shadow-indigo-100 backdrop-blur-md border-b border-gray-200/50 w-full rounded-b-2xl relative before:absolute before:inset-0 before:bg-white/40 before:backdrop-blur-[8px] before:rounded-b-2xl before:pointer-events-none">
      <div className="flex items-center justify-between h-20 w-full px-16 relative z-10">
        {/* Logo - always left */}
        <div className="flex items-center flex-shrink-0 hover:scale-105 transition-transform duration-200 drop-shadow-lg">
          <img src="/devease_logo.svg" alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white shadow-indigo-100 shadow-lg" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent ml-3">Devease Digital</h1>
        </div>

        {/* Nav links + actions - always right */}
        <div className="hidden md:flex items-center space-x-6">
          <a href="#features" className="group text-gray-600 hover:text-indigo-600 transition-colors font-medium relative hover:scale-105 duration-200">
            Features
            <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
          </a>
          <a href="#testimonials" className="group text-gray-600 hover:text-indigo-600 transition-colors font-medium relative hover:scale-105 duration-200">
            Reviews
            <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
          </a>
          <a href="#pricing" className="group text-gray-600 hover:text-indigo-600 transition-colors font-medium relative hover:scale-105 duration-200">
            Pricing
            <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
          </a>
          <a href="#support" className="group text-gray-600 hover:text-indigo-600 transition-colors font-medium relative hover:scale-105 duration-200">
            Support
            <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
          </a>
          <div className="border-l border-gray-300 h-8 mx-4" />
          <button
            onClick={onSignIn}
            className="text-gray-700 font-semibold border border-indigo-200 rounded-lg px-5 py-2.5 bg-white shadow-md hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all duration-200 hover:scale-105"
          >
            Sign In
          </button>
          <button
            onClick={onGetStarted}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl ring-1 ring-indigo-100 hover:ring-4 hover:ring-indigo-300/40 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Get Started
          </button>
        </div>

        {/* Mobile menu button - right */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-gray-600 hover:text-indigo-600 ml-auto"
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
    </nav>
  );
}

// Features section typewriter effect
function FeaturesTypewriterHeading() {
  const fullText = 'Everything You Need to\nScale Your Business';
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    let forward = true;
    let timer: NodeJS.Timeout;
    let cursorTimer: NodeJS.Timeout;
    const totalDuration = 7000; // 7 seconds
    const interval = totalDuration / fullText.length;
    function typeLoop() {
      timer = setInterval(() => {
        if (forward) {
          i++;
          setDisplayed(fullText.slice(0, i));
          if (i >= fullText.length) {
            forward = false;
            clearInterval(timer);
            setTimeout(() => {
              timer = setInterval(() => {
                i--;
                setDisplayed(fullText.slice(0, i));
                if (i <= 0) {
                  forward = true;
                  clearInterval(timer);
                  setTimeout(typeLoop, 400);
                }
              }, interval / 2);
            }, 7000); // Stay for 7 seconds after fully typed
          }
        }
      }, interval);
    }
    typeLoop();
    cursorTimer = setInterval(() => setShowCursor(c => !c), 500);
    return () => {
      clearInterval(timer);
      clearInterval(cursorTimer);
    };
  }, []);

  // Split on \n for two lines
  const [line1, line2Raw] = displayed.split('\n');
  const fullLine2 = 'Scale Your Business';
  const isTypingFirstLine = displayed.length <= fullText.indexOf('\n') || !line2Raw;
  let line2 = line2Raw || '';
  let line2Cursor = null;
  if (!isTypingFirstLine) {
    // Show cursor after the last typed char of line2
    line2Cursor = (
      <span className="inline-block w-2 align-middle">{showCursor ? <span className="animate-blink">|</span> : <span>&nbsp;</span>}</span>
    );
  }
  return (
    <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2 min-h-[3.5em]">
      <span>
        {line1}
        {isTypingFirstLine && (
          <span className="inline-block w-2 align-middle">
            {showCursor ? <span className="animate-blink">|</span> : <span>&nbsp;</span>}
          </span>
        )}
      </span>
      <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent pb-2 leading-[1.15]">
        {line2}
        {(!isTypingFirstLine && line2.length < fullLine2.length) ? line2Cursor : null}
        {(!isTypingFirstLine && line2.length === fullLine2.length) ? line2Cursor : null}
      </span>
      <style jsx>{`
        .animate-blink {
          animation: blink 1s steps(2, start) infinite;
        }
        @keyframes blink {
          to { opacity: 0; }
        }
      `}</style>
    </h2>
  );
}

export default function Home() {
  // All hooks at the top
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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  // All useEffect, useCallback, etc.
  useEffect(() => {
    setMounted(true);
  }, []);

  // OTP resend timer
  useEffect(() => {
    if (otpResendTimer > 0) {
      const timer = setTimeout(() => {
        setOtpResendTimer(otpResendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendTimer]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (
        localStorage.getItem('token') ||
        localStorage.getItem('devease_auth_token') ||
        localStorage.getItem('isAuthenticated') ||
        document.cookie.includes('devease_auth_token')
      ) {
        setCheckingAuth(true);
        router.replace('/dashboard');
      } else {
        setCheckingAuth(false);
      }
    }
  }, [router]);

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

  const handleLogin = useCallback(async (email: string, password: string): Promise<ApiResponse> => {
    try {
      const response = await loginApi({ email, password });
      const result = response.data;
      if (result.success) {
        if (typeof window !== 'undefined' && result.token) {
          localStorage.setItem('token', result.token);
        }
        return { success: true, user: result.data.user, data: result.data };
      } else {
        return { success: false, error: result.message || 'Login failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Network error. Please check if the backend server is running.' };
    }
  }, []);

  const handleSendOTP = useCallback(async (email: string): Promise<ApiResponse> => {
    try {
      const response = await sendOTP(email);
      const result = response.data;
      if (result.success) {
        setOtpSent(true);
        setOtpResendTimer(60); // Start 60 second timer
        
        // Show OTP in development mode
        if (result.otp && process.env.NODE_ENV === 'development') {
          console.log('Development OTP:', result.otp);
          alert(`Development Mode: Your OTP is ${result.otp}`);
        }
        
        return { success: true, message: result.message };
      } else {
        return { success: false, error: result.message || 'Failed to send OTP' };
      }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Network error. Please check if the backend server is running.' };
    }
  }, []);

  const handleVerifyOTPAndRegister = useCallback(async (userData: FormData, otp: string): Promise<ApiResponse> => {
    try {
      const response = await verifyOTPAndRegister({ ...userData, otp });
      const result = response.data;
      if (result.success) {
        if (typeof window !== 'undefined' && result.token) {
          localStorage.setItem('token', result.token);
        }
        return { success: true, user: result.data.user, data: result.data };
      } else {
        return { success: false, error: result.message || 'Registration failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Network error. Please check if the backend server is running.' };
    }
  }, []);

  const handleSignup = useCallback(async (userData: FormData): Promise<ApiResponse> => {
    try {
      const response = await registerApi(userData);
      const result = response.data;
      if (result.success) {
        if (typeof window !== 'undefined' && result.token) {
          localStorage.setItem('token', result.token);
        }
        return { success: true, user: result.data.user, data: result.data };
      } else {
        return { success: false, error: result.message || 'Registration failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Network error. Please check if the backend server is running.' };
    }
  }, []);

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
        if (currentStep === 3) {
          // Verify OTP and register
          if (!otp || otp.length !== 6) {
            setOtpError('Please enter a valid 6-digit OTP');
            setIsLoading(false);
            return;
          }
          result = await handleVerifyOTPAndRegister(formData, otp);
        } else {
          result = await handleSignup(formData);
        }
      }
      if (result.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('user', JSON.stringify(result.user || result.data?.user));
          
          // Start session monitoring immediately after login
          const { default: sessionManager } = await import('../lib/sessionManager');
          sessionManager.startMonitoring();
        }
        setShowSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        if (currentStep === 3) {
          setOtpError(result.error || 'Invalid OTP');
        } else {
          setApiError(result.error || 'Something went wrong');
          setTimeout(() => setApiError(''), 15000);
        }
      }
    } catch (error: any) {
      setApiError('Something went wrong. Please try again.');
      setTimeout(() => setApiError(''), 15000);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, validateForm, isLogin, formData, handleLogin, handleSignup, handleVerifyOTPAndRegister, router, currentStep, otp]);

  const handleForgotPassword = useCallback(async () => {
    if (!forgotPasswordEmail || !/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      setForgotPasswordError('Please enter a valid email address');
      return;
    }
    
    setForgotPasswordLoading(true);
    setForgotPasswordError('');
    
    try {
      const response = await forgotPasswordApi(forgotPasswordEmail);
      const result = response.data;
      
      if (result.success) {
        setForgotPasswordSuccess(true);
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordSuccess(false);
          setForgotPasswordEmail('');
        }, 3000);
      } else {
        setForgotPasswordError(result.message || 'Failed to send reset email');
      }
    } catch (error: any) {
      setForgotPasswordError(error.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  }, [forgotPasswordEmail]);

  // Restore renderStepIndicator
  const renderStepIndicator = () => {
    if (isLogin) return null;
    const steps = [
      { number: 1, title: 'Account Info', icon: Users },
      { number: 2, title: 'Business Details', icon: Globe },
      { number: 3, title: 'Email Verification', icon: CheckCircle }
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

  // Helper: Password strength bar
  const renderPasswordStrength = () => {
    if (isLogin) return null;
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
          <span className={`text-xs font-semibold ${passwordStrength >= 4 ? 'text-green-600' : passwordStrength >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>{strengthLabels[passwordStrength - 1] || ''}</span>
        </div>
      </div>
    );
  };

  // Helper: Go to next step in signup
  const nextStep = async () => {
    if (currentStep === 1) {
      // Validate step 1 fields
      const errors: Record<string, string> = {};
      if (!formData.businessName) errors.businessName = 'Business name is required';
      if (!formData.phone) errors.phone = 'Phone number is required';
      else if (!/^[+]?\d{10,}$/.test(formData.phone)) errors.phone = 'Please enter a valid phone number';
      if (!formData.email) errors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Please enter a valid email';
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
      setFormErrors(errors);
      if (Object.keys(errors).length === 0) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      // Validate step 2 fields
      const errors: Record<string, string> = {};
      if (!formData.businessType) errors.businessType = 'Please select your business type';
      if (!agreedToTerms) errors.terms = 'Please accept the terms and conditions';
      setFormErrors(errors);
      if (Object.keys(errors).length === 0) {
        // Send OTP before moving to step 3
        setOtpLoading(true);
        setOtpError('');
        const result = await handleSendOTP(formData.email);
        setOtpLoading(false);
        if (result.success) {
          setCurrentStep(3);
        } else {
          setOtpError(result.error || 'Failed to send OTP');
        }
      }
    }
  };

  // Only after all hooks:
  if (checkingAuth) {
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
              Welcome to Devease Digital
            </h1>
            <h2 className="text-xl md:text-2xl font-bold text-gray-700 animate-slideInUp mt-2 drop-shadow-md">
               #1 Billing Software
            </h2>
          </div>
        </div>
      </div>
    );
  }
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
              Welcome to Devease Digital
            </h1>
            <h2 className="text-xl md:text-2xl font-bold text-gray-700 animate-slideInUp mt-2 drop-shadow-md">
               #1 Billing Software
            </h2>
          </div>
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
      name: 'Ahmed Ali',
      business: 'Ali Mobile Center',
      quote: 'Devease Digital transformed our cash flow management completely. The analytics helped us increase profits by 40%!',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
    },
    {
      name: 'Fatima Noor',
      business: 'Noor Fabrics',
      quote: 'The backup feature saved our business when our old system crashed. Excellent support team!',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
    },
    {
      name: 'Usman Khan',
      business: 'Khan Super Store',
      quote: 'Best business software for small businesses. Simple interface but incredibly powerful features.',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
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
      <section
        className="relative min-h-screen flex items-center pt-16 pb-8 lg:pt-0 lg:pb-0 overflow-hidden"
        style={{ minHeight: 'calc(100vh - 4rem)', maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Animated background shapes for hero */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-600/20 rounded-full blur-3xl animate-pulse z-0"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tr from-blue-400/30 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000 z-0"></div>
        <div className="container mx-auto px-6 lg:max-w-none lg:px-24 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 h-full w-full">
            {/* Left Column - Content */}
            <div className="w-full lg:w-[60%] text-center lg:text-left h-full flex flex-col justify-center space-y-8">
              <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-2 border border-indigo-200 shadow-lg animate-fadeIn max-w-xs mx-auto lg:mx-0">
                <Award className="w-5 h-5 text-indigo-600 mr-2" />
                <span className="text-sm font-medium text-indigo-600">#1 Business Management Platform</span>
              </div>
              <div>
                <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-4 leading-tight animate-slideInUp">
                  Manage Your Business
                  <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent pb-2 leading-[1.15]">
                    Professionally
                  </span>
                </h1>
                <div className="h-1 w-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 rounded-full mx-auto lg:mx-0 mb-4 animate-fadeIn" />
              </div>
              <p className="text-xl text-gray-600 leading-relaxed max-w-xl animate-fadeIn">
                Transform your business with our all-in-one platform for inventory, billing, accounting, and customer management. Join 1,000+ successful businesses.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-fadeIn">
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
              {/* Trust/Stats Row */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 mt-4 animate-fadeInUp">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-gray-700">1,000+</span>
                  <span className="text-gray-500">Businesses</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-700">₨100Cr+</span>
                  <span className="text-gray-500">Transactions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-700">99.9%</span>
                  <span className="text-gray-500">Uptime</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-gray-700">24/7</span>
                  <span className="text-gray-500">Support</span>
                </div>
              </div>
            </div>

            {/* Right Column - Illustration & Auth Form */}
            <div className="w-full lg:w-[40%] flex items-center justify-center relative">
              {/* Floating business icons illustration */}
              <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                <div className="relative w-[340px] h-[340px]">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-indigo-100/80 to-purple-100/60 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-16 h-16 bg-white/90 rounded-2xl shadow-xl border border-indigo-100 animate-fadeInUp" style={{ animationDelay: '200ms' }}><BarChart3 className="w-8 h-8 text-indigo-600" /></div>
                  <div className="absolute bottom-4 left-8 flex items-center justify-center w-14 h-14 bg-white/90 rounded-2xl shadow-xl border border-purple-100 animate-fadeInUp" style={{ animationDelay: '400ms' }}><Smartphone className="w-7 h-7 text-purple-600" /></div>
                  <div className="absolute top-8 right-8 flex items-center justify-center w-12 h-12 bg-white/90 rounded-2xl shadow-xl border border-blue-100 animate-fadeInUp" style={{ animationDelay: '600ms' }}><Zap className="w-6 h-6 text-blue-600" /></div>
                  <div className="absolute bottom-8 right-8 flex items-center justify-center w-14 h-14 bg-white/90 rounded-2xl shadow-xl border border-green-100 animate-fadeInUp" style={{ animationDelay: '800ms' }}><DollarSign className="w-7 h-7 text-green-600" /></div>
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 flex items-center justify-center w-12 h-12 bg-white/90 rounded-2xl shadow-xl border border-indigo-100 animate-fadeInUp" style={{ animationDelay: '1000ms' }}><Globe className="w-6 h-6 text-indigo-600" /></div>
                </div>
              </div>
              {/* Auth Form */}
              <div className="relative max-w-lg w-full mx-auto h-auto max-h-[90vh] flex flex-col justify-center p-4 md:p-6 rounded-3xl shadow-2xl bg-white/90 backdrop-blur-xl border border-white/20 z-10 my-12 box-border before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-indigo-100/60 before:to-purple-100/40 before:rounded-3xl before:blur-xl before:-z-10">
                {/* Auth Toggle */}
                <div className="flex bg-gray-100 rounded-2xl p-1 mb-4 py-1">
                  <button
                    onClick={() => { 
                      setIsLogin(true); 
                      setCurrentStep(1);
                      setApiError('');
                      setShowForgotPassword(false);
                    }}
                    className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${
                      isLogin && !showForgotPassword
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
                      setShowForgotPassword(false);
                    }}
                    className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${
                      !isLogin && !showForgotPassword
                        ? 'bg-white text-gray-900 shadow-lg' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Step Indicator */}
                <div className="mb-3">{renderStepIndicator()}</div>

                {/* Error Display */}
                {apiError && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-sm text-red-700 font-medium">{apiError}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {showForgotPassword ? (
                    <>
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h3>
                        <p className="text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
                      </div>
                      
                      {forgotPasswordSuccess ? (
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">Email Sent!</h4>
                            <p className="text-gray-600">We've sent a password reset link to <strong>{forgotPasswordEmail}</strong></p>
                          </div>
                          <button
                            onClick={() => {
                              setShowForgotPassword(false);
                              setForgotPasswordSuccess(false);
                              setForgotPasswordEmail('');
                            }}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold"
                          >
                            Back to Sign In
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-base font-bold text-gray-700 mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              placeholder="your@email.com"
                              className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
                                forgotPasswordError ? 'border-red-500' : 'border-gray-200'
                              }`}
                              value={forgotPasswordEmail}
                              onChange={(e) => {
                                setForgotPasswordEmail(e.target.value);
                                if (forgotPasswordError) setForgotPasswordError('');
                              }}
                            />
                            {forgotPasswordError && (
                              <p className="text-red-500 text-sm mt-1 font-medium">{forgotPasswordError}</p>
                            )}
                          </div>
                          
                          <button
                            onClick={handleForgotPassword}
                            disabled={forgotPasswordLoading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            {forgotPasswordLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Sending...
                              </>
                            ) : (
                              <>
                                Send Reset Link
                                <ArrowRight className="w-5 h-5 ml-2" />
                              </>
                            )}
                          </button>
                          
                          <div className="text-center">
                            <button
                              onClick={() => {
                                setShowForgotPassword(false);
                                setForgotPasswordEmail('');
                                setForgotPasswordError('');
                              }}
                              className="text-sm text-gray-600 hover:text-gray-700 font-medium transition-colors duration-200"
                            >
                              ← Back to Sign In
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : currentStep === 1 ? (
                    <>
                      {!isLogin && (
                        <>
                          <div>
                            <label className="block text-base font-bold text-gray-700 mb-1">
                              Business Name
                            </label>
                            <input
                              type="text"
                              name="businessName"
                              placeholder="Your business name"
                              className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
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
                            <label className="block text-base font-bold text-gray-700 mb-1">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              placeholder="+92 312 1234567"
                              className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
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
                        <label className="block text-base font-bold text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          placeholder="your@email.com"
                          className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
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
                        <label className="block text-base font-bold text-gray-700 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="••••••••"
                            className={`w-full px-4 py-2.5 pr-12 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
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
                        <>
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
                          {isLogin && !showForgotPassword && (
                            <div className="text-center mt-3">
                              <button
                                onClick={() => setShowForgotPassword(true)}
                                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-200 hover:underline"
                              >
                                Forgot your password?
                              </button>
                            </div>
                          )}
                        </>
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
                  ) : currentStep === 2 ? (
                    <>
                      <div>
                        <label className="block text-base font-bold text-gray-700 mb-1">
                          Business Type
                        </label>
                        <select
                          name="businessType"
                          className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium ${
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-base font-bold text-gray-700 mb-1">
                            GST Number
                          </label>
                          <input
                            type="text"
                            name="gstNumber"
                            placeholder="Optional"
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                            value={formData.gstNumber}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <label className="block text-base font-bold text-gray-700 mb-1">
                            Website
                          </label>
                          <input
                            type="url"
                            name="website"
                            placeholder="Optional"
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                            value={formData.website}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-base font-bold text-gray-700 mb-1">
                          Business Address
                        </label>
                        <textarea
                          name="address"
                          placeholder="Optional"
                          rows={3}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-medium"
                          value={formData.address}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="flex items-start mt-1">
                        <label className="inline-flex items-center cursor-pointer">
                          <span className="relative w-5 h-5 flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={agreedToTerms}
                              onChange={() => setAgreedToTerms(!agreedToTerms)}
                              className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded transition-colors checked:bg-indigo-600 checked:border-indigo-600 checked:ring-2 checked:ring-indigo-400 focus:outline-none"
                            />
                            <svg
                              className="pointer-events-none absolute inset-0 w-5 h-5 opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="white"
                              strokeWidth="2.5"
                            >
                              <polyline points="5 11 9 15 15 7" />
                            </svg>
                          </span>
                          <span className="ml-3 text-sm text-gray-700 font-medium">
                            I agree to the <a href="#" className="text-indigo-600 hover:text-indigo-700 font-bold">terms and conditions</a> and <a href="#" className="text-indigo-600 hover:text-indigo-700 font-bold">privacy policy</a>
                          </span>
                        </label>
                      </div>
                      {formErrors.terms && (
                        <p className="text-red-500 text-sm font-medium mt-1">{formErrors.terms}</p>
                      )}

                      <div className="flex space-x-4">
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-bold"
                        >
                          Back
                        </button>
                        <button
                          onClick={nextStep}
                          disabled={otpLoading || !formData.businessType || !agreedToTerms}
                          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {otpLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Sending OTP...
                            </>
                          ) : (
                            <>
                               Continue
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                          )}
                        </button>
                      </div>
                      {otpError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                          <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                            <X className="w-4 h-4 text-red-500" />
                          </div>
                          <p className="text-sm text-red-700 font-medium">{otpError}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h3>
                        <p className="text-gray-600">We've sent a 6-digit verification code to <strong>{formData.email}</strong></p>
                      </div>
                      
                      <div>
                        <label className="block text-base font-bold text-gray-700 mb-1">
                          Enter Verification Code
                        </label>
                        <input
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium text-center text-2xl tracking-widest ${
                            otpError ? 'border-red-500' : 'border-gray-200'
                          }`}
                          value={otp}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setOtp(value);
                            if (otpError) setOtpError('');
                          }}
                        />
                        {otpError && (
                          <p className="text-red-500 text-sm mt-1 font-medium">{otpError}</p>
                        )}
                      </div>

                      <div className="text-center mt-4">
                        <p className="text-sm text-gray-500 mb-2">
                          Didn't receive the code? 
                          {otpResendTimer > 0 ? (
                            <span className="text-gray-400"> Resend in {otpResendTimer}s</span>
                          ) : (
                            <button
                              onClick={async () => {
                                setOtpLoading(true);
                                setOtpError('');
                                const result = await handleSendOTP(formData.email);
                                setOtpLoading(false);
                                if (!result.success) {
                                  setOtpError(result.error || 'Failed to resend OTP');
                                }
                              }}
                              disabled={otpLoading}
                              className="text-indigo-600 hover:text-indigo-700 font-medium ml-1 hover:underline disabled:opacity-50"
                            >
                              Resend Code
                            </button>
                          )}
                        </p>
                      </div>

                      <div className="flex space-x-4">
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-bold"
                        >
                          Back
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={isLoading || !otp || otp.length !== 6}
                          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Verifying...
                            </>
                          ) : (
                            <>
                              Verify
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                          )}
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
      <section id="features" className="py-24 bg-white/50 backdrop-blur-sm relative min-h-screen">
        <div className="w-full">
          <div className="text-center mb-16 animate-fadeInUp">
            <div className="inline-flex items-center bg-indigo-100 rounded-full px-6 py-2 mb-6">
              <Zap className="w-5 h-5 text-indigo-600 mr-2" />
              <span className="text-sm font-bold text-indigo-600">POWERFUL FEATURES</span>
            </div>
            <FeaturesTypewriterHeading />
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mt-2">
              Powerful features designed specifically for modern businesses to streamline operations and boost growth
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-8 ml-10 mr-10 w-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="animate-fadeInUp w-full"
                style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'both' }}
              >
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 bg-black/20 z-0"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-600/20 rounded-full blur-3xl animate-pulse z-0"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tr from-blue-400/30 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000 z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10 animate-fadeInUp">
            <h2 className="text-4xl font-bold text-white mb-3">Trusted by Hundreds</h2>
            <p className="text-lg text-indigo-100 mb-2 animate-fadeInUp delay-200">Join 1,000+ businesses who trust Devease Digital for their daily operations</p>
            <p className="text-base text-white/80 animate-fadeInUp delay-400">Your business is in safe hands with our secure, reliable, and scalable platform.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8 text-center text-white">
            {[{
              value: '1K+',
              label: 'Active Users'
            }, {
              value: '₨100Cr+',
              label: 'Transactions'
            }, {
              value: '99.9%',
              label: 'Uptime'
            }, {
              value: '24/7',
              label: 'Support'
            }].map((stat, idx) => (
              <div
                key={stat.label}
                className="bg-white/20 backdrop-blur-lg rounded-2xl p-10 border border-white/30 shadow-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl animate-fadeInUp"
                style={{ animationDelay: `${idx * 120 + 400}ms`, animationFillMode: 'both' }}
              >
                <div className="text-4xl lg:text-5xl font-extrabold mb-2 drop-shadow-lg">{stat.value}</div>
                <div className="text-white/90 font-semibold text-lg tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-gray-50/50 backdrop-blur-sm relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-emerald-400/30 to-blue-600/20 rounded-full blur-3xl animate-pulse z-0"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-400/30 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000 z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10 animate-fadeInUp">
            <div className="inline-flex items-center bg-emerald-100 rounded-full px-6 py-2 mb-6">
              <Star className="w-5 h-5 text-emerald-600 mr-2" />
              <span className="text-sm font-bold text-emerald-600">CUSTOMER REVIEWS</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              What Our Customers
              <span className="block bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent pb-2 leading-[1.15]">
                Are Saying
              </span>
            </h2>
            <p className="text-lg text-emerald-700 mb-2 animate-fadeInUp delay-200">Real feedback from real businesses using Devease Digital</p>
            <p className="text-base text-gray-600 animate-fadeInUp delay-400">We're proud to help thousands of businesses grow and succeed every day.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 gap-x-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="animate-fadeInUp"
                style={{ animationDelay: `${index * 120 + 400}ms`, animationFillMode: 'both' }}
              >
                <TestimonialCard
                  name={testimonial.name}
                  business={testimonial.business}
                  quote={testimonial.quote}
                  rating={testimonial.rating}
                  avatar={testimonial.avatar}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PlanAndPricing 
        onGetStarted={() => {
                    setIsLogin(false);
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
      />

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-indigo-50 relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-600/20 rounded-full blur-3xl animate-pulse z-0"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tr from-blue-400/30 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000 z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="max-w-4xl mx-auto animate-fadeInUp">
            <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-4">
              Ready to Transform
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent pb-2 leading-[1.15]">
                Your Business?
              </span>
            </h2>
            <p className="text-xl text-indigo-700 mb-6 animate-fadeInUp delay-200">
              Join thousands of businesses already using Devease Digital to streamline operations and boost growth
            </p>
            <p className="text-base text-gray-600 mb-10 animate-fadeInUp delay-400">
              Get started today and see the difference for yourself.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-md mx-auto">
              <button 
                onClick={() => {
                  setIsLogin(false);
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 flex items-center justify-center animate-fadeInUp delay-600"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
              <button 
                onClick={() => {
                  setIsLogin(true);
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto border-2 border-gray-300 text-gray-700 px-10 py-4 rounded-2xl hover:bg-gray-50 transition-all duration-300 font-bold hover:border-gray-400 animate-fadeInUp delay-800"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Compact Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-gray-400 py-8 overflow-hidden animate-fadeInUp relative">
        <div className="px-10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <img src="/devease_logo.svg" alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white" />
                </div>
                <span className="text-xl font-bold text-white ml-2">Devease Digital</span>
              </div>
              <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                Transform your business with our all-in-one management platform.
              </p>
              <div className="flex space-x-2 mt-2">
                <a href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors cursor-pointer" aria-label="Website">
                  <Globe className="w-4 h-4" />
                </a>
                <a href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors cursor-pointer" aria-label="Facebook">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0"/></svg>
                </a>
                <a href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors cursor-pointer" aria-label="Twitter">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724c-.951.564-2.005.974-3.127 1.195a4.92 4.92 0 0 0-8.384 4.482C7.691 8.095 4.066 6.13 1.64 3.161c-.542.929-.856 2.01-.857 3.17 0 2.188 1.115 4.117 2.823 5.254a4.904 4.904 0 0 1-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.936 4.936 0 0 1-2.224.084c.627 1.956 2.444 3.377 4.6 3.417A9.867 9.867 0 0 1 0 21.543a13.94 13.94 0 0 0 7.548 2.209c9.057 0 14.009-7.496 14.009-13.986 0-.213-.005-.425-.014-.636A9.936 9.936 0 0 0 24 4.557z"/></svg>
                </a>
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
            <div>
              <h3 className="font-bold text-white mb-2 text-sm">Legal</h3>
              <ul className="space-y-1">
                <li><a href="#" className="hover:text-white transition-colors text-sm">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-sm">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-sm">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-4 flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs mb-2 md:mb-0">© 2025 Devease Digital. All rights reserved.</p>
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
        message="Welcome to Devease Digital! Redirecting to your dashboard..." 
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
        
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slideInUp {
          animation: slideInUp 1s cubic-bezier(0.4,0,0.2,1) both;
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.8s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </div>
  );
}