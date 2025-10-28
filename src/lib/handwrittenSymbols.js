/**
 * Handwritten Math Symbols Library
 * 
 * Custom SVG paths for math symbols that aren't available in handwriting fonts.
 * These symbols are rendered in a hand-drawn style to match the overall aesthetic.
 */

export const handwrittenSymbols = {
  // ========================================
  // CALCULUS SYMBOLS
  // ========================================
  
  '∫': {
    name: 'integral',
    svg: `<svg viewBox="0 0 16 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12,3 Q10,2 10,6 L10,26 Q10,30 8,31" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            fill="none"/>
    </svg>`,
    width: 16,
    height: 32,
    baseline: 0.5,
  },
  
  '∂': {
    name: 'partial-derivative',
    svg: `<svg viewBox="0 0 20 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10,4 Q16,4 16,10 Q16,13 13,14 Q10,15 10,18 Q10,22 14,22" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"
            fill="none"/>
      <path d="M4,4 L10,4" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"/>
    </svg>`,
    width: 20,
    height: 28,
    baseline: 0.7,
  },
  
  '∇': {
    name: 'nabla',
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4,4 L12,22 L20,4 L4,4" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
    </svg>`,
    width: 24,
    height: 24,
    baseline: 0.75,
  },
  
  // ========================================
  // SUMMATION & PRODUCT SYMBOLS
  // ========================================
  
  '∑': {
    name: 'summation',
    svg: `<svg viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20,4 L8,4 L14,16 L8,28 L20,28" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
    </svg>`,
    width: 24,
    height: 32,
    baseline: 0.6,
  },
  
  '∏': {
    name: 'product',
    svg: `<svg viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4,4 L4,24 M4,4 L20,4 M20,4 L20,24" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
    </svg>`,
    width: 24,
    height: 28,
    baseline: 0.7,
  },
  
  // ========================================
  // ROOT SYMBOLS
  // ========================================
  
  '√': {
    name: 'square-root',
    svg: `<svg viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2,14 L8,20 L22,4" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
    </svg>`,
    width: 24,
    height: 28,
    baseline: 0.7,
  },
  
  '∛': {
    name: 'cube-root',
    svg: `<svg viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2,14 L8,20 L22,4" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
      <text x="2" y="8" font-size="10" fill="currentColor" font-family="Gochi Hand, Kalam">3</text>
    </svg>`,
    width: 24,
    height: 28,
    baseline: 0.7,
  },
  
  // ========================================
  // INFINITY & SPECIAL SYMBOLS
  // ========================================
  
  '∞': {
    name: 'infinity',
    svg: `<svg viewBox="0 0 32 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4,8 Q6,4 10,4 Q14,4 16,8 Q18,12 22,12 Q26,12 28,8 Q30,4 28,4 Q26,4 22,8 Q18,12 14,12 Q10,12 8,8 Q6,4 4,4 Q2,4 4,8" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"
            fill="none"/>
    </svg>`,
    width: 32,
    height: 16,
    baseline: 0.5,
  },
  
  // ========================================
  // COMPARISON OPERATORS
  // ========================================
  
  '≈': {
    name: 'approximately-equal',
    svg: `<svg viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4,5 Q8,3 12,5 Q16,7 20,5" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"
            fill="none"/>
      <path d="M4,11 Q8,9 12,11 Q16,13 20,11" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"
            fill="none"/>
    </svg>`,
    width: 24,
    height: 16,
    baseline: 0.5,
  },
  
  '≠': {
    name: 'not-equal',
    svg: `<svg viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4,7 L20,7" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"/>
      <path d="M4,13 L20,13" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"/>
      <path d="M6,2 L18,18" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"/>
    </svg>`,
    width: 24,
    height: 20,
    baseline: 0.5,
  },
  
  '≤': {
    name: 'less-than-or-equal',
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20,5 L6,12 L20,19" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
      <path d="M6,22 L20,22" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"/>
    </svg>`,
    width: 24,
    height: 24,
    baseline: 0.6,
  },
  
  '≥': {
    name: 'greater-than-or-equal',
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6,5 L20,12 L6,19" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
      <path d="M6,22 L20,22" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"/>
    </svg>`,
    width: 24,
    height: 24,
    baseline: 0.6,
  },
  
  // ========================================
  // SET THEORY SYMBOLS
  // ========================================
  
  '∈': {
    name: 'element-of',
    svg: `<svg viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16,6 L6,6 Q4,6 4,12 Q4,18 6,18 L16,18" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            fill="none"/>
      <path d="M6,12 L14,12" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"/>
    </svg>`,
    width: 20,
    height: 24,
    baseline: 0.6,
  },
  
  '∉': {
    name: 'not-element-of',
    svg: `<svg viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16,6 L6,6 Q4,6 4,12 Q4,18 6,18 L16,18" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            fill="none"/>
      <path d="M6,12 L14,12" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"/>
      <path d="M2,2 L18,22" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"/>
    </svg>`,
    width: 20,
    height: 24,
    baseline: 0.6,
  },
  
  '⊂': {
    name: 'subset',
    svg: `<svg viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16,6 L6,6 Q4,6 4,12 Q4,18 6,18 L16,18" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            fill="none"/>
    </svg>`,
    width: 20,
    height: 24,
    baseline: 0.6,
  },
  
  '∪': {
    name: 'union',
    svg: `<svg viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4,4 L4,14 Q4,20 10,20 Q16,20 16,14 L16,4" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            fill="none"/>
    </svg>`,
    width: 20,
    height: 24,
    baseline: 0.7,
  },
  
  '∩': {
    name: 'intersection',
    svg: `<svg viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4,20 L4,10 Q4,4 10,4 Q16,4 16,10 L16,20" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            fill="none"/>
    </svg>`,
    width: 20,
    height: 24,
    baseline: 0.7,
  },
  
  '∅': {
    name: 'empty-set',
    svg: `<svg viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="12" r="7" 
              stroke="currentColor" 
              stroke-width="2.5" 
              fill="none"/>
      <path d="M5,7 L15,17" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"/>
    </svg>`,
    width: 20,
    height: 24,
    baseline: 0.6,
  },
  
  // ========================================
  // LOGIC SYMBOLS
  // ========================================
  
  '∀': {
    name: 'for-all',
    svg: `<svg viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10,4 L3,20 M10,4 L17,20" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
      <path d="M6,14 L14,14" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"/>
    </svg>`,
    width: 20,
    height: 24,
    baseline: 0.7,
  },
  
  '∃': {
    name: 'exists',
    svg: `<svg viewBox="0 0 18 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14,4 L4,4 L4,20 L14,20" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
      <path d="M4,12 L12,12" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"/>
    </svg>`,
    width: 18,
    height: 24,
    baseline: 0.7,
  },
  
  '∧': {
    name: 'and',
    svg: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3,18 L10,4 L17,18" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
    </svg>`,
    width: 20,
    height: 20,
    baseline: 0.7,
  },
  
  '∨': {
    name: 'or',
    svg: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3,4 L10,18 L17,4" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
    </svg>`,
    width: 20,
    height: 20,
    baseline: 0.7,
  },
  
  '¬': {
    name: 'not',
    svg: `<svg viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4,4 L16,4 L16,12" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
    </svg>`,
    width: 20,
    height: 16,
    baseline: 0.5,
  },
  
  // ========================================
  // ARROWS
  // ========================================
  
  '→': {
    name: 'right-arrow',
    svg: `<svg viewBox="0 0 28 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2,6 L26,6 M20,2 L26,6 L20,10" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
    </svg>`,
    width: 28,
    height: 12,
    baseline: 0.5,
  },
  
  '⇒': {
    name: 'implies',
    svg: `<svg viewBox="0 0 28 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2,6 L26,6 M20,2 L26,6 L20,10" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
    </svg>`,
    width: 28,
    height: 12,
    baseline: 0.5,
  },
  
  '⇔': {
    name: 'iff',
    svg: `<svg viewBox="0 0 28 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2,6 L26,6 M20,2 L26,6 L20,10 M8,2 L2,6 L8,10" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"/>
    </svg>`,
    width: 28,
    height: 12,
    baseline: 0.5,
  },
  
  // ========================================
  // SPECIAL OPERATORS
  // ========================================
  
  '±': {
    name: 'plus-minus',
    svg: `<svg viewBox="0 0 20 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10,6 L10,16" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"/>
      <path d="M4,11 L16,11" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"/>
      <path d="M4,22 L16,22" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"/>
    </svg>`,
    width: 20,
    height: 28,
    baseline: 0.6,
  },
  
  '×': {
    name: 'times',
    svg: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3,3 L13,13 M13,3 L3,13" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"/>
    </svg>`,
    width: 16,
    height: 16,
    baseline: 0.5,
  },
  
  '÷': {
    name: 'divide',
    svg: `<svg viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="3" r="2" fill="currentColor"/>
      <path d="M3,8 L17,8" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"/>
      <circle cx="10" cy="13" r="2" fill="currentColor"/>
    </svg>`,
    width: 20,
    height: 16,
    baseline: 0.5,
  },
  
  '·': {
    name: 'dot',
    svg: `<svg viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="4" r="2.5" fill="currentColor"/>
    </svg>`,
    width: 8,
    height: 8,
    baseline: 0.5,
  },
};

/**
 * Check if a character is a Greek letter
 */
export function isGreekLetter(char) {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (code >= 0x0370 && code <= 0x03FF) || // Greek and Coptic
         (code >= 0x1F00 && code <= 0x1FFF);   // Greek Extended
}

/**
 * Check if a character has a custom SVG symbol
 */
export function hasCustomSymbol(char) {
  return char in handwrittenSymbols;
}

/**
 * Get symbol metadata
 */
export function getSymbol(char) {
  return handwrittenSymbols[char] || null;
}
