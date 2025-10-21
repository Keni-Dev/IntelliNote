import PropTypes from 'prop-types';
import { useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * GlassButton - A glassmorphism button component with multiple variants
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} [props.onClick] - Click handler
 * @param {'primary' | 'secondary' | 'danger'} [props.variant='primary'] - Button style variant
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element}
 */
const GlassButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  className 
}) => {
  const [ripples, setRipples] = useState([]);

  const createRipple = (event) => {
    if (disabled) return;

    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const newRipple = {
      x,
      y,
      size,
      id: Date.now(),
    };

    setRipples((prev) => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    onClick?.(event);
  };

  const variantStyles = {
    primary: cn(
      'bg-indigo-500/20 border-indigo-400/30 text-indigo-100',
      'hover:bg-indigo-500/30 hover:border-indigo-400/50',
      'active:bg-indigo-500/40'
    ),
    secondary: cn(
      'bg-gray-500/20 border-gray-400/30 text-gray-100',
      'hover:bg-gray-500/30 hover:border-gray-400/50',
      'active:bg-gray-500/40'
    ),
    danger: cn(
      'bg-red-500/20 border-red-400/30 text-red-100',
      'hover:bg-red-500/30 hover:border-red-400/50',
      'active:bg-red-500/40'
    ),
  };

  return (
    <button
      onClick={createRipple}
      disabled={disabled}
      className={cn(
        // Base styles
        'relative overflow-hidden',
        'backdrop-blur-xl border',
        'rounded-xl px-6 py-3',
        'font-medium',
        // Shadows
        'shadow-lg shadow-black/5',
        // Transitions
        'transition-all duration-300 ease-in-out',
        // Hover effects
        'hover:shadow-xl hover:shadow-black/10 hover:scale-105',
        // Active state
        'active:scale-95',
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100 active:scale-100',
        // Variant styles
        variantStyles[variant],
        // Custom classes
        className
      )}
    >
      {/* Ripple effect */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
      
      {/* Button content */}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

GlassButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default GlassButton;
