import { AlertCircle, XCircle, Lightbulb, X, AlertTriangle } from 'lucide-react';
import GlassCard from '../common/GlassCard';
import GlassButton from '../common/GlassButton';

/**
 * MathErrorDisplay Component
 * Displays user-friendly error messages with suggestions and examples
 * Uses the app's glassmorphism design system
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
    const errorMsg = (error.message || error.user_message || error.error || '').toLowerCase();
    
    if (errorType.includes('syntax') || errorMsg.includes('syntax') || errorMsg.includes('invalid')) {
      return {
        Icon: XCircle,
        colorClass: 'text-red-400',
        bgClass: 'bg-red-500/20',
        borderClass: 'border-red-400/30',
        title: 'Syntax Error'
      };
    }
    
    if (errorType.includes('missing') || errorMsg.includes('missing')) {
      return {
        Icon: AlertCircle,
        colorClass: 'text-orange-400',
        bgClass: 'bg-orange-500/20',
        borderClass: 'border-orange-400/30',
        title: 'Incomplete Equation'
      };
    }
    
    return {
      Icon: AlertCircle,
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/20',
      borderClass: 'border-amber-400/30',
      title: 'Notice'
    };
  };

  const config = getSeverityConfig();
  const Icon = config.Icon;
  // Base card uses the same dark glass style as the toolbar so it's readable over white content
  const baseCardClass = 'backdrop-blur-md bg-gray-800/95 border border-gray-700 p-4';

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4 animate-in slide-in-from-top duration-300">
      <GlassCard className={`${baseCardClass} relative`}>
        <div className="flex">
          {/* Left accent bar showing severity color */}
          <div className={`${config.accentClass || 'bg-amber-400'} w-1 rounded-l-md mr-3`} />

          <div className="flex-1">
            {/* Header */}
            <div className="flex items-start gap-3 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/6">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg">{config.title}</h3>
                {error.user_message && (
                  <p className="text-white/80 text-sm mt-1">{error.user_message}</p>
                )}
              </div>
              <button
                onClick={handleDismiss}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                aria-label="Dismiss error"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Primary message if present (falls back to message/error) */}
            <div className="mb-3">
              <p className="text-white/90 text-base leading-relaxed">
                {error.user_message || error.message || error.error}
              </p>
            </div>

            {/* Suggestion */}
            {error.suggestion && (
              <div className="mb-3 rounded-lg p-3 bg-yellow-600/6 border border-yellow-600/10">
                <div className="flex items-start gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-yellow-300" />
                  <span className="text-yellow-200 text-sm font-medium">Suggestion</span>
                </div>
                <p className="text-yellow-100 text-sm">{error.suggestion}</p>
              </div>
            )}

            {/* Hint/Example */}
            {error.hint && (
              <div className="mb-2 rounded-lg p-3 bg-indigo-700/6 border border-indigo-700/10">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-indigo-300 text-sm font-medium">Example</span>
                </div>
                <code className="block bg-slate-900/60 text-cyan-300 px-3 py-2 rounded-md font-mono text-sm overflow-x-auto">
                  {error.hint}
                </code>
                {(error.auto_fix || error.suggestion) && (
                  <div className="mt-3">
                    <GlassButton
                      onClick={handleApplyFix}
                      className="bg-indigo-600/10 border-indigo-600/20 hover:bg-indigo-600/20 text-white text-sm"
                    >
                      Apply Fix →
                    </GlassButton>
                  </div>
                )}
              </div>
            )}

            {/* Technical details (expandable) */}
            {error.original && (
              <details className="mt-2 text-sm text-white/60">
                <summary className="cursor-pointer select-none">Technical details</summary>
                <pre className="mt-2 bg-black/30 p-3 rounded text-xs text-white/70 overflow-x-auto">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
