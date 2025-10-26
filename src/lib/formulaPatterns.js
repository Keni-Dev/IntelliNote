/**
 * Formula Patterns
 * Recognizes common mathematical and physics formulas
 */

/**
 * Common physics formulas with patterns
 */
const PHYSICS_FORMULAS = [
  {
    id: 'newton_second_law',
    name: "Newton's Second Law",
    pattern: /F\s*=\s*m\s*a/i,
    canonical: 'F = ma',
    latex: 'F = ma',
    variables: {
      F: { name: 'Force', units: 'N', dimension: 'MLT^-2' },
      m: { name: 'Mass', units: 'kg', dimension: 'M' },
      a: { name: 'Acceleration', units: 'm/s²', dimension: 'LT^-2' },
    },
    category: 'mechanics',
  },
  {
    id: 'kinetic_energy',
    name: 'Kinetic Energy',
    pattern: /E\s*=\s*(1\/2|0\.5)\s*m\s*v\s*\^?\s*2/i,
    canonical: 'E = (1/2)mv²',
    latex: 'E = \\frac{1}{2}mv^2',
    variables: {
      E: { name: 'Energy', units: 'J', dimension: 'ML^2T^-2' },
      m: { name: 'Mass', units: 'kg', dimension: 'M' },
      v: { name: 'Velocity', units: 'm/s', dimension: 'LT^-1' },
    },
    category: 'mechanics',
  },
  {
    id: 'velocity',
    name: 'Velocity',
    pattern: /v\s*=\s*d\s*\/\s*t/i,
    canonical: 'v = d/t',
    latex: 'v = \\frac{d}{t}',
    variables: {
      v: { name: 'Velocity', units: 'm/s', dimension: 'LT^-1' },
      d: { name: 'Distance', units: 'm', dimension: 'L' },
      t: { name: 'Time', units: 's', dimension: 'T' },
    },
    category: 'kinematics',
  },
  {
    id: 'einstein_mass_energy',
    name: 'Mass-Energy Equivalence',
    pattern: /E\s*=\s*m\s*c\s*\^?\s*2/i,
    canonical: 'E = mc²',
    latex: 'E = mc^2',
    variables: {
      E: { name: 'Energy', units: 'J', dimension: 'ML^2T^-2' },
      m: { name: 'Mass', units: 'kg', dimension: 'M' },
      c: { name: 'Speed of light', units: 'm/s', dimension: 'LT^-1', constant: true },
    },
    category: 'relativity',
  },
  {
    id: 'gravity_force',
    name: 'Gravitational Force',
    pattern: /F\s*=\s*G\s*m1\s*m2\s*\/\s*r\s*\^?\s*2/i,
    canonical: 'F = Gm₁m₂/r²',
    latex: 'F = \\frac{Gm_1m_2}{r^2}',
    variables: {
      F: { name: 'Force', units: 'N', dimension: 'MLT^-2' },
      G: { name: 'Gravitational constant', units: 'N⋅m²/kg²', constant: true },
      m1: { name: 'Mass 1', units: 'kg', dimension: 'M' },
      m2: { name: 'Mass 2', units: 'kg', dimension: 'M' },
      r: { name: 'Distance', units: 'm', dimension: 'L' },
    },
    category: 'gravity',
  },
  {
    id: 'ohms_law',
    name: "Ohm's Law",
    pattern: /V\s*=\s*I\s*R/i,
    canonical: 'V = IR',
    latex: 'V = IR',
    variables: {
      V: { name: 'Voltage', units: 'V', dimension: 'ML^2T^-3I^-1' },
      I: { name: 'Current', units: 'A', dimension: 'I' },
      R: { name: 'Resistance', units: 'Ω', dimension: 'ML^2T^-3I^-2' },
    },
    category: 'electricity',
  },
  {
    id: 'power',
    name: 'Power',
    pattern: /P\s*=\s*W\s*\/\s*t/i,
    canonical: 'P = W/t',
    latex: 'P = \\frac{W}{t}',
    variables: {
      P: { name: 'Power', units: 'W', dimension: 'ML^2T^-3' },
      W: { name: 'Work', units: 'J', dimension: 'ML^2T^-2' },
      t: { name: 'Time', units: 's', dimension: 'T' },
    },
    category: 'mechanics',
  },
  {
    id: 'electric_power',
    name: 'Electric Power',
    pattern: /P\s*=\s*V\s*I/i,
    canonical: 'P = VI',
    latex: 'P = VI',
    variables: {
      P: { name: 'Power', units: 'W', dimension: 'ML^2T^-3' },
      V: { name: 'Voltage', units: 'V', dimension: 'ML^2T^-3I^-1' },
      I: { name: 'Current', units: 'A', dimension: 'I' },
    },
    category: 'electricity',
  },
];

/**
 * Common mathematical formulas
 */
const MATH_FORMULAS = [
  {
    id: 'quadratic_formula',
    name: 'Quadratic Formula',
    pattern: /x\s*=\s*\(-b\s*[±+]\s*sqrt\(b\^2\s*-\s*4ac\)\)\s*\/\s*2a/i,
    canonical: 'x = (-b ± √(b² - 4ac)) / 2a',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    category: 'algebra',
  },
  {
    id: 'pythagorean',
    name: 'Pythagorean Theorem',
    pattern: /a\s*\^?\s*2\s*\+\s*b\s*\^?\s*2\s*=\s*c\s*\^?\s*2/i,
    canonical: 'a² + b² = c²',
    latex: 'a^2 + b^2 = c^2',
    category: 'geometry',
  },
  {
    id: 'circle_area',
    name: 'Circle Area',
    pattern: /A\s*=\s*[πpi]\s*r\s*\^?\s*2/i,
    canonical: 'A = πr²',
    latex: 'A = \\pi r^2',
    category: 'geometry',
  },
  {
    id: 'circle_circumference',
    name: 'Circle Circumference',
    pattern: /C\s*=\s*2\s*[πpi]\s*r/i,
    canonical: 'C = 2πr',
    latex: 'C = 2\\pi r',
    category: 'geometry',
  },
  {
    id: 'sphere_volume',
    name: 'Sphere Volume',
    pattern: /V\s*=\s*(4\/3)\s*[πpi]\s*r\s*\^?\s*3/i,
    canonical: 'V = (4/3)πr³',
    latex: 'V = \\frac{4}{3}\\pi r^3',
    category: 'geometry',
  },
];

/**
 * Detect which formula pattern matches the input
 */
export function detectFormulaPattern(latex) {
  if (!latex) return { matches: [], bestMatch: null };

  const normalizedLatex = latex.replace(/\s+/g, ' ').trim();
  const matches = [];

  // Check physics formulas
  PHYSICS_FORMULAS.forEach((formula) => {
    if (formula.pattern.test(normalizedLatex)) {
      matches.push({
        ...formula,
        type: 'physics',
        confidence: calculatePatternConfidence(normalizedLatex, formula.pattern),
      });
    }
  });

  // Check math formulas
  MATH_FORMULAS.forEach((formula) => {
    if (formula.pattern.test(normalizedLatex)) {
      matches.push({
        ...formula,
        type: 'math',
        confidence: calculatePatternConfidence(normalizedLatex, formula.pattern),
      });
    }
  });

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);

  return {
    matches,
    bestMatch: matches.length > 0 ? matches[0] : null,
    hasMatch: matches.length > 0,
  };
}

/**
 * Calculate confidence for pattern match
 */
function calculatePatternConfidence(text, pattern) {
  // Simple heuristic: longer match = higher confidence
  const match = text.match(pattern);
  if (!match) return 0;

  const matchLength = match[0].length;
  const textLength = text.length;
  const coverage = matchLength / textLength;

  return Math.min(0.95, 0.6 + coverage * 0.35);
}

/**
 * Suggest proper spacing for formula
 */
export function suggestSpacing(latex) {
  if (!latex) return { original: latex, suggested: latex, hasChanges: false };

  let suggested = latex;

  // Add spaces around operators
  suggested = suggested.replace(/([+\-*/=])/g, ' $1 ');

  // Remove multiple spaces
  suggested = suggested.replace(/\s+/g, ' ');

  // Remove spaces around parentheses inside
  suggested = suggested.replace(/\(\s+/g, '(');
  suggested = suggested.replace(/\s+\)/g, ')');

  // Add space after commas
  suggested = suggested.replace(/,(\S)/g, ', $1');

  return {
    original: latex,
    suggested: suggested.trim(),
    hasChanges: latex.trim() !== suggested.trim(),
  };
}

/**
 * Validate dimensional consistency (basic check)
 */
export function validateDimensions(formula) {
  if (!formula.variables) {
    return { valid: true, message: 'No dimensional information available' };
  }

  // This is a simplified check - full dimensional analysis is complex
  // For now, just check if dimensions are defined for all variables
  const variables = Object.values(formula.variables);
  const allHaveDimensions = variables.every((v) => v.dimension || v.constant);

  return {
    valid: allHaveDimensions,
    message: allHaveDimensions
      ? 'All variables have dimensional information'
      : 'Some variables missing dimensional information',
  };
}

/**
 * Suggest variable names based on context
 */
export function suggestVariableNames(latex) {
  const suggestions = [];

  // Common physics variable mappings
  const physicsVars = {
    F: 'Force',
    m: 'Mass',
    a: 'Acceleration',
    v: 'Velocity',
    t: 'Time',
    d: 'Distance',
    s: 'Displacement',
    E: 'Energy',
    P: 'Power',
    W: 'Work',
    V: 'Voltage',
    I: 'Current',
    R: 'Resistance',
    g: 'Gravitational acceleration',
    G: 'Gravitational constant',
    c: 'Speed of light',
    h: 'Planck constant',
  };

  // Extract single-letter variables from LaTeX
  const varPattern = /\b([a-zA-Z])\b/g;
  let match;
  const foundVars = new Set();

  while ((match = varPattern.exec(latex)) !== null) {
    const varName = match[1];
    foundVars.add(varName);
  }

  // Suggest meanings for found variables
  foundVars.forEach((varName) => {
    if (physicsVars[varName]) {
      suggestions.push({
        variable: varName,
        meaning: physicsVars[varName],
        confidence: 0.7,
      });
    }
  });

  return suggestions;
}

/**
 * Auto-complete partial formulas
 */
export function autocompleteFormula(partial) {
  if (!partial) return { suggestions: [] };

  const suggestions = [];
  const normalizedPartial = partial.toLowerCase().trim();

  // Check all formulas for partial matches
  [...PHYSICS_FORMULAS, ...MATH_FORMULAS].forEach((formula) => {
    const formulaStart = formula.canonical.toLowerCase().substring(0, partial.length);

    if (formulaStart === normalizedPartial) {
      suggestions.push({
        formula: formula.canonical,
        latex: formula.latex,
        name: formula.name,
        category: formula.category,
        confidence: 0.9,
      });
    }
  });

  return { suggestions };
}

/**
 * Format formula with proper LaTeX
 */
export function formatFormula(latex, options = {}) {
  if (!latex) return { formatted: latex, changes: [] };

  const {
    addSpacing = true,
    improveFragments = true,
    detectPattern = true,
  } = options;

  let formatted = latex;
  const changes = [];

  // Detect pattern and suggest canonical form
  if (detectPattern) {
    const { bestMatch } = detectFormulaPattern(latex);
    if (bestMatch && bestMatch.confidence > 0.8) {
      formatted = bestMatch.latex;
      changes.push({
        type: 'pattern',
        description: `Detected ${bestMatch.name}`,
        confidence: bestMatch.confidence,
      });
    }
  }

  // Improve spacing
  if (addSpacing) {
    const spacingResult = suggestSpacing(formatted);
    if (spacingResult.hasChanges) {
      formatted = spacingResult.suggested;
      changes.push({
        type: 'spacing',
        description: 'Improved spacing',
        confidence: 0.95,
      });
    }
  }

  // Improve common fragments
  if (improveFragments) {
    // Convert simple fractions
    const beforeFrac = formatted;
    formatted = formatted.replace(/(\w+)\s*\/\s*(\w+)/g, '\\frac{$1}{$2}');
    if (beforeFrac !== formatted) {
      changes.push({
        type: 'fraction',
        description: 'Converted to fraction notation',
        confidence: 0.88,
      });
    }

    // Improve superscripts
    const beforeSup = formatted;
    formatted = formatted.replace(/\^([a-zA-Z0-9]{2,})/g, '^{$1}');
    if (beforeSup !== formatted) {
      changes.push({
        type: 'superscript',
        description: 'Added braces to superscript',
        confidence: 0.95,
      });
    }

    // Improve subscripts
    const beforeSub = formatted;
    formatted = formatted.replace(/_([a-zA-Z0-9]{2,})/g, '_{$1}');
    if (beforeSub !== formatted) {
      changes.push({
        type: 'subscript',
        description: 'Added braces to subscript',
        confidence: 0.95,
      });
    }
  }

  return {
    formatted,
    changes,
    hasChanges: changes.length > 0,
  };
}

/**
 * Get all available formula templates
 */
export function getFormulaTemplates(category = null) {
  let formulas = [...PHYSICS_FORMULAS, ...MATH_FORMULAS];

  if (category) {
    formulas = formulas.filter((f) => f.category === category);
  }

  return formulas.map((f) => ({
    id: f.id,
    name: f.name,
    canonical: f.canonical,
    latex: f.latex,
    category: f.category,
    type: PHYSICS_FORMULAS.includes(f) ? 'physics' : 'math',
  }));
}

/**
 * Get formula categories
 */
export function getCategories() {
  const categories = new Set();

  [...PHYSICS_FORMULAS, ...MATH_FORMULAS].forEach((f) => {
    if (f.category) categories.add(f.category);
  });

  return Array.from(categories).sort();
}

export default {
  detectFormulaPattern,
  suggestSpacing,
  validateDimensions,
  suggestVariableNames,
  autocompleteFormula,
  formatFormula,
  getFormulaTemplates,
  getCategories,
  PHYSICS_FORMULAS,
  MATH_FORMULAS,
};
