/**
 * TranslationTab 组件 - 翻译/校对/润色/扩写 Tab 内容
 * 支持键盘导航和 ARIA 属性
 */
import { useState, useCallback, useId } from 'react';
import type { AIMode } from '@/types';
import { t } from '@/i18n';
import { LanguageSelector } from './LanguageSelector';

interface TranslationTabProps {
  mode: AIMode;
  sourceLang: string;
  targetLang: string;
  onSourceLangChange: (lang: string) => void;
  onTargetLangChange: (lang: string) => void;
  onSubmit: (text: string) => void;
  loading?: boolean;
  result?: string;
  error?: string;
}

// 根据模式获取按钮文案
function getButtonText(mode: AIMode): string {
  switch (mode) {
    case 'translate':
      return 'tabStartTranslate';
    case 'proofread':
      return 'tabStartProofread';
    case 'polish':
      return 'tabStartPolish';
    case 'expand':
      return 'tabStartExpand';
    default:
      return 'tabStartTranslate';
  }
}

// 根据模式获取输入框占位符
function getPlaceholder(mode: AIMode): string {
  switch (mode) {
    case 'translate':
      return 'tabInputPlaceholder';
    case 'proofread':
      return 'tabProofreadPlaceholder';
    case 'polish':
      return 'tabPolishPlaceholder';
    case 'expand':
      return 'tabExpandPlaceholder';
    default:
      return 'tabInputPlaceholder';
  }
}

// 根据模式获取 ARIA 标签
function getAriaLabel(mode: AIMode): string {
  switch (mode) {
    case 'translate':
      return '翻译文本输入';
    case 'proofread':
      return '校对文本输入';
    case 'polish':
      return '润色文本输入';
    case 'expand':
      return '扩写文本输入';
    default:
      return '文本输入';
  }
}

export function TranslationTab({
  mode,
  sourceLang,
  targetLang,
  onSourceLangChange,
  onTargetLangChange,
  onSubmit,
  loading = false,
  result,
  error,
}: TranslationTabProps) {
  const [inputText, setInputText] = useState('');
  const textareaId = useId();
  const errorId = useId();
  const resultId = useId();

  const handleSubmit = useCallback(() => {
    if (!inputText.trim() || loading) return;
    onSubmit(inputText.trim());
  }, [inputText, loading, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = inputText.length;
  const showLanguageSelector = mode === 'translate';

  return (
    <div
      className="flex flex-col h-full"
      role="tabpanel"
      id={`panel-${mode}`}
      aria-labelledby={`tab-${mode}`}
    >
      {/* 语言选择器 - 仅翻译模式显示 */}
      {showLanguageSelector && (
        <div className="px-4 py-3 border-b border-gray-200">
          <LanguageSelector
            sourceLang={sourceLang}
            targetLang={targetLang}
            onSourceChange={onSourceLangChange}
            onTargetChange={onTargetLangChange}
            showAutoDetect={true}
          />
        </div>
      )}

      {/* 原文输入框 */}
      <div className="flex-1 p-4 flex flex-col min-h-0">
        <div className="flex-1 relative">
          <textarea
            id={textareaId}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(getPlaceholder(mode))}
            className="w-full h-full resize-none rounded-lg border border-gray-300 p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange"
            disabled={loading}
            aria-label={getAriaLabel(mode)}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            aria-readonly={loading}
          />
          {inputText.length > 0 && (
            <button
              onClick={() => {
                setInputText('');
                document.getElementById(textareaId)?.focus();
              }}
              className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              aria-label={t('clear') || '清空输入'}
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* 字符数显示 */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span aria-live="polite">{charCount} 字符</span>
          <span>⌘ + Enter {t('tabSubmit')}</span>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          id={errorId}
          className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {/* 结果展示框 */}
      {result && (
        <div
          id={resultId}
          className="mx-4 mb-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 max-h-32 overflow-y-auto"
          aria-live="polite"
        >
          <div className="font-medium text-xs text-gray-500 mb-1">{t('tabResult')}</div>
          <div className="whitespace-pre-wrap">{result}</div>
        </div>
      )}

      {/* 底部按钮 */}
      <div className="px-4 pb-4">
        <button
          onClick={handleSubmit}
          disabled={!inputText.trim() || loading}
          className={`
            w-full py-3 rounded-lg font-medium text-white transition-all
            flex items-center justify-center gap-2
            ${
              loading
                ? 'bg-brand-orange/70 cursor-wait'
                : inputText.trim()
                ? 'bg-brand-orange hover:bg-brand-orange/90 active:scale-[0.98]'
                : 'bg-gray-300 cursor-not-allowed'
            }
          `}
          aria-busy={loading}
          type="button"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>{t('tabProcessing')}</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">🌐</span>
              <span>{t(getButtonText(mode))}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default TranslationTab;