import { useEffect, useRef, useCallback } from 'react';
import {
  ModeKey,
  Settings,
  emptyModeResults,
  emptyGeneratingModes,
  MODES,
} from '../types';
import { getSystemPrompt, formatUserPrompt, LANG_MAP } from '../worker-utils';

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

function getChromeModelApi() {
  const ai = (globalThis as any).ai;
  return ai?.languageModel || (globalThis as any).LanguageModel || null;
}

async function runTranslateFallback(text: string, targetLanguage: string, provider: 'none' | 'google-free' | 'mymemory' = 'google-free') {
  const target = targetLanguage === '中文' ? 'zh-CN' :
    targetLanguage === 'English' ? 'en' :
    targetLanguage === '日本語' ? 'ja' :
    targetLanguage === '한국어' ? 'ko' :
    targetLanguage === 'Français' ? 'fr' :
    targetLanguage === 'Deutsch' ? 'de' :
    targetLanguage === 'Español' ? 'es' : 'en';

  if (provider === 'none') throw new Error('Translation fallback is disabled');

  if (provider === 'mymemory') {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${encodeURIComponent(target)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MyMemory fallback failed: ${res.status}`);
    const data = await res.json() as { responseData?: { translatedText?: string } };
    const out = data?.responseData?.translatedText;
    if (!out) throw new Error('MyMemory fallback returned empty result');
    return out;
  }

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google fallback failed: ${res.status}`);
  const data = await res.json() as unknown[][][];
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Google fallback parse failed');
  return data[0].map((chunk: unknown[]) => (chunk[0] as string) || '').join('');
}

async function checkChromeAiAvailability() {
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

export function useWorker(opts: UseWorkerOptions) {
  const {
    settingsRef, statusRef,
    setStatus, setProgress, setError,
    setModeResults, setGeneratingModes,
    setSelectedText, setShowSettings,
  } = opts;

  // Track the latest QUICK_TRANSLATE requestId
  const pendingQuickTranslateId = useRef<string | null>(null);

  const runChromeAiGenerate = useCallback(async (msg: { text: string; mode: ModeKey; settings: Settings; requestId?: string }) => {
    try {
      const modelApi = await checkChromeAiAvailability();
      const systemPrompt = getSystemPrompt(msg.mode, msg.settings);
      const targetLang = LANG_MAP[msg.settings.extensionLanguage || '中文'] || msg.settings.extensionLanguage || 'Chinese';
      const finalPrompt = formatUserPrompt(msg.text, msg.mode, targetLang);

      const session = await modelApi.create({ systemPrompt });
      const stream = await session.promptStreaming(finalPrompt);

      let fullText = '';
      let lastUpdateTime = 0;

      if (stream && typeof stream.getReader === 'function') {
        const reader = stream.getReader();
        while (true) {
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
        for await (const part of stream) {
          const chunk = typeof part === 'string' ? part : (part as any)?.content || String(part ?? '');
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
      setModeResults(prev => ({ ...prev, [msg.mode]: fullText }));
      setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
      setError('');
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      if (msg.mode === 'translate') {
        try {
          const fallback = await runTranslateFallback(
            msg.text,
            msg.settings.extensionLanguage || '中文',
            msg.settings.translateFallback || 'google-free',
          );
          setModeResults(prev => ({ ...prev, [msg.mode]: fallback }));
          setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
          setError('');
          return;
        } catch (fallbackErr) {
          const ferr = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          setError(`${msg.mode}: ${err} | fallback failed: ${ferr}`);
        }
      } else {
        setError(`${msg.mode}: ${err}`);
      }
      setGeneratingModes(prev => ({ ...prev, [msg.mode]: false }));
    }
  }, [setError, setGeneratingModes, setModeResults]);

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
    const backgroundMessageListener = (message: { type: string; data?: { type: string; progress?: { progress: number; text: string }; mode?: ModeKey; text?: string; error?: string; requestId?: string } }) => {
      if (message.type === 'WORKER_UPDATE') {
        const msg = message.data;
        if (!msg) return;

        if (msg.type === 'progress' && msg.progress) {
          setProgress(msg.progress);
        } else if (msg.type === 'ready') {
          setStatus('ready');
          setError('');
        } else if (msg.type === 'update') {
          setModeResults(prev => ({ ...prev, [msg.mode!]: msg.text }));
          setGeneratingModes(prev => ({ ...prev, [msg.mode!]: true }));
        } else if (msg.type === 'complete') {
          setModeResults(prev => ({ ...prev, [msg.mode!]: msg.text }));
          setGeneratingModes(prev => ({ ...prev, [msg.mode!]: false }));
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
            setGeneratingModes(prev => ({ ...prev, [msg.mode as ModeKey]: false }));
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
      // Sentinel: Use crypto.randomUUID() instead of Math.random() for secure ID generation
      const requestId = `qt-${Date.now()}-${crypto.randomUUID()}`;
      pendingQuickTranslateId.current = requestId;

      const timeoutId = setTimeout(() => {
        if (pendingQuickTranslateId.current === requestId) {
          pendingQuickTranslateId.current = null;
          sendResponse({ error: 'TIMEOUT' });
        }
      }, 15000);

      const handler = (msg: { type: string; data?: { type: string; requestId?: string; text?: string } }) => {
        if (msg.type === 'WORKER_UPDATE') {
          const d = msg.data;
          if ((d?.type === 'complete' || d?.type === 'error') && d?.requestId === requestId) {
            clearTimeout(timeoutId);
            if (pendingQuickTranslateId.current === requestId) {
              pendingQuickTranslateId.current = null;
            }
            if (d?.type === 'complete') {
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
  }, [setError, setGeneratingModes, setModeResults, setProgress, setSelectedText, setShowSettings, setStatus, settingsRef, statusRef]);

  const postMessage = useCallback((msg: any) => {
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

    if (msg.type === 'generate' && msg.settings?.engine === 'chrome-ai') {
      runChromeAiGenerate(msg);
      return;
    }

    if (
      msg.type === 'generate' &&
      msg.mode === 'translate' &&
      msg.settings?.engine === 'online' &&
      !msg.settings?.apiKey
    ) {
      setGeneratingModes(prev => ({ ...prev, [msg.mode]: true }));
      runTranslateFallback(
        msg.text,
        msg.settings.extensionLanguage || '中文',
        msg.settings.translateFallback || 'google-free',
      )
        .then((translated) => {
          setModeResults(prev => ({ ...prev, [msg.mode]: translated }));
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
