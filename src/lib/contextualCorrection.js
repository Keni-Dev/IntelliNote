/**
 * Contextual Correction
 * Smart symbol interpretation based on surrounding context
 */

/**
 * Analyze context around a character position
 */
function analyzeContext(text, position) {
  const charBefore = text[position - 1] || '';
  const charAfter = text[position + 1] || '';
  const wordBefore = extractWordBefore(text, position);
  const wordAfter = extractWordAfter(text, position);

  return {
    charBefore,
    charAfter,
    wordBefore,
    wordAfter,
    isAfterOperator: /[+\-*/=<>]/.test(charBefore),
    isBeforeOperator: /[+\-*/=<>]/.test(charAfter),
    isAfterDigit: /\d/.test(charBefore),
    isBeforeDigit: /\d/.test(charAfter),
    isAfterLetter: /[a-zA-Z]/.test(charBefore),
    isBeforeLetter: /[a-zA-Z]/.test(charAfter),
    isStartOfWord: /[\s(^]/.test(charBefore) || position === 0,
    isEndOfWord: /[\s)$]/.test(charAfter) || position === text.length - 1,
  };
}

/**
 * Extract word before position
 */
function extractWordBefore(text, position) {
  let word = '';
  let i = position - 1;

  while (i >= 0 && /[a-zA-Z]/.test(text[i])) {
    word = text[i] + word;
    i--;
  }

  return word;
}

/**
 * Extract word after position
 */
function extractWordAfter(text, position) {
  let word = '';
  let i = position + 1;

  while (i < text.length && /[a-zA-Z]/.test(text[i])) {
    word += text[i];
    i++;
  }

  return word;
}

/**
 * Known mathematical functions and constants
 */
const MATH_FUNCTIONS = [
  'sin',
  'cos',
  'tan',
  'cot',
  'sec',
  'csc',
  'arcsin',
  'arccos',
  'arctan',
  'sinh',
  'cosh',
  'tanh',
  'log',
  'ln',
  'exp',
  'sqrt',
  'abs',
  'min',
  'max',
  'lim',
  'sum',
  'prod',
  'int',
];

const MATH_CONSTANTS = ['pi', 'e', 'inf', 'infinity'];

/**
 * Decide if 'o' should be letter or zero
 */
function correctOvsZero(text, position) {
  const context = analyzeContext(text, position);
  const char = text[position];

  if (char !== 'o' && char !== 'O') {
    return { shouldCorrect: false, correctedChar: char, confidence: 1.0 };
  }

  // Rule 1: Between digits → likely zero
  if (context.isAfterDigit && context.isBeforeDigit) {
    return {
      shouldCorrect: true,
      correctedChar: '0',
      confidence: 0.95,
      reason: 'Between digits',
    };
  }

  // Rule 2: After digit, before space/operator → likely zero
  if (context.isAfterDigit && (context.isEndOfWord || context.isBeforeOperator)) {
    return {
      shouldCorrect: true,
      correctedChar: '0',
      confidence: 0.9,
      reason: 'After digit',
    };
  }

  // Rule 3: Before digit, after space/operator → likely zero
  if (context.isBeforeDigit && (context.isStartOfWord || context.isAfterOperator)) {
    return {
      shouldCorrect: true,
      correctedChar: '0',
      confidence: 0.9,
      reason: 'Before digit',
    };
  }

  // Rule 4: Part of known function (cos, log, etc.) → keep as letter
  const fullWord = context.wordBefore + char + context.wordAfter;
  if (MATH_FUNCTIONS.some((fn) => fullWord.toLowerCase().includes(fn))) {
    return {
      shouldCorrect: false,
      correctedChar: char,
      confidence: 0.98,
      reason: 'Part of math function',
    };
  }

  // Rule 5: Part of constant (pi, infinity) → keep as letter
  if (MATH_CONSTANTS.some((c) => fullWord.toLowerCase().includes(c))) {
    return {
      shouldCorrect: false,
      correctedChar: char,
      confidence: 0.95,
      reason: 'Part of math constant',
    };
  }

  // Default: keep as letter
  return {
    shouldCorrect: false,
    correctedChar: char,
    confidence: 0.6,
    reason: 'Default to letter',
  };
}

/**
 * Decide if 'l' should be letter or one
 */
function correctLvsOne(text, position) {
  const context = analyzeContext(text, position);
  const char = text[position];

  if (char !== 'l' && char !== 'I') {
    return { shouldCorrect: false, correctedChar: char, confidence: 1.0 };
  }

  // Rule 1: Between digits → likely one
  if (context.isAfterDigit && context.isBeforeDigit) {
    return {
      shouldCorrect: true,
      correctedChar: '1',
      confidence: 0.95,
      reason: 'Between digits',
    };
  }

  // Rule 2: After digit, before space → likely one
  if (context.isAfterDigit && context.isEndOfWord) {
    return {
      shouldCorrect: true,
      correctedChar: '1',
      confidence: 0.9,
      reason: 'After digit',
    };
  }

  // Rule 3: Before digit, after space → likely one
  if (context.isBeforeDigit && context.isStartOfWord) {
    return {
      shouldCorrect: true,
      correctedChar: '1',
      confidence: 0.9,
      reason: 'Before digit',
    };
  }

  // Rule 4: Part of known function → keep as letter
  const fullWord = context.wordBefore + char + context.wordAfter;
  if (MATH_FUNCTIONS.some((fn) => fullWord.toLowerCase().includes(fn))) {
    return {
      shouldCorrect: false,
      correctedChar: char,
      confidence: 0.95,
      reason: 'Part of math function',
    };
  }

  // Rule 5: Surrounded by letters → likely letter
  if (context.isAfterLetter || context.isBeforeLetter) {
    return {
      shouldCorrect: false,
      correctedChar: char,
      confidence: 0.85,
      reason: 'Surrounded by letters',
    };
  }

  // Default: keep as letter
  return {
    shouldCorrect: false,
    correctedChar: char,
    confidence: 0.6,
    reason: 'Default to letter',
  };
}

/**
 * Decide if 'x' should be variable or multiplication
 */
function correctXvsMultiplication(text, position) {
  const context = analyzeContext(text, position);
  const char = text[position];

  if (char !== 'x' && char !== 'X') {
    return { shouldCorrect: false, correctedChar: char, confidence: 1.0 };
  }

  // Rule 1: Between numbers → likely multiplication
  if (context.isAfterDigit && context.isBeforeDigit) {
    return {
      shouldCorrect: true,
      correctedChar: '\\times',
      confidence: 0.9,
      reason: 'Between numbers',
    };
  }

  // Rule 2: After closing paren, before opening paren → likely multiplication
  if (context.charBefore === ')' && context.charAfter === '(') {
    return {
      shouldCorrect: true,
      correctedChar: '\\times',
      confidence: 0.88,
      reason: 'Between parentheses',
    };
  }

  // Rule 3: After number, before variable → could be multiplication
  if (context.isAfterDigit && context.isBeforeLetter) {
    return {
      shouldCorrect: true,
      correctedChar: '\\times',
      confidence: 0.75,
      reason: 'After number',
    };
  }

  // Rule 4: Part of "exp" or other function → keep as letter
  const fullWord = context.wordBefore + char + context.wordAfter;
  if (MATH_FUNCTIONS.some((fn) => fullWord.toLowerCase().includes(fn))) {
    return {
      shouldCorrect: false,
      correctedChar: char,
      confidence: 0.95,
      reason: 'Part of math function',
    };
  }

  // Default: keep as variable x
  return {
    shouldCorrect: false,
    correctedChar: char,
    confidence: 0.7,
    reason: 'Default to variable',
  };
}

/**
 * Apply contextual corrections to text
 */
export function applyContextualCorrections(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return {
      corrected: text || '',
      corrections: [],
      confidence: 1.0,
    };
  }

  const {
    correctO = true,
    correctL = true,
    correctX = true,
    minConfidence = 0.7,
  } = options;

  let corrected = text;
  const corrections = [];
  let offset = 0; // Track position changes from replacements

  // Process each character
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let correction = null;

    // Check for 'o' vs '0'
    if (correctO && (char === 'o' || char === 'O')) {
      correction = correctOvsZero(text, i);
    }
    // Check for 'l' vs '1'
    else if (correctL && (char === 'l' || char === 'I')) {
      correction = correctLvsOne(text, i);
    }
    // Check for 'x' vs multiplication
    else if (correctX && (char === 'x' || char === 'X')) {
      correction = correctXvsMultiplication(text, i);
    }

    // Apply correction if confidence is high enough
    if (
      correction &&
      correction.shouldCorrect &&
      correction.confidence >= minConfidence
    ) {
      const originalChar = corrected[i + offset];
      const before = corrected.substring(0, i + offset);
      const after = corrected.substring(i + offset + 1);
      corrected = before + correction.correctedChar + after;

      // Update offset for multi-character replacements (like \times)
      offset += correction.correctedChar.length - 1;

      corrections.push({
        position: i,
        original: originalChar,
        corrected: correction.correctedChar,
        confidence: correction.confidence,
        reason: correction.reason,
        type: 'contextual',
      });
    }
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
 * Extract mathematical entities from text
 */
export function extractMathEntities(latex) {
  if (!latex) return { functions: [], variables: [], constants: [], operators: [] };

  const entities = {
    functions: [],
    variables: [],
    constants: [],
    operators: [],
  };

  // Extract functions
  MATH_FUNCTIONS.forEach((fn) => {
    const regex = new RegExp(`\\b${fn}\\b`, 'gi');
    let match;
    while ((match = regex.exec(latex)) !== null) {
      entities.functions.push({
        name: fn,
        position: match.index,
      });
    }
  });

  // Extract constants
  MATH_CONSTANTS.forEach((constant) => {
    const regex = new RegExp(`\\b${constant}\\b`, 'gi');
    let match;
    while ((match = regex.exec(latex)) !== null) {
      entities.constants.push({
        name: constant,
        position: match.index,
      });
    }
  });

  // Extract variables (single letters not part of functions)
  const varRegex = /\b([a-zA-Z])\b/g;
  let match;
  while ((match = varRegex.exec(latex)) !== null) {
    // Check if not part of a function
    const isFunctionPart = entities.functions.some(
      (fn) =>
        match.index >= fn.position &&
        match.index < fn.position + fn.name.length
    );
    if (!isFunctionPart) {
      entities.variables.push({
        name: match[1],
        position: match.index,
      });
    }
  }

  // Extract operators
  const opRegex = /[+\-*/=<>]/g;
  while ((match = opRegex.exec(latex)) !== null) {
    entities.operators.push({
      symbol: match[0],
      position: match.index,
    });
  }

  return entities;
}

/**
 * Validate mathematical expression structure
 */
export function validateExpression(latex) {
  if (!latex) {
    return { valid: true, errors: [] };
  }

  const errors = [];

  // Check for balanced parentheses
  let parenCount = 0;
  for (let i = 0; i < latex.length; i++) {
    if (latex[i] === '(') parenCount++;
    if (latex[i] === ')') parenCount--;
    if (parenCount < 0) {
      errors.push({
        type: 'parentheses',
        message: 'Unbalanced closing parenthesis',
        position: i,
      });
      break;
    }
  }
  if (parenCount > 0) {
    errors.push({
      type: 'parentheses',
      message: 'Unclosed opening parenthesis',
    });
  }

  // Check for balanced braces
  let braceCount = 0;
  for (let i = 0; i < latex.length; i++) {
    if (latex[i] === '{') braceCount++;
    if (latex[i] === '}') braceCount--;
    if (braceCount < 0) {
      errors.push({
        type: 'braces',
        message: 'Unbalanced closing brace',
        position: i,
      });
      break;
    }
  }
  if (braceCount > 0) {
    errors.push({
      type: 'braces',
      message: 'Unclosed opening brace',
    });
  }

  // Check for consecutive operators
  if (/[+\-*/]{2,}/.test(latex.replace(/\\times|\\cdot/g, ''))) {
    errors.push({
      type: 'operators',
      message: 'Consecutive operators detected',
    });
  }

  // Check for empty fractions
  if (/\\frac\{\s*\}\{/.test(latex) || /\\frac\{[^}]*\}\{\s*\}/.test(latex)) {
    errors.push({
      type: 'fraction',
      message: 'Empty numerator or denominator in fraction',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  applyContextualCorrections,
  extractMathEntities,
  validateExpression,
  correctOvsZero,
  correctLvsOne,
  correctXvsMultiplication,
  MATH_FUNCTIONS,
  MATH_CONSTANTS,
};
