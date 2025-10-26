import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Wifi,
  AlertTriangle,
  History,
  Loader2,
  RefreshCw,
  Shield,
  Database,
  Cloud,
  Check,
  Server,
  Activity,
} from 'lucide-react';
import GlassCard from '../common/GlassCard';
import GlassButton from '../common/GlassButton';
import GlassInput from '../common/GlassInput';
import Toast from '../common/Toast';
import {
  getOCRConfig,
  updateOCRConfig,
  onOCRConfigChange,
  getOCRStatus,
  onOCRStatusChange,
  getCredentials,
  setCredentials,
  onCredentialChange,
  getOCRCache,
  clearOCRCache,
  getRecognitionHistory,
  onRecognitionHistoryChange,
  clearRecognitionHistory,
} from '../../config/ocr';
import { recognizeEquationHybrid } from '../../lib/handwritingOCR';

const MODE_OPTIONS = [
  {
    value: 'local',
    label: 'Local only',
    description: 'Fast, offline glyph analysis only.',
  },
  {
    value: 'cloud',
    label: 'Cloud only',
    description: 'Always call the selected cloud provider for maximum accuracy.',
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Start local, fallback to cloud provider under confidence threshold.',
  },
];

const statusStyles = {
  idle: {
    chip: 'bg-white/10 text-white/80 border-white/10',
    dot: 'bg-gray-300',
    label: 'Idle',
  },
  pending: {
    chip: 'bg-amber-500/20 text-amber-100 border-amber-400/30',
    dot: 'bg-amber-300 animate-pulse',
    label: 'Connecting…',
  },
  connected: {
    chip: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30',
    dot: 'bg-emerald-400',
    label: 'Cloud ready',
  },
  error: {
    chip: 'bg-rose-500/20 text-rose-100 border-rose-400/30',
    dot: 'bg-rose-400',
    label: 'Error',
  },
};

const formatConfidence = (value) => {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${Math.round(Number(value) * 100)}%`;
};

const formatTimestamp = (value) => {
  if (!value) {
    return '—';
  }
  try {
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
};

const emptyTestState = {
  loading: false,
  result: null,
  error: null,
  message: '',
};

const OCRSettings = () => {
  const [config, setConfig] = useState(() => getOCRConfig());
  const [status, setStatus] = useState(() => getOCRStatus());
  const [credentialsDraft, setCredentialsDraft] = useState(() => getCredentials());
  const [history, setHistory] = useState(() => getRecognitionHistory());
  const [confidenceDraft, setConfidenceDraft] = useState(() => config.minConfidence ?? 0.7);
  const [testState, setTestState] = useState(emptyTestState);
  const [toast, setToast] = useState(null);
  
  // Server health check state
  const [serverHealth, setServerHealth] = useState({
    status: 'unknown', // 'online', 'offline', 'checking', 'unknown'
    lastCheck: null,
    lastOnline: null,
  });
  const healthCheckIntervalRef = useRef(null);

  // Check server health
  const checkServerHealth = useCallback(async () => {
    if (!config.localServerUrl) {
      setServerHealth({ status: 'unknown', lastCheck: Date.now(), lastOnline: null });
      return;
    }

    setServerHealth((prev) => ({ ...prev, status: 'checking' }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${config.localServerUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setServerHealth({
          status: 'online',
          lastCheck: Date.now(),
          lastOnline: Date.now(),
        });
      } else {
        setServerHealth((prev) => ({
          status: 'offline',
          lastCheck: Date.now(),
          lastOnline: prev.lastOnline,
        }));
      }
    } catch {
      setServerHealth((prev) => ({
        status: 'offline',
        lastCheck: Date.now(),
        lastOnline: prev.lastOnline,
      }));
    }
  }, [config.localServerUrl]);

  useEffect(() => {
    const unsubConfig = onOCRConfigChange(setConfig);
    const unsubStatus = onOCRStatusChange(setStatus);
    const unsubCred = onCredentialChange((creds) => {
      setCredentialsDraft(creds);
    });
    const unsubHistory = onRecognitionHistoryChange(setHistory);

    return () => {
      unsubConfig();
      unsubStatus();
      unsubCred();
      unsubHistory();
    };
  }, []);

  // Server health check on mount and interval
  useEffect(() => {
    checkServerHealth(); // Initial check
    
    // Check every 30 seconds
    healthCheckIntervalRef.current = setInterval(checkServerHealth, 30000);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [checkServerHealth]);

  useEffect(() => {
    setConfidenceDraft(config.minConfidence ?? 0.7);
  }, [config.minConfidence]);

  const statusMeta = statusStyles[status.state] || statusStyles.idle;
  const cacheSize = getOCRCache().size;

  const handleModeChange = (value) => {
    updateOCRConfig({ mode: value });
    setToast({ type: 'success', message: `OCR mode set to ${value}.` });
  };

  const handleProviderChange = (value) => {
    updateOCRConfig({ provider: value });
    setToast({ type: 'success', message: `Cloud provider set to ${value}.` });
  };

  const handleConfidenceCommit = () => {
    const numeric = Number(confidenceDraft);
    if (!Number.isFinite(numeric)) {
      setConfidenceDraft(config.minConfidence ?? 0.7);
      return;
    }
    const clamped = Math.max(0, Math.min(1, numeric));
    updateOCRConfig({ minConfidence: clamped });
    setToast({ type: 'success', message: `Minimum confidence set to ${(clamped * 100).toFixed(0)}%.` });
  };

  const toggleCache = () => {
    updateOCRConfig({ cacheEnabled: !config.cacheEnabled });
    setToast({ type: 'success', message: `Cloud cache ${config.cacheEnabled ? 'disabled' : 'enabled'}.` });
  };

  const toggleHandwritingSynthesis = () => {
    updateOCRConfig({ handwritingSynthesis: !config.handwritingSynthesis });
    setToast({ type: 'success', message: `Handwriting synthesis ${config.handwritingSynthesis ? 'disabled' : 'enabled'}.` });
  };

  const handleCredentialsChange = (key, value) => {
    setCredentialsDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveCredentials = () => {
    setCredentials({
      applicationKey: credentialsDraft.applicationKey?.trim() || '',
      hmacKey: credentialsDraft.hmacKey?.trim() || '',
      openrouterApiKey: credentialsDraft.openrouterApiKey?.trim() || '',
    }, { persist: true });
    setToast({ type: 'success', message: 'Credentials saved locally (not committed to git).' });
  };

  const clearCredentials = () => {
    setCredentials({ applicationKey: '', hmacKey: '', openrouterApiKey: '' }, { persist: true });
    setCredentialsDraft({ applicationKey: '', hmacKey: '', openrouterApiKey: '' });
    setToast({ type: 'success', message: 'Local credentials cleared.' });
  };

  const clearCache = () => {
    clearOCRCache();
    setToast({ type: 'success', message: 'Recognition cache cleared.' });
  };

  const resetHistory = () => {
    clearRecognitionHistory();
    setToast({ type: 'success', message: 'Recognition history cleared.' });
  };

  const runCloudTest = async () => {
    if (testState.loading) {
      return;
    }
    const sample = history.find((entry) => Array.isArray(entry.strokes) && entry.strokes.length);
    if (!sample) {
      setTestState({ ...emptyTestState, error: 'Write an equation on the canvas first to capture stroke history.' });
      return;
    }
    setTestState({ ...emptyTestState, loading: true });
    try {
      const result = await recognizeEquationHybrid(sample.strokes, {
        mode: 'cloud',
        forceRefresh: true,
        includeHistory: true,
      });
      setTestState({
        loading: false,
        result,
        error: null,
        message: result?.method === 'cloud' ? 'Cloud recognition succeeded.' : 'Cloud call fell back to local result.',
      });
    } catch (error) {
      setTestState({ loading: false, result: null, error: error.message || 'Cloud test failed.', message: '' });
    }
  };

  return (
    <GlassCard className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-white">
            <Shield className="w-5 h-5 text-white/70" />
            <h2 className="text-lg font-semibold">OCR Settings</h2>
          </div>
          <p className="text-sm text-white/60">Manage handwriting recognition modes, credentials, and history.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${statusMeta.chip}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dot}`} />
          <span className="text-xs font-medium flex items-center gap-1">
            {status.state === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
            {status.state === 'error' && <AlertTriangle className="w-3 h-3" />}
            {status.state === 'connected' && <Wifi className="w-3 h-3" />}
            {statusMeta.label}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-white/70">Recognition mode</p>
        <div className="flex flex-wrap gap-3">
          {MODE_OPTIONS.map((option) => (
            <GlassButton
              key={option.value}
              variant={config.mode === option.value ? 'primary' : 'secondary'}
              onClick={() => handleModeChange(option.value)}
            >
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-white/70">{option.description}</span>
              </div>
            </GlassButton>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-white/70">Cloud provider</p>
        <div className="flex flex-wrap gap-3">
          {[
            { value: 'openrouter', label: 'OpenRouter (Vision LLM)', description: 'Vision LLM transcribes strokes to LaTeX.' },
            { value: 'local', label: 'Local TrOCR', description: 'Local Python service using TrOCR to transcribe math.' },
          ].map((option) => (
            <GlassButton
              key={option.value}
              variant={config.provider === option.value ? 'primary' : 'secondary'}
              onClick={() => handleProviderChange(option.value)}
            >
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-white/70">{option.description}</span>
              </div>
            </GlassButton>
          ))}
        </div>
      </div>

      {/* Local Server Health Indicator */}
      {config.provider === 'local' && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-white/70" />
              <span className="text-sm font-semibold text-white">Local Server Status</span>
            </div>
            <GlassButton variant="secondary" onClick={checkServerHealth} className="text-xs py-1 px-2">
              <RefreshCw className="w-3 h-3" />
              <span>Check</span>
            </GlassButton>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                serverHealth.status === 'online'
                  ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30'
                  : serverHealth.status === 'offline'
                  ? 'bg-rose-500/20 text-rose-100 border-rose-400/30'
                  : serverHealth.status === 'checking'
                  ? 'bg-amber-500/20 text-amber-100 border-amber-400/30'
                  : 'bg-white/10 text-white/60 border-white/10'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  serverHealth.status === 'online'
                    ? 'bg-emerald-400'
                    : serverHealth.status === 'offline'
                    ? 'bg-rose-400'
                    : serverHealth.status === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-white/40'
                }`}
              />
              <span className="text-xs font-medium flex items-center gap-1">
                {serverHealth.status === 'checking' && <Activity className="w-3 h-3 animate-spin" />}
                {serverHealth.status === 'online' && 'Server Online'}
                {serverHealth.status === 'offline' && 'Server Offline'}
                {serverHealth.status === 'unknown' && 'Unknown'}
              </span>
            </div>
            {serverHealth.lastOnline && (
              <span className="text-xs text-white/50">
                Last online: {new Date(serverHealth.lastOnline).toLocaleTimeString()}
              </span>
            )}
          </div>

          {serverHealth.status === 'offline' && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-400/20 p-3 text-xs text-amber-100/80">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Server not responding</p>
                  <p className="text-amber-100/60">
                    Make sure the local TrOCR server is running. Start it with:
                  </p>
                  <code className="block mt-2 p-2 rounded bg-black/20 font-mono text-xs">
                    cd server && python ocr_service.py
                  </code>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3">
            <GlassInput
              type="text"
              value={config.localServerUrl || ''}
              onChange={(event) => updateOCRConfig({ localServerUrl: event.target.value })}
              label="Server URL"
              placeholder="http://localhost:8000"
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm text-white/70">Hybrid confidence threshold</p>
          <GlassInput
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={confidenceDraft}
            onChange={(event) => setConfidenceDraft(event.target.value)}
            onBlur={handleConfidenceCommit}
            label="Minimum confidence (0-1)"
          />
          <p className="text-xs text-white/50">
            Local recognition confidence below this threshold will escalate to cloud OCR when hybrid mode is active.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-white/70">Caching</p>
          <GlassButton variant={config.cacheEnabled ? 'primary' : 'secondary'} onClick={toggleCache}>
            <Database className="w-4 h-4" />
            <span>{config.cacheEnabled ? 'Disable cache' : 'Enable cache'}</span>
          </GlassButton>
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Cached results</span>
            <span>{cacheSize}</span>
          </div>
          <GlassButton variant="secondary" onClick={clearCache}>
            <RefreshCw className="w-4 h-4" />
            <span>Clear cache</span>
          </GlassButton>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-white/70">Answer rendering</p>
          <GlassButton variant={config.handwritingSynthesis ? 'primary' : 'secondary'} onClick={toggleHandwritingSynthesis}>
            <Database className="w-4 h-4" />
            <span>{config.handwritingSynthesis ? 'Use handwriting synthesis' : 'Use font rendering'}</span>
          </GlassButton>
          <p className="text-xs text-white/50">
            ⚠️ Handwriting synthesis temporarily unavailable (original library uses deprecated TensorFlow 1.6). Currently always uses font rendering.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-white/70">Provider credentials</p>
        <div className="grid gap-3 md:grid-cols-2">
          <GlassInput
            type="password"
            label="OpenRouter API key"
            placeholder="VITE_OPENROUTER_API_KEY"
            value={credentialsDraft.openrouterApiKey || ''}
            onChange={(event) => handleCredentialsChange('openrouterApiKey', event.target.value)}
          />
          <GlassInput
            type="text"
            label="OpenRouter OCR model"
            placeholder="openai/gpt-4o-mini or meta-llama/llama-3.2-11b-vision"
            value={config.openrouterOCRModel || ''}
            onChange={(event) => updateOCRConfig({ openrouterOCRModel: event.target.value })}
          />
          <GlassInput
            type="text"
            label="Local OCR server URL"
            placeholder="http://127.0.0.1:8000"
            value={config.localServerUrl || ''}
            onChange={(event) => updateOCRConfig({ localServerUrl: event.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <GlassButton onClick={saveCredentials}>
            <Check className="w-4 h-4" />
            <span>Save to browser</span>
          </GlassButton>
          <GlassButton variant="secondary" onClick={clearCredentials}>
            <RefreshCw className="w-4 h-4" />
            <span>Clear local copy</span>
          </GlassButton>
        </div>
        <p className="text-xs text-white/50">
          Tip: Store keys in <code className="font-mono text-white/70">.env.local</code> for Vite. They are never committed to git.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-white/70">Cloud connectivity test</p>
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Use last captured strokes to validate the current cloud provider.</span>
            <GlassButton variant="primary" onClick={runCloudTest} disabled={testState.loading}>
              {testState.loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Testing…</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>Run cloud test</span>
                </>
              )}
            </GlassButton>
          </div>
          {testState.error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{testState.error}</span>
            </div>
          )}
          {testState.result && (
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>{testState.message}</span>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div>
                  <span className="text-white/60">Latex</span>
                  <div className="font-mono text-white">{testState.result.latex || '(empty)'}</div>
                </div>
                <div>
                  <span className="text-white/60">Confidence</span>
                  <div className="text-white">{formatConfidence(testState.result.confidence)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/70">
            <History className="h-4 w-4" />
            <span className="text-sm">Recognition history</span>
          </div>
          <GlassButton variant="secondary" onClick={resetHistory}>
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </GlassButton>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-white/50">No equations recognized yet.</p>
        ) : (
          <div className="grid gap-3">
            {history.slice(0, 8).map((entry, index) => (
              <div
                key={`history-${entry.id || 'item'}-${entry.timestamp || 'ts'}-${index}`}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
                  <span className="font-semibold text-white">{entry.equation || '(empty)'}</span>
                  <span>{formatTimestamp(entry.timestamp)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-white/60">
                  <span>Mode: {entry.mode}</span>
                  <span>Method: {entry.method}</span>
                  <span>Confidence: {formatConfidence(entry.confidence)}</span>
                  {entry.remoteConfidence != null && (
                    <span>Cloud: {formatConfidence(entry.remoteConfidence)}</span>
                  )}
                  {entry.durationMs != null && (
                    <span>Latency: {Math.round(entry.durationMs)} ms</span>
                  )}
                  {entry.error && (
                    <span className="text-rose-200">Error: {entry.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </GlassCard>
  );
};

export default OCRSettings;
