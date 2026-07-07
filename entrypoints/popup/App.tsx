/**
 * Popup App (v0.4 UI 重设计): 迷你启动器
 *
 * 设计目标：
 * - 品牌形象一屏建立（logo + 名字 + slogan）
 * - 主 CTA "打开侧边栏" 是黄底渐变，视觉焦点
 * - 附带 "设置" 快捷入口（次要按钮）
 * - 选中文字预览（若有）
 *
 * 布局：
 *   ┌─── 品牌 header ────────────┐
 *   │  [logo]  校对鸭            │
 *   │      v0.4 · 隐私优先翻译    │
 *   ├─── (若有选中) 预览 ─────────┤
 *   ├─── 主 CTA ─────────────────┤
 *   │  [⇱ 打开侧边栏]  primary   │
 *   ├─── 次级 ───────────────────┤
 *   │  [⚙  设置]         secondary│
 *   └────────────────────────────┘
 */
import { useSelection } from '@hooks/useSelection';
import { Button } from '@components/Button';

export default function PopupApp() {
  const { selectedText } = useSelection();

  const openSidePanel = () => {
    // chrome.* 全局在部分工具链下会被 ESLint 判为 error 类型；
    // 显式绑定到 typeof chrome，同时保留运行时守卫（非扩展上下文 undefined）
    const c: typeof chrome | undefined = (globalThis as { chrome?: typeof chrome }).chrome;
    if (!c?.sidePanel?.open) return;
    // chrome.windows 在测试 / 非扩展上下文可能为 undefined，
    // 双重 ?. 才能避免 `.then(...)` on undefined 抛 TypeError
    c.windows
      ?.getCurrent()
      .then((win: chrome.windows.Window) => {
        if (win.id !== undefined) void c.sidePanel.open({ windowId: win.id });
      })
      .catch(() => {
        /* 忽略非扩展环境 */
      });
  };

  const openOptions = () => {
    const c: typeof chrome | undefined = (globalThis as { chrome?: typeof chrome }).chrome;
    if (c?.runtime?.openOptionsPage) {
      // MV3 中 openOptionsPage() 返回 Promise，void 前缀显式忽略
      void c.runtime.openOptionsPage();
    }
  };

  return (
    <div className="w-80 bg-beige-50 text-ink-warm">
      {/* 品牌 header：毛绒鸭 + 天空底 + 呼吸动画 */}
      <header className="pd-plush-sky flex items-center gap-3 px-4 py-3.5 border-b border-brand-100">
        <span className="pd-plush-logo-wrap" aria-hidden>
          <img src="/icons/icon-32.png" alt="" />
        </span>
        <div>
          <h1 className="text-base font-bold font-serif text-ink-900 leading-none">校对鸭</h1>
          <p className="text-[11px] text-ink-500 mt-1.5">你的贴心写作小助手</p>
        </div>
      </header>

      <div className="p-4 space-y-2.5">
        {selectedText && (
          <div className="pd-plush-output px-3 py-2.5 text-xs text-ink-700 line-clamp-3">
            <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 font-semibold">
              已选中
            </div>
            {selectedText.slice(0, 80)}
          </div>
        )}

        <Button variant="primary" onClick={openSidePanel} className="w-full justify-center py-2.5">
          <span aria-hidden>⇱</span>
          <span>打开侧边栏</span>
        </Button>

        <Button variant="secondary" onClick={openOptions} className="w-full justify-center">
          <span aria-hidden>⚙</span>
          <span>设置</span>
        </Button>
      </div>
    </div>
  );
}
