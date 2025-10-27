/**
 * Stroke Debugger - Visual debugging for equal sign and stroke detection
 * Shows real-time feedback on why detection succeeds or fails
 */

class StrokeDebugger {
  constructor() {
    this.debugLog = [];
    this.debugPanel = null;
    this.visualOverlay = null;
    this.enabled = false; // Start disabled
    this.initialized = false;
    this.ignoreSpacing = true; // Toggle to disable spacing check
  }

  /**
   * Initialize the debugger UI
   */
  init() {
    if (this.initialized) return;
    this.createDebugPanel();
    this.createVisualOverlay();
    this.initialized = true;
  }

  /**
   * Create the floating debug panel
   */
  createDebugPanel() {
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'stroke-debugger';
    this.debugPanel.style.cssText = `
      position: fixed;
      top: 80px;
      right: 10px;
      width: 420px;
      max-height: calc(100vh - 100px);
      background: rgba(0, 0, 0, 0.92);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 15px;
      border-radius: 8px;
      overflow-y: auto;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      display: none;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 2px solid #00ff00;
    `;
    header.innerHTML = `
      <h3 style="margin: 0; color: #00ff00; font-size: 14px;">🔍 Equal Sign Debugger</h3>
      <div style="display: flex; gap: 8px;">
        <button id="toggle-spacing" style="
          background: #666;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
        ">Spacing: OFF</button>
        <button id="close-debugger" style="
          background: #ff0000;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
        ">Close</button>
      </div>
    `;

    const content = document.createElement('div');
    content.id = 'debugger-content';
    content.style.cssText = 'margin-top: 10px;';

    this.debugPanel.appendChild(header);
    this.debugPanel.appendChild(content);
    document.body.appendChild(this.debugPanel);

    // Event listeners
    document.getElementById('close-debugger')?.addEventListener('click', () => {
      this.toggle();
    });
    
    document.getElementById('toggle-spacing')?.addEventListener('click', () => {
      this.ignoreSpacing = !this.ignoreSpacing;
      const btn = document.getElementById('toggle-spacing');
      if (btn) {
        btn.textContent = `Spacing: ${this.ignoreSpacing ? 'OFF' : 'ON'}`;
        btn.style.background = this.ignoreSpacing ? '#666' : '#ffa500';
      }
    });
  }

  /**
   * Create the visual canvas overlay
   */
  createVisualOverlay() {
    this.visualOverlay = document.createElement('canvas');
    this.visualOverlay.id = 'debug-overlay';
    this.visualOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 9999;
      display: none;
    `;
    this.visualOverlay.width = window.innerWidth;
    this.visualOverlay.height = window.innerHeight;
    document.body.appendChild(this.visualOverlay);

    // Resize handler
    window.addEventListener('resize', () => {
      if (this.visualOverlay) {
        this.visualOverlay.width = window.innerWidth;
        this.visualOverlay.height = window.innerHeight;
        this.redrawVisuals();
      }
    });
  }

  /**
   * Toggle debugger visibility
   */
  toggle() {
    if (!this.initialized) {
      this.init();
    }
    this.enabled = !this.enabled;
    this.debugPanel.style.display = this.enabled ? 'block' : 'none';
    this.visualOverlay.style.display = this.enabled ? 'block' : 'none';
    
    if (!this.enabled) {
      this.clearVisualDebug();
    }
    
    return this.enabled;
  }

  /**
   * Enable the debugger
   */
  enable() {
    if (!this.initialized) {
      this.init();
    }
    this.enabled = true;
    this.debugPanel.style.display = 'block';
    this.visualOverlay.style.display = 'block';
  }

  /**
   * Disable the debugger
   */
  disable() {
    this.enabled = false;
    if (this.debugPanel) {
      this.debugPanel.style.display = 'none';
    }
    if (this.visualOverlay) {
      this.visualOverlay.style.display = 'none';
    }
    this.clearVisualDebug();
  }

  /**
   * Debug stroke detection attempt
   */
  debugStrokes(strokes, canvas, result = null) {
    if (!this.enabled) return null;

    const debugInfo = {
      timestamp: new Date().toISOString(),
      strokeCount: strokes?.length || 0,
      strokes: [],
      checks: {
        hasExactlyTwoStrokes: false,
        bothHorizontal: false,
        properAlignment: false,
        properSpacing: false,
        similarWidth: false,
        sufficientLength: false,
      },
      measurements: {},
      result: result ? 'EQUAL_SIGN_DETECTED' : 'NOT_EQUAL_SIGN',
      failureReason: null,
      canvas,
    };

    // Analyze each stroke
    if (strokes && strokes.length > 0) {
      strokes.forEach((stroke, index) => {
        const points = stroke.points || stroke.strokePoints || [];
        const bbox = stroke.bounds || stroke.features?.bounds || this.getBoundingBox(points);
        const aspectRatio = bbox.height > 0 ? bbox.width / bbox.height : 0;
        const isHorizontal = aspectRatio >= 2.5;

        debugInfo.strokes.push({
          id: index + 1,
          pointCount: points.length,
          bbox,
          aspectRatio,
          isHorizontal,
          avgThickness: bbox.height,
        });
      });
    }

    // Check conditions
    debugInfo.checks.hasExactlyTwoStrokes = strokes?.length === 2;

    if (strokes?.length === 2) {
      const [stroke1Data, stroke2Data] = debugInfo.strokes;
      
      debugInfo.checks.bothHorizontal = stroke1Data.isHorizontal && stroke2Data.isHorizontal;
      
      if (!debugInfo.checks.bothHorizontal) {
        debugInfo.failureReason = `Not horizontal. AR1: ${stroke1Data.aspectRatio.toFixed(2)}, AR2: ${stroke2Data.aspectRatio.toFixed(2)} (need ≥ 2.5)`;
      }

      // Width measurements
      debugInfo.measurements.stroke1Width = stroke1Data.bbox.width;
      debugInfo.measurements.stroke2Width = stroke2Data.bbox.width;
      debugInfo.measurements.widthRatio = Math.min(stroke1Data.bbox.width, stroke2Data.bbox.width) / 
                                           Math.max(stroke1Data.bbox.width, stroke2Data.bbox.width);
      debugInfo.checks.similarWidth = debugInfo.measurements.widthRatio >= 0.65;
      
      if (!debugInfo.checks.similarWidth && debugInfo.checks.bothHorizontal) {
        debugInfo.failureReason = `Width mismatch. Ratio: ${debugInfo.measurements.widthRatio.toFixed(2)} (need ≥ 0.65)`;
      }

      // Horizontal overlap
      const overlapStart = Math.max(stroke1Data.bbox.minX, stroke2Data.bbox.minX);
      const overlapEnd = Math.min(stroke1Data.bbox.maxX, stroke2Data.bbox.maxX);
      const overlap = Math.max(0, overlapEnd - overlapStart);
      const minWidth = Math.min(stroke1Data.bbox.width, stroke2Data.bbox.width);
      
      debugInfo.measurements.horizontalOverlap = overlap;
      debugInfo.measurements.overlapPercentage = (overlap / minWidth) * 100;
      debugInfo.checks.properAlignment = debugInfo.measurements.overlapPercentage >= 60;

      if (!debugInfo.checks.properAlignment && debugInfo.checks.bothHorizontal && debugInfo.checks.similarWidth) {
        debugInfo.failureReason = `Poor alignment. Overlap: ${debugInfo.measurements.overlapPercentage.toFixed(1)}% (need ≥ 60%)`;
      }

      // Vertical spacing
      const topStroke = stroke1Data.bbox.minY < stroke2Data.bbox.minY ? stroke1Data : stroke2Data;
      const bottomStroke = stroke1Data.bbox.minY < stroke2Data.bbox.minY ? stroke2Data : stroke1Data;
      const spacing = bottomStroke.bbox.minY - topStroke.bbox.maxY;
      const avgHeight = (stroke1Data.bbox.height + stroke2Data.bbox.height) / 2;
      
      debugInfo.measurements.verticalSpacing = spacing;
      debugInfo.measurements.spacingRatio = spacing / avgHeight;
      
      // Calculate adaptive spacing thresholds (same as detection logic)
      const avgWidth = (stroke1Data.bbox.width + stroke2Data.bbox.width) / 2;
      
      // Match the new adaptive logic
      let lengthFactor;
      if (avgWidth < 60) {
        lengthFactor = 1.5 + (60 - avgWidth) / 40;
      } else if (avgWidth <= 100) {
        lengthFactor = 1.5 - (avgWidth - 60) / 80;
      } else {
        lengthFactor = Math.min(2.5, 1.0 + (avgWidth - 100) / 100);
      }
      
      const adaptiveMinSpacing = 0.4 * lengthFactor;
      const adaptiveMaxSpacing = 3.5 * lengthFactor;
      
      debugInfo.measurements.avgWidth = avgWidth;
      debugInfo.measurements.lengthFactor = lengthFactor;
      debugInfo.measurements.adaptiveMinSpacing = adaptiveMinSpacing;
      debugInfo.measurements.adaptiveMaxSpacing = adaptiveMaxSpacing;
      
      // Allow toggling spacing check off for debugging
      if (this.ignoreSpacing) {
        debugInfo.checks.properSpacing = true; // Always pass when disabled
        debugInfo.spacingDisabled = true;
      } else {
        debugInfo.checks.properSpacing = spacing >= avgHeight * adaptiveMinSpacing && 
                                          spacing <= avgHeight * adaptiveMaxSpacing;
        debugInfo.spacingDisabled = false;
      }

      if (!debugInfo.checks.properSpacing && !this.ignoreSpacing && debugInfo.checks.bothHorizontal && debugInfo.checks.properAlignment && debugInfo.checks.similarWidth) {
        const minAllowed = adaptiveMinSpacing;
        const maxAllowed = adaptiveMaxSpacing;
        debugInfo.failureReason = `Spacing issue. Ratio: ${debugInfo.measurements.spacingRatio.toFixed(2)} (need ${minAllowed.toFixed(2)}-${maxAllowed.toFixed(2)}, adaptive for ${avgWidth.toFixed(0)}px width)`;
      }

      // Length check
      debugInfo.checks.sufficientLength = stroke1Data.bbox.width >= avgHeight * 2 && 
                                           stroke2Data.bbox.width >= avgHeight * 2;

      if (!debugInfo.checks.sufficientLength && debugInfo.checks.bothHorizontal) {
        debugInfo.failureReason = `Lines too short. Need width ≥ ${(avgHeight * 2).toFixed(1)}px`;
      }

      // Final result
      const allChecksPassed = Object.values(debugInfo.checks).every(check => check);
      if (allChecksPassed && !result) {
        debugInfo.result = 'SHOULD_DETECT'; // Detection logic may have different thresholds
      } else if (result) {
        debugInfo.result = 'EQUAL_SIGN_DETECTED';
        debugInfo.failureReason = null;
      }
    } else if (strokes?.length < 2) {
      debugInfo.failureReason = `Only ${strokes?.length || 0} stroke(s). Need exactly 2.`;
    } else {
      debugInfo.failureReason = `Too many strokes: ${strokes.length}. Need exactly 2.`;
    }

    this.debugLog.push(debugInfo);
    this.updateDebugPanel(debugInfo);
    this.drawVisualDebug(debugInfo);

    return debugInfo;
  }

  /**
   * Get bounding box from points
   */
  getBoundingBox(points) {
    if (!points || points.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    }

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return {
      minX, maxX, minY, maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }

  /**
   * Update the debug panel content
   */
  updateDebugPanel(info) {
    if (!this.debugPanel || !this.enabled) return;

    const content = document.getElementById('debugger-content');
    if (!content) return;

    const resultColor = info.result === 'EQUAL_SIGN_DETECTED' ? '#00ff00' : 
                       info.result === 'SHOULD_DETECT' ? '#ffaa00' : '#ff6b6b';
    
    let html = `
      <div style="
        background: ${resultColor};
        color: black;
        padding: 8px;
        border-radius: 4px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 10px;
        font-size: 13px;
      ">
        ${info.result.replace(/_/g, ' ')}
      </div>
    `;

    // Failure reason
    if (info.failureReason) {
      html += `
        <div style="
          background: rgba(255, 107, 107, 0.2);
          border-left: 3px solid #ff6b6b;
          padding: 8px;
          margin-bottom: 10px;
          color: #ffcccc;
          font-size: 11px;
        ">
          <strong>⚠ Reason:</strong> ${info.failureReason}
        </div>
      `;
    }

    // Stroke info
    html += `<div style="margin-bottom: 15px;"><strong style="color: #00ff00;">Strokes: ${info.strokeCount}</strong>`;

    info.strokes.forEach((stroke) => {
      const checkmark = stroke.isHorizontal ? '✓' : '✗';
      const color = stroke.isHorizontal ? '#00ff00' : '#ff6b6b';
      
      html += `
        <div style="
          background: rgba(255,255,255,0.05);
          padding: 6px;
          margin: 5px 0;
          border-left: 3px solid ${color};
          font-size: 11px;
        ">
          <div><strong>Stroke ${stroke.id}:</strong></div>
          <div>Points: ${stroke.pointCount}</div>
          <div>Width: ${stroke.bbox.width.toFixed(1)}px</div>
          <div>Height: ${stroke.bbox.height.toFixed(1)}px</div>
          <div>Aspect: ${stroke.aspectRatio.toFixed(2)} ${checkmark}</div>
          <div style="color: ${color}">Horizontal: ${stroke.isHorizontal ? 'Yes' : 'No'}</div>
        </div>
      `;
    });

    html += `</div>`;

    // Measurements
    if (Object.keys(info.measurements).length > 0) {
      html += `<div style="margin-bottom: 15px;"><strong style="color: #00ff00;">📏 Measurements:</strong>
        <div style="background: rgba(255,255,255,0.05); padding: 6px; margin-top: 5px; font-size: 11px;">`;

      if (info.measurements.widthRatio !== undefined) {
        const widthColor = info.checks.similarWidth ? '#00ff00' : '#ff6b6b';
        html += `<div style="color: ${widthColor}">Width Ratio: ${info.measurements.widthRatio.toFixed(2)} (${info.checks.similarWidth ? 'PASS' : 'FAIL'})</div>`;
      }

      if (info.measurements.overlapPercentage !== undefined) {
        const overlapColor = info.checks.properAlignment ? '#00ff00' : '#ff6b6b';
        html += `<div style="color: ${overlapColor}">Overlap: ${info.measurements.overlapPercentage.toFixed(1)}% (${info.checks.properAlignment ? 'PASS' : 'FAIL'})</div>`;
      }

      if (info.measurements.spacingRatio !== undefined) {
        const spacingColor = info.checks.properSpacing ? '#00ff00' : '#ff6b6b';
        const lengthFactorText = info.measurements.lengthFactor ? ` (×${info.measurements.lengthFactor.toFixed(2)} for ${info.measurements.avgWidth?.toFixed(0)}px width)` : '';
        const disabledText = info.spacingDisabled ? ' [DISABLED]' : '';
        html += `<div style="color: ${spacingColor}">Spacing Ratio: ${info.measurements.spacingRatio.toFixed(2)}${lengthFactorText}${disabledText} (${info.checks.properSpacing ? 'PASS' : 'FAIL'})</div>`;
      }

      html += `</div></div>`;
    }

    // Checklist
    html += `<div><strong style="color: #00ff00;">✓ Checklist:</strong>
      <div style="background: rgba(255,255,255,0.05); padding: 6px; margin-top: 5px; font-size: 11px;">`;

    Object.entries(info.checks).forEach(([key, value]) => {
      const icon = value ? '✓' : '✗';
      const color = value ? '#00ff00' : '#ff6b6b';
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      html += `<div style="color: ${color}">${icon} ${label}</div>`;
    });

    html += `</div></div>`;

    // Clear button
    html += `
      <button id="clear-debug-overlay" style="
        width: 100%;
        margin-top: 10px;
        padding: 8px;
        background: #444;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      ">Clear Visual Overlay</button>
    `;

    content.innerHTML = html;

    // Add event listener for clear button
    setTimeout(() => {
      document.getElementById('clear-debug-overlay')?.addEventListener('click', () => {
        this.clearVisualDebug();
      });
    }, 0);
  }

  /**
   * Draw visual debug overlays on the stroke canvas
   */
  drawVisualDebug(info) {
    if (!this.visualOverlay || !this.enabled || !info.canvas) return;

    const ctx = this.visualOverlay.getContext('2d');
    if (!ctx) return;

    // Don't clear - keep previous for comparison (user can manually clear)

    // Get canvas transform
    const canvas = info.canvas;
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = vpt[0];
    const panX = vpt[4];
    const panY = vpt[5];

    // Transform canvas coordinates to screen coordinates
    const toScreen = (x, y) => ({
      x: x * zoom + panX,
      y: y * zoom + panY,
    });

    // Draw bounding boxes for each stroke
    info.strokes.forEach((strokeInfo) => {
      const color = strokeInfo.isHorizontal ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 107, 107, 0.5)';
      
      const topLeft = toScreen(strokeInfo.bbox.minX, strokeInfo.bbox.minY);
      const size = {
        width: strokeInfo.bbox.width * zoom,
        height: strokeInfo.bbox.height * zoom,
      };

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(topLeft.x, topLeft.y, size.width, size.height);

      // Draw label
      ctx.fillStyle = color;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        `S${strokeInfo.id} (AR: ${strokeInfo.aspectRatio.toFixed(1)})`,
        topLeft.x,
        topLeft.y - 5
      );
    });

    // Draw overlap region if 2 strokes
    if (info.strokes.length === 2 && info.measurements.horizontalOverlap > 0) {
      const [s1, s2] = info.strokes;
      const overlapStart = Math.max(s1.bbox.minX, s2.bbox.minX);
      const overlapEnd = Math.min(s1.bbox.maxX, s2.bbox.maxX);
      
      if (overlapEnd > overlapStart) {
        const topLeft = toScreen(overlapStart, Math.min(s1.bbox.minY, s2.bbox.minY));
        const size = {
          width: (overlapEnd - overlapStart) * zoom,
          height: (Math.max(s1.bbox.maxY, s2.bbox.maxY) - Math.min(s1.bbox.minY, s2.bbox.minY)) * zoom,
        };

        ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
        ctx.fillRect(topLeft.x, topLeft.y, size.width, size.height);
      }
    }
  }

  /**
   * Redraw all visuals (useful after zoom/pan changes)
   */
  redrawVisuals() {
    if (!this.enabled || this.debugLog.length === 0) return;
    
    this.clearVisualDebug();
    const latestInfo = this.debugLog[this.debugLog.length - 1];
    if (latestInfo) {
      this.drawVisualDebug(latestInfo);
    }
  }

  /**
   * Clear visual debug overlay
   */
  clearVisualDebug() {
    if (!this.visualOverlay) return;
    const ctx = this.visualOverlay.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.visualOverlay.width, this.visualOverlay.height);
    }
  }

  /**
   * Export debug log as JSON
   */
  exportLog() {
    return JSON.stringify(this.debugLog, null, 2);
  }

  /**
   * Clean up and destroy the debugger
   */
  destroy() {
    this.debugPanel?.remove();
    this.visualOverlay?.remove();
    this.debugPanel = null;
    this.visualOverlay = null;
    this.initialized = false;
    this.enabled = false;
  }
}

// Export singleton instance
export const strokeDebugger = new StrokeDebugger();
export default StrokeDebugger;
