import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, DEFAULT_SETTINGS } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [isInitializing, setIsInitializing] = useState(true);
  const [progress, setProgress] = useState({ progress: 0, text: '' });
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(settings);
  const statusRef = useRef(status);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => {
    statusRef.current = status;
    browser.storage.local.set({ engineStatus: status });
    const s = settingsRef.current;

    // Track ready and failed configs
    if (s.engine !== 'online') {
      const configKey = s.engine === 'chrome-ai' ? 'chrome-ai:gemini-nano' : `${s.engine}:${s.localModel}`;
      
      if (status === 'ready') {
        const readyConfigs = s.readyConfigs || [];
        const failedConfigs = (s.failedConfigs || []).filter(k => k !== configKey);
        
        if (!readyConfigs.includes(configKey)) {
          updateSettings({ 
            readyConfigs: [...readyConfigs, configKey],
            failedConfigs 
          });
        } else if (s.failedConfigs?.includes(configKey)) {
          updateSettings({ failedConfigs });
        }
      } else if (status === 'error') {
        const failedConfigs = s.failedConfigs || [];
        const readyConfigs = (s.readyConfigs || []).filter(k => k !== configKey);
        
        if (!failedConfigs.includes(configKey)) {
          updateSettings({ 
            failedConfigs: [...failedConfigs, configKey],
            readyConfigs
          });
        } else if (s.readyConfigs?.includes(configKey)) {
          updateSettings({ readyConfigs });
        }
      }
    }
  }, [status, settings.engine, settings.localModel]);

  // Sync with storage changes (from background/offscreen)
  useEffect(() => {
    const listener = (changes: Record<string, any>, area: string) => {
      if (area !== 'local') return;
      if (changes.engineStatus) {
        setStatus(changes.engineStatus.newValue);
      }
      if (changes.lastProgress) {
        setProgress(changes.lastProgress.newValue || { progress: 0, text: '' });
      }
      if (changes.engineError) {
        setError(changes.engineError.newValue || '');
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  // Load persisted settings on mount; returns initial data if found
  const loadPersistedSettings = useCallback(async (): Promise<{ text: string; mode?: any; fetchPage?: boolean; autoTrigger?: boolean }> => {
    try {
      const res = await browser.storage.local.get(['selectedText', 'settings', 'activeTab', 'engineStatus', 'menuIntentMode', 'fetchPageIntent', 'lastProgress', 'autoTriggerAt']) as Record<string, unknown>;
      let initialText = (res.selectedText as string) || '';

      if (res.activeTab === 'settings') {
        setShowSettings(true);
        browser.storage.local.remove('activeTab');
      }

      if (!initialText) {
        try {
          const tabs = await browser.tabs.query({ active: true, currentWindow: true });
          if (tabs.length > 0 && tabs[0].id) {
            const response = (await browser.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_CONTENT' })) as { content?: string };
            if (response?.content) initialText = response.content;
          }
        } catch { /* ignore */ }
      }

      if (res.settings) {
        const saved = res.settings as Record<string, unknown>;
        const initial: Settings = { ...DEFAULT_SETTINGS, ...(saved as Partial<Settings>) };
        if (saved.targetLanguage && !saved.extensionLanguage) {
          initial.extensionLanguage = saved.targetLanguage as string;
        }
        try {
          const sessionData = await browser.storage.session.get(['apiKey']);
          if (sessionData.apiKey) initial.apiKey = sessionData.apiKey as string;
        } catch { /* ignore */ }
        setSettings(initial);

        // Restore status from storage, or default based on engine
        const savedStatus = res.engineStatus as 'idle' | 'loading' | 'ready' | 'error';
        if (savedStatus) {
          setStatus(savedStatus);
        } else if (saved.engine === 'online' && initial.apiKey) {
          setStatus('ready');
        }

        if (res.lastProgress) {
          setProgress(res.lastProgress as { progress: number; text: string });
        }
      }

      const menuIntentMode = res.menuIntentMode;
      const fetchPageIntent = res.fetchPageIntent;
      const autoTriggerAt = res.autoTriggerAt as number | undefined;
      const autoTrigger = autoTriggerAt ? (Date.now() - autoTriggerAt < 5000) : false;

      if (menuIntentMode || fetchPageIntent || autoTriggerAt) {
        browser.storage.local.remove(['menuIntentMode', 'fetchPageIntent', 'autoTriggerAt']);
      }

      return { 
        text: initialText, 
        mode: menuIntentMode as any, 
        fetchPage: !!fetchPageIntent,
        autoTrigger
      };
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const updateSettings = useCallback(async (
    newSettings: Partial<Settings>,
    workerPostMessage?: (msg: unknown) => void,
  ) => {
    const updated = { ...settingsRef.current, ...newSettings };
    setSettings(updated);

    const engineChanged = newSettings.engine && newSettings.engine !== settingsRef.current.engine;
    const modelChanged = newSettings.localModel && newSettings.localModel !== settingsRef.current.localModel;

    if (typeof browser !== 'undefined' && browser.storage) {
      const { apiKey, ...rest } = updated;
      await browser.storage.local.set({ settings: { ...rest, apiKey: '' } });
      if (apiKey) {
        await browser.storage.session.set({ apiKey }).catch(() => {
          browser.storage.local.set({ settings: updated });
        });
      }
    }

    if (updated.engine === 'online') {
      setStatus('ready');
    } else {
      const configKey = updated.engine === 'chrome-ai' 
        ? 'chrome-ai:gemini-nano' 
        : `${updated.engine}:${updated.localModel}`;

      // Always close settings and show loading during local engine/model switches or retries
      if (engineChanged || modelChanged || statusRef.current === 'error' || statusRef.current === 'idle') {
        setShowSettings(false);
        setStatus('loading');
        setProgress({ progress: 0, text: 'Initializing...' });
        workerPostMessage?.({ type: 'load', settings: updated });
      } else if (updated.readyConfigs?.includes(configKey)) {
        // Even if ready, show loading during the "warm-up" phase which takes a few seconds
        setShowSettings(false);
        setStatus('loading');
        setProgress({ progress: 0, text: 'Warming up...' });
        workerPostMessage?.({ type: 'load', settings: updated });
      }
    }
  }, []);

  return {
    settings, setSettings, settingsRef,
    status, setStatus, statusRef,
    isInitializing,
    progress, setProgress,
    error, setError,
    showSettings, setShowSettings,
    loadPersistedSettings, updateSettings,
  };
}
