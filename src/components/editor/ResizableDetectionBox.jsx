import { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * ResizableDetectionBox - Draggable/resizable box overlay for OCR region selection
 * Allows users to adjust the detection area before running OCR
 * Automatically expands to include overflowing strokes
 */
const ResizableDetectionBox = ({
  initialBounds,
  strokes = [],
  onConfirm,
  onCancel,
  zoom = 1,
  panOffset = { x: 0, y: 0 },
}) => {
  const [bounds, setBounds] = useState(initialBounds);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(null); // null | 'nw' | 'ne' | 'sw' | 'se'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const boxRef = useRef(null);
  const [autoExpanded, setAutoExpanded] = useState(false);

  // Auto-expand bounds to include overflowing strokes
  useEffect(() => {
    if (!strokes || strokes.length === 0) return;

    // Find strokes that intersect or are close to current bounds
    let needsExpansion = false;
    let newMinX = bounds.minX;
    let newMinY = bounds.minY;
    let newMaxX = bounds.maxX;
    let newMaxY = bounds.maxY;

    const expansionMargin = 20; // Pixel margin for detection

    strokes.forEach(stroke => {
      const strokeBounds = stroke?.bounds || stroke?.features?.bounds;
      if (!strokeBounds) return;

      // Check if stroke intersects or is close to current bounds
      const intersects = !(
        strokeBounds.maxX < bounds.minX - expansionMargin ||
        strokeBounds.minX > bounds.maxX + expansionMargin ||
        strokeBounds.maxY < bounds.minY - expansionMargin ||
        strokeBounds.minY > bounds.maxY + expansionMargin
      );

      if (intersects) {
        // Check for overflow and expand bounds
        if (strokeBounds.minX < bounds.minX) {
          newMinX = Math.min(newMinX, strokeBounds.minX);
          needsExpansion = true;
        }
        if (strokeBounds.maxX > bounds.maxX) {
          newMaxX = Math.max(newMaxX, strokeBounds.maxX);
          needsExpansion = true;
        }
        if (strokeBounds.minY < bounds.minY) {
          newMinY = Math.min(newMinY, strokeBounds.minY);
          needsExpansion = true;
        }
        if (strokeBounds.maxY > bounds.maxY) {
          newMaxY = Math.max(newMaxY, strokeBounds.maxY);
          needsExpansion = true;
        }
      }
    });

    if (needsExpansion) {
      // Add some padding
      const padding = 10;
      newMinX -= padding;
      newMinY -= padding;
      newMaxX += padding;
      newMaxY += padding;

      setBounds({
        minX: newMinX,
        minY: newMinY,
        maxX: newMaxX,
        maxY: newMaxY,
        width: newMaxX - newMinX,
        height: newMaxY - newMinY,
        centerX: (newMinX + newMaxX) / 2,
        centerY: (newMinY + newMaxY) / 2,
      });
      setAutoExpanded(true);
      
      console.log('[ResizableBox] Auto-expanded bounds to include overflowing strokes');
    }
  }, [strokes, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]);

  const screenBounds = {
    left: bounds.minX * zoom + panOffset.x,
    top: bounds.minY * zoom + panOffset.y,
    width: bounds.width * zoom,
    height: bounds.height * zoom,
  };

  const handleMouseDown = useCallback((e, mode) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (mode === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(mode);
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !isResizing) return;

    const dx = (e.clientX - dragStart.x) / zoom;
    const dy = (e.clientY - dragStart.y) / zoom;

    if (isDragging) {
      // Move the entire box
      setBounds(prev => ({
        minX: prev.minX + dx,
        minY: prev.minY + dy,
        maxX: prev.maxX + dx,
        maxY: prev.maxY + dy,
        width: prev.width,
        height: prev.height,
        centerX: prev.centerX + dx,
        centerY: prev.centerY + dy,
      }));
    } else if (isResizing) {
      // Resize from the corner
      setBounds(prev => {
        let newMinX = prev.minX;
        let newMinY = prev.minY;
        let newMaxX = prev.maxX;
        let newMaxY = prev.maxY;

        switch (isResizing) {
          case 'nw':
            newMinX = prev.minX + dx;
            newMinY = prev.minY + dy;
            break;
          case 'ne':
            newMaxX = prev.maxX + dx;
            newMinY = prev.minY + dy;
            break;
          case 'sw':
            newMinX = prev.minX + dx;
            newMaxY = prev.maxY + dy;
            break;
          case 'se':
            newMaxX = prev.maxX + dx;
            newMaxY = prev.maxY + dy;
            break;
          default:
            break;
        }

        // Ensure minimum size
        const minSize = 20;
        if (newMaxX - newMinX < minSize || newMaxY - newMinY < minSize) {
          return prev;
        }

        return {
          minX: newMinX,
          minY: newMinY,
          maxX: newMaxX,
          maxY: newMaxY,
          width: newMaxX - newMinX,
          height: newMaxY - newMinY,
          centerX: (newMinX + newMaxX) / 2,
          centerY: (newMinY + newMaxY) / 2,
        };
      });
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, isResizing, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleConfirm = () => {
    onConfirm(bounds);
  };

  return (
    <>
      {/* Overlay backdrop */}
      <div className="absolute inset-0 bg-black/20 z-40 pointer-events-none" />

      {/* Resizable box */}
      <div
        ref={boxRef}
        className="absolute z-50 border-2 border-blue-500 bg-blue-500/10"
        style={{
          left: `${screenBounds.left}px`,
          top: `${screenBounds.top}px`,
          width: `${screenBounds.width}px`,
          height: `${screenBounds.height}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
      >
        {/* Corner handles */}
        {['nw', 'ne', 'sw', 'se'].map((corner) => {
          const positions = {
            nw: { top: -4, left: -4, cursor: 'nwse-resize' },
            ne: { top: -4, right: -4, cursor: 'nesw-resize' },
            sw: { bottom: -4, left: -4, cursor: 'nesw-resize' },
            se: { bottom: -4, right: -4, cursor: 'nwse-resize' },
          };
          const pos = positions[corner];
          
          return (
            <div
              key={corner}
              className="absolute w-3 h-3 bg-blue-600 border border-white rounded-full shadow-lg hover:scale-125 transition-transform"
              style={{
                ...pos,
                cursor: pos.cursor,
              }}
              onMouseDown={(e) => handleMouseDown(e, corner)}
            />
          );
        })}

        {/* Size indicator */}
        <div className="absolute -top-8 left-0 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded shadow-lg">
          {Math.round(bounds.width)} × {Math.round(bounds.height)}px
          {autoExpanded && (
            <span className="ml-2 text-yellow-300">✨ Auto-expanded</span>
          )}
        </div>
      </div>

      {/* Control buttons */}
      <div
        className="absolute z-50 flex gap-2 bg-white/95 backdrop-blur rounded-lg shadow-2xl p-3 border border-blue-200"
        style={{
          left: `${screenBounds.left}px`,
          top: `${screenBounds.top + screenBounds.height + 12}px`,
        }}
      >
        <button
          onClick={handleConfirm}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow"
        >
          ✓ Confirm & Detect
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </>
  );
};

ResizableDetectionBox.propTypes = {
  initialBounds: PropTypes.shape({
    minX: PropTypes.number.isRequired,
    minY: PropTypes.number.isRequired,
    maxX: PropTypes.number.isRequired,
    maxY: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    centerX: PropTypes.number.isRequired,
    centerY: PropTypes.number.isRequired,
  }).isRequired,
  strokes: PropTypes.arrayOf(PropTypes.object),
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  zoom: PropTypes.number,
  panOffset: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
};

ResizableDetectionBox.defaultProps = {
  strokes: [],
  zoom: 1,
  panOffset: { x: 0, y: 0 },
};

export default ResizableDetectionBox;
