/**
 * Layout Engine - Phase 2
 * Calculates positions and sizes for each AST element
 */

import { NodeTypes } from './latexParser.js';

export class LayoutEngine {
  constructor(ast, options = {}) {
    this.ast = ast;
    this.baseFontSize = options.fontSize || 48;
    this.strokeWidth = options.strokeWidth || 2;
    this.fontFamily = options.fontFamily || "'Gochi Hand', 'Kalam', cursive";
    this.color = options.color || '#eab308';
    
    // Font metrics (approximate ratios)
    this.charWidthRatio = 0.6; // Character width to font size ratio
    this.baselineRatio = 0.25; // Baseline offset from top
    this.descentRatio = 0.2;   // Descent below baseline
  }
  
  /**
   * Layout the entire AST
   */
  layout() {
    const result = this.layoutNode(this.ast, {
      x: 0,
      y: 0,
      fontSize: this.baseFontSize,
      level: 0
    });
    
    return result;
  }
  
  /**
   * Layout a single node
   */
  layoutNode(node, context) {
    if (!node) {
      return this.createEmptyLayout(context);
    }
    
    switch (node.type) {
      case NodeTypes.EQUATION:
        return this.layoutEquation(node, context);
      case NodeTypes.GROUP:
        return this.layoutGroup(node, context);
      case NodeTypes.FRACTION:
        return this.layoutFraction(node, context);
      case NodeTypes.SUPERSCRIPT:
        return this.layoutSuperscript(node, context);
      case NodeTypes.SUBSCRIPT:
        return this.layoutSubscript(node, context);
      case NodeTypes.SQRT:
        return this.layoutSqrt(node, context);
      case NodeTypes.INTEGRAL:
        return this.layoutIntegral(node, context);
      case NodeTypes.SUM:
        return this.layoutSum(node, context);
      case NodeTypes.LIMIT:
        return this.layoutLimit(node, context);
      case NodeTypes.PARENTHESES:
        return this.layoutParentheses(node, context);
      case NodeTypes.ABSOLUTE:
        return this.layoutAbsolute(node, context);
      case NodeTypes.NUMBER:
      case NodeTypes.VARIABLE:
      case NodeTypes.GREEK:
      case NodeTypes.OPERATOR:
      case NodeTypes.FUNCTION:
      case NodeTypes.TEXT:
        return this.layoutText(node, context);
      default:
        console.warn('[LayoutEngine] Unknown node type:', node.type);
        return this.createEmptyLayout(context);
    }
  }
  
  /**
   * Layout equation (horizontal sequence)
   */
  layoutEquation(node, context) {
    const elements = [];
    let x = context.x;
    const y = context.y;
    let maxHeight = 0;
    let maxBaseline = 0;
    
    // First pass: layout all children
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const nextChild = node.children[i + 1];
      
      // Handle super/subscripts by attaching to previous element
      if (child.type === NodeTypes.SUPERSCRIPT || child.type === NodeTypes.SUBSCRIPT) {
        if (elements.length > 0) {
          const prev = elements[elements.length - 1];
          const script = this.layoutScript(child, prev, context);
          elements.push(script);
          x += script.width;
        }
        continue;
      }
      
      const layout = this.layoutNode(child, { ...context, x, y });
      elements.push(layout);
      
      maxHeight = Math.max(maxHeight, layout.height);
      maxBaseline = Math.max(maxBaseline, layout.baseline || 0);
      
      x += layout.width;
      
      // Add spacing
      const spacing = this.getSpacing(child, nextChild, context);
      x += spacing;
    }
    
    return {
      type: NodeTypes.EQUATION,
      x: context.x,
      y: context.y,
      elements,
      width: x - context.x,
      height: maxHeight || context.fontSize,
      baseline: maxBaseline || context.fontSize * this.baselineRatio
    };
  }
  
  /**
   * Layout group (same as equation but wrapped)
   */
  layoutGroup(node, context) {
    return this.layoutEquation(node, context);
  }
  
  /**
   * Layout fraction
   */
  layoutFraction(node, context) {
    const padding = 4;
    const minBarWidth = 20;
    
    // Smaller font for numerator and denominator
    const scriptFontSize = context.fontSize * 0.7;
    
    // Layout numerator
    const numerator = this.layoutNode(node.numerator, {
      ...context,
      fontSize: scriptFontSize,
      level: context.level + 1
    });
    
    // Layout denominator
    const denominator = this.layoutNode(node.denominator, {
      ...context,
      fontSize: scriptFontSize,
      level: context.level + 1
    });
    
    // Calculate dimensions
    const width = Math.max(
      numerator.width,
      denominator.width,
      minBarWidth
    ) + padding * 2;
    
    const barThickness = Math.max(2, this.strokeWidth * 1.5);
    
    // Position elements
    const numX = context.x + (width - numerator.width) / 2;
    const numY = context.y;
    
    const barY = numY + numerator.height + padding;
    
    const denX = context.x + (width - denominator.width) / 2;
    const denY = barY + barThickness + padding;
    
    const totalHeight = numerator.height + barThickness + denominator.height + padding * 2;
    const baseline = numerator.height + padding + barThickness / 2;
    
    return {
      type: NodeTypes.FRACTION,
      x: context.x,
      y: context.y,
      width,
      height: totalHeight,
      baseline,
      numerator: {
        ...numerator,
        x: numX,
        y: numY
      },
      bar: {
        x: context.x,
        y: barY,
        width,
        thickness: barThickness
      },
      denominator: {
        ...denominator,
        x: denX,
        y: denY
      }
    };
  }
  
  /**
   * Layout superscript or subscript attached to a base
   */
  layoutScript(scriptNode, baseLayout, context) {
    const scriptFontSize = context.fontSize * 0.6;
    const offsetX = baseLayout.width - baseLayout.width * 0.1; // Slight overlap
    
    const script = this.layoutNode(
      scriptNode.exponent || scriptNode.subscript,
      {
        ...context,
        fontSize: scriptFontSize,
        level: context.level + 1
      }
    );
    
    let offsetY;
    if (scriptNode.type === NodeTypes.SUPERSCRIPT) {
      // Raise up
      offsetY = -context.fontSize * 0.45;
    } else {
      // Lower down
      offsetY = context.fontSize * 0.3;
    }
    
    return {
      type: scriptNode.type,
      x: baseLayout.x + offsetX,
      y: baseLayout.y + offsetY,
      width: script.width,
      height: script.height,
      baseline: script.baseline,
      script
    };
  }
  
  /**
   * Layout standalone superscript (shouldn't happen but handle it)
   */
  layoutSuperscript(node, context) {
    const scriptFontSize = context.fontSize * 0.6;
    
    const exponent = this.layoutNode(node.exponent, {
      ...context,
      fontSize: scriptFontSize,
      level: context.level + 1
    });
    
    return {
      type: NodeTypes.SUPERSCRIPT,
      x: context.x,
      y: context.y - context.fontSize * 0.4,
      width: exponent.width,
      height: exponent.height,
      baseline: exponent.baseline,
      exponent
    };
  }
  
  /**
   * Layout standalone subscript
   */
  layoutSubscript(node, context) {
    const scriptFontSize = context.fontSize * 0.6;
    
    const subscript = this.layoutNode(node.subscript, {
      ...context,
      fontSize: scriptFontSize,
      level: context.level + 1
    });
    
    return {
      type: NodeTypes.SUBSCRIPT,
      x: context.x,
      y: context.y + context.fontSize * 0.3,
      width: subscript.width,
      height: subscript.height,
      baseline: subscript.baseline,
      subscript
    };
  }
  
  /**
   * Layout square root
   */
  layoutSqrt(node, context) {
    const padding = 6;
    const thickness = Math.max(2, this.strokeWidth * 1.5);
    
    // Layout content
    const content = this.layoutNode(node.content, {
      ...context,
      level: context.level + 1
    });
    
    // √ symbol dimensions
    const symbolWidth = context.fontSize * 0.5;
    const symbolHeight = content.height + padding * 2;
    
    const totalWidth = symbolWidth + content.width + padding * 2;
    
    return {
      type: NodeTypes.SQRT,
      x: context.x,
      y: context.y,
      width: totalWidth,
      height: symbolHeight,
      baseline: content.baseline + padding,
      symbol: {
        x: context.x,
        y: context.y,
        width: symbolWidth,
        height: symbolHeight,
        thickness
      },
      content: {
        ...content,
        x: context.x + symbolWidth + padding / 2,
        y: context.y + padding
      },
      overline: {
        x: context.x + symbolWidth,
        y: context.y,
        width: content.width + padding * 1.5,
        thickness
      }
    };
  }
  
  /**
   * Layout integral
   */
  layoutIntegral(node, context) {
    const symbolWidth = context.fontSize * 0.6;
    const symbolHeight = context.fontSize * 1.5;
    const scriptFontSize = context.fontSize * 0.5;
    const padding = 4;
    
    let upper = null;
    let lower = null;
    let totalWidth = symbolWidth;
    let totalHeight = symbolHeight;
    
    // Layout limits if present
    if (node.upper) {
      upper = this.layoutNode(node.upper, {
        ...context,
        fontSize: scriptFontSize,
        level: context.level + 1
      });
      totalWidth = Math.max(totalWidth, upper.width);
    }
    
    if (node.lower) {
      lower = this.layoutNode(node.lower, {
        ...context,
        fontSize: scriptFontSize,
        level: context.level + 1
      });
      totalWidth = Math.max(totalWidth, lower.width);
    }
    
    // Calculate positions
    const upperY = context.y;
    const symbolY = upperY + (upper ? upper.height + padding : 0);
    const lowerY = symbolY + symbolHeight + padding;
    
    if (upper) totalHeight += upper.height + padding;
    if (lower) totalHeight += lower.height + padding;
    
    return {
      type: NodeTypes.INTEGRAL,
      x: context.x,
      y: context.y,
      width: totalWidth,
      height: totalHeight,
      baseline: totalHeight / 2,
      symbol: {
        x: context.x + (totalWidth - symbolWidth) / 2,
        y: symbolY,
        width: symbolWidth,
        height: symbolHeight
      },
      upper: upper ? {
        ...upper,
        x: context.x + (totalWidth - upper.width) / 2,
        y: upperY
      } : null,
      lower: lower ? {
        ...lower,
        x: context.x + (totalWidth - lower.width) / 2,
        y: lowerY
      } : null
    };
  }
  
  /**
   * Layout summation
   */
  layoutSum(node, context) {
    const symbolWidth = context.fontSize * 0.9;
    const symbolHeight = context.fontSize * 1.2;
    const scriptFontSize = context.fontSize * 0.5;
    const padding = 4;
    
    let upper = null;
    let lower = null;
    let totalWidth = symbolWidth;
    let totalHeight = symbolHeight;
    
    // Layout limits
    if (node.upper) {
      upper = this.layoutNode(node.upper, {
        ...context,
        fontSize: scriptFontSize,
        level: context.level + 1
      });
      totalWidth = Math.max(totalWidth, upper.width);
    }
    
    if (node.lower) {
      lower = this.layoutNode(node.lower, {
        ...context,
        fontSize: scriptFontSize,
        level: context.level + 1
      });
      totalWidth = Math.max(totalWidth, lower.width);
    }
    
    // Calculate positions
    const upperY = context.y;
    const symbolY = upperY + (upper ? upper.height + padding : 0);
    const lowerY = symbolY + symbolHeight + padding;
    
    if (upper) totalHeight += upper.height + padding;
    if (lower) totalHeight += lower.height + padding;
    
    return {
      type: NodeTypes.SUM,
      x: context.x,
      y: context.y,
      width: totalWidth,
      height: totalHeight,
      baseline: totalHeight / 2,
      symbol: {
        x: context.x + (totalWidth - symbolWidth) / 2,
        y: symbolY,
        width: symbolWidth,
        height: symbolHeight
      },
      upper: upper ? {
        ...upper,
        x: context.x + (totalWidth - upper.width) / 2,
        y: upperY
      } : null,
      lower: lower ? {
        ...lower,
        x: context.x + (totalWidth - lower.width) / 2,
        y: lowerY
      } : null
    };
  }
  
  /**
   * Layout limit
   */
  layoutLimit(node, context) {
    const limWidth = this.measureText('lim', context.fontSize).width;
    const scriptFontSize = context.fontSize * 0.6;
    const padding = 4;
    
    let approach = null;
    let totalWidth = limWidth;
    let totalHeight = context.fontSize;
    
    if (node.approach) {
      approach = this.layoutNode(node.approach, {
        ...context,
        fontSize: scriptFontSize,
        level: context.level + 1
      });
      totalWidth = Math.max(totalWidth, approach.width);
      totalHeight += approach.height + padding;
    }
    
    return {
      type: NodeTypes.LIMIT,
      x: context.x,
      y: context.y,
      width: totalWidth,
      height: totalHeight,
      baseline: context.fontSize * this.baselineRatio,
      limText: {
        x: context.x + (totalWidth - limWidth) / 2,
        y: context.y,
        width: limWidth,
        height: context.fontSize,
        fontSize: context.fontSize,
        value: 'lim'
      },
      approach: approach ? {
        ...approach,
        x: context.x + (totalWidth - approach.width) / 2,
        y: context.y + context.fontSize + padding
      } : null
    };
  }
  
  /**
   * Layout parentheses
   */
  layoutParentheses(node, context) {
    const parenWidth = context.fontSize * 0.3;
    const padding = 2;
    
    // Layout content
    const content = this.layoutEquation(
      { type: NodeTypes.GROUP, children: node.children },
      { ...context, x: context.x + parenWidth + padding }
    );
    
    const totalWidth = parenWidth * 2 + content.width + padding * 2;
    const height = Math.max(content.height, context.fontSize);
    
    return {
      type: NodeTypes.PARENTHESES,
      x: context.x,
      y: context.y,
      width: totalWidth,
      height,
      baseline: content.baseline,
      leftParen: {
        x: context.x,
        y: context.y,
        width: parenWidth,
        height,
        fontSize: context.fontSize
      },
      content: {
        ...content,
        x: context.x + parenWidth + padding,
        y: context.y
      },
      rightParen: {
        x: context.x + totalWidth - parenWidth,
        y: context.y,
        width: parenWidth,
        height,
        fontSize: context.fontSize
      }
    };
  }
  
  /**
   * Layout absolute value
   */
  layoutAbsolute(node, context) {
    const barWidth = Math.max(2, this.strokeWidth * 1.5);
    const padding = 4;
    
    // Layout content
    const content = this.layoutEquation(
      { type: NodeTypes.GROUP, children: node.children },
      { ...context, x: context.x + barWidth + padding }
    );
    
    const totalWidth = barWidth * 2 + content.width + padding * 2;
    const height = Math.max(content.height, context.fontSize);
    
    return {
      type: NodeTypes.ABSOLUTE,
      x: context.x,
      y: context.y,
      width: totalWidth,
      height,
      baseline: content.baseline,
      leftBar: {
        x: context.x,
        y: context.y,
        width: barWidth,
        height
      },
      content: {
        ...content,
        x: context.x + barWidth + padding,
        y: context.y
      },
      rightBar: {
        x: context.x + totalWidth - barWidth,
        y: context.y,
        width: barWidth,
        height
      }
    };
  }
  
  /**
   * Layout text (number, variable, operator, etc.)
   */
  layoutText(node, context) {
    const { width, height, baseline } = this.measureText(
      node.value,
      context.fontSize
    );
    
    return {
      type: node.type,
      x: context.x,
      y: context.y,
      width,
      height,
      baseline,
      value: node.value,
      fontSize: context.fontSize
    };
  }
  
  /**
   * Create empty layout
   */
  createEmptyLayout(context) {
    return {
      type: 'empty',
      x: context.x,
      y: context.y,
      width: 0,
      height: context.fontSize,
      baseline: context.fontSize * this.baselineRatio
    };
  }
  
  // ============ Helper Methods ============
  
  /**
   * Measure text dimensions
   */
  measureText(text, fontSize) {
    if (!text) {
      return { width: 0, height: fontSize, baseline: fontSize * this.baselineRatio };
    }
    
    // Approximate measurements based on font metrics
    const width = text.length * fontSize * this.charWidthRatio;
    const height = fontSize;
    const baseline = fontSize * this.baselineRatio;
    
    return { width, height, baseline };
  }
  
  /**
   * Get spacing between elements
   */
  getSpacing(current, next, context) {
    if (!current || !next) return 0;
    
    const baseSpacing = context.fontSize * 0.15;
    
    // Extra spacing around operators
    if (current.type === NodeTypes.OPERATOR || next.type === NodeTypes.OPERATOR) {
      return context.fontSize * 0.25;
    }
    
    // Extra spacing after functions
    if (current.type === NodeTypes.FUNCTION) {
      return context.fontSize * 0.1;
    }
    
    // Tighter spacing for super/subscripts
    if (next.type === NodeTypes.SUPERSCRIPT || next.type === NodeTypes.SUBSCRIPT) {
      return 0;
    }
    
    return baseSpacing;
  }
}
