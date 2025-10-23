import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { PressureBrush, loadPenPreferences, savePenPreferences } from '../lib/pressureBrush';
import PerfectFreehandBrush from '../lib/PerfectFreehandBrush';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizePenSettings = (settings = {}, fallback = {}) => {
  const baseWidth = Math.max(1, settings.baseWidth ?? fallback.baseWidth ?? 4);
  const minWidth = Math.max(0.5, settings.minWidth ?? fallback.minWidth ?? baseWidth * 0.4);
  const maxWidth = Math.max(minWidth + 0.5, settings.maxWidth ?? fallback.maxWidth ?? baseWidth * 2);

  return {
    pressureSensitivity: settings.pressureSensitivity ?? fallback.pressureSensitivity ?? true,
    pressureMultiplier: clamp(settings.pressureMultiplier ?? fallback.pressureMultiplier ?? 1.0, 0.1, 3.0),
    minWidth,
    maxWidth,
    baseWidth,
  };
};

/**
 * Custom hook for managing Fabric.js canvas
 * @param {Object} params
 * @param {string} params.canvasId - Stable identifier for the Fabric canvas instance
 * @param {Object} params.initialData - Initial canvas data to load
 * @param {Function} params.onCanvasChange - Callback when canvas changes
 * @param {React.RefObject<HTMLElement>} params.hostRef - Mount point for Fabric-managed canvas DOM
 */
export const useCanvas = ({ canvasId, initialData, onCanvasChange, hostRef }) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canvasInstance, setCanvasInstance] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const resizeHandlerRef = useRef(null);
  const isInitializingRef = useRef(false);
  const mountedRef = useRef(false);
  const shapeHandlersRef = useRef({ down: null, move: null, up: null });
  const hostElementRef = useRef(null);
  const canvasElementRef = useRef(null);
  
  // Pen/Stylus settings
  const [penSettings, setPenSettings] = useState(() => normalizePenSettings(loadPenPreferences()));
  const pressureBrushRef = useRef(null);

  useEffect(() => {
    const hostElement = hostRef?.current;
    if (!canvasId || !hostElement || isInitializingRef.current) {
      return;
    }

    // Prevent double initialization in strict mode
    if (mountedRef.current) return;
    mountedRef.current = true;

    let isCancelled = false;

    // Cleanup any previous Fabric instance
    if (canvasRef.current) {
      try {
        canvasRef.current.dispose();
      } catch (e) {
        console.warn('Error disposing canvas:', e);
      }
      canvasRef.current = null;
      setCanvasInstance(null);
    }

    // Prepare host container
    hostElementRef.current = hostElement;
    hostElement.innerHTML = '';

    const baseCanvas = document.createElement('canvas');
    baseCanvas.id = canvasId;
    baseCanvas.className = 'fabric-base-canvas';
    baseCanvas.style.display = 'block';
    baseCanvas.style.touchAction = 'none';
    hostElement.appendChild(baseCanvas);
    canvasElementRef.current = baseCanvas;

    // Initialize Fabric canvas
    const initCanvas = async () => {
      try {
        isInitializingRef.current = true;
        setIsLoading(true);

        const canvasEl = canvasElementRef.current;
        if (!canvasEl) {
          console.error('Canvas mount element not available:', canvasId);
          setIsLoading(false);
          isInitializingRef.current = false;
          return;
        }

        // Create new Fabric canvas using the concrete element to avoid race conditions
        const canvas = new fabric.Canvas(canvasEl, {
          isDrawingMode: false, // Start with drawing mode off
          backgroundColor: '#ffffff',
          width: window.innerWidth,
          height: window.innerHeight - 64, // Subtract navbar height
          enableRetinaScaling: true,
        });

        // Ensure Fabric recalculates element offset for accurate pointer mapping
        canvas.calcOffset();

        // Disable default touch actions on interactive layers to avoid browser gestures
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.style.touchAction = 'none';
        }
        if (canvas.lowerCanvasEl) {
          canvas.lowerCanvasEl.style.touchAction = 'none';
        }

        if (isCancelled) {
          try {
            canvas.dispose();
          } catch {
            // Ignore cleanup errors when initialization is cancelled mid-flight
          }
          setIsLoading(false);
          isInitializingRef.current = false;
          return;
        }

        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset transform
        canvas.calcOffset();

        // Enable drawing mode with default settings
        canvas.isDrawingMode = true;
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.width = 2;
          canvas.freeDrawingBrush.color = '#000000';
        }

        // Load initial canvas data if available
        if (initialData && typeof initialData === 'string') {
          try {
            const data = JSON.parse(initialData);

            // Ensure Fabric has created its contexts before loading JSON
            canvas.requestRenderAll();
            await new Promise((r) => requestAnimationFrame(r));
            if (!canvas.contextContainer || !canvas.upperCanvasEl) {
              // Force a dimensions reset to (re)initialize 2D contexts (Fabric v6 quirk)
              canvas.setWidth(window.innerWidth);
              canvas.setHeight(window.innerHeight - 64);
              canvas.calcOffset();
              canvas.requestRenderAll();
              await new Promise((r) => requestAnimationFrame(r));
            }

            // Extract zoom level if stored
            if (data.zoom) {
              setZoom(data.zoom);
              canvas.setZoom(data.zoom);
            }

            // Extract pan offset if stored
            if (data.panOffset) {
              setPanOffset(data.panOffset);
              const vpt = canvas.viewportTransform;
              vpt[4] = data.panOffset.x;
              vpt[5] = data.panOffset.y;
              canvas.setViewportTransform(vpt);
            }

            // Guard against unmount during async load and use promise API to avoid callback timing issues
            try {
              await canvas.loadFromJSON(data);
              canvas.renderAll();
            } catch (error) {
              console.error('Error loading canvas data:', error);
            }
          } catch (error) {
            console.error('Error parsing canvas data:', error);
          }
        }

        if (isCancelled) {
          try {
            canvas.dispose();
          } catch {
            // Ignore cleanup errors when initialization is cancelled mid-flight
          }
          setIsLoading(false);
          isInitializingRef.current = false;
          return;
        }

        // Listen for canvas modifications
        canvas.on('object:modified', () => {
          if (onCanvasChange) {
            const jsonData = JSON.stringify(canvas.toJSON());
            onCanvasChange(jsonData);
          }
        });

        canvas.on('object:added', () => {
          if (onCanvasChange) {
            const jsonData = JSON.stringify(canvas.toJSON());
            onCanvasChange(jsonData);
          }
        });

        canvas.on('object:removed', () => {
          if (onCanvasChange) {
            const jsonData = JSON.stringify(canvas.toJSON());
            onCanvasChange(jsonData);
          }
        });

        // Handle window resize
        const handleResize = () => {
          canvas.setWidth(window.innerWidth);
          canvas.setHeight(window.innerHeight - 64);
          canvas.calcOffset();
          canvas.requestRenderAll();
        };

        resizeHandlerRef.current = handleResize;
        window.addEventListener('resize', handleResize);

        canvasRef.current = canvas;
        setCanvasInstance(canvas);
        setIsLoading(false);
        isInitializingRef.current = false;
      } catch (error) {
        console.error('Error initializing canvas:', error);
        setIsLoading(false);
        isInitializingRef.current = false;
      }
    };

    initCanvas();

    // Cleanup on unmount
    return () => {
      isCancelled = true;
      mountedRef.current = false;
      isInitializingRef.current = false;

      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }

      if (canvasRef.current) {
        try {
          canvasRef.current.dispose();
        } catch {
          // Ignore cleanup errors if DOM hierarchy already reset by Fabric
        }
        canvasRef.current = null;
      }

      if (hostElementRef.current) {
        hostElementRef.current.innerHTML = '';
      }
      canvasElementRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId, hostRef]);

  /**
   * Get current canvas data as JSON string
   */
  const getCanvasData = () => {
    if (!canvasRef.current) return null;
    const data = canvasRef.current.toJSON();
    // Include zoom and pan offset
    data.zoom = zoom;
    data.panOffset = panOffset;
    return JSON.stringify(data);
  };

  /**
   * Clear the canvas
   */
  const clearCanvas = () => {
    if (!canvasRef.current) return;
    canvasRef.current.clear();
    canvasRef.current.backgroundColor = '#ffffff';
  canvasRef.current.requestRenderAll();
  };

  /**
   * Set drawing mode
   */
  const setDrawingMode = (enabled) => {
    if (!canvasRef.current) return;
    canvasRef.current.isDrawingMode = enabled;
  };

  /**
   * Set brush properties
   */
  const setBrushProperties = (width, color) => {
    if (!canvasRef.current || !canvasRef.current.freeDrawingBrush) return;
    if (width) canvasRef.current.freeDrawingBrush.width = width;
    if (color) {
      canvasRef.current.freeDrawingBrush.color = color;
      // Update base color for PressureBrush
      if (canvasRef.current.freeDrawingBrush._baseColor !== undefined) {
        canvasRef.current.freeDrawingBrush._baseColor = color;
      }
    }
  };

  /**
   * Enable pen tool for free drawing
   */
  const enablePenTool = (width, color) => {
    if (!canvasRef.current) return;
    canvasRef.current.isDrawingMode = true;
    
    const desiredBaseWidth = width ?? penSettings.baseWidth ?? 4;
    const brushPreferences = normalizePenSettings(
      {
        ...penSettings,
        baseWidth: desiredBaseWidth,
      },
      penSettings
    );

    // Persist base width changes triggered outside of pen settings panel
    if (desiredBaseWidth !== penSettings.baseWidth) {
      setPenSettings(brushPreferences);
      savePenPreferences(brushPreferences);
    }

    // Use PerfectFreehand-based brush for smoother tapered strokes (pressure-aware)
    const phBrush = new PerfectFreehandBrush(canvasRef.current, {
      pressureSensitivity: brushPreferences.pressureSensitivity,
      pressureMultiplier: brushPreferences.pressureMultiplier,
      baseWidth: brushPreferences.baseWidth,
      color: color || '#000000',
    });

    // Assign to Fabric's drawing brush API for compatibility
    canvasRef.current.freeDrawingBrush = phBrush;
    pressureBrushRef.current = phBrush;
  };

  /**
   * Enable eraser tool - removes entire objects on hover/click
   */
  const enableEraserTool = () => {
    if (!canvasRef.current) return;
    
    // Disable drawing mode for eraser
    canvasRef.current.isDrawingMode = false;
    canvasRef.current.selection = false;
    
    // Set cursor to indicate eraser mode
    canvasRef.current.defaultCursor = 'crosshair';
    canvasRef.current.hoverCursor = 'crosshair';
  };

  /**
   * Enable select tool
   */
  const enableSelectTool = () => {
    if (!canvasRef.current) return;
    canvasRef.current.isDrawingMode = false;
    canvasRef.current.selection = true;
  };

  /**
   * Add text to canvas
   */
  const addText = (color) => {
    if (!canvasRef.current) return;
    
    const text = new fabric.IText('Click to edit', {
      left: canvasRef.current.width / 2,
      top: canvasRef.current.height / 2,
      fontFamily: 'Roboto, sans-serif',
      fontSize: 16,
      fill: color || '#000000',
      editable: true,
    });
    
    canvasRef.current.add(text);
    canvasRef.current.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
  canvasRef.current.requestRenderAll();
  };

  /**
   * Enable shape drawing mode
   */
  const disableShapeTool = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { down, move, up } = shapeHandlersRef.current;
    if (down) {
      canvas.off('mouse:down', down);
    }
    if (move) {
      canvas.off('mouse:move', move);
    }
    if (up) {
      canvas.off('mouse:up', up);
    }

    shapeHandlersRef.current = { down: null, move: null, up: null };
  };

  const enableShapeTool = (shapeType, color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    disableShapeTool();

    canvas.isDrawingMode = false;
    canvas.selection = false;

    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let shape = null;

    const handleMouseMove = (options) => {
      if (!isDrawing || !shape) return;

      const pointer = canvas.getPointer(options.e);

      if (shapeType === 'line') {
        shape.set({
          x2: pointer.x,
          y2: pointer.y,
        });
        // Ensure Fabric updates the interactive region for hit-testing
        shape.setCoords();
      } else if (shapeType === 'rectangle') {
        const width = pointer.x - startX;
        const height = pointer.y - startY;

        shape.set({
          width: Math.abs(width),
          height: Math.abs(height),
          left: width < 0 ? pointer.x : startX,
          top: height < 0 ? pointer.y : startY,
        });
        // Keep coordinates in sync while resizing
        shape.setCoords();
      } else if (shapeType === 'circle') {
        const deltaX = pointer.x - startX;
        const deltaY = pointer.y - startY;
        const radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 2;
        const centerX = startX + deltaX / 2;
        const centerY = startY + deltaY / 2;

        shape.set({
          radius: Math.abs(radius),
          left: centerX - Math.abs(radius),
          top: centerY - Math.abs(radius),
        });
        // Update control points/bounds for accurate hit-testing
        shape.setCoords();
      }

      canvas.requestRenderAll();
    };

    const handleMouseUp = () => {
      if (!isDrawing) return;

      isDrawing = false;
      // Finalize the shape's coordinates so selection/erasing works immediately
      if (shape && typeof shape.setCoords === 'function') {
        shape.setCoords();
      }
      shape = null;

      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);

      shapeHandlersRef.current.move = null;
      shapeHandlersRef.current.up = null;

      canvas.requestRenderAll();
    };

    const handleMouseDown = (options) => {
      if (options.e.button !== 0) {
        return;
      }

      canvas.discardActiveObject();

      const pointer = canvas.getPointer(options.e);
      startX = pointer.x;
      startY = pointer.y;
      isDrawing = true;

      if (shapeType === 'line') {
        shape = new fabric.Line([startX, startY, startX, startY], {
          stroke: color || '#000000',
          strokeWidth: 2,
          selectable: true,
        });
      } else if (shapeType === 'rectangle') {
        shape = new fabric.Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: color || '#000000',
          strokeWidth: 2,
          selectable: true,
        });
      } else if (shapeType === 'circle') {
        shape = new fabric.Circle({
          left: startX,
          top: startY,
          radius: 0,
          fill: 'transparent',
          stroke: color || '#000000',
          strokeWidth: 2,
          selectable: true,
        });
      }

      if (shape) {
        canvas.add(shape);
        canvas.setActiveObject(shape);
        // Initialize coordinates on creation to avoid stale bounds
        if (typeof shape.setCoords === 'function') {
          shape.setCoords();
        }
      }

      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);

      shapeHandlersRef.current.move = handleMouseMove;
      shapeHandlersRef.current.up = handleMouseUp;
    };

    canvas.on('mouse:down', handleMouseDown);
    shapeHandlersRef.current.down = handleMouseDown;
  };


  /**
   * Set zoom level
   */
  const setCanvasZoom = (zoomLevel, point) => {
    if (!canvasRef.current) return;
    
    // Clamp zoom between 0.1 (10%) and 5 (500%)
    const clampedZoom = Math.max(0.1, Math.min(5, zoomLevel));
    
    if (point) {
      // Zoom to a specific point (mouse position)
      const p = point.x !== undefined && point.y !== undefined
        ? new fabric.Point(point.x, point.y)
        : point;
      canvasRef.current.zoomToPoint(p, clampedZoom);
    } else {
      // Zoom to center
      const center = new fabric.Point(
        canvasRef.current.width / 2,
        canvasRef.current.height / 2
      );
      canvasRef.current.zoomToPoint(center, clampedZoom);
    }
    
    setZoom(clampedZoom);
    
    // Update pan offset
    const vpt = canvasRef.current.viewportTransform;
    setPanOffset({ x: vpt[4], y: vpt[5] });
  canvasRef.current.calcOffset();
    
  canvasRef.current.requestRenderAll();
    // Avoid heavy serialization during interactive zoom; persistence is handled by object events
  };

  /**
   * Zoom in by 10%
   */
  const zoomIn = () => {
    setCanvasZoom(zoom * 1.1);
  };

  /**
   * Zoom out by 10%
   */
  const zoomOut = () => {
    setCanvasZoom(zoom * 0.9);
  };

  /**
   * Reset zoom to 100%
   */
  const resetZoom = () => {
    setCanvasZoom(1);
  };

  /**
   * Fit canvas to window
   */
  const fitToWindow = () => {
    if (!canvasRef.current) return;
    
    // Get all objects bounding box
    const objects = canvasRef.current.getObjects();
    if (objects.length === 0) {
      resetZoom();
      return;
    }
    
    const group = new fabric.Group(objects);
    const boundingRect = group.getBoundingRect();
    group.destroy();
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight - 64;
    
    const zoomX = windowWidth / boundingRect.width;
    const zoomY = windowHeight / boundingRect.height;
    const fitZoom = Math.min(zoomX, zoomY) * 0.9; // 90% to add padding
    
    setCanvasZoom(fitZoom);
  };

  /**
   * Pan the canvas by delta
   */
  const panCanvas = (deltaX, deltaY) => {
    if (!canvasRef.current) return;
    
    const vpt = canvasRef.current.viewportTransform;
    vpt[4] += deltaX;
    vpt[5] += deltaY;
    
  canvasRef.current.setViewportTransform(vpt);
  setPanOffset({ x: vpt[4], y: vpt[5] });
  canvasRef.current.calcOffset();
  canvasRef.current.requestRenderAll();
    // Avoid heavy serialization during interactive pan; persistence is handled by object events
  };

  /**
   * Update pen settings and save to localStorage
   */
  const updatePenSettings = (newSettings) => {
    const updated = normalizePenSettings(newSettings, penSettings);
    setPenSettings(updated);
    savePenPreferences(updated);
    
    // Update current brush if it's a PressureBrush
    if (pressureBrushRef.current && pressureBrushRef.current.updateSettings) {
      pressureBrushRef.current.updateSettings(updated);
      if (updated.baseWidth && canvasRef.current?.freeDrawingBrush) {
        // Keep size in sync
        if (typeof canvasRef.current.freeDrawingBrush.width === 'number') {
          canvasRef.current.freeDrawingBrush.width = updated.baseWidth;
        }
      }
    }
  };

  /**
   * Get current pen settings
   */
  const getPenSettings = () => {
    return {
      ...penSettings,
      currentBrush: pressureBrushRef.current?.getSettings?.() || null,
    };
  };

  return {
    canvas: canvasInstance,
    isLoading,
    zoom,
    panOffset,
    getCanvasData,
    clearCanvas,
    setDrawingMode,
    setBrushProperties,
    enablePenTool,
    enableEraserTool,
    enableSelectTool,
    addText,
    enableShapeTool,
  disableShapeTool,
    setCanvasZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToWindow,
    panCanvas,
    // Pen/Stylus settings
    penSettings,
    updatePenSettings,
    getPenSettings,
  };
};
