import PropTypes from 'prop-types';
import { cn } from '../../lib/utils';

/**
 * GlassInput - A glassmorphism input component with label and error states
 * 
 * @param {Object} props
 * @param {string} [props.type='text'] - Input type
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.value] - Input value
 * @param {Function} [props.onChange] - Change handler
 * @param {string} [props.label] - Label text
 * @param {string} [props.error] - Error message
 * @param {React.ReactNode} [props.icon] - Icon element for left side
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element}
 */
const GlassInput = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  label,
  error,
  icon,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-white/90 mb-2">
          {label}
        </label>
      )}

      {/* Input container */}
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none">
            {icon}
          </div>
        )}

        {/* Input field */}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={cn(
            // Base glass effect
            'w-full backdrop-blur-xl bg-white/10 border',
            // Shape and spacing
            'rounded-xl px-4 py-3',
            icon && 'pl-12', // Extra padding if icon present
            // Text styles
            'text-white placeholder:text-white/50',
            'font-medium',
            // Transitions
            'transition-all duration-300 ease-in-out',
            // Default border
            'border-white/20',
            // Focus state
            'focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50',
            'focus:bg-white/15',
            // Error state
            error && 'border-red-400/50 focus:ring-red-400/50 focus:border-red-400/50',
            // Disabled state
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-300 flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

GlassInput.propTypes = {
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  label: PropTypes.string,
  error: PropTypes.string,
  icon: PropTypes.node,
  className: PropTypes.string,
};

export default GlassInput;
