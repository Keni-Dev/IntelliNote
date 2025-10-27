import getStroke from 'perfect-freehand';
import * as fabric from 'fabric';

/**
 * PerfectFreehandBrush - Fabric.js brush that renders tapered, pressure-aware strokes
 * using the perfect-freehand algorithm. It collects points with pressure and
 * creates a filled polygon path for smooth strokes.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Throttles rendering to every 3rd point during drawing
 * - Uses object caching for completed strokes
 * - Minimizes context state changes
 */
export class PerfectFreehandBrush extends fabric.BaseBrush {
  constructor(canvas, options = {}) {
    super(canvas);

    // Visual options
    this.color = options.color || '#000000';
    this.baseWidth = Math.max(0.5, options.baseWidth ?? 16);

    // Pressure options
    this.pressureSensitivity = options.pressureSensitivity ?? true;
    this.pressureMultiplier = Math.max(0.1, Math.min(3, options.pressureMultiplier ?? 1));

    // Perfect-freehand options (defaults from README example)
    this.smoothing = options.smoothing ?? 0.5;
    this.streamline = options.streamline ?? 0.5;
    this.thinning = options.thinning ?? 0.5; // pressure effect on size
    this._userSimulatePressure = Object.prototype.hasOwnProperty.call(options, 'simulatePressure')
      ? options.simulatePressure
      : undefined;
    this._hasRealPressure = false;
    this.start = options.start ?? { taper: 0, cap: true };
    this.end = options.end ?? { taper: 0, cap: true };
    this.last = false; // will be true on mouse up

    // Internal
    this._points = [];
    this._path = null;
  }

  // Fabric v6 requirement
  needsFullRender() {
    return true;
  }

  // Fabric v6 requirement - render the brush preview on top layer
  _render() {
    // Draw the current stroke in progress
    this._drawStroke();
  }

  _addPoint(point) {
    this._points.push(point);
  }

  _resolveSimulatePressure() {
    if (this._userSimulatePressure !== undefined) {
      return this._userSimulatePressure;
    }

    // If we have confirmed stylus pressure, let perfect-freehand use it.
    if (this._hasRealPressure) {
      return false;
    }

    // No real pressure detected yet. If pressure sensitivity is enabled but we have
    // not received real pressure data, fall back to simulated pressure so the stroke
    // still tapers naturally rather than staying a constant width.
    if (this.pressureSensitivity) {
      return true;
    }

    // Pressure sensitivity disabled: allow simulation for velocity-based variation.
    return true;
  }

  _getOptions() {
    return {
      size: this.baseWidth,
      thinning: this.thinning,
      smoothing: this.smoothing,
      streamline: this.streamline,
      simulatePressure: this._resolveSimulatePressure(),
      start: this.start,
      end: this.end,
      last: this.last,
    };
  }

  // Capture pressure and pointer meta
  _eventToPoint(e) {
    // fabric passes original event at e.e in handlers
    const evt = e?.e || e;
    const pointer = this.canvas.getPointer(evt);
    const clamp01 = (val) => Math.min(1, Math.max(0, val));

    let rawPressure = 0.5;
    let hasRealPressure = false;

    if (this.pressureSensitivity) {
      // Pointer events (preferred on modern browsers)
      if (typeof evt?.pressure === 'number') {
        if (evt.pressure > 0) {
          rawPressure = clamp01(evt.pressure);
          hasRealPressure = true;
        } else if (evt.buttons) {
          // Some devices report 0 while pressed; treat as minimal pressure
          rawPressure = 0.05;
          hasRealPressure = true;
        }
      }

      // WebKit / Safari specific force properties
      if (!hasRealPressure && typeof evt?.webkitForce === 'number') {
        if (evt.webkitForce > 0) {
          const maxForce = evt.webkitMaximum || 4;
          rawPressure = clamp01(evt.webkitForce / maxForce);
          hasRealPressure = true;
        }
      }

      // Touch events (iOS Safari without PointerEvents)
      if (!hasRealPressure && evt?.type && evt.type.startsWith('touch')) {
        const touch = evt.changedTouches?.[0] || evt.touches?.[0];
        if (touch) {
          if (typeof touch.force === 'number' && touch.force > 0) {
            rawPressure = clamp01(touch.force);
            hasRealPressure = true;
          } else if (typeof touch.webkitForce === 'number' && touch.webkitForce > 0) {
            const maxForce = touch.webkitMaximum || 4;
            rawPressure = clamp01(touch.webkitForce / maxForce);
            hasRealPressure = true;
          } else if (touch.force === 0 && evt.type === 'touchmove') {
            rawPressure = 0.05;
            hasRealPressure = true;
          }
        }
      }
    }

    // Apply multiplier and clamp to [0, 1]
    let pressure = clamp01(rawPressure);
    if (this.pressureSensitivity) {
      pressure = clamp01(pressure * this.pressureMultiplier);
      if (hasRealPressure) {
        // Prevent zero-width segments when hardware reports near-zero pressure
        pressure = Math.max(0.02, pressure);
      }
    } else {
      pressure = 0.5;
    }

    if (hasRealPressure) {
      this._hasRealPressure = true;
    }

    return [pointer.x, pointer.y, pressure];
  }

  onMouseDown(pointer, options) {
    if (typeof this.canvas._isMainEvent === 'function') {
      if (!this.canvas._isMainEvent(options.e)) return;
    }

    this._points = [];
    this._path = null;

    if (this._userSimulatePressure === undefined) {
      this._hasRealPressure = false;
    }

    const [x, y, p] = this._eventToPoint(options);
    this._addPoint([x, y, p]);

    this.canvas.fire('before:path:created');
  }

  onMouseMove(pointer, options) {
    if (!this._points.length) return;
    const [x, y, p] = this._eventToPoint(options);
    this._addPoint([x, y, p]);

    // PERFORMANCE: Throttle rendering during drawing - only render every 3rd point
    // or use requestAnimationFrame batching
    if (this._points.length % 3 === 0) {
      this._drawStroke();
      this.canvas.requestRenderAll();
    }
  }

  onMouseUp() {
    if (!this._points.length) return;

    // Clear the preview from top context
    const ctx = this.canvas.contextTop;
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Mark stroke as complete for proper end rendering
    this.last = true;

    // Final draw and commit as a fabric.Path
    const outline = getStroke(this._points, this._getOptions());
    const d = this._getSvgPathFromStroke(outline);

    if (d) {
      const createdAt = Date.now();
      const strokePoints = this._points.map(([px, py, pressure]) => ({
        x: px,
        y: py,
        pressure,
      }));
      const strokeId = `stroke-${createdAt}-${Math.floor(Math.random() * 1e6)}`;

      const path = new fabric.Path(d, {
        fill: this.color,
        stroke: undefined,
        selectable: true,
        evented: true,
        objectCaching: true, // PERFORMANCE: Enable caching for completed strokes
        statefullCache: true, // PERFORMANCE: Cache object state
        noScaleCache: false, // PERFORMANCE: Allow caching at different scales
        cacheProperties: ['fill'], // Only recache when fill changes
      });
      path.set('data', {
        ...(path.data || {}),
        strokeMeta: {
          id: strokeId,
          createdAt,
          points: strokePoints,
        },
      });
      path.set('strokeMeta', {
        id: strokeId,
        createdAt,
        points: strokePoints,
      });
      
      // PERFORMANCE: Add to virtual engine if available, otherwise add to canvas directly
      if (this.canvas.virtualEngine) {
        this.canvas.virtualEngine.addObject(path);
      } else {
        this.canvas.add(path);
      }
      
      this.canvas.requestRenderAll();
      this.canvas.fire('path:created', {
        path,
        strokePoints,
        strokeId,
        createdAt,
      });
    }

    // Clear temp and reset state
    this._points = [];
    this._path = null;
    this.last = false;
  }

  // Draw the live stroke onto top context during drawing
  _drawStroke() {
    if (this._points.length < 2) return;

    const outline = getStroke(this._points, this._getOptions());
    const ctx = this.canvas.contextTop;
    if (!ctx) return;

    const pathData = this._getSvgPathFromStroke(outline);
    if (!pathData) return;

  const retina = typeof this.canvas.getRetinaScaling === 'function' ? this.canvas.getRetinaScaling() : 1;
  const vpt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Mirror Fabric's zoom/pan transform so the preview follows the viewport while drawing
    ctx.setTransform(
      vpt[0] * retina,
      vpt[1] * retina,
      vpt[2] * retina,
      vpt[3] * retina,
      vpt[4] * retina,
      vpt[5] * retina
    );
    ctx.fillStyle = this.color;

    const path2D = new Path2D(pathData);
    ctx.fill(path2D);
    ctx.restore();
  }

  // Utility: convert outline points to smooth SVG path data (from perfect-freehand README)
  _getSvgPathFromStroke(points) {
    const len = points.length;
    if (len < 4) return '';

    const average = (a, b) => (a + b) / 2;

    let a = points[0];
    let b = points[1];
    const c = points[2];

    let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`;

    for (let i = 2, max = len - 1; i < max; i++) {
      a = points[i];
      b = points[i + 1];
      result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
    }

    result += 'Z';
    return result;
  }

  // Legacy utility kept for backward compat (not used)
  _outlineToPathData(outline) {
    if (!outline || outline.length < 2) return '';
    const parts = [`M ${outline[0][0]} ${outline[0][1]}`];
    for (let i = 1; i < outline.length; i++) {
      parts.push(`L ${outline[i][0]} ${outline[i][1]}`);
    }
    parts.push('Z');
    return parts.join(' ');
  }

  // Settings updates
  updateSettings(options = {}) {
    if (options.baseWidth !== undefined) this.baseWidth = Math.max(0.5, options.baseWidth);
    if (options.color !== undefined) this.color = options.color;
    if (options.pressureSensitivity !== undefined) {
      this.pressureSensitivity = !!options.pressureSensitivity;
      if (!this.pressureSensitivity) {
        this._hasRealPressure = false;
      }
    }
    if (options.pressureMultiplier !== undefined) this.pressureMultiplier = Math.max(0.1, Math.min(3, options.pressureMultiplier));
    if (options.smoothing !== undefined) this.smoothing = options.smoothing;
    if (options.streamline !== undefined) this.streamline = options.streamline;
    if (options.thinning !== undefined) this.thinning = options.thinning;
    if (options.simulatePressure !== undefined) {
      this._userSimulatePressure = options.simulatePressure;
    }
    if (options.start !== undefined) this.start = options.start;
    if (options.end !== undefined) this.end = options.end;
  }

  getSettings() {
    return {
      baseWidth: this.baseWidth,
      color: this.color,
      pressureSensitivity: this.pressureSensitivity,
      pressureMultiplier: this.pressureMultiplier,
      smoothing: this.smoothing,
      streamline: this.streamline,
      thinning: this.thinning,
      simulatePressure: this._resolveSimulatePressure(),
      hasRealPressure: this._hasRealPressure,
      start: this.start,
      end: this.end,
    };
  }
}

export default PerfectFreehandBrush;
