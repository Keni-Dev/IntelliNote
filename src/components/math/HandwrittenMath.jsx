import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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
  className = '',
}) {
  const ref = useRef(null);
  const fontSize = Math.round(24 * scale);

  useEffect(() => {
    if (!ref.current) return;
    const expr = sanitizeLatex(latex || '');
    try {
      const html = katex.renderToString(expr, {
        throwOnError: false,
        displayMode: !inline,
        output: 'html',
      });
      ref.current.innerHTML = html;

      // Apply handwriting font styling similar to HandwrittenMathAnswer
      applyHandwritingStyles(ref.current, fontSize, color);
    } catch {
      ref.current.textContent = expr;
    }
  }, [latex, fontSize, color, inline]);

  return (
    <span
      ref={ref}
      className={`handwritten-math-answer ${className}`}
      style={{
        color,
        fontSize: `${fontSize}px`,
        fontFamily: "'Gochi Hand', 'Kalam', 'Architects Daughter', cursive",
        display: inline ? 'inline-block' : 'block',
        lineHeight: 1.2,
      }}
    />
  );
}

// Reuse the same styling helper as the answer component
function applyHandwritingStyles(container, fontSize, color) {
  if (!container) return;
  const textElements = container.querySelectorAll(
    '.katex, .katex-html, .mord, .mbin, .mrel, .mop, .mpunct, .minner'
  );
  textElements.forEach((el) => {
    el.style.fontFamily = "'Gochi Hand', 'Kalam', 'Architects Daughter', cursive";
    el.style.fontWeight = 'normal';
  });

  // fraction line touch-up (hand-drawn look)
  const fractions = container.querySelectorAll('.mfrac .frac-line');
  fractions.forEach((line) => {
    line.style.borderBottom = `2px solid ${color}`;
    line.style.borderImage =
      'linear-gradient(to right, transparent 0%, currentColor 5%, currentColor 95%, transparent 100%) 1';
  });
}

function sanitizeLatex(src) {
  if (!src) return '';
  let s = String(src).trim();
  s = s.replace(/\)\}+/g, ')');
  s = s.replace(/\}+\)+/g, ')');
  s = s.replace(/\}+$/g, '');
  s = s.replace(/\)+$/g, ')');
  s = s.replace(/\+\s*c\b/g, '+ C');
  s = s.replace(/\s{2,}/g, ' ');
  return s;
}
