/** GeminiSection: Options 页的 Gemini API 配置 */
import { useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface GeminiConfig {
  apiKey: string;
  model: string;
}

const DEFAULT_MODEL = 'gemini-2.0-flash';
const STORAGE_KEY = 'geminiConfig';

export function GeminiSection() {
  const [loaded, setLoaded] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    let mounted = true;
    void chrome.storage.local.get(STORAGE_KEY).then((stored) => {
      if (!mounted) return;
      const cfg = stored[STORAGE_KEY] as GeminiConfig | undefined;
      if (cfg) {
        setApiKey(cfg.apiKey);
        setModel(cfg.model || DEFAULT_MODEL);
      }
      setLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  const handleSave = useCallback(async () => {
    await chrome.storage.local.set({ [STORAGE_KEY]: { apiKey, model } });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }, [apiKey, model]);

  if (!loaded) {
    return <div className="space-y-3 animate-pulse" aria-busy="true"><div className="h-4 bg-slate-200 rounded w-1/3" /><div className="h-9 bg-slate-100 rounded" /></div>;
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-base font-semibold">Gemini API</h2>
        <p className="text-xs text-slate-500">
          Google Gemini 云端 API。免费 tier 60 r/min。模型：{model}
        </p>
      </header>

      <div className="space-y-1">
        <label htmlFor="gem-apikey" className="block text-sm font-medium">API Key</label>
        <div className="flex gap-2">
          <input
            id="gem-apikey"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="从 aistudio.google.com 获取"
            autoComplete="off"
            className="flex-1 rounded-md border border-slate-300 p-2 text-sm font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            title={showKey ? '隐藏 API Key' : '显示 API Key'}
            aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
            className="px-2 flex items-center justify-center text-slate-500 rounded-md border border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 hover:text-slate-700 transition-colors"
          >
            {showKey ? (
              <EyeOff size={16} aria-hidden="true" />
            ) : (
              <Eye size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={handleSave} disabled={!apiKey.trim()} className="pd-btn pd-btn-primary px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50">
          保存
        </button>
        <div role="status" aria-live="polite">
          {savedFlash && <span className="text-sm text-emerald-600">已保存 ✓</span>}
        </div>
      </div>
    </section>
  );
}
