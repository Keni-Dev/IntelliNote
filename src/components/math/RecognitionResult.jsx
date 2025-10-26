import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Check, X, Edit2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { postProcessLatex } from '../../lib/symbolPostProcessing';
import { applyContextualCorrections } from '../../lib/contextualCorrection';
import { detectFormulaPattern, formatFormula } from '../../lib/formulaPatterns';

const RecognitionResult = ({
  recognizedText,
  confidence,
  originalStrokes,
  alternatives = [],
  onAccept,
  onReject,
  onEdit,
  onRetry,
  position = { x: 0, y: 0 }
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState(null);
  const [processedResult, setProcessedResult] = useState(null);

  useEffect(() => {
    // Smooth entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (recognizedText) {
      // Apply post-processing and contextual corrections
      const symbolResult = postProcessLatex(recognizedText);
      const contextResult = applyContextualCorrections(symbolResult.processed);
      const patternResult = detectFormulaPattern(contextResult.corrected);
      const formatResult = formatFormula(contextResult.corrected);

      setProcessedResult({
        original: recognizedText,
        corrected: formatResult.formatted,
        symbolCorrections: symbolResult.corrections,
        contextCorrections: contextResult.corrections,
        pattern: patternResult.bestMatch,
        formatChanges: formatResult.changes,
        hasCorrections: symbolResult.hasChanges || contextResult.hasCorrections || formatResult.hasChanges,
      });
    }
  }, [recognizedText]);

  // Get confidence color and label
  const getConfidenceInfo = (conf) => {
    if (conf >= 0.8) {
      return {
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/50',
        label: 'High Confidence',
        icon: '✓'
      };
    } else if (conf >= 0.5) {
      return {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/50',
        label: 'Medium Confidence',
        icon: '⚠'
      };
    } else {
      return {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/50',
        label: 'Low Confidence - Review Needed',
        icon: '!'
      };
    }
  };

  const confidenceInfo = getConfidenceInfo(confidence);

  // Create thumbnail from strokes
  const createStrokeThumbnail = () => {
    if (!originalStrokes || originalStrokes.length === 0) return null;

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    originalStrokes.forEach(stroke => {
      stroke.points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const padding = 10;

    return (
      <svg
        width="100"
        height="60"
        viewBox={`${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`}
        className="bg-white/5 rounded border border-white/10"
      >
        {originalStrokes.map((stroke, i) => (
          <polyline
            key={i}
            points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        ))}
      </svg>
    );
  };

  const handleAccept = () => {
    let textToUse;
    if (selectedAlternative !== null) {
      textToUse = alternatives[selectedAlternative];
    } else if (processedResult && processedResult.hasCorrections) {
      textToUse = processedResult.corrected;
    } else {
      textToUse = recognizedText;
    }
    setIsVisible(false);
    setTimeout(() => onAccept(textToUse), 200);
  };

  const handleReject = () => {
    setIsVisible(false);
    setTimeout(() => onReject(), 200);
  };

  const handleEdit = () => {
    const textToEdit = selectedAlternative !== null 
      ? alternatives[selectedAlternative] 
      : processedResult && processedResult.hasCorrections
      ? processedResult.corrected
      : recognizedText;
    onEdit(textToEdit);
  };

  const handleRetry = () => {
    setIsVisible(false);
    setTimeout(() => onRetry?.(), 200);
  };

  // Render LaTeX safely
  const renderLatex = (latex) => {
    try {
      return <InlineMath math={latex} />;
    } catch {
      return <span className="text-red-400">{latex}</span>;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          className="fixed z-50 pointer-events-auto"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            maxWidth: '400px'
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className={`px-4 py-3 border-b ${confidenceInfo.borderColor} ${confidenceInfo.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${confidenceInfo.color}`}>{confidenceInfo.icon}</span>
                  <span className={`text-sm font-medium ${confidenceInfo.color}`}>
                    {confidenceInfo.label}
                  </span>
                </div>
                <div className={`text-sm font-bold ${confidenceInfo.color}`}>
                  {Math.round(confidence * 100)}%
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Corrected Result (if different from original) */}
              {processedResult && processedResult.hasCorrections && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <div className="text-xs text-purple-400 font-medium">Auto-Corrected:</div>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-xl text-center text-white">
                    {renderLatex(processedResult.corrected)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-mono text-center">
                    {processedResult.corrected}
                  </div>
                  
                  {/* Show corrections made */}
                  <div className="mt-2 space-y-1">
                    {[...processedResult.symbolCorrections, ...processedResult.contextCorrections, ...processedResult.formatChanges].map((correction, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-purple-300/80">
                        <div className="w-1 h-1 rounded-full bg-purple-400" />
                        <span>{correction.description}</span>
                        <span className="text-purple-400/60">({Math.round((correction.confidence || 0.9) * 100)}%)</span>
                      </div>
                    ))}
                  </div>

                  {/* Pattern match info */}
                  {processedResult.pattern && (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                      <Sparkles className="w-3 h-3" />
                      <span>Detected: <strong>{processedResult.pattern.name}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Original Recognition */}
              <div>
                <div className="text-xs text-gray-400 mb-2">
                  {processedResult?.hasCorrections ? 'Original Recognition:' : 'Recognized Equation:'}
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-xl text-center text-white">
                  {renderLatex(recognizedText)}
                </div>
                <div className="text-xs text-gray-500 mt-1 font-mono text-center">
                  {recognizedText}
                </div>
              </div>

              {/* Original Handwriting Thumbnail */}
              <div>
                <div className="text-xs text-gray-400 mb-2">Original Handwriting:</div>
                <div className="flex justify-center">
                  {createStrokeThumbnail()}
                </div>
              </div>

              {/* Alternative Interpretations */}
              {alternatives && alternatives.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-2">Alternative Interpretations:</div>
                  <div className="space-y-2">
                    {alternatives.map((alt, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAlternative(selectedAlternative === index ? null : index)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                          selectedAlternative === index
                            ? 'bg-blue-500/20 border-blue-500/50'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-white">
                            {renderLatex(alt)}
                          </div>
                          {selectedAlternative === index && (
                            <Check className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Confidence Warning */}
              {confidence < 0.5 && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-300">
                    Recognition confidence is low. Please review the result carefully or edit it manually.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-white/5 border-t border-white/10 flex gap-2">
              <button
                onClick={handleAccept}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg border border-green-500/50 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Accept</span>
              </button>

              <button
                onClick={handleEdit}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg border border-blue-500/50 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-sm font-medium">Edit</span>
              </button>

              {onRetry && (
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg border border-amber-500/50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleReject}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RecognitionResult;
