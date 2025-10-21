import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Toast - A notification toast component
 * 
 * @param {Object} props
 * @param {string} props.message - Toast message
 * @param {'success' | 'error' | 'info' | 'warning'} [props.type='info'] - Toast type
 * @param {number} [props.duration=3000] - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @param {Function} [props.onClose] - Close callback
 * @param {boolean} [props.isVisible=true] - Visibility control
 * @returns {JSX.Element}
 */
const Toast = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  isVisible = true
}) => {
  const [show, setShow] = useState(isVisible);

  useEffect(() => {
    setShow(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (duration > 0 && show) {
      const timer = setTimeout(() => {
        setShow(false);
        if (onClose) {
          setTimeout(onClose, 300); // Wait for animation to complete
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, show, onClose]);

  const handleClose = () => {
    setShow(false);
    if (onClose) {
      setTimeout(onClose, 300);
    }
  };

  // Type-specific configurations
  const typeConfig = {
    success: {
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-400/30',
      textColor: 'text-emerald-100',
      iconColor: 'text-emerald-400',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    error: {
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-400/30',
      textColor: 'text-red-100',
      iconColor: 'text-red-400',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    warning: {
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-400/30',
      textColor: 'text-amber-100',
      iconColor: 'text-amber-400',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      ),
    },
    info: {
      bgColor: 'bg-indigo-500/20',
      borderColor: 'border-indigo-400/30',
      textColor: 'text-indigo-100',
      iconColor: 'text-indigo-400',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
  };

  const config = typeConfig[type];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={`
            fixed top-4 right-4 z-50
            backdrop-blur-xl border
            rounded-xl
            shadow-lg shadow-black/10
            max-w-md
            ${config.bgColor}
            ${config.borderColor}
          `}
        >
          <div className="flex items-start gap-3 p-4">
            {/* Icon */}
            <div className={`flex-shrink-0 ${config.iconColor}`}>
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {config.icon}
              </svg>
            </div>

            {/* Message */}
            <div className={`flex-1 ${config.textColor}`}>
              <p className="text-sm font-medium">{message}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className={`
                flex-shrink-0 p-1 rounded-lg
                text-white/70 hover:text-white
                hover:bg-white/10
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-white/30
              `}
              aria-label="Close notification"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Progress bar for auto-dismiss */}
          {duration > 0 && (
            <motion.div
              className={`h-1 ${config.iconColor} opacity-50`}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'info', 'warning']),
  duration: PropTypes.number,
  onClose: PropTypes.func,
  isVisible: PropTypes.bool,
};

export default Toast;
