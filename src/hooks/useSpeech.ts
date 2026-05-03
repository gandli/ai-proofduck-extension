/**
 * useSpeech - 语音朗读 Hook
 * 基于 SpeechService 提供语音朗读功能
 */

import { useState, useEffect, useCallback } from 'react';
import { speechService, SpeechConfig, SpeechStatus } from '../services/SpeechService';

interface UseSpeechOptions {
  /** 默认语言 */
  defaultLang?: string;
  /** 初始配置 */
  config?: Partial<SpeechConfig>;
}

interface UseSpeechReturn {
  /** 是否正在朗读 */
  isSpeaking: boolean;
  /** 朗读状态 */
  status: SpeechStatus;
  /** 朗读文本 */
  currentText: string | null;
  /** 开始朗读 */
  speak: (text: string, lang?: string) => void;
  /** 暂停朗读 */
  pause: () => void;
  /** 恢复朗读 */
  resume: () => void;
  /** 停止朗读 */
  cancel: () => void;
  /** 切换朗读状态 */
  toggle: (text: string, lang?: string) => void;
  /** 获取当前配置 */
  getConfig: () => SpeechConfig;
  /** 更新配置 */
  setConfig: (config: Partial<SpeechConfig>) => void;
}

/**
 * 语音朗读 Hook
 *
 * @example
 * ```tsx
 * const { isSpeaking, speak, cancel } = useSpeech({ defaultLang: 'zh-CN' });
 *
 * // 朗读文本
 * speak('你好，世界！');
 *
 * // 停止朗读
 * cancel();
 * ```
 */
export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const { defaultLang = 'zh-CN', config } = options;

  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [currentText, setCurrentText] = useState<string | null>(null);

  // 初始化配置
  useEffect(() => {
    if (config) {
      speechService.setConfig(config);
    }
  }, [config]);

  // 订阅状态变化
  useEffect(() => {
    const unsubscribe = speechService.subscribe((newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'idle') {
        setCurrentText(null);
      }
    });

    // 初始化状态
    setStatus(speechService.getStatus());

    return unsubscribe;
  }, []);

  // 开始朗读
  const speak = useCallback(
    (text: string, lang?: string) => {
      setCurrentText(text);
      speechService.speak(text, lang || defaultLang);
    },
    [defaultLang]
  );

  // 暂停朗读
  const pause = useCallback(() => {
    speechService.pause();
  }, []);

  // 恢复朗读
  const resume = useCallback(() => {
    speechService.resume();
  }, []);

  // 停止朗读
  const cancel = useCallback(() => {
    speechService.cancel();
    setCurrentText(null);
  }, []);

  // 切换朗读状态
  const toggle = useCallback(
    (text: string, lang?: string) => {
      setCurrentText(text);
      speechService.toggle(text, lang || defaultLang);
    },
    [defaultLang]
  );

  // 获取配置
  const getConfig = useCallback(() => {
    return speechService.getConfig();
  }, []);

  // 更新配置
  const setConfig = useCallback((newConfig: Partial<SpeechConfig>) => {
    speechService.setConfig(newConfig);
  }, []);

  return {
    isSpeaking: status === 'speaking',
    status,
    currentText,
    speak,
    pause,
    resume,
    cancel,
    toggle,
    getConfig,
    setConfig,
  };
}

export default useSpeech;