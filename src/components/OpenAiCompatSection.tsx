/**
 * OpenAiCompatSection: Options 页里的 openai-compat 引擎配置表单
 *
 * 承载 3 项配置：baseUrl / apiKey / model
 * 交互：
 * - 首次挂载从 openaiCompatConfig.get() 拉配置回填
 * - API Key 默认 password 掩码 + 👁️ 切换显隐（防旁人窥屏）
 * - 5 个快捷预设按钮（OpenAI/DeepSeek/Qwen/Doubao/Kimi），点了一键填 baseUrl+常见 model
 * - "测试连接" 按钮 GET {baseUrl}/v1/models 带 Bearer 头，展示结果
 * - "保存" 写回 storage 并显示"已保存"2s
 * - 加载态：首屏拉 storage 期间用 skeleton 占位
 */
import { useEffect, useState, useCallback } from 'react';
import { openaiCompatConfig } from '@core/openai-compat-config';
import { formatErrorMessage } from '@utils/error';

interface Preset {
  name: string;
  baseUrl: string;
  model: string;
}

// 预设：官方文档推荐入口 + 便宜/中文友好模型默认值
const PRESETS: Preset[] = [
  { name: 'OpenAI', baseUrl: 'https://api.openai.com', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode', model: 'qwen-turbo' },
  { name: '豆包', baseUrl: 'https://ark.cn-beijing.volces.com/api', model: 'doubao-1-5-lite-32k' },
  { name: 'Kimi', baseUrl: 'https://api.moonshot.cn', model: 'moonshot-v1-8k' },
];

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; modelCount: number }
  | { status: 'error'; message: string };

export function OpenAiCompatSection() {
  const [loaded, setLoaded] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });

  // 首次挂载回填
  useEffect(() => {
    let mounted = true;
    openaiCompatConfig.get().then((cfg) => {
      if (!mounted) return;
      setBaseUrl(cfg.baseUrl);
      setApiKey(cfg.apiKey);
      setModel(cfg.model);
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const canTest = Boolean(baseUrl && apiKey && model);

  const handleSave = useCallback(async () => {
    await openaiCompatConfig.set({ baseUrl, apiKey, model });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }, [baseUrl, apiKey, model]);

  const handlePreset = useCallback((p: Preset) => {
    setBaseUrl(p.baseUrl);
    setModel(p.model);
  }, []);

  const handleTest = useCallback(async () => {
    setTestState({ status: 'testing' });
    try {
      // baseUrl 末尾可能带 /，去掉再拼；跟 openai-compat 引擎 joinUrl 保持一致约定
      const stripped = baseUrl.replace(/\/+$/, '');
      const url = stripped.endsWith('/v1') ? `${stripped}/models` : `${stripped}/v1/models`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        setTestState({ status: 'error', message: `HTTP ${resp.status} ${body}`.slice(0, 200) });
        return;
      }
      const data = (await resp.json()) as { data?: unknown[] };
      const count = Array.isArray(data?.data) ? data.data.length : 0;
      setTestState({ status: 'success', modelCount: count });
    } catch (err) {
      setTestState({ status: 'error', message: formatErrorMessage(err) });
    }
  }, [baseUrl, apiKey, model]);

  if (!loaded) {
    // 简单 skeleton：等 storage 拉完再显示表单，避免"空 → 填了 → 又清空"的闪烁
    return (
      <div
        className="space-y-3 animate-pulse"
        aria-busy="true"
        aria-label="加载 OpenAI 兼容 API 配置"
        role="status"
      >
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-9 bg-slate-100 rounded" />
        <div className="h-9 bg-slate-100 rounded" />
        <div className="h-9 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-base font-semibold">OpenAI 兼容 API</h2>
        <p className="text-xs text-slate-500">
          支持 OpenAI / DeepSeek / 通义千问 / 豆包 / Kimi 等所有兼容 <code>/v1/chat/completions</code> 的端点。
        </p>
      </header>

      {/* 快捷预设 */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => handlePreset(p)}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-100 hover:bg-slate-200"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* baseUrl */}
      <div className="space-y-1">
        <label htmlFor="oaic-baseurl" className="block text-sm font-medium">
          API Base URL
        </label>
        <input
          id="oaic-baseurl"
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.deepseek.com"
          className="w-full rounded-md border border-slate-300 p-2 text-sm font-mono"
        />
      </div>

      {/* apiKey */}
      <div className="space-y-1">
        <label htmlFor="oaic-apikey" className="block text-sm font-medium">
          API Key
        </label>
        <div className="flex gap-2">
          <input
            id="oaic-apikey"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            className="flex-1 rounded-md border border-slate-300 p-2 text-sm font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
            className="px-2 rounded-md border border-slate-300 hover:bg-slate-50"
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          存储在 chrome.storage.local（本机加密，不会同步到其他设备）。
        </p>
      </div>

      {/* model */}
      <div className="space-y-1">
        <label htmlFor="oaic-model" className="block text-sm font-medium">
          模型 ID
        </label>
        <input
          id="oaic-model"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="deepseek-chat / gpt-4o-mini / qwen-turbo ..."
          className="w-full rounded-md border border-slate-300 p-2 text-sm font-mono"
        />
      </div>

      {/* 操作 */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-yellow-400 text-black hover:bg-yellow-500"
        >
          保存
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={!canTest || testState.status === 'testing'}
          className="px-3 py-1.5 rounded-md text-sm font-medium border border-slate-300 disabled:opacity-50 hover:bg-slate-50"
        >
          测试连接
        </button>
        {savedFlash && <span className="text-sm text-emerald-600">已保存 ✓</span>}
      </div>

      {/* 测试连接结果 */}
      {testState.status === 'testing' && (
        <div className="text-sm text-slate-500">测试中...</div>
      )}
      {testState.status === 'success' && (
        <div className="text-sm text-emerald-600">
          ✅ 连接成功（列出 {testState.modelCount} 个模型）
        </div>
      )}
      {testState.status === 'error' && (
        <div className="text-sm text-rose-600 whitespace-pre-wrap break-all">
          ❌ {testState.message}
        </div>
      )}
    </section>
  );
}
