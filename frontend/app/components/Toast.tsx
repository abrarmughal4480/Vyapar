import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg text-white flex items-center space-x-3 transition-all animate-fadeinup
        ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
      role="alert"
    >
      {type === 'success' ? (
        <span className="text-xl">✅</span>
      ) : (
        <span className="text-xl">❌</span>
      )}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 text-white text-lg hover:text-gray-200">×</button>
      <style jsx>{`
        @keyframes fadeinup {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeinup {
          animation: fadeinup 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  );
};

export default Toast; 