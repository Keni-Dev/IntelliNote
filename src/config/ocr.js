import CryptoJS from 'crypto-js';
import LRUCache from '../lib/lruCache';

const CONFIG_STORAGE_KEY = 'intellinote:ocr:config';
const CREDENTIAL_STORAGE_KEY = 'intellinote:ocr:credentials';
const HISTORY_STORAGE_KEY = 'intellinote:ocr:history';
const DEFAULT_CONFIG = {
  mode: 'cloud',
  provider: 'local', // 'local' (TrOCR service) | 'openrouter' (future integration)
  language: 'en-US',
  math: true,
  minConfidence: 0.5, // Lower threshold so simple equations don't escalate needlessly
  cacheEnabled: true,
  // OpenRouter OCR defaults (future integration - vision-capable model)
  // Best models for OCR: anthropic/claude-3.5-sonnet, openai/gpt-4o
  openrouterOCRModel: 'openrouter/andromeda-alpha',
  // Local OCR service URL (FastAPI server running TrOCR)
  localServerUrl: 'http://127.0.0.1:8000',
  // Handwriting synthesis (RNN-based stroke generation for answers)
  // Temporarily disabled: original library uses deprecated TensorFlow 1.6
  handwritingSynthesis: false,
};
const MAX_HISTORY = 25;

const listeners = {
  config: new Set(),
  status: new Set(),
  credentials: new Set(),
  history: new Set(),
};

let configState = { ...DEFAULT_CONFIG };
let statusState = {
  state: 'idle',
  message: '',
  code: null,
  quota: null,
};
let credentialsState = {
  // OpenRouter
  openrouterApiKey: typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_OPENROUTER_API_KEY ?? '') : '',
};
const recognitionCache = new LRUCache(100); // LRU cache with 100 item capacity (reduced to avoid quota issues)
const recognitionHistory = [];

const safeParse = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const persistConfig = () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configState));
  } catch (error) {
    console.warn('[OCRConfig] Unable to persist OCR configuration', error);
  }
};

const persistCredentials = () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (credentialsState.applicationKey || credentialsState.hmacKey) {
      window.localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(credentialsState));
    } else {
      window.localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('[OCRConfig] Unable to persist credentials', error);
  }
};

const persistHistory = () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const serializable = recognitionHistory.map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return entry;
      }
      const clone = { ...entry };
      if (Object.prototype.hasOwnProperty.call(clone, 'strokes')) {
        delete clone.strokes;
      }
      return clone;
    });
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn('[OCRConfig] Unable to persist OCR history', error);
  }
};

if (typeof window !== 'undefined') {
  const savedConfig = safeParse(window.localStorage.getItem(CONFIG_STORAGE_KEY));
  if (savedConfig) {
    configState = { ...configState, ...savedConfig };
  }
  const savedCredentials = safeParse(window.localStorage.getItem(CREDENTIAL_STORAGE_KEY));
  if (savedCredentials) {
    credentialsState = {
      applicationKey: savedCredentials.applicationKey ?? credentialsState.applicationKey,
      hmacKey: savedCredentials.hmacKey ?? credentialsState.hmacKey,
      openrouterApiKey: savedCredentials.openrouterApiKey ?? credentialsState.openrouterApiKey,
    };
  }
  const savedHistory = safeParse(window.localStorage.getItem(HISTORY_STORAGE_KEY));
  if (Array.isArray(savedHistory)) {
    recognitionHistory.splice(0, recognitionHistory.length, ...savedHistory.slice(0, MAX_HISTORY));
  }
}

const notify = (type, payload) => {
  const bucket = listeners[type];
  if (!bucket) {
    return;
  }
  bucket.forEach((callback) => {
    try {
      callback(payload);
    } catch (error) {
      console.error(`[OCRConfig] Listener for ${type} failed`, error);
    }
  });
};

const normalizeMode = (mode) => {
  if (typeof mode !== 'string') {
    return configState.mode;
  }
  const normalized = mode.toLowerCase();
  if (normalized === 'local' || normalized === 'cloud' || normalized === 'hybrid') {
    return normalized;
  }
  return configState.mode;
};

const normalizeProvider = (provider) => {
  if (typeof provider !== 'string') return configState.provider;
  const v = provider.toLowerCase();
  if (v === 'openrouter' || v === 'local') return v;
  // Legacy support: map 'pix2text' or 'myscript' to 'openrouter'
  if (v === 'pix2text' || v === 'myscript') return 'openrouter';
  return configState.provider;
};

export const getOCRConfig = () => ({ ...configState });

export const updateOCRConfig = (partial = {}) => {
  configState = {
    ...configState,
    ...partial,
    mode: partial.mode ? normalizeMode(partial.mode) : configState.mode,
    provider: partial.provider ? normalizeProvider(partial.provider) : configState.provider,
  };
  persistConfig();
  notify('config', getOCRConfig());
  return configState;
};

export const onOCRConfigChange = (callback) => {
  if (typeof callback !== 'function') {
    return () => {};
  }
  listeners.config.add(callback);
  callback(getOCRConfig());
  return () => listeners.config.delete(callback);
};

export const getOCRStatus = () => ({ ...statusState });

export const setOCRStatus = (partial = {}) => {
  statusState = {
    ...statusState,
    ...partial,
  };
  notify('status', getOCRStatus());
  return statusState;
};

export const onOCRStatusChange = (callback) => {
  if (typeof callback !== 'function') {
    return () => {};
  }
  listeners.status.add(callback);
  callback(getOCRStatus());
  return () => listeners.status.delete(callback);
};

export const getCredentials = () => ({ ...credentialsState });

export const setCredentials = (partial = {}, options = {}) => {
  credentialsState = {
    ...credentialsState,
    ...partial,
  };
  if (options.persist) {
    persistCredentials();
  }
  notify('credentials', getCredentials());
  return credentialsState;
};

export const onCredentialChange = (callback) => {
  if (typeof callback !== 'function') {
    return () => {};
  }
  listeners.credentials.add(callback);
  callback(getCredentials());
  return () => listeners.credentials.delete(callback);
};

export const getOCRCache = () => recognitionCache;

export const clearOCRCache = () => {
  recognitionCache.clear();
  return recognitionCache;
};

export const createStrokeSignature = (strokes = []) => {
  if (!Array.isArray(strokes) || !strokes.length) {
    return 'empty';
  }
  const sha = CryptoJS.algo.SHA1.create();
  strokes.forEach((stroke) => {
    const id = stroke?.id ?? 'stroke';
    sha.update(String(id));
    const points = stroke?.points || stroke?.strokePoints || [];
    points.forEach((point) => {
      if (!point) {
        return;
      }
      sha.update(String(point.x ?? point[0] ?? 0));
      sha.update(String(point.y ?? point[1] ?? 0));
      if (point.t != null) {
        sha.update(String(point.t));
      } else if (point.time != null) {
        sha.update(String(point.time));
      }
    });
  });
  return sha.finalize().toString(CryptoJS.enc.Hex);
};

export const getRecognitionHistory = () => recognitionHistory.map((entry) => ({ ...entry }));

export const pushRecognitionHistory = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return recognitionHistory;
  }
  const existingIds = new Set(recognitionHistory.map((item) => item.id));
  const baseId = entry.id || createStrokeSignature(entry.strokes || []) || `history-${Date.now()}`;
  let uniqueId = baseId;
  let suffix = 1;
  while (existingIds.has(uniqueId)) {
    uniqueId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  const payload = {
    ...entry,
    id: uniqueId,
    timestamp: entry.timestamp || Date.now(),
  };
  recognitionHistory.unshift(payload);
  if (recognitionHistory.length > MAX_HISTORY) {
    recognitionHistory.length = MAX_HISTORY;
  }
  persistHistory();
  notify('history', getRecognitionHistory());
  return recognitionHistory;
};

export const clearRecognitionHistory = () => {
  recognitionHistory.length = 0;
  persistHistory();
  notify('history', []);
  return recognitionHistory;
};

export const onRecognitionHistoryChange = (callback) => {
  if (typeof callback !== 'function') {
    return () => {};
  }
  listeners.history.add(callback);
  callback(getRecognitionHistory());
  return () => listeners.history.delete(callback);
};

export default {
  getOCRConfig,
  updateOCRConfig,
  onOCRConfigChange,
  getOCRStatus,
  setOCRStatus,
  onOCRStatusChange,
  getCredentials,
  setCredentials,
  onCredentialChange,
  getOCRCache,
  clearOCRCache,
  createStrokeSignature,
  getRecognitionHistory,
  pushRecognitionHistory,
  clearRecognitionHistory,
  onRecognitionHistoryChange,
};
