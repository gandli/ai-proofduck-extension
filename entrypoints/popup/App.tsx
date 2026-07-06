/**
 * Popup App: 迷你 UI，快速触发
 * - 显示品牌
 * - 显示当前选中的文本（若有）
 * - 一键打开侧边栏做长文本处理
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

  return (
    <div className="w-72 p-4 space-y-3 bg-white text-slate-900">
      <header className="flex items-center gap-2">
        <img src="/icons/icon-32.png" alt="" className="w-6 h-6" />
        <h1 className="text-base font-semibold">校对鸭 · ProofDuck</h1>
      </header>

      {selectedText && (
        <p className="text-xs text-slate-600 line-clamp-3">
          已选中：{selectedText.slice(0, 80)}
        </p>
      )}

      <Button variant="primary" onClick={openSidePanel} className="w-full">
        打开侧边栏
      </Button>
    </div>
  );
}
