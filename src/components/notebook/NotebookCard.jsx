import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';

/**
 * NotebookCard - A card component for displaying a notebook
 * Features glassmorphism styling, hover effects, color indicators, and action menu
 * 
 * @param {Object} props
 * @param {Object} props.notebook - Notebook object
 * @param {number} props.notebook.id - Notebook ID
 * @param {string} props.notebook.name - Notebook name
 * @param {string} props.notebook.color - Notebook color (hex)
 * @param {string} props.notebook.updatedAt - Last updated timestamp
 * @param {number} [props.noteCount=0] - Number of notes in the notebook
 * @param {Function} props.onClick - Click handler
 * @param {Function} [props.onEdit] - Edit handler
 * @param {Function} [props.onDelete] - Delete handler
 * @param {Function} [props.onDuplicate] - Duplicate handler
 * @param {number} [props.index=0] - Index for animation delay
 * @returns {JSX.Element}
 */
const NotebookCard = ({ 
  notebook, 
  noteCount = 0, 
  onClick, 
  onEdit,
  onDelete,
  onDuplicate,
  index = 0 
}) => {
  const { name, color, updatedAt } = notebook;
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isLongPressRef = useRef(false);

  // Format the last updated date
  const formattedDate = formatDistanceToNow(new Date(updatedAt), { 
    addSuffix: true 
  });

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Handle touch start for long-press
  const handleTouchStart = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowMenu(true);
      // Provide haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms for long press
  };

  // Handle touch end
  const handleTouchEnd = (e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    // If it was a long press, prevent the click
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Handle touch move (cancel long press if finger moves)
  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Handle click
  const handleClick = (e) => {
    // Don't trigger click if it was a long press or clicking menu
    if (!isLongPressRef.current && !showMenu) {
      onClick(e);
    }
    isLongPressRef.current = false;
  };

  // Handle menu toggle
  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  // Handle menu actions
  const handleMenuAction = (action, e) => {
    e.stopPropagation();
    setShowMenu(false);
    
    switch (action) {
      case 'edit':
        onEdit?.(e);
        break;
      case 'delete':
        onDelete?.(e);
        break;
      case 'duplicate':
        onDuplicate?.(e);
        break;
      default:
        break;
    }
  };

  // Animation variants for entrance
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={cn(
        // Base glass effect
        'relative overflow-hidden',
        'backdrop-blur-xl bg-white/10 border border-white/20',
        // Shape and spacing
        'rounded-2xl p-6',
        // Shadows
        'shadow-lg shadow-black/5',
        // Transitions
        'transition-all duration-300 ease-in-out',
        // Cursor
        'cursor-pointer',
        // Hover effects
        'hover:bg-white/15 hover:border-white/30',
        'hover:shadow-xl hover:shadow-black/10'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      }}
    >
      {/* Color accent bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ backgroundColor: color }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
      />

      {/* Three-dot menu button */}
      <div className="absolute top-4 right-4 z-20" ref={menuRef}>
        <button
          onClick={handleMenuToggle}
          className={cn(
            'p-2 rounded-lg',
            'backdrop-blur-xl bg-white/20 border border-white/30',
            'text-white hover:bg-white/30',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-white/50',
            isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          title="Options"
          aria-label="Notebook options"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" 
            />
          </svg>
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-48 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-lg overflow-hidden"
            >
              {/* Edit Option */}
              {onEdit && (
                <button
                  onClick={(e) => handleMenuAction('edit', e)}
                  className="w-full px-4 py-3 text-left text-text-primary hover:bg-white/10 transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                    />
                  </svg>
                  <span>Edit</span>
                </button>
              )}

              {/* Duplicate Option */}
              {onDuplicate && (
                <button
                  onClick={(e) => handleMenuAction('duplicate', e)}
                  className="w-full px-4 py-3 text-left text-text-primary hover:bg-white/10 transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                    />
                  </svg>
                  <span>Duplicate</span>
                </button>
              )}

              {/* Divider */}
              {(onEdit || onDuplicate) && onDelete && (
                <div className="border-t border-white/10 my-1" />
              )}

              {/* Delete Option */}
              {onDelete && (
                <button
                  onClick={(e) => handleMenuAction('delete', e)}
                  className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                    />
                  </svg>
                  <span>Delete</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Color indicator circle */}
      <div className="flex items-start gap-4 mb-4">
        <motion.div
          className="flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: index * 0.1 + 0.3,
            type: "spring",
            stiffness: 200
          }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center">
            <svg 
              className="w-6 h-6 text-white" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
              />
            </svg>
          </div>
        </motion.div>

        {/* Notebook name */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-text-primary mb-1 truncate">
            {name}
          </h3>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-text-secondary">
          <svg 
            className="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <span className="font-medium">
            {noteCount} {noteCount === 1 ? 'note' : 'notes'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-text-muted">
          <svg 
            className="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span className="text-xs">{formattedDate}</span>
        </div>
      </div>

      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color}20, transparent 70%)`,
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};

NotebookCard.propTypes = {
  notebook: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    updatedAt: PropTypes.string.isRequired,
  }).isRequired,
  noteCount: PropTypes.number,
  onClick: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onDuplicate: PropTypes.func,
  index: PropTypes.number,
};

export default NotebookCard;
