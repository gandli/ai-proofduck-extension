/**
 * SpeechService - 语音朗读服务
 * 基于 Web Speech API 实现 TTS 功能
 */

// 语音配置接口
export interface SpeechConfig {
  /** 语言代码 */
  lang: string;
  /** 语速 (0.1 - 10) */
  rate: number;
  /** 音调 (0 - 2) */
  pitch: number;
  /** 音量 (0 - 1) */
  volume: number;
  /** 语音名称 */
  voiceName?: string;
}

// 默认语音配置
export const defaultSpeechConfig: SpeechConfig = {
  lang: 'zh-CN',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

// 语言代码映射
export const LANGUAGE_VOICE_MAP: Record<string, string> = {
  'zh': 'zh-CN',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-HK',
  'en': 'en-US',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  'ja': 'ja-JP',
  'ja-JP': 'ja-JP',
  'ko': 'ko-KR',
  'ko-KR': 'ko-KR',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'es': 'es-ES',
  'ru': 'ru-RU',
};

// 获取目标语言对应的语音
function getLanguageVoice(lang: string): string {
  return LANGUAGE_VOICE_MAP[lang] || lang || 'zh-CN';
}

// 朗读状态
export type SpeechStatus = 'idle' | 'speaking' | 'paused';

// SpeechService 类
class SpeechService {
  private config: SpeechConfig;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private status: SpeechStatus = 'idle';
  private listeners: Set<(status: SpeechStatus) => void> = new Set();
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;

  constructor(config?: Partial<SpeechConfig>) {
    this.config = { ...defaultSpeechConfig, ...config };
    this.loadVoices();
  }

  // 加载可用语音列表
  private loadVoices(): void {
    const loadVoices = () => {
      this.voices = speechSynthesis.getVoices();
      this.voicesLoaded = this.voices.length > 0;
    };

    // 尝试立即获取
    loadVoices();

    // 如果语音列表为空，等待voiceschanged事件
    if (!this.voicesLoaded) {
      speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
    }
  }

  // 获取配置
  getConfig(): SpeechConfig {
    return { ...this.config };
  }

  // 更新配置
  setConfig(config: Partial<SpeechConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 获取当前状态
  getStatus(): SpeechStatus {
    return this.status;
  }

  // 订阅状态变化
  subscribe(listener: (status: SpeechStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 通知状态变化
  private notifyStatusChange(): void {
    this.listeners.forEach((listener) => listener(this.status));
  }

  // 获取可用语音列表
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  // 根据语言获取最佳语音
  private getBestVoice(lang: string): SpeechSynthesisVoice | null {
    const targetLang = getLanguageVoice(lang);

    // 优先查找完全匹配的语言
    let bestVoice = this.voices.find(
      (voice) => voice.lang.toLowerCase() === targetLang.toLowerCase()
    );

    // 如果没有完全匹配，查找语言前缀匹配
    if (!bestVoice) {
      const langPrefix = targetLang.split('-')[0];
      bestVoice = this.voices.find(
        (voice) => voice.lang.toLowerCase().startsWith(langPrefix.toLowerCase())
      );
    }

    return bestVoice;
  }

  // 开始朗读
  speak(text: string, lang?: string): void {
    // 如果正在朗读，先停止
    if (this.status === 'speaking') {
      this.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // 设置语音参数
    utterance.lang = lang ? getLanguageVoice(lang) : this.config.lang;
    utterance.rate = this.config.rate;
    utterance.pitch = this.config.pitch;
    utterance.volume = this.config.volume;

    // 尝试设置特定语音
    const voice = this.getBestVoice(utterance.lang);
    if (voice) {
      utterance.voice = voice;
    }

    // 事件处理
    utterance.onstart = () => {
      this.status = 'speaking';
      this.notifyStatusChange();
    };

    utterance.onend = () => {
      this.status = 'idle';
      this.currentUtterance = null;
      this.notifyStatusChange();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      this.status = 'idle';
      this.currentUtterance = null;
      this.notifyStatusChange();
    };

    this.currentUtterance = utterance;
    this.status = 'speaking';
    speechSynthesis.speak(utterance);
    this.notifyStatusChange();
  }

  // 暂停朗读
  pause(): void {
    if (this.status === 'speaking') {
      speechSynthesis.pause();
      this.status = 'paused';
      this.notifyStatusChange();
    }
  }

  // 恢复朗读
  resume(): void {
    if (this.status === 'paused') {
      speechSynthesis.resume();
      this.status = 'speaking';
      this.notifyStatusChange();
    }
  }

  // 停止朗读
  cancel(): void {
    speechSynthesis.cancel();
    this.status = 'idle';
    this.currentUtterance = null;
    this.notifyStatusChange();
  }

  // 切换朗读状态
  toggle(text: string, lang?: string): void {
    if (this.status === 'speaking') {
      this.cancel();
    } else {
      this.speak(text, lang);
    }
  }
}

// 导出单例
export const speechService = new SpeechService();

export default SpeechService;