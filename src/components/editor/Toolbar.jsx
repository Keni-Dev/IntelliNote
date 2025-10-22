import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../lib/utils';
import ColorPicker from './ColorPicker';

/**
 * Toolbar - Floating toolbar with drawing tools
 * 
 * @param {Object} props
 * @param {string} props.activeTool - Currently active tool
 * @param {Function} props.onToolChange - Callback when tool changes
 * @param {number} props.brushSize - Current brush size
 * @param {Function} props.onBrushSizeChange - Callback when brush size changes
 * @param {string} props.color - Current color
 * @param {Function} props.onColorChange - Callback when color changes
 * @param {boolean} props.canUndo - Whether undo is available
 * @param {boolean} props.canRedo - Whether redo is available
 * @param {Function} props.onUndo - Callback for undo action
 * @param {Function} props.onRedo - Callback for redo action
 * @param {Object} props.penSettings - Pen/stylus settings
 * @param {Function} props.onPenSettingsChange - Callback when pen settings change
 * @param {Function} props.getPenSettings - Get current pen settings
 * @returns {JSX.Element}
 */
const Toolbar = ({
  activeTool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  color,
  onColorChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  penSettings = {},
  onPenSettingsChange,
  getPenSettings,
  gridSettings = {},
  onViewSettingsChange,
}) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isPenSettingsOpen, setIsPenSettingsOpen] = useState(false);
  const [isBrushControlsOpen, setIsBrushControlsOpen] = useState(false);
  const [isViewSettingsOpen, setIsViewSettingsOpen] = useState(false);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [selectedShapeTool, setSelectedShapeTool] = useState('line');
  const brushControlsRef = useRef(null);
  const shapesMenuRef = useRef(null);

  const pressureEnabled = penSettings?.pressureSensitivity ?? true;
  const pressureMultiplier = penSettings?.pressureMultiplier ?? 1.0;
  const baseBrushSize = penSettings?.baseWidth ?? brushSize;
  const minOpacity = penSettings?.minOpacity ?? 0.3;
  const maxOpacity = penSettings?.maxOpacity ?? 1.0;
  const previewOpacity = pressureEnabled
    ? Math.min(maxOpacity, Math.max(minOpacity, 0.7 * pressureMultiplier))
    : 1.0;
  const previewDotSize = Math.max(6, Math.min(42, brushSize * 1.2));
  const livePenInfo = getPenSettings ? getPenSettings() : null;

  const pushPenSettings = (payload) => {
    if (typeof onPenSettingsChange === 'function') {
      onPenSettingsChange(payload);
    }
  };

  const handleBrushSizeInput = (value) => {
    if (value === '' || value === null) {
      return;
    }
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return;
    }

    const clamped = Math.max(1, Math.min(60, Math.round(numericValue)));
    onBrushSizeChange(clamped);

    pushPenSettings({
      baseWidth: clamped,
    });
  };

  const handleBrushSizeSlider = (event) => {
    handleBrushSizeInput(event.target.value);
  };

  const handleBrushSizeNumber = (event) => {
    handleBrushSizeInput(event.target.value);
  };

  // Handle test canvas drawing
  useEffect(() => {
    if (!isPenSettingsOpen) return;

    const canvas = document.getElementById('pen-test-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDrawing = (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    };

    const draw = (e) => {
      if (!isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const pressure = e.pressure ?? 0.5;

      let opacity = 1.0;
      if (pressureEnabled) {
        const dynamicOpacity = pressure * pressureMultiplier;
        opacity = Math.max(minOpacity, Math.min(maxOpacity, dynamicOpacity));
      }

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = baseBrushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      lastX = x;
      lastY = y;
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    const clearCanvas = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointerout', stopDrawing);
    canvas.addEventListener('dblclick', clearCanvas);

    return () => {
      canvas.removeEventListener('pointerdown', startDrawing);
      canvas.removeEventListener('pointermove', draw);
      canvas.removeEventListener('pointerup', stopDrawing);
      canvas.removeEventListener('pointerout', stopDrawing);
      canvas.removeEventListener('dblclick', clearCanvas);
    };
  }, [isPenSettingsOpen, baseBrushSize, color, pressureEnabled, pressureMultiplier, minOpacity, maxOpacity]);

  const shapeTools = [
    {
      id: 'line',
      name: 'Line',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19l14-14" />
        </svg>
      ),
      shortcut: 'L',
    },
    {
      id: 'rectangle',
      name: 'Rectangle',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="4" y="4" width="16" height="16" strokeWidth={2} rx="2" />
        </svg>
      ),
      shortcut: 'R',
    },
    {
      id: 'circle',
      name: 'Circle',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="8" strokeWidth={2} />
        </svg>
      ),
      shortcut: 'C',
    },
  ];

  const tools = [
    {
      id: 'select',
      name: 'Select',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
      shortcut: 'V',
    },
    {
      id: 'pen',
      name: 'Pen',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      shortcut: 'P',
    },
    {
      id: 'eraser',
      name: 'Eraser',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      shortcut: 'E',
    },
    {
      id: 'text',
      name: 'Text',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      shortcut: 'T',
    },
  ];

  const showBrushSize = activeTool === 'pen' || activeTool === 'eraser';
  const showColorPicker = activeTool === 'pen' || activeTool === 'text' || activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle';
  const currentShapeTool = shapeTools.find(tool => tool.id === selectedShapeTool) || shapeTools[0];

  useEffect(() => {
    if (!showBrushSize) {
      setIsBrushControlsOpen(false);
    }
  }, [showBrushSize]);

  useEffect(() => {
    if (!isBrushControlsOpen) return;

    const handleClickOutside = (event) => {
      if (brushControlsRef.current && !brushControlsRef.current.contains(event.target)) {
        setIsBrushControlsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handleClickOutside);
    return () => {
      window.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isBrushControlsOpen]);

  useEffect(() => {
    if (!isShapesMenuOpen) return;

    const handleClickOutside = (event) => {
      // Close shapes menu when clicking outside
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(event.target)) {
        setIsShapesMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handleClickOutside);
    return () => {
      window.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isShapesMenuOpen]);

  // Update selected shape tool when activeTool changes to a shape
  useEffect(() => {
    if (['line', 'rectangle', 'circle'].includes(activeTool)) {
      setSelectedShapeTool(activeTool);
    }
  }, [activeTool]);

  return (
    <div
      className={cn(
        'fixed left-6 top-1/2 -translate-y-1/2',
        'backdrop-blur-md bg-gray-800/90 border border-gray-700',
        'rounded-2xl p-3 shadow-2xl',
        'z-[60]',
        'flex flex-col gap-2'
      )}
    >
      {/* Undo/Redo Buttons */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={cn(
            'relative group',
            'w-12 h-12 rounded-xl',
            'flex items-center justify-center',
            'transition-all duration-200',
            canUndo 
              ? 'bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white hover:scale-105' 
              : 'bg-gray-800/50 border border-gray-700/30 text-gray-600 cursor-not-allowed opacity-50'
          )}
          title={`Undo (Ctrl+Z)`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          
          {/* Tooltip */}
          <div className={cn(
            'absolute left-full ml-2 px-3 py-1.5',
            'bg-gray-900 text-white text-xs rounded-lg',
            'whitespace-nowrap',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200',
            'pointer-events-none'
          )}>
            Undo
            <span className="text-gray-400 ml-2">(Ctrl+Z)</span>
          </div>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={cn(
            'relative group',
            'w-12 h-12 rounded-xl',
            'flex items-center justify-center',
            'transition-all duration-200',
            canRedo 
              ? 'bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white hover:scale-105' 
              : 'bg-gray-800/50 border border-gray-700/30 text-gray-600 cursor-not-allowed opacity-50'
          )}
          title={`Redo (Ctrl+Shift+Z or Ctrl+Y)`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
          
          {/* Tooltip */}
          <div className={cn(
            'absolute left-full ml-2 px-3 py-1.5',
            'bg-gray-900 text-white text-xs rounded-lg',
            'whitespace-nowrap',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200',
            'pointer-events-none'
          )}>
            Redo
            <span className="text-gray-400 ml-2">(Ctrl+Shift+Z)</span>
          </div>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-700 my-1" />

      {/* Tool Buttons */}
      <div className="flex flex-col gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={cn(
              'relative group',
              'w-12 h-12 rounded-xl',
              'flex items-center justify-center',
              'transition-all duration-200',
              'hover:scale-105',
              activeTool === tool.id
                ? 'bg-indigo-500 border-2 border-indigo-400 text-white shadow-lg'
                : 'bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
            )}
            title={`${tool.name} (${tool.shortcut})`}
          >
            {tool.icon}
            
            {/* Tooltip */}
            <div className={cn(
              'absolute left-full ml-2 px-3 py-1.5',
              'bg-gray-900 text-white text-xs rounded-lg',
              'whitespace-nowrap',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200',
              'pointer-events-none'
            )}>
              {tool.name}
              <span className="text-gray-400 ml-2">({tool.shortcut})</span>
            </div>
          </button>
        ))}

        {/* Shape Tools Button (Grouped) */}
        <div className="relative" ref={shapesMenuRef}>
          <button
            onClick={() => {
              const isShapeActive = ['line', 'rectangle', 'circle'].includes(activeTool);
              if (isShapeActive) {
                setIsShapesMenuOpen(!isShapesMenuOpen);
              } else {
                onToolChange(selectedShapeTool);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setIsShapesMenuOpen(!isShapesMenuOpen);
            }}
            className={cn(
              'relative group',
              'w-12 h-12 rounded-xl',
              'flex items-center justify-center',
              'transition-all duration-200',
              'hover:scale-105',
              ['line', 'rectangle', 'circle'].includes(activeTool)
                ? 'bg-indigo-500 border-2 border-indigo-400 text-white shadow-lg'
                : 'bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
            )}
            title={`${currentShapeTool.name} (${currentShapeTool.shortcut}) - Right-click for more`}
          >
            <div className="relative">
              {currentShapeTool.icon}
              {/* Small indicator for grouped tools */}
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-indigo-400 rounded-sm border border-gray-800" />
            </div>
            
            {/* Tooltip */}
            <div className={cn(
              'absolute left-full ml-2 px-3 py-1.5',
              'bg-gray-900 text-white text-xs rounded-lg',
              'whitespace-nowrap',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200',
              'pointer-events-none'
            )}>
              {currentShapeTool.name}
              <span className="text-gray-400 ml-2">({currentShapeTool.shortcut})</span>
              <div className="text-gray-500 text-[10px] mt-0.5">Right-click for more shapes</div>
            </div>
          </button>

          {/* Shape Tools Submenu */}
          {isShapesMenuOpen && (
            <div className={cn(
              'absolute left-full ml-2 top-0',
              'backdrop-blur-md bg-gray-800/95 border border-gray-700',
              'rounded-xl p-2 shadow-2xl',
              'flex flex-col gap-1',
              'z-[70]'
            )}>
              {shapeTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    onToolChange(tool.id);
                    setSelectedShapeTool(tool.id);
                    setIsShapesMenuOpen(false);
                  }}
                  className={cn(
                    'relative group',
                    'w-12 h-12 rounded-lg',
                    'flex items-center justify-center',
                    'transition-all duration-200',
                    'hover:scale-105',
                    activeTool === tool.id
                      ? 'bg-indigo-500 border-2 border-indigo-400 text-white shadow-lg'
                      : 'bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                  )}
                  title={`${tool.name} (${tool.shortcut})`}
                >
                  {tool.icon}
                  
                  {/* Tooltip */}
                  <div className={cn(
                    'absolute left-full ml-2 px-3 py-1.5',
                    'bg-gray-900 text-white text-xs rounded-lg',
                    'whitespace-nowrap',
                    'opacity-0 group-hover:opacity-100',
                    'transition-opacity duration-200',
                    'pointer-events-none'
                  )}>
                    {tool.name}
                    <span className="text-gray-400 ml-2">({tool.shortcut})</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      {(showBrushSize || showColorPicker) && (
        <div className="h-px bg-gray-700 my-1" />
      )}

      {/* Brush Size Slider */}
      {showBrushSize && (
        <div ref={brushControlsRef}>
          <button
            type="button"
            onClick={() => setIsBrushControlsOpen((open) => !open)}
            className={cn(
              'relative group',
              'w-12 h-12 rounded-xl',
              'flex items-center justify-center',
              'transition-all duration-200',
              'hover:scale-105',
              isBrushControlsOpen
                ? 'bg-indigo-500 border-2 border-indigo-400 text-white shadow-lg'
                : 'bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
            )}
            title="Brush Size"
          >
            <div className="flex flex-col items-center justify-center gap-0.5">
              <div
                className="rounded-full transition-all duration-200"
                style={{
                  width: `${Math.max(4, Math.min(16, previewDotSize / 2.5))}px`,
                  height: `${Math.max(4, Math.min(16, previewDotSize / 2.5))}px`,
                  backgroundColor: activeTool === 'eraser' ? '#ffffff' : color,
                  boxShadow: activeTool === 'eraser'
                    ? '0 0 0 1px rgba(17,24,39,0.25)'
                    : '0 2px 8px rgba(99,102,241,0.4)',
                }}
              />
              <span className="text-[9px] font-medium">{brushSize}px</span>
            </div>

            {/* Tooltip */}
            <div className={cn(
              'absolute left-full ml-2 px-3 py-1.5',
              'bg-gray-900 text-white text-xs rounded-lg',
              'whitespace-nowrap',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200',
              'pointer-events-none'
            )}>
              Brush Size
            </div>
          </button>

          {isBrushControlsOpen && (
            <div className={cn(
              'absolute left-full ml-6 top-0',
              'backdrop-blur-md bg-gray-800/95 border border-gray-700',
              'rounded-2xl p-4 shadow-2xl',
              'min-w-[320px] max-h-[calc(100vh-8rem)]',
              'overflow-y-auto',
              'z-[70]'
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Brush Size</h3>
                <button
                  onClick={() => setIsBrushControlsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={brushSize}
                    onChange={handleBrushSizeSlider}
                    onFocus={() => setIsBrushControlsOpen(true)}
                    className={cn(
                      'w-full h-2 rounded-full appearance-none cursor-pointer',
                      'bg-gradient-to-r from-indigo-500/50 via-indigo-400/40 to-indigo-300/30',
                      '[&::-webkit-slider-thumb]:appearance-none',
                      '[&::-webkit-slider-thumb]:w-4',
                      '[&::-webkit-slider-thumb]:h-4',
                      '[&::-webkit-slider-thumb]:rounded-full',
                      '[&::-webkit-slider-thumb]:bg-white',
                      '[&::-webkit-slider-thumb]:border',
                      '[&::-webkit-slider-thumb]:border-indigo-400/60',
                      '[&::-webkit-slider-thumb]:shadow-lg',
                      '[&::-webkit-slider-thumb]:cursor-pointer',
                      '[&::-webkit-slider-thumb]:transition-transform',
                      '[&::-webkit-slider-thumb]:hover:scale-110',
                      '[&::-moz-range-track]:bg-transparent',
                      '[&::-moz-range-thumb]:w-4',
                      '[&::-moz-range-thumb]:h-4',
                      '[&::-moz-range-thumb]:border',
                      '[&::-moz-range-thumb]:border-indigo-400/60',
                      '[&::-moz-range-thumb]:rounded-full',
                      '[&::-moz-range-thumb]:bg-white',
                      '[&::-moz-range-thumb]:cursor-pointer'
                    )}
                  />
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={brushSize}
                    onChange={handleBrushSizeNumber}
                    onFocus={() => setIsBrushControlsOpen(true)}
                    className="w-16 rounded-lg border border-gray-700 bg-gray-950/70 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-500 px-1">
                  <span>Fine</span>
                  <span>Large</span>
                </div>

                {/* Live Preview */}
                <div className="pt-3 border-t border-gray-700">
                  <label className="text-xs text-gray-400 font-medium mb-2 block">Preview</label>
                  <div className="bg-white rounded-lg h-16 flex items-center justify-center">
                    <div
                      className="rounded-full transition-all duration-200"
                      style={{
                        width: `${previewDotSize}px`,
                        height: `${previewDotSize}px`,
                        backgroundColor: activeTool === 'eraser' ? '#ffffff' : color,
                        border: activeTool === 'eraser' ? '2px solid rgba(17,24,39,0.2)' : 'none',
                        boxShadow: activeTool === 'eraser'
                          ? 'inset 0 0 0 1px rgba(17,24,39,0.1)'
                          : '0 6px 18px rgba(99,102,241,0.4)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Color Picker Button */}
      {showColorPicker && (
        <div className="relative">
          <button
            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
            className={cn(
              'w-12 h-12 rounded-xl',
              'border-2 transition-all duration-200',
              'hover:scale-105 flex items-center justify-center',
              isColorPickerOpen
                ? 'border-indigo-400 shadow-lg scale-105'
                : 'border-gray-600 hover:border-gray-500'
            )}
            style={{ backgroundColor: color }}
            title="Choose Color"
          >
            <div className="w-6 h-6 rounded-full border-2 border-white/50" />
          </button>

          {/* Color Picker Dropdown */}
          <ColorPicker
            selectedColor={color}
            onColorChange={onColorChange}
            isOpen={isColorPickerOpen}
            onClose={() => setIsColorPickerOpen(false)}
          />
        </div>
      )}

      {/* Pen Settings Button (for pen tool) */}
      {activeTool === 'pen' && (
        <div className="relative">
          <button
            onClick={() => setIsPenSettingsOpen(!isPenSettingsOpen)}
            className={cn(
              'relative group',
              'w-12 h-12 rounded-xl',
              'flex items-center justify-center',
              'transition-all duration-200',
              'hover:scale-105',
              isPenSettingsOpen
                ? 'bg-indigo-500 border-2 border-indigo-400 text-white shadow-lg'
                : 'bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
            )}
            title="Pen Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>

            {/* Tooltip */}
            <div className={cn(
              'absolute left-full ml-2 px-3 py-1.5',
              'bg-gray-900 text-white text-xs rounded-lg',
              'whitespace-nowrap',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200',
              'pointer-events-none'
            )}>
              Pen Settings
            </div>
          </button>

          {/* Pen Settings Panel */}
          {isPenSettingsOpen && (
            <div className={cn(
              'absolute left-full ml-6 bottom-0',
              'backdrop-blur-md bg-gray-800/95 border border-gray-700',
              'rounded-2xl p-4 shadow-2xl',
              'min-w-[280px] max-h-[calc(100vh-8rem)]',
              'overflow-y-auto',
              'z-[70]'
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Pen Settings</h3>
                <button
                  onClick={() => setIsPenSettingsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Pressure Sensitivity Toggle */}
              <div className="mb-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-gray-300 font-medium">Pressure Sensitivity</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={pressureEnabled}
                      onChange={(e) => pushPenSettings({ pressureSensitivity: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className={cn(
                      'w-11 h-6 rounded-full transition-colors',
                      'peer-checked:bg-indigo-500 bg-gray-600',
                      'peer-focus:ring-2 peer-focus:ring-indigo-400'
                    )}>
                      <div className={cn(
                        'w-5 h-5 bg-white rounded-full shadow-md transform transition-transform',
                        'absolute top-0.5 left-0.5',
                        'peer-checked:translate-x-5'
                      )} />
                    </div>
                  </div>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {pressureEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              {/* Pressure Multiplier Slider */}
              {pressureEnabled && (
                <div className="mb-4">
                  <label className="text-xs text-gray-300 font-medium mb-2 block">
                    Pressure Multiplier: {pressureMultiplier.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={pressureMultiplier}
                    onChange={(e) => pushPenSettings({ pressureMultiplier: parseFloat(e.target.value) })}
                    className={cn(
                      'w-full h-2 rounded-full appearance-none cursor-pointer',
                      'bg-gray-700',
                      '[&::-webkit-slider-thumb]:appearance-none',
                      '[&::-webkit-slider-thumb]:w-4',
                      '[&::-webkit-slider-thumb]:h-4',
                      '[&::-webkit-slider-thumb]:rounded-full',
                      '[&::-webkit-slider-thumb]:bg-indigo-500',
                      '[&::-webkit-slider-thumb]:cursor-pointer',
                      '[&::-webkit-slider-thumb]:transition-all',
                      '[&::-webkit-slider-thumb]:hover:scale-110',
                      '[&::-moz-range-thumb]:w-4',
                      '[&::-moz-range-thumb]:h-4',
                      '[&::-moz-range-thumb]:rounded-full',
                      '[&::-moz-range-thumb]:bg-indigo-500',
                      '[&::-moz-range-thumb]:border-0',
                      '[&::-moz-range-thumb]:cursor-pointer',
                      '[&::-moz-range-thumb]:transition-all',
                      '[&::-moz-range-thumb]:hover:scale-110'
                    )}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5x</span>
                    <span>2.0x</span>
                  </div>
                </div>
              )}

              {/* Stroke Preview */}
              <div className="mb-4">
                <label className="text-xs text-gray-300 font-medium mb-2 block">
                  Stroke Preview
                </label>
                <div className="bg-white rounded-lg p-3 h-20 flex items-center justify-center">
                  <svg width="200" height="40" viewBox="0 0 200 40">
                    {/* Preview stroke with varying widths */}
                    <path
                      d="M 10 20 Q 50 10, 100 20 T 190 20"
                      stroke={color}
                      fill="none"
                      strokeWidth={baseBrushSize}
                      strokeLinecap="round"
                      opacity={previewOpacity}
                    />
                  </svg>
                </div>
              </div>

              {/* Device Info */}
              {livePenInfo?.currentBrush && (
                <div className="pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">
                    Input: <span className="text-gray-300 capitalize">
                      {livePenInfo.currentBrush.pointerType || 'mouse'}
                    </span>
                  </p>
                  {livePenInfo.currentBrush.currentPressure !== undefined && (
                    <p className="text-xs text-gray-400">
                      Pressure: <span className="text-gray-300">
                        {(livePenInfo.currentBrush.currentPressure * 100).toFixed(0)}%
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Test Area */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <label className="text-xs text-gray-300 font-medium mb-2 block">
                  Test Area
                </label>
                <div className="bg-white rounded-lg h-24 cursor-crosshair">
                  <canvas
                    id="pen-test-canvas"
                    width="248"
                    height="96"
                    className="w-full h-full rounded-lg"
                    style={{ touchAction: 'none' }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Draw here to test your pen settings
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Settings Button (Grid & Guides) */}
      <div className="relative">
        <button
          onClick={() => setIsViewSettingsOpen(!isViewSettingsOpen)}
          className={cn(
            'relative group',
            'w-12 h-12 rounded-xl',
            'flex items-center justify-center',
            'transition-all duration-200',
            'hover:scale-105',
            isViewSettingsOpen
              ? 'bg-indigo-500 border-2 border-indigo-400 text-white shadow-lg'
              : 'bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
          )}
          title="View Settings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>

          {/* Tooltip */}
          <div className={cn(
            'absolute left-full ml-2 px-3 py-1.5',
            'bg-gray-900 text-white text-xs rounded-lg',
            'whitespace-nowrap',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200',
            'pointer-events-none'
          )}>
            View Settings
          </div>
        </button>

        {/* View Settings Panel */}
        {isViewSettingsOpen && (
          <div className={cn(
            'absolute left-full ml-6 bottom-0',
            'backdrop-blur-md bg-gray-800/95 border border-gray-700',
            'rounded-2xl p-4 shadow-2xl',
            'min-w-[280px] max-h-[calc(100vh-8rem)]',
            'overflow-y-auto',
            'z-[70]'
          )}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">View Settings</h3>
              <button
                onClick={() => setIsViewSettingsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Show Grid Toggle */}
            <div className="mb-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-gray-300 font-medium">Show Grid</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={gridSettings.gridEnabled}
                    onChange={(e) => onViewSettingsChange({ gridEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className={cn(
                    'w-10 h-5 rounded-full transition-colors',
                    'peer-checked:bg-indigo-500 bg-gray-600'
                  )}>
                    <div className={cn(
                      'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                      'peer-checked:translate-x-5'
                    )}></div>
                  </div>
                </div>
              </label>
            </div>

            {/* Grid Type Selector */}
            {gridSettings.gridEnabled && (
              <>
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 font-medium mb-2">Grid Type</label>
                  <select
                    value={gridSettings.gridType}
                    onChange={(e) => onViewSettingsChange({ gridType: e.target.value })}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg',
                      'bg-gray-700 text-gray-200 text-xs',
                      'border border-gray-600',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                      'cursor-pointer'
                    )}
                  >
                    <option value="dots">Dots</option>
                    <option value="lines">Lines</option>
                    <option value="graph">Graph Paper</option>
                  </select>
                </div>

                {/* Grid Size Slider */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 font-medium mb-2">
                    Grid Size: {gridSettings.gridSize}px
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="10"
                    value={gridSettings.gridSize}
                    onChange={(e) => onViewSettingsChange({ gridSize: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>20px</span>
                    <span>100px</span>
                  </div>
                </div>

                {/* Snap to Grid Toggle */}
                <div className="mb-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-gray-300 font-medium">Snap to Grid</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={gridSettings.snapToGrid}
                        onChange={(e) => onViewSettingsChange({ snapToGrid: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className={cn(
                        'w-10 h-5 rounded-full transition-colors',
                        'peer-checked:bg-indigo-500 bg-gray-600'
                      )}>
                        <div className={cn(
                          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                          'peer-checked:translate-x-5'
                        )}></div>
                      </div>
                    </div>
                  </label>
                </div>
              </>
            )}

            {/* Show Alignment Guides Toggle */}
            <div className="mb-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-gray-300 font-medium">Alignment Guides</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={gridSettings.showGuides}
                    onChange={(e) => onViewSettingsChange({ showGuides: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className={cn(
                    'w-10 h-5 rounded-full transition-colors',
                    'peer-checked:bg-indigo-500 bg-gray-600'
                  )}>
                    <div className={cn(
                      'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                      'peer-checked:translate-x-5'
                    )}></div>
                  </div>
                </div>
              </label>
              <p className="text-xs text-gray-400 mt-1">
                Show guides when moving objects
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Toolbar.propTypes = {
  activeTool: PropTypes.oneOf(['select', 'pen', 'eraser', 'text', 'line', 'rectangle', 'circle']).isRequired,
  onToolChange: PropTypes.func.isRequired,
  brushSize: PropTypes.number.isRequired,
  onBrushSizeChange: PropTypes.func.isRequired,
  color: PropTypes.string.isRequired,
  onColorChange: PropTypes.func.isRequired,
  canUndo: PropTypes.bool,
  canRedo: PropTypes.bool,
  onUndo: PropTypes.func,
  onRedo: PropTypes.func,
  penSettings: PropTypes.shape({
    pressureSensitivity: PropTypes.bool,
    pressureMultiplier: PropTypes.number,
    minOpacity: PropTypes.number,
    maxOpacity: PropTypes.number,
    baseWidth: PropTypes.number,
  }),
  onPenSettingsChange: PropTypes.func,
  getPenSettings: PropTypes.func,
  gridSettings: PropTypes.shape({
    gridEnabled: PropTypes.bool,
    gridSize: PropTypes.number,
    gridType: PropTypes.oneOf(['dots', 'lines', 'graph']),
    snapToGrid: PropTypes.bool,
    showGuides: PropTypes.bool,
  }),
  onViewSettingsChange: PropTypes.func,
};

export default Toolbar;
