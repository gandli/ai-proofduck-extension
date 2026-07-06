/**
 * useSelection: 追踪当前文档的选中文本
 *
 * 应用场景：
 * - Popup / SidePanel 里读取用户在当前页选中的文本作为初始输入
 * - 未来划词浮标（floatingIcon）会用同一个 hook
 *
 * 实现：
 * - 订阅 document 的 selectionchange 事件（比 window.mouseup 更精准）
 * - 卸载时清理监听器，避免泄漏
 */
import { useEffect, useState } from 'react';

export function useSelection() {
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const onChange = () => {
      const text = window.getSelection()?.toString() ?? '';
      setSelectedText(text);
    };
    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  }, []);

  return { selectedText };
}
