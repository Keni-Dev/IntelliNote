import { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * GridBackground - Renders a grid overlay on the canvas
 * 
 * @param {Object} props
 * @param {boolean} props.enabled - Whether grid is visible
 * @param {number} props.gridSize - Size of grid cells in pixels
 * @param {string} props.gridColor - Color of grid lines
 * @param {number} props.gridOpacity - Opacity of grid (0-1)
 * @param {string} props.gridType - Type of grid: 'dots', 'lines', 'graph'
 * @param {number} props.zoom - Current zoom level
 * @param {Object} props.panOffset - Current pan offset {x, y}
 * @param {number} props.width - Canvas width
 * @param {number} props.height - Canvas height
 */
const GridBackground = ({
  enabled = false,
  gridSize = 40,
  gridColor = '#e0e0e0',
  gridOpacity = 0.75,
  gridType = 'lines',
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  width = 0,
  height = 0,
}) => {
  const canvasRef = useRef(null);

  const renderDots = useCallback((ctx, canvasWidth, canvasHeight, gridSize, startX, startY) => {
    const dotSize = Math.max(1, Math.min(3, gridSize / 20));
    
    for (let x = startX; x < canvasWidth; x += gridSize) {
      for (let y = startY; y < canvasHeight; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  const renderLines = useCallback((ctx, canvasWidth, canvasHeight, gridSize, startX, startY) => {
    ctx.beginPath();
    
    // Vertical lines
    for (let x = startX; x < canvasWidth; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
    }
    
    // Horizontal lines
    for (let y = startY; y < canvasHeight; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
    }
    
    ctx.stroke();
  }, []);

  const renderGraphPaper = useCallback((ctx, canvasWidth, canvasHeight, gridSize, startX, startY, currentPanOffset, currentGridColor, currentGridOpacity) => {
    const minorGridSize = gridSize / 5;
    const minorStartX = (currentPanOffset.x % minorGridSize + minorGridSize) % minorGridSize;
    const minorStartY = (currentPanOffset.y % minorGridSize + minorGridSize) % minorGridSize;

    // Draw minor grid (lighter)
    ctx.strokeStyle = currentGridColor;
    ctx.globalAlpha = currentGridOpacity * 0.3;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    
    for (let x = minorStartX; x < canvasWidth; x += minorGridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
    }
    
    for (let y = minorStartY; y < canvasHeight; y += minorGridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
    }
    
    ctx.stroke();

    // Draw major grid (darker)
    ctx.strokeStyle = currentGridColor;
    ctx.globalAlpha = currentGridOpacity;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let x = startX; x < canvasWidth; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
    }
    
    for (let y = startY; y < canvasHeight; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
    }
    
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!enabled || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate grid size adjusted for zoom
    const adjustedGridSize = gridSize * zoom;

    // Calculate starting offset based on pan
    const startX = (panOffset.x % adjustedGridSize + adjustedGridSize) % adjustedGridSize;
    const startY = (panOffset.y % adjustedGridSize + adjustedGridSize) % adjustedGridSize;

    // Set grid style
    ctx.strokeStyle = gridColor;
    ctx.fillStyle = gridColor;
    ctx.globalAlpha = gridOpacity;
    ctx.lineWidth = 1;

    switch (gridType) {
      case 'dots':
        renderDots(ctx, width, height, adjustedGridSize, startX, startY);
        break;
      case 'graph':
        renderGraphPaper(ctx, width, height, adjustedGridSize, startX, startY, panOffset, gridColor, gridOpacity);
        break;
      case 'lines':
      default:
        renderLines(ctx, width, height, adjustedGridSize, startX, startY);
        break;
    }
  }, [enabled, gridSize, gridColor, gridOpacity, gridType, zoom, panOffset, width, height, renderDots, renderLines, renderGraphPaper]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};

GridBackground.propTypes = {
  enabled: PropTypes.bool,
  gridSize: PropTypes.number,
  gridColor: PropTypes.string,
  gridOpacity: PropTypes.number,
  gridType: PropTypes.oneOf(['dots', 'lines', 'graph']),
  zoom: PropTypes.number,
  panOffset: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  width: PropTypes.number,
  height: PropTypes.number,
};

GridBackground.defaultProps = {
  enabled: false,
  gridSize: 40,
  gridColor: '#e0e0e0',
  gridOpacity: 0.5,
  gridType: 'lines',
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  width: 0,
  height: 0,
};

export default GridBackground;
