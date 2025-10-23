import { useState, useEffect } from 'react';
import { GlassModal } from '../common';

const MathSymbolPicker = ({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('operators');
  const [recentSymbols, setRecentSymbols] = useState([]);

  // Symbol categories
  const symbolCategories = {
    operators: {
      name: 'Operators',
      symbols: [
        { symbol: '+', label: 'Plus' },
        { symbol: '-', label: 'Minus' },
        { symbol: '×', label: 'Multiply' },
        { symbol: '÷', label: 'Divide' },
        { symbol: '=', label: 'Equals' },
        { symbol: '≠', label: 'Not equal' },
        { symbol: '≈', label: 'Approximately' },
        { symbol: '<', label: 'Less than' },
        { symbol: '>', label: 'Greater than' },
        { symbol: '≤', label: 'Less or equal' },
        { symbol: '≥', label: 'Greater or equal' },
        { symbol: '±', label: 'Plus-minus' },
        { symbol: '∓', label: 'Minus-plus' },
        { symbol: '∞', label: 'Infinity' },
        { symbol: '∝', label: 'Proportional' },
        { symbol: '∑', label: 'Sum' },
        { symbol: '∏', label: 'Product' },
        { symbol: '∫', label: 'Integral' },
        { symbol: '∂', label: 'Partial derivative' },
        { symbol: '∆', label: 'Delta' },
        { symbol: '∇', label: 'Nabla' },
        { symbol: '√', label: 'Square root' },
        { symbol: '∛', label: 'Cube root' },
        { symbol: '∜', label: 'Fourth root' },
      ]
    },
    greek: {
      name: 'Greek Letters',
      symbols: [
        { symbol: 'α', label: 'Alpha' },
        { symbol: 'β', label: 'Beta' },
        { symbol: 'γ', label: 'Gamma' },
        { symbol: 'δ', label: 'Delta' },
        { symbol: 'ε', label: 'Epsilon' },
        { symbol: 'ζ', label: 'Zeta' },
        { symbol: 'η', label: 'Eta' },
        { symbol: 'θ', label: 'Theta' },
        { symbol: 'ι', label: 'Iota' },
        { symbol: 'κ', label: 'Kappa' },
        { symbol: 'λ', label: 'Lambda' },
        { symbol: 'μ', label: 'Mu' },
        { symbol: 'ν', label: 'Nu' },
        { symbol: 'ξ', label: 'Xi' },
        { symbol: 'π', label: 'Pi' },
        { symbol: 'ρ', label: 'Rho' },
        { symbol: 'σ', label: 'Sigma' },
        { symbol: 'τ', label: 'Tau' },
        { symbol: 'υ', label: 'Upsilon' },
        { symbol: 'φ', label: 'Phi' },
        { symbol: 'χ', label: 'Chi' },
        { symbol: 'ψ', label: 'Psi' },
        { symbol: 'ω', label: 'Omega' },
        { symbol: 'Γ', label: 'Gamma (upper)' },
        { symbol: 'Δ', label: 'Delta (upper)' },
        { symbol: 'Θ', label: 'Theta (upper)' },
        { symbol: 'Λ', label: 'Lambda (upper)' },
        { symbol: 'Ξ', label: 'Xi (upper)' },
        { symbol: 'Π', label: 'Pi (upper)' },
        { symbol: 'Σ', label: 'Sigma (upper)' },
        { symbol: 'Φ', label: 'Phi (upper)' },
        { symbol: 'Ψ', label: 'Psi (upper)' },
        { symbol: 'Ω', label: 'Omega (upper)' },
      ]
    },
    superscripts: {
      name: 'Superscripts',
      symbols: [
        { symbol: '⁰', label: '0' },
        { symbol: '¹', label: '1' },
        { symbol: '²', label: '2' },
        { symbol: '³', label: '3' },
        { symbol: '⁴', label: '4' },
        { symbol: '⁵', label: '5' },
        { symbol: '⁶', label: '6' },
        { symbol: '⁷', label: '7' },
        { symbol: '⁸', label: '8' },
        { symbol: '⁹', label: '9' },
        { symbol: '⁺', label: '+' },
        { symbol: '⁻', label: '-' },
        { symbol: '⁼', label: '=' },
        { symbol: '⁽', label: '(' },
        { symbol: '⁾', label: ')' },
        { symbol: 'ⁿ', label: 'n' },
        { symbol: 'ⁱ', label: 'i' },
      ]
    },
    subscripts: {
      name: 'Subscripts',
      symbols: [
        { symbol: '₀', label: '0' },
        { symbol: '₁', label: '1' },
        { symbol: '₂', label: '2' },
        { symbol: '₃', label: '3' },
        { symbol: '₄', label: '4' },
        { symbol: '₅', label: '5' },
        { symbol: '₆', label: '6' },
        { symbol: '₇', label: '7' },
        { symbol: '₈', label: '8' },
        { symbol: '₉', label: '9' },
        { symbol: '₊', label: '+' },
        { symbol: '₋', label: '-' },
        { symbol: '₌', label: '=' },
        { symbol: '₍', label: '(' },
        { symbol: '₎', label: ')' },
        { symbol: 'ₐ', label: 'a' },
        { symbol: 'ₑ', label: 'e' },
        { symbol: 'ₓ', label: 'x' },
      ]
    }
  };

  // Load recent symbols from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('mathRecentSymbols');
    if (stored) {
      try {
        setRecentSymbols(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load recent symbols:', e);
      }
    }
  }, []);

  // Handle symbol selection
  const handleSymbolClick = (symbol) => {
    // Add to recent symbols
    const updatedRecent = [symbol, ...recentSymbols.filter(s => s !== symbol)].slice(0, 12);
    setRecentSymbols(updatedRecent);
    localStorage.setItem('mathRecentSymbols', JSON.stringify(updatedRecent));
    
    // Call parent handler
    onSelect(symbol);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <GlassModal onClose={onClose} title="Math Symbols">
      <div className="flex flex-col h-full max-h-[600px]">
        {/* Category tabs */}
        <div className="flex gap-2 mb-4 border-b border-white/10 pb-2 overflow-x-auto">
          {Object.entries(symbolCategories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                activeCategory === key
                  ? 'bg-blue-500/30 text-white border border-blue-400/50'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Recently used symbols */}
        {recentSymbols.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-white/70 mb-2">Recently Used</h3>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
              {recentSymbols.map((symbol, index) => (
                <button
                  key={index}
                  onClick={() => handleSymbolClick(symbol)}
                  className="aspect-square flex items-center justify-center text-2xl bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-blue-500/30 hover:border-blue-400/50 transition-all group"
                  title={`Insert ${symbol}`}
                >
                  <span className="group-hover:scale-110 transition-transform">
                    {symbol}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Symbol grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {symbolCategories[activeCategory].symbols.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSymbolClick(item.symbol)}
                className="aspect-square flex flex-col items-center justify-center gap-1 text-2xl bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-blue-500/30 hover:border-blue-400/50 transition-all group"
                title={item.label}
              >
                <span className="group-hover:scale-110 transition-transform">
                  {item.symbol}
                </span>
                <span className="text-[8px] text-white/50 group-hover:text-white/70 transition-colors truncate max-w-full px-1">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Click a symbol to insert</span>
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded">Esc</kbd>
              <span>to close</span>
            </span>
          </div>
        </div>
      </div>
    </GlassModal>
  );
};

export default MathSymbolPicker;
