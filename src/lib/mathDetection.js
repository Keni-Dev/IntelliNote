const NOTE_KEYWORDS = [
  'definition',
  'note',
  'remember',
  'summary',
  'concept',
  'lesson',
  'chapter',
  'history',
  'objective',
  'overview',
  'meaning',
  'refers',
  'because',
  'therefore',
  'example',
  'explanation',
];

const MATH_KEYWORDS = [
  'solve',
  'calculate',
  'compute',
  'determine',
  'evaluate',
  'simplify',
  'derive',
  'integrate',
  'differentiate',
  'derivative',
  'integral',
  'gradient',
  'matrix',
  'vector',
  'limit',
  'sum',
  'sigma',
  'theta',
  'pi',
  'sin',
  'cos',
  'tan',
  'log',
  'ln',
  'sqrt',
  'equation',
  'inequality',
  'approximate',
  'polynomial',
  'quadratic',
  'algebra',
  'calculus',
  'physics',
  'force',
  'velocity',
  'acceleration',
  'energy',
];

const LATEX_COMMANDS = [
  '\\frac',
  '\\sqrt',
  '\\sum',
  '\\int',
  '\\pi',
  '\\alpha',
  '\\beta',
  '\\gamma',
  '\\theta',
  '\\lambda',
  '\\mu',
  '\\sigma',
  '\\Delta',
  '\\approx',
  '\\times',
  '\\cdot',
  '\\leq',
  '\\geq',
];

const MATH_SYMBOL_PATTERN = new RegExp('[=≠≈≤≥<>+\\-*/^×÷√∑∏∫∞%πΩµ·,:;(){}\\[\\]|\\\\]', 'g');
const NUMBER_PATTERN = /(?:\d+\.\d+|\d+|\.\d+)/g;
const GREEK_PATTERN = /[α-ωΑ-Ω]/g;

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export function analyzeMathContent(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) {
    return {
      raw: text,
      normalized: text,
      classification: 'empty',
      isEquation: false,
      isExpression: false,
      isInequality: false,
      isNote: false,
      isMathLike: false,
      confidence: 0,
      mathScore: 0,
      noteScore: 0,
      mathReasons: [],
      noteReasons: ['Empty input'],
      details: {
        wordCount: 0,
        digitCount: 0,
        symbolCount: 0,
      },
    };
  }

  const normalized = text.replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const mathSymbols = normalized.match(MATH_SYMBOL_PATTERN) || [];
  const digits = normalized.match(NUMBER_PATTERN) || [];
  const greek = normalized.match(GREEK_PATTERN) || [];
  const latexHits = LATEX_COMMANDS.filter((cmd) => normalized.includes(cmd));

  let mathScore = 0;
  const mathReasons = [];

  if (/[=≠≈≤≥]/.test(normalized)) {
    mathScore += 1.8;
    mathReasons.push('Contains equality/comparison symbol');
  }
  if (/([<>]=?|≤|≥)/.test(normalized)) {
    mathScore += 0.9;
    mathReasons.push('Contains inequality symbol');
  }
  if (/[+\-*/^×÷√]/.test(normalized)) {
    mathScore += 1.4;
    mathReasons.push('Includes arithmetic operators');
  }
  if (mathSymbols.length >= 4) {
    mathScore += 0.6;
    mathReasons.push('High density of math symbols');
  }
  if (digits.length >= 2) {
    mathScore += 1.0;
    mathReasons.push('Multiple numeric values present');
  } else if (digits.length === 1) {
    mathScore += 0.3;
    mathReasons.push('Single numeric value present');
  }
  if (/[a-zA-Z]/.test(normalized) && digits.length >= 1) {
    mathScore += 0.9;
    mathReasons.push('Mix of numbers and variables');
  }
  if (greek.length) {
    mathScore += 0.6;
    mathReasons.push('Contains Greek symbols');
  }
  if (latexHits.length) {
    mathScore += 1.1;
    mathReasons.push('LaTeX command detected');
  }
  if (MATH_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    mathScore += 1.2;
    mathReasons.push('Math terminology detected');
  }
  if (/\b(?:sin|cos|tan|cot|sec|csc|log|ln|sqrt|derivative|integrate|diff|lim)\b/i.test(normalized)) {
    mathScore += 1.4;
    mathReasons.push('Trigonometric/calculus keyword detected');
  }
  if (/\b\d+\s?(cm|mm|m|km|kg|g|s|h|hz|n|j|w|pa|mol)\b/i.test(normalized)) {
    mathScore += 0.4;
    mathReasons.push('Measurement units present');
  }
  if (/\b[a-z]\s*\^\s*\d/.test(normalized)) {
    mathScore += 0.5;
    mathReasons.push('Polynomial exponent notation');
  }

  let noteScore = 0;
  const noteReasons = [];

  // Note detection - be more conservative to avoid misclassifying equations
  if (NOTE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    noteScore += 1.0;
    noteReasons.push('Contains note-taking vocabulary');
  }
  if (/[:;]\s/.test(normalized) && mathSymbols.length < 2) {
    noteScore += 0.4;
    noteReasons.push('Likely descriptive punctuation');
  }
  if ((normalized.match(/[.!?]/g) || []).length >= 2 && mathSymbols.length < 3) {
    noteScore += 0.8;
    noteReasons.push('Multiple sentences detected');
  }
  if (wordCount >= 15 && mathSymbols.length <= 1 && digits.length <= 1) {
    noteScore += 0.9;
    noteReasons.push('Long descriptive text without math density');
  }
  if (/\b(is|are|means|refers to|describes)\b/i.test(lower) && mathSymbols.length <= 1) {
    noteScore += 0.5;
    noteReasons.push('Definition-style sentence detected');
  }

  const totalScore = Math.max(mathScore + noteScore, 1e-6);
  const mathConfidence = clamp01(mathScore / (totalScore + 1));
  const noteConfidence = clamp01(noteScore / (totalScore + 1));

  const hasEquality = /[=≠≈]/.test(normalized);
  const hasInequality = /[<>≤≥]/.test(normalized);
  const hasOperators = /[+\-*/^×÷√]/.test(normalized);

  const isEquation = hasEquality && mathScore >= noteScore;
  const isInequality = hasInequality && mathScore >= noteScore;
  const isExpression = !isEquation && !isInequality && (hasOperators || digits.length >= 2 || latexHits.length > 0) && mathScore > noteScore;
  const isMathLike = isEquation || isExpression || isInequality || (mathScore - noteScore >= 0.8 && mathScore >= 1.6);
  const isNote = !isMathLike && noteScore > 0.4;

  let classification = 'unknown';
  let confidence = mathConfidence;

  if (isEquation) {
    classification = 'equation';
  } else if (isInequality) {
    classification = 'inequality';
  } else if (isExpression) {
    classification = 'expression';
  } else if (isNote) {
    classification = 'note';
    confidence = noteConfidence;
  }

  return {
    raw: text,
    normalized,
    classification,
    isEquation,
    isExpression,
    isInequality,
    isNote,
    isMathLike,
    confidence,
    mathScore,
    noteScore,
    mathReasons,
    noteReasons,
    details: {
      wordCount,
      digitCount: digits.length,
      symbolCount: mathSymbols.length,
      greekCount: greek.length,
      latexCount: latexHits.length,
    },
  };
}

export function isLikelyMath(text, threshold = 0.55) {
  const analysis = analyzeMathContent(text);
  if (!analysis.isMathLike) {
    return false;
  }
  return analysis.confidence >= threshold;
}

export default {
  analyzeMathContent,
  isLikelyMath,
};
