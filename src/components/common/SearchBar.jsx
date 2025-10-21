import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SearchBar Component
 * A glassmorphic search input with icon, clear button, and keyboard shortcut
 * 
 * Features:
 * - Search icon on the left
 * - Clear button (×) on the right when text exists
 * - Keyboard shortcut: Ctrl/Cmd + K to focus
 * - Focus effects with ring
 * - Smooth animations
 * 
 * @param {Object} props
 * @param {string} props.placeholder - Placeholder text for the input
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Callback when value changes
 * @param {Function} props.onClear - Callback when clear button is clicked
 * @param {string} props.className - Additional CSS classes
 */
function SearchBar({ 
  placeholder = 'Search...', 
  value = '', 
  onChange, 
  onClear,
  className = ''
}) {
  const inputRef = useRef(null);

  // Handle keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange({ target: { value: '' } });
    }
    inputRef.current?.focus();
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Search Icon */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg 
          className="w-5 h-5 text-text-secondary group-focus-within:text-indigo-400 transition-colors"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>

      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-12 pr-20 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200"
      />

      {/* Right Side: Clear Button or Keyboard Hint */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <AnimatePresence mode="wait">
          {value ? (
            // Clear Button
            <motion.button
              key="clear"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleClear}
              className="p-1.5 rounded-lg backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 text-text-secondary hover:text-text-primary transition-all duration-200"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          ) : (
            // Keyboard Shortcut Hint
            <motion.div
              key="hint"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-xl bg-white/5 border border-white/10 text-xs text-text-secondary"
            >
              <kbd className="font-mono">⌘</kbd>
              <span>+</span>
              <kbd className="font-mono">K</kbd>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

SearchBar.propTypes = {
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func,
  className: PropTypes.string,
};

export default SearchBar;
