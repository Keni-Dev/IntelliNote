/**
 * LaTeX to Fabric.js Image Converter
 * 
 * Converts LaTeX equations to fabric.Image objects with handwriting styling
 * Uses KaTeX for rendering in display mode (multi-line, proper sizing)
 * Then converts to canvas image for fabric.js integration
 * 
 * Features:
 * - Display-mode LaTeX rendering (centered, large fractions, etc.)
 * - Handwriting font styling
 * - Size matching to user's handwriting
 * - Erasable and movable on canvas
 */

import katex from 'katex';
import 'katex/dist/katex.min.css';
import * as fabric from 'fabric';

/**
 * Convert LaTeX to a fabric.Image with handwriting styling
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.latex - LaTeX string to render
 * @param {number} options.fontSize - Base font size in pixels
 * @param {string} options.color - Text color (default: '#eab308')
 * @param {string} options.fontFamily - Font family stack
 * @param {number} options.maxWidth - Maximum width in pixels
 * @param {number} options.padding - Padding around the rendered equation
 * @param {number} options.strokeWidth - Stroke width for handwriting effect
 * @returns {Promise<fabric.Image>} Fabric image object
 */
export async function latexToHandwrittenFabricImage({
  latex,
  fontSize = 48,
  color = '#eab308',
  fontFamily = "'Gochi Hand', 'Kalam', 'Architects Daughter', cursive",
  maxWidth = 800,
  padding = 10,
  strokeWidth = 1.5,
} = {}) {
  return new Promise((resolve, reject) => {
    try {
      // 1. Create temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.maxWidth = `${maxWidth}px`;
      container.style.padding = `${padding}px`;
      container.style.background = 'transparent';
      container.style.fontFamily = fontFamily;
      container.style.fontSize = `${fontSize}px`;
      container.style.color = color;
      container.style.lineHeight = '1.2';
      document.body.appendChild(container);

      // 2. Render LaTeX with KaTeX in DISPLAY MODE
      try {
        const html = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: true, // KEY: Multi-line, centered, large rendering
          output: 'html',
          trust: true,
          strict: false,
          maxSize: Infinity,
          maxExpand: Infinity,
        });

        container.innerHTML = html;
      } catch (katexError) {
        console.warn('[latexToFabric] KaTeX rendering error, using plain text:', katexError);
        container.textContent = latex;
      }

      // 3. Apply handwriting styles
      applyHandwritingStyles(container, fontSize, color, fontFamily, strokeWidth);

      // 4. Wait for fonts to load, then convert to canvas
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          convertToFabricImage(container, resolve, reject);
        });
      } else {
        // Fallback if Font Loading API not available
        setTimeout(() => {
          convertToFabricImage(container, resolve, reject);
        }, 100);
      }

    } catch (error) {
      console.error('[latexToFabric] Error:', error);
      reject(error);
    }
  });
}

/**
 * Apply handwriting styling to rendered KaTeX HTML
 */
function applyHandwritingStyles(container, fontSize, color, fontFamily, strokeWidth) {
  // Style all KaTeX elements
  const elements = container.querySelectorAll('.katex, .katex-html, .mord, .mbin, .mrel, .mop, .mopen, .mclose, .mpunct, .minner');
  
  elements.forEach(element => {
    element.style.fontFamily = fontFamily;
    element.style.color = color;
    element.style.fontWeight = 'normal';
    
    // DON'T apply rotation - it causes misalignment
    // Only apply very subtle rotation to standalone numbers/letters
    const isStandaloneChar = element.textContent?.trim().length === 1 && 
                              element.children.length === 0 &&
                              !element.closest('.msupsub');
    
    if (isStandaloneChar) {
      const rotation = (Math.random() - 0.5) * 0.3; // Very subtle: -0.15 to 0.15 degrees
      element.style.transform = `rotate(${rotation}deg)`;
      element.style.display = 'inline-block';
      element.style.transformOrigin = 'center center';
    }
  });

  // Fix superscript and subscript positioning - CRITICAL FOR ALIGNMENT
  container.querySelectorAll('.msupsub').forEach(supsub => {
    supsub.style.fontFamily = fontFamily;
    supsub.style.position = 'relative';
    supsub.style.verticalAlign = 'baseline';
    supsub.style.display = 'inline-block';
  });

  // Ensure superscripts stay in place
  container.querySelectorAll('.msupsub .vlist-t').forEach(vlist => {
    vlist.style.display = 'inline-block';
    vlist.style.verticalAlign = 'baseline';
  });

  // Fix vertical positioning of sup/sub elements
  container.querySelectorAll('.vlist-r').forEach(vlistR => {
    vlistR.style.display = 'inline-block';
    vlistR.style.verticalAlign = 'baseline';
  });

  // Style superscripts with proper positioning
  container.querySelectorAll('sup, .vlist .pstrut + span').forEach(sup => {
    sup.style.fontFamily = fontFamily;
    sup.style.fontSize = '0.75em';
    sup.style.verticalAlign = 'super';
    sup.style.lineHeight = '0';
  });

  // Style subscripts with proper positioning
  container.querySelectorAll('sub').forEach(sub => {
    sub.style.fontFamily = fontFamily;
    sub.style.fontSize = '0.75em';
    sub.style.verticalAlign = 'sub';
    sub.style.lineHeight = '0';
  });

  // Style fraction lines with THICKER hand-drawn effect
  container.querySelectorAll('.frac-line').forEach(line => {
    const thickness = Math.max(3, strokeWidth * 2.5); // Much thicker!
    line.style.borderBottomColor = color;
    line.style.borderBottomWidth = `${thickness}px`;
    line.style.borderBottomStyle = 'solid';
    line.style.minHeight = `${thickness}px`;
    line.style.backgroundColor = color;
    line.style.height = `${thickness}px`;
  });

  // Target all fraction bars more aggressively
  container.querySelectorAll('.mfrac').forEach(frac => {
    const fracLine = frac.querySelector('.frac-line');
    if (fracLine) {
      const thickness = Math.max(4, strokeWidth * 3); // Even thicker for main fractions!
      fracLine.style.borderTopWidth = `${thickness}px`;
      fracLine.style.borderTopColor = color;
      fracLine.style.borderTopStyle = 'solid';
      fracLine.style.backgroundColor = color;
      fracLine.style.height = `${thickness}px`;
      fracLine.style.minHeight = `${thickness}px`;
    }
  });

  // Also target horizontal rules
  container.querySelectorAll('.mfrac > span > span.frac-line, .mfrac .frac-line').forEach(line => {
    const thickness = Math.max(4, strokeWidth * 3);
    line.style.borderBottomWidth = `${thickness}px`;
    line.style.borderBottomColor = color;
    line.style.borderTopWidth = `${thickness}px`;
    line.style.borderTopColor = color;
    line.style.backgroundColor = color;
    line.style.height = `${thickness}px`;
  });

  // Style square root symbols
  container.querySelectorAll('.sqrt-sign').forEach(sign => {
    sign.style.borderColor = color;
    sign.style.borderWidth = `${strokeWidth}px`;
  });

  // Style delimiters (parentheses, brackets)
  container.querySelectorAll('.delimsizing, .delim-size1, .delim-size2, .delim-size3, .delim-size4').forEach(delim => {
    delim.style.fontFamily = fontFamily;
    delim.style.color = color;
  });

  // Add ink texture effect with stroke
  container.style.filter = 'contrast(1.05) brightness(0.97)';
  container.style.webkitTextStroke = `${strokeWidth * 0.3}px ${color}`;
  container.style.textShadow = `0 0 ${strokeWidth * 0.5}px ${color}`;
}

/**
 * Convert HTML element to fabric.Image using canvas
 */
function convertToFabricImage(container, resolve, reject) {
  try {
    // Use html2canvas to render the element
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(container, {
        backgroundColor: null, // Transparent background
        scale: 2, // Higher DPI for better quality
        logging: false,
        useCORS: true,
        allowTaint: true,
      }).then(canvas => {
        // Convert canvas to data URL
        const dataURL = canvas.toDataURL('image/png');
        
        // Create Image element
        const imgElement = new Image();
        imgElement.crossOrigin = 'anonymous';
        imgElement.src = dataURL;
        
        imgElement.onload = () => {
          // Create fabric.Image from the image element
          const fabricImg = new fabric.Image(imgElement, {
            erasable: true, // Make it erasable with eraser tool
            selectable: true,
            hasControls: true,
            hasBorders: true,
            lockRotation: false,
            lockScalingFlip: true,
            customType: 'mathAnswer', // Mark as math answer
          });
          
          // Clean up temporary container
          document.body.removeChild(container);
          
          console.log('[latexToFabric] Successfully created fabric image');
          resolve(fabricImg);
        };
        
        imgElement.onerror = (error) => {
          console.error('[latexToFabric] Image load error:', error);
          document.body.removeChild(container);
          reject(error);
        };
        
      }).catch(error => {
        console.error('[latexToFabric] html2canvas error:', error);
        document.body.removeChild(container);
        reject(error);
      });
      
    }).catch(error => {
      console.error('[latexToFabric] Failed to load html2canvas:', error);
      document.body.removeChild(container);
      reject(error);
    });
    
  } catch (error) {
    console.error('[latexToFabric] Conversion error:', error);
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    reject(error);
  }
}

/**
 * Fallback: Simple text rendering if LaTeX conversion fails
 * 
 * @param {string} text - Text to render
 * @param {Object} options - Styling options
 * @returns {fabric.IText} Fabric text object
 */
export function createFallbackText({
  text,
  fontSize = 48,
  color = '#eab308',
  fontFamily = "'Gochi Hand', 'Kalam', cursive",
} = {}) {
  return new fabric.IText(text, {
    fontSize,
    fill: color,
    fontFamily,
    fontWeight: 'normal',
    erasable: true,
    selectable: true,
    customType: 'mathAnswer',
  });
}

/**
 * Check if LaTeX string is complex enough to need display mode
 * 
 * @param {string} latex - LaTeX string
 * @returns {boolean} True if complex
 */
export function isComplexLatex(latex) {
  if (!latex || typeof latex !== 'string') return false;
  
  // Check for display-mode features
  const complexPatterns = [
    /\\frac/,      // Fractions
    /\\int/,       // Integrals
    /\\sum/,       // Summations
    /\\prod/,      // Products
    /\\lim/,       // Limits
    /\\sqrt/,      // Square roots
    /\\begin/,     // Environments (matrices, etc.)
    /\\left/,      // Large delimiters
    /\\right/,
    /_\{.*\}/,     // Complex subscripts
    /\^\{.*\}/,    // Complex superscripts
  ];
  
  return complexPatterns.some(pattern => pattern.test(latex));
}
