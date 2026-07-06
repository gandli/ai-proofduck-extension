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

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="启用免费翻译兜底"
        onClick={handleToggle}
        className={[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1',
          enabled ? 'bg-yellow-400' : 'bg-slate-300',
        ].join(' ')}
      >
        {/* 圆点 thumb */}
        <span
          aria-hidden="true"
          className={[
            'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
      <span className="ml-2 text-sm align-middle text-slate-700">
        {enabled ? '已启用' : '已关闭'}
      </span>
    </section>
  );
}
