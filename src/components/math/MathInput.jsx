import { useState, useRef, useEffect } from 'react';
import MathSymbolPicker from './MathSymbolPicker';

const MathInput = ({ value = '', onChange, onEquationDetected }) => {
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  // Math functions and formulas for autocomplete
  const mathFunctions = [
    { label: 'sin(x)', value: 'sin(' },
    { label: 'cos(x)', value: 'cos(' },
    { label: 'tan(x)', value: 'tan(' },
    { label: 'log(x)', value: 'log(' },
    { label: 'ln(x)', value: 'ln(' },
    { label: 'sqrt(x)', value: 'sqrt(' },
    { label: 'abs(x)', value: 'abs(' },
    { label: 'exp(x)', value: 'exp(' },
    // Calculus helpers
    { label: 'derivative(f, x)', value: 'derivative(' },
    { label: 'diff(f, x[, at])', value: 'diff(' },
    { label: 'integrate(f, x, a, b)', value: 'integrate(' },
    { label: '∫(f, x, a, b)', value: '∫(' },
  ];

  const physicsFormulas = [
    { label: 'v = d/t (velocity)', value: 'v = d/t' },
    { label: 'F = ma (force)', value: 'F = ma' },
    { label: 'E = mc² (energy)', value: 'E = mc²' },
    { label: 'a = Δv/Δt (acceleration)', value: 'a = Δv/Δt' },
    { label: 'p = mv (momentum)', value: 'p = mv' },
    { label: 'W = Fd (work)', value: 'W = Fd' },
    { label: 'P = W/t (power)', value: 'P = W/t' },
    { label: 'KE = ½mv² (kinetic energy)', value: 'KE = ½mv²' },
  ];

  const constants = [
    { label: 'π (pi)', value: 'π' },
    { label: 'e (Euler)', value: 'e' },
    { label: 'g (gravity)', value: 'g' },
    { label: 'c (speed of light)', value: 'c' },
    { label: 'h (Planck)', value: 'h' },
  ];

  // Detect trailing "=" to auto-submit
  useEffect(() => {
    if (!onEquationDetected) return;
    // Only trigger when the equation ends with '=' (optional whitespace)
    if (/=[\s]*$/.test(value)) {
      onEquationDetected(value);
    }
  }, [value, onEquationDetected]);

  // Handle autocomplete
  const handleInput = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
  onChange(newValue);
    setCursorPosition(cursorPos);

    // Get word before cursor for autocomplete
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const words = textBeforeCursor.split(/[\s+\-*/()=]/);
    const currentWord = words[words.length - 1];

    if (currentWord.length >= 1) {
      const allOptions = [...mathFunctions, ...physicsFormulas, ...constants];
      const matches = allOptions.filter(opt => 
        opt.label.toLowerCase().includes(currentWord.toLowerCase()) ||
        opt.value.toLowerCase().startsWith(currentWord.toLowerCase())
      );

      if (matches.length > 0) {
        setAutocompleteOptions(matches);
        setShowAutocomplete(true);
        setSelectedOption(0);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  // Handle autocomplete selection
  const selectAutocomplete = (option) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const words = textBeforeCursor.split(/[\s+\-*/()=]/);
    const currentWord = words[words.length - 1];
    
    const beforeWord = textBeforeCursor.slice(0, -currentWord.length);
    const newValue = beforeWord + option.value + textAfterCursor;
    
    onChange(newValue);
    setShowAutocomplete(false);
    
    // Set cursor after inserted text
    setTimeout(() => {
      const newCursorPos = beforeWord.length + option.value.length;
      textareaRef.current.selectionStart = newCursorPos;
      textareaRef.current.selectionEnd = newCursorPos;
      textareaRef.current.focus();
    }, 0);
  };

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e) => {
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedOption(prev => 
          prev < autocompleteOptions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedOption(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectAutocomplete(autocompleteOptions[selectedOption]);
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
    }
  };

  // Insert symbol from picker
  const handleSymbolInsert = (symbol) => {
    const cursorPos = textareaRef.current.selectionStart;
    const textBefore = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);
    const newValue = textBefore + symbol + textAfter;
    
    onChange(newValue);
    
    // Set cursor after inserted symbol
    setTimeout(() => {
      const newCursorPos = cursorPos + symbol.length;
      textareaRef.current.selectionStart = newCursorPos;
      textareaRef.current.selectionEnd = newCursorPos;
      textareaRef.current.focus();
    }, 0);
  };

  // Syntax highlighting - parse text into colored spans
  const getHighlightedText = () => {
    if (!value) return '';

    // Token patterns
    const patterns = [
      { type: 'equals', regex: /=/g, color: 'text-red-400 font-bold' },
      { type: 'function', regex: /\b(sin|cos|tan|log|ln|sqrt|abs|exp|derivative|diff|integrate)\b/g, color: 'text-green-400' },
      { type: 'integral', regex: /∫/g, color: 'text-green-400' },
      { type: 'd/dx', regex: /\bd\/d[a-zA-Z]\b/g, color: 'text-green-400' },
      { type: 'number', regex: /\b\d+\.?\d*\b/g, color: 'text-blue-400' },
      { type: 'operator', regex: /[+\-×÷*/^()]/g, color: 'text-orange-400' },
      { type: 'variable', regex: /\b[a-zA-Z]\b/g, color: 'text-purple-400' },
    ];

    const tokens = [];

    // Find all matches
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(value)) !== null) {
        tokens.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          color: pattern.color,
        });
      }
    });

    // Sort tokens by position
    tokens.sort((a, b) => a.start - b.start);

    // Build highlighted HTML
    let lastIndex = 0;
    let highlighted = [];

    tokens.forEach((token, i) => {
      // Add text before token
      if (token.start > lastIndex) {
        highlighted.push(
          <span key={`text-${i}`} className="text-white/90">
            {value.slice(lastIndex, token.start)}
          </span>
        );
      }

      // Add colored token
      highlighted.push(
        <span key={`token-${i}`} className={token.color}>
          {token.text}
        </span>
      );

      lastIndex = token.end;
    });

    // Add remaining text
    if (lastIndex < value.length) {
      highlighted.push(
        <span key="text-end" className="text-white/90">
          {value.slice(lastIndex)}
        </span>
      );
    }

    return highlighted;
  };

  return (
    <div className="relative w-full">
      {/* Syntax highlighting overlay */}
      <div className="relative">
        {/* Hidden overlay for syntax highlighting */}
        <div
          className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words px-3 py-2 text-sm font-mono overflow-hidden"
          style={{
            fontFamily: 'Roboto Mono, monospace',
            lineHeight: '1.5',
            color: 'transparent',
          }}
          aria-hidden="true"
        >
          {getHighlightedText()}
        </div>

        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Enter mathematical equation... (e.g., y = 2x + 5)"
          className="w-full min-h-[100px] px-3 py-2 text-sm font-mono bg-gray-900 border-2 border-blue-400/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-transparent caret-white placeholder:text-gray-500"
          style={{
            fontFamily: 'Roboto Mono, monospace',
            lineHeight: '1.5',
            caretColor: 'white',
          }}
          spellCheck={false}
        />
      </div>

      {/* Autocomplete dropdown */}
      {showAutocomplete && autocompleteOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-w-sm bg-gray-900 border-2 border-blue-400/70 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
          {autocompleteOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => selectAutocomplete(option)}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                index === selectedOption
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-200 hover:bg-gray-800'
              }`}
            >
              <div className="font-mono">{option.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {/* Symbol picker button */}
          <button
            onClick={() => setShowSymbolPicker(true)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-800 border-2 border-gray-600 rounded-lg hover:bg-gray-700 hover:border-gray-500 transition-all shadow-lg"
            title="Insert math symbol"
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Symbols
            </span>
          </button>

          {/* Quick insert buttons */}
          <div className="flex gap-1">
              {['π', '²', '³', '√', '×', '÷', '∫'].map(symbol => (
              <button
                key={symbol}
                onClick={() => handleSymbolInsert(symbol)}
                className="w-7 h-7 text-sm font-medium text-white bg-gray-800 border-2 border-gray-600 rounded hover:bg-gray-700 hover:border-gray-500 transition-all shadow-lg"
                title={`Insert ${symbol}`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Character count */}
        <div className="text-xs text-gray-400 font-mono font-semibold">
          {value.length} chars
        </div>
      </div>

      {/* Symbol picker modal */}
      {showSymbolPicker && (
        <MathSymbolPicker
          onSelect={handleSymbolInsert}
          onClose={() => setShowSymbolPicker(false)}
        />
      )}
    </div>
  );
};

export default MathInput;
