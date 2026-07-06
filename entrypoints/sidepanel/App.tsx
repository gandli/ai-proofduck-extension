/**
 * SidePanel App: 长文本主战场
 * - 输入框（M2 起支持粘贴、拖入 md/txt）
 * - 模式切换（M2）
 * - 结果区（M2）
 */
import { useState } from 'react';
import { Button } from '@components/Button';

export default function SidePanelApp() {
  const [text, setText] = useState('');

  return (
    <div className="min-h-screen p-4 space-y-3 bg-white text-slate-900">
      <header className="flex items-center gap-2">
        <img src="/icons/icon-32.png" alt="" className="w-6 h-6" />
        <h1 className="text-lg font-semibold">校对鸭 · 侧边栏</h1>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="在这里粘贴要翻译 / 摘要 / 校对的文本…"
        className="w-full min-h-[240px] rounded-md border border-slate-300 p-2 text-sm resize-y"
      />

      <div className="flex gap-2">
        <Button variant="primary" disabled>
          翻译（M2）
        </Button>
        <Button variant="ghost" onClick={() => setText('')}>
          清空
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        M1 骨架版：引擎将在 M2 上线（Chrome AI → WebLLM → WASM → OpenAI 兼容 → 免费翻译）
      </p>
    </div>
  );
}
