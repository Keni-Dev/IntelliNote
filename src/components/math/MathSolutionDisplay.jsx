import { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { Copy, ChevronDown, ChevronUp, RefreshCw, Info, AlertCircle, Lightbulb, MapPin, Sparkles, Loader2 } from 'lucide-react';
import GlassCard from '../common/GlassCard';
import GlassButton from '../common/GlassButton';
import Toast from '../common/Toast';
import HandwrittenMath from './HandwrittenMath';

/**
 * Component to display equation solutions with step-by-step breakdown
 */
export default function MathSolutionDisplay({ 
  equation, 
  result, 
  steps = [], 
  variables = {},
  context = null,
  suggestions = [],
  confidence = null,
  analysis = null,
  llmStatus = 'idle',
  llmProvider = 'openrouter/andromeda-alpha',
  llmResponse = null,
  llmError = null,
  onRecalculate,
  onAskLLM,
  onNavigateToSource,
  onApplySuggestion,
  onClose,
  position = { x: 0, y: 0 }
}) {
  const [showSteps, setShowSteps] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);
  const llmIsLoading = llmStatus === 'loading';
  const classificationLabel = analysis?.classification || null;
  const classificationConfidence = analysis?.confidence != null
    ? Math.round(Math.max(0, Math.min(analysis.confidence, 1)) * 100)
    : null;
  const llmDisplayName = llmProvider?.split('/')?.pop() || llmProvider || 'Andromeda';

  // Handle drag start
  const handleDragStart = (e) => {
    if (e.target.closest('button, input, select')) return; // Don't drag when clicking interactive elements
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle drag move
  useEffect(() => {
    const handleDragMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 280;
      const maxY = window.innerHeight - 200;
      
      setCurrentPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    // Handle drag end
    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, dragOffset]);

  // Format result for display
  const formatResult = (value) => {
    if (typeof value === 'number') {
      // Round to 6 decimal places if needed
      return Math.abs(value - Math.round(value)) < 0.000001 
        ? Math.round(value).toString()
        : value.toFixed(6).replace(/\.?0+$/, '');
    }
    return String(value);
  };

  // Copy result to clipboard
  const copyResult = () => {
    const resultText = formatResult(result);
    navigator.clipboard.writeText(resultText).then(() => {
      setToast({ show: true, message: 'Result copied!', type: 'success' });
    }).catch(() => {
      setToast({ show: true, message: 'Failed to copy', type: 'error' });
    });
  };

  const copyLLMResponse = () => {
    if (!llmResponse) {
      return;
    }
    navigator.clipboard.writeText(llmResponse).then(() => {
      setToast({ show: true, message: `${llmDisplayName} answer copied!`, type: 'success' });
    }).catch(() => {
      setToast({ show: true, message: 'Failed to copy response', type: 'error' });
    });
  };

  // Check if there are any variable substitutions to show
  const hasVariables = Object.keys(variables).length > 0;

  // Get confidence badge color
  const getConfidenceBadge = () => {
    if (!confidence) return null;
    
    const colors = {
      'high': 'bg-green-500/30 border-green-400 text-green-100',
      'medium': 'bg-yellow-500/30 border-yellow-400 text-yellow-100',
      'low': 'bg-orange-500/30 border-orange-400 text-orange-100',
      'very-low': 'bg-red-500/30 border-red-400 text-red-100',
      'none': 'bg-gray-500/30 border-gray-400 text-gray-100'
    };
    
    return (
      <span className={`text-xs px-2 py-1 rounded-full border ${colors[confidence.level] || colors.medium}`}>
        {confidence.level} confidence
      </span>
    );
  };

  // Handle applying a suggestion
  const applySuggestion = (suggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
      setToast({ show: true, message: 'Suggestion applied', type: 'success' });
    }
  };

  return (
    <>
      <div 
        className="absolute z-30 animate-slideIn"
        style={{ 
          left: `${currentPosition.x}px`, 
          top: `${currentPosition.y}px`,
          minWidth: '280px',
          maxWidth: '400px',
          maxHeight: 'calc(100vh - 180px)',
          overflowY: 'auto'
        }}
        onMouseDown={handleDragStart}
      >
        <div className={`p-4 shadow-xl border-2 border-blue-500/50 rounded-xl bg-gradient-to-br from-blue-600/95 to-purple-600/95 backdrop-blur-xl cursor-move select-none transition-all ${isDragging ? 'scale-105 shadow-2xl' : ''}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
              <h3 className="text-sm font-semibold text-white">Solution</h3>
              {getConfidenceBadge()}
              {classificationLabel && (
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/15 text-white/80 border border-white/25">
                  {classificationLabel}
                  {classificationConfidence != null ? ` · ${classificationConfidence}%` : ''}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {onRecalculate && (
                <button
                  onClick={onRecalculate}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Recalculate"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>
              )}
              {onAskLLM && (
                <button
                  onClick={onAskLLM}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  title={`Ask ${llmDisplayName}`}
                  disabled={llmIsLoading}
                >
                  {llmIsLoading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                </button>
              )}
              <button
                onClick={copyResult}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="Copy result"
              >
                <Copy className="w-4 h-4 text-white" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Close"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Original Equation */}
          <div className="mb-3 p-2 bg-black/20 rounded-lg">
            <div className="text-xs text-blue-100 mb-1">Equation:</div>
            <div className="text-sm text-white">
              <InlineMath math={equation} />
            </div>
            {analysis && (
              <div className="mt-1 text-[11px] text-blue-100/80">
                Classified as {analysis.classification}
                {classificationConfidence != null && (
                  <span> · {classificationConfidence}% confidence</span>
                )}
              </div>
            )}
          </div>

          {/* Context Information */}
          {context && (context.variables?.length > 0 || context.formulas?.length > 0) && (
            <div className="mb-3 p-2 bg-black/20 rounded-lg">
              <div className="flex items-center gap-1 text-xs text-blue-100 mb-2">
                <Info className="w-3 h-3" />
                <span>Using context:</span>
              </div>
              
              {/* Variables from context */}
              {context.variables?.length > 0 && (
                <div className="mb-2">
                  {context.variables.map((v, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-white mb-1">
                      <InlineMath math={`${v.name} = ${formatResult(v.value)}`} />
                      {v.source === 'spatial' && onNavigateToSource && (
                        <button
                          onClick={() => onNavigateToSource(v)}
                          className="p-1 rounded hover:bg-white/20 transition-colors"
                          title="Jump to source"
                        >
                          <MapPin className="w-3 h-3 text-blue-200" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Formulas from context */}
              {context.formulas?.length > 0 && (
                <div>
                  {context.formulas.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-white mb-1">
                      <InlineMath math={`${f.name} = ${f.expression}`} />
                      {f.source === 'spatial' && onNavigateToSource && (
                        <button
                          onClick={() => onNavigateToSource(f)}
                          className="p-1 rounded hover:bg-white/20 transition-colors"
                          title="Jump to source"
                        >
                          <MapPin className="w-3 h-3 text-blue-200" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Variable Substitutions */}
          {hasVariables && (
            <div className="mb-3 p-2 bg-black/20 rounded-lg">
              <div className="text-xs text-blue-100 mb-1">Using variables:</div>
              <div className="space-y-1">
                {Object.entries(variables).map(([name, value]) => (
                  <div key={name} className="text-xs text-white">
                    <InlineMath math={`${name} = ${formatResult(value)}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Answer */}
          <div className="mb-3 p-3 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-lg border border-yellow-300/50">
            <div className="text-xs text-blue-100 mb-2">Answer:</div>
            <div className="text-2xl font-bold text-white">
              {typeof result === 'object' && result.value !== undefined ? (
                <HandwrittenMath 
                  latex={formatResult(result.value)} 
                  scale={1.5}
                  color="#eab308"
                />
              ) : (
                <HandwrittenMath 
                  latex={formatResult(result)} 
                  scale={1.5}
                  color="#eab308"
                />
              )}
            </div>
          </div>

          {/* Steps Section */}
          {steps && steps.length > 0 && (
            <div className="border-t border-white/20 pt-3">
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="flex items-center justify-between w-full text-sm text-white hover:text-blue-100 transition-colors"
              >
                <span>Show Steps ({steps.length})</span>
                {showSteps ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showSteps && (
                <div className="mt-3 space-y-2 animate-slideIn">
                  {steps.map((step, index) => (
                    <div 
                      key={index}
                      className="p-2 bg-black/20 rounded-lg text-sm"
                    >
                      <div className="text-xs text-blue-100 mb-1">
                        Step {index + 1}:
                      </div>
                      <div className="text-white">
                        {step.description && (
                          <div className="mb-1 text-xs">{step.description}</div>
                        )}
                        <InlineMath math={step.expression || step} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Suggestions Section */}
          {suggestions && suggestions.length > 0 && (
            <div className="border-t border-white/20 pt-3 mt-3">
              <div className="flex items-center gap-1 text-sm text-white mb-2">
                <Lightbulb className="w-4 h-4" />
                <span>Suggestions</span>
              </div>
              
              <div className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <div 
                    key={idx}
                    className="p-2 bg-black/20 rounded-lg border border-white/10"
                  >
                    <div className="flex items-start gap-2">
                      {suggestion.type === 'missing_variable' && (
                        <AlertCircle className="w-4 h-4 text-yellow-300 flex-shrink-0 mt-0.5" />
                      )}
                      {suggestion.type === 'constant_suggestion' && (
                        <Info className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
                      )}
                      {suggestion.type === 'formula_suggestion' && (
                        <Lightbulb className="w-4 h-4 text-green-300 flex-shrink-0 mt-0.5" />
                      )}
                      
                      <div className="flex-1">
                        <div className="text-xs text-white mb-1">
                          {suggestion.message}
                        </div>
                        
                        {/* Show additional formula details */}
                        {suggestion.formula && (
                          <div className="text-xs text-blue-100 mt-1">
                            <InlineMath 
                              math={`${suggestion.formula.result || suggestion.formula.name} = ${suggestion.formula.expression || suggestion.formula.formula}`} 
                            />
                          </div>
                        )}
                        
                        {/* Action button */}
                        {suggestion.action && onApplySuggestion && (
                          <button
                            onClick={() => applySuggestion(suggestion)}
                            className="mt-2 text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors text-white"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(llmIsLoading || llmError || llmResponse) && (
            <div className="border-t border-white/20 pt-3 mt-3">
              <div className="flex items-center gap-2 text-sm text-white mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{llmDisplayName} insight</span>
              </div>

              {llmIsLoading && (
                <div className="flex items-center gap-2 text-xs text-blue-100 bg-white/10 border border-white/20 rounded-lg px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Contacting {llmDisplayName}…</span>
                </div>
              )}

              {llmError && (
                <div className="mt-2 p-2 bg-rose-500/20 border border-rose-400/60 rounded text-xs text-rose-100">
                  {llmError}
                </div>
              )}

              {llmResponse && (
                <div className="mt-2 p-3 bg-indigo-500/25 border border-indigo-300/40 rounded-lg text-sm text-white whitespace-pre-wrap leading-relaxed">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-indigo-100/80 mb-2">
                    <span>{llmDisplayName}</span>
                    <button
                      onClick={copyLLMResponse}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white text-[10px]"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  {llmResponse}
                </div>
              )}
            </div>
          )}

          {/* Confidence Details */}
          {confidence && confidence.reasons && confidence.reasons.length > 0 && (
            <div className="mt-3 text-xs text-blue-100">
              <details className="cursor-pointer">
                <summary className="hover:text-white transition-colors">
                  Why this confidence level?
                </summary>
                <ul className="mt-2 space-y-1 pl-4 list-disc">
                  {confidence.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-3 text-xs text-blue-100 text-center">
            Click recalculate if variables have changed
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  );
}
