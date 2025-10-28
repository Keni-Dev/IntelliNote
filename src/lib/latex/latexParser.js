/**
 * LaTeX Parser - Phase 1
 * Converts LaTeX strings into Abstract Syntax Trees (AST)
 */

export const NodeTypes = {
  // Basic
  NUMBER: 'number',
  VARIABLE: 'variable',
  OPERATOR: 'operator',
  
  // Greek
  GREEK: 'greek',
  
  // Functions
  FUNCTION: 'function',
  
  // Structure
  FRACTION: 'fraction',
  SUPERSCRIPT: 'superscript',
  SUBSCRIPT: 'subscript',
  SQRT: 'sqrt',
  
  // Advanced
  INTEGRAL: 'integral',
  SUM: 'sum',
  LIMIT: 'limit',
  DERIVATIVE: 'derivative',
  
  // Grouping
  GROUP: 'group',
  ABSOLUTE: 'absolute',
  PARENTHESES: 'parentheses',
  
  // Containers
  EQUATION: 'equation',
  EXPRESSION: 'expression',
  TEXT: 'text'
};

/**
 * Greek letter mappings
 */
const GREEK_LETTERS = {
  'pi': 'π',
  'theta': 'θ',
  'alpha': 'α',
  'beta': 'β',
  'gamma': 'γ',
  'delta': 'δ',
  'epsilon': 'ε',
  'zeta': 'ζ',
  'eta': 'η',
  'kappa': 'κ',
  'lambda': 'λ',
  'mu': 'μ',
  'nu': 'ν',
  'xi': 'ξ',
  'rho': 'ρ',
  'sigma': 'σ',
  'tau': 'τ',
  'phi': 'φ',
  'chi': 'χ',
  'psi': 'ψ',
  'omega': 'ω',
  'Gamma': 'Γ',
  'Delta': 'Δ',
  'Theta': 'Θ',
  'Lambda': 'Λ',
  'Xi': 'Ξ',
  'Pi': 'Π',
  'Sigma': 'Σ',
  'Phi': 'Φ',
  'Psi': 'Ψ',
  'Omega': 'Ω'
};

/**
 * Math function names
 */
const FUNCTIONS = [
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh',
  'log', 'ln', 'exp',
  'min', 'max', 'sup', 'inf',
  'det', 'dim', 'ker', 'deg'
];

export class LaTeXParser {
  constructor(latex) {
    this.latex = latex || '';
    this.pos = 0;
    this.length = this.latex.length;
  }
  
  /**
   * Parse the LaTeX string into an AST
   */
  parse() {
    if (!this.latex || this.latex.trim() === '') {
      return { type: NodeTypes.EQUATION, children: [] };
    }
    
    try {
      return this.parseEquation();
    } catch (error) {
      console.error('[LaTeXParser] Parse error:', error);
      // Return error node or simple text fallback
      return {
        type: NodeTypes.EQUATION,
        children: [{ type: NodeTypes.TEXT, value: this.latex }]
      };
    }
  }
  
  /**
   * Parse equation (root level)
   */
  parseEquation() {
    const children = [];
    
    while (this.pos < this.length) {
      const node = this.parseNext();
      if (node) {
        children.push(node);
      }
    }
    
    return { type: NodeTypes.EQUATION, children };
  }
  
  /**
   * Parse next node
   */
  parseNext() {
    this.skipWhitespace();
    
    if (this.pos >= this.length) {
      return null;
    }
    
    const char = this.peek();
    
    // Command (starts with \)
    if (char === '\\') {
      return this.parseCommand();
    }
    
    // Number
    if (/[0-9.]/.test(char)) {
      return this.parseNumber();
    }
    
    // Variable (single letter)
    if (/[a-zA-Z]/.test(char)) {
      return this.parseVariable();
    }
    
    // Operator
    if (/[+\-×÷=<>*/]/.test(char)) {
      return this.parseOperator();
    }
    
    // Grouping
    if (char === '{') {
      return this.parseGroup();
    }
    
    if (char === '(') {
      return this.parseParentheses();
    }
    
    if (char === '|') {
      return this.parseAbsolute();
    }
    
    // Superscript
    if (char === '^') {
      return this.parseSuperscript();
    }
    
    // Subscript
    if (char === '_') {
      return this.parseSubscript();
    }
    
    // Unknown - skip or treat as text
    const value = this.advance();
    return { type: NodeTypes.TEXT, value };
  }
  
  /**
   * Parse LaTeX command (starts with \)
   */
  parseCommand() {
    this.advance(); // skip \
    const command = this.readWhile(/[a-zA-Z]/);
    
    if (!command) {
      // Just a backslash followed by non-letter
      return { type: NodeTypes.TEXT, value: '\\' };
    }
    
    // Greek letters
    if (GREEK_LETTERS[command]) {
      return { type: NodeTypes.GREEK, value: GREEK_LETTERS[command] };
    }
    
    // Functions
    if (FUNCTIONS.includes(command)) {
      return { type: NodeTypes.FUNCTION, value: command };
    }
    
    // Structural commands
    switch (command) {
      case 'frac':
        return this.parseFraction();
      case 'sqrt':
        return this.parseSqrt();
      case 'int':
        return this.parseIntegral();
      case 'sum':
        return this.parseSum();
      case 'lim':
        return this.parseLimit();
      case 'left':
      case 'right':
        // Handle delimiter sizing (skip for now)
        return this.parseNext();
      case 'cdot':
        return { type: NodeTypes.OPERATOR, value: '·' };
      case 'times':
        return { type: NodeTypes.OPERATOR, value: '×' };
      case 'div':
        return { type: NodeTypes.OPERATOR, value: '÷' };
      case 'pm':
        return { type: NodeTypes.OPERATOR, value: '±' };
      case 'neq':
        return { type: NodeTypes.OPERATOR, value: '≠' };
      case 'leq':
        return { type: NodeTypes.OPERATOR, value: '≤' };
      case 'geq':
        return { type: NodeTypes.OPERATOR, value: '≥' };
      case 'infty':
        return { type: NodeTypes.TEXT, value: '∞' };
      case 'to':
        return { type: NodeTypes.OPERATOR, value: '→' };
      default:
        // Unknown command - treat as text
        return { type: NodeTypes.TEXT, value: command };
    }
  }
  
  /**
   * Parse fraction: \frac{numerator}{denominator}
   */
  parseFraction() {
    this.skipWhitespace();
    const numerator = this.parseGroup();
    this.skipWhitespace();
    const denominator = this.parseGroup();
    
    return {
      type: NodeTypes.FRACTION,
      numerator: numerator || { type: NodeTypes.TEXT, value: '' },
      denominator: denominator || { type: NodeTypes.TEXT, value: '' }
    };
  }
  
  /**
   * Parse square root: \sqrt{content} or \sqrt[n]{content}
   */
  parseSqrt() {
    this.skipWhitespace();
    
    let index = null;
    
    // Check for optional index: \sqrt[n]{content}
    if (this.peek() === '[') {
      this.advance(); // skip [
      const indexContent = this.readUntil(']');
      this.advance(); // skip ]
      
      if (indexContent) {
        const parser = new LaTeXParser(indexContent);
        index = parser.parse();
      }
    }
    
    this.skipWhitespace();
    const content = this.parseGroup();
    
    return {
      type: NodeTypes.SQRT,
      content: content || { type: NodeTypes.TEXT, value: '' },
      index
    };
  }
  
  /**
   * Parse integral: \int or \int_{lower}^{upper}
   */
  parseIntegral() {
    const node = {
      type: NodeTypes.INTEGRAL,
      lower: null,
      upper: null
    };
    
    this.skipWhitespace();
    
    // Check for limits
    while (this.peek() === '_' || this.peek() === '^') {
      if (this.peek() === '_') {
        this.advance();
        node.lower = this.parseScriptContent();
      } else if (this.peek() === '^') {
        this.advance();
        node.upper = this.parseScriptContent();
      }
      this.skipWhitespace();
    }
    
    return node;
  }
  
  /**
   * Parse summation: \sum_{lower}^{upper}
   */
  parseSum() {
    const node = {
      type: NodeTypes.SUM,
      lower: null,
      upper: null
    };
    
    this.skipWhitespace();
    
    // Check for limits
    while (this.peek() === '_' || this.peek() === '^') {
      if (this.peek() === '_') {
        this.advance();
        node.lower = this.parseScriptContent();
      } else if (this.peek() === '^') {
        this.advance();
        node.upper = this.parseScriptContent();
      }
      this.skipWhitespace();
    }
    
    return node;
  }
  
  /**
   * Parse limit: \lim_{x \to a}
   */
  parseLimit() {
    this.skipWhitespace();
    
    let approach = null;
    
    if (this.peek() === '_') {
      this.advance();
      approach = this.parseScriptContent();
    }
    
    return {
      type: NodeTypes.LIMIT,
      approach
    };
  }
  
  /**
   * Parse superscript: ^{content} or ^x
   */
  parseSuperscript() {
    this.advance(); // skip ^
    this.skipWhitespace();
    
    const exponent = this.parseScriptContent();
    
    return {
      type: NodeTypes.SUPERSCRIPT,
      base: null, // Will be set by parent context
      exponent
    };
  }
  
  /**
   * Parse subscript: _{content} or _x
   */
  parseSubscript() {
    this.advance(); // skip _
    this.skipWhitespace();
    
    const subscript = this.parseScriptContent();
    
    return {
      type: NodeTypes.SUBSCRIPT,
      base: null, // Will be set by parent context
      subscript
    };
  }
  
  /**
   * Parse script content (for super/subscript)
   */
  parseScriptContent() {
    if (this.peek() === '{') {
      return this.parseGroup();
    } else {
      // Single character
      const node = this.parseNext();
      return node || { type: NodeTypes.TEXT, value: '' };
    }
  }
  
  /**
   * Parse group: {...}
   */
  parseGroup() {
    if (this.peek() !== '{') {
      return null;
    }
    
    this.advance(); // skip {
    
    const children = [];
    
    while (this.pos < this.length && this.peek() !== '}') {
      const node = this.parseNext();
      if (node) {
        children.push(node);
      }
    }
    
    if (this.peek() === '}') {
      this.advance(); // skip }
    }
    
    // If single child, return it directly
    if (children.length === 1) {
      return children[0];
    }
    
    return {
      type: NodeTypes.GROUP,
      children
    };
  }
  
  /**
   * Parse parentheses: (...)
   */
  parseParentheses() {
    this.advance(); // skip (
    
    const children = [];
    
    while (this.pos < this.length && this.peek() !== ')') {
      const node = this.parseNext();
      if (node) {
        children.push(node);
      }
    }
    
    if (this.peek() === ')') {
      this.advance(); // skip )
    }
    
    return {
      type: NodeTypes.PARENTHESES,
      children
    };
  }
  
  /**
   * Parse absolute value: |...|
   */
  parseAbsolute() {
    this.advance(); // skip |
    
    const children = [];
    
    while (this.pos < this.length && this.peek() !== '|') {
      const node = this.parseNext();
      if (node) {
        children.push(node);
      }
    }
    
    if (this.peek() === '|') {
      this.advance(); // skip |
    }
    
    return {
      type: NodeTypes.ABSOLUTE,
      children
    };
  }
  
  /**
   * Parse number
   */
  parseNumber() {
    const value = this.readWhile(/[0-9.]/);
    return { type: NodeTypes.NUMBER, value };
  }
  
  /**
   * Parse variable (single letter)
   */
  parseVariable() {
    const value = this.advance();
    return { type: NodeTypes.VARIABLE, value };
  }
  
  /**
   * Parse operator
   */
  parseOperator() {
    let value = this.advance();
    
    // Normalize operators
    if (value === '*') value = '×';
    if (value === '/') value = '÷';
    
    return { type: NodeTypes.OPERATOR, value };
  }
  
  // ============ Helper Methods ============
  
  /**
   * Peek at current character without advancing
   */
  peek() {
    return this.latex[this.pos];
  }
  
  /**
   * Peek at character n positions ahead
   */
  peekAhead(n = 1) {
    return this.latex[this.pos + n];
  }
  
  /**
   * Advance position and return character
   */
  advance() {
    return this.latex[this.pos++];
  }
  
  /**
   * Skip whitespace characters
   */
  skipWhitespace() {
    while (this.pos < this.length && /\s/.test(this.peek())) {
      this.advance();
    }
  }
  
  /**
   * Read characters while they match the pattern
   */
  readWhile(pattern) {
    let result = '';
    while (this.pos < this.length && pattern.test(this.peek())) {
      result += this.advance();
    }
    return result;
  }
  
  /**
   * Read until a specific character
   */
  readUntil(char) {
    let result = '';
    while (this.pos < this.length && this.peek() !== char) {
      result += this.advance();
    }
    return result;
  }
}

/**
 * Quick parse helper
 */
export function parseLatex(latex) {
  const parser = new LaTeXParser(latex);
  return parser.parse();
}
