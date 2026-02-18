import { Settings } from '../types';
import { CloseIcon } from './Icons';
import { ModelImportExport } from './ModelImportExport';
import { LocalModelSelector } from './LocalModelSelector';

interface SettingsPanelProps {
  settings: Settings;
  updateSettings: (s: Partial<Settings>, workerPostMessage?: (msg: unknown) => void) => void;
  onClose: () => void;
  status: string;
  setStatus: (s: 'idle' | 'loading' | 'ready' | 'error') => void;
  setProgress: (p: { progress: number; text: string }) => void;
  setError: (e: string) => void;
  postMessage: (msg: unknown) => void;
  t: Record<string, string>;
}

const selectClass = "p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/10 dark:bg-brand-dark-bg dark:border-[#4a4a6a] dark:text-slate-200 dark:focus:bg-brand-dark-surface";
const inputClass = selectClass;
const labelClass = "text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400";

export function SettingsPanel({ settings, updateSettings, onClose, status, setStatus, setProgress, setError, postMessage, t }: SettingsPanelProps) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 backdrop-blur-[4px]">
      <div className="flex flex-col gap-4 w-full p-6 pb-4 bg-[#fbfbfb] rounded-t-[20px] max-h-[90vh] overflow-y-auto shadow-[-10px_25px_rgba(0,0,0,0.1)] animate-slideInUp dark:bg-brand-dark-bg dark:shadow-[-10px_25px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="m-0 text-xl font-extrabold">{t.settings}</h2>
          <button className="flex items-center justify-center w-8 h-8 text-slate-500 border-none rounded-full cursor-pointer bg-slate-100 dark:bg-brand-dark-surface dark:text-slate-400" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Core Settings */}
        <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl dark:bg-brand-dark-surface dark:border-slate-700">
          <h3 className="m-0 text-sm font-bold text-slate-800 dark:text-slate-200">{t.core_settings}</h3>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>{t.lang_label}</label>
            <select className={selectClass} value={settings.extensionLanguage} onChange={e => updateSettings({ extensionLanguage: e.target.value })}>
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
            <label className={labelClass}>{t.engine_label}</label>
            <select className={selectClass} value={settings.engine} onChange={e => updateSettings({ engine: e.target.value }, postMessage)}>
              <option value="chrome-ai">{t.engine_chrome_ai}</option>
              <option value="local-gpu">{t.engine_webgpu}</option>
              <option value="local-wasm">{t.engine_wasm}</option>
              <option value="online">{t.engine_online}</option>
            </select>
          </div>
          {(settings.engine === 'local-gpu' || settings.engine === 'local-wasm') && (
            <div className="flex flex-col gap-1.5 overflow-visible">
              <label className={labelClass}>{t.model_label}</label>
              <LocalModelSelector settings={settings} updateSettings={updateSettings} postMessage={postMessage} status={status} t={t} />
            </div>
          )}
        </div>

        {/* Online API */}
        {settings.engine === 'online' && (
          <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl dark:bg-brand-dark-surface dark:border-slate-700">
            <h3 className="m-0 text-sm font-bold text-slate-800 dark:text-slate-200">{t.api_config}</h3>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>API Base URL</label>
              <input className={inputClass} type="text" value={settings.apiBaseUrl} onChange={e => updateSettings({ apiBaseUrl: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>API Key</label>
              <input className={inputClass} type="password" value={settings.apiKey} onChange={e => updateSettings({ apiKey: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Model ID</label>
              <input className={inputClass} type="text" value={settings.apiModel} onChange={e => updateSettings({ apiModel: e.target.value })} />
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl dark:bg-brand-dark-surface dark:border-slate-700">
          <h3 className="m-0 text-sm font-bold text-slate-800 dark:text-slate-200">{t.func_pref}</h3>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>{t.tone_label}</label>
            <select className={selectClass} value={settings.tone} onChange={e => updateSettings({ tone: e.target.value })}>
              <option value="professional">{t.tone_professional}</option>
              <option value="casual">{t.tone_casual}</option>
              <option value="academic">{t.tone_academic}</option>
              <option value="concise">{t.tone_concise}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>{t.detail_label}</label>
            <select className={selectClass} value={settings.detailLevel} onChange={e => updateSettings({ detailLevel: e.target.value })}>
              <option value="standard">{t.detail_standard}</option>
              <option value="detailed">{t.detail_detailed}</option>
              <option value="creative">{t.detail_creative}</option>
            </select>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <input type="checkbox" id="autoSpeak" checked={settings.autoSpeak} onChange={e => updateSettings({ autoSpeak: e.target.checked })} className="w-4 h-4 cursor-pointer" />
            <label htmlFor="autoSpeak" className="cursor-pointer mb-0">{t.auto_speak_label}</label>
          </div>
        </div>

        {/* Model Import/Export */}
        <ModelImportExport settings={settings} status={status} setStatus={setStatus} setProgress={setProgress} setError={setError} t={t} />
      </div>
    </div>
  );
}
