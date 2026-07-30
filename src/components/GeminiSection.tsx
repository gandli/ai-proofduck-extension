/** GeminiSection: Options 页的 Gemini API 配置 */
import { useEffect, useState, useCallback } from 'react';

interface GeminiConfig {
  apiKey: string;
  model: string;
}

const DEFAULT_MODEL = 'gemini-2.0-flash';
const STORAGE_KEY = 'geminiConfig';

export function GeminiSection() {
  const [loaded, setLoaded] = useState(false);
  const [apiKey, setApiKey] = useState('');
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
        <input
          id="gem-apikey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="从 aistudio.google.com 获取"
          autoComplete="off"
          className="w-full rounded-md border border-slate-300 p-2 text-sm font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={handleSave} className="pd-btn pd-btn-primary px-3 py-1.5 rounded-md text-sm font-medium">
          保存
        </button>
        {savedFlash && <span className="text-sm text-emerald-600">已保存 ✓</span>}
      </div>
    </section>
  );
}
