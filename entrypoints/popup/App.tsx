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
 *   │  🦆  校对鸭                 │
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
    if (typeof chrome !== 'undefined' && chrome.sidePanel?.open) {
      // chrome.windows 在测试 / 非扩展上下文可能为 undefined，
      // 必须双重 ?. 才能避免 `.then(...)` on undefined 抛 TypeError
      chrome.windows?.getCurrent()?.then((win: chrome.windows.Window) => {
        if (win.id !== undefined) chrome.sidePanel.open({ windowId: win.id });
      });
    }
  };

  const openOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  };

  return (
    <div className="w-72 bg-white text-ink-800">
      {/* 品牌 header：带米白→白渐变，突出鸭子 logo */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-ink-200 bg-gradient-to-b from-brand-50 to-white">
        <img
          src="/icons/icon-32.png"
          alt=""
          className="w-8 h-8 rounded-lg shadow-brand-lg"
        />
        <div>
          <h1 className="text-base font-bold font-serif text-ink-900 leading-none">校对鸭</h1>
          <p className="text-[11px] text-ink-400 mt-1">v0.4 · 隐私优先翻译</p>
        </div>
      </header>

      <div className="p-4 space-y-2">
        {selectedText && (
          <div className="rounded-md bg-brand-50 border border-brand-200 px-3 py-2 text-xs text-ink-700 line-clamp-3">
            <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 font-semibold">
              已选中
            </div>
            {selectedText.slice(0, 80)}
          </div>
        )}

        <Button variant="primary" onClick={openSidePanel} className="w-full justify-center">
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
