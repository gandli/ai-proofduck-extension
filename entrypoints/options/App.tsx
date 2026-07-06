/**
 * Options App: 设置页
 *
 * 分区：
 * - 主题（light/dark/system）
 * - 语言（zh-CN/en/ja）
 * - 默认引擎
 * - OpenAI 兼容 API 配置（Cycle 4b 新增）
 * - 免费翻译兜底开关（Cycle 4b 新增）
 */
import { useSettingsStore } from '@stores/settings';
import type { Theme, Locale, EngineId } from '@stores/settings';
import { OpenAiCompatSection } from '@components/OpenAiCompatSection';
import { FreeTranslateSection } from '@components/FreeTranslateSection';

export default function OptionsApp() {
  const { theme, locale, defaultEngine, setTheme, setLocale, setDefaultEngine } =
    useSettingsStore();

  return (
    <div className="max-w-xl mx-auto p-6 space-y-8 bg-white text-slate-900">
      <header className="flex items-center gap-3">
        <img src="/icons/icon-48.png" alt="" className="w-8 h-8" />
        <h1 className="text-xl font-bold">校对鸭 · 设置</h1>
      </header>

      <section className="space-y-2">
        <label className="block text-sm font-medium">主题</label>
        <select
          className="w-full rounded-md border border-slate-300 p-2 text-sm"
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </section>

      <section className="space-y-2">
        <label className="block text-sm font-medium">语言</label>
        <select
          className="w-full rounded-md border border-slate-300 p-2 text-sm"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </section>

      <section className="space-y-2">
        <label className="block text-sm font-medium">默认引擎</label>
        <select
          className="w-full rounded-md border border-slate-300 p-2 text-sm"
          value={defaultEngine}
          onChange={(e) => setDefaultEngine(e.target.value as EngineId)}
        >
          <option value="auto">自动（推荐）</option>
          <option value="chrome-ai">Chrome AI · Gemini Nano</option>
          <option value="webllm">WebLLM · WebGPU</option>
          <option value="openai-compat">OpenAI 兼容 API</option>
          <option value="free-translate">免费翻译（Google 公开端点）</option>
        </select>
      </section>

      <hr className="border-slate-200" />

      <OpenAiCompatSection />

      <hr className="border-slate-200" />

      <FreeTranslateSection />
    </div>
  );
}
