/**
 * FreeTranslateSection: Options 页里 free-translate 引擎的隐私开关
 *
 * 为什么单独有一节：
 * - free-translate 是唯一会**把用户文本发到第三方服务器**的引擎
 * - 与 chrome-ai / webllm（完全本地）明显区别
 * - 隐私党需要一个明确的可视化关闭入口
 *
 * 默认开启（用户装完想立即能用），关闭后 isAvailable → false
 * → 扩展会真正表现为"没有可用引擎"（如果其他引擎也不可用）。
 */
import { useEffect, useState } from 'react';
import { defineStorage } from '@core/storage';

const enabledItem = defineStorage<boolean>('freeTranslate.enabled', true, { area: 'sync' });

export function FreeTranslateSection() {
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    enabledItem.get().then((v) => {
      if (!mounted) return;
      setEnabled(v);
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await enabledItem.set(next);
  };

  if (!loaded) {
    return <div className="h-10 bg-slate-100 rounded animate-pulse" role="status" aria-busy="true" />;
  }

  return (
    <section className="space-y-2">
      <header>
        <h2 className="text-base font-semibold">免费翻译兜底</h2>
        <p className="text-xs text-slate-500">
          当 Chrome AI / WebLLM / OpenAI 兼容 API 都不可用时，走 Google 公开翻译端点。
          <br />
          ⚠️ 会把翻译文本发送到 <strong>Google 服务器</strong>；如果你在意隐私可以关闭。
        </p>
      </header>

      <label className="inline-flex items-center gap-3 cursor-pointer">
        {/* 用原生 checkbox + role="switch" 让 a11y 与测试都简单 */}
        <input
          type="checkbox"
          role="switch"
          aria-label="启用免费翻译兜底"
          checked={enabled}
          onChange={handleToggle}
          className="h-5 w-5 rounded accent-yellow-400 cursor-pointer"
        />
        <span className="text-sm">{enabled ? '已启用' : '已关闭'}</span>
      </label>
    </section>
  );
}
