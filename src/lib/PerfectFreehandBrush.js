import * as fabric from 'fabric';
import getStroke from 'perfect-freehand';

/**
 * PerfectFreehandBrush - Fabric.js brush that renders tapered, pressure-aware strokes
 * using the perfect-freehand algorithm. It collects points with pressure and
 * creates a filled polygon path for smooth strokes.
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
    this.simulatePressure = options.simulatePressure ?? !this.pressureSensitivity;
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

  _addPoint(point) {
    this._points.push(point);
  }

  _getOptions() {
    return {
      size: this.baseWidth,
      thinning: this.thinning,
      smoothing: this.smoothing,
      streamline: this.streamline,
      simulatePressure: this.simulatePressure,
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
    const pressure = this.pressureSensitivity
      ? typeof evt?.pressure === 'number' && evt.pressure > 0 ? Math.min(1, Math.max(0, evt.pressure * this.pressureMultiplier)) : 0.5
      : 0.5;
    return [pointer.x, pointer.y, pressure];
  }

  onMouseDown(pointer, options) {
    if (typeof this.canvas._isMainEvent === 'function') {
      if (!this.canvas._isMainEvent(options.e)) return;
    }

    this._points = [];
    this._path = null;

    const [x, y, p] = this._eventToPoint(options);
    this._addPoint([x, y, p]);

    this.canvas.fire('before:path:created');
  }

  onMouseMove(pointer, options) {
    if (!this._points.length) return;
    const [x, y, p] = this._eventToPoint(options);
    this._addPoint([x, y, p]);

    this._drawStroke();
    this.canvas.requestRenderAll();
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
      const path = new fabric.Path(d, {
        fill: this.color,
        stroke: undefined,
        selectable: true,
        evented: true,
        objectCaching: true,
      });
      this.canvas.add(path);
      this.canvas.requestRenderAll();
      this.canvas.fire('path:created', { path });
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

    // Clear the top context
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Use the recommended SVG-like quadratic curve approach for smooth rendering
    const pathData = this._getSvgPathFromStroke(outline);
    if (!pathData) return;

    ctx.save();
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
    if (options.pressureSensitivity !== undefined) this.pressureSensitivity = !!options.pressureSensitivity;
    if (options.pressureMultiplier !== undefined) this.pressureMultiplier = Math.max(0.1, Math.min(3, options.pressureMultiplier));
    if (options.smoothing !== undefined) this.smoothing = options.smoothing;
    if (options.streamline !== undefined) this.streamline = options.streamline;
    if (options.thinning !== undefined) this.thinning = options.thinning;
    if (options.simulatePressure !== undefined) this.simulatePressure = options.simulatePressure;
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
      simulatePressure: this.simulatePressure,
      start: this.start,
      end: this.end,
    };
  }
}

export default PerfectFreehandBrush;
