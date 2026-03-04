import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ModeKey,
  Settings,
  emptyModeResults,
  emptyGeneratingModes,
  EngineStatus,
  ProgressInfo,
  TranslateFallbackProvider,
  WorkerOutboundMessage,
  QuickTranslateResponse,
  ChromeAIModelAPI,
  ChromeAISession,
} from '../types';
import { getSystemPrompt, formatUserPrompt, LANG_MAP } from '../worker-utils';

// ============================================================
// Type Definitions
// ============================================================

interface UseWorkerOptions {
  settingsRef: React.RefObject<Settings>;
  statusRef: React.RefObject<EngineStatus>;
  setStatus: (s: EngineStatus) => void;
  setProgress: (p: ProgressInfo) => void;
  setError: (e: string) => void;
  setModeResults: React.Dispatch<React.SetStateAction<Record<ModeKey, string>>>;
  setGeneratingModes: React.Dispatch<React.SetStateAction<Record<ModeKey, boolean>>>;
  setSelectedText: (t: string) => void;
  setShowSettings: (s: boolean) => void;
}

interface TranslationResult {
  text: string;
  source: 'primary' | 'fallback';
}

// ============================================================
// Chrome AI Helpers
// ============================================================

function getChromeModelApi(): ChromeAIModelAPI | null {
  const ai = (globalThis as { ai?: { languageModel?: ChromeAIModelAPI } }).ai;
  return ai?.languageModel || (globalThis as { LanguageModel?: ChromeAIModelAPI }).LanguageModel || null;
}

async function checkChromeAiAvailability(): Promise<ChromeAIModelAPI> {
  const modelApi = getChromeModelApi();
  if (!modelApi) {
    throw new Error(
      "Chrome Built-in AI API unavailable. Please enable Prompt API flags and update model component.",
    );
  }

  if (typeof modelApi.capabilities === 'function') {
    const caps = await modelApi.capabilities();
    if (!caps || caps.available === 'no') {
      throw new Error('Chrome Built-in AI model not available or not downloaded');
    }
  }

  return modelApi;
}

// ============================================================
// Translation Fallback Service
// ============================================================

class TranslationFallbackService {
  private static readonly GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
  private static readonly MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

  static getTargetLanguageCode(targetLanguage: string): string {
    const langMap: Record<string, string> = {
      '中文': 'zh-CN',
      'English': 'en',
      '日本語': 'ja',
      '한국어': 'ko',
      'Français': 'fr',
      'Deutsch': 'de',
      'Español': 'es',
    };
    return langMap[targetLanguage] || 'en';
  }

  static async translateWithMyMemory(text: string, targetLang: string): Promise<string> {
    const url = `${this.MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=auto|${encodeURIComponent(targetLang)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`MyMemory fallback failed: ${res.status}`);
      
      const data = await res.json() as { responseData?: { translatedText?: string } };
      const out = data?.responseData?.translatedText;
      if (!out) throw new Error('MyMemory fallback returned empty result');
      return out;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  static async translateWithGoogle(text: string, targetLang: string): Promise<string> {
    const url = `${this.GOOGLE_TRANSLATE_URL}?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`Google fallback failed: ${res.status}`);
      
      const data = await res.json() as unknown[];
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error('Google fallback parse failed');
      }
      return (data[0] as unknown[][]).map((chunk) => chunk?.[0] || '').join('');
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  static async translate(
    text: string,
    targetLanguage: string,
    provider: TranslateFallbackProvider = 'google-free'
  ): Promise<TranslationResult> {
    if (provider === 'none') throw new Error('Translation fallback is disabled');

    const target = this.getTargetLanguageCode(targetLanguage);

    if (provider === 'mymemory') {
      const result = await this.translateWithMyMemory(text, target);
      return { text: result, source: 'fallback' };
    }

    const result = await this.translateWithGoogle(text, target);
    return { text: result, source: 'fallback' };
  }
}

// ============================================================
// Main Hook
// ============================================================

export function useWorker(opts: UseWorkerOptions) {
  const {
    settingsRef, statusRef,
    setStatus, setProgress, setError,
    setModeResults, setGeneratingModes,
    setSelectedText, setShowSettings,
  } = opts;

  // Track the latest QUICK_TRANSLATE requestId
  const pendingQuickTranslateId = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const runChromeAiGenerate = useCallback(async (msg: { 
    text: string; 
    mode: ModeKey; 
    settings: Settings; 
    requestId?: string 
  }): Promise<void> => {
    // Create new abort controller for this operation
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    try {
      const modelApi = await checkChromeAiAvailability();
      if (abortSignal.aborted) return;

      const systemPrompt = getSystemPrompt(msg.mode, msg.settings);
      const targetLang = LANG_MAP[msg.settings.extensionLanguage || '中文'] || msg.settings.extensionLanguage || 'Chinese';
      const finalPrompt = formatUserPrompt(msg.text, msg.mode, targetLang);

      const session = await modelApi.create({ systemPrompt });
      if (abortSignal.aborted) {
        await session.destroy?.();
        return;
      }

      const stream = await session.promptStreaming(finalPrompt);

      let fullText = '';
      let lastUpdateTime = 0;

      if (stream && typeof (stream as ReadableStream<string>).getReader === 'function') {
        const reader = (stream as ReadableStream<string>).getReader();
        while (true) {
          if (abortSignal.aborted) {
            reader.cancel();
            await session.destroy?.();
            return;
          }
          
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = typeof value === 'string' ? value : String(value ?? '');
          if (fullText && chunk.startsWith(fullText)) fullText = chunk;
          else fullText += chunk;
          
          const now = Date.now();
          if (now - lastUpdateTime >= 50) {
            setModeResults(prev => ({ ...prev, [msg.mode]: fullText }));
            setGeneratingModes(prev => ({ ...prev, [msg.mode]: true }));
            lastUpdateTime = now;
          }
        }
      } else {
        for await (const part of stream as AsyncIterable<string>) {
          if (abortSignal.aborted) {
            await session.destroy?.();
            return;
          }
          
          const chunk = typeof part === 'string' ? part : (part as { content?: string })?.content || String(part ?? '');
          if (chunk) {
            fullText += chunk;
            const now = Date.now();
            if (now - lastUpdateTime >= 50) {
              setModeResults(prev => ({ ...prev, [msg.mode]: fullText }));
              setGeneratingModes(prev => ({ ...prev, [msg.mode]: true }));
              lastUpdateTime = now;
            }
          }
        }
      }

      if (typeof session.destroy === 'function') {
        await session.destroy();
      }
      
      if (!abortSignal.aborted) {
        setModeResults(prev => ({ ...prev, [msg.mode]: fullText }));
        setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
        setError('');
      }
    } catch (e: unknown) {
      if (abortSignal.aborted) return;
      
      const err = e instanceof Error ? e.message : String(e);
      if (msg.mode === 'translate') {
        try {
          const fallback = await TranslationFallbackService.translate(
            msg.text,
            msg.settings.extensionLanguage || '中文',
            msg.settings.translateFallback || 'google-free',
          );
          setModeResults(prev => ({ ...prev, [msg.mode]: fallback.text }));
          setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
          setError('');
          return;
        } catch (fallbackErr: unknown) {
          const ferr = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          setError(`${msg.mode}: ${err} | fallback failed: ${ferr}`);
        }
      } else {
        setError(`${msg.mode}: ${err}`);
      }
      setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
    }
  }, [setError, setGeneratingModes, setModeResults]);

  // Handle error messages from worker
  const handleErrorMessage = useCallback((msg: Extract<WorkerOutboundMessage, { type: 'error' }>): void => {
    const errorContent = msg.error ?? 'Unknown error';
    if (!msg.mode) {
      setError(`Load Error: ${errorContent}`);
      setStatus('error');
      setGeneratingModes(emptyGeneratingModes());
    } else {
      setError(`${msg.mode}: ${errorContent}`);
      setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
    }
  }, [setError, setGeneratingModes, setStatus]);

  // Memoized message handlers to prevent unnecessary re-renders
  const messageHandlers = useMemo(() => ({
    handleStorageChange: (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
      if (areaName !== 'local') return;
      if (changes.selectedText) {
        setSelectedText((changes.selectedText.newValue as string) || '');
        setModeResults(emptyModeResults());
      }
      if (changes.activeTab?.newValue === 'settings') {
        setShowSettings(true);
        browser.storage.local.remove('activeTab');
      }
    },

    handleBackgroundMessage: (message: { type: string; data?: WorkerOutboundMessage }) => {
      if (message.type !== 'WORKER_UPDATE' || !message.data) return;

      const msg = message.data;

      switch (msg.type) {
        case 'progress':
          if (msg.progress) setProgress(msg.progress);
          break;
        case 'ready':
          setStatus('ready');
          setError('');
          break;
        case 'update':
          setModeResults(prev => ({ ...prev, [msg.mode]: msg.text }));
          setGeneratingModes(prev => ({ ...prev, [msg.mode]: true }));
          break;
        case 'complete':
          setModeResults(prev => ({ ...prev, [msg.mode]: msg.text }));
          setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
          // Auto-speak
          const s = settingsRef.current;
          if (s.autoSpeak && typeof chrome !== 'undefined' && chrome.tts) {
            chrome.tts.speak(msg.text ?? '', {
              rate: 1.0,
              onEvent: (ev) => { 
                if (ev.type === 'error') console.error('[App] TTS Error:', ev.errorMessage); 
              },
            });
          }
          break;
        case 'error':
          handleErrorMessage(msg);
          break;
      }
    },

    handleQuickTranslate: (
      message: { type: string; text?: string },
      _sender: unknown,
      sendResponse: (res?: QuickTranslateResponse) => void,
    ): boolean => {
      if (message.type !== 'QUICK_TRANSLATE') return false;

      const text = message.text ?? '';
      const currentStatus = statusRef.current;

      if (currentStatus === 'loading') {
        sendResponse({ error: 'ENGINE_LOADING' });
        return true;
      }

      const requestId = `qt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      pendingQuickTranslateId.current = requestId;

      const timeoutId = setTimeout(() => {
        if (pendingQuickTranslateId.current === requestId) {
          pendingQuickTranslateId.current = null;
          sendResponse({ error: 'TIMEOUT' });
        }
      }, 15000);

      const handler = (msg: { type: string; data?: WorkerOutboundMessage & { requestId?: string } }) => {
        if (msg.type === 'WORKER_UPDATE') {
          const d = msg.data;
          if ((d?.type === 'complete' || d?.type === 'error') && d?.requestId === requestId) {
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
    }
  }), [handleErrorMessage, setError, setGeneratingModes, setModeResults, setProgress, setSelectedText, setShowSettings, setStatus, settingsRef, statusRef]);

  useEffect(() => {
    browser.runtime.onMessage.addListener(messageHandlers.handleBackgroundMessage);
    browser.runtime.onMessage.addListener(messageHandlers.handleQuickTranslate);
    browser.storage.onChanged.addListener(messageHandlers.handleStorageChange);

    return () => {
      browser.runtime.onMessage.removeListener(messageHandlers.handleBackgroundMessage);
      browser.runtime.onMessage.removeListener(messageHandlers.handleQuickTranslate);
      browser.storage.onChanged.removeListener(messageHandlers.handleStorageChange);
    };
  }, [messageHandlers]);

  const postMessage = useCallback((msg: { type: string; settings?: Settings; mode?: ModeKey; text?: string }): void => {
    // Chrome built-in AI runs in sidepanel context for better API availability.
    if (msg.type === 'load' && msg.settings?.engine === 'chrome-ai') {
      setStatus('loading');
      setProgress({ progress: 30, text: 'Checking Chrome Built-in AI...' });
      checkChromeAiAvailability()
        .then(() => {
          setStatus('ready');
          setProgress({ progress: 100, text: 'Chrome AI ready' });
          setError('');
        })
        .catch((e: unknown) => {
          const err = e instanceof Error ? e.message : String(e);
          setStatus('error');
          setError(`Load Error: ${err}`);
        });
      return;
    }

    if (msg.type === 'generate' && msg.settings?.engine === 'chrome-ai' && msg.mode) {
      runChromeAiGenerate({ 
        text: msg.text || '', 
        mode: msg.mode, 
        settings: msg.settings 
      });
      return;
    }

    if (
      msg.type === 'generate' &&
      msg.mode === 'translate' &&
      msg.settings?.engine === 'online' &&
      !msg.settings?.apiKey
    ) {
      setGeneratingModes(prev => ({ ...prev, [msg.mode]: true }));
      TranslationFallbackService.translate(
        msg.text || '',
        msg.settings.extensionLanguage || '中文',
        msg.settings.translateFallback || 'google-free',
      )
        .then((result) => {
          setModeResults(prev => ({ ...prev, [msg.mode]: result.text }));
          setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
          setError('');
        })
        .catch((e: unknown) => {
          const err = e instanceof Error ? e.message : String(e);
          setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
          setError(`translate: ${err}`);
        });
      return;
    }

    // Send to background/offscreen for other engines
    if (msg.type === 'load') {
      browser.runtime.sendMessage({ type: 'INIT_ENGINE', settings: msg.settings });
    } else if (msg.type === 'generate') {
      browser.runtime.sendMessage({ type: 'GENERATE', ...msg });
    } else if (msg.type === 'reset') {
      browser.runtime.sendMessage({ type: 'RESET_ENGINE' });
    }
  }, [runChromeAiGenerate, setError, setGeneratingModes, setModeResults, setProgress, setStatus]);

  return { postMessage };
}
