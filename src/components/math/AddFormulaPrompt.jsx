import { useState } from 'react';
import PropTypes from 'prop-types';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import GlassModal from '../common/GlassModal';
import GlassButton from '../common/GlassButton';

/**
 * AddFormulaPrompt - Shows when a formula definition is detected (e.g., F = ma, V_t = V_o + 1/2(at))
 * Asks user if they want to add the formula to the formulas list
 * Supports subscripts via LaTeX notation and shows detected variables
 */
const AddFormulaPrompt = ({
  formulaName,
  expression,
  variables,
  onAddFormula,
  onJustDisplay,
  onCancel,
}) => {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddFormula = async () => {
    setIsAdding(true);
    try {
      await onAddFormula(formulaName, expression);
    } finally {
      setIsAdding(false);
    }
  };

  // Format variable/formula name with LaTeX for subscripts
  const formatName = (name) => {
    // Replace underscore notation with LaTeX subscript
    // e.g., V_0 becomes V_0, V_t becomes V_t
    return name.replace(/_(\w+)/g, '_{$1}');
  };

  return (
    <GlassModal
      isOpen={true}
      onClose={onCancel}
      title="Formula Definition Detected"
    >
      <div className="space-y-4">
        {/* Detected Formula */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Detected formula:</p>
          <div className="text-center text-xl font-semibold text-gray-800">
            <InlineMath math={`${formatName(formulaName)} = ${expression}`} />
          </div>
        </div>

        {/* Variables Found */}
        {variables && variables.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-2">
              Variables detected:
            </p>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-white/80 border border-amber-300 rounded text-sm font-mono"
                >
                  <InlineMath math={formatName(variable)} />
                </span>
              ))}
            </div>
            <p className="text-xs text-amber-700 mt-2">
              These variables don&apos;t have assigned values yet. You can assign them later.
            </p>
          </div>
        )}

        {/* Question */}
        <div className="text-center">
          <p className="text-sm text-gray-700">
            Would you like to add this formula to your formulas list?
          </p>
          <p className="text-xs text-gray-500 mt-1">
            You can reuse this formula throughout your notes.
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
              <p>Storing formulas helps you quickly reference and use them in calculations. Perfect for physics equations, statistical formulas, or any repeated expressions!</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <GlassButton
            onClick={handleAddFormula}
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
                Add to Formulas
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

AddFormulaPrompt.propTypes = {
  formulaName: PropTypes.string.isRequired,
  expression: PropTypes.string.isRequired,
  variables: PropTypes.arrayOf(PropTypes.string),
  onAddFormula: PropTypes.func.isRequired,
  onJustDisplay: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default AddFormulaPrompt;
