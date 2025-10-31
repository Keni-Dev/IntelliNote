import PropTypes from 'prop-types';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { Check, X, Plus } from 'lucide-react';

/**
 * VariableTooltip - Lightweight tooltip that appears when a variable assignment is detected
 * Shows near the written equation as a small bubble card
 * Follows canvas pan and zoom transformations
 */
const VariableTooltip = ({
  variableName,
  value,
  position,
  bounds,
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  onAddVariable,
  onJustDisplay,
  onCancel,
}) => {
  // Format variable name with LaTeX for subscripts
  const formatName = (name) => {
    return name.replace(/_(\w+)/g, '_{$1}');
  };

  // Calculate screen position from canvas bounds
  // If bounds are provided, use them; otherwise fall back to position
  const screenX = bounds 
    ? bounds.maxX * zoom + panOffset.x + 10 
    : position.x;
  const screenY = bounds 
    ? bounds.centerY * zoom + panOffset.y 
    : position.y;

  return (
    <div
      className="fixed z-50 animate-fadeIn"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: 'translateY(-50%)',
      }}
    >
      <div className="bg-gradient-to-br from-blue-600/95 to-indigo-600/95 backdrop-blur-xl rounded-xl shadow-2xl border-2 border-blue-400/50 p-3 max-w-xs">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <p className="text-xs font-semibold text-white">Variable detected</p>
        </div>

        {/* Content */}
        <div className="bg-black/20 rounded-lg p-2 mb-3">
          <div className="text-center text-white text-lg font-semibold">
            <InlineMath math={`${formatName(variableName)} = ${value}`} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onAddVariable(variableName, value)}
            className="flex-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 border border-white/30"
            title="Add to variables list"
          >
            <Check className="w-3 h-3" />
            Add
          </button>
          <button
            onClick={onJustDisplay}
            className="flex-1 px-3 py-1.5 bg-black/20 hover:bg-black/30 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 border border-white/20"
            title="Just display"
          >
            Display
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-all border border-red-400/30"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Arrow pointer */}
        <div
          className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2 w-0 h-0"
          style={{
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '8px solid rgba(59, 130, 246, 0.95)',
          }}
        />
      </div>
    </div>
  );
};

VariableTooltip.propTypes = {
  variableName: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  bounds: PropTypes.shape({
    minX: PropTypes.number.isRequired,
    minY: PropTypes.number.isRequired,
    maxX: PropTypes.number.isRequired,
    maxY: PropTypes.number.isRequired,
    centerX: PropTypes.number.isRequired,
    centerY: PropTypes.number.isRequired,
  }),
  zoom: PropTypes.number,
  panOffset: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }),
  onAddVariable: PropTypes.func.isRequired,
  onJustDisplay: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default VariableTooltip;
