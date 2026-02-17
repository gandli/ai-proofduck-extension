import { useState, useEffect, useRef, useCallback } from 'react';

import { translations } from './i18n';
import {
  SettingsIcon,
  FetchIcon,
  CloseIcon,
  ExportIcon,
  ImportIcon,
  ClearIcon,
  SearchIcon,
  ChevronDownIcon,
} from './components/Icons';
import modelConfig from './models.json';

type ModeKey = 'summarize' | 'correct' | 'proofread' | 'translate' | 'expand';

interface Settings {
  engine: string;
  extensionLanguage: string;
  tone: string;
  detailLevel: string;
  localModel: string;
  apiBaseUrl: string;
  apiKey: string;
  apiModel: string;
  autoSpeak: boolean;
}

interface WorkerMessage {
  type: 'progress' | 'ready' | 'update' | 'complete' | 'error';
  progress?: { progress: number; text: string };
  text?: string;
  error?: string;
  mode?: ModeKey;
}

function App() {
  const [selectedText, setSelectedText] = useState('');
  const [modeResults, setModeResults] = useState<Record<ModeKey, string>>({
    summarize: '',
    correct: '',
    proofread: '',
    translate: '',
    expand: '',
  });
  const [mode, setMode] = useState<ModeKey>('summarize');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [generatingModes, setGeneratingModes] = useState<Record<ModeKey, boolean>>({
    summarize: false,
    correct: false,
    proofread: false,
    translate: false,
    expand: false,
  });
  const [progress, setProgress] = useState({ progress: 0, text: '' });
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<Settings>({
    engine: 'local-gpu', // local-gpu, local-wasm, online
    extensionLanguage: '中文', // Global target language
    tone: 'professional', // professional, casual, academic, concise
    detailLevel: 'standard', // standard, detailed, creative
    localModel: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    apiBaseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    apiModel: 'gpt-3.5-turbo',
    autoSpeak: false,
  });
  const worker = useRef<Worker | null>(null);
  const settingsRef = useRef(settings);
  const statusRef = useRef(status);
  const [modelSearch, setModelSearch] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modelHistory, setModelHistory] = useState<string[]>([]);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    browser.storage.local.get(['modelHistory']).then((res: { modelHistory?: string[] }) => {
      if (res.modelHistory) setModelHistory(res.modelHistory);
    });
  }, []);

  // Update history when model changes
  const addToHistory = (modelId: string) => {
    const newHistory = [modelId, ...modelHistory.filter(id => id !== modelId)].slice(0, 5);
    setModelHistory(newHistory);
    browser.storage.local.set({ modelHistory: newHistory });
  };

  // Outside click listener for model dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [modelHistory]);

  // Filter Categories and Models
  const categoriesWithModels = modelConfig.categories.map(cat => ({
    ...cat,
    filteredModels: cat.models.filter(m => 
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.value.toLowerCase().includes(modelSearch.toLowerCase())
    )
  })).filter(cat => cat.filteredModels.length > 0);

  const historyModels = modelHistory.map(id => {
    let found;
    modelConfig.categories.forEach(c => {
      const m = c.models.find(mod => mod.value === id);
      if (m) found = m;
    });
    return found;
  }).filter((m): m is any => !!m);

  const activeCat = selectedCategory || (categoriesWithModels[0]?.label);
  const currentCategoryObj = categoriesWithModels.find(c => c.label === activeCat) || categoriesWithModels[0];

  useEffect(() => {
    if (isModelDropdownOpen && !selectedCategory && categoriesWithModels.length > 0) {
      setSelectedCategory(categoriesWithModels[0].label);
    }
  }, [isModelDropdownOpen]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    statusRef.current = status;
    // Sync status to local storage so content script can know proactively
    browser.storage.local.set({ engineStatus: status });
  }, [status]);

  useEffect(() => {
    // Initial load of selected text, settings, and intent
    browser.storage.local
      .get(['selectedText', 'settings', 'activeTab', 'menuIntentMode', 'autoTriggerAt', 'isLocalModelEnabled', 'engineStatus', 'lastProgress'])
      .then(async (res: { [key: string]: any }) => {
        let txt = (res.selectedText as string) || '';
        
        // Recover state from background sync in storage
        if (res.engineStatus) setStatus(res.engineStatus);
        if (res.lastProgress) setProgress(res.lastProgress);

        // Restore local model enablement status if previously active
        if (res.isLocalModelEnabled === true && res.engineStatus !== 'ready' && res.engineStatus !== 'loading') {
          if (settingsRef.current.engine === 'local-gpu' || settingsRef.current.engine === 'local-wasm') {
            loadModel(); 
          }
        }

        if (res.activeTab === 'settings') {
          setShowSettings(true);
          browser.storage.local.remove('activeTab');
        }

        if (res.menuIntentMode && res.autoTriggerAt) {
          setMode(res.menuIntentMode as ModeKey);
        }

        if (!txt) {
          if (typeof browser !== 'undefined' && browser.tabs) {
            try {
              const tabs = await browser.tabs.query({ active: true, currentWindow: true });
              if (tabs.length > 0 && tabs[0].id) {
                const response = (await browser.tabs.sendMessage(tabs[0].id, {
                  type: 'GET_PAGE_CONTENT',
                })) as { content?: string };
                if (txt = response?.content || '') setSelectedText(txt);
              }
            } catch (e) { console.warn('[App] Page content fetch failed:', e); }
          }
        } else {
          setSelectedText(txt);
        }

        if (res.settings) {
          const savedSettings = res.settings as Record<string, unknown>;
          setSettings({ ...settings, ...(savedSettings as Partial<Settings>) });
          if (savedSettings.engine === 'online' && savedSettings.apiKey) setStatus('ready');
        }
      });

    const listener = (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
      if (areaName === 'local') {
        if (changes.selectedText) {
          setSelectedText((changes.selectedText.newValue as string) || '');
          setModeResults({ summarize: '', correct: '', proofread: '', translate: '', expand: '' });
        }
        if (changes.menuIntentMode && changes.menuIntentMode.newValue) {
          setMode(changes.menuIntentMode.newValue as ModeKey);
        }
      }
    };

    const runtimeListener = (message: any) => {
      // Listen for updates from the BACKGROUND worker
      if (message.type === 'WORKER_UPDATE') {
        const { type, progress, text, mode: resultMode, error: workerError } = message.data;
        if (type === 'progress' && progress) {
          setProgress(progress);
        } else if (type === 'ready') {
          setStatus('ready');
          setError('');
        } else if (type === 'update' || type === 'complete') {
          const targetMode = resultMode as ModeKey;
          setModeResults((prev) => ({ ...prev, [targetMode]: text ?? '' }));
          setGeneratingModes((prev) => ({ ...prev, [targetMode]: type === 'update' }));
          
          if (type === 'complete') {
            // Auto-speak result if enabled
            if (settingsRef.current.autoSpeak && typeof chrome !== 'undefined' && chrome.tts) {
              chrome.tts.speak(text ?? '', { rate: 1.0 });
            }
          }
        } else if (type === 'error') {
          if (!resultMode) {
            setError(`Load Error: ${workerError}`);
            setStatus('error');
            setGeneratingModes({ summarize: false, correct: false, proofread: false, translate: false, expand: false });
          } else {
            setError(`${resultMode}: ${workerError}`);
            setGeneratingModes((prev) => ({ ...prev, [resultMode]: false }));
          }
        }
      }
    };

    browser.runtime.onMessage.addListener(runtimeListener);
    browser.storage.onChanged.addListener(listener);

    return () => {
      browser.runtime.onMessage.removeListener(runtimeListener);
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  // Auto-trigger intent
  useEffect(() => {
    if (status === 'ready' && selectedText) {
      browser.storage.local.get(['menuIntentMode']).then((res: { [key: string]: any }) => {
        if (res.menuIntentMode) {
          handleGenerate(res.menuIntentMode as ModeKey);
          browser.storage.local.remove(['menuIntentMode', 'autoTriggerAt']);
        }
      });
    }
  }, [status, selectedText]);

  const loadModel = () => {
    setStatus('loading');
    setError('');
    browser.storage.local.set({ isLocalModelEnabled: true });
    browser.runtime.sendMessage({ type: 'INIT_ENGINE', settings });
  };

  const handleReset = () => {
    browser.runtime.sendMessage({ type: 'RESET_ENGINE' }).then(() => {
      setStatus('idle');
      setProgress({ progress: 0, text: '' });
      setError('');
    });
  };

  const handleFetchContent = async () => {
    setError('');
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id) {
        const response = (await browser.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_CONTENT' })) as { content?: string };
        if (response?.content) {
          setSelectedText(response.content);
          setModeResults({ summarize: '', correct: '', proofread: '', translate: '', expand: '' });
        }
      }
    } catch (e: any) {
      setError(e.message?.includes('connection') ? t.connection_error : t.status_error);
    }
  };

  const handleClear = () => {
    setSelectedText('');
    setModeResults({ summarize: '', correct: '', proofread: '', translate: '', expand: '' });
  };

  const handleGenerate = (targetMode?: ModeKey) => {
    const activeMode = targetMode || mode;
    if (activeMode !== mode) setMode(activeMode); // Keep UI in sync with generation mode
    if (!selectedText || generatingModes[activeMode]) return;
    setError('');
    setGeneratingModes((prev) => ({ ...prev, [activeMode]: true }));
    setModeResults((prev) => ({ ...prev, [activeMode]: '' }));

    if (settings.engine === 'online') {
      // For online engine, we still use background but it's simpler
      browser.runtime.sendMessage({ type: 'GENERATE', text: selectedText, mode: activeMode, settings });
    } else {
      browser.runtime.sendMessage({ type: 'GENERATE', text: selectedText, mode: activeMode, settings });
    }
  };

  const handleAction = () => {
    handleGenerate();
  };

  const handleCopyResult = useCallback(() => {
    const text = modeResults[mode];
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [modeResults, mode]);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    const engineChanged = newSettings.engine && newSettings.engine !== settings.engine;
    const modelChanged = newSettings.localModel && newSettings.localModel !== settings.localModel;

    // Persist settings
    if (typeof browser !== 'undefined' && browser.storage) {
      const { apiKey, ...settingsWithoutKey } = updated;
      await browser.storage.local.set({ settings: { ...settingsWithoutKey, apiKey: '' } });
      if (apiKey) {
        await browser.storage.session.set({ apiKey }).catch(() => {
          browser.storage.local.set({ settings: updated });
        });
      }
    }

    // Handle engine/model side effects
    if (updated.engine === 'online') {
      setStatus('ready');
    } else if (engineChanged || modelChanged || status === 'idle' || status === 'error') {
      setStatus('loading');
      worker.current?.postMessage({ type: 'load', settings: updated });
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('[App] Starting bulk model file import...');
    setStatus('loading');
    setProgress({ progress: 0, text: t.importing });

    try {
      const cache = await caches.open('webllm/model');
      const total = files.length;
      let count = 0;

      const modelId = settings.localModel;
      const baseUrl = `https://huggingface.co/mlc-ai/${modelId}/resolve/main/`;
      console.log(`[App] Importing files for model: ${modelId}`);
      console.log(`[App] Base URL mapping: ${baseUrl}`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = file.webkitRelativePath.split('/').slice(1).join('/');
        if (!relativePath) continue;

        const url = new URL(relativePath, baseUrl).toString();
        const response = new Response(file);
        console.log(`[App] Caching: ${relativePath} -> ${url}`);
        await cache.put(url, response);

        count++;
        setProgress({
          progress: (count / total) * 100,
          text: `${t.importing} (${count}/${total})`,
        });
      }

      console.log(`[App] Successfully imported ${count} files.`);
      alert(t.import_success);
      setStatus('idle');
    } catch (err: unknown) {
      console.error('[App] Import failed:', err);
      setError(`${t.import_failed}: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error');
    }
  };

  const handleExportModel = async () => {
    console.log('[App] Starting model export...');
    setStatus('loading');
    setProgress({ progress: 0, text: t.exporting });
    try {
      const cache = await caches.open('webllm/model');
      const keys = await cache.keys();
      const modelId = settings.localModel;

      console.log(`[App] Searching for cached files for model: ${modelId}`);
      // Filter keys related to current model
      const filteredKeys = keys.filter((req) => req.url.includes(modelId));
      if (filteredKeys.length === 0) {
        console.warn(`[App] No cached files found for ${modelId}`);
        alert('No cached files found for this model.');
        setStatus('ready');
        return;
      }

      console.log(`[App] Found ${filteredKeys.length} files to export.`);
      const filesData: { url: string; blob: Blob }[] = [];
      for (let i = 0; i < filteredKeys.length; i++) {
        const req = filteredKeys[i];
        const resp = await cache.match(req);
        if (resp) {
          filesData.push({ url: req.url, blob: await resp.blob() });
        }
        setProgress({
          progress: ((i + 1) / filteredKeys.length) * 50,
          text: `${t.exporting} (${i + 1}/${filteredKeys.length})`,
        });
      }

      // Pack into binary format
      console.log('[App] Packing files into MLCP package...');
      // [Magic 4][FileCount 4]
      // For each: [URL_Len 4][URL][Size 8][Data]
      let totalSize = 8;
      for (const f of filesData) {
        totalSize += 4 + f.url.length + 8 + f.blob.size;
      }

      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);
      const encoder = new TextEncoder();

      view.setUint32(0, 0x4d4c4350); // "MLCP"
      view.setUint32(4, filesData.length);

      let offset = 8;
      for (let i = 0; i < filesData.length; i++) {
        const f = filesData[i];
        const urlBytes = encoder.encode(f.url);
        view.setUint32(offset, urlBytes.length);
        new Uint8Array(buffer, offset + 4, urlBytes.length).set(urlBytes);
        offset += 4 + urlBytes.length;

        view.setBigUint64(offset, BigInt(f.blob.size));
        const blobData = new Uint8Array(await f.blob.arrayBuffer());
        new Uint8Array(buffer, offset + 8, f.blob.size).set(blobData);
        offset += 8 + f.blob.size;

        setProgress({
          progress: 50 + ((i + 1) / filesData.length) * 50,
          text: `${t.exporting} (Packing ${i + 1}/${filesData.length})`,
        });
      }

      console.log('[App] Packing complete. Triggering download.');
      const finalBlob = new Blob([buffer], { type: 'application/octet-stream' });
      const downloadUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${modelId}.mlcp`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      console.log('[App] Export successful.');
      setStatus('ready');
      alert(t.export_success);
    } catch (err: unknown) {
      console.error('[App] Export failed:', err);
      alert(t.export_failed);
      setStatus('ready');
    }
  };

  const handleImportPackage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`[App] Starting package import for: ${file.name}`);
    setStatus('loading');
    setProgress({ progress: 0, text: t.importing });

    try {
      const buffer = await file.arrayBuffer();
      const view = new DataView(buffer);
      const decoder = new TextDecoder();

      if (view.getUint32(0) !== 0x4d4c4350) {
        console.error('[App] Invalid MLCP file format magic:', view.getUint32(0).toString(16));
        throw new Error('Invalid MLCP file format');
      }

      const fileCount = view.getUint32(4);
      console.log(`[App] Package contains ${fileCount} files.`);
      const cache = await caches.open('webllm/model');

      let offset = 8;
      for (let i = 0; i < fileCount; i++) {
        const urlLen = view.getUint32(offset);
        const url = decoder.decode(new Uint8Array(buffer, offset + 4, urlLen));
        offset += 4 + urlLen;

        const size = Number(view.getBigUint64(offset));
        const data = new Uint8Array(buffer, offset + 8, size);
        offset += 8 + size;

        console.log(`[App] Restoring into cache: ${url} (${size} bytes)`);
        await cache.put(url, new Response(data));

        setProgress({
          progress: ((i + 1) / fileCount) * 100,
          text: `${t.importing} (${i + 1}/${fileCount})`,
        });
      }

      console.log('[App] Package import successful.');
      alert(t.import_success);
      setStatus('idle');
    } catch (err: unknown) {
      console.error('[App] Package import failed:', err);
      alert(`${t.import_failed}: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error');
    }
  };

  const t = translations[settings.extensionLanguage] || translations['中文'];

  return (
    <div className="flex flex-col h-screen box-border p-3 font-sans bg-[#fbfbfb] text-[#1a1a1a] dark:bg-brand-dark-bg dark:text-slate-200">
      <main className="flex-1 flex flex-col gap-3 pr-1 overflow-y-auto">
        {status === 'loading' && (
          <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-white/90 text-center p-10 dark:bg-[#1a1a2e]/95">
            <div className="w-full h-2 mb-3 overflow-hidden rounded-md bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-brand-orange transition-all duration-300 ease-out"
                style={{ width: `${progress.progress}%` }}
              ></div>
            </div>
            <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
              {progress.text}
            </div>
            <small className="mt-3 text-slate-400">{t.loading_tip}</small>
            <button
              onClick={handleReset}
              className="mt-6 px-4 py-2 border border-slate-200 bg-white text-slate-500 rounded-full text-[12px] cursor-pointer shadow-sm hover:bg-slate-50 hover:text-brand-orange transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
            >
              暂停并清除 (Cancel & Reset)
            </button>
          </div>
        )}
        <div className="flex items-stretch gap-1.5 mb-0.5">
          <section className="flex flex-1 gap-1 p-1 mb-0 rounded-lg bg-brand-orange-light dark:bg-brand-dark-surface">
            <button
              className={`flex-1 py-2 px-0.5 border-none bg-transparent rounded-md text-[11px] font-semibold text-slate-600 cursor-pointer transition-all hover:bg-brand-orange/10 hover:text-brand-orange dark:text-slate-400 dark:hover:bg-brand-orange/15 dark:hover:text-[#ff7a3d] ${mode === 'summarize' ? 'bg-white text-brand-orange shadow-sm dark:bg-[#2a2a3e] dark:text-[#ff7a3d]' : ''}`}
              onClick={() => setMode('summarize')}
            >
              {t.mode_summarize}
            </button>
            <button
              className={`flex-1 py-2 px-0.5 border-none bg-transparent rounded-md text-[11px] font-semibold text-slate-600 cursor-pointer transition-all hover:bg-brand-orange/10 hover:text-brand-orange dark:text-slate-400 dark:hover:bg-brand-orange/15 dark:hover:text-[#ff7a3d] ${mode === 'correct' ? 'bg-white text-brand-orange shadow-sm dark:bg-[#2a2a3e] dark:text-[#ff7a3d]' : ''}`}
              onClick={() => setMode('correct')}
            >
              {t.mode_correct}
            </button>
            <button
              className={`flex-1 py-2 px-0.5 border-none bg-transparent rounded-md text-[11px] font-semibold text-slate-600 cursor-pointer transition-all hover:bg-brand-orange/10 hover:text-brand-orange dark:text-slate-400 dark:hover:bg-brand-orange/15 dark:hover:text-[#ff7a3d] ${mode === 'proofread' ? 'bg-white text-brand-orange shadow-sm dark:bg-[#2a2a3e] dark:text-[#ff7a3d]' : ''}`}
              onClick={() => setMode('proofread')}
            >
              {t.mode_proofread}
            </button>
            <button
              className={`flex-1 py-2 px-0.5 border-none bg-transparent rounded-md text-[11px] font-semibold text-slate-600 cursor-pointer transition-all hover:bg-brand-orange/10 hover:text-brand-orange dark:text-slate-400 dark:hover:bg-brand-orange/15 dark:hover:text-[#ff7a3d] ${mode === 'translate' ? 'bg-white text-brand-orange shadow-sm dark:bg-[#2a2a3e] dark:text-[#ff7a3d]' : ''}`}
              onClick={() => setMode('translate')}
            >
              {t.mode_translate}
            </button>
            <button
              className={`flex-1 py-2 px-0.5 border-none bg-transparent rounded-md text-[11px] font-semibold text-slate-600 cursor-pointer transition-all hover:bg-brand-orange/10 hover:text-brand-orange dark:text-slate-400 dark:hover:bg-brand-orange/15 dark:hover:text-[#ff7a3d] ${mode === 'expand' ? 'bg-white text-brand-orange shadow-sm dark:bg-[#2a2a3e] dark:text-[#ff7a3d]' : ''}`}
              onClick={() => setMode('expand')}
            >
              {t.mode_expand}
            </button>
          </section>

          <button
            className="flex items-center justify-center px-3 ml-0 text-slate-500 transition-all rounded-lg cursor-pointer bg-brand-orange-light hover:bg-white hover:text-brand-orange hover:shadow-sm dark:bg-brand-dark-surface dark:text-slate-400 dark:hover:bg-[#2a2a3e] dark:hover:text-[#ff7a3d]"
            onClick={() => {
              setShowSettings(true);
            }}
          >
            <SettingsIcon />
          </button>
        </div>
        <section className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="m-0 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
              {t.original_text}
            </h3>
            <div className="flex gap-1.5">
              <button
                className="flex items-center justify-center p-1.5 text-slate-500 transition-all bg-white border border-slate-200 rounded-md cursor-pointer shadow-sm hover:bg-brand-orange-light hover:border-brand-orange hover:text-brand-orange hover:shadow-md hover:-translate-y-px dark:bg-brand-dark-surface dark:border-slate-700 dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:border-brand-orange dark:hover:text-[#ff7a3d]"
                onClick={handleClear}
                title={t.clear_btn || 'Clear'}
              >
                <ClearIcon />
              </button>
              <button
                className="flex items-center justify-center p-1.5 transition-all border rounded-md cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-px bg-brand-orange-light border-brand-orange/20 text-brand-orange hover:bg-brand-orange-light hover:border-brand-orange hover:text-brand-orange dark:bg-brand-dark-surface dark:border-slate-700 dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:border-brand-orange dark:hover:text-[#ff7a3d]"
                onClick={handleFetchContent}
                title={t.fetch_page_content || 'Fetch Page Content'}
              >
                <FetchIcon />
              </button>
            </div>
          </div>
          <div className="relative flex flex-col flex-1 min-h-0">
            <textarea
              className="flex-1 w-full min-h-[80px] p-3.5 text-sm leading-relaxed bg-white border-[1.5px] border-slate-200 rounded-xl outline-none resize-y shadow-sm transition-all whitespace-pre-wrap break-words text-slate-700 hover:border-slate-300 focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 dark:bg-[#23233a] dark:border-[#3f3f5a] dark:text-slate-200 dark:focus:border-[#ff7a3d] dark:focus:ring-[#ff7a3d]/10 dark:bg-brand-dark-bg"
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              placeholder={t.placeholder}
            />
            {selectedText && (
              <div className="absolute bottom-2 right-3 text-[11px] text-slate-400 pointer-events-none bg-white/80 px-1.5 py-0.5 rounded dark:bg-[#1a1a2e]/80 dark:text-slate-500">
                {selectedText.length} {t.char_count}
              </div>
            )}
          </div>
        </section>

        {(modeResults[mode] || generatingModes[mode]) && (
          <section
            className={`flex flex-col flex-1 min-h-0 transition-opacity ${status === 'loading' ? 'opacity-30' : 'opacity-100'}`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="m-0 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                {mode === 'summarize'
                  ? t.result_summarize
                  : mode === 'correct'
                    ? t.result_correct
                    : mode === 'proofread'
                      ? t.result_proofread
                      : mode === 'translate'
                        ? t.result_translate
                        : t.result_expand}
              </h3>
              {modeResults[mode] && (
                <button
                  className="flex items-center justify-center p-1.5 text-slate-500 transition-all bg-white border border-slate-200 rounded-md cursor-pointer shadow-sm hover:bg-brand-orange-light hover:border-brand-orange hover:text-brand-orange hover:shadow-md hover:-translate-y-px dark:bg-brand-dark-surface dark:border-slate-700 dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:border-brand-orange dark:hover:text-[#ff7a3d]"
                  onClick={handleCopyResult}
                  title={t.copy_btn || 'Copy'}
                >
                  {copied ? (
                    '✓'
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            {settings.engine === 'local-wasm' && !modeResults[mode] && generatingModes[mode] && (
              <p className="text-[11px] text-slate-500 mb-2 dark:text-slate-400">
                {t.wasm_warning}
              </p>
            )}
            <div className="relative flex flex-col flex-1 min-h-0">
              <textarea
                className="flex-1 w-full min-h-[80px] p-3.5 text-sm leading-relaxed border rounded-xl outline-none resize-y shadow-sm transition-all whitespace-pre-wrap break-words bg-brand-orange-light border-brand-orange/30 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)] focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 dark:bg-brand-orange/10 dark:border-brand-orange/50 dark:text-slate-200 dark:focus:bg-brand-dark-bg dark:focus:border-[#ff7a3d] dark:focus:ring-[#ff7a3d]/10"
                value={modeResults[mode]}
                onChange={(e) => setModeResults((prev) => ({ ...prev, [mode]: e.target.value }))}
                placeholder={generatingModes[mode] ? t.thinking : ''}
                readOnly={generatingModes[mode]}
              />
              {modeResults[mode] && (
                <div className="absolute bottom-2 right-3 text-[11px] text-slate-400 pointer-events-none bg-white/80 px-1.5 py-0.5 rounded dark:bg-[#1a1a2e]/80 dark:text-slate-500">
                  {modeResults[mode].length} {t.char_count}
                </div>
              )}
            </div>
          </section>
        )}

        {error && (
          <p className="p-2 my-2 text-xs text-red-600 rounded-md bg-red-50 dark:bg-[#2d1515] dark:text-red-300">
            {t.status_error}: {error}
          </p>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 backdrop-blur-[4px]">
          <div className="flex flex-col gap-4 w-full p-6 pb-4 bg-[#fbfbfb] rounded-t-[20px] max-h-[90vh] overflow-y-auto shadow-[-10px_25px_rgba(0,0,0,0.1)] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] dark:bg-brand-dark-bg dark:shadow-[-10px_25px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="m-0 text-xl font-extrabold">{t.settings}</h2>
              <button
                className="flex items-center justify-center w-8 h-8 text-slate-500 border-none rounded-full cursor-pointer bg-slate-100 dark:bg-brand-dark-surface dark:text-slate-400"
                onClick={() => setShowSettings(false)}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl dark:bg-brand-dark-surface dark:border-slate-700">
              <h3 className="m-0 text-sm font-bold text-slate-800 dark:text-slate-200">
                {t.core_settings}
              </h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400">
                  {t.lang_label}
                </label>
                <select
                  className="p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/10 dark:bg-brand-dark-bg dark:border-[#4a4a6a] dark:text-slate-200 dark:focus:bg-brand-dark-surface"
                  value={settings.extensionLanguage}
                  onChange={(e) => updateSettings({ extensionLanguage: e.target.value })}
                >
                  <option value="中文">中文 (简体)</option>
                  <option value="English">English</option>
                  <option value="日本語">日本語</option>
                  <option value="한국어">한국어</option>
                  <option value="Français">Français</option>
                  <option value="Deutsch">Deutsch</option>
                  <option value="Español">Español</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400">
                  {t.engine_label}
                </label>
                <select
                  className="p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/10 dark:bg-brand-dark-bg dark:border-[#4a4a6a] dark:text-slate-200 dark:focus:bg-brand-dark-surface"
                  value={settings.engine}
                  onChange={(e) => updateSettings({ engine: e.target.value })}
                >
                  <option value="local-gpu">{t.engine_webgpu}</option>
                  <option value="local-wasm">{t.engine_wasm}</option>
                  <option value="online">{t.engine_online}</option>
                </select>
              </div>
              {(settings.engine === 'local-gpu' || settings.engine === 'local-wasm') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400 flex justify-between">
                    {t.model_label}
                    <span className="text-brand-orange lowercase">
                      {t.ram_info}{(navigator as any).deviceMemory || 8}GB
                    </span>
                  </label>
                  <div className="relative" ref={modelDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="w-full flex items-center justify-between p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 hover:bg-white hover:border-brand-orange transition-all dark:bg-brand-dark-bg dark:border-[#4a4a6a] dark:text-slate-200 dark:hover:bg-brand-dark-surface"
                    >
                      <span className="truncate">
                        {(() => {
                          let foundName = settings.localModel;
                          modelConfig.categories.forEach(c => {
                            const m = c.models.find(mod => mod.value === settings.localModel);
                            if (m) foundName = m.name;
                          });
                          return foundName;
                        })()}
                      </span>
                      <ChevronDownIcon />
                    </button>

                    {isModelDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-2 glass-surface rounded-xl overflow-hidden z-20 animate-slide-in">
                        {/* Search Header */}
                        <div className="p-3 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-white/5 backdrop-blur-md">
                          <div className="relative">
                            <i className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                              <SearchIcon />
                            </i>
                            <input
                              autoFocus
                              type="text"
                              value={modelSearch}
                              onChange={(e) => setModelSearch(e.target.value)}
                              placeholder={t.search_placeholder}
                              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100/50 border-none rounded-xl focus:ring-0 dark:bg-white/5 dark:text-slate-100 placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col h-[480px] overflow-hidden bg-white/50 dark:bg-brand-dark-bg/50 backdrop-blur-xl">
                          {/* Categories Horizontal Bar */}
                          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 px-2">
                            {/* Recently Used */}
                            {historyModels.length > 0 && !modelSearch && (
                              <button
                                onClick={() => setSelectedCategory('history')}
                                className={`flex shrink-0 items-center justify-center p-3 gap-2 text-[11px] font-bold transition-all border-b-2 ${selectedCategory === 'history' ? 'border-brand-orange text-brand-orange bg-white dark:bg-white/10' : 'border-transparent text-slate-400 grayscale hover:grayscale-0'}`}
                              >
                                <div className="w-5 h-5 flex items-center justify-center rounded-md bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
                                  <FetchIcon />
                                </div>
                                <span>{t.history_label}</span>
                              </button>
                            )}
                            {categoriesWithModels.map((cat) => (
                              <button
                                key={cat.label}
                                onClick={() => setSelectedCategory(cat.label)}
                                className={`flex shrink-0 items-center justify-center p-3 gap-2 text-[11px] font-extrabold transition-all border-b-2 ${selectedCategory === cat.label || (!selectedCategory && categoriesWithModels[0].label === cat.label) ? 'border-brand-orange text-brand-orange bg-white dark:bg-white/10' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                              >
                                <div className={`w-5 h-5 flex items-center justify-center rounded-md text-[10px] ${selectedCategory === cat.label ? 'bg-brand-orange/10 text-brand-orange' : 'bg-slate-200/50 dark:bg-white/10 text-slate-400 font-black'}`}>
                                  {cat.label.charAt(0)}
                                </div>
                                <span className="whitespace-nowrap uppercase tracking-tighter">{cat.label}</span>
                              </button>
                            ))}
                          </div>
 
                          {/* Models Grid (Full Width) */}
                          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2.5">
                            {modelSearch ? (
                              categoriesWithModels.map(cat => (
                                <div key={cat.label} className="space-y-1.5 pb-2">
                                  <div className="px-2 py-1 text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">{cat.label}</div>
                                  {cat.filteredModels.map(m => (
                                    <button
                                      key={m.value}
                                      onClick={() => { updateSettings({ localModel: m.value }); addToHistory(m.value); setIsModelDropdownOpen(false); }}
                                      className={`w-full p-4 rounded-2xl text-left border transition-all relative overflow-hidden group ${settings.localModel === m.value ? 'bg-brand-orange text-white border-brand-orange shadow-lg' : 'bg-white/60 border-slate-100 hover:border-brand-orange/30 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10'}`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-black tracking-tight truncate">{m.name}</div>
                                          <div className={`text-[9px] mt-1 font-mono tracking-tighter truncate ${settings.localModel === m.value ? 'text-white/60' : 'text-slate-400'}`}>{m.value}</div>
                                        </div>
                                        {(navigator as any).deviceMemory && m.rawSize > 0 && m.rawSize < ((navigator as any).deviceMemory * 1024 * 1024 * 1024 * 0.4) && (
                                          <div className={`shrink-0 px-2 py-1 rounded-lg ${settings.localModel === m.value ? 'bg-white/20' : 'bg-brand-orange/10 dark:bg-brand-orange/20'}`}>
                                            <span className={`text-[8px] font-black uppercase tracking-tight ${settings.localModel === m.value ? 'text-white' : 'text-brand-orange'}`}>
                                              {t.recommended_label}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ))
                            ) : selectedCategory === 'history' ? (
                              historyModels.map(m => (
                                <button
                                  key={m.value}
                                  onClick={() => { updateSettings({ localModel: m.value }); addToHistory(m.value); setIsModelDropdownOpen(false); }}
                                  className={`w-full p-4 rounded-2xl text-left border transition-all relative overflow-hidden ${settings.localModel === m.value ? 'bg-brand-orange text-white border-brand-orange shadow-lg' : 'bg-white/60 border-slate-100 hover:border-brand-orange/30 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10'}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-black tracking-tight truncate">{m.name}</div>
                                    <div className={`text-[9px] mt-1 font-mono tracking-tighter truncate ${settings.localModel === m.value ? 'text-white/60' : 'text-slate-400'}`}>{m.value}</div>
                                  </div>
                                </button>
                              ))
                            ) : (
                              (currentCategoryObj?.filteredModels || []).map(m => {
                                const isSelected = settings.localModel === m.value;
                                const ramGB = (navigator as any).deviceMemory || 8;
                                const isRecommended = m.rawSize > 0 && m.rawSize < ramGB * 1024 * 1024 * 1024 * 0.4;
                                return (
                                  <button
                                    key={m.value}
                                    onClick={() => { updateSettings({ localModel: m.value }); addToHistory(m.value); setIsModelDropdownOpen(false); }}
                                    className={`w-full p-4 rounded-2xl text-left border transition-all group relative overflow-hidden ${isSelected ? 'bg-brand-orange text-white border-brand-orange shadow-lg' : 'bg-white/50 border-slate-100 hover:bg-white hover:border-brand-orange/30 dark:bg-[#2c2c3a] dark:border-white/5 dark:hover:bg-[#34344a]'}`}
                                  >
                                    {isSelected && (
                                      <div className="absolute top-0 right-0 p-1 opacity-20">
                                        <div className="w-12 h-12 rounded-full border-[8px] border-white/30 translate-x-4 -translate-y-4"></div>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-black tracking-tight truncate">{m.name}</div>
                                        <div className={`text-[9px] mt-1 font-mono tracking-tighter truncate ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{m.value}</div>
                                      </div>
                                      {isRecommended && (
                                        <div className={`shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${isSelected ? 'bg-white/10' : 'bg-emerald-500/5 dark:bg-emerald-500/10'}`}>
                                          <span className={`text-[8px] font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-emerald-500'}`}>{t.recommended_label}</span>
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {settings.engine === 'online' && (
              <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl dark:bg-brand-dark-surface dark:border-slate-700">
                <h3 className="m-0 text-sm font-bold text-slate-800 dark:text-slate-200">
                  {t.api_config}
                </h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400">
                    API Base URL
                  </label>
                  <input
                    className="p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/10 dark:bg-brand-dark-bg dark:border-[#4a4a6a] dark:text-slate-200 dark:focus:bg-brand-dark-surface"
                    type="text"
                    value={settings.apiBaseUrl}
                    onChange={(e) => updateSettings({ apiBaseUrl: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400">
                    API Key
                  </label>
                  <input
                    className="p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/10 dark:bg-brand-dark-bg dark:border-[#4a4a6a] dark:text-slate-200 dark:focus:bg-brand-dark-surface"
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => updateSettings({ apiKey: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400">
                    Model ID
                  </label>
                  <input
                    className="p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/10 dark:bg-brand-dark-bg dark:border-[#4a4a6a] dark:text-slate-200 dark:focus:bg-brand-dark-surface"
                    type="text"
                    value={settings.apiModel}
                    onChange={(e) => updateSettings({ apiModel: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl dark:bg-brand-dark-surface dark:border-slate-700">
              <h3 className="m-0 text-sm font-bold text-slate-800 dark:text-slate-200">
                {t.func_pref}
              </h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400">
                  {t.tone_label}
                </label>
                <select
                  className="p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/10 dark:bg-brand-dark-bg dark:border-[#4a4a6a] dark:text-slate-200 dark:focus:bg-brand-dark-surface"
                  value={settings.tone}
                  onChange={(e) => updateSettings({ tone: e.target.value })}
                >
                  <option value="professional">{t.tone_professional}</option>
                  <option value="casual">{t.tone_casual}</option>
                  <option value="academic">{t.tone_academic}</option>
                  <option value="concise">{t.tone_concise}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400">
                  {t.detail_label}
                </label>
                <select
                  className="p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/10 dark:bg-brand-dark-bg dark:border-[#4a4a6a] dark:text-slate-200 dark:focus:bg-brand-dark-surface"
                  value={settings.detailLevel}
                  onChange={(e) => updateSettings({ detailLevel: e.target.value })}
                >
                  <option value="standard">{t.detail_standard}</option>
                  <option value="detailed">{t.detail_detailed}</option>
                  <option value="creative">{t.detail_creative}</option>
                </select>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <input
                  type="checkbox"
                  id="autoSpeak"
                  checked={settings.autoSpeak}
                  onChange={(e) => updateSettings({ autoSpeak: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="autoSpeak" className="cursor-pointer mb-0">
                  {t.auto_speak_label}
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl dark:bg-brand-dark-surface dark:border-slate-700">
              <h3 className="m-0 text-sm font-bold text-slate-800 dark:text-slate-200">
                {t.offline_import_title}
              </h3>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-slate-500 mb-2">{t.offline_import_tip}</p>
                <div className="flex flex-col gap-2 relative">
                  <button
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all w-full hover:bg-brand-orange-light hover:border-brand-orange hover:text-brand-orange hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-dark-bg dark:border-slate-700 dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:border-brand-orange dark:hover:text-[#ff7a3d]"
                    onClick={() => document.getElementById('folder-input')?.click()}
                  >
                    {t.offline_import_btn}
                  </button>
                  <input
                    id="folder-input"
                    type="file"
                    webkitdirectory="true"
                    className="hidden"
                    onChange={handleFileImport}
                  />

                  <div className="flex gap-2">
                    <button
                      className="flex items-center justify-center gap-1.5 py-2 px-3 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all flex-1 text-xs hover:bg-brand-orange-light hover:border-brand-orange hover:text-brand-orange hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-dark-bg dark:border-slate-700 dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:border-brand-orange dark:hover:text-[#ff7a3d]"
                      onClick={handleExportModel}
                      disabled={status === 'loading'}
                    >
                      <ExportIcon />
                      {t.export_btn}
                    </button>
                    <button
                      className="flex items-center justify-center gap-1.5 py-2 px-3 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all flex-1 text-xs hover:bg-brand-orange-light hover:border-brand-orange hover:text-brand-orange hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-dark-bg dark:border-slate-700 dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:border-brand-orange dark:hover:text-[#ff7a3d]"
                      onClick={() => document.getElementById('pkg-input')?.click()}
                      disabled={status === 'loading'}
                    >
                      <ImportIcon />
                      {t.import_pkg_btn}
                    </button>
                    <input
                      id="pkg-input"
                      type="file"
                      accept=".mlcp"
                      className="hidden"
                      onChange={handleImportPackage}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="sticky bottom-0 left-0 right-0 p-3 bg-[#fbfbfb] border-t border-slate-100 dark:bg-brand-dark-bg dark:border-slate-800">
        {status === 'loading' ? (
          <div className="flex gap-2">
            <button
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-brand-orange border-none rounded-xl cursor-default shadow-md shadow-brand-orange/20 transition-all dark:bg-brand-orange"
              disabled
            >
              {progress.text || `${t.status_loading} ${Math.round(progress.progress)}%`}
            </button>
            <button
              onClick={handleReset}
              className="p-2.5 text-slate-400 bg-slate-100 border-none rounded-xl cursor-pointer hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500"
              title="暂停并清除"
            >
              <CloseIcon />
            </button>
          </div>
        ) : status === 'error' ? (
          <button
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#e53e3e] border-none rounded-xl cursor-pointer shadow-md shadow-brand-orange/20 transition-all hover:bg-brand-orange-dark hover:shadow-lg hover:shadow-brand-orange/30 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
            onClick={() => setStatus('idle')}
          >
            {t.status_error} (Click to Reset)
          </button>
        ) : status === 'idle' &&
          (settings.engine === 'local-gpu' || settings.engine === 'local-wasm') ? (
          <button
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-orange border-none rounded-xl cursor-pointer shadow-md shadow-brand-orange/20 transition-all hover:bg-brand-orange-dark hover:shadow-lg hover:shadow-brand-orange/30 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
            onClick={loadModel}
          >
            {t.action_btn_load} ({settings.engine === 'local-gpu' ? 'WebGPU' : 'WASM'})
          </button>
        ) : (
          <button
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-orange border-none rounded-xl cursor-pointer shadow-md shadow-brand-orange/20 transition-all hover:bg-brand-orange-dark hover:shadow-lg hover:shadow-brand-orange/30 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
            onClick={handleAction}
            disabled={!selectedText || generatingModes[mode]}
          >
            {generatingModes[mode]
              ? t.action_generating
              : `${t.action_btn_execute}${
                  mode === 'summarize'
                    ? t.mode_summarize
                    : mode === 'correct'
                      ? t.mode_correct
                      : mode === 'proofread'
                        ? t.mode_proofread
                        : mode === 'translate'
                          ? t.mode_translate
                          : t.mode_expand
                }`}
          </button>
        )}
      </footer>
    </div>
  );
}

export default App;
