import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Lightbulb } from 'lucide-react';
import { GlassModal } from '../common';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { recordCorrection, getSuggestions } from '../../lib/ocrLearning';

const CorrectionModal = ({
  isOpen,
  onClose,
  recognizedText,
  originalStrokes,
  onSave
}) => {
  const [correctedText, setCorrectedText] = useState(recognizedText);
  const [suggestions, setSuggestions] = useState([]);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setCorrectedText(recognizedText);
      // Get suggestions based on common mistakes
      const commonSuggestions = getSuggestions(recognizedText);
      setSuggestions(commonSuggestions);
    }
  }, [isOpen, recognizedText]);

  // Symbol palette for quick insertion
  const symbolPalette = [
    { label: 'Greek', symbols: ['α', 'β', 'γ', 'δ', 'θ', 'λ', 'μ', 'π', 'σ', 'φ', 'ω'] },
    { label: 'Operators', symbols: ['+', '-', '×', '÷', '=', '≠', '≈', '≤', '≥', '±'] },
    { label: 'Special', symbols: ['√', '∫', '∑', '∏', '∞', '∂', '∇', '°', '′', '″'] },
    { label: 'Relations', symbols: ['<', '>', '≪', '≫', '∈', '∉', '⊂', '⊃', '∪', '∩'] },
    { label: 'Parentheses', symbols: ['(', ')', '[', ']', '{', '}', '|', '‖'] }
  ];

  // Create thumbnail from strokes
  const createStrokeThumbnail = () => {
    if (!originalStrokes || originalStrokes.length === 0) return null;

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
    const padding = 20;

    return (
      <svg
        width="100%"
        height="200"
        viewBox={`${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`}
        className="bg-white/5 rounded-lg border border-white/10"
        preserveAspectRatio="xMidYMid meet"
      >
        {originalStrokes.map((stroke, i) => (
          <polyline
            key={i}
            points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        ))}
      </svg>
    );
  };

  const handleSymbolClick = (symbol) => {
    const textarea = document.getElementById('correction-input');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = correctedText.substring(0, start) + symbol + correctedText.substring(end);
      setCorrectedText(newText);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + symbol.length, start + symbol.length);
      }, 0);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setCorrectedText(suggestion);
  };

  const handleSave = () => {
    // Record the correction for learning
    recordCorrection(recognizedText, correctedText, originalStrokes);
    onSave(correctedText);
    onClose();
  };

  const renderLatex = (latex) => {
    if (!showPreview) return null;
    try {
      return <InlineMath math={latex} />;
    } catch {
      return <span className="text-red-400 text-sm">Invalid LaTeX syntax</span>;
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Correct Recognition"
      maxWidth="800px"
    >
      <div className="space-y-6">
        {/* Side-by-side view */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Original Handwriting */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Original Handwriting
            </label>
            <div className="h-[200px] flex items-center justify-center">
              {createStrokeThumbnail()}
            </div>
          </div>

          {/* Right: Editable Text */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Corrected Text (LaTeX)
            </label>
            <textarea
              id="correction-input"
              value={correctedText}
              onChange={(e) => setCorrectedText(e.target.value)}
              className="w-full h-[200px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              placeholder="Enter corrected LaTeX..."
              autoFocus
            />
          </div>
        </div>

        {/* Preview */}
        {showPreview && correctedText && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Live Preview
              </label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center text-2xl text-white min-h-[60px] flex items-center justify-center">
              {renderLatex(correctedText)}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <label className="block text-sm font-medium text-gray-300">
                Did you mean?
              </label>
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <div className="text-left">
                      <div className="text-sm text-white">
                        {renderLatex(suggestion.text)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {suggestion.reason}
                      </div>
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Symbol Palette */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Quick Symbols
          </label>
          <div className="space-y-3">
            {symbolPalette.map((category) => (
              <div key={category.label}>
                <div className="text-xs text-gray-500 mb-1">{category.label}</div>
                <div className="flex flex-wrap gap-1">
                  {category.symbols.map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => handleSymbolClick(symbol)}
                      className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center text-white transition-colors"
                      title={`Insert ${symbol}`}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Common LaTeX Commands Help */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="text-xs text-blue-300 mb-2 font-medium">Quick LaTeX Tips:</div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>• Fractions: <code className="text-blue-300">\frac{'{'} a {'}'} {'{'} b {'}'}</code></div>
            <div>• Superscript: <code className="text-blue-300">x^2</code> or <code className="text-blue-300">x^{'{'} 10 {'}'}</code></div>
            <div>• Subscript: <code className="text-blue-300">a_1</code> or <code className="text-blue-300">a_{'{'} 10 {'}'}</code></div>
            <div>• Square root: <code className="text-blue-300">\sqrt{'{'} x {'}'}</code> or <code className="text-blue-300">\sqrt[n]{'{'} x {'}'}</code></div>
            <div>• Sum: <code className="text-blue-300">\sum_{'{'} i=1 {'}'} ^{'{'} n {'}'}</code></div>
            <div>• Integral: <code className="text-blue-300">\int_{'{'} a {'}'} ^{'{'} b {'}'}</code></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg border border-green-500/50 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span className="font-medium">Save Correction</span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg border border-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="font-medium">Cancel</span>
          </button>
        </div>
      </div>
    </GlassModal>
  );
};

export default CorrectionModal;
