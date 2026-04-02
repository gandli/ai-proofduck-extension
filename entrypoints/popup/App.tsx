/**
 * Popup 主应用组件
 */
import { useState, useCallback } from 'react';
import type { AIMode } from '../../src/types';
import { Header, TabBar, TranslationTab, SettingsPanel } from '../../src/components/popup';
import './App.css';

function App() {
  // 当前激活的 Tab
  const [activeTab, setActiveTab] = useState<AIMode>('translate');

  // 语言设置
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('zh');

  // 设置面板
  const [showSettings, setShowSettings] = useState(false);

  // 模拟处理状态
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  // 处理提交
  const handleSubmit = useCallback(async (text: string) => {
    setLoading(true);
    setError(undefined);
    setResult(undefined);

    try {
      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 根据模式返回模拟结果
      let mockResult = '';
      switch (activeTab) {
        case 'translate':
          mockResult = `[翻译结果] ${text}`;
          break;
        case 'proofread':
          mockResult = `[校对结果] ${text}`;
          break;
        case 'polish':
          mockResult = `[润色结果] ${text}`;
          break;
        case 'expand':
          mockResult = `[扩写结果] ${text}`;
          break;
      }
      setResult(mockResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Tab 切换时清除结果
  const handleTabChange = (tab: AIMode) => {
    setActiveTab(tab);
    setResult(undefined);
    setError(undefined);
  };

  return (
    <div className="proofduck-popup flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <Header onSettingsClick={() => setShowSettings(true)} />

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden bg-white">
        <TranslationTab
          mode={activeTab}
          sourceLang={sourceLang}
          targetLang={targetLang}
          onSourceLangChange={setSourceLang}
          onTargetLangChange={setTargetLang}
          onSubmit={handleSubmit}
          loading={loading}
          {...(result !== undefined && { result })}
          {...(error !== undefined && { error })}
        />
      </div>

      {/* 设置面板 */}
      <SettingsPanel
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default App;