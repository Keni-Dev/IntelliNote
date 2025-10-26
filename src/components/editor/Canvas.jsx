import { useEffect, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import * as fabric from 'fabric';
import { useCanvas } from '../../hooks/useCanvas';
import useMathSolver from '../../hooks/useMathSolver';
import CanvasHistory from '../../lib/canvasHistory';
import StrokeAnalyzer from '../../lib/strokeAnalyzer';
import { autoOptimizeCanvas, throttle } from '../../lib/canvasOptimizer';
import { buildContextFromArea } from '../../lib/spatialContext';
import { generateHandwriting, renderHandwritingToCanvas } from '../../lib/handwritingSynthesis';
import { getOCRConfig } from '../../config/ocr';
// Use solver via hook to keep a single engine instance shared with the VariablePanel
import Toolbar from './Toolbar';
import GridBackground from './GridBackground';
import HandwritingDetector from './HandwritingDetector';
import ResizableDetectionBox from './ResizableDetectionBox';
import GlassModal from '../common/GlassModal';
import { MathInput, MathSolutionDisplay, VariablePanel, OCRSettings } from '../math';

const Canvas = forwardRef(({
  noteId,
  initialCanvasData,
  onCanvasChange,
  onDrawingStateChange,
  onViewChange,
  canvasId: providedCanvasId,
}, ref) => {
  const canvasId = providedCanvasId || (noteId ? `canvas-${noteId}` : 'canvas-root');

  // Tool state
  const [activeTool, setActiveTool] = useState('pen');
  const [brushSize, setBrushSize] = useState(2);
  const [color, setColor] = useState('#000000');
  
  // Math input state
  const [mathMode, setMathMode] = useState(false);
  const [mathInputValue, setMathInputValue] = useState('');
  const [mathInputPosition, setMathInputPosition] = useState({ x: 0, y: 0 });
  const [mathInputAnalysis, setMathInputAnalysis] = useState(null);
  const mathInputRef = useRef(null);
  const canvasHostRef = useRef(null);
  
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
    clearContext,
    solveWithOpenRouter,
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
  const strokeAnalyzerRef = useRef(null);
  const strokesRef = useRef([]);
  const [strokesVersion, setStrokesVersion] = useState(0); // Trigger HandwritingDetector updates
  const releaseHighlightRef = useRef(null);
  const pendingHandwritingRef = useRef(null);
  const lastSolveTriggerRef = useRef({ signature: null, timestamp: 0 });
  const [handwritingSuggestion, setHandwritingSuggestion] = useState(null);
  const [handwritingHighlight, setHandwritingHighlight] = useState(null);
  const [autoDeleteHandwriting, setAutoDeleteHandwriting] = useState(() => {
    try {
      return localStorage.getItem('intellinote-handwriting-autodelete') === '1';
    } catch (error) {
      console.warn('Unable to read handwriting auto-delete preference:', error);
      return false;
    }
  });
  const [handwritingDebug, setHandwritingDebug] = useState(() => {
    try {
      return localStorage.getItem('intellinote-handwriting-debug') === '1';
    } catch (error) {
      console.warn('Unable to read handwriting debug preference:', error);
      return false;
    }
  });
  const [showOCRSettings, setShowOCRSettings] = useState(false);
  const [showResizableBox, setShowResizableBox] = useState(false);
  const [resizableBoxBounds, setResizableBoxBounds] = useState(null);
  const resizableBoxCallbackRef = useRef(null);
  const canvasJustLoadedRef = useRef(true);
  const userInteractedRef = useRef(false);

  const formatConfidenceText = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '—';
    }
    const clamped = Math.max(0, Math.min(1, value));
    return `${Math.round(clamped * 100)}%`;
  };

  const getMethodChipClass = (method) => {
    switch (method) {
      case 'cloud':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'local':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'cloud-error':
        return 'bg-rose-100 text-rose-600 border border-rose-200';
      case 'local-error':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'local-fallback':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-gray-100 text-gray-600 border border-gray-200';
    }
  };

  const formatMethodLabel = (method) => {
    if (!method) {
      return '';
    }
    switch (method) {
      case 'cloud':
        return 'Cloud';
      case 'local':
        return 'Local';
      case 'cloud-error':
        return 'Cloud error';
      case 'local-error':
        return 'Local error';
      case 'local-fallback':
        return 'Local fallback';
      default:
        return method.replace(/-/g, ' ');
    }
  };

  // Track the most recently used non-eraser tool to restore after stylus eraser use
  useEffect(() => {
    if (activeTool !== 'eraser') {
      previousNonEraserToolRef.current = activeTool;
    }
  }, [activeTool]);

  useEffect(() => {
    if (!strokeAnalyzerRef.current) {
      strokeAnalyzerRef.current = new StrokeAnalyzer({ debug: handwritingDebug });
    } else {
      strokeAnalyzerRef.current.debug = handwritingDebug;
    }
  }, [handwritingDebug]);

  // Canvas change handler now called directly from history tracking useEffect
  // Removed intermediate debouncing for better performance

  // Initialize history manager
  useEffect(() => {
    if (!historyManagerRef.current) {
      historyManagerRef.current = new CanvasHistory(30); // Reduced for better memory usage
    }
  }, []);



  const {
    canvas,
    isLoading,
    zoom,
    panOffset,
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
    hostRef: canvasHostRef,
  });

  const panX = panOffset?.x ?? 0;
  const panY = panOffset?.y ?? 0;

  useEffect(() => {
    if (!canvas) {
      if (releaseHighlightRef.current) {
        releaseHighlightRef.current();
        releaseHighlightRef.current = null;
      }
      pendingHandwritingRef.current = null;
      setHandwritingSuggestion(null);
    strokesRef.current = [];
      setStrokesVersion(0);
      lastSolveTriggerRef.current = { signature: null, timestamp: 0 };
      setHandwritingHighlight(null);
      return;
    }

    const analyzer = strokeAnalyzerRef.current || new StrokeAnalyzer({ debug: handwritingDebug });
    strokeAnalyzerRef.current = analyzer;

    const normalizePoint = (point) => {
      if (!point) {
        return null;
      }
      if (Array.isArray(point)) {
        return {
          x: Number(point[0]) || 0,
          y: Number(point[1]) || 0,
          pressure: point[2] !== undefined ? Number(point[2]) : undefined,
        };
      }
      return {
        x: Number(point.x) || 0,
        y: Number(point.y) || 0,
        pressure: point.pressure !== undefined ? Number(point.pressure) : undefined,
      };
    };

    const normalizePoints = (points = []) => {
      if (!Array.isArray(points)) {
        return [];
      }
      return points.map(normalizePoint).filter(Boolean);
    };

    const buildStrokeEntry = (path, metadata = {}) => {
      if (!path) {
        return null;
      }
      const baseMeta = {
        ...(path.strokeMeta || {}),
        ...(path.data?.strokeMeta || {}),
        ...metadata,
      };
      const normalizedPoints = normalizePoints(baseMeta.points);
      const createdAt = baseMeta.createdAt || Date.now();
      const id = baseMeta.id || `stroke-${createdAt}-${Math.floor(Math.random() * 1e6)}`;
      
      // PERFORMANCE: Skip analysis entirely if no points - defer to when actually needed
      // This dramatically improves performance when loading many strokes
      let features = { bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 } };
      if (normalizedPoints.length > 0) {
        // Only analyze if we have a small number of objects (< 100)
        // Otherwise defer analysis until needed (e.g., for OCR detection)
        const objectCount = canvas?.getObjects?.()?.length || 0;
        if (objectCount < 100) {
          features = analyzer.analyzeStroke(normalizedPoints);
        } else {
          // Lightweight bounds calculation without full analysis
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          normalizedPoints.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
          features = {
            bounds: {
              minX, minY, maxX, maxY,
              width: maxX - minX,
              height: maxY - minY,
              centerX: (minX + maxX) / 2,
              centerY: (minY + maxY) / 2,
            }
          };
        }
      }
      
      const entry = {
        id,
        createdAt,
        path,
        object: path,
        points: normalizedPoints,
        features,
        bounds: features.bounds,
      };

      const strokeMeta = {
        ...baseMeta,
        id,
        createdAt,
        points: normalizedPoints,
        features,
        bounds: features.bounds,
      };

      if (typeof path.set === 'function') {
        path.set('strokeMeta', strokeMeta);
        path.set('data', {
          ...(path.data || {}),
          strokeMeta,
        });
      }

      return entry;
    };

    const upsertStroke = (entry) => {
      if (!entry) {
        return;
      }
      const existingIndex = strokesRef.current.findIndex((stroke) => stroke.id === entry.id);
      if (existingIndex >= 0) {
        strokesRef.current[existingIndex] = entry;
      } else {
        // Append to end - strokes are naturally in chronological order
        // Avoid expensive sort on every stroke
        strokesRef.current.push(entry);
      }
      // Trigger HandwritingDetector update
      setStrokesVersion(v => v + 1);
    };

    const removeStrokeById = (id) => {
      if (!id) {
        return;
      }
      const next = strokesRef.current.filter((stroke) => stroke.id !== id);
      if (next.length !== strokesRef.current.length) {
        strokesRef.current = next;
        // Trigger HandwritingDetector update
        setStrokesVersion(v => v + 1);
      }
    };

    const handlePathCreated = (event) => {
      const path = event?.path;
      if (!path) {
        return;
      }
      const entry = buildStrokeEntry(path, {
        id: event?.strokeId,
        createdAt: event?.createdAt,
        points: event?.strokePoints,
      });
      upsertStroke(entry);
    };

    const handleObjectAdded = (event) => {
      const obj = event?.target;
      if (!obj || obj.excludeFromExport) {
        return;
      }
      if (obj.type !== 'path') {
        return;
      }
      const entry = buildStrokeEntry(obj, obj.strokeMeta || obj.data?.strokeMeta || {});
      if (!entry) {
        return;
      }
      if (strokesRef.current.some((stroke) => stroke.id === entry.id)) {
        return;
      }
      upsertStroke(entry);
      
      // PERFORMANCE: Auto-optimize canvas settings based on object count
      autoOptimizeCanvas(canvas);
    };

    const handleObjectRemoved = (event) => {
      const obj = event?.target;
      if (!obj) {
        return;
      }
      const meta = obj.strokeMeta || obj.data?.strokeMeta;
      if (!meta?.id) {
        return;
      }
      removeStrokeById(meta.id);
    };

    const initializeFromCanvas = () => {
      const objects = typeof canvas.getObjects === 'function' ? canvas.getObjects() : [];
      if (!objects.length) {
        strokesRef.current = [];
        setStrokesVersion(0);
        return;
      }
      const seeded = [];
      objects.forEach((obj) => {
        if (!obj || obj.type !== 'path') {
          return;
        }
        if (obj.excludeFromExport && !(obj.strokeMeta || obj.data?.strokeMeta)) {
          return;
        }
        const entry = buildStrokeEntry(obj, obj.strokeMeta || obj.data?.strokeMeta || {});
        if (entry) {
          seeded.push(entry);
        }
      });
      strokesRef.current = seeded.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setStrokesVersion(v => v + 1);
    };

    initializeFromCanvas();

    canvas.on('path:created', handlePathCreated);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);

    return () => {
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:removed', handleObjectRemoved);
    };
  }, [canvas, handwritingDebug]);

  useEffect(() => {
    if (!canvas || !handwritingSuggestion || !handwritingSuggestion.bounds) {
      setHandwritingHighlight(null);
      return;
    }

    const viewport = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const { bounds } = handwritingSuggestion;

    if (bounds.minX == null || bounds.minY == null || bounds.maxX == null || bounds.maxY == null) {
      return;
    }

    const topLeftPoint = new fabric.Point(bounds.minX, bounds.minY);
    const bottomRightPoint = new fabric.Point(bounds.maxX, bounds.maxY);
    const topLeft = fabric.util.transformPoint(topLeftPoint, viewport);
    const bottomRight = fabric.util.transformPoint(bottomRightPoint, viewport);

    const hostRect = canvasHostRef.current?.getBoundingClientRect() || null;
    const canvasRect = canvas.upperCanvasEl?.getBoundingClientRect() || null;
    const offsetX = canvasRect && hostRect ? canvasRect.left - hostRect.left : 0;
    const offsetY = canvasRect && hostRect ? canvasRect.top - hostRect.top : 0;

    const minX = Math.min(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const width = Math.max(0, Math.abs(bottomRight.x - topLeft.x));
    const height = Math.max(0, Math.abs(bottomRight.y - topLeft.y));

    const panSignature = `${Math.round(panX)}:${Math.round(panY)}:${Math.round(zoom * 100)}`;
    
    // Only update if signature changed (avoid sub-pixel updates)
    setHandwritingHighlight((prev) => {
      if (prev?.panSignature === panSignature) {
        return prev;
      }
      return {
        left: offsetX + minX - 12,
        top: offsetY + minY - 12,
        width: width + 24,
        height: height + 24,
        panSignature,
      };
    });
  }, [canvas, handwritingSuggestion, zoom, panX, panY]);

  const handleHandwritingAccept = useCallback(() => {
    if (!handwritingSuggestion || !canvas) {
      return;
    }

    const bounds = handwritingSuggestion.bounds || handwritingSuggestion.equals?.bounds;
    if (!bounds) {
      return;
    }

    const viewportTransform = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const anchor = new fabric.Point(bounds.minX, Math.max(bounds.minY - 40, bounds.minY));
    const transformed = fabric.util.transformPoint(anchor, viewportTransform);
    const x = Math.max(16, transformed.x);
    const y = Math.max(16, transformed.y);

    setMathInputPosition({
      x,
      y,
    });
    const suggestionValue = handwritingSuggestion.latex || handwritingSuggestion.equation || '';
    setMathInputValue(suggestionValue);
    setMathInputAnalysis(handwritingSuggestion.analysis || (suggestionValue ? detectEquation(suggestionValue) : null));
    setMathMode(true);
    setHandwritingHighlight(null);

    pendingHandwritingRef.current = {
      strokeIds: (handwritingSuggestion.strokes || []).map((stroke) => stroke.id),
      deleteOriginal: handwritingSuggestion.deleteOriginal ?? autoDeleteHandwriting,
      releaseHighlight: releaseHighlightRef.current,
      bounds: handwritingSuggestion.bounds || handwritingSuggestion.equals?.bounds,
    };

    setHandwritingSuggestion(null);
  }, [handwritingSuggestion, canvas, detectEquation, autoDeleteHandwriting]);

  const handleHandwritingDismiss = useCallback(() => {
    setHandwritingSuggestion(null);
    setHandwritingHighlight(null);
    if (releaseHighlightRef.current) {
      releaseHighlightRef.current();
      releaseHighlightRef.current = null;
    }
    pendingHandwritingRef.current = null;
  }, []);

  const handleHandwritingDeleteToggle = useCallback(() => {
    setHandwritingSuggestion((prev) => {
      if (!prev) {
        return prev;
      }
      const nextValue = !prev.deleteOriginal;
      setAutoDeleteHandwriting(nextValue);
      try {
        localStorage.setItem('intellinote-handwriting-autodelete', nextValue ? '1' : '0');
      } catch (error) {
        console.warn('Unable to persist handwriting auto-delete preference:', error);
      }
      return {
        ...prev,
        deleteOriginal: nextValue,
      };
    });
  }, []);

  const handleToggleHandwritingDebug = useCallback(() => {
    setHandwritingDebug((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('intellinote-handwriting-debug', next ? '1' : '0');
      } catch (error) {
        console.warn('Unable to persist handwriting debug preference:', error);
      }
      return next;
    });
  }, []);

  const handleAdjustRegion = useCallback(() => {
    if (!handwritingSuggestion?.bounds) return;
    
    setResizableBoxBounds(handwritingSuggestion.bounds);
    setShowResizableBox(true);
    
    // Store callback for when user confirms the adjusted region
    resizableBoxCallbackRef.current = async (adjustedBounds) => {
      setShowResizableBox(false);
      setResizableBoxBounds(null);
      
      // Get strokes within the adjusted bounds
      const adjustedStrokes = (handwritingSuggestion.strokes || []).filter((stroke) => {
        const strokeBounds = stroke?.bounds || stroke?.features?.bounds;
        if (!strokeBounds) return false;
        
        // Check if stroke intersects with adjusted bounds
        return !(
          strokeBounds.maxX < adjustedBounds.minX ||
          strokeBounds.minX > adjustedBounds.maxX ||
          strokeBounds.maxY < adjustedBounds.minY ||
          strokeBounds.minY > adjustedBounds.maxY
        );
      });
      
      if (adjustedStrokes.length === 0) {
        setHandwritingSuggestion(null);
        return;
      }
      
      // Re-run OCR with the adjusted strokes
      setHandwritingSuggestion((prev) => ({
        ...prev,
        loading: true,
        bounds: adjustedBounds,
        strokes: adjustedStrokes,
      }));
      
      // Import and run recognition
      const { recognizeEquationHybrid } = await import('../../lib/handwritingOCR');
      const { createStrokeSignature, getOCRConfig } = await import('../../config/ocr');
      const { analyzeMathContent } = await import('../../lib/mathDetection');
      
      const signature = createStrokeSignature(adjustedStrokes);
      const config = getOCRConfig();
      
      try {
        const result = await recognizeEquationHybrid(adjustedStrokes, {
          signature,
          includeHistory: true,
          mode: config.mode,
          minConfidence: config.minConfidence,
        });
        
        const equation = (result.equation || result.latex || '').trim();
        const analysis = analyzeMathContent(equation);
        
        setHandwritingSuggestion((prev) => ({
          ...prev,
          equation,
          latex: result.latex || equation,
          confidence: result.confidence || 0,
          method: result.method || 'local',
          loading: false,
          analysis,
          intent: analysis.isMathLike ? 'equation' : 'note',
        }));
      } catch (error) {
        setHandwritingSuggestion((prev) => ({
          ...prev,
          loading: false,
          error: error.message || 'Re-detection failed',
        }));
      }
    };
  }, [handwritingSuggestion]);

  const handleCancelResizableBox = useCallback(() => {
    setShowResizableBox(false);
    setResizableBoxBounds(null);
    resizableBoxCallbackRef.current = null;
  }, []);

  const handleConfirmResizableBox = useCallback((adjustedBounds) => {
    if (resizableBoxCallbackRef.current) {
      resizableBoxCallbackRef.current(adjustedBounds);
      resizableBoxCallbackRef.current = null;
    }
  }, []);

  // Handle handwriting candidate from HandwritingDetector
  const handleHandwritingCandidate = useCallback((candidate) => {
    // Don't show automatic detection on initial load
    if (canvasJustLoadedRef.current && !userInteractedRef.current) {
      return;
    }

    // Filter out candidates that don't meet quality thresholds
    if (!candidate) {
      setHandwritingSuggestion(null);
      if (releaseHighlightRef.current) {
        releaseHighlightRef.current();
        releaseHighlightRef.current = null;
      }
      return;
    }

    // Only show equation candidates
    if (candidate.intent !== 'equation') {
      setHandwritingSuggestion(null);
      if (releaseHighlightRef.current) {
        releaseHighlightRef.current();
        releaseHighlightRef.current = null;
      }
      return;
    }

    // Filter out empty or very short detections (likely noise)
    const equation = (candidate.equation || '').trim();
    if (equation.length === 0) {
      setHandwritingSuggestion(null);
      if (releaseHighlightRef.current) {
        releaseHighlightRef.current();
        releaseHighlightRef.current = null;
      }
      return;
    }

    setHandwritingSuggestion(candidate);
    releaseHighlightRef.current = candidate.releaseHighlight || null;
  }, []);

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
      // Mark that user has interacted with the canvas
      userInteractedRef.current = true;
      canvasJustLoadedRef.current = false;

      if (activeTool !== 'pen') return;
      const button = event?.e?.button ?? event?.button;
      if (button && button !== 0) return;
      updateDrawingState(true);
    };

    const handlePathCreated = () => {
      // Mark that user has interacted with the canvas
      userInteractedRef.current = true;
      canvasJustLoadedRef.current = false;
      
      if (!drawingInProgressRef.current) return;
      updateDrawingState(false);
    };

    const concludeDrawing = () => {
      if (!drawingInProgressRef.current) return;
      updateDrawingState(false);
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:up', concludeDrawing);
    canvas.on('mouse:out', concludeDrawing);
    canvas.on('path:created', handlePathCreated);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:up', concludeDrawing);
      canvas.off('mouse:out', concludeDrawing);
      canvas.off('path:created', handlePathCreated);
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

  // Reset "just loaded" flag after canvas finishes loading
  useEffect(() => {
    if (!isLoading && canvas) {
      // Give a brief delay to allow canvas to fully render
      const timer = setTimeout(() => {
        canvasJustLoadedRef.current = false;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, canvas]);

  // Reset interaction flags when switching notes
  useEffect(() => {
    canvasJustLoadedRef.current = true;
    userInteractedRef.current = false;
  }, [noteId]);

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

    // Debounce canvas change notifications to prevent rapid saves - reduced to 300ms
    const notifyCanvasChange = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (onCanvasChange) {
          const canvasData = JSON.stringify(canvas.toJSON());
          onCanvasChange(canvasData);
        }
      }, 300); // Reduced from 1000ms to 300ms for better responsiveness
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
  setMathInputAnalysis(detectEquation(obj.text));
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
  }, [canvas, detectEquation]);

  // Handle math input completion
  const handleMathInputComplete = useCallback(async (finalValue, providedAnalysis = null) => {
    if (!canvas || !finalValue) {
      setMathMode(false);
      setMathInputAnalysis(null);
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

    const analysis = providedAnalysis ?? detectEquation(normalized);
    const isCalculusExpression = /\b(integrate|derivative|diff)\s*\(|\u222B|\bd\/d[a-zA-Z]\b/.test(normalized);
    const shouldSolve = (analysis?.isMathLike ?? false) || isCalculusExpression;

    // If it's an equation OR a calculus expression, solve and display solution
    if (shouldSolve) {
      // Build spatial context from nearby equations
      const spatialContext = buildContextFromArea(
        null,
        canvas,
        mathInputPosition,
        300 // 300px radius
      );
      
      // Solve with context awareness
      const result = solveWithContext(normalized, spatialContext);
      
      if (result.success && result.result !== undefined && result.result !== null) {
        // Render solution as handwritten-style text beside the equation strokes
        const bounds = pendingHandwritingRef.current?.bounds || handwritingSuggestion?.bounds;
        
        // Calculate position: to the right of the equation (or handwriting bounds)
        let answerX = mathInputPosition.x + 20; // Default: slight offset to the right
        let answerY = mathInputPosition.y;
        
        if (bounds) {
          // Place answer to the right of the rightmost point of the handwriting
          answerX = bounds.maxX + 12;
          answerY = bounds.centerY - 8; // Center vertically with slight upward offset
        }
        
        // Format the answer cleanly
        const answerText = typeof result.result === 'number' 
          ? result.result.toString()
          : String(result.result);
        
        // Get user preference for handwriting synthesis
        const ocrConfig = getOCRConfig();
        const useHandwritingSynthesis = ocrConfig.handwritingSynthesis ?? true;
        
        let answerObject = null;
        
        if (useHandwritingSynthesis) {
          // Try to generate handwritten strokes for the answer
          try {
            const synthResult = await generateHandwriting(answerText, {
              bias: 0.5,
              timeout: 2000 // 2 second timeout
            });
            
            if (synthResult.success && synthResult.strokes && synthResult.strokes.length > 0) {
              // Render handwritten answer
              answerObject = renderHandwritingToCanvas(canvas, synthResult.strokes, {
                left: answerX,
                top: answerY,
                scale: 0.5, // Scale down RNN output to match canvas
                color: '#2563eb',
                strokeWidth: 2
              });
              answerObject.set({
                customType: 'mathAnswer',
                selectable: true,
                evented: true
              });
            } else {
              // Fallback to font rendering
              console.warn('[Canvas] Handwriting synthesis failed, using font fallback:', synthResult.error);
              answerObject = new fabric.IText(answerText, {
                left: answerX,
                top: answerY,
                fill: '#2563eb',
                fontSize: 24,
                fontFamily: 'Patrick Hand, Comic Sans MS, cursive',
                fontWeight: 'normal',
                customType: 'mathAnswer',
                selectable: true,
                editable: false,
              });
            }
          } catch (error) {
            console.error('[Canvas] Handwriting synthesis error:', error);
            // Fallback to font rendering
            answerObject = new fabric.IText(answerText, {
              left: answerX,
              top: answerY,
              fill: '#2563eb',
              fontSize: 24,
              fontFamily: 'Patrick Hand, Comic Sans MS, cursive',
              fontWeight: 'normal',
              customType: 'mathAnswer',
              selectable: true,
              editable: false,
            });
          }
        } else {
          // User disabled handwriting synthesis, use font
          answerObject = new fabric.IText(answerText, {
            left: answerX,
            top: answerY,
            fill: '#2563eb',
            fontSize: 24,
            fontFamily: 'Patrick Hand, Comic Sans MS, cursive',
            fontWeight: 'normal',
            customType: 'mathAnswer',
            selectable: true,
            editable: false,
          });
        }
        
        if (answerObject) {
          canvas.add(answerObject);
          canvas.requestRenderAll();
        }

        // Optionally show a small solution panel for steps (but don't duplicate the equation)
        if (result.steps && result.steps.length > 0) {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          let panelX = mathInputPosition.x + 300;
          let panelY = mathInputPosition.y;
          
          if (panelX + 400 > viewportWidth - 100) {
            panelX = Math.max(20, mathInputPosition.x - 420);
          }
          
          if (panelY > viewportHeight - 300) {
            panelY = Math.max(100, viewportHeight - 400);
          }
          
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
            position: { x: panelX, y: panelY },
            sourceObject: answerObject,
            analysis,
            llmStatus: 'idle',
            llmProvider: 'openrouter/andromeda-alpha',
            llmResponse: null,
            llmError: null,
            llmRaw: null,
          };

          setMathSolutions(prev => [...prev, newSolution]);
        }
      }
    }
    
    setMathMode(false);
    setMathInputValue('');
    setMathInputAnalysis(null);

    if (pendingHandwritingRef.current) {
      const { strokeIds, deleteOriginal, releaseHighlight } = pendingHandwritingRef.current;
      if (deleteOriginal && Array.isArray(strokeIds)) {
        let removedAny = false;
        strokeIds.forEach((strokeId) => {
          const stroke = strokesRef.current.find((item) => item.id === strokeId);
          if (stroke?.path) {
            canvas.remove(stroke.path);
            removedAny = true;
          }
        });
        if (removedAny && typeof canvas.requestRenderAll === 'function') {
          canvas.requestRenderAll();
        }
      }
      if (typeof releaseHighlight === 'function') {
        releaseHighlight();
      }
      pendingHandwritingRef.current = null;
      releaseHighlightRef.current = null;
    }
  }, [canvas, mathInputPosition, detectEquation, getStoredVariables, solveWithContext, calculateConfidence, handwritingSuggestion]);

  // Close math input without adding
  const handleMathInputClose = useCallback(() => {
    setMathMode(false);
    setMathInputValue('');
    setMathInputAnalysis(null);
    if (pendingHandwritingRef.current) {
      if (typeof pendingHandwritingRef.current.releaseHighlight === 'function') {
        pendingHandwritingRef.current.releaseHighlight();
      }
      pendingHandwritingRef.current = null;
    }
    releaseHighlightRef.current = null;
    setHandwritingSuggestion(null);
    setHandwritingHighlight(null);
  }, []);

  const handleAskAndromeda = useCallback(async (solutionId) => {
    let targetEquation = '';
    setMathSolutions((prev) => prev.map((solution) => {
      if (solution.id === solutionId) {
        targetEquation = solution.equation;
        return {
          ...solution,
          llmStatus: 'loading',
          llmError: null,
        };
      }
      return solution;
    }));

    if (!targetEquation) {
      return;
    }

    const response = await solveWithOpenRouter(targetEquation);

    setMathSolutions((prev) => prev.map((solution) => {
      if (solution.id !== solutionId) {
        return solution;
      }

      if (!response.success) {
        return {
          ...solution,
          llmStatus: 'error',
          llmError: response.error || 'Failed to fetch answer from Andromeda.',
          llmRaw: response.raw ?? null,
        };
      }

      return {
        ...solution,
        llmStatus: 'done',
        llmResponse: response.message,
        llmProvider: response.model || solution.llmProvider || 'openrouter/andromeda-alpha',
        llmError: null,
        llmRaw: response.raw ?? null,
      };
    }));
  }, [solveWithOpenRouter]);

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
              confidence: confidence,
              llmStatus: 'idle',
              llmResponse: null,
              llmError: null,
              llmRaw: null,
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

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleToggleHandwritingDebug();
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
        setMathInputAnalysis(null);
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
  }, [canvas, handleUndo, handleRedo, handleToggleHandwritingDebug]);

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
    const handleWheel = throttle((e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        const delta = e.deltaY;
        const zoomFactor = delta > 0 ? 0.95 : 1.05;
        const newZoom = zoom * zoomFactor;
        
        // Get mouse position using Fabric's coordinate system
        const pointer = canvas.getPointer(e, true);
        setCanvasZoom(newZoom, pointer);
      }
    }, 16); // Throttle to ~60fps

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

  const shouldShowHandwritingHighlight = Boolean(
    handwritingHighlight
    && handwritingSuggestion
    && !mathMode,
  );

  const getIntentPalette = (intent) => {
    if (intent === 'note') {
      return {
        border: 'rgba(239, 68, 68, 0.9)', // red
        fill: 'rgba(239, 68, 68, 0.08)',
        badge: 'rgba(220, 38, 38, 0.95)',
        shadow: 'rgba(239, 68, 68, 0.25)',
      };
    }
    // Equation intent: blue
    return {
      border: 'rgba(59, 130, 246, 0.9)',
      fill: 'rgba(59, 130, 246, 0.10)',
      badge: 'rgba(37, 99, 235, 0.95)',
      shadow: 'rgba(59, 130, 246, 0.25)',
    };
  };

  const activeHighlightPalette = shouldShowHandwritingHighlight
    ? getIntentPalette(handwritingSuggestion?.intent)
    : null;

  return (
    <div className="relative w-full h-full bg-white">
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
        onOCRSettingsOpen={() => setShowOCRSettings(true)}
      />
      {shouldShowHandwritingHighlight && activeHighlightPalette && (
        <div
          className="pointer-events-none absolute z-30 rounded-2xl transition-all duration-150"
          style={{
            left: `${handwritingHighlight.left}px`,
            top: `${handwritingHighlight.top}px`,
            width: `${handwritingHighlight.width}px`,
            height: `${handwritingHighlight.height}px`,
            borderWidth: '2px',
            borderStyle: 'dashed',
            borderColor: activeHighlightPalette.border,
            background: activeHighlightPalette.fill,
            boxShadow: `0 18px 32px -18px ${activeHighlightPalette.shadow}`,
          }}
        >
          <div
            className="absolute -top-7 left-1 flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg"
            style={{ backgroundColor: activeHighlightPalette.badge }}
          >
            <span>{handwritingSuggestion.intent === 'note' ? 'Not an equation' : (handwritingSuggestion.analysis?.classification || 'Equation')}</span>
            {typeof handwritingSuggestion.confidence === 'number' && (
              <span>{formatConfidenceText(handwritingSuggestion.confidence)}</span>
            )}
          </div>
        </div>
      )}

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
              onEquationDetected={(payload) => {
                if (!payload) {
                  setMathInputAnalysis(null);
                  return;
                }

                const isStringPayload = typeof payload === 'string';
                const text = isStringPayload ? payload : payload.text ?? '';
                const providedAnalysis = !isStringPayload ? payload.analysis ?? null : null;
                const resolvedAnalysis = text
                  ? (providedAnalysis || detectEquation(text))
                  : null;

                setMathInputAnalysis(resolvedAnalysis);
                
                // Removed auto-solve trigger - user must click "Solve" button
              }}
            />
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleMathInputComplete(mathInputValue, mathInputAnalysis)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-lg"
              >
                Solve Equation
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

      {handwritingSuggestion && !mathMode && (
        <div className="absolute bottom-6 right-6 z-40 max-w-sm p-4 bg-white/90 backdrop-blur rounded-xl border border-blue-100 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-800">
                  {handwritingSuggestion.loading ? 'Detecting...' : 'Handwriting detected'}
                </p>
                {handwritingSuggestion.loading ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
                    <span className="h-2.5 w-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Recognizing…</span>
                  </span>
                ) : (
                  handwritingSuggestion.method && (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${getMethodChipClass(handwritingSuggestion.method)}`}>
                      {formatMethodLabel(handwritingSuggestion.method)}
                    </span>
                  )
                )}
                {handwritingSuggestion.analysis && !handwritingSuggestion.loading && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                    {handwritingSuggestion.analysis.classification || 'unknown'}
                    {handwritingSuggestion.analysis.confidence != null && (
                      <span>{Math.round(Math.max(0, Math.min(handwritingSuggestion.analysis.confidence, 1)) * 100)}%</span>
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">
                {handwritingSuggestion.intent === 'note' ? 'Text:' : 'Equation:'}{' '}
                <span className="font-mono text-sm text-gray-900 break-all">
                  {handwritingSuggestion.equation && handwritingSuggestion.equation.trim().length
                    ? handwritingSuggestion.equation
                    : handwritingSuggestion.loading
                      ? 'Recognizing…'
                      : '(none)'}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                Confidence: {formatConfidenceText(handwritingSuggestion.confidence)}
                {handwritingSuggestion.remoteConfidence != null && (
                  <span className="ml-2">
                    Cloud: {formatConfidenceText(handwritingSuggestion.remoteConfidence)}
                  </span>
                )}
              </p>
              {handwritingSuggestion.mode && (
                <p className="text-xs text-gray-400">
                  OCR mode: {handwritingSuggestion.mode}
                  {handwritingSuggestion.threshold != null && (
                    <span className="ml-1">
                      (minimum {formatConfidenceText(handwritingSuggestion.threshold)})
                    </span>
                  )}
                </p>
              )}
              {handwritingSuggestion.error && (
                <p className="text-xs text-red-500">{handwritingSuggestion.error}</p>
              )}
              {handwritingSuggestion.intent === 'note' && !handwritingSuggestion.loading && (
                <p className="text-xs text-amber-600 font-medium">Looks like a note—no equation detected.</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleHandwritingDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss handwriting detection"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={handleHandwritingAccept}
              className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg shadow transition-colors ${handwritingSuggestion.intent === 'note'
                ? 'text-gray-500 bg-gray-200 cursor-not-allowed'
                : 'text-white bg-blue-600 hover:bg-blue-500'}`}
              disabled={handwritingSuggestion.intent === 'note'}
              title={handwritingSuggestion.intent === 'note' ? 'No equation detected to solve' : 'Edit and solve this equation'}
            >
              {handwritingSuggestion.intent === 'note' ? 'Not an equation' : 'Edit & Solve'}
            </button>
            <button
              type="button"
              onClick={handleAdjustRegion}
              className="px-3 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
              title="Adjust detection region"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleHandwritingDismiss}
              className="px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Ignore
            </button>
          </div>

          {handwritingSuggestion.intent !== 'note' && (
            <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={handwritingSuggestion.deleteOriginal}
                onChange={handleHandwritingDeleteToggle}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Delete handwriting after conversion
            </label>
          )}

          <button
            type="button"
            onClick={handleToggleHandwritingDebug}
            className="mt-3 inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: handwritingDebug ? '#22c55e' : '#d1d5db' }}
            />
            Debug {handwritingDebug ? 'on' : 'off'} (Ctrl+Shift+H)
          </button>

          <button
            type="button"
            onClick={() => setShowOCRSettings(true)}
            className="mt-2 inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-400/70" />
            OCR Settings
          </button>
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
          onAskLLM={() => handleAskAndromeda(solution.id)}
          onNavigateToSource={handleNavigateToSource}
          onApplySuggestion={handleApplySuggestion}
          onClose={() => setMathSolutions(prev => prev.filter(s => s.id !== solution.id))}
          llmStatus={solution.llmStatus}
          llmProvider={solution.llmProvider}
          llmResponse={solution.llmResponse}
          llmError={solution.llmError}
          analysis={solution.analysis}
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

      <GlassModal
        isOpen={showOCRSettings}
        onClose={() => setShowOCRSettings(false)}
        title="OCR Settings"
        className="max-w-3xl"
      >
        <OCRSettings />
      </GlassModal>

      {/* Handwriting Detector for automatic equation recognition */}
      <HandwritingDetector
        canvas={canvas}
        strokes={strokesRef.current}
        strokesVersion={strokesVersion}
        pauseDuration={1000}
        recentWindowMs={20000}
        activeWritingWindowMs={5000}
        contextRadius={420}
        maxGroupDistance={36}
        debug={handwritingDebug}
        onCandidate={handleHandwritingCandidate}
        enabled={!drawingInProgressRef.current}
      />

      {/* Resizable Detection Box */}
      {showResizableBox && resizableBoxBounds && (
        <ResizableDetectionBox
          initialBounds={resizableBoxBounds}
          onConfirm={handleConfirmResizableBox}
          onCancel={handleCancelResizableBox}
          zoom={zoom}
          panOffset={{ x: panOffset.x, y: panOffset.y }}
        />
      )}

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
      >
        {/* Grid Background - rendered inside canvas container */}
        {gridEnabled && canvas && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
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
          </div>
        )}
      </div>
    </div>
  );
});

Canvas.displayName = 'Canvas';

Canvas.propTypes = {
  noteId: PropTypes.string.isRequired,
  canvasId: PropTypes.string,
  initialCanvasData: PropTypes.string,
  onCanvasChange: PropTypes.func,
  onDrawingStateChange: PropTypes.func,
  onViewChange: PropTypes.func,
};

Canvas.defaultProps = {
  canvasId: null,
  initialCanvasData: null,
  onCanvasChange: null,
  onDrawingStateChange: null,
  onViewChange: null,
};

export default Canvas;
