/**
 * Options App (v0.4 UI 重设计): 设置页
 *
 * v0.4 UI 变更：
 * - 品牌 header：logo 渐变 + serif 标题 + 简介
 * - 引擎健康度总览卡（chrome-ai / webllm / openai-compat / free-translate 一览）
 * - 分区语义化：外观 / 引擎路由 / OpenAI 兼容 / 免费兜底
 * - 品牌黄贯穿：header 渐变、focus ring、健康度卡背景
 *
 * 分区：
 * - 外观（theme + locale 并排）
 * - 引擎路由（默认引擎）
 * - OpenAI 兼容 API 配置
 * - 免费翻译兜底开关
 */
import { useEffect, useState } from 'react';
import { useSettingsStore } from '@stores/settings';
import type { Theme, Locale, EngineId } from '@stores/settings';
import { OpenAiCompatSection } from '@components/OpenAiCompatSection';
import { FreeTranslateSection } from '@components/FreeTranslateSection';
import { getEngines } from '@core/engines';
import { defineStorage } from '@core/storage';
import type { Engine } from '@engines/types';

type Health = 'ok' | 'err' | 'off';
type HealthMap = Record<string, Health>;

// 与 FreeTranslateSection 里的 storage item 同 key，只做读取
const freeTranslateEnabledStore = defineStorage<boolean>('freeTranslate.enabled', true, {
  area: 'sync',
});

export default function OptionsApp() {
  const {
    theme,
    locale,
    defaultEngine,
    setTheme,
    setLocale,
    setDefaultEngine,
  } = useSettingsStore();

  // 探测每个引擎的可用性，做健康度概览
  const [health, setHealth] = useState<HealthMap>({});
  const [freeEnabled, setFreeEnabled] = useState<boolean>(true);

  useEffect(() => {
    // 初次读取
    freeTranslateEnabledStore.get().then(setFreeEnabled).catch(() => {
      setFreeEnabled(false);
    });

    // 监听下方 FreeTranslateSection 切换开关，
    // 保持顶部健康度卡实时同步（Gemini review: 高优先级 bug）
    const c: typeof chrome | undefined = (globalThis as { chrome?: typeof chrome }).chrome;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      const change = changes['freeTranslate.enabled'];
      if (areaName === 'sync' && change !== undefined) {
        setFreeEnabled(Boolean(change.newValue));
      }
    };
    c?.storage?.onChanged?.addListener(handleStorageChange);
    return () => {
      c?.storage?.onChanged?.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const engines = getEngines().list();
    engines.forEach((e: Engine) => {
      e.isAvailable()
        .then((ok: boolean) => {
          if (!cancelled) {
            setHealth((h) => ({ ...h, [e.id]: ok ? 'ok' : 'err' }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setHealth((h) => ({ ...h, [e.id]: 'err' }));
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const engineMeta: { id: string; name: string; hint: (h: Health) => string }[] = [
    { id: 'chrome-ai', name: 'Chrome AI', hint: (h) => (h === 'ok' ? '设备端就绪' : '不支持') },
    { id: 'webllm', name: 'WebLLM', hint: (h) => (h === 'ok' ? '已就绪' : 'WebGPU 不可用') },
    { id: 'openai-compat', name: 'OpenAI 兼容', hint: (h) => (h === 'ok' ? '已配置' : '未配置') },
    {
      id: 'free-translate',
      name: '免费兜底',
      hint: (_h) => (freeEnabled ? '已启用' : '未启用'),
    },
  ];

  return (
    <div className="min-h-screen bg-beige-50 text-ink-warm">
      <div className="max-w-2xl mx-auto p-6">
        {/* ============ 品牌 header ============ */}
        <header className="flex items-center gap-3 mb-6 pb-5 border-b border-ink-200">
          <img
            src="/icons/icon-48.png"
            alt=""
            className="w-10 h-10 rounded-lg shadow-brand-lg"
          />
          <div>
            <h1 className="text-2xl font-bold font-serif tracking-tight text-ink-900">
              设置
            </h1>
            <p className="text-[13px] text-ink-500 mt-0.5">
              配置翻译引擎、语言与外观偏好。
            </p>
          </div>
        </header>

        {/* ============ 健康度总览卡 ============ */}
        <div
          className="pd-plush-health-card rounded-lg border border-sakura/50 p-4 mb-6"
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 mb-2.5">
            引擎健康度
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {engineMeta.map((meta) => {
              const h: Health =
                meta.id === 'free-translate'
                  ? freeEnabled
                    ? 'ok'
                    : 'off'
                  : health[meta.id] ?? 'off';
              return (
                <div key={meta.id} className="flex items-center gap-2 text-[13px]">
                  <span
                    className={`pd-dot ${
                      h === 'ok' ? 'pd-dot-ok' : h === 'err' ? 'pd-dot-err' : 'pd-dot-off'
                    }`}
                  />
                  <span className="font-medium text-ink-800">{meta.name}</span>
                  <span className="text-ink-500 text-[12.5px]">· {meta.hint(h)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============ 主内容卡 ============ */}
        <div className="rounded-lg bg-white border border-ink-200 shadow-card">
          {/* 外观 */}
          <section className="p-5 border-b border-ink-200">
            <h2 className="text-base font-bold font-serif text-ink-900 mb-3">外观</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="theme-select"
                  className="block text-[12px] font-semibold text-ink-700 mb-1.5"
                >
                  主题
                </label>
                <select
                  id="theme-select"
                  className="w-full rounded-md border border-ink-200 p-2 text-[13px] bg-white text-ink-800 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                >
                  <option value="system">跟随系统</option>
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="locale-select"
                  className="block text-[12px] font-semibold text-ink-700 mb-1.5"
                >
                  界面语言
                </label>
                <select
                  id="locale-select"
                  className="w-full rounded-md border border-ink-200 p-2 text-[13px] bg-white text-ink-800 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
            </div>
          </section>

          {/* 引擎路由 */}
          <section className="p-5 border-b border-ink-200">
            <h2 className="text-base font-bold font-serif text-ink-900 mb-1">引擎路由</h2>
            <p className="text-[12.5px] text-ink-500 mb-3">
              按优先级自动选用，也可强制指定。
            </p>
            <label
              htmlFor="default-engine"
              className="block text-[12px] font-semibold text-ink-700 mb-1.5"
            >
              默认引擎
            </label>
            <select
              id="default-engine"
              className="w-full rounded-md border border-ink-200 p-2 text-[13px] bg-white text-ink-800 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              value={defaultEngine}
              onChange={(e) => setDefaultEngine(e.target.value as EngineId)}
            >
              <option value="auto">自动（chrome-ai → webllm → openai → 兜底）</option>
              <option value="chrome-ai">Chrome AI · Gemini Nano</option>
              <option value="webllm">WebLLM · WebGPU</option>
              <option value="openai-compat">OpenAI 兼容 API</option>
              <option value="free-translate">免费翻译（Google 公开端点）</option>
            </select>
            <p className="text-[11.5px] text-ink-400 mt-1.5">
              按可用性自动降级；手动指定则跳过自动选择。
            </p>
          </section>

          {/* OpenAI 兼容 API */}
          <section className="p-5 border-b border-ink-200">
            <OpenAiCompatSection />
          </section>

          {/* 免费翻译兜底 */}
          <section className="p-5">
            <FreeTranslateSection />
          </section>
        </div>

        <footer className="text-center text-[11px] text-ink-400 mt-6 py-4">
          校对鸭 · ProofDuck v0.4 · 隐私优先本地翻译
        </footer>
      </div>
    </div>
  );
}
