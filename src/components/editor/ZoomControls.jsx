import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, Minus, RotateCcw, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Floating zoom control widget for canvas
 * @param {number} zoom - Current zoom level (1 = 100%)
 * @param {Function} onZoomIn - Callback for zoom in
 * @param {Function} onZoomOut - Callback for zoom out
 * @param {Function} onResetZoom - Callback for reset zoom
 * @param {Function} onFitToWindow - Callback for fit to window
 */
const ZoomControls = ({ zoom, onZoomIn, onZoomOut, onResetZoom, onFitToWindow }) => {
  const [zoomPercentage, setZoomPercentage] = useState(100);

  useEffect(() => {
    setZoomPercentage(Math.round(zoom * 100));
  }, [zoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Zoom shortcuts (already handled in Canvas, but kept for consistency)
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        onResetZoom();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        onZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        onZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onZoomIn, onZoomOut, onResetZoom]);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/90 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.45)] backdrop-blur-lg">
        <button
          onClick={onZoomOut}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
            zoom <= 0.1
              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
              : 'bg-slate-800/80 text-slate-100 hover:bg-indigo-500/80 hover:shadow-lg hover:text-white'
          )}
          title="Zoom Out (Ctrl/Cmd -)"
          aria-label="Zoom out"
          disabled={zoom <= 0.1}
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="flex items-baseline gap-2 rounded-xl bg-slate-800/70 px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Zoom</span>
          <span className="text-sm font-semibold text-slate-100">{zoomPercentage}%</span>
        </div>

        <button
          onClick={onZoomIn}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
            zoom >= 5
              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
              : 'bg-slate-800/80 text-slate-100 hover:bg-indigo-500/80 hover:shadow-lg hover:text-white'
          )}
          title="Zoom In (Ctrl/Cmd +)"
          aria-label="Zoom in"
          disabled={zoom >= 5}
        >
          <Plus className="h-4 w-4" />
        </button>

        <div className="h-6 w-px bg-slate-700/70" />

        <button
          onClick={onResetZoom}
          className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-indigo-500/70 hover:bg-indigo-500/20 hover:text-white"
          title="Reset Zoom (Ctrl/Cmd 0)"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>

        <button
          onClick={onFitToWindow}
          className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-indigo-500/70 hover:bg-indigo-500/20 hover:text-white"
          title="Fit to Window"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Fit
        </button>
      </div>
    </div>
  );
};

ZoomControls.propTypes = {
  zoom: PropTypes.number.isRequired,
  onZoomIn: PropTypes.func.isRequired,
  onZoomOut: PropTypes.func.isRequired,
  onResetZoom: PropTypes.func.isRequired,
  onFitToWindow: PropTypes.func.isRequired,
};

export default ZoomControls;
