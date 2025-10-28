import { useMemo } from 'react';
import { handwrittenSymbols, hasCustomSymbol, isGreekLetter } from '../../lib/handwrittenSymbols';

/**
 * HandwrittenMath Component
 * 
 * Renders mathematical expressions in handwritten style:
 * - Regular Latin characters: Gochi Hand or Kalam font
 * - Greek letters: Gochi Hand (has handwritten Greek!)
 * - Complex symbols (∫, ∑, √, etc.): Custom SVG paths
 * 
 * @param {string} latex - LaTeX string to render
 * @param {number} scale - Scale factor (default: 1)
 * @param {string} color - Text color (default: currentColor)
 * @param {boolean} inline - Inline or block rendering (default: true)
 */
export default function HandwrittenMath({ 
  latex, 
  scale = 1, 
  color = 'currentColor',
  inline = true,
  className = ''
}) {
  
  // Parse LaTeX and convert to renderable elements
  const elements = useMemo(() => {
    if (!latex) return [];
    
    return parseLatexToElements(latex);
  }, [latex]);
  
  // Calculate font size based on scale
  const fontSize = Math.round(24 * scale);
  
  return (
    <span
      className={`handwritten-math ${inline ? 'inline' : 'block'} ${className}`}
      style={{
        color,
        fontSize: `${fontSize}px`,
        fontFamily: "'Gochi Hand', 'Kalam', 'Architects Daughter', cursive",
        display: inline ? 'inline-flex' : 'flex',
        alignItems: 'baseline',
        gap: '0.1em',
        letterSpacing: '0.02em',
        lineHeight: 1.4,
      }}
    >
      {elements.map((element, index) => renderElement(element, index, scale, color))}
    </span>
  );
}

/**
 * Parse LaTeX string into renderable elements
 */
function parseLatexToElements(latex) {
  const elements = [];
  let i = 0;
  
  while (i < latex.length) {
    // Handle LaTeX commands
    if (latex[i] === '\\') {
      const command = parseLatexCommand(latex, i);
      if (command) {
        elements.push(command.element);
        i = command.nextIndex;
        continue;
      }
    }
    
    // Handle superscripts (^)
    if (latex[i] === '^') {
      const superscript = parseSuperscript(latex, i + 1);
      if (superscript) {
        elements.push(superscript.element);
        i = superscript.nextIndex;
        continue;
      }
    }
    
    // Handle subscripts (_)
    if (latex[i] === '_') {
      const subscript = parseSubscript(latex, i + 1);
      if (subscript) {
        elements.push(subscript.element);
        i = subscript.nextIndex;
        continue;
      }
    }
    
    // Handle fractions
    if (latex.substring(i).startsWith('\\frac')) {
      const fraction = parseFraction(latex, i);
      if (fraction) {
        elements.push(fraction.element);
        i = fraction.nextIndex;
        continue;
      }
    }
    
    // Handle square root
    if (latex.substring(i).startsWith('\\sqrt')) {
      const sqrt = parseSqrt(latex, i);
      if (sqrt) {
        elements.push(sqrt.element);
        i = sqrt.nextIndex;
        continue;
      }
    }
    
    // Skip whitespace and braces
    if (latex[i] === ' ' || latex[i] === '{' || latex[i] === '}') {
      i++;
      continue;
    }
    
    // Regular character
    elements.push({
      type: 'char',
      value: latex[i],
    });
    i++;
  }
  
  return elements;
}

/**
 * Parse LaTeX command (e.g., \alpha, \int, \sum)
 */
function parseLatexCommand(latex, startIndex) {
  let i = startIndex + 1; // Skip the backslash
  let command = '';
  
  // Read command name
  while (i < latex.length && /[a-zA-Z]/.test(latex[i])) {
    command += latex[i];
    i++;
  }
  
  // Map LaTeX commands to characters
  const commandMap = {
    // Greek letters (lowercase)
    'alpha': 'α',
    'beta': 'β',
    'gamma': 'γ',
    'delta': 'δ',
    'epsilon': 'ε',
    'zeta': 'ζ',
    'eta': 'η',
    'theta': 'θ',
    'iota': 'ι',
    'kappa': 'κ',
    'lambda': 'λ',
    'mu': 'μ',
    'nu': 'ν',
    'xi': 'ξ',
    'pi': 'π',
    'rho': 'ρ',
    'sigma': 'σ',
    'tau': 'τ',
    'upsilon': 'υ',
    'phi': 'φ',
    'chi': 'χ',
    'psi': 'ψ',
    'omega': 'ω',
    
    // Greek letters (uppercase)
    'Gamma': 'Γ',
    'Delta': 'Δ',
    'Theta': 'Θ',
    'Lambda': 'Λ',
    'Xi': 'Ξ',
    'Pi': 'Π',
    'Sigma': 'Σ',
    'Phi': 'Φ',
    'Psi': 'Ψ',
    'Omega': 'Ω',
    
    // Math operators
    'int': '∫',
    'sum': '∑',
    'prod': '∏',
    'partial': '∂',
    'nabla': '∇',
    'infty': '∞',
    
    // Comparison
    'approx': '≈',
    'neq': '≠',
    'leq': '≤',
    'geq': '≥',
    'le': '≤',
    'ge': '≥',
    
    // Set theory
    'in': '∈',
    'notin': '∉',
    'subset': '⊂',
    'cup': '∪',
    'cap': '∩',
    'emptyset': '∅',
    
    // Logic
    'forall': '∀',
    'exists': '∃',
    'land': '∧',
    'lor': '∨',
    'lnot': '¬',
    'neg': '¬',
    
    // Arrows
    'to': '→',
    'rightarrow': '→',
    'Rightarrow': '⇒',
    'Leftrightarrow': '⇔',
    
    // Misc
    'pm': '±',
    'times': '×',
    'div': '÷',
    'cdot': '·',
  };
  
  const char = commandMap[command];
  
  if (char) {
    return {
      element: { type: 'char', value: char },
      nextIndex: i,
    };
  }
  
  return null;
}

/**
 * Parse superscript (^)
 */
function parseSuperscript(latex, startIndex) {
  let content = '';
  let i = startIndex;
  
  // Handle braces {2} or single character 2
  if (latex[i] === '{') {
    i++; // Skip opening brace
    while (i < latex.length && latex[i] !== '}') {
      content += latex[i];
      i++;
    }
    i++; // Skip closing brace
  } else if (i < latex.length) {
    content = latex[i];
    i++;
  }
  
  return {
    element: { type: 'superscript', value: content },
    nextIndex: i,
  };
}

/**
 * Parse subscript (_)
 */
function parseSubscript(latex, startIndex) {
  let content = '';
  let i = startIndex;
  
  // Handle braces {i} or single character i
  if (latex[i] === '{') {
    i++; // Skip opening brace
    while (i < latex.length && latex[i] !== '}') {
      content += latex[i];
      i++;
    }
    i++; // Skip closing brace
  } else if (i < latex.length) {
    content = latex[i];
    i++;
  }
  
  return {
    element: { type: 'subscript', value: content },
    nextIndex: i,
  };
}

/**
 * Parse fraction (\frac{numerator}{denominator})
 */
function parseFraction(latex, startIndex) {
  let i = startIndex + 5; // Skip \frac
  
  // Parse numerator
  const numerator = parseBraced(latex, i);
  if (!numerator) return null;
  i = numerator.nextIndex;
  
  // Parse denominator
  const denominator = parseBraced(latex, i);
  if (!denominator) return null;
  i = denominator.nextIndex;
  
  return {
    element: {
      type: 'fraction',
      numerator: numerator.content,
      denominator: denominator.content,
    },
    nextIndex: i,
  };
}

/**
 * Parse square root (\sqrt{content})
 */
function parseSqrt(latex, startIndex) {
  let i = startIndex + 5; // Skip \sqrt
  
  // Parse content
  const content = parseBraced(latex, i);
  if (!content) return null;
  
  return {
    element: {
      type: 'sqrt',
      content: content.content,
    },
    nextIndex: content.nextIndex,
  };
}

/**
 * Parse braced content {content}
 */
function parseBraced(latex, startIndex) {
  let i = startIndex;
  
  // Skip whitespace
  while (i < latex.length && latex[i] === ' ') i++;
  
  if (latex[i] !== '{') return null;
  i++; // Skip opening brace
  
  let content = '';
  let braceCount = 1;
  
  while (i < latex.length && braceCount > 0) {
    if (latex[i] === '{') {
      braceCount++;
    } else if (latex[i] === '}') {
      braceCount--;
      if (braceCount === 0) break;
    }
    content += latex[i];
    i++;
  }
  
  i++; // Skip closing brace
  
  return {
    content,
    nextIndex: i,
  };
}

/**
 * Render a single element
 */
function renderElement(element, index, scale, color) {
  const key = `element-${index}`;
  
  switch (element.type) {
    case 'char':
      return renderCharacter(element.value, key, scale, color);
    
    case 'superscript':
      return (
        <sup 
          key={key}
          style={{
            fontSize: '0.7em',
            verticalAlign: 'super',
            lineHeight: 0,
          }}
        >
          {element.value}
        </sup>
      );
    
    case 'subscript':
      return (
        <sub 
          key={key}
          style={{
            fontSize: '0.7em',
            verticalAlign: 'sub',
            lineHeight: 0,
          }}
        >
          {element.value}
        </sub>
      );
    
    case 'fraction':
      return (
        <span 
          key={key}
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: '0.9em',
            margin: '0 0.1em',
          }}
        >
          <span style={{ borderBottom: `2px solid ${color}`, paddingBottom: '0.1em' }}>
            {element.numerator}
          </span>
          <span style={{ paddingTop: '0.1em' }}>
            {element.denominator}
          </span>
        </span>
      );
    
    case 'sqrt':
      return (
        <span 
          key={key}
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
          }}
        >
          {renderCharacter('√', `${key}-symbol`, scale, color)}
          <span 
            style={{ 
              borderTop: `2px solid ${color}`,
              paddingTop: '0.1em',
              paddingLeft: '0.1em',
              paddingRight: '0.2em',
            }}
          >
            {element.content}
          </span>
        </span>
      );
    
    default:
      return null;
  }
}

/**
 * Render a single character (uses custom SVG for special symbols)
 */
function renderCharacter(char, key, scale, color) {
  // Check if this character has a custom SVG
  if (hasCustomSymbol(char)) {
    const symbol = handwrittenSymbols[char];
    const width = symbol.width * scale * 0.7; // Scale down a bit
    const height = symbol.height * scale * 0.7;
    
    return (
      <span
        key={key}
        className="custom-math-symbol"
        style={{
          display: 'inline-block',
          width: `${width}px`,
          height: `${height}px`,
          color: color,
        }}
        dangerouslySetInnerHTML={{ __html: symbol.svg }}
      />
    );
  }
  
  // For Greek letters and regular characters, use the font
  return (
    <span key={key}>
      {char}
    </span>
  );
}
