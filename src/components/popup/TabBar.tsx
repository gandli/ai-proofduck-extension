/**
 * TabBar 组件 - 功能切换
 */
import type { AIMode } from '@/types';

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
  return (
    <div className="flex border-b border-gray-200 bg-white">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2
            text-sm font-medium transition-colors
            border-b-2 -mb-px
            ${
              activeTab === tab.key
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
        >
          <span>{tab.icon}</span>
          <span>{tab.labelKey}</span>
        </button>
      ))}
    </div>
  );
}

export default TabBar;