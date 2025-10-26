import { useState, useEffect } from 'react';
import { Download, RefreshCw, TrendingUp, TrendingDown, Activity, Zap, AlertCircle } from 'lucide-react';
import recognitionCache from '../../lib/recognitionCache';
import GlassCard from '../common/GlassCard';
import GlassButton from '../common/GlassButton';
import Toast from '../common/Toast';

const OCRPerformance = () => {
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);

  const refreshStats = () => {
    const newStats = recognitionCache.getStats();
    setStats(newStats);
  };

  useEffect(() => {
    refreshStats();
    // Refresh stats every 5 seconds
    const interval = setInterval(refreshStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleExportDiagnostics = () => {
    try {
      const diagnostics = recognitionCache.exportDiagnostics();
      const json = JSON.stringify(diagnostics, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `ocr-diagnostics-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setToast({ type: 'success', message: 'Diagnostics exported successfully' });
    } catch (error) {
      setToast({ type: 'error', message: `Export failed: ${error.message}` });
    }
  };

  const handleResetMetrics = () => {
    if (confirm('Reset all performance metrics? This cannot be undone.')) {
      recognitionCache.resetMetrics();
      refreshStats();
      setToast({ type: 'success', message: 'Metrics reset successfully' });
    }
  };

  const handleClearCache = () => {
    if (confirm('Clear all cached recognition results?')) {
      recognitionCache.clear();
      refreshStats();
      setToast({ type: 'success', message: 'Cache cleared successfully' });
    }
  };

  if (!stats) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center">
          <Activity className="w-5 h-5 animate-spin text-white/60" />
          <span className="ml-2 text-white/60">Loading performance data...</span>
        </div>
      </GlassCard>
    );
  }

  const formatTime = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercent = (value) => `${Math.round(value)}%`;

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-white/70" />
            <h2 className="text-lg font-semibold text-white">OCR Performance</h2>
          </div>
          <div className="flex gap-2">
            <GlassButton variant="secondary" onClick={refreshStats}>
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </GlassButton>
            <GlassButton variant="secondary" onClick={handleExportDiagnostics}>
              <Download className="w-4 h-4" />
              <span>Export</span>
            </GlassButton>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Cache Hit Rate */}
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-emerald-100/70">Cache Hit Rate</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-100">
              {formatPercent(stats.hitRate)}
            </div>
            <div className="mt-1 text-xs text-emerald-100/60">
              {stats.hits} hits, {stats.misses} misses
            </div>
          </div>

          {/* Average Time */}
          <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-100/70">Avg Recognition Time</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-100">
              {formatTime(stats.avgTime)}
            </div>
            <div className="mt-1 text-xs text-blue-100/60">
              {stats.totalRecognitions} total recognitions
            </div>
          </div>

          {/* Success Rate */}
          <div className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-purple-100/70">Success Rate</span>
              {stats.successRate >= 80 ? (
                <TrendingUp className="w-4 h-4 text-purple-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <div className="text-2xl font-bold text-purple-100">
              {formatPercent(stats.successRate)}
            </div>
            <div className="mt-1 text-xs text-purple-100/60">
              of {stats.totalRecognitions} attempts
            </div>
          </div>

          {/* Cache Size */}
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-100/70">Cache Size</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-100">
              {stats.size}/{stats.maxSize}
            </div>
            <div className="mt-1 text-xs text-amber-100/60">
              {formatPercent((stats.size / stats.maxSize) * 100)} full
            </div>
          </div>
        </div>

        {/* Recent Errors */}
        {stats.errors && stats.errors.length > 0 && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-semibold text-rose-100">Recent Errors</span>
            </div>
            <div className="space-y-2">
              {stats.errors.slice(-5).reverse().map((error, index) => (
                <div key={index} className="text-xs text-rose-100/70 font-mono">
                  <span className="text-rose-100/50">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                  {' - '}
                  {error.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/10">
          <GlassButton variant="secondary" onClick={handleClearCache}>
            <RefreshCw className="w-4 h-4" />
            <span>Clear Cache</span>
          </GlassButton>
          <GlassButton variant="secondary" onClick={handleResetMetrics}>
            <RefreshCw className="w-4 h-4" />
            <span>Reset Metrics</span>
          </GlassButton>
        </div>
      </GlassCard>

      {/* Performance Tips */}
      <GlassCard className="p-6">
        <h3 className="text-md font-semibold text-white mb-4">Performance Tips</h3>
        <div className="space-y-3 text-sm text-white/70">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
            <div>
              <strong className="text-white">High cache hit rate</strong> means fewer server calls.
              Keep drawing similar equations to benefit from caching.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
            <div>
              <strong className="text-white">Fast recognition</strong> (&lt;2s) indicates good server performance.
              Slow times may indicate network issues or server load.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" />
            <div>
              <strong className="text-white">High success rate</strong> means clear handwriting.
              Write larger and slower for better recognition.
            </div>
          </div>
        </div>
      </GlassCard>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default OCRPerformance;
