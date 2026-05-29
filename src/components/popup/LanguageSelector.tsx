/**
 * LanguageSelector 组件 - 语言选择器
 * 支持无障碍访问
 */
import { useState, useId } from 'react';

export interface Language {
  code: string;
  name: string;
}

interface LanguageSelectorProps {
  sourceLang: string;
  targetLang: string;
  onSourceChange: (lang: string) => void;
  onTargetChange: (lang: string) => void;
  showAutoDetect?: boolean;
}

// 常用语言列表
export const LANGUAGES: Language[] = [
  { code: 'auto', name: '自动检测' },
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
];

export function LanguageSelector({
  sourceLang,
  targetLang,
  onSourceChange,
  onTargetChange,
  showAutoDetect = true,
}: LanguageSelectorProps) {
  const [swapLoading, setSwapLoading] = useState(false);
  const sourceSelectId = useId();
  const targetSelectId = useId();

  // 交换源语言和目标语言
  const handleSwap = () => {
    if (sourceLang === 'auto') return;
    setSwapLoading(true);
    onSourceChange(targetLang);
    onTargetChange(sourceLang);
    setTimeout(() => setSwapLoading(false), 200);
  };

  const filteredTargetLangs = LANGUAGES.filter(
    (lang) => lang.code !== sourceLang && lang.code !== 'auto'
  );

  return (
    <div className="flex items-center gap-2" role="group" aria-label="语言选择">
      {/* 源语言 */}
      <div className="flex-1">
        <label htmlFor={sourceSelectId} className="sr-only">
          源语言
        </label>
        <select
          id={sourceSelectId}
          value={sourceLang}
          onChange={(e) => onSourceChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange"
          aria-label="源语言"
        >
          {showAutoDetect && (
            <option value="auto">自动检测</option>
          )}
          {LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* 交换按钮 */}
      <button
        onClick={handleSwap}
        disabled={sourceLang === 'auto'}
        className={`
          p-2 rounded-lg border border-gray-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 focus-visible:ring-offset-1
          ${sourceLang === 'auto' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:border-brand-orange'}
          ${swapLoading ? 'animate-spin' : ''}
        `}
        title="交换语言"
        aria-label="交换源语言和目标语言"
        aria-disabled={sourceLang === 'auto'}
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 text-gray-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
        </svg>
      </button>

      {/* 目标语言 */}
      <div className="flex-1">
        <label htmlFor={targetSelectId} className="sr-only">
          目标语言
        </label>
        <select
          id={targetSelectId}
          value={targetLang}
          onChange={(e) => onTargetChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange"
          aria-label="目标语言"
        >
          {filteredTargetLangs.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default LanguageSelector;