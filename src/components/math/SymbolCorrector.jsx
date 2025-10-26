import { useState, useEffect } from 'react';
import { X, Sparkles, Clock, Zap } from 'lucide-react';
import GlassCard from '../common/GlassCard';
import { SPECIAL_OPERATORS, GREEK_LETTERS } from '../../lib/symbolPostProcessing';
import { getFormulaTemplates } from '../../lib/formulaPatterns';

const SymbolCorrector = ({ currentLatex, onApplyCorrection, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState('common');
  const [recentSymbols, setRecentSymbols] = useState([]);
  const [quickFixes, setQuickFixes] = useState([]);

  useEffect(() => {
    // Load recent symbols from localStorage
    const stored = localStorage.getItem('recentSymbols');
    if (stored) {
      try {
        setRecentSymbols(JSON.parse(stored));
      } catch {
        setRecentSymbols([]);
      }
    }

    // Generate quick fixes based on current latex
    if (currentLatex) {
      generateQuickFixes(currentLatex);
    }
  }, [currentLatex]);

  const generateQuickFixes = (latex) => {
    const fixes = [];

    // Detect common issues
    if (/\dx\d/.test(latex)) {
      fixes.push({
        name: 'Fix multiplication',
        description: 'Replace "x" with "×"',
        apply: () => latex.replace(/(\d)x(\d)/g, '$1 \\times $2'),
      });
    }

    if (/\do\d/.test(latex)) {
      fixes.push({
        name: 'Fix zeros',
        description: 'Replace "o" with "0"',
        apply: () => latex.replace(/(\d)o(\d)/g, '$10$2'),
      });
    }

    if (!/\\frac/.test(latex) && /\//.test(latex)) {
      fixes.push({
        name: 'Convert to fractions',
        description: 'Use \\frac notation',
        apply: () => latex.replace(/(\w+)\/(\w+)/g, '\\frac{$1}{$2}'),
      });
    }

    if (/\^\w{2,}/.test(latex)) {
      fixes.push({
        name: 'Fix superscripts',
        description: 'Add braces to superscripts',
        apply: () => latex.replace(/\^(\w{2,})/g, '^{$1}'),
      });
    }

    setQuickFixes(fixes);
  };

  const addRecentSymbol = (symbol, latex) => {
    const newRecent = [
      { symbol, latex, timestamp: Date.now() },
      ...recentSymbols.filter((s) => s.latex !== latex),
    ].slice(0, 10); // Keep only 10 most recent

    setRecentSymbols(newRecent);
    localStorage.setItem('recentSymbols', JSON.stringify(newRecent));
  };

  const handleSymbolClick = (latex, label) => {
    addRecentSymbol(label, latex);
    onApplyCorrection(currentLatex + latex);
  };

  const handleQuickFix = (fix) => {
    const corrected = fix.apply();
    onApplyCorrection(corrected);
  };

  const handleFormulaTemplate = (template) => {
    onApplyCorrection(template.latex);
  };

  // Symbol categories
  const categories = {
    common: {
      name: 'Common',
      symbols: [
        { label: '±', latex: '\\pm' },
        { label: '∓', latex: '\\mp' },
        { label: '×', latex: '\\times' },
        { label: '÷', latex: '\\div' },
        { label: '≠', latex: '\\neq' },
        { label: '≈', latex: '\\approx' },
        { label: '≤', latex: '\\leq' },
        { label: '≥', latex: '\\geq' },
        { label: '∞', latex: '\\infty' },
        { label: '°', latex: '^\\circ' },
        { label: '·', latex: '\\cdot' },
        { label: '√', latex: '\\sqrt{}' },
      ],
    },
    greek: {
      name: 'Greek Letters',
      symbols: Object.entries(GREEK_LETTERS).map(([name, latex]) => ({
        label: name,
        latex,
      })),
    },
    operators: {
      name: 'Operators',
      symbols: Object.entries(SPECIAL_OPERATORS).map(([symbol, latex]) => ({
        label: symbol,
        latex,
      })),
    },
    fractions: {
      name: 'Fractions',
      symbols: [
        { label: '½', latex: '\\frac{1}{2}' },
        { label: '⅓', latex: '\\frac{1}{3}' },
        { label: '⅔', latex: '\\frac{2}{3}' },
        { label: '¼', latex: '\\frac{1}{4}' },
        { label: '¾', latex: '\\frac{3}{4}' },
        { label: 'a/b', latex: '\\frac{a}{b}' },
      ],
    },
    physics: {
      name: 'Physics',
      symbols: [
        { label: 'F=ma', latex: 'F = ma' },
        { label: 'E=mc²', latex: 'E = mc^2' },
        { label: 'v=d/t', latex: 'v = \\frac{d}{t}' },
        { label: 'KE', latex: 'E = \\frac{1}{2}mv^2' },
        { label: 'V=IR', latex: 'V = IR' },
        { label: 'P=W/t', latex: 'P = \\frac{W}{t}' },
      ],
    },
  };

  return (
    <GlassCard className="p-4 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Symbol Helper</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Quick Fixes */}
      {quickFixes.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-amber-400">Quick Fixes</h4>
          </div>
          <div className="space-y-2">
            {quickFixes.map((fix, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickFix(fix)}
                className="w-full text-left px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
              >
                <div className="text-sm font-medium text-amber-100">{fix.name}</div>
                <div className="text-xs text-amber-100/60">{fix.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Symbols */}
      {recentSymbols.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-semibold text-blue-400">Recently Used</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSymbols.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSymbolClick(item.latex, item.symbol)}
                className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-white transition-colors"
              >
                {item.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(categories).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === key
                ? 'bg-purple-500/30 text-purple-100 border border-purple-500/50'
                : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Symbol Grid */}
      <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
        {categories[selectedCategory].symbols.map((symbol, idx) => (
          <button
            key={idx}
            onClick={() => handleSymbolClick(symbol.latex, symbol.label)}
            className="aspect-square flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-white"
            title={symbol.latex}
          >
            <span className="text-lg">{symbol.label}</span>
          </button>
        ))}
      </div>

      {/* Formula Templates */}
      {selectedCategory === 'physics' && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-white mb-2">Formula Templates</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {getFormulaTemplates('mechanics')
              .slice(0, 5)
              .map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleFormulaTemplate(template)}
                  className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                >
                  <div className="text-sm font-medium text-white">{template.name}</div>
                  <div className="text-xs text-white/60 font-mono">{template.canonical}</div>
                </button>
              ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default SymbolCorrector;
