/**
 * SpeechService - 语音朗读服务
 * 支持 Chrome Speech Synthesis 和 Edge TTS (WebSocket)
 */

// TTS 提供商类型
export type TTSProvider = 'chrome' | 'edge';

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
  /** TTS 提供商 */
  provider?: TTSProvider;
}

// Edge TTS 语音映射
export interface EdgeVoice {
  name: string;
  lang: string;
  gender: string;
  friendlyName: string;
}

// Edge TTS 可用语音列表
export const EDGE_VOICES: EdgeVoice[] = [
  // 中文语音
  { name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)', lang: 'zh-CN', gender: 'Female', friendlyName: '晓晓' },
  { name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiNeural)', lang: 'zh-CN', gender: 'Male', friendlyName: '云希' },
  { name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YundaNeural)', lang: 'zh-CN', gender: 'Female', friendlyName: '云丹' },
  { name: 'Microsoft Server Speech Text to Speech Voice (zh-TW, YatingNeural)', lang: 'zh-TW', gender: 'Female', friendlyName: '雅婷' },
  { name: 'Microsoft Server Speech Text to Speech Voice (zh-TW, HanhanNeural)', lang: 'zh-TW', gender: 'Male', friendlyName: '涵涵' },
  // 英语语音
  { name: 'Microsoft Server Speech Text to Speech Voice (en-US, JennyNeural)', lang: 'en-US', gender: 'Female', friendlyName: 'Jenny' },
  { name: 'Microsoft Server Speech Text to Speech Voice (en-US, GuyNeural)', lang: 'en-US', gender: 'Male', friendlyName: 'Guy' },
  { name: 'Microsoft Server Speech Text to Speech Voice (en-GB, SoniaNeural)', lang: 'en-GB', gender: 'Female', friendlyName: 'Sonia' },
  { name: 'Microsoft Server Speech Text to Speech Voice (en-GB, RyanNeural)', lang: 'en-GB', gender: 'Male', friendlyName: 'Ryan' },
  // 日语语音
  { name: 'Microsoft Server Speech Text to Speech Voice (ja-JP, NanamiNeural)', lang: 'ja-JP', gender: 'Female', friendlyName: '七海' },
  { name: 'Microsoft Server Speech Text to Speech Voice (ja-JP, KeitaNeural)', lang: 'ja-JP', gender: 'Male', friendlyName: '健太' },
  // 韩语语音
  { name: 'Microsoft Server Speech Text to Speech Voice (ko-KR, SunHiNeural)', lang: 'ko-KR', gender: 'Female', friendlyName: '善姬' },
  { name: 'Microsoft Server Speech Text to Speech Voice (ko-KR, InJoonNeural)', lang: 'ko-KR', gender: 'Male', friendlyName: '寅俊' },
  // 其他常用语音
  { name: 'Microsoft Server Speech Text to Speech Voice (fr-FR, DeniseNeural)', lang: 'fr-FR', gender: 'Female', friendlyName: 'Denise' },
  { name: 'Microsoft Server Speech Text to Speech Voice (de-DE, KatjaNeural)', lang: 'de-DE', gender: 'Female', friendlyName: 'Katja' },
  { name: 'Microsoft Server Speech Text to Speech Voice (es-ES, ElviraNeural)', lang: 'es-ES', gender: 'Female', friendlyName: 'Elvira' },
  { name: 'Microsoft Server Speech Text to Speech Voice (ru-RU, SvetlanaNeural)', lang: 'ru-RU', gender: 'Female', friendlyName: 'Svetlana' },
];

// 默认语音配置
export const defaultSpeechConfig: SpeechConfig = {
  lang: 'zh-CN',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  provider: 'chrome',
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

// 获取 Edge TTS 语音
function getEdgeVoice(lang: string): EdgeVoice {
  const langCode = getLanguageVoice(lang);
  // 优先查找完全匹配
  let voice = EDGE_VOICES.find(v => v.lang.toLowerCase() === langCode.toLowerCase());
  if (voice) return voice;
  // 其次查找前缀匹配
  const prefix = langCode.split('-')[0] || '';
  voice = EDGE_VOICES.find(v => v.lang.toLowerCase().startsWith(prefix.toLowerCase()));
  if (voice) return voice;
  // 默认返回第一个 (中文晓晓)
  return EDGE_VOICES[0]!;
}

// 朗读状态
export type SpeechStatus = 'idle' | 'speaking' | 'paused';

/**
 * Edge TTS Provider - 通过 WebSocket 连接 Edge TTS 服务
 */
class EdgeTTSProvider {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;

  /**
   * 将文本转换为 Edge TTS SSML
   */
  private buildSsml(text: string, voice: EdgeVoice, rate: number, pitch: number, volume: number): string {
    // 转换语速: Chrome rate (0.1-10) -> Edge TTS rate (百分比)
    const ratePercent = Math.round((rate - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    // 转换音调: Chrome pitch (0-2) -> Edge TTS pitch (Hz adjustment)
    const pitchHz = Math.round((pitch - 1) * 50);
    const pitchStr = pitchHz >= 0 ? `+${pitchHz}Hz` : `${pitchHz}Hz`;

    // 音量: Chrome volume (0-1) -> Edge TTS volume (百分比)
    const volumePercent = Math.round(volume * 100);
    const volumeStr = `+${volumePercent}%`;

    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${voice.lang}'>` +
      `<voice name='${voice.name}'>` +
      `<prosody rate='${rateStr}' pitch='${pitchStr}' volume='${volumeStr}'>` +
      `${this.escapeXml(text)}` +
      `</prosody></voice></speak>`;

    return ssml;
  }

  /**
   * 转义 XML 特殊字符
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 生成 GUID
   */
  private generateGuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const array = new Uint8Array(1);
        crypto.getRandomValues(array);
        const r = (array[0] ?? 0) & 15;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 使用 Edge TTS 朗读文本
   */
  async speak(
    text: string,
    lang: string,
    rate: number,
    pitch: number,
    volume: number,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    // 停止之前的播放
    await this.cancel();

    const voice = getEdgeVoice(lang);
    const ssml = this.buildSsml(text, voice, rate, pitch, volume);

    return new Promise((resolve, reject) => {
      try {
        // 初始化 AudioContext
        this.audioContext = new AudioContext();
        this.audioBuffer = [];
        this.isPlaying = true;

        // 构建 WebSocket URL
        const timestamp = new Date().toISOString();
        const requestId = this.generateGuid();
        const wsUrl = `wss://speech.platform.bing.com/edgeservice/v1/stream?` +
          `Authorization=Bearer+placeholder&` +
          `Content-Type=application%2Fjson%3B%20charset%3Dutf-8&` +
          `X-Timestamp=${encodeURIComponent(timestamp)}&` +
          `X-RequestId=${requestId}&` +
          `preroll=0ms&` +
          `InitialSilenceTimeout=0ms&` +
          `EndSilenceTimeout=0ms&` +
          `locale=${encodeURIComponent(voice.lang)}&` +
          `format=audio-24khz-48kbitrate-mono-mp3&` +
          `voice=${encodeURIComponent(voice.name)}`;

        this.ws = new WebSocket(wsUrl, ['media.bing.com']);

        // 发送配置
        this.ws.onopen = () => {
          const configMessage = {
            context: {
              synthesis: {
                audio: {
                  outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
                },
              },
            },
          };
          this.ws?.send(JSON.stringify(configMessage));
          // 发送 SSML
          this.ws?.send(ssml);
        };

        // 接收音频数据
        this.ws.onmessage = async (event) => {
          if (typeof event.data === 'string') {
            // 跳过 ping 消息和 Path 消息
            if (event.data === '' || event.data.startsWith('Path:')) {
              return;
            }
          } else if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
            try {
              let arrayBuffer: ArrayBuffer;
              if (event.data instanceof Blob) {
                arrayBuffer = await event.data.arrayBuffer();
              } else {
                arrayBuffer = event.data;
              }

              if (arrayBuffer.byteLength > 0) {
                const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer.slice(0));
                this.audioBuffer.push(audioBuffer);
              }
            } catch (err) {
              console.warn('Edge TTS audio decode warning:', err);
            }
          }
        };

        // WebSocket 关闭时播放音频
        this.ws.onclose = async () => {
          if (this.audioBuffer.length > 0 && this.isPlaying) {
            onStart?.();

            // 合并所有音频片段
            const totalLength = this.audioBuffer.reduce((acc, buf) => acc + buf.length, 0);
            const firstBuffer = this.audioBuffer[0];
            if (!firstBuffer) {
              onEnd?.();
              resolve();
              return;
            }
            const combinedBuffer = this.audioContext!.createBuffer(
              1, // mono
              totalLength,
              firstBuffer.sampleRate
            );

            let offset = 0;
            for (const buffer of this.audioBuffer) {
              combinedBuffer.copyFromChannel(
                new Float32Array(buffer.getChannelData(0)),
                0,
                offset
              );
              offset += buffer.length;
            }

            // 播放
            this.currentSource = this.audioContext!.createBufferSource();
            this.currentSource.buffer = combinedBuffer;
            this.currentSource.onended = () => {
              this.isPlaying = false;
              onEnd?.();
              resolve();
            };
            this.currentSource.connect(this.audioContext!.destination);
            this.currentSource.start();
          } else {
            onEnd?.();
            resolve();
          }
        };

        this.ws.onerror = (error) => {
          console.error('Edge TTS WebSocket error:', error);
          this.isPlaying = false;
          const err = new Error('Edge TTS 连接失败');
          onError?.(err);
          reject(err);
        };

      } catch (error) {
        this.isPlaying = false;
        const err = error instanceof Error ? error : new Error('Edge TTS 未知错误');
        onError?.(err);
        reject(err);
      }
    });
  }

  /**
   * 停止播放
   */
  async cancel(): Promise<void> {
    this.isPlaying = false;

    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // 忽略已停止的错误
      }
      this.currentSource = null;
    }

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {
        // 忽略已关闭的错误
      }
      this.audioContext = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // 忽略已关闭的错误
      }
      this.ws = null;
    }

    this.audioBuffer = [];
  }

  /**
   * 暂停播放
   */
  pause(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  /**
   * 恢复播放
   */
  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// SpeechService 类
class SpeechService {
  private config: SpeechConfig;
  private status: SpeechStatus = 'idle';
  private listeners: Set<(status: SpeechStatus) => void> = new Set();
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;
  private edgeProvider: EdgeTTSProvider;

  constructor(config?: Partial<SpeechConfig>) {
    this.config = { ...defaultSpeechConfig, ...config };
    this.edgeProvider = new EdgeTTSProvider();
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
      const langPrefix = targetLang.split('-')[0] || '';
      bestVoice = this.voices.find(
        (voice) => voice.lang.toLowerCase().startsWith(langPrefix.toLowerCase())
      );
    }

    return bestVoice ?? null;
  }

  // 开始朗读
  async speak(text: string, lang?: string): Promise<void> {
    // 如果正在朗读，先停止
    if (this.status === 'speaking') {
      await this.cancel();
    }

    const targetLang = lang || this.config.lang;
    const provider = this.config.provider || 'chrome';

    if (provider === 'edge') {
      // 使用 Edge TTS
      await this.speakWithEdge(text, targetLang);
    } else {
      // 使用 Chrome Speech Synthesis
      this.speakWithChrome(text, targetLang);
    }
  }

  // 使用 Chrome Speech Synthesis 朗读
  private speakWithChrome(text: string, lang: string): void {
    const utterance = new SpeechSynthesisUtterance(text);

    // 设置语音参数
    utterance.lang = getLanguageVoice(lang);
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
      this.notifyStatusChange();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      this.status = 'idle';
      this.notifyStatusChange();
    };

    this.status = 'speaking';
    speechSynthesis.speak(utterance);
    this.notifyStatusChange();
  }

  // 使用 Edge TTS 朗读
  private async speakWithEdge(text: string, lang: string): Promise<void> {
    try {
      this.status = 'speaking';
      this.notifyStatusChange();

      await this.edgeProvider.speak(
        text,
        lang,
        this.config.rate,
        this.config.pitch,
        this.config.volume,
        // onStart
        () => {
          this.status = 'speaking';
          this.notifyStatusChange();
        },
        // onEnd
        () => {
          this.status = 'idle';
          this.notifyStatusChange();
        },
        // onError
        (error) => {
          console.error('Edge TTS error:', error);
          this.status = 'idle';
          this.notifyStatusChange();
        }
      );
    } catch (error) {
      console.error('Edge TTS speak error:', error);
      this.status = 'idle';
      this.notifyStatusChange();
      throw error;
    }
  }

  // 暂停朗读
  async pause(): Promise<void> {
    if (this.status === 'speaking') {
      if (this.config.provider === 'edge') {
        this.edgeProvider.pause();
      } else {
        speechSynthesis.pause();
      }
      this.status = 'paused';
      this.notifyStatusChange();
    }
  }

  // 恢复朗读
  async resume(): Promise<void> {
    if (this.status === 'paused') {
      if (this.config.provider === 'edge') {
        this.edgeProvider.resume();
      } else {
        speechSynthesis.resume();
      }
      this.status = 'speaking';
      this.notifyStatusChange();
    }
  }

  // 停止朗读
  async cancel(): Promise<void> {
    if (this.config.provider === 'edge') {
      await this.edgeProvider.cancel();
    } else {
      speechSynthesis.cancel();
    }
    this.status = 'idle';
    this.notifyStatusChange();
  }

  // 切换朗读状态
  async toggle(text: string, lang?: string): Promise<void> {
    if (this.status === 'speaking') {
      await this.cancel();
    } else {
      await this.speak(text, lang);
    }
  }

  // 获取 Edge 语音列表
  getEdgeVoices(): EdgeVoice[] {
    return EDGE_VOICES;
  }
}

// 导出单例
export const speechService = new SpeechService();

export default SpeechService;