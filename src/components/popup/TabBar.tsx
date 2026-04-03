/**
 * TabBar 组件 - 功能切换
 * 支持键盘导航和 ARIA 属性
 */
import { useCallback, useRef } from 'react';
import type { AIMode } from '@/types';
import { t } from '@/i18n';

interface TabBarProps {
  activeTab: AIMode;
  onTabChange: (tab: AIMode) => void;
}

const TABS: { key: AIMode; icon: string; labelKey: string }[] = [
  { key: 'translate', icon: '🌐', labelKey: 'tabTranslate' },
  { key: 'proofread', icon: '✏️', labelKey: 'tabProofread' },
  { key: 'polish', icon: '✨', labelKey: 'tabPolish' },
  { key: 'expand', icon: '📝', labelKey: 'tabExpand' },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 键盘导航处理
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let newIndex = index;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = index > 0 ? index - 1 : TABS.length - 1;
          break;
        case 'ArrowRight':
          e.preventDefault();
          newIndex = index < TABS.length - 1 ? index + 1 : 0;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = TABS.length - 1;
          break;
        default:
          return;
      }

      const tab = TABS[newIndex];
      if (tab) {
        onTabChange(tab.key);
        tabRefs.current[newIndex]?.focus();
      }
    },
    [onTabChange]
  );

  return (
    <div
      className="flex border-b border-gray-200 bg-white"
      role="tablist"
      aria-label="功能选项卡"
    >
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.key}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2
              text-sm font-medium transition-colors
              border-b-2 -mb-px
              ${
                isActive
                  ? 'border-brand-orange text-brand-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

export default TabBar;