/**
 * SettingsPanel 组件 - 设置面板
 * 服务引擎管理 UI
 */
import { useState, useEffect } from 'react';
import { t } from '@/i18n';
import { speechService, SpeechConfig, LANGUAGE_VOICE_MAP } from '@/services/SpeechService';

type EngineCategory = 'translation' | 'local' | 'llm';
type EngineStatus = 'idle' | 'ready' | 'error';

interface Engine {
  id: string;
  name: string;
  category: EngineCategory;
  enabled: boolean;
  status: EngineStatus;
}

interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
}

// 模拟引擎数据
const MOCK_ENGINES: Engine[] = [
  { id: 'chrome-ai', name: 'Chrome 内置 AI (Gemini Nano)', category: 'local', enabled: true, status: 'ready' },
  { id: 'web-llm', name: 'WebLLM (Qwen2.5)', category: 'local', enabled: true, status: 'idle' },
  { id: 'openrouter', name: 'OpenRouter', category: 'llm', enabled: false, status: 'idle' },
  { id: 'google-translate', name: 'Google 翻译 (兜底)', category: 'translation', enabled: true, status: 'ready' },
];

const CATEGORY_LABELS: Record<EngineCategory, string> = {
  translation: '翻译引擎',
  local: '本地模型',
  llm: '云端 LLM',
};

const STATUS_COLORS: Record<EngineStatus, string> = {
  idle: 'bg-gray-400',
  ready: 'bg-green-500',
  error: 'bg-red-500',
};

export function SettingsPanel({ visible, onClose }: SettingsPanelProps) {
  const [engines, setEngines] = useState<Engine[]>(MOCK_ENGINES);

  // 语音设置状态
  const [speechConfig, setSpeechConfig] = useState<SpeechConfig>(() => speechService.getConfig());

  const toggleEngine = (id: string) => {
    setEngines((prev) =>
      prev.map((engine) =>
        engine.id === id ? { ...engine, enabled: !engine.enabled } : engine
      )
    );
  };

  // 更新语音配置
  const updateSpeechConfig = (key: keyof SpeechConfig, value: string | number) => {
    const newConfig = { ...speechConfig, [key]: value };
    setSpeechConfig(newConfig);
    speechService.setConfig({ [key]: value });
  };

  // 预览语音
  const handlePreview = () => {
    speechService.speak(t('settingsSpeechPreviewText') || '这是一段测试朗读文本', speechConfig.lang);
  };

  // 监听语音服务状态变化
  useEffect(() => {
    const unsubscribe = speechService.subscribe(() => {
      // 状态变化时更新配置（以防其他地方修改）
      setSpeechConfig(speechService.getConfig());
    });
    return unsubscribe;
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">{t('settingsTitle')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 服务引擎管理 */}
          <section className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">{t('settingsEngines')}</h3>

            {/* 按类别分组显示引擎 */}
            {(['local', 'llm', 'translation'] as const).map((category) => {
              const categoryEngines = engines.filter((e) => e.category === category);
              if (categoryEngines.length === 0) return null;

              return (
                <div key={category} className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">{CATEGORY_LABELS[category]}</div>
                  <div className="space-y-2">
                    {categoryEngines.map((engine) => (
                      <div
                        key={engine.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {/* 开关 */}
                          <button
                            onClick={() => toggleEngine(engine.id)}
                            className={`
                              relative w-10 h-6 rounded-full transition-colors
                              ${engine.enabled ? 'bg-brand-orange' : 'bg-gray-300'}
                            `}
                          >
                            <span
                              className={`
                                absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                                ${engine.enabled ? 'left-0.5 translate-x-4' : 'left-0.5'}
                              `}
                            />
                          </button>

                          {/* 引擎信息 */}
                          <div>
                            <div className="text-sm font-medium text-gray-800">{engine.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[engine.status]}`}
                              />
                              <span className="text-xs text-gray-500">
                                {engine.status === 'ready' && (t('settingsEngineReady') || '就绪')}
                                {engine.status === 'idle' && (t('settingsEngineIdle') || '空闲')}
                                {engine.status === 'error' && (t('settingsEngineError') || '错误')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* API 配置提示 */}
          <section className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">{t('settingsApiConfig')}</h3>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                {t('settingsApiHint') || '配置 OpenRouter API Key 以使用云端 LLM 模型。'}
              </p>
            </div>
          </section>

          {/* 语音设置 */}
          <section className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">{t('settingsSpeech')}</h3>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              {/* 朗读语言 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('settingsSpeechLang')}</label>
                <select
                  value={speechConfig.lang}
                  onChange={(e) => updateSpeechConfig('lang', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                >
                  {Object.entries(LANGUAGE_VOICE_MAP).map(([code, name]) => (
                    <option key={code} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 语速 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  {t('settingsSpeechRate')}: {speechConfig.rate.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speechConfig.rate}
                  onChange={(e) => updateSpeechConfig('rate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                />
              </div>

              {/* 音调 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  {t('settingsSpeechPitch')}: {speechConfig.pitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speechConfig.pitch}
                  onChange={(e) => updateSpeechConfig('pitch', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                />
              </div>

              {/* 音量 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  {t('settingsSpeechVolume')}: {Math.round(speechConfig.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={speechConfig.volume}
                  onChange={(e) => updateSpeechConfig('volume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                />
              </div>

              {/* 预览按钮 */}
              <button
                onClick={handlePreview}
                className="w-full py-2 px-4 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-brand-orange/90 transition-colors"
              >
                {t('settingsSpeechPreview')}
              </button>
            </div>
          </section>
        </div>

        {/* 底部操作栏 */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 bg-brand-orange text-white rounded-lg font-medium hover:bg-brand-orange/90 transition-colors"
          >
            {t('settingsSave') || '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;