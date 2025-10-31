import { AlertCircle, XCircle, Lightbulb, X } from 'lucide-react';

/**
 * MathErrorDisplay Component
 * Displays user-friendly error messages with suggestions and examples
 * Uses dark background matching the toolbar design
 * 
 * @param {Object} error - Error object from the math solver
 * @param {Function} onDismiss - Callback when error is dismissed
 * @param {Function} onApplySuggestion - Callback when auto-fix is applied
 */
export default function MathErrorDisplay({ error, onDismiss, onApplySuggestion }) {
  if (!error) return null;

  const handleDismiss = () => {
    onDismiss?.();
  };

  const handleApplyFix = () => {
    if (error.auto_fix || error.suggestion) {
      onApplySuggestion?.(error.auto_fix || error.suggestion);
    }
  };

  // Determine error severity for icon and color
  const getSeverityConfig = () => {
    const errorType = (error.error_type || '').toLowerCase();
    const errorMsg = (error.error || error.message || error.user_message || '').toLowerCase();
    
    // Check for specific error types from Python server
    if (errorType.includes('missing_dx') || errorType.includes('missing_differential')) {
      return {
        Icon: AlertCircle,
        colorClass: 'text-orange-400',
        bgClass: 'bg-orange-500',
        title: 'Missing Differential',
        severity: 'warning'
      };
    }
    
    if (errorType.includes('missing_variable')) {
      return {
        Icon: AlertCircle,
        colorClass: 'text-orange-400',
        bgClass: 'bg-orange-500',
        title: 'Missing Variable',
        severity: 'warning'
      };
    }
    
    if (errorType.includes('unbalanced') || errorMsg.includes('parenthes') || errorMsg.includes('bracket')) {
      return {
        Icon: XCircle,
        colorClass: 'text-red-400',
        bgClass: 'bg-red-500',
        title: 'Unbalanced Parentheses',
        severity: 'error'
      };
    }
    
    if (errorType.includes('syntax') || errorMsg.includes('syntax') || errorMsg.includes('invalid')) {
      return {
        Icon: XCircle,
        colorClass: 'text-red-400',
        bgClass: 'bg-red-500',
        title: 'Syntax Error',
        severity: 'error'
      };
    }
    
    if (errorType.includes('missing')) {
      return {
        Icon: AlertCircle,
        colorClass: 'text-orange-400',
        bgClass: 'bg-orange-500',
        title: 'Incomplete Equation',
        severity: 'warning'
      };
    }
    
    return {
      Icon: AlertCircle,
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500',
      title: 'Notice',
      severity: 'info'
    };
  };

  const config = getSeverityConfig();
  const Icon = config.Icon;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4 animate-in slide-in-from-top duration-300">
      {/* Use dark background like toolbar */}
      <div className="backdrop-blur-md bg-gray-800/95 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Colored accent bar at top */}
        <div className={`h-1 ${config.bgClass}`} />
        
        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className={config.colorClass}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">
                {config.title}
              </h3>
              {/* Show error type from Python server */}
              {error.error_type && (
                <p className="text-gray-400 text-xs mt-1 font-mono">
                  {error.error_type}
                </p>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700/50"
              aria-label="Dismiss error"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Message */}
          <div className="mb-4">
            <p className="text-gray-100 text-base leading-relaxed">
              {/* Show the error from Python server - 'error' field has the clean message */}
              {error.error || error.user_message || error.message || 'An error occurred'}
            </p>
            {/* Show original equation if available */}
            {error.original && (
              <p className="text-gray-400 text-sm mt-2 font-mono">
                Equation: <code className="bg-gray-900/50 px-2 py-1 rounded">{error.original}</code>
              </p>
            )}
          </div>

          {/* Suggestion */}
          {error.suggestion && (
            <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300 font-medium">Suggestion</span>
              </div>
              <p className="text-yellow-100/90 text-sm">
                {error.suggestion}
              </p>
            </div>
          )}

          {/* Hint/Example */}
          {error.hint && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-indigo-300 font-medium">Example</span>
              </div>
              <code className="block bg-gray-900/70 text-cyan-300 px-3 py-2 rounded-lg font-mono text-sm border border-gray-700/50">
                {error.hint}
              </code>
              {(error.auto_fix || error.suggestion) && (
                <div className="mt-3">
                  <button
                    onClick={handleApplyFix}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Apply Fix →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
