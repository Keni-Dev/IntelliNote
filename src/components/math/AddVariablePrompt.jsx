import { useState } from 'react';
import PropTypes from 'prop-types';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import GlassModal from '../common/GlassModal';
import GlassButton from '../common/GlassButton';

/**
 * AddVariablePrompt - Shows when a variable assignment is detected (e.g., x = 5, V_0 = 10)
 * Asks user if they want to add the variable to the variables list
 * Supports subscripts via LaTeX notation
 */
const AddVariablePrompt = ({
  variableName,
  value,
  onAddVariable,
  onJustDisplay,
  onCancel,
}) => {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddVariable = async () => {
    setIsAdding(true);
    try {
      await onAddVariable(variableName, value);
    } finally {
      setIsAdding(false);
    }
  };

  // Format variable name with LaTeX for subscripts
  const formatVariableName = (name) => {
    // Replace underscore notation with LaTeX subscript
    // e.g., V_0 becomes V_0, V_t becomes V_t
    return name.replace(/_(\w+)/g, '_{$1}');
  };

  return (
    <GlassModal
      isOpen={true}
      onClose={onCancel}
      title="Variable Assignment Detected"
    >
      <div className="space-y-4">
        {/* Detected Assignment */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Detected assignment:</p>
          <div className="text-center text-xl font-semibold text-gray-800">
            <InlineMath math={`${formatVariableName(variableName)} = ${value}`} />
          </div>
        </div>

        {/* Question */}
        <div className="text-center">
          <p className="text-sm text-gray-700">
            Would you like to add <InlineMath math={formatVariableName(variableName)} /> to your variables list?
          </p>
          <p className="text-xs text-gray-500 mt-1">
            This will allow you to use it in future calculations within this note.
          </p>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg 
              className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <div className="text-xs text-indigo-700">
              <p className="font-medium mb-1">Tip:</p>
              <p>Adding variables helps maintain context across your notes. You can always manage them in the Variables panel.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <GlassButton
            onClick={handleAddVariable}
            disabled={isAdding}
            className="w-full"
          >
            {isAdding ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add to Variables
              </span>
            )}
          </GlassButton>

          <GlassButton
            onClick={onJustDisplay}
            variant="secondary"
            disabled={isAdding}
            className="w-full"
          >
            Just Display
          </GlassButton>

          <button
            onClick={onCancel}
            disabled={isAdding}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </GlassModal>
  );
};

AddVariablePrompt.propTypes = {
  variableName: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onAddVariable: PropTypes.func.isRequired,
  onJustDisplay: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default AddVariablePrompt;
