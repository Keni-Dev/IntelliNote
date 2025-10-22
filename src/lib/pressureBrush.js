import * as fabric from 'fabric';

/**
 * PressureBrush - Custom Fabric.js brush with pressure sensitivity
 * Extends PencilBrush to support pen tablet pressure input
 */
export class PressureBrush extends fabric.PencilBrush {
  constructor(canvas, options = {}) {
    super(canvas);
    
    // Pressure sensitivity settings
    this.baseWidth = Math.max(0.5, options.baseWidth ?? 4);
    this.pressureSensitivity = options.pressureSensitivity ?? true;
    this.pressureMultiplier = options.pressureMultiplier ?? 1.0;
    this.minOpacity = options.minOpacity ?? 0.3;
    this.maxOpacity = options.maxOpacity ?? 1.0;
    
    // Internal smoothing cache for opacity interpolation
    this._smoothedOpacity = 0.8;
    
    // Store current pressure
    this.currentPressure = 0.5;
    
    // Store pointer type
    this.pointerType = 'mouse';
    
    // Store base color for opacity adjustments
    this._baseColor = this.color;
  }

  /**
   * Override onMouseDown to capture pressure from pointer events
   */
  onMouseDown(pointer, options) {
    if (!this.canvas._isMainEvent(options.e)) {
      return;
    }
    
    // Capture pressure and pointer type
    this._capturePointerData(options.e);
    
    // Always use base width, but adjust opacity based on pressure
    this.width = this.baseWidth;
    
    // Update stroke color with opacity based on pressure
    if (this.pressureSensitivity && this.currentPressure > 0) {
      this._applyPressureOpacity(this.currentPressure);
    } else {
      this.color = this._baseColor;
    }
    
    super.onMouseDown(pointer, options);
  }

  /**
   * Override onMouseMove to update pressure continuously
   */
  onMouseMove(pointer, options) {
    if (!this.canvas._isMainEvent(options.e)) {
      return;
    }
    
    // Capture pressure data
    this._capturePointerData(options.e);
    
    // Always use base width, but adjust opacity based on pressure
    this.width = this.baseWidth;
    
    // Update stroke color with opacity based on pressure
    if (this.pressureSensitivity && this.currentPressure > 0) {
      this._applyPressureOpacity(this.currentPressure);
    }
    
    super.onMouseMove(pointer, options);
  }

  /**
   * Capture pointer data from event
   * @private
   */
  _capturePointerData(e) {
    // Get pointer type (mouse, pen, touch)
    this.pointerType = e.pointerType || 'mouse';
    
    // Get pressure (0.0 to 1.0)
    // Pen devices typically report pressure, mouse/touch default to 0.5
    if (e.pressure !== undefined) {
      this.currentPressure = e.pressure;
    } else {
      // Fallback for devices without pressure support
      this.currentPressure = 0.5;
    }
    
    // Store tilt data if available (for future use)
    if (e.tiltX !== undefined) {
      this.tiltX = e.tiltX;
    }
    if (e.tiltY !== undefined) {
      this.tiltY = e.tiltY;
    }
  }

  /**
   * Calculate and apply opacity based on pressure
   * @private
   */
  _applyPressureOpacity(pressure) {
    // Apply pressure multiplier
    const multiplier = Math.max(0.1, this.pressureMultiplier);
    const adjustedPressure = Math.min(1.0, pressure * multiplier);

    // Calculate opacity: interpolate between min and max based on pressure
    const range = this.maxOpacity - this.minOpacity;
    const targetOpacity = this.minOpacity + (range * adjustedPressure);

    // Smooth transitions using simple exponential moving average
    this._smoothedOpacity = (this._smoothedOpacity * 0.6) + (targetOpacity * 0.4);

    const opacity = Math.max(this.minOpacity, Math.min(this.maxOpacity, this._smoothedOpacity));
    
    // Apply opacity to color
    const baseColor = new fabric.Color(this._baseColor);
    baseColor.setAlpha(opacity);
    this.color = baseColor.toRgba();
  }

  /**
   * Calculate brush width based on pressure (legacy, now unused)
   * @private
   */
  _calculatePressureWidth() {
    // This method is kept for backward compatibility but not used
    return this.baseWidth;
  }

  /**
   * Convert path to object for pressure variation
   * Override to apply smooth pressure transitions
   */
  convertPointsToSVGPath(points) {
    const path = super.convertPointsToSVGPath(points);
    return path;
  }

  /**
   * Create path from points with variable width
   * This method creates smoother lines with pressure sensitivity
   */
  createPath(pathData) {
    const path = super.createPath(pathData);
    
    // Store pressure metadata on the path object
    if (path && this.pressureSensitivity) {
      path.pressureSensitive = true;
      path.pressureMultiplier = this.pressureMultiplier;
    }
    
    return path;
  }

  /**
   * Update brush settings
   */
  updateSettings(options = {}) {
    if (options.pressureSensitivity !== undefined) {
      this.pressureSensitivity = options.pressureSensitivity;
    }
    if (options.pressureMultiplier !== undefined) {
      this.pressureMultiplier = Math.max(0.1, Math.min(3.0, options.pressureMultiplier));
    }
    if (options.minOpacity !== undefined) {
      this.minOpacity = Math.max(0.1, Math.min(1.0, options.minOpacity));
    }
    if (options.maxOpacity !== undefined) {
      this.maxOpacity = Math.max(this.minOpacity, Math.min(1.0, options.maxOpacity));
    }
    if (options.baseWidth !== undefined) {
      this.baseWidth = Math.max(0.5, options.baseWidth);
    }
    if (options.color !== undefined) {
      this._baseColor = options.color;
      this.color = options.color;
    }
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      pressureSensitivity: this.pressureSensitivity,
      pressureMultiplier: this.pressureMultiplier,
      minOpacity: this.minOpacity,
      maxOpacity: this.maxOpacity,
      baseWidth: this.baseWidth,
      pointerType: this.pointerType,
      currentPressure: this.currentPressure,
    };
  }

  /**
   * Check if device supports pressure
   */
  static isPressureSupported(e) {
    return e && e.pressure !== undefined && e.pressure !== 0.5;
  }
}

/**
 * Helper function to detect stylus capabilities
 */
export const detectStylusSupport = () => {
  // Check if pointer events are supported
  if (!window.PointerEvent) {
    return {
      supported: false,
      pointerEvents: false,
      pressure: false,
      tilt: false,
    };
  }

  return {
    supported: true,
    pointerEvents: true,
    // Pressure and tilt support can only be detected when actually using a stylus
    pressure: 'pressure' in PointerEvent.prototype,
    tilt: 'tiltX' in PointerEvent.prototype && 'tiltY' in PointerEvent.prototype,
  };
};

/**
 * Load pen preferences from localStorage
 */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizePreferences = (preferences = {}) => {
  const baseWidth = Math.max(1, preferences.baseWidth ?? 4);
  const minWidth = Math.max(0.5, preferences.minWidth ?? baseWidth * 0.4);
  const maxWidth = Math.max(minWidth + 0.5, preferences.maxWidth ?? baseWidth * 2);

  return {
    pressureSensitivity: preferences.pressureSensitivity ?? true,
    pressureMultiplier: clamp(preferences.pressureMultiplier ?? 1.0, 0.1, 3.0),
    minWidth,
    maxWidth,
    baseWidth,
  };
};

export const loadPenPreferences = () => {
  try {
    const saved = localStorage.getItem('intellinote-pen-preferences');
    if (saved) {
      return normalizePreferences(JSON.parse(saved));
    }
  } catch (error) {
    console.error('Error loading pen preferences:', error);
  }
  
  // Default preferences
  return normalizePreferences();
};

/**
 * Save pen preferences to localStorage
 */
export const savePenPreferences = (preferences) => {
  try {
    const normalized = normalizePreferences(preferences);
    localStorage.setItem('intellinote-pen-preferences', JSON.stringify(normalized));
  } catch (error) {
    console.error('Error saving pen preferences:', error);
  }
};
