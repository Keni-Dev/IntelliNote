import { useEffect, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import * as fabric from 'fabric';
import { useCanvas } from '../../hooks/useCanvas';
import useMathSolver from '../../hooks/useMathSolver';
import CanvasHistory from '../../lib/canvasHistory';
import { buildContextFromArea } from '../../lib/spatialContext';
// Use solver via hook to keep a single engine instance shared with the VariablePanel
import Toolbar from './Toolbar';
import GridBackground from './GridBackground';
import { MathInput } from '../math';
import MathSolutionDisplay from '../math/MathSolutionDisplay';
import VariablePanel from '../math/VariablePanel';

/**
 * Canvas component using Fabric.js for drawing and editing
 * @param {string} noteId - The ID of the note
 * @param {string} initialCanvasData - Initial canvas data (JSON string)
 * @param {Function} onCanvasChange - Callback when canvas changes
 */
const Canvas = forwardRef(({ noteId, initialCanvasData, onCanvasChange, onDrawingStateChange, onViewChange }, ref) => {
  const canvasId = `canvas-${noteId}`;
  const canvasHostRef = useRef(null);
  
  // Tool state
  const [activeTool, setActiveTool] = useState('pen');
  const [brushSize, setBrushSize] = useState(2);
  const [color, setColor] = useState('#000000');
  
  // Math input state
  const [mathMode, setMathMode] = useState(false);
  const [mathInputValue, setMathInputValue] = useState('');
  const [mathInputPosition, setMathInputPosition] = useState({ x: 0, y: 0 });
  const mathInputRef = useRef(null);
  
  // Math solver state
  const [mathSolutions, setMathSolutions] = useState([]); // Array of { equation, result, position }
  const {
    variables,
    formulas,
    detectEquation,
    solveWithContext,
    calculateConfidence,
    getStoredVariables,
    setVariable,
    defineFormula,
    deleteVariable,
    deleteFormula,
    clearContext
  } = useMathSolver(noteId);
  
  // Grid and view state
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(40);
  const [gridType, setGridType] = useState('dots');
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // History state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyManagerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  
  // Pointer/Stylus state
  const activePointersRef = useRef(new Map());
  const lastTouchDistanceRef = useRef(null);
  const stylusEraserActiveRef = useRef(false);
  const previousNonEraserToolRef = useRef('pen');
  const wasDrawingModeRef = useRef(false);
  const isRestoringStateRef = useRef(false);
  const drawingInProgressRef = useRef(false);

  // Track the most recently used non-eraser tool to restore after stylus eraser use
  useEffect(() => {
    if (activeTool !== 'eraser') {
      previousNonEraserToolRef.current = activeTool;
    }
  }, [activeTool]);

  // Debounced canvas change handler
  const handleCanvasChange = useCallback((canvasData) => {
    if (onCanvasChange) {
      onCanvasChange(canvasData);
    }
  }, [onCanvasChange]);

  // Initialize history manager
  useEffect(() => {
    if (!historyManagerRef.current) {
      historyManagerRef.current = new CanvasHistory(50);
    }
  }, []);



  const {
    canvas,
    isLoading,
    zoom,
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
    penSettings,
    updatePenSettings,
    getPenSettings,
  } = useCanvas({
    canvasId,
    initialData: initialCanvasData,
    onCanvasChange: handleCanvasChange,
    hostRef: canvasHostRef,
  });

  // Notify parent of zoom changes without serializing full canvas (improves perf during interactions)
  useEffect(() => {
    if (typeof onViewChange === 'function' && typeof zoom === 'number') {
      onViewChange(zoom);
    }
  }, [zoom, onViewChange]);

  // Keep brush size aligned with persisted pen preferences
  useEffect(() => {
    if (penSettings?.baseWidth) {
      const preferredSize = Math.max(1, Math.round(penSettings.baseWidth));
      if (preferredSize !== brushSize) {
        setBrushSize(preferredSize);
      }
    }
  }, [penSettings?.baseWidth, brushSize]);

  useEffect(() => {
    if (!canvas || typeof onDrawingStateChange !== 'function') {
      return;
    }

    const updateDrawingState = (isDrawing) => {
      if (drawingInProgressRef.current === isDrawing) return;
      drawingInProgressRef.current = isDrawing;
      onDrawingStateChange(isDrawing);
    };

    const handleMouseDown = (event) => {
      if (activeTool !== 'pen') return;
      const button = event?.e?.button ?? event?.button;
      if (button && button !== 0) return;
      updateDrawingState(true);
    };

    const concludeDrawing = () => {
      if (!drawingInProgressRef.current) return;
      updateDrawingState(false);
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:up', concludeDrawing);
    canvas.on('mouse:out', concludeDrawing);
    canvas.on('path:created', concludeDrawing);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:up', concludeDrawing);
      canvas.off('mouse:out', concludeDrawing);
      canvas.off('path:created', concludeDrawing);
    };
  }, [canvas, activeTool, onDrawingStateChange]);

  useEffect(() => {
    if (activeTool !== 'pen' && drawingInProgressRef.current) {
      drawingInProgressRef.current = false;
      if (typeof onDrawingStateChange === 'function') {
        onDrawingStateChange(false);
      }
    }
  }, [activeTool, onDrawingStateChange]);

  // Undo function (defined after canvas is available)
  const handleUndo = useCallback(() => {
    if (!canvas || !historyManagerRef.current || !historyManagerRef.current.canUndo() || isRestoringStateRef.current) {
      return;
    }

    // Mark that we're performing undo/redo
    isRestoringStateRef.current = true;

    const action = historyManagerRef.current.undo();

    if (action) {
      // Reverse the action based on its type
      if (action.type === 'add') {
        // Remove the object that was added
        const objects = canvas.getObjects();
        const objToRemove = objects.find(obj => obj === action.object);
        if (objToRemove) {
          canvas.remove(objToRemove);
        }
      } else if (action.type === 'remove') {
        // Re-add the object that was removed
        canvas.add(action.object);
      } else if (action.type === 'modify') {
        // Restore previous state of modified object
        if (action.object && action.previousState) {
          action.object.set(action.previousState);
          action.object.setCoords();
        }
      }

      canvas.requestRenderAll();
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());

      // Trigger onChange to save to database
      if (onCanvasChange) {
        const canvasData = JSON.stringify(canvas.toJSON());
        onCanvasChange(canvasData);
      }
    }

    isRestoringStateRef.current = false;
  }, [canvas, onCanvasChange]);

  // Redo function (defined after canvas is available)
  const handleRedo = useCallback(() => {
    if (!canvas || !historyManagerRef.current || !historyManagerRef.current.canRedo() || isRestoringStateRef.current) {
      return;
    }

    // Mark that we're performing undo/redo
    isRestoringStateRef.current = true;

    const action = historyManagerRef.current.redo();

    if (action) {
      // Re-apply the action based on its type
      if (action.type === 'add') {
        // Re-add the object
        canvas.add(action.object);
      } else if (action.type === 'remove') {
        // Remove the object again
        const objects = canvas.getObjects();
        const objToRemove = objects.find(obj => obj === action.object);
        if (objToRemove) {
          canvas.remove(objToRemove);
        }
      } else if (action.type === 'modify') {
        // Re-apply the modification
        if (action.object && action.currentState) {
          action.object.set(action.currentState);
          action.object.setCoords();
        }
      }

      canvas.requestRenderAll();
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());

      // Trigger onChange to save to database
      if (onCanvasChange) {
        const canvasData = JSON.stringify(canvas.toJSON());
        onCanvasChange(canvasData);
      }
    }

    isRestoringStateRef.current = false;
  }, [canvas, onCanvasChange]);

  // Track canvas modifications for undo/redo
  useEffect(() => {
    if (!canvas || !historyManagerRef.current) return;

    // Debounce canvas change notifications to prevent rapid saves
    const notifyCanvasChange = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (onCanvasChange) {
          const canvasData = JSON.stringify(canvas.toJSON());
          onCanvasChange(canvasData);
        }
      }, 1000); // Increased debounce to 1 second
    };

    const handleObjectAdded = (e) => {
      // Don't record if we're performing undo/redo
      if (isRestoringStateRef.current || historyManagerRef.current.isUndoRedoInProgress()) {
        return;
      }

      const action = {
        type: 'add',
        object: e.target,
      };

      historyManagerRef.current.recordAction(action);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());

      // Notify parent of canvas change (debounced)
      notifyCanvasChange();
    };

    const handleObjectModified = (e) => {
      // Don't record if we're performing undo/redo
      if (isRestoringStateRef.current || historyManagerRef.current.isUndoRedoInProgress()) {
        return;
      }

      // Store the previous and current state for the object
      const action = {
        type: 'modify',
        object: e.target,
        previousState: e.target._stateProperties ? 
          e.target._stateProperties.reduce((acc, prop) => {
            acc[prop] = e.target[prop];
            return acc;
          }, {}) : {},
        currentState: e.target.toObject(),
      };

      historyManagerRef.current.recordAction(action);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());

      // Notify parent of canvas change (debounced)
      notifyCanvasChange();
    };

    const handleObjectRemoved = (e) => {
      // Don't record if we're performing undo/redo
      if (isRestoringStateRef.current || historyManagerRef.current.isUndoRedoInProgress()) {
        return;
      }

      const action = {
        type: 'remove',
        object: e.target,
      };

      historyManagerRef.current.recordAction(action);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());

      // Notify parent of canvas change (debounced)
      notifyCanvasChange();
    };

    // Listen to canvas events
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:removed', handleObjectRemoved);

    return () => {
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:removed', handleObjectRemoved);
      
      // Clear timeout on cleanup
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [canvas, onCanvasChange]);

  // Handle tool changes
  useEffect(() => {
    if (!canvas) return;

    disableShapeTool();

    switch (activeTool) {
      case 'pen':
        enablePenTool(brushSize, color);
        break;
      case 'eraser':
        enableEraserTool();
        break;
      case 'select':
        enableSelectTool();
        break;
      case 'text':
        enableSelectTool();
        // Text will be added on click
        break;
      case 'line':
      case 'rectangle':
      case 'circle':
        enableShapeTool(activeTool, color);
        break;
      default:
        break;
    }
  }, [canvas, activeTool, brushSize, color, enablePenTool, enableEraserTool, enableSelectTool, enableShapeTool, disableShapeTool]);

  // Handle eraser tool - brush that deletes entire strokes it touches
  useEffect(() => {
    if (!canvas || activeTool !== 'eraser') return;

    let isErasing = false;
    const erasedObjects = new Set(); // Track already erased objects in this stroke
    let eraserCircle = null;

    const disableObjectInteractivity = (obj) => {
      if (!obj || obj.excludeFromExport || obj === eraserCircle) return;
      if (obj._eraserSelectable !== undefined) return;

      obj._eraserSelectable = obj.selectable;
      obj._eraserEvented = obj.evented;
      obj._eraserHoverCursor = obj.hoverCursor;
      obj.selectable = false;
      obj.evented = false;
      obj.hoverCursor = 'crosshair';
    };

    const restoreObjectInteractivity = (obj) => {
      if (!obj || obj._eraserSelectable === undefined) return;

      obj.selectable = obj._eraserSelectable;
      obj.evented = obj._eraserEvented;
      obj.hoverCursor = obj._eraserHoverCursor;
      delete obj._eraserSelectable;
      delete obj._eraserEvented;
      delete obj._eraserHoverCursor;
    };

    // Disable selection/evented on all existing objects so they don't move while erasing
    canvas.getObjects().forEach((obj) => disableObjectInteractivity(obj));

    const handleObjectAdded = (event) => {
      if (event?.target) {
        disableObjectInteractivity(event.target);
      }
    };

    canvas.on('object:added', handleObjectAdded);

    const distancePointToSegment = (point, start, end) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;

      if (dx === 0 && dy === 0) {
        return point.distanceFrom(start);
      }

      const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
      const clamped = Math.max(0, Math.min(1, t));
      const projection = new fabric.Point(start.x + clamped * dx, start.y + clamped * dy);

      return point.distanceFrom(projection);
    };

    const cubicAt = (p0, p1, p2, p3, t) => {
      const mt = 1 - t;
      return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
    };

    const quadraticAt = (p0, p1, p2, t) => {
      const mt = 1 - t;
      return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
    };

    const getStrokeRadius = (obj) => {
      const base = (obj?.strokeWidth || 0) / 2;
      if (!base) return 0;

      if (obj.strokeUniform) {
        return base;
      }

      const scaleX = Math.abs(obj.scaleX ?? 1);
      const scaleY = Math.abs(obj.scaleY ?? 1);
      return base * ((scaleX + scaleY) / 2);
    };

    const computePathDistance = (obj, pointerPoint, eraserRadius) => {
      const pathData = obj.path;
      if (!Array.isArray(pathData) || pathData.length === 0) {
        return { distance: Infinity, intersects: false };
      }

      const matrix = obj.calcTransformMatrix();
      const pathOffset = obj.pathOffset || new fabric.Point(0, 0);
      const transformPathPoint = (x, y) => {
        const local = new fabric.Point(x - pathOffset.x, y - pathOffset.y);
        return fabric.util.transformPoint(local, matrix);
      };

      let minDistance = Infinity;
      let currentLocal = null;
      let currentWorld = null;
      let subpathStartLocal = null;
      let subpathStartWorld = null;

      const strokeRadius = getStrokeRadius(obj);
      const pointerSafeRadius = eraserRadius + strokeRadius;

      const sampleCubicSegment = (startLocal, cp1Local, cp2Local, endLocal, startWorld) => {
        const steps = Math.max(12, Math.ceil((obj?.strokeWidth || brushSize) / 2));
        let previousWorld = startWorld;

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const sampleX = cubicAt(startLocal.x, cp1Local.x, cp2Local.x, endLocal.x, t);
          const sampleY = cubicAt(startLocal.y, cp1Local.y, cp2Local.y, endLocal.y, t);
          const worldPoint = transformPathPoint(sampleX, sampleY);
          const segmentDistance = distancePointToSegment(pointerPoint, previousWorld, worldPoint);
          if (segmentDistance < minDistance) {
            minDistance = segmentDistance;
            if (minDistance <= pointerSafeRadius) {
              // Early exit when already inside eraser radius
              return transformPathPoint(endLocal.x, endLocal.y);
            }
          }
          previousWorld = worldPoint;
        }

        return transformPathPoint(endLocal.x, endLocal.y);
      };

      const sampleQuadraticSegment = (startLocal, cpLocal, endLocal, startWorld) => {
        const steps = Math.max(10, Math.ceil((obj?.strokeWidth || brushSize) / 2));
        let previousWorld = startWorld;

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const sampleX = quadraticAt(startLocal.x, cpLocal.x, endLocal.x, t);
          const sampleY = quadraticAt(startLocal.y, cpLocal.y, endLocal.y, t);
          const worldPoint = transformPathPoint(sampleX, sampleY);
          const segmentDistance = distancePointToSegment(pointerPoint, previousWorld, worldPoint);
          if (segmentDistance < minDistance) {
            minDistance = segmentDistance;
            if (minDistance <= pointerSafeRadius) {
              return transformPathPoint(endLocal.x, endLocal.y);
            }
          }
          previousWorld = worldPoint;
        }

        return transformPathPoint(endLocal.x, endLocal.y);
      };

      for (const command of pathData) {
        const type = command[0];

        switch (type) {
          case 'M': {
            currentLocal = { x: command[1], y: command[2] };
            currentWorld = transformPathPoint(currentLocal.x, currentLocal.y);
            subpathStartLocal = { ...currentLocal };
            subpathStartWorld = currentWorld;
            break;
          }
          case 'L': {
            if (!currentLocal || !currentWorld) break;
            const nextLocal = { x: command[1], y: command[2] };
            const nextWorld = transformPathPoint(nextLocal.x, nextLocal.y);
            const segmentDistance = distancePointToSegment(pointerPoint, currentWorld, nextWorld);
            if (segmentDistance < minDistance) {
              minDistance = segmentDistance;
            }
            currentLocal = nextLocal;
            currentWorld = nextWorld;
            break;
          }
          case 'C': {
            if (!currentLocal || !currentWorld) break;
            const cp1Local = { x: command[1], y: command[2] };
            const cp2Local = { x: command[3], y: command[4] };
            const endLocal = { x: command[5], y: command[6] };
            currentWorld = sampleCubicSegment(currentLocal, cp1Local, cp2Local, endLocal, currentWorld);
            currentLocal = endLocal;
            break;
          }
          case 'Q': {
            if (!currentLocal || !currentWorld) break;
            const cpLocal = { x: command[1], y: command[2] };
            const endLocal = { x: command[3], y: command[4] };
            currentWorld = sampleQuadraticSegment(currentLocal, cpLocal, endLocal, currentWorld);
            currentLocal = endLocal;
            break;
          }
          case 'Z': {
            if (!currentLocal || !currentWorld || !subpathStartLocal || !subpathStartWorld) break;
            const segmentDistance = distancePointToSegment(pointerPoint, currentWorld, subpathStartWorld);
            if (segmentDistance < minDistance) {
              minDistance = segmentDistance;
            }
            currentLocal = { ...subpathStartLocal };
            currentWorld = subpathStartWorld;
            break;
          }
          default:
            break;
        }

        if (minDistance <= pointerSafeRadius) {
          break;
        }
      }

      if (minDistance === Infinity) {
        return { distance: Infinity, intersects: false };
      }

      const effectiveDistance = Math.max(0, minDistance - strokeRadius);
      return { distance: effectiveDistance, intersects: minDistance <= pointerSafeRadius };
    };

    const computeGenericDistance = (obj, pointerPoint, eraserRadius) => {
      if (typeof obj.containsPoint === 'function' && obj.containsPoint(pointerPoint)) {
        return { distance: 0, intersects: true };
      }

      const strokeRadius = getStrokeRadius(obj);
      const pointerSafeRadius = eraserRadius + strokeRadius;
      const coords = obj.getCoords?.();

      if (Array.isArray(coords) && coords.length) {
        let minDistance = Infinity;
        for (let i = 0; i < coords.length; i++) {
          const start = coords[i];
          const end = coords[(i + 1) % coords.length];
          const segmentDistance = distancePointToSegment(pointerPoint, start, end);
          if (segmentDistance < minDistance) {
            minDistance = segmentDistance;
          }
        }

        if (minDistance === Infinity) {
          return { distance: Infinity, intersects: false };
        }

        const effectiveDistance = Math.max(0, minDistance - strokeRadius);
        return { distance: effectiveDistance, intersects: minDistance <= pointerSafeRadius };
      }

      // Fallback to bounding box distance
      const bounds = obj.getBoundingRect?.();
      if (!bounds) {
        return { distance: Infinity, intersects: false };
      }

      const clampedX = Math.max(bounds.left, Math.min(pointerPoint.x, bounds.left + bounds.width));
      const clampedY = Math.max(bounds.top, Math.min(pointerPoint.y, bounds.top + bounds.height));
      const nearestPoint = new fabric.Point(clampedX, clampedY);
      const boxDistance = pointerPoint.distanceFrom(nearestPoint);
      const effectiveDistance = Math.max(0, boxDistance - strokeRadius);

      return { distance: effectiveDistance, intersects: boxDistance <= pointerSafeRadius };
    };

    const updateEraserCircle = (pointer) => {
      const radius = brushSize / 2;

      if (!eraserCircle) {
        eraserCircle = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius,
          fill: 'rgba(255, 107, 107, 0.08)',
          stroke: '#ff6b6b',
          strokeWidth: 1.5,
          strokeDashArray: [4, 4],
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        canvas.add(eraserCircle);
      } else {
        eraserCircle.set({
          left: pointer.x,
          top: pointer.y,
          radius,
        });
      }

      eraserCircle.setCoords();
      if (typeof canvas.bringObjectToFront === 'function') {
        canvas.bringObjectToFront(eraserCircle);
      } else if (typeof eraserCircle.bringToFront === 'function') {
        eraserCircle.bringToFront();
      }
      canvas.requestRenderAll();
    };

    const removeEraserCircle = () => {
      if (eraserCircle) {
        canvas.remove(eraserCircle);
        eraserCircle = null;
        canvas.requestRenderAll();
      }
    };

    const checkAndEraseObjects = (pointer) => {
      const objects = canvas.getObjects();
      const eraserRadius = brushSize / 2;
      const pointerPoint = new fabric.Point(pointer.x, pointer.y);
      let closestObject = null;
      let closestDistance = Infinity;

      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];

        if (obj === eraserCircle || obj.excludeFromExport) continue;
        if (erasedObjects.has(obj)) continue;

        const strokeRadius = getStrokeRadius(obj);
        const padding = eraserRadius + strokeRadius + 2;
        const bounds = obj.getBoundingRect?.();

        if (bounds) {
          const withinHorizontal = pointerPoint.x >= bounds.left - padding && pointerPoint.x <= bounds.left + bounds.width + padding;
          const withinVertical = pointerPoint.y >= bounds.top - padding && pointerPoint.y <= bounds.top + bounds.height + padding;
          if (!withinHorizontal || !withinVertical) {
            continue;
          }
        }

        const result = obj.type === 'path'
          ? computePathDistance(obj, pointerPoint, eraserRadius)
          : computeGenericDistance(obj, pointerPoint, eraserRadius);

        if (result.intersects && result.distance < closestDistance) {
          closestDistance = result.distance;
          closestObject = obj;
        }
      }

      if (closestObject) {
        erasedObjects.add(closestObject);
        canvas.remove(closestObject);
        canvas.requestRenderAll();
      }
    };

    const handleMouseDown = (e) => {
      isErasing = true;
      erasedObjects.clear();
      const pointer = canvas.getPointer(e.e);
      updateEraserCircle(pointer);
      checkAndEraseObjects(pointer);
    };

    const handleMouseMove = (e) => {
      const pointer = canvas.getPointer(e.e);
      updateEraserCircle(pointer);

      if (isErasing) {
        checkAndEraseObjects(pointer);
      }
    };

    const handleMouseUp = () => {
      isErasing = false;
      erasedObjects.clear();
    };

    const handleMouseOut = () => {
      isErasing = false;
      erasedObjects.clear();
      removeEraserCircle();
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:out', handleMouseOut);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('mouse:out', handleMouseOut);
      canvas.off('object:added', handleObjectAdded);

      removeEraserCircle();

      canvas.getObjects().forEach((obj) => {
        if (obj !== eraserCircle) {
          restoreObjectInteractivity(obj);
        }
      });
    };
  }, [canvas, activeTool, brushSize]);

  // Handle text tool click
  useEffect(() => {
    if (!canvas || activeTool !== 'text') return;

    const handleCanvasClick = () => {
      addText(color);
      // Switch back to select tool after adding text
      setActiveTool('select');
    };

    canvas.on('mouse:down', handleCanvasClick);

    return () => {
      canvas.off('mouse:down', handleCanvasClick);
    };
  }, [canvas, activeTool, color, addText]);

  // Handle text editing to detect "=" for math mode
  useEffect(() => {
    if (!canvas) return;

    const handleTextChanged = (e) => {
      const obj = e.target;
      if (obj && obj.type === 'i-text' && obj.text && obj.text.includes('=')) {
        // Convert to math mode
        const canvasRect = canvas.upperCanvasEl.getBoundingClientRect();
        const objBounds = obj.getBoundingRect();
        
        setMathInputPosition({
          x: objBounds.left - canvasRect.left,
          y: objBounds.top - canvasRect.top
        });
        setMathInputValue(obj.text);
        setMathMode(true);
        
        // Remove the text object
        canvas.remove(obj);
        canvas.requestRenderAll();
      }
    };

    canvas.on('text:changed', handleTextChanged);

    return () => {
      canvas.off('text:changed', handleTextChanged);
    };
  }, [canvas]);

  // Handle math input completion
  const handleMathInputComplete = useCallback((finalValue) => {
    if (!canvas || !finalValue) {
      setMathMode(false);
      return;
    }

    // Normalize calculus shorthand (d/dx(expr)) and integral symbol ∫(expr, x, a, b)
    const normalizeCalculusInput = (input) => {
      let s = String(input);
      // Replace integral symbol with integrate(
      s = s.replace(/\u222B\s*\(/g, 'integrate(');

      // Handle d/dx(<expr>) → derivative(<expr>, x)
      const ddPattern = /\bd\/d([a-zA-Z])\s*\(/g;
      let match;
      let result = '';
      let lastIndex = 0;
      while ((match = ddPattern.exec(s)) !== null) {
        const varName = match[1];
        const openIndex = ddPattern.lastIndex - 1; // points at '('
        // Find matching closing parenthesis for the expression
        let depth = 0;
        let i = openIndex;
        for (; i < s.length; i++) {
          const ch = s[i];
          if (ch === '(') depth++;
          else if (ch === ')') {
            depth--;
            if (depth === 0) {
              break;
            }
          }
        }
        if (depth !== 0) {
          // Unbalanced parentheses, stop processing
          continue;
        }
        const exprInside = s.slice(openIndex + 1, i);
        // Append preceding text and replacement
        result += s.slice(lastIndex, match.index) + `derivative(${exprInside}, ${varName})`;
        lastIndex = i + 1;
      }
      if (lastIndex > 0) {
        s = result + s.slice(lastIndex);
      }

      return s;
    };

    const normalized = normalizeCalculusInput(finalValue);

  // Check if it's an equation or a calculus expression (even without '=')
  const isEquation = detectEquation(normalized);
  const isCalculusExpression = /\b(integrate|derivative|diff)\s*\(|\u222B|\bd\/d[a-zA-Z]\b/.test(normalized);

    // Create a new text object with the math content
    const text = new fabric.IText(normalized, {
      left: mathInputPosition.x,
      top: mathInputPosition.y,
      fill: color,
      fontSize: 20,
      fontFamily: 'Roboto Mono, monospace',
      customType: 'mathEquation' // Mark as math equation for spatial context
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();

  // If it's an equation OR a calculus expression, solve and display solution
  if (isEquation || isCalculusExpression) {
      // Build spatial context from nearby equations
      const spatialContext = buildContextFromArea(
        null,
        canvas,
        mathInputPosition,
        300 // 300px radius
      );
      
      // Solve with context awareness
  const result = solveWithContext(normalized, spatialContext);
      
      if (result.success || result.suggestions?.length > 0) {
        // Position solution to avoid bottom-right UI elements (zoom controls)
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Smart positioning: place to the right, but if too close to edge, place above/below
        let solutionX = mathInputPosition.x + 300;
        let solutionY = mathInputPosition.y;
        
        // If too far right, place on the left instead
        if (solutionX + 400 > viewportWidth - 100) {
          solutionX = Math.max(20, mathInputPosition.x - 420);
        }
        
        // If too close to bottom (zoom controls area), move up
        if (solutionY > viewportHeight - 300) {
          solutionY = Math.max(100, viewportHeight - 400);
        }
        
        const solutionPosition = {
          x: solutionX,
          y: solutionY
        };

        // Calculate confidence level
  const confidence = calculateConfidence(result, result.context);

        const newSolution = {
          id: Date.now(),
          equation: normalized,
          result: result.result,
          steps: result.steps || [],
          variables: getStoredVariables(),
          context: result.context,
          suggestions: result.suggestions || [],
          confidence: confidence,
          position: solutionPosition,
          sourceObject: text // Reference to the equation text object
        };

        setMathSolutions(prev => [...prev, newSolution]);
      }
    }
    
    setMathMode(false);
    setMathInputValue('');
  }, [canvas, mathInputPosition, color, detectEquation, getStoredVariables, solveWithContext, calculateConfidence]);

  // Close math input without adding
  const handleMathInputClose = useCallback(() => {
    setMathMode(false);
    setMathInputValue('');
  }, []);

  // Recalculate a solution with spatial context
  const handleRecalculateSolution = useCallback((solutionId) => {
    setMathSolutions(prev => {
      return prev.map(solution => {
        if (solution.id === solutionId) {
          // Build fresh spatial context
          const spatialContext = solution.sourceObject ? buildContextFromArea(
            null,
            canvas,
            { x: solution.sourceObject.left, y: solution.sourceObject.top },
            300
          ) : {};
          
          const result = solveWithContext(solution.equation, spatialContext);
          const confidence = calculateConfidence(result, result.context);
          
          if (result.success || result.suggestions?.length > 0) {
            return {
              ...solution,
              result: result.result,
              steps: result.steps || [],
              variables: getStoredVariables(),
              context: result.context,
              suggestions: result.suggestions || [],
              confidence: confidence
            };
          }
        }
        return solution;
      });
    });
  }, [canvas, getStoredVariables, solveWithContext, calculateConfidence]);

  // Navigate to source object on canvas
  const handleNavigateToSource = useCallback((contextItem) => {
    if (!canvas || !contextItem.source) return;
    
    // Highlight the source object temporarily
    const sourceObj = contextItem.source;
    
    // Pan to the object
    const canvasCenter = {
      x: canvas.width / 2,
      y: canvas.height / 2
    };
    
    const objCenter = {
      x: sourceObj.left + (sourceObj.width || 0) / 2,
      y: sourceObj.top + (sourceObj.height || 0) / 2
    };
    
    const newVpX = canvasCenter.x - objCenter.x * canvas.getZoom();
    const newVpY = canvasCenter.y - objCenter.y * canvas.getZoom();
    
    canvas.setViewportTransform([
      canvas.getZoom(), 0, 0, 
      canvas.getZoom(), 
      newVpX, newVpY
    ]);
    
    // Flash highlight
    const originalFill = sourceObj.fill;
    const originalStroke = sourceObj.stroke;
    const originalStrokeWidth = sourceObj.strokeWidth;
    
    sourceObj.set({
      stroke: '#3b82f6',
      strokeWidth: 3,
      fill: originalFill
    });
    canvas.requestRenderAll();
    
    // Remove highlight after 2 seconds
    setTimeout(() => {
      sourceObj.set({
        fill: originalFill,
        stroke: originalStroke,
        strokeWidth: originalStrokeWidth
      });
      canvas.requestRenderAll();
    }, 2000);
  }, [canvas]);

  // Apply a suggestion from the math engine
  const handleApplySuggestion = useCallback((suggestion) => {
    if (!suggestion) return;
    
    switch (suggestion.action) {
      case 'define_variable':
        // Open variable panel or prompt for value
        if (suggestion.variable) {
          // For now, just set a default value
          // In a full implementation, you'd prompt the user
          setVariable(suggestion.variable, 0);
        }
        break;
        
      case 'use_constant':
        // Apply the suggested constant value
        if (suggestion.variable && suggestion.value !== undefined) {
          setVariable(suggestion.variable, suggestion.value);
        }
        break;
        
      case 'use_formula':
      case 'use_similar_formula':
        // Define the suggested formula
        if (suggestion.formula) {
          const formula = suggestion.formula;
          defineFormula(
            formula.result || formula.name,
            formula.expression || formula.formula
          );
        }
        break;
        
      case 'fix_typo':
        // This would require editing the original equation
        // For now, just show info
        console.log('Typo suggestion:', suggestion);
        break;
        
      default:
        console.log('Unknown suggestion action:', suggestion.action);
    }
  }, [setVariable, defineFormula]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Check if user is editing text on canvas
      if (canvas && canvas.getActiveObject() && canvas.getActiveObject().isEditing) {
        return;
      }

      // Ctrl/Cmd + E: Insert Math Input
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        // Get canvas center or cursor position
        const canvasRect = canvas.upperCanvasEl.getBoundingClientRect();
        setMathInputPosition({
          x: canvasRect.width / 2 - 200, // Center horizontally (assuming 400px width)
          y: canvasRect.height / 2 - 100  // Center vertically
        });
        setMathInputValue('');
        setMathMode(true);
        return;
      }

      // Undo: Ctrl/Cmd + Z (but not Ctrl/Cmd + Shift + Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p':
          setActiveTool('pen');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'v':
          setActiveTool('select');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'r':
          setActiveTool('rectangle');
          break;
        case 'c':
          setActiveTool('circle');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas, handleUndo, handleRedo]);

  // Pointer and pan functionality with stylus support
  useEffect(() => {
    if (!canvas) return;

    const setCursor = (cursor, hoverCursor = cursor) => {
      canvas.defaultCursor = cursor;
      canvas.hoverCursor = hoverCursor;
    };

    const applyCursorForActiveTool = (spaceHeld = false) => {
      if (spaceHeld) {
        setCursor('grab');
        return;
      }

      switch (activeTool) {
        case 'pen':
        case 'eraser':
        case 'line':
        case 'rectangle':
        case 'circle':
          setCursor('crosshair');
          break;
        case 'text':
          setCursor('text');
          break;
        case 'select':
        default:
          setCursor('default', 'move');
          break;
      }
    };

    applyCursorForActiveTool(isSpacePressed);

    // Mouse wheel zoom (with Ctrl/Cmd key)
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        const delta = e.deltaY;
        const zoomFactor = delta > 0 ? 0.95 : 1.05;
        const newZoom = zoom * zoomFactor;
        
        // Get mouse position using Fabric's coordinate system
        const pointer = canvas.getPointer(e, true);
        setCanvasZoom(newZoom, pointer);
      }
    };

    // Spacebar pan
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Check if user is editing text on canvas
      if (canvas.getActiveObject() && canvas.getActiveObject().isEditing) {
        return;
      }

      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        setCursor('grab');
      }
      
      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetZoom();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        zoomOut();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
        applyCursorForActiveTool(false);
      }
    };

    // Get the canvas element
  const canvasElement = canvas.upperCanvasEl || canvas.getElement?.();
    if (!canvasElement) return;

    // ====== POINTER EVENTS API ======
    // Use Pointer Events instead of mouse/touch for unified handling
    
    const getTouchDistance = (pointers) => {
      const entries = Array.from(pointers.values());
      if (entries.length < 2) return null;
      
      const dx = entries[0].clientX - entries[1].clientX;
      const dy = entries[0].clientY - entries[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const detectStylusEraser = (event) => {
      if (event.pointerType !== 'pen') {
        return false;
      }
      const buttonMatch = typeof event.button === 'number' && event.button === 5;
      const buttonsMatch = typeof event.buttons === 'number' && (event.buttons & 32) === 32;
      return buttonMatch || buttonsMatch;
    };

    const handlePointerDown = (e) => {
      // Palm rejection: ignore large touch areas (likely palm)
      if (e.pointerType === 'touch' && e.width > 50) {
        e.preventDefault();
        return;
      }

      const isStylusEraser = detectStylusEraser(e);

      const pointerMeta = {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        clientX: e.clientX,
        clientY: e.clientY,
        pressure: e.pressure,
        button: e.button,
        isStylusEraser,
      };

      activePointersRef.current.set(e.pointerId, pointerMeta);

      // Handle stylus eraser button (including eraser nib)
      if (isStylusEraser) {
        if (!stylusEraserActiveRef.current) {
          stylusEraserActiveRef.current = true;
          if (activeTool !== 'eraser') {
            previousNonEraserToolRef.current = activeTool;
          }
          setActiveTool('eraser');
        }
        return;
      }

      const pointerValues = Array.from(activePointersRef.current.values());
      const touchPointers = pointerValues.filter((pointer) => pointer.pointerType === 'touch');

      // Two-finger touch: start pinch/pan gesture (touch-only)
      if (e.pointerType === 'touch' && touchPointers.length === 2) {
        e.preventDefault();
        const touchMap = new Map(touchPointers.map((pointer) => [pointer.pointerId, pointer]));
        lastTouchDistanceRef.current = getTouchDistance(touchMap);
        return;
      }

      // Middle mouse button or space + primary button: start panning
      if (e.button === 1 || (isSpacePressed && e.button === 0)) {
        e.preventDefault();
        setIsPanning(true);
        wasDrawingModeRef.current = canvas.isDrawingMode;
        canvas.discardActiveObject();
        canvas.isDrawingMode = false;
        canvas.selection = false;
        setCursor('grabbing');
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerMove = (e) => {
      const existingPointer = activePointersRef.current.get(e.pointerId);
      const isStylusEraser = existingPointer?.isStylusEraser ?? detectStylusEraser(e);

      if (existingPointer || isStylusEraser) {
        activePointersRef.current.set(e.pointerId, {
          pointerId: e.pointerId,
          pointerType: e.pointerType,
          clientX: e.clientX,
          clientY: e.clientY,
          pressure: e.pressure,
          button: e.button,
          isStylusEraser,
        });
      }

      const pointerValues = Array.from(activePointersRef.current.values());
      const touchPointers = pointerValues.filter((pointer) => pointer.pointerType === 'touch');

      // Two-finger pinch/pan gesture (touch-only)
      if (touchPointers.length === 2 && touchPointers.length === pointerValues.length) {
        e.preventDefault();

        const touchMap = new Map(touchPointers.map((pointer) => [pointer.pointerId, pointer]));
        const currentDistance = getTouchDistance(touchMap);

        if (lastTouchDistanceRef.current && currentDistance) {
          const scale = currentDistance / lastTouchDistanceRef.current;
          const newZoom = zoom * scale;

          const [firstTouch, secondTouch] = touchPointers;
          const centerX = (firstTouch.clientX + secondTouch.clientX) / 2;
          const centerY = (firstTouch.clientY + secondTouch.clientY) / 2;

          const rect = canvasElement.getBoundingClientRect();
          const pointer = {
            x: centerX - rect.left,
            y: centerY - rect.top,
          };

          setCanvasZoom(newZoom, pointer);
          lastTouchDistanceRef.current = currentDistance;
        }
        return;
      }

      if (touchPointers.length < 2) {
        lastTouchDistanceRef.current = null;
      }

      // Panning with mouse/pen when enabled
      if (isPanning) {
        const deltaX = e.clientX - panStartRef.current.x;
        const deltaY = e.clientY - panStartRef.current.y;

        panCanvas(deltaX, deltaY);

        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerUp = (e) => {
      const pointerMeta = activePointersRef.current.get(e.pointerId);

      if (pointerMeta?.isStylusEraser && stylusEraserActiveRef.current) {
        stylusEraserActiveRef.current = false;
        const toolToRestore = previousNonEraserToolRef.current || 'pen';
        setActiveTool(toolToRestore);
      }

      activePointersRef.current.delete(e.pointerId);

      // Reset touch distance when fingers lifted
      if (activePointersRef.current.size < 2) {
        lastTouchDistanceRef.current = null;
      }

      // End panning
      if (isPanning && activePointersRef.current.size === 0) {
        setIsPanning(false);
        canvas.isDrawingMode = wasDrawingModeRef.current;

        if (activeTool === 'select' || activeTool === 'text') {
          canvas.selection = true;
        } else {
          canvas.selection = false;
        }

        applyCursorForActiveTool(isSpacePressed);

        wasDrawingModeRef.current = false;
        canvas.requestRenderAll?.();
      }
    };

    const handlePointerCancel = (e) => {
      const pointerMeta = activePointersRef.current.get(e.pointerId);
      if (pointerMeta?.isStylusEraser && stylusEraserActiveRef.current) {
        stylusEraserActiveRef.current = false;
        const toolToRestore = previousNonEraserToolRef.current || 'pen';
        setActiveTool(toolToRestore);
      }

      activePointersRef.current.delete(e.pointerId);

      if (activePointersRef.current.size < 2) {
        lastTouchDistanceRef.current = null;
      }
    };

    // Prevent default browser behaviors
    const preventDefault = (e) => {
      // Prevent pinch-to-zoom on touch devices
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Add event listeners
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    canvasElement.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvasElement.addEventListener('pointermove', handlePointerMove, { passive: false });
    canvasElement.addEventListener('pointerup', handlePointerUp);
    canvasElement.addEventListener('pointercancel', handlePointerCancel);
    canvasElement.addEventListener('touchstart', preventDefault, { passive: false });
    canvasElement.addEventListener('touchmove', preventDefault, { passive: false });
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      if (canvasElement) {
        canvasElement.removeEventListener('wheel', handleWheel);
        canvasElement.removeEventListener('pointerdown', handlePointerDown);
        canvasElement.removeEventListener('pointermove', handlePointerMove);
        canvasElement.removeEventListener('pointerup', handlePointerUp);
        canvasElement.removeEventListener('pointercancel', handlePointerCancel);
        canvasElement.removeEventListener('touchstart', preventDefault);
        canvasElement.removeEventListener('touchmove', preventDefault);
      }
      
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canvas, zoom, isSpacePressed, isPanning, setCanvasZoom, panCanvas, zoomIn, zoomOut, resetZoom, setActiveTool, activeTool]);

  // Update brush size when it changes (only for pen tool)
  useEffect(() => {
    if (!canvas) return;
    
    if (activeTool === 'pen') {
      enablePenTool(brushSize, color);
    }
  }, [canvas, brushSize, activeTool, color, enablePenTool]);

  useEffect(() => {
    // Any additional canvas setup can go here
    if (canvas) {
      console.log('Canvas initialized:', noteId);
      
      // Update canvas size
      const updateSize = () => {
        if (canvas.upperCanvasEl) {
          const rect = canvas.upperCanvasEl.getBoundingClientRect();
          setCanvasSize({ width: rect.width, height: rect.height });
        }
      };
      
      updateSize();
      window.addEventListener('resize', updateSize);
      
      return () => {
        window.removeEventListener('resize', updateSize);
      };
    }
  }, [canvas, noteId]);

  // Handle grid and view settings changes
  const handleViewSettingsChange = useCallback((settings) => {
    if (settings.gridEnabled !== undefined) {
      setGridEnabled(settings.gridEnabled);
    }
    if (settings.gridSize !== undefined) {
      setGridSize(settings.gridSize);
    }
    if (settings.gridType !== undefined) {
      setGridType(settings.gridType);
    }
    if (settings.snapToGrid !== undefined) {
      setSnapToGrid(settings.snapToGrid);
    }
    if (settings.showGuides !== undefined) {
      setShowGuides(settings.showGuides);
    }
  }, []);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    setCanvasZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToWindow,
  }), [setCanvasZoom, zoomIn, zoomOut, resetZoom, fitToWindow]);

  return (
    <div className="relative w-full h-full bg-white">
      {/* Grid Background */}
      {gridEnabled && canvas && (
        <GridBackground
          enabled={gridEnabled}
          gridSize={gridSize}
          gridType={gridType}
          zoom={zoom}
          panOffset={{
            x: canvas.viewportTransform[4],
            y: canvas.viewportTransform[5]
          }}
          width={canvasSize.width}
          height={canvasSize.height}
        />
      )}

      {/* Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        color={color}
        onColorChange={setColor}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        penSettings={penSettings}
        onPenSettingsChange={updatePenSettings}
        getPenSettings={getPenSettings}
        gridSettings={{
          gridEnabled,
          gridSize,
          gridType,
          snapToGrid,
          showGuides,
        }}
        onViewSettingsChange={handleViewSettingsChange}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 font-medium">Loading canvas...</p>
          </div>
        </div>
      )}

      {/* Math Input Overlay */}
      {mathMode && (
        <div
          className="absolute z-50"
          style={{
            left: mathInputPosition.x,
            top: mathInputPosition.y,
            minWidth: '400px',
          }}
        >
          <div className="p-5 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border-2 border-blue-500/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">Math Equation Editor</h3>
              <button
                onClick={handleMathInputClose}
                className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
                title="Close (Esc)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <MathInput
              ref={mathInputRef}
              value={mathInputValue}
              onChange={setMathInputValue}
              onEquationDetected={(val) => {
                // Autosubmit when user ends with '='
                if (typeof val === 'string' && /=\s*$/.test(val)) {
                  handleMathInputComplete(val);
                }
              }}
            />
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleMathInputComplete(mathInputValue)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-lg"
              >
                Insert Equation
              </button>
              <button
                onClick={handleMathInputClose}
                className="px-4 py-2.5 text-sm font-semibold text-gray-200 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
            
            <div className="mt-3 text-xs text-gray-400">
              Press <kbd className="px-2 py-1 bg-gray-700 text-gray-200 rounded border border-gray-600">Ctrl+E</kbd> to open math editor
            </div>
          </div>
        </div>
      )}

      {/* Math Solution Displays */}
      {mathSolutions.map(solution => (
        <MathSolutionDisplay
          key={solution.id}
          equation={solution.equation}
          result={solution.result}
          steps={solution.steps}
          variables={solution.variables}
          context={solution.context}
          suggestions={solution.suggestions}
          confidence={solution.confidence}
          position={solution.position}
          onRecalculate={() => handleRecalculateSolution(solution.id)}
          onNavigateToSource={handleNavigateToSource}
          onApplySuggestion={handleApplySuggestion}
          onClose={() => setMathSolutions(prev => prev.filter(s => s.id !== solution.id))}
        />
      ))}

      {/* Variable Panel */}
      <VariablePanel
        variables={variables}
        formulas={formulas}
        onSetVariable={setVariable}
        onDefineFormula={defineFormula}
        onDeleteVariable={deleteVariable}
        onDeleteFormula={deleteFormula}
        onClearAll={clearContext}
      />

      <div
        ref={canvasHostRef}
        className="absolute inset-0"
        style={{
          touchAction: 'none',
          cursor: isPanning ? 'grabbing'
            : isSpacePressed ? 'grab'
            : activeTool === 'select' ? 'default'
            : activeTool === 'text' ? 'text'
            : 'crosshair',
        }}
      />
    </div>
  );
});

Canvas.displayName = 'Canvas';

Canvas.propTypes = {
  noteId: PropTypes.string.isRequired,
  initialCanvasData: PropTypes.string,
  onCanvasChange: PropTypes.func,
  onDrawingStateChange: PropTypes.func,
  onViewChange: PropTypes.func,
};

Canvas.defaultProps = {
  initialCanvasData: null,
  onCanvasChange: null,
  onDrawingStateChange: null,
  onViewChange: null,
};

export default Canvas;
