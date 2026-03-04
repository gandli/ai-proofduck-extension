import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, DEFAULT_SETTINGS, EngineStatus, ProgressInfo } from '../types';

// ============================================================
// Type Definitions
// ============================================================

interface LoadPersistedResult {
  text: string;
  mode?: string;
  fetchPage?: boolean;
  autoTrigger?: boolean;
}

interface StorageChanges {
  [key: string]: {
    newValue?: unknown;
    oldValue?: unknown;
  };
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generates a configuration key for tracking ready/failed states
 */
function getConfigKey(engine: string, localModel?: string): string {
  if (engine === 'chrome-ai') return 'chrome-ai:gemini-nano';
  return `${engine}:${localModel || 'default'}`;
}

/**
 * Validates and sanitizes settings from storage
 */
function sanitizeSettings(saved: Record<string, unknown>): Partial<Settings> {
  const sanitized: Partial<Settings> = {};
  
  if (typeof saved.engine === 'string') sanitized.engine = saved.engine as Settings['engine'];
  if (typeof saved.extensionLanguage === 'string') sanitized.extensionLanguage = saved.extensionLanguage;
  if (typeof saved.tone === 'string') sanitized.tone = saved.tone;
  if (typeof saved.detailLevel === 'string') sanitized.detailLevel = saved.detailLevel;
  if (typeof saved.localModel === 'string') sanitized.localModel = saved.localModel;
  if (typeof saved.apiBaseUrl === 'string') sanitized.apiBaseUrl = saved.apiBaseUrl;
  if (typeof saved.apiModel === 'string') sanitized.apiModel = saved.apiModel;
  if (typeof saved.autoSpeak === 'boolean') sanitized.autoSpeak = saved.autoSpeak;
  if (typeof saved.translateFallback === 'string') {
    sanitized.translateFallback = saved.translateFallback as Settings['translateFallback'];
  }
  if (Array.isArray(saved.readyConfigs)) sanitized.readyConfigs = saved.readyConfigs as string[];
  if (Array.isArray(saved.failedConfigs)) sanitized.failedConfigs = saved.failedConfigs as string[];
  
  // Migration: targetLanguage -> extensionLanguage
  if (saved.targetLanguage && !saved.extensionLanguage) {
    sanitized.extensionLanguage = saved.targetLanguage as string;
  }
  
  return sanitized;
}

// ============================================================
// Main Hook
// ============================================================

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [status, setStatus] = useState<EngineStatus>('idle');
  const [isInitializing, setIsInitializing] = useState(true);
  const [progress, setProgress] = useState<ProgressInfo>({ progress: 0, text: '' });
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const settingsRef = useRef(settings);
  const statusRef = useRef(status);

  // Keep refs in sync with state
  useEffect(() => { 
    settingsRef.current = settings; 
  }, [settings]);
  
  useEffect(() => {
    statusRef.current = status;
    browser.storage.local.set({ engineStatus: status });
    
    const s = settingsRef.current;

    // Track ready and failed configs for non-online engines
    if (s.engine !== 'online') {
      const configKey = getConfigKey(s.engine, s.localModel);
      
      if (status === 'ready') {
        const readyConfigs = s.readyConfigs || [];
        const failedConfigs = (s.failedConfigs || []).filter(k => k !== configKey);
        
        if (!readyConfigs.includes(configKey)) {
          updateSettingsInternal({ 
            readyConfigs: [...readyConfigs, configKey],
            failedConfigs 
          });
        } else if (s.failedConfigs?.includes(configKey)) {
          updateSettingsInternal({ failedConfigs });
        }
      } else if (status === 'error') {
        const failedConfigs = s.failedConfigs || [];
        const readyConfigs = (s.readyConfigs || []).filter(k => k !== configKey);
        
        if (!failedConfigs.includes(configKey)) {
          updateSettingsInternal({ 
            failedConfigs: [...failedConfigs, configKey],
            readyConfigs
          });
        } else if (s.readyConfigs?.includes(configKey)) {
          updateSettingsInternal({ readyConfigs });
        }
      }
    }
  }, [status, settings.engine, settings.localModel]);

  /**
   * Internal settings update without side effects
   */
  const updateSettingsInternal = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Sync with storage changes (from background/offscreen)
  useEffect(() => {
    const listener = (changes: StorageChanges, area: string) => {
      if (area !== 'local') return;
      
      if (changes.engineStatus) {
        const newValue = changes.engineStatus.newValue as EngineStatus;
        if (newValue && newValue !== statusRef.current) {
          setStatus(newValue);
        }
      }
      if (changes.lastProgress) {
        setProgress(changes.lastProgress.newValue as ProgressInfo || { progress: 0, text: '' });
      }
      if (changes.engineError) {
        setError(changes.engineError.newValue as string || '');
      }
    };
    
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  /**
   * Load persisted settings on mount
   */
  const loadPersistedSettings = useCallback(async (): Promise<LoadPersistedResult> => {
    try {
      const res = await browser.storage.local.get([
        'selectedText', 
        'settings', 
        'activeTab', 
        'engineStatus', 
        'menuIntentMode', 
        'fetchPageIntent', 
        'lastProgress', 
        'autoTriggerAt'
      ]) as Record<string, unknown>;
      
      let initialText = (res.selectedText as string) || '';

      if (res.activeTab === 'settings') {
        setShowSettings(true);
        browser.storage.local.remove('activeTab');
      }

      // Try to fetch page content if no selected text
      if (!initialText) {
        try {
          const tabs = await browser.tabs.query({ active: true, currentWindow: true });
          if (tabs.length > 0 && tabs[0].id) {
            const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_CONTENT' }) as { content?: string };
            if (response?.content) initialText = response.content;
          }
        } catch { 
          // Ignore errors from content script communication
        }
      }

      if (res.settings) {
        const saved = res.settings as Record<string, unknown>;
        const sanitized = sanitizeSettings(saved);
        const initial: Settings = { ...DEFAULT_SETTINGS, ...sanitized };
        
        // Load API key from session storage for security
        try {
          const sessionData = await browser.storage.session.get(['apiKey']);
          if (sessionData.apiKey) initial.apiKey = sessionData.apiKey as string;
        } catch { 
          // Session storage may not be available
        }
        
        setSettings(initial);

        // Restore status from storage, or default based on engine
        const savedStatus = res.engineStatus as EngineStatus;
        if (savedStatus) {
          setStatus(savedStatus);
        } else if (saved.engine === 'online' && initial.apiKey) {
          setStatus('ready');
        }

        if (res.lastProgress) {
          setProgress(res.lastProgress as ProgressInfo);
        }
      }

      const menuIntentMode = res.menuIntentMode;
      const fetchPageIntent = res.fetchPageIntent;
      const autoTriggerAt = res.autoTriggerAt as number | undefined;
      const autoTrigger = autoTriggerAt ? (Date.now() - autoTriggerAt < 5000) : false;

      // Clean up intent flags
      if (menuIntentMode || fetchPageIntent || autoTriggerAt) {
        browser.storage.local.remove(['menuIntentMode', 'fetchPageIntent', 'autoTriggerAt']);
      }

      return { 
        text: initialText, 
        mode: menuIntentMode as string | undefined, 
        fetchPage: !!fetchPageIntent,
        autoTrigger
      };
    } finally {
      setIsInitializing(false);
    }
  }, []);

  /**
   * Update settings with persistence and side effects
   */
  const updateSettings = useCallback(async (
    newSettings: Partial<Settings>,
    workerPostMessage?: (msg: unknown) => void,
  ): Promise<void> => {
    const prevSettings = settingsRef.current;
    const updated = { ...prevSettings, ...newSettings };
    setSettings(updated);

    const engineChanged = newSettings.engine && newSettings.engine !== prevSettings.engine;
    const modelChanged = newSettings.localModel && newSettings.localModel !== prevSettings.localModel;

    // Persist to storage
    if (typeof browser !== 'undefined' && browser.storage) {
      const { apiKey, ...rest } = updated;
      await browser.storage.local.set({ settings: { ...rest, apiKey: '' } });
      
      if (apiKey) {
        try {
          await browser.storage.session.set({ apiKey });
        } catch {
          // Fallback to local storage if session is unavailable
          await browser.storage.local.set({ settings: updated });
        }
      }
    }

    // Handle engine-specific status updates
    if (updated.engine === 'online' || updated.engine === 'chrome-ai') {
      setStatus('ready');
      setShowSettings(false);
      if (updated.engine === 'chrome-ai') {
        workerPostMessage?.({ type: 'load', settings: updated });
      }
    } else {
      const configKey = getConfigKey(updated.engine, updated.localModel);
      const isAlreadyReady = updated.readyConfigs?.includes(configKey);

      setShowSettings(false);

      if (engineChanged || modelChanged || statusRef.current === 'error' || statusRef.current === 'idle') {
        if (!isAlreadyReady) {
          setStatus('loading');
          setProgress({ progress: 0, text: 'Initializing...' });
        } else {
          setStatus('ready');
        }
        workerPostMessage?.({ type: 'load', settings: updated });
      } else if (isAlreadyReady && statusRef.current !== 'ready') {
        setStatus('ready');
        workerPostMessage?.({ type: 'load', settings: updated });
      } else if (!isAlreadyReady) {
        setStatus('loading');
        setProgress({ progress: 0, text: 'Warming up...' });
        workerPostMessage?.({ type: 'load', settings: updated });
      }
    }
  }, []);

  return {
    settings,
    setSettings,
    settingsRef,
    status,
    setStatus,
    statusRef,
    isInitializing,
    progress,
    setProgress,
    error,
    setError,
    showSettings,
    setShowSettings,
    loadPersistedSettings,
    updateSettings,
  };
}
