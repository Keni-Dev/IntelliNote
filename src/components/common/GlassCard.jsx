import PropTypes from 'prop-types';
import { cn } from '../../lib/utils';

/**
 * GlassCard - A reusable glassmorphism card component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render inside the card
 * @param {string} [props.className] - Additional CSS classes
 * @param {Function} [props.onClick] - Optional click handler
 * @returns {JSX.Element}
 */
const GlassCard = ({ children, className, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        // Base glass effect
        'backdrop-blur-xl bg-white/10 border border-white/20',
        // Shape and spacing
        'rounded-2xl p-6',
        // Shadows
        'shadow-lg shadow-black/5',
        // Transitions
        'transition-all duration-300 ease-in-out',
        // Hover effects
        'hover:bg-white/15 hover:shadow-xl hover:shadow-black/10',
        // Conditional cursor
        onClick && 'cursor-pointer active:scale-[0.98]',
        // Custom classes
        className
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
    >
      {children}
    </div>
  );
};

GlassCard.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default GlassCard;
