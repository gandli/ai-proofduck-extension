/**
 * 翻译结果浮层组件
 * 支持流式输出显示、复制、朗读、关闭等功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { t } from '@/i18n';
import { speechService } from '@/services/SpeechService';

interface Props {
  /** 原始文本 */
  originalText: string;
  /** 翻译结果文本 */
  resultText: string;
  /** 引擎名称 */
  engineName?: string;
  /** 响应时间（秒） */
  duration?: number;
  /** 浮层位置 */
  position: { x: number; y: number };
  /** 是否正在流式输出 */
  isStreaming?: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 复制回调 */
  onCopy?: (text: string) => void;
  /** 重试回调 */
  onRetry?: () => void;
  /** 打开侧边栏回调 */
  onOpenSidebar?: () => void;
}

/**
 * 翻译结果浮层组件
 */
export function TranslationResultLayer({
  originalText: _originalText,
  resultText,
  engineName = '翻译引擎',
  duration,
  position,
  isStreaming = false,
  onClose,
  onCopy,
  onRetry,
  onOpenSidebar,
}: Props) {
  // 流式输出显示的文本
  const [displayedText, setDisplayedText] = useState('');
  // 复制状态
  const [copied, setCopied] = useState(false);
  // 朗读状态
  const [speaking, setSpeaking] = useState(false);
  // ref to track if component is mounted
  const mountedRef = useRef(true);
  // ref for streaming interval
  const streamingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 计算浮层位置（确保在可视区域内）
  const calculatePosition = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 默认浮层尺寸
    const layerWidth = 360;
    const layerHeight = 200;

    let x = position.x;
    let y = position.y;

    // 水平方向调整
    if (x + layerWidth > viewportWidth - 20) {
      x = viewportWidth - layerWidth - 20;
    }
    if (x < 20) {
      x = 20;
    }

    // 垂直方向调整
    if (y + layerHeight > viewportHeight - 20) {
      y = position.y - layerHeight - 20; // 显示在鼠标上方
    }
    if (y < 20) {
      y = 20;
    }

    return { x, y };
  }, [position]);

  const { x, y } = calculatePosition();

  // 流式输出效果
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(resultText);
      return;
    }

    // 模拟流式输出
    let currentIndex = 0;
    setDisplayedText('');

    streamingRef.current = setInterval(() => {
      if (currentIndex <= resultText.length && mountedRef.current) {
        setDisplayedText(resultText.substring(0, currentIndex));
        currentIndex += 3; // 每次显示3个字符
      } else if (mountedRef.current) {
        setDisplayedText(resultText);
        if (streamingRef.current) {
          clearInterval(streamingRef.current);
        }
      }
    }, 30);

    return () => {
      if (streamingRef.current) {
        clearInterval(streamingRef.current);
      }
    };
  }, [resultText, isStreaming]);

  // 组件卸载时清理
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (streamingRef.current) {
        clearInterval(streamingRef.current);
      }
    };
  }, []);

  // 复制文本
  const handleCopy = useCallback(() => {
    const textToCopy = displayedText || resultText;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.(textToCopy);
    });
  }, [displayedText, resultText, onCopy]);

  // 朗读文本
  const handleSpeak = useCallback(() => {
    if (speaking) {
      speechService.cancel();
      setSpeaking(false);
      return;
    }

    const textToSpeak = displayedText || resultText;
    speechService.speak(textToSpeak);

    // 监听朗读状态变化
    const unsubscribe = speechService.subscribe((status) => {
      setSpeaking(status === 'speaking');
    });

    // 组件卸载时取消订阅
    return () => {
      unsubscribe();
    };
  }, [speaking, displayedText, resultText]);

  // 处理关闭
  const handleClose = useCallback(() => {
    // 停止朗读
    if (speaking) {
      speechService.cancel();
    }
    onClose();
  }, [speaking, onClose]);

  // 监听点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.proofduck-translation-layer')) {
        // 延迟关闭，避免点击按钮时触发
        setTimeout(handleClose, 100);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClose]);

  return (
    <div
      className="proofduck-translation-layer"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        width: '360px',
        maxWidth: '90vw',
        maxHeight: '300px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 2147483647,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#FF5A11',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🌐</span>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{engineName}</span>
          {duration !== undefined && (
            <span style={{ fontSize: '11px', opacity: 0.8 }}>{duration.toFixed(1)}s</span>
          )}
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '16px',
            lineHeight: 1,
            opacity: 0.8,
          }}
          title={t('close') || '关闭'}
          aria-label={t('close') || '关闭'}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {/* 流式输出区域 */}
      <div
        style={{
          flex: 1,
          padding: '12px',
          overflowY: 'auto',
          fontSize: '14px',
          lineHeight: 1.6,
          color: '#333',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {displayedText}
        {isStreaming && (
          <span
            style={{
              display: 'inline-block',
              width: '2px',
              height: '14px',
              backgroundColor: '#FF5A11',
              marginLeft: '2px',
              animation: 'blink 1s infinite',
            }}
          />
        )}
      </div>

      {/* 操作按钮栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderTop: '1px solid #f0f0f0',
          backgroundColor: '#fafafa',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* 复制按钮 */}
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: copied ? '#4caf50' : '#f0f0f0',
              color: copied ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s',
            }}
            type="button"
          >
            <span aria-hidden="true">📋</span> {copied ? (t('copied') || '已复制') : t('copy') || '复制'}
          </button>

          {/* 朗读按钮 */}
          <button
            onClick={handleSpeak}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: speaking ? '#FF5A11' : '#f0f0f0',
              color: speaking ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s',
            }}
            type="button"
          >
            <span aria-hidden="true">🔊</span> {speaking ? (t('speaking') || '朗读中') : t('speak') || '朗读'}
          </button>

          {/* 重试按钮 */}
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#f0f0f0',
                color: '#333',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s',
              }}
              type="button"
            >
              <span aria-hidden="true">↻</span> {t('retry') || '重试'}
            </button>
          )}
        </div>

        {/* 打开侧边栏按钮 */}
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#FF5A11',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s',
            }}
            type="button"
          >
            <span aria-hidden="true">📖</span> {t('openSidebar') || '侧边栏'}
          </button>
        )}
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default TranslationResultLayer;
