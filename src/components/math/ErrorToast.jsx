import { useState, useEffect, useCallback } from 'react';

/**
 * ErrorToast Component
 * Non-intrusive toast notification for math errors
 * 
 * @param {Object} error - Error object from the math solver
 * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @param {Function} onClose - Callback when toast is closed
 */
export default function ErrorToast({ error, duration = 5000, onClose }) {
  const [visible, setVisible] = useState(false);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (error) {
      setVisible(true);
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [error, duration, handleClose]);

  if (!error) return null;

  // Determine severity from error message
  const getSeverity = () => {
    const msg = (error.message || error.error || '').toLowerCase();
    if (msg.includes('missing') || msg.includes('incomplete')) return 'warning';
    if (msg.includes('invalid') || msg.includes('unbalanced') || msg.includes('error')) return 'error';
    return 'info';
  };

  const severity = getSeverity();

  const severityConfig = {
    warning: { 
      color: 'bg-yellow-500', 
      icon: '⚠️',
      borderColor: 'border-yellow-500'
    },
    error: { 
      color: 'bg-red-500', 
      icon: '❌',
      borderColor: 'border-red-500'
    },
    info: { 
      color: 'bg-blue-500', 
      icon: 'ℹ️',
      borderColor: 'border-blue-500'
    }
  };

  const config = severityConfig[severity];

  return (
    <div className={`toast-container fixed top-5 right-5 z-[9999] max-w-md transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
      <div className={`toast bg-white rounded-xl shadow-2xl flex items-center p-4 gap-4 relative border-l-4 ${config.borderColor}`}>
        <div className="toast-content flex items-center gap-3 flex-1">
          <span className="toast-icon text-2xl">{config.icon}</span>
          <div className="toast-text flex-1">
            <div className="toast-title font-semibold text-gray-800 text-sm leading-tight">
              {error.message || error.user_message || error.error}
            </div>
            {error.suggestion && (
              <div className="toast-subtitle text-xs text-gray-600 mt-1 leading-tight">
                {error.suggestion}
              </div>
            )}
          </div>
        </div>
        <button 
          className="toast-close bg-black bg-opacity-5 hover:bg-opacity-10 text-gray-600 hover:text-gray-800 rounded-full w-7 h-7 flex items-center justify-center text-xl transition-all flex-shrink-0"
          onClick={handleClose}
        >
          ×
        </button>
      </div>
    </div>
  );
}
