import PropTypes from 'prop-types';
import { useEffect } from 'react';

/**
 * GlassModal - A glassmorphism modal component with backdrop
 * 
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {string} [props.title] - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.className] - Additional CSS classes for content container
 */
const GlassModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  className = ''
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const backdropStyles = `
    fixed
    inset-0
    z-50
    flex
    items-center
    justify-center
    bg-black/50
    backdrop-blur-sm
    animate-fadeIn
    p-4
  `;

  const contentStyles = `
    relative
    backdrop-blur-xl
    bg-white/10
    border border-white/20
    rounded-2xl
    shadow-2xl
    max-w-2xl
    w-full
    max-h-[90vh]
    overflow-hidden
    animate-slideUp
  `;

  const headerStyles = `
    flex
    items-center
    justify-between
    p-6
    border-b border-white/10
  `;

  const bodyStyles = `
    p-6
    overflow-y-auto
    max-h-[calc(90vh-140px)]
  `;

  const closeButtonStyles = `
    p-2
    rounded-lg
    text-white/70
    hover:text-white
    hover:bg-white/10
    transition-all
    duration-200
    focus:outline-none
    focus:ring-2
    focus:ring-white/30
  `;

  return (
    <div
      className={backdropStyles}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`${contentStyles} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={headerStyles}>
          {title && (
            <h2 
              id="modal-title"
              className="text-2xl font-bold text-white"
            >
              {title}
            </h2>
          )}
          
          <button
            onClick={onClose}
            className={closeButtonStyles}
            aria-label="Close modal"
            type="button"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        {/* Body */}
        <div className={bodyStyles}>
          {children}
        </div>
      </div>
    </div>
  );
};

GlassModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default GlassModal;
