/**
 * SVG Generator - Phase 3
 * Converts layout tree to SVG string
 */

import { NodeTypes } from './latexParser.js';

export class SVGGenerator {
  constructor(layout, options = {}) {
    this.layout = layout;
    this.fontFamily = options.fontFamily || "'Gochi Hand', 'Kalam', cursive";
    this.color = options.color || '#eab308';
    this.strokeWidth = options.strokeWidth || 2;
    this.fontSize = options.fontSize || 48;
    this.handwritingVariance = options.handwritingVariance !== false; // Enable slight rotation
  }
  
  /**
   * Generate SVG string from layout
   */
  generate() {
    const padding = 10;
    const width = Math.ceil(this.layout.width + padding * 2);
    const height = Math.ceil(this.layout.height + padding * 2);
    
    console.log('[SVGGenerator] Generating SVG with dimensions:', { width, height, layoutWidth: this.layout.width, layoutHeight: this.layout.height, fontSize: this.fontSize });
    
    // Don't use @import in SVG - Fabric.js may not handle it well
    // Instead, rely on system fonts or inline font-face
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g>
  ${this.renderNode(this.layout, padding, padding)}
  </g>
</svg>`;
    
    return svg;
  }
  
  /**
   * Render a node to SVG
   */
  renderNode(node, offsetX = 0, offsetY = 0) {
    if (!node) return '';
    
    switch (node.type) {
      case NodeTypes.EQUATION:
        return this.renderEquation(node, offsetX, offsetY);
      case NodeTypes.GROUP:
        return this.renderGroup(node, offsetX, offsetY);
      case NodeTypes.FRACTION:
        return this.renderFraction(node, offsetX, offsetY);
      case NodeTypes.SUPERSCRIPT:
        return this.renderSuperscript(node, offsetX, offsetY);
      case NodeTypes.SUBSCRIPT:
        return this.renderSubscript(node, offsetX, offsetY);
      case NodeTypes.SQRT:
        return this.renderSqrt(node, offsetX, offsetY);
      case NodeTypes.INTEGRAL:
        return this.renderIntegral(node, offsetX, offsetY);
      case NodeTypes.SUM:
        return this.renderSum(node, offsetX, offsetY);
      case NodeTypes.LIMIT:
        return this.renderLimit(node, offsetX, offsetY);
      case NodeTypes.PARENTHESES:
        return this.renderParentheses(node, offsetX, offsetY);
      case NodeTypes.ABSOLUTE:
        return this.renderAbsolute(node, offsetX, offsetY);
      case NodeTypes.NUMBER:
      case NodeTypes.VARIABLE:
      case NodeTypes.GREEK:
      case NodeTypes.OPERATOR:
      case NodeTypes.FUNCTION:
      case NodeTypes.TEXT:
        return this.renderText(node, offsetX, offsetY);
      default:
        return '';
    }
  }
  
  /**
   * Render equation (renders all children)
   */
  renderEquation(node, offsetX, offsetY) {
    if (!node.elements || node.elements.length === 0) {
      return '';
    }
    
    return node.elements
      .map(element => this.renderNode(element, offsetX, offsetY))
      .join('\n');
  }
  
  /**
   * Render group (same as equation)
   */
  renderGroup(node, offsetX, offsetY) {
    return this.renderEquation(node, offsetX, offsetY);
  }
  
  /**
   * Render fraction
   */
  renderFraction(node, offsetX, offsetY) {
    return `<!-- Fraction -->
<g>
  <!-- Numerator -->
  ${this.renderNode(node.numerator, offsetX, offsetY)}
  
  <!-- Fraction bar -->
  <line 
    x1="${offsetX + node.bar.x}" 
    y1="${offsetY + node.bar.y}" 
    x2="${offsetX + node.bar.x + node.bar.width}" 
    y2="${offsetY + node.bar.y}" 
    stroke="${this.color}"
    stroke-width="${node.bar.thickness}"
    stroke-linecap="round"
  />
  
  <!-- Denominator -->
  ${this.renderNode(node.denominator, offsetX, offsetY)}
</g>`;
  }
  
  /**
   * Render superscript
   */
  renderSuperscript(node, offsetX, offsetY) {
    return `<!-- Superscript -->
<g>
  ${this.renderNode(node.script || node.exponent, offsetX, offsetY)}
</g>`;
  }
  
  /**
   * Render subscript
   */
  renderSubscript(node, offsetX, offsetY) {
    return `<!-- Subscript -->
<g>
  ${this.renderNode(node.script || node.subscript, offsetX, offsetY)}
</g>`;
  }
  
  /**
   * Render square root
   */
  renderSqrt(node, offsetX, offsetY) {
    const x = offsetX + node.x;
    const y = offsetY + node.y;
    const s = node.symbol;
    
    // Draw √ symbol as path
    const hookX = x + s.width * 0.15;
    const hookY = y + s.height * 0.5;
    const cornerX = x + s.width * 0.35;
    const cornerY = y + s.height * 0.85;
    const topX = x + s.width * 0.6;
    const topY = y + s.height * 0.05;
    const endX = x + s.width;
    const endY = topY;
    
    const path = `M ${hookX} ${hookY} L ${cornerX} ${cornerY} L ${topX} ${topY} L ${endX} ${endY}`;
    
    return `<!-- Square Root -->
<g>
  <!-- √ symbol -->
  <path 
    d="${path}" 
    stroke="${this.color}"
    stroke-width="${s.thickness}"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
  
  <!-- Overline -->
  <line 
    x1="${offsetX + node.overline.x}" 
    y1="${offsetY + node.overline.y}" 
    x2="${offsetX + node.overline.x + node.overline.width}" 
    y2="${offsetY + node.overline.y}" 
    stroke="${this.color}"
    stroke-width="${node.overline.thickness}"
    stroke-linecap="round"
  />
  
  <!-- Content -->
  ${this.renderNode(node.content, offsetX, offsetY)}
</g>`;
  }
  
  /**
   * Render integral
   */
  renderIntegral(node, offsetX, offsetY) {
    const x = offsetX + node.symbol.x;
    const y = offsetY + node.symbol.y;
    const w = node.symbol.width;
    const h = node.symbol.height;
    
    // Draw integral symbol as S-curve
    const topX = x + w * 0.7;
    const topY = y;
    const topCurveX = x + w * 0.4;
    const topCurveY = y + h * 0.15;
    
    const midX = x + w * 0.5;
    const midY = y + h * 0.5;
    
    const bottomCurveX = x + w * 0.6;
    const bottomCurveY = y + h * 0.85;
    const bottomX = x + w * 0.3;
    const bottomY = y + h;
    
    const path = `M ${topX} ${topY} Q ${topCurveX} ${topCurveY} ${midX} ${midY} Q ${bottomCurveX} ${bottomCurveY} ${bottomX} ${bottomY}`;
    
    return `<!-- Integral -->
<g>
  ${node.upper ? this.renderNode(node.upper, offsetX, offsetY) : ''}
  
  <!-- ∫ symbol -->
  <path 
    d="${path}" 
    stroke="${this.color}"
    stroke-width="${Math.max(2, this.strokeWidth * 1.5)}"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
  
  ${node.lower ? this.renderNode(node.lower, offsetX, offsetY) : ''}
</g>`;
  }
  
  /**
   * Render summation
   */
  renderSum(node, offsetX, offsetY) {
    const x = offsetX + node.symbol.x;
    const y = offsetY + node.symbol.y;
    const w = node.symbol.width;
    const h = node.symbol.height;
    
    // Draw Σ symbol as path
    const topLeft = `${x} ${y}`;
    const topRight = `${x + w} ${y}`;
    const mid = `${x + w * 0.3} ${y + h * 0.5}`;
    const bottomRight = `${x + w} ${y + h}`;
    const bottomLeft = `${x} ${y + h}`;
    
    const path = `M ${topRight} L ${topLeft} L ${mid} L ${bottomLeft} L ${bottomRight}`;
    
    return `<!-- Summation -->
<g>
  ${node.upper ? this.renderNode(node.upper, offsetX, offsetY) : ''}
  
  <!-- Σ symbol -->
  <path 
    d="${path}" 
    stroke="${this.color}"
    stroke-width="${Math.max(2, this.strokeWidth * 1.5)}"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
  
  ${node.lower ? this.renderNode(node.lower, offsetX, offsetY) : ''}
</g>`;
  }
  
  /**
   * Render limit
   */
  renderLimit(node, offsetX, offsetY) {
    return `<!-- Limit -->
<g>
  ${this.renderText(node.limText, offsetX, offsetY)}
  ${node.approach ? this.renderNode(node.approach, offsetX, offsetY) : ''}
</g>`;
  }
  
  /**
   * Render parentheses
   */
  renderParentheses(node, offsetX, offsetY) {
    const leftX = offsetX + node.leftParen.x + node.leftParen.width / 2;
    const rightX = offsetX + node.rightParen.x + node.rightParen.width / 2;
    const topY = offsetY + node.y;
    const bottomY = topY + node.height;
    const midY = (topY + bottomY) / 2;
    
    // Left parenthesis as curved path
    const leftPath = `M ${leftX + node.leftParen.width * 0.3} ${topY} Q ${leftX} ${midY} ${leftX + node.leftParen.width * 0.3} ${bottomY}`;
    
    // Right parenthesis as curved path
    const rightPath = `M ${rightX - node.rightParen.width * 0.3} ${topY} Q ${rightX} ${midY} ${rightX - node.rightParen.width * 0.3} ${bottomY}`;
    
    return `<!-- Parentheses -->
<g>
  <path d="${leftPath}" stroke="${this.color}" stroke-width="${Math.max(2, this.strokeWidth * 1.2)}" stroke-linecap="round" fill="none" />
  ${this.renderNode(node.content, offsetX, offsetY)}
  <path d="${rightPath}" stroke="${this.color}" stroke-width="${Math.max(2, this.strokeWidth * 1.2)}" stroke-linecap="round" fill="none" />
</g>`;
  }
  
  /**
   * Render absolute value
   */
  renderAbsolute(node, offsetX, offsetY) {
    const leftX = offsetX + node.leftBar.x + node.leftBar.width / 2;
    const rightX = offsetX + node.rightBar.x + node.rightBar.width / 2;
    const topY = offsetY + node.y;
    const bottomY = topY + node.height;
    
    return `<!-- Absolute Value -->
<g>
  <line x1="${leftX}" y1="${topY}" x2="${leftX}" y2="${bottomY}" stroke="${this.color}" stroke-width="${node.leftBar.width}" stroke-linecap="round" />
  ${this.renderNode(node.content, offsetX, offsetY)}
  <line x1="${rightX}" y1="${topY}" x2="${rightX}" y2="${bottomY}" stroke="${this.color}" stroke-width="${node.rightBar.width}" stroke-linecap="round" />
</g>`;
  }
  
  /**
   * Render text (number, variable, operator, etc.)
   */
  renderText(node, offsetX, offsetY) {
    const x = offsetX + node.x;
    const y = offsetY + node.y;
    
    // Add slight rotation for handwriting effect
    let transform = '';
    if (this.handwritingVariance) {
      const rotation = (Math.random() - 0.5) * 0.5; // Small rotation variance
      const centerX = x + (node.width || 0) / 2;
      const centerY = y + (node.height || 0) / 2;
      transform = ` transform="rotate(${rotation} ${centerX} ${centerY})"`;
    }
    
    const fontSize = node.fontSize || this.fontSize;
    const value = this.escapeXML(node.value || '');
    
    // Apply styles directly to text element for better Fabric.js compatibility
    return `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${this.fontFamily}" fill="${this.color}" dominant-baseline="text-before-edge"${transform}>${value}</text>`;
  }
  
  /**
   * Escape XML special characters
   */
  escapeXML(text) {
    if (!text) return '';
    
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Quick generate helper
 */
export function generateSVG(layout, options) {
  const generator = new SVGGenerator(layout, options);
  return generator.generate();
}
