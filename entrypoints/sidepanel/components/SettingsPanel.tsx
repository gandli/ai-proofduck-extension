import { useEffect, useMemo, useState } from 'react';

import { type EnginePreference, type Settings } from '../types';
import { CloseIcon, SettingsIcon } from './Icons';

interface SettingsPanelProps {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onChange: (partial: Partial<Settings>) => Promise<void>;
}

const ENGINES: Array<{ value: EnginePreference; label: string }> = [
  { value: 'auto', label: '自动优先' },
  { value: 'chrome-ai', label: '浏览器内置 AI' },
  { value: 'local', label: '本地模型' },
  { value: 'online', label: '在线 LLM API' },
];

interface LocalModelOption {
  id: string;
  vram: number | null;
  context: number | null;
}

const RECOMMENDED_MODEL_IDS = [
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  'Phi-3.5-mini-instruct-q4f16_1-MLC',
];

function formatVram(value: number | null) {
  if (!value) return '';
  return `${(value / 1024).toFixed(1)} GB`;
}

function formatContext(value: number | null) {
  if (!value) return '';
  return `${value.toLocaleString()} 上下文`;
}

function formatModelMeta(option: LocalModelOption) {
  return [formatVram(option.vram), formatContext(option.context)].filter(Boolean).join(' · ');
}

function getVisibleSections(preference: EnginePreference) {
  switch (preference) {
    case 'online':
      return {
        showLocal: false,
        showOnline: true,
        showFallback: true,
      };
    case 'local':
      return {
        showLocal: true,
        showOnline: false,
        showFallback: true,
      };
    case 'chrome-ai':
      return {
        showLocal: false,
        showOnline: false,
        showFallback: true,
      };
    case 'auto':
    default:
      return {
        showLocal: true,
        showOnline: true,
        showFallback: true,
      };
  }
}

export function SettingsPanel({ open, settings, onClose, onChange }: SettingsPanelProps) {
  const [officialModels, setOfficialModels] = useState<LocalModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsLoadFailed, setModelsLoadFailed] = useState(false);
  const visibleSections = getVisibleSections(settings.enginePreference);
  const recommendedModels = useMemo(
    () => RECOMMENDED_MODEL_IDS.map((id) => officialModels.find((item) => item.id === id)).filter(Boolean) as LocalModelOption[],
    [officialModels],
  );

  useEffect(() => {
    if (!open || !visibleSections.showLocal || officialModels.length > 0 || modelsLoading) {
      return;
    }

    let alive = true;
    setModelsLoading(true);
    setModelsLoadFailed(false);

    import('@mlc-ai/web-llm')
      .then((module) => {
        if (!alive) return;
        const rawList = module.prebuiltAppConfig?.model_list ?? [];
        const next = rawList
          .map((item) => ({
            id: item.model_id,
            vram: typeof item.vram_required_MB === 'number' ? item.vram_required_MB : null,
            context: readContextWindow(item),
          }))
          .sort((a, b) => {
            const byVram = (a.vram ?? Number.MAX_SAFE_INTEGER) - (b.vram ?? Number.MAX_SAFE_INTEGER);
            if (byVram !== 0) return byVram;
            return a.id.localeCompare(b.id);
          });
        setOfficialModels(next);
      })
      .catch(() => {
        if (alive) setModelsLoadFailed(true);
      })
      .finally(() => {
        if (alive) setModelsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [modelsLoading, officialModels.length, open, visibleSections.showLocal]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(92,37,12,0.16)] p-3 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-[rgba(255,255,255,0.75)] bg-[linear-gradient(180deg,#fffaf7_0%,#fff5ef_100%)] shadow-[0_24px_60px_rgba(86,35,10,0.22)]">
        <div className="border-b border-[#ffe1d3] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#d46b38]">
                <SettingsIcon className="h-4 w-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">设置</p>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900">引擎与偏好</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">优先顺序、目标语言和在线接口都在这里调整。</p>
            </div>
            <button
              type="button"
              aria-label="关闭"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ffd8c6] bg-white text-slate-500 transition hover:border-brand-orange hover:bg-[#fff0e7] hover:text-brand-orange"
              onClick={onClose}
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <section className="rounded-[1.35rem] border border-[#ffe0d2] bg-white/85 p-4 shadow-[0_8px_24px_rgba(255,90,17,0.06)]">
            <div className="mb-3">
              <h3 className="text-sm font-bold text-slate-800">基础偏好</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">先决定默认语言，再决定优先走哪条处理路线。</p>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">目标语言</span>
                <select
                  className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-orange focus:bg-white"
                  value={settings.targetLanguage}
                  onChange={(event) => void onChange({ targetLanguage: event.target.value })}
                >
                  <option value="中文">中文</option>
                  <option value="English">English</option>
                  <option value="日本語">日本語</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">首选策略</span>
                <select
                  className="w-full rounded-[1rem] border border-[#ffd2bf] bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange focus:bg-white"
                  value={settings.enginePreference}
                  onChange={(event) => void onChange({ enginePreference: event.target.value as EnginePreference })}
                >
                  {ENGINES.map((engine) => (
                    <option key={engine.value} value={engine.value}>
                      {engine.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {visibleSections.showLocal ? (
            <section className="rounded-[1.35rem] border border-[#ffd9c9] bg-[#fff4ee] p-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-800">本地模型</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">这里控制浏览器里的本地处理能力。</p>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">模型名</span>
                  <input
                    list="proofduck-official-local-models"
                    className="w-full rounded-[1rem] border border-[#ffd2bf] bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange"
                    value={settings.localModel}
                    placeholder="从官方模型列表中选择"
                    onChange={(event) => void onChange({ localModel: event.target.value })}
                  />
                  <datalist id="proofduck-official-local-models">
                    {officialModels.map((option) => (
                      <option key={option.id} value={option.id} />
                    ))}
                  </datalist>
                </label>

                <div className="rounded-[1rem] border border-[#ffe2d5] bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">推荐模型</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">先给你几款更常用、也更容易跑起来的官方模型。</p>
                    </div>
                    <span className="text-[11px] font-medium text-[#c45a1a]">
                      {modelsLoading ? '正在加载官方列表' : officialModels.length ? `官方共 ${officialModels.length} 个` : '等待加载'}
                    </span>
                  </div>

                  {recommendedModels.length ? (
                    <div className="mt-3 grid gap-2">
                      {recommendedModels.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => void onChange({ localModel: option.id })}
                          className={`rounded-[1rem] border px-3 py-2 text-left transition ${
                            settings.localModel === option.id
                              ? 'border-brand-orange bg-[#fff1e7] text-[#b94a16]'
                              : 'border-[#ffe2d5] bg-[#fffaf7] text-slate-700 hover:border-[#ffb08e] hover:bg-[#fff3eb]'
                          }`}
                        >
                          <div className="text-sm font-semibold">{option.id}</div>
                          <div className="mt-1 text-[11px] text-slate-500">{formatModelMeta(option) || '官方模型'}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      {modelsLoadFailed ? '官方模型列表暂时加载失败，你仍然可以手动填写模型名。' : '正在读取 web-llm 官方模型列表。'}
                    </p>
                  )}
                </div>

                <div className="rounded-[1rem] border border-[#ffe2d5] bg-white px-4 py-3">
                  <p className="text-sm font-medium text-slate-700">全部官方模型</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    可以直接在上面的输入框里搜索并选择，完整列表来自当前安装的 web-llm 官方模型清单。
                  </p>
                </div>

                <label className="flex items-center justify-between gap-4 rounded-[1rem] border border-[#ffe2d5] bg-white px-4 py-3">
                  <div>
                    <span className="block text-sm font-medium text-slate-700">允许轻量 WASM 兼容模式</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      设备没有 WebGPU 时，尝试切到本地 WASM 模型继续处理。
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.localAllowWasmFallback}
                    onChange={(event) => void onChange({ localAllowWasmFallback: event.target.checked })}
                    className="h-4 w-4 accent-[#ff5a11]"
                  />
                </label>
              </div>
            </section>
          ) : null}

          {visibleSections.showOnline ? (
            <section className="rounded-[1.35rem] border border-[#ffd9c9] bg-[#fff4ee] p-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-800">在线 LLM API</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">需要更强效果时，在这里接入 OpenAI、DeepSeek、GLM 等兼容接口。</p>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">接口地址</span>
                  <input
                    className="w-full rounded-[1rem] border border-[#ffd2bf] bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange"
                    value={settings.onlineApiBase}
                    placeholder="https://example.com/v1"
                    onChange={(event) => void onChange({ onlineApiBase: event.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">API Key</span>
                  <input
                    className="w-full rounded-[1rem] border border-[#ffd2bf] bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange"
                    value={settings.onlineApiKey}
                    placeholder="sk-..."
                    onChange={(event) => void onChange({ onlineApiKey: event.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">模型名</span>
                  <input
                    className="w-full rounded-[1rem] border border-[#ffd2bf] bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange"
                    value={settings.onlineModel}
                    placeholder="gpt-like-model"
                    onChange={(event) => void onChange({ onlineModel: event.target.value })}
                  />
                </label>
              </div>
            </section>
          ) : null}

          {visibleSections.showFallback ? (
            <section className="rounded-[1.35rem] border border-[#ffd9c9] bg-[#fff4ee] p-4">
              <label className="flex items-center justify-between gap-4 rounded-[1rem] border border-[#ffe2d5] bg-white px-4 py-3">
                <div>
                  <span className="block text-sm font-medium text-slate-700">启用翻译兜底</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    翻译模式下，前面几条路都不通时自动使用第三方免费翻译。
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.translationFallbackEnabled}
                  onChange={(event) => void onChange({ translationFallbackEnabled: event.target.checked })}
                  className="h-4 w-4 accent-[#ff5a11]"
                />
              </label>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function readContextWindow(item: {
  overrides?: { context_window_size?: unknown };
  context_window_size?: unknown;
}) {
  if (typeof item.overrides?.context_window_size === 'number') {
    return item.overrides.context_window_size;
  }

  if (typeof item.context_window_size === 'number') {
    return item.context_window_size;
  }

  return null;
}
