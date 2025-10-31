import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { handwrittenSymbols, hasCustomSymbol } from '../../lib/handwrittenSymbols';

/**
 * HandwrittenMathAnswer Component
 * 
 * Renders a math answer using KaTeX but styled with handwriting fonts
 * Uses the same layered font system as HandwrittenMath component:
 * - Regular Latin characters: Gochi Hand or Kalam font
 * - Greek letters: Gochi Hand (has handwritten Greek!)
 * - Complex symbols (∫, ∑, √, etc.): Custom SVG paths
 * 
 * @param {string} latex - LaTeX string to render
 * @param {number} fontSize - Font size in pixels
 * @param {string} color - Text color (default: #eab308)
 * @param {string} className - Additional CSS classes
 */
export default function HandwrittenMathAnswer({ 
  latex, 
  fontSize = 48,
  color = '#eab308',
  className = ''
}) {
  const containerRef = useRef(null);
  
  // Render KaTeX and apply handwriting styling
  useEffect(() => {
    if (!containerRef.current || !latex) return;
    
    try {
      const cleanLatex = sanitizeLatex(latex);
      // Render with KaTeX
      const html = katex.renderToString(cleanLatex, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      });
      
      containerRef.current.innerHTML = html;
      
      // Apply handwriting font styling to the rendered content
      applyHandwritingStyles(containerRef.current, fontSize, color);
      
    } catch (error) {
      console.error('[HandwrittenMathAnswer] KaTeX rendering error:', error);
      // Fallback: render as plain text
      containerRef.current.textContent = latex;
    }
  }, [latex, fontSize, color]);
  
  return (
    <span
      ref={containerRef}
      className={`handwritten-math-answer ${className}`}
      style={{
        fontSize: `${fontSize}px`,
        color: color,
        display: 'inline-block',
        fontFamily: "'Architects Daughter', 'Gochi Hand', 'Kalam', cursive",
      }}
    />
  );
}

/**
 * Apply handwriting font styling to KaTeX-rendered elements
 */
function applyHandwritingStyles(container, fontSize, color) {
  if (!container) return;
  
  // Apply handwriting font to all text elements
  const textElements = container.querySelectorAll('.katex, .katex-html, .mord, .mbin, .mrel, .mop, .mpunct');
  
  textElements.forEach(element => {
    // Set handwriting font
    element.style.fontFamily = "'Architects Daughter', 'Gochi Hand', 'Kalam', cursive";
    element.style.fontWeight = 'normal';
    
    // Add slight rotation for natural handwriting feel
    if (element.textContent && element.textContent.trim()) {
      const rotation = (Math.random() - 0.5) * 4; // Random rotation between -2 and 2 degrees
      element.style.transform = `rotate(${rotation}deg)`;
      element.style.display = 'inline-block';
    }
  });
  
  // Replace math symbols with custom SVG where available
  replaceSymbolsWithSVG(container, fontSize, color);
  
  // Style fractions
  const fractions = container.querySelectorAll('.mfrac');
  fractions.forEach(frac => {
    const fLine = frac.querySelector('.frac-line');
    if (fLine) {
      // Make fraction line look hand-drawn
      fLine.style.borderBottom = `2px solid ${color}`;
      fLine.style.borderImage = 'linear-gradient(to right, transparent 0%, currentColor 5%, currentColor 95%, transparent 100%) 1';
    }
  });
  
  // Style square roots
  const sqrts = container.querySelectorAll('.sqrt');
  sqrts.forEach(sqrt => {
    const vlist = sqrt.querySelector('.vlist-t');
    if (vlist) {
      vlist.style.fontFamily = "'Gochi Hand', 'Kalam', cursive";
    }
  });
  
  // Add subtle text shadow for ink effect
  container.style.textShadow = '0 0 0.5px currentColor, 0 0 1px rgba(0, 0, 0, 0.05)';
}

/**
 * Replace special math symbols with custom SVG paths
 */
function replaceSymbolsWithSVG(container, fontSize, color) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const nodesToReplace = [];
  let node = walker.nextNode();
  
  while (node) {
    const text = node.textContent;
    if (!text) {
      node = walker.nextNode();
      continue;
    }
    
    // Check each character in the text node
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (hasCustomSymbol(char)) {
        nodesToReplace.push({ node, char, index: i });
      }
    }
    
    node = walker.nextNode();
  }
  
  // Replace symbols (in reverse order to maintain indices)
  nodesToReplace.reverse().forEach(({ node, char, index }) => {
    const text = node.textContent;
    const before = text.substring(0, index);
    const after = text.substring(index + 1);
    
    const symbol = handwrittenSymbols[char];
    const scale = fontSize / 24; // Base size is 24px
    const width = symbol.width * scale * 0.7;
    const height = symbol.height * scale * 0.7;
    
    // Create a span with the SVG
    const span = document.createElement('span');
    span.className = 'custom-math-symbol';
    span.style.display = 'inline-block';
    span.style.width = `${width}px`;
    span.style.height = `${height}px`;
    span.style.verticalAlign = 'middle';
    span.style.color = color;
    span.innerHTML = symbol.svg;
    
    // Replace the text node
    const parent = node.parentNode;
    if (before) {
      parent.insertBefore(document.createTextNode(before), node);
    }
    parent.insertBefore(span, node);
    if (after) {
      parent.insertBefore(document.createTextNode(after), node);
    }
    parent.removeChild(node);
  });
}

// Remove stray unmatched braces/parentheses that sometimes leak from OCR or formatting
function sanitizeLatex(src) {
  if (!src) return '';
  let s = String(src).trim();

  // Quick fixes for common artifacts: extra closing braces/parentheses
  // e.g., "sin(x)} + C" -> "sin(x) + C"
  s = s.replace(/\)\}+/g, ')');
  s = s.replace(/\}+\)+/g, ')');
  s = s.replace(/\}+$/g, '');
  s = s.replace(/\)+$/g, ')');

  // Normalize + c -> + C for constants of integration (cosmetic)
  s = s.replace(/\+\s*c\b/g, '+ C');

  // Trim repeated spaces
  s = s.replace(/\s{2,}/g, ' ');
  return s;
}
