import { useState, useEffect, useCallback, useRef } from 'react';

import { translations } from './i18n';
import { ModeKey, emptyModeResults, emptyGeneratingModes, MODES } from './types';
import { useSettings } from './hooks/useSettings';
import { useWorker } from './hooks/useWorker';
import { ModeSelector } from './components/ModeSelector';
import { ResultPanel } from './components/ResultPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { FetchIcon, ClearIcon, CloseIcon, SearchIcon, ChevronDownIcon } from './components/Icons';
import modelConfig from './models.json';

interface WorkerMessage {
  type: 'progress' | 'ready' | 'update' | 'complete' | 'error';
  progress?: { progress: number; text: string };
  text?: string;
  error?: string;
  mode?: ModeKey;
}

function App() {
  const [selectedText, setSelectedText] = useState('');
  const [modeResults, setModeResults] = useState(emptyModeResults());
  const [mode, setMode] = useState<ModeKey>('summarize');
  const [generatingModes, setGeneratingModes] = useState(emptyGeneratingModes());
  const [copied, setCopied] = useState(false);

  const {
    settings, setSettings, settingsRef, status, setStatus, statusRef,
    isInitializing,
    progress, setProgress, error, setError,
    showSettings, setShowSettings, loadPersistedSettings, updateSettings,
  } = useSettings();

  const { postMessage } = useWorker({
    settingsRef, statusRef, setStatus, setProgress, setError,
    setModeResults, setGeneratingModes, setSelectedText, setShowSettings,
  });

  const handleFetchContent = async (onComplete?: (text: string) => void) => {
    setError('');
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const res = (await browser.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_CONTENT' })) as { content?: string };
        if (res?.content) {
          setSelectedText(res.content);
          setModeResults(emptyModeResults());
          if (onComplete) onComplete(res.content);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('Could not establish connection') ? t.connection_error : (msg || t.status_error));
    }
  };

  const handleClear = () => {
    setSelectedText('');
    setModeResults({ summarize: '', correct: '', proofread: '', translate: '', expand: '' });
  };

  const handleAction = useCallback((overrideText?: string, overrideMode?: ModeKey) => {
    const activeText = overrideText ?? selectedText;
    const activeMode = overrideMode ?? mode;
    
    if (!activeText || generatingModes[activeMode]) return;
    setError('');
    setGeneratingModes(prev => ({ ...prev, [activeMode]: true }));
    setModeResults(prev => ({ ...prev, [activeMode]: '' }));
    postMessage({ type: 'generate', text: activeText, mode: activeMode, settings: settingsRef.current });
  }, [selectedText, mode, generatingModes, postMessage, settingsRef]);

  useEffect(() => {
    loadPersistedSettings().then(res => {
      let currentText = res.text;
      if (res.text) setSelectedText(res.text);
      if (res.mode) setMode(res.mode);
      
      const triggerAction = (textToUse: string) => {
        if (res.autoTrigger) {
          // Wrap in a timeout to ensure state has settled
          setTimeout(() => {
            handleAction(textToUse, res.mode);
          }, 100);
        }
      };

      if (res.fetchPage) {
        handleFetchContent((fetchedText) => {
          triggerAction(fetchedText);
        });
      } else if (currentText) {
        triggerAction(currentText);
      }

      // If status restored to ready, re-warm the worker in background
      if (statusRef.current === 'ready' && (settingsRef.current.engine !== 'online')) {
        postMessage({ type: 'load', settings: settingsRef.current });
      }
    });
  }, []);

  const modeDef = MODES.find(m => m.key === mode)!;

  const handleCopyResult = useCallback(() => {
    const text = modeResults[mode];
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [modeResults, mode]);

  // Optimized: wrapped in useCallback to prevent ModeSelector re-renders on text input
  const handleOpenSettings = useCallback(() => setShowSettings(true), [setShowSettings]);

  const t = translations[settings.extensionLanguage] || translations['中文'];

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#fbfbfb] dark:bg-brand-dark-bg animate-pulse">
        <div className="text-slate-400 text-sm">Initializing AI Proofduck...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen box-border p-3 font-sans bg-[#fbfbfb] text-[#1a1a1a] dark:bg-brand-dark-bg dark:text-slate-200">
      <main className="flex-1 flex flex-col gap-3 pr-1 overflow-y-auto">
        {status === 'loading' && (
          <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-white/90 text-center p-10 dark:bg-[#1a1a2e]/95">
            <div className="w-full h-2 mb-3 overflow-hidden rounded-md bg-slate-200 dark:bg-slate-700">
              <div className="h-full bg-brand-orange transition-all duration-300 ease-out" style={{ width: `${progress.progress}%` }} />
            </div>
            <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">{progress.text}</div>
            <small className="mt-3 text-slate-400">{t.loading_tip}</small>
            <button
              onClick={() => postMessage({ type: 'reset' })}
              className="mt-6 px-4 py-2 border border-slate-200 bg-white text-slate-500 rounded-full text-[12px] cursor-pointer shadow-sm hover:bg-slate-50 hover:text-brand-orange transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
            >
              暂停并清除 (Cancel & Reset)
            </button>
          </div>
        )}

        <ModeSelector mode={mode} setMode={setMode} t={t} onOpenSettings={handleOpenSettings} />

        <section className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="m-0 text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t.original_text}</h3>
            <div className="flex gap-1.5">
              <button className="flex items-center justify-center p-1.5 text-slate-500 transition-all bg-white border border-slate-200 rounded-md cursor-pointer shadow-sm hover:bg-brand-orange-light hover:border-brand-orange hover:text-brand-orange hover:shadow-md hover:-translate-y-px dark:bg-brand-dark-surface dark:border-slate-700 dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:border-brand-orange dark:hover:text-[#ff7a3d]" onClick={() => { setSelectedText(''); setModeResults(emptyModeResults()); }} title={t.clear_btn || 'Clear'}><ClearIcon /></button>
              <button className="flex items-center justify-center p-1.5 transition-all border rounded-md cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-px bg-brand-orange-light border-brand-orange/20 text-brand-orange hover:bg-brand-orange-light hover:border-brand-orange hover:text-brand-orange dark:bg-brand-dark-surface dark:border-slate-700 dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:border-brand-orange dark:hover:text-[#ff7a3d]" onClick={() => handleFetchContent()} title={t.fetch_page_content || 'Fetch Page Content'}><FetchIcon /></button>
            </div>
          </div>
          <div className="relative flex flex-col flex-1 min-h-0">
            <textarea className="flex-1 w-full min-h-[80px] p-3.5 text-sm leading-relaxed bg-white border-[1.5px] border-slate-200 rounded-xl outline-none resize-y shadow-sm transition-all whitespace-pre-wrap break-words text-slate-700 hover:border-slate-300 focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 dark:bg-[#23233a] dark:border-[#3f3f5a] dark:text-slate-200 dark:focus:border-[#ff7a3d] dark:focus:ring-[#ff7a3d]/10 dark:bg-brand-dark-bg" value={selectedText} onChange={e => setSelectedText(e.target.value)} placeholder={t.placeholder} />
            {selectedText && <div className="absolute bottom-2 right-3 text-[11px] text-slate-400 pointer-events-none bg-white/80 px-1.5 py-0.5 rounded dark:bg-[#1a1a2e]/80 dark:text-slate-500">{selectedText.length} {t.char_count}</div>}
          </div>
        </section>

        <ResultPanel mode={mode} modeResults={modeResults} setModeResults={setModeResults} generatingModes={generatingModes} status={status} engine={settings.engine} t={t} />

        {error && (
          <div className="my-2">
            <p className="p-2 text-xs text-red-600 rounded-md bg-red-50 dark:bg-[#2d1515] dark:text-red-300">
              {t.status_error}: {error}
            </p>
            {settings.engine === 'chrome-ai' && t.chrome_ai_guidance_steps && (
              <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg dark:bg-blue-900/10 dark:border-blue-900/30">
                <h4 className="m-0 mb-2 text-[12px] font-bold text-blue-700 dark:text-blue-400">
                  {t.chrome_ai_guidance_title}
                </h4>
                <ol className="m-0 pl-1 flex flex-col gap-2">
                  {t.chrome_ai_guidance_steps.map((step: string, idx: number) => (
                    <li key={idx} className="text-[11px] leading-relaxed text-blue-600 dark:text-blue-300/80 whitespace-pre-wrap">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </main>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          updateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
          status={status}
          setStatus={setStatus}
          setProgress={setProgress}
          setError={setError}
          postMessage={postMessage}
          t={t}
        />
      )}

      <footer className="sticky bottom-0 left-0 right-0 p-3 bg-[#fbfbfb] border-t border-slate-100 dark:bg-brand-dark-bg dark:border-slate-800">
        {status === 'loading' ? (
          <button className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-orange border-none rounded-xl cursor-pointer shadow-md shadow-brand-orange/20 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-500" disabled>{progress.text || `${t.status_loading} ${Math.round(progress.progress)}%`}</button>
        ) : status === 'error' ? (
          <button className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#e53e3e] border-none rounded-xl cursor-pointer" onClick={() => setStatus('idle')}>{t.status_error} (Click to Reset)</button>
        ) : status === 'idle' && settings.engine === 'chrome-ai' ? (
          <button className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-orange border-none rounded-xl cursor-pointer shadow-md shadow-brand-orange/20 transition-all hover:bg-brand-orange-dark hover:shadow-lg active:scale-[0.98]" onClick={() => { setStatus('loading'); setError(''); postMessage({ type: 'load', settings }); }}>{t.action_btn_load} (Chrome AI)</button>
        ) : status === 'idle' && (settings.engine === 'local-gpu' || settings.engine === 'local-wasm') ? (
          <button className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-orange border-none rounded-xl cursor-pointer shadow-md shadow-brand-orange/20 transition-all hover:bg-brand-orange-dark hover:shadow-lg active:scale-[0.98]" onClick={() => { setStatus('loading'); setError(''); postMessage({ type: 'load', settings }); }}>{t.action_btn_load} ({settings.engine === 'local-gpu' ? 'WebGPU' : 'WASM'})</button>
        ) : (
          <button className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-orange border-none rounded-xl cursor-pointer shadow-md shadow-brand-orange/20 transition-all hover:bg-brand-orange-dark hover:shadow-lg active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-500" onClick={() => handleAction()} disabled={!selectedText || generatingModes[mode]}>
            {generatingModes[mode] ? t.action_generating : `${t.action_btn_execute}${t[modeDef.labelKey]}`}
          </button>
        )}
      </footer>
    </div>
  );
}

export default App;
