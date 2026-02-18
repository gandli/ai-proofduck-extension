import { useEffect, useRef, useCallback } from 'react';
import {
  ModeKey,
  Settings,
  WorkerOutboundMessage,
  emptyModeResults,
  emptyGeneratingModes,
} from '../types';

interface UseWorkerOptions {
  settingsRef: React.RefObject<Settings>;
  statusRef: React.RefObject<string>;
  setStatus: (s: 'idle' | 'loading' | 'ready' | 'error') => void;
  setProgress: (p: { progress: number; text: string }) => void;
  setError: (e: string) => void;
  setModeResults: React.Dispatch<React.SetStateAction<Record<ModeKey, string>>>;
  setGeneratingModes: React.Dispatch<React.SetStateAction<Record<ModeKey, boolean>>>;
  setSelectedText: (t: string) => void;
  setShowSettings: (s: boolean) => void;
}

export function useWorker(opts: UseWorkerOptions) {
  const {
    settingsRef, statusRef,
    setStatus, setProgress, setError,
    setModeResults, setGeneratingModes,
    setSelectedText, setShowSettings,
  } = opts;

  // Track the latest QUICK_TRANSLATE requestId
  const pendingQuickTranslateId = useRef<string | null>(null);

  useEffect(() => {
    // Listen for storage change to sync selection or settings tab
    const storageListener = (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
      if (areaName !== 'local') return;
      if (changes.selectedText) {
        setSelectedText((changes.selectedText.newValue as string) || '');
        setModeResults(emptyModeResults());
      }
      if (changes.activeTab?.newValue === 'settings') {
        setShowSettings(true);
        browser.storage.local.remove('activeTab');
      }
    };

    // Listen for updates from background/offscreen worker
    const backgroundMessageListener = (message: any) => {
      if (message.type === 'WORKER_UPDATE') {
        const msg = message.data;
        if (!msg) return;

        if (msg.type === 'progress' && msg.progress) {
          setProgress(msg.progress);
        } else if (msg.type === 'ready') {
          setStatus('ready');
          setError('');
        } else if (msg.type === 'update') {
          setModeResults(prev => ({ ...prev, [msg.mode]: msg.text }));
          setGeneratingModes(prev => ({ ...prev, [msg.mode]: true }));
        } else if (msg.type === 'complete') {
          setModeResults(prev => ({ ...prev, [msg.mode]: msg.text }));
          setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
          // Auto-speak
          const s = settingsRef.current;
          if (s.autoSpeak && typeof chrome !== 'undefined' && chrome.tts) {
            chrome.tts.speak(msg.text ?? '', {
              rate: 1.0,
              onEvent: (ev) => { if (ev.type === 'error') console.error('[App] TTS Error:', ev.errorMessage); },
            });
          }
        } else if (msg.type === 'error') {
          const errorContent = msg.error ?? 'Unknown error';
          if (!msg.mode) {
            setError(`Load Error: ${errorContent}`);
            setStatus('error');
            setGeneratingModes(emptyGeneratingModes());
          } else {
            setError(`${msg.mode}: ${errorContent}`);
            setGeneratingModes(prev => ({ ...prev, [msg.mode!]: false }));
          }
        }
      }
    };

    // Runtime listener for QUICK_TRANSLATE (from content script)
    const runtimeListener = (
      message: { type: string; text?: string },
      _sender: unknown,
      sendResponse: (res?: { translatedText?: string; error?: string }) => void,
    ) => {
      if (message.type !== 'QUICK_TRANSLATE') return;

      const text = message.text ?? '';
      const currentStatus = statusRef.current;

      if (currentStatus === 'loading') {
        sendResponse({ error: 'ENGINE_LOADING' });
        return;
      }

      // Quick translate still goes through background
      const requestId = `qt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      pendingQuickTranslateId.current = requestId;

      const timeoutId = setTimeout(() => {
        if (pendingQuickTranslateId.current === requestId) {
          pendingQuickTranslateId.current = null;
          sendResponse({ error: 'TIMEOUT' });
        }
      }, 15000);

      const handler = (msg: any) => {
        if (msg.type === 'WORKER_UPDATE') {
          const d = msg.data;
          if ((d.type === 'complete' || d.type === 'error') && d.requestId === requestId) {
            clearTimeout(timeoutId);
            if (pendingQuickTranslateId.current === requestId) {
              pendingQuickTranslateId.current = null;
            }
            if (d.type === 'complete') {
              sendResponse({ translatedText: d.text || 'Translation failed.' });
            } else {
              sendResponse({ translatedText: 'Translation failed.' });
            }
            browser.runtime.onMessage.removeListener(handler);
          }
        }
      };

      browser.runtime.onMessage.addListener(handler);
      browser.runtime.sendMessage({
        type: 'GENERATE',
        text,
        mode: 'translate',
        settings: settingsRef.current
      });
      return true;
    };

    browser.runtime.onMessage.addListener(backgroundMessageListener);
    browser.runtime.onMessage.addListener(runtimeListener);
    browser.storage.onChanged.addListener(storageListener);

    return () => {
      browser.runtime.onMessage.removeListener(backgroundMessageListener);
      browser.runtime.onMessage.removeListener(runtimeListener);
      browser.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const postMessage = useCallback((msg: any) => {
    // Send to background instead of local worker
    if (msg.type === 'load') {
      browser.runtime.sendMessage({ type: 'INIT_ENGINE', settings: msg.settings });
    } else if (msg.type === 'generate') {
      browser.runtime.sendMessage({ type: 'GENERATE', ...msg });
    } else if (msg.type === 'reset') {
      browser.runtime.sendMessage({ type: 'RESET_ENGINE' });
    }
  }, []);

  return { postMessage };
}
