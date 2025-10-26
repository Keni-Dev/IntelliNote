/**
 * Symbol Post-Processing
 * Corrects common OCR mistakes in mathematical notation
 */

/**
 * Common OCR mistake mappings
 */
const SYMBOL_CORRECTIONS = {
  // Multiplication vs letter x
  multiplication: {
    patterns: [
      { from: /(\d)\s*x\s*(\d)/g, to: '$1 \\times $2' },
      { from: /(\))\s*x\s*(\()/g, to: '$1 \\times $2' },
      { from: /(\))\s*x\s*(\w)/g, to: '$1 \\times $2' },
      { from: /(\w)\s*x\s*(\()/g, to: '$1 \\times $2' },
    ],
  },

  // Letter o vs number 0
  zeroVsO: {
    patterns: [
      { from: /(\d)o(\d)/g, to: '$10$2' }, // 1o5 → 105
      { from: /^o(\d)/g, to: '0$1' }, // o5 → 05
      { from: /(\d)o$/g, to: '$10' }, // 5o → 50
      { from: /(\d)\s+o\s+(\d)/g, to: '$1 0 $2' }, // 1 o 5 → 1 0 5
    ],
  },

  // Letter l vs number 1
  oneVsL: {
    patterns: [
      { from: /(\d)l(\d)/g, to: '$11$2' }, // 5l2 → 512
      { from: /^l(\d)/g, to: '1$1' }, // l5 → 15
      { from: /(\d)l$/g, to: '$11' }, // 5l → 51
    ],
  },

  // Capital O vs zero
  capitalOVsZero: {
    patterns: [
      { from: /(\d)O(\d)/g, to: '$10$2' },
      { from: /^O(\d)/g, to: '0$1' },
      { from: /(\d)O$/g, to: '$10' },
    ],
  },
};

/**
 * Greek letter LaTeX mappings
 */
export const GREEK_LETTERS = {
  // Lowercase
  alpha: '\\alpha',
  beta: '\\beta',
  gamma: '\\gamma',
  delta: '\\delta',
  epsilon: '\\epsilon',
  varepsilon: '\\varepsilon',
  zeta: '\\zeta',
  eta: '\\eta',
  theta: '\\theta',
  vartheta: '\\vartheta',
  iota: '\\iota',
  kappa: '\\kappa',
  lambda: '\\lambda',
  mu: '\\mu',
  nu: '\\nu',
  xi: '\\xi',
  omicron: 'o', // No special LaTeX command
  pi: '\\pi',
  varpi: '\\varpi',
  rho: '\\rho',
  varrho: '\\varrho',
  sigma: '\\sigma',
  varsigma: '\\varsigma',
  tau: '\\tau',
  upsilon: '\\upsilon',
  phi: '\\phi',
  varphi: '\\varphi',
  chi: '\\chi',
  psi: '\\psi',
  omega: '\\omega',

  // Uppercase
  Gamma: '\\Gamma',
  Delta: '\\Delta',
  Theta: '\\Theta',
  Lambda: '\\Lambda',
  Xi: '\\Xi',
  Pi: '\\Pi',
  Sigma: '\\Sigma',
  Upsilon: '\\Upsilon',
  Phi: '\\Phi',
  Psi: '\\Psi',
  Omega: '\\Omega',
};

/**
 * Special operator symbols
 */
export const SPECIAL_OPERATORS = {
  '+-': '\\pm',
  '-+': '\\mp',
  '!=': '\\neq',
  '=/=': '\\neq',
  '~=': '\\approx',
  '≈': '\\approx',
  '<=': '\\leq',
  '≤': '\\leq',
  '>=': '\\geq',
  '≥': '\\geq',
  '<<': '\\ll',
  '>>': '\\gg',
  infinity: '\\infty',
  inf: '\\infty',
  '∞': '\\infty',
  degree: '^\\circ',
  '°': '^\\circ',
  cdot: '\\cdot',
  '*': '\\cdot',
  '·': '\\cdot',
};

/**
 * Correct common OCR mistakes in LaTeX
 */
export function correctSymbols(latex, options = {}) {
  if (!latex || typeof latex !== 'string') {
    return {
      corrected: latex || '',
      corrections: [],
      confidence: 1.0,
    };
  }

  let corrected = latex;
  const corrections = [];
  const {
    enableMultiplication = true,
    enableZeroCorrection = true,
    enableOneCorrection = true,
    enableSpecialOps = true,
  } = options;

  // Apply multiplication corrections
  if (enableMultiplication) {
    SYMBOL_CORRECTIONS.multiplication.patterns.forEach((pattern) => {
      const before = corrected;
      corrected = corrected.replace(pattern.from, pattern.to);
      if (before !== corrected) {
        corrections.push({
          type: 'multiplication',
          description: 'Converted "x" to multiplication symbol',
          confidence: 0.85,
        });
      }
    });
  }

  // Apply zero vs O corrections
  if (enableZeroCorrection) {
    SYMBOL_CORRECTIONS.zeroVsO.patterns.forEach((pattern) => {
      const before = corrected;
      corrected = corrected.replace(pattern.from, pattern.to);
      if (before !== corrected) {
        corrections.push({
          type: 'zero',
          description: 'Converted letter "o" to number "0"',
          confidence: 0.9,
        });
      }
    });

    SYMBOL_CORRECTIONS.capitalOVsZero.patterns.forEach((pattern) => {
      const before = corrected;
      corrected = corrected.replace(pattern.from, pattern.to);
      if (before !== corrected) {
        corrections.push({
          type: 'zero',
          description: 'Converted letter "O" to number "0"',
          confidence: 0.9,
        });
      }
    });
  }

  // Apply one vs l corrections
  if (enableOneCorrection) {
    SYMBOL_CORRECTIONS.oneVsL.patterns.forEach((pattern) => {
      const before = corrected;
      corrected = corrected.replace(pattern.from, pattern.to);
      if (before !== corrected) {
        corrections.push({
          type: 'one',
          description: 'Converted letter "l" to number "1"',
          confidence: 0.88,
        });
      }
    });
  }

  // Apply special operator corrections
  if (enableSpecialOps) {
    Object.entries(SPECIAL_OPERATORS).forEach(([symbol, latex]) => {
      const regex = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const before = corrected;
      corrected = corrected.replace(regex, latex);
      if (before !== corrected) {
        corrections.push({
          type: 'operator',
          description: `Converted "${symbol}" to LaTeX operator`,
          confidence: 0.95,
        });
      }
    });
  }

  // Calculate overall confidence
  const avgConfidence =
    corrections.length > 0
      ? corrections.reduce((sum, c) => sum + c.confidence, 0) / corrections.length
      : 1.0;

  return {
    corrected,
    corrections,
    confidence: avgConfidence,
    hasCorrections: corrections.length > 0,
  };
}

/**
 * Detect and normalize Greek letters
 */
export function normalizeGreekLetters(latex) {
  if (!latex) return latex;

  let normalized = latex;
  const corrections = [];

  // Convert unicode Greek letters to LaTeX
  const greekUnicode = {
    α: '\\alpha',
    β: '\\beta',
    γ: '\\gamma',
    δ: '\\delta',
    ε: '\\epsilon',
    ζ: '\\zeta',
    η: '\\eta',
    θ: '\\theta',
    ι: '\\iota',
    κ: '\\kappa',
    λ: '\\lambda',
    μ: '\\mu',
    ν: '\\nu',
    ξ: '\\xi',
    π: '\\pi',
    ρ: '\\rho',
    σ: '\\sigma',
    τ: '\\tau',
    υ: '\\upsilon',
    φ: '\\phi',
    χ: '\\chi',
    ψ: '\\psi',
    ω: '\\omega',
    Γ: '\\Gamma',
    Δ: '\\Delta',
    Θ: '\\Theta',
    Λ: '\\Lambda',
    Ξ: '\\Xi',
    Π: '\\Pi',
    Σ: '\\Sigma',
    Υ: '\\Upsilon',
    Φ: '\\Phi',
    Ψ: '\\Psi',
    Ω: '\\Omega',
  };

  Object.entries(greekUnicode).forEach(([unicode, latexCmd]) => {
    if (normalized.includes(unicode)) {
      normalized = normalized.replace(new RegExp(unicode, 'g'), latexCmd);
      corrections.push({
        type: 'greek',
        from: unicode,
        to: latexCmd,
      });
    }
  });

  return { normalized, corrections };
}

/**
 * Detect subscripts and superscripts from LaTeX
 */
export function detectScripts(latex) {
  if (!latex) return { hasSubscripts: false, hasSuperscripts: false, scripts: [] };

  const subscriptPattern = /_\{([^}]+)\}/g;
  const superscriptPattern = /\^\{([^}]+)\}/g;
  const simpleSubscript = /_(\w)/g;
  const simpleSuperscript = /\^(\w)/g;

  const scripts = [];
  let match;

  // Detect complex subscripts
  while ((match = subscriptPattern.exec(latex)) !== null) {
    scripts.push({
      type: 'subscript',
      content: match[1],
      position: match.index,
    });
  }

  // Detect simple subscripts
  while ((match = simpleSubscript.exec(latex)) !== null) {
    scripts.push({
      type: 'subscript',
      content: match[1],
      position: match.index,
    });
  }

  // Detect complex superscripts
  while ((match = superscriptPattern.exec(latex)) !== null) {
    scripts.push({
      type: 'superscript',
      content: match[1],
      position: match.index,
    });
  }

  // Detect simple superscripts
  while ((match = simpleSuperscript.exec(latex)) !== null) {
    scripts.push({
      type: 'superscript',
      content: match[1],
      position: match.index,
    });
  }

  return {
    hasSubscripts: scripts.some((s) => s.type === 'subscript'),
    hasSuperscripts: scripts.some((s) => s.type === 'superscript'),
    scripts,
  };
}

/**
 * Improve LaTeX formatting
 */
export function improveLatexFormatting(latex) {
  if (!latex) return latex;

  let improved = latex;

  // Ensure proper fraction formatting
  // Convert "a/b" to "\frac{a}{b}" for single characters
  improved = improved.replace(/(\w)\/(\w)/g, '\\frac{$1}{$2}');

  // Fix spacing around operators
  improved = improved.replace(/([+\-*/=])/g, ' $1 ');
  improved = improved.replace(/\s+/g, ' '); // Remove extra spaces

  // Ensure proper superscript/subscript braces
  improved = improved.replace(/\^(\w{2,})/g, '^{$1}');
  improved = improved.replace(/_(\w{2,})/g, '_{$1}');

  // Format square roots
  improved = improved.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');

  return improved.trim();
}

/**
 * Main post-processing function
 */
export function postProcessLatex(latex, options = {}) {
  if (!latex || typeof latex !== 'string') {
    return {
      original: latex || '',
      processed: latex || '',
      corrections: [],
      confidence: 1.0,
      hasChanges: false,
    };
  }

  const original = latex;

  // Step 1: Correct common symbols
  const { corrected, corrections, confidence } = correctSymbols(latex, options);

  // Step 2: Normalize Greek letters
  const { normalized, corrections: greekCorrections } = normalizeGreekLetters(corrected);

  // Step 3: Improve LaTeX formatting
  const processed = improveLatexFormatting(normalized);

  // Step 4: Detect scripts
  const scriptInfo = detectScripts(processed);

  const allCorrections = [
    ...corrections,
    ...greekCorrections.map((c) => ({
      type: c.type,
      description: `Converted ${c.from} to ${c.to}`,
      confidence: 0.98,
    })),
  ];

  return {
    original,
    processed,
    corrections: allCorrections,
    confidence,
    hasChanges: original !== processed,
    scriptInfo,
  };
}

export default {
  correctSymbols,
  normalizeGreekLetters,
  detectScripts,
  improveLatexFormatting,
  postProcessLatex,
  GREEK_LETTERS,
  SPECIAL_OPERATORS,
};
