/**
 * KaTeX to Fabric.js Renderer
 * 
 * Renders LaTeX math expressions as fabric.js Text objects with handwriting styling
 */

import * as fabric from 'fabric';
import katex from 'katex';

/**
 * Format LaTeX result to a more readable plain text format
 * Converts common LaTeX patterns to unicode equivalents
 * 
 * @param {string} latex - LaTeX string
 * @returns {string} Formatted plain text
 */
export function formatLatexToText(latex) {
  if (!latex) return '';
  
  let text = String(latex);
  
  // Handle fractions: \frac{a}{b} -> (a)/(b)
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  
  // Handle square roots: \sqrt{x} -> √x
  text = text.replace(/\\sqrt\{([^}]+)\}/g, '√$1');
  text = text.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√$2'); // nth root
  
  // Handle superscripts
  text = text.replace(/\^{2}/g, '²');
  text = text.replace(/\^{3}/g, '³');
  text = text.replace(/\^{([0-9])}/g, (_, num) => {
    const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    return superscripts[parseInt(num)] || `^${num}`;
  });
  
  // Handle subscripts
  text = text.replace(/_{([0-9])}/g, (_, num) => {
    const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return subscripts[parseInt(num)] || `_${num}`;
  });
  
  // Greek letters (lowercase)
  text = text.replace(/\\alpha/g, 'α');
  text = text.replace(/\\beta/g, 'β');
  text = text.replace(/\\gamma/g, 'γ');
  text = text.replace(/\\delta/g, 'δ');
  text = text.replace(/\\epsilon/g, 'ε');
  text = text.replace(/\\theta/g, 'θ');
  text = text.replace(/\\lambda/g, 'λ');
  text = text.replace(/\\mu/g, 'μ');
  text = text.replace(/\\pi/g, 'π');
  text = text.replace(/\\sigma/g, 'σ');
  text = text.replace(/\\tau/g, 'τ');
  text = text.replace(/\\phi/g, 'φ');
  text = text.replace(/\\omega/g, 'ω');
  
  // Greek letters (uppercase)
  text = text.replace(/\\Gamma/g, 'Γ');
  text = text.replace(/\\Delta/g, 'Δ');
  text = text.replace(/\\Theta/g, 'Θ');
  text = text.replace(/\\Lambda/g, 'Λ');
  text = text.replace(/\\Pi/g, 'Π');
  text = text.replace(/\\Sigma/g, 'Σ');
  text = text.replace(/\\Phi/g, 'Φ');
  text = text.replace(/\\Omega/g, 'Ω');
  
  // Math operators
  text = text.replace(/\\int/g, '∫');
  text = text.replace(/\\sum/g, '∑');
  text = text.replace(/\\prod/g, '∏');
  text = text.replace(/\\infty/g, '∞');
  text = text.replace(/\\partial/g, '∂');
  text = text.replace(/\\nabla/g, '∇');
  
  // Comparison operators
  text = text.replace(/\\approx/g, '≈');
  text = text.replace(/\\neq/g, '≠');
  text = text.replace(/\\leq/g, '≤');
  text = text.replace(/\\geq/g, '≥');
  text = text.replace(/\\le/g, '≤');
  text = text.replace(/\\ge/g, '≥');
  
  // Other operators
  text = text.replace(/\\pm/g, '±');
  text = text.replace(/\\times/g, '×');
  text = text.replace(/\\div/g, '÷');
  text = text.replace(/\\cdot/g, '·');
  
  // Arrows
  text = text.replace(/\\to/g, '→');
  text = text.replace(/\\rightarrow/g, '→');
  
  // Remove remaining LaTeX commands
  text = text.replace(/\\left/g, '');
  text = text.replace(/\\right/g, '');
  text = text.replace(/\\\\/g, '');
  text = text.replace(/\\,/g, ' ');
  text = text.replace(/\\;/g, ' ');
  text = text.replace(/\\!/g, '');
  
  // Clean up braces
  text = text.replace(/\{([^}]*)\}/g, '$1');
  
  return text.trim();
}

/**
 * Create a fabric.js Text object with handwriting styling for a math answer
 * 
 * @param {string} latex - LaTeX string to render
 * @param {Object} options - Configuration options
 * @param {number} options.left - X position
 * @param {number} options.top - Y position
 * @param {number} options.fontSize - Font size in pixels
 * @param {string} options.color - Text color
 * @param {number} options.strokeWidth - Stroke width to match user's handwriting
 * @param {boolean} options.useKaTeX - Whether to try KaTeX rendering (falls back to plain text)
 * @returns {fabric.IText} Fabric.js text object
 */
export function createHandwrittenMathText(latex, options = {}) {
  const {
    left = 0,
    top = 0,
    fontSize = 48,
    color = '#eab308',
    strokeWidth = 0,
  } = options;
  
  // Convert LaTeX to readable text
  const displayText = formatLatexToText(latex);
  
  console.log('[createHandwrittenMathText] LaTeX:', latex, '-> Text:', displayText);
  
  // Create fabric text object with handwriting font
  const textObject = new fabric.IText(displayText, {
    left,
    top,
    fill: color,
    fontSize,
    fontFamily: "'Gochi Hand', 'Kalam', 'Patrick Hand', 'Architects Daughter', cursive",
    fontWeight: 'normal',
    stroke: strokeWidth > 0 ? color : undefined,
    strokeWidth: strokeWidth > 0 ? Math.max(0.5, strokeWidth * 0.3) : 0,
    paintFirst: 'fill',
    customType: 'mathAnswer',
    selectable: true,
    editable: false,
    erasable: true,
    // Add slight shadow for handwritten effect
    shadow: new fabric.Shadow({
      color: 'rgba(0, 0, 0, 0.1)',
      blur: 2,
      offsetX: 0,
      offsetY: 1,
    }),
  });
  
  return textObject;
}

/**
 * Try to render LaTeX using KaTeX and extract the plain text result
 * Falls back to formatLatexToText if KaTeX fails
 * 
 * @param {string} latex - LaTeX string
 * @returns {string} Plain text representation
 */
export function katexToText(latex) {
  try {
    // Try rendering with KaTeX to validate
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: 'html',
    });
    
    // Extract text content from HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = temp.textContent || temp.innerText || '';
    
    // If we got decent text, use it; otherwise fall back
    if (text && text.trim().length > 0) {
      return text.trim();
    }
  } catch (error) {
    console.warn('[katexToText] KaTeX rendering failed:', error);
  }
  
  // Fallback to our custom formatter
  return formatLatexToText(latex);
}
