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
 * - Round 5 (#465): baseUrl 填了但 host 未授权 → 黄色警告 + 授权按钮
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { openaiCompatConfig } from '@core/openai-compat-config';
import { formatErrorMessage, sanitizeSecrets } from '@utils/error';
import { createFetchAbortHandle } from '@utils/fetch-abort';
import {
  hasHostPermission,
  requestHostPermission,
  onPermissionsChanged,
} from '@core/host-permissions';
import { extractOriginPattern } from '@core/origin-pattern';

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

// Round 5 (#465): 授权状态机
type PermState =
  | { status: 'unknown' }              // 首次未查完 / baseUrl 空
  | { status: 'granted' }
  | { status: 'missing' }              // 缺权限，可点【授权】
  | { status: 'requesting' }
  | { status: 'denied' };              // 用户点了拒绝

export function OpenAiCompatSection() {
  const [loaded, setLoaded] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const [rawPermState, setRawPermState] = useState<PermState>({ status: 'unknown' });

  // 首次挂载回填
  useEffect(() => {
    let mounted = true;
    void openaiCompatConfig.get().then((cfg) => {
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

  // Round 5 (#465): 从 baseUrl 计算 match pattern（畸形 URL 时短路，避免弹权限对话框）
  const hostPattern = useMemo(() => {
    if (!baseUrl) return null;
    try {
      return extractOriginPattern(baseUrl);
    } catch {
      return null;
    }
  }, [baseUrl]);

  // 派生状态：无 hostPattern 时 permState 统一为 unknown，避免 setState in effect
  // (Gemini review 建议：You Might Not Need an Effect)
  const permState: PermState = useMemo(
    () => (hostPattern ? rawPermState : { status: 'unknown' }),
    [hostPattern, rawPermState],
  );

  // Round 5 (#465): baseUrl 变化时重查权限；同时监听 chrome.permissions 变化事件
  useEffect(() => {
    let cancelled = false;
    if (!hostPattern) return; // rawPermState 保留上次值；permState 派生为 unknown
    const refresh = async () => {
      const granted = await hasHostPermission(hostPattern);
      if (cancelled) return;
      setRawPermState(granted ? { status: 'granted' } : { status: 'missing' });
    };
    void refresh();
    // onPermissionsChanged 期望 void 回调，refresh 返回 Promise —— 包一层避免悬空
    const unsub = onPermissionsChanged(() => {
      void refresh();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [hostPattern]);

  // 计算显示用 origin（去掉 /*）
  const hostOrigin = useMemo(() => {
    if (!baseUrl) return '';
    try {
      return new URL(baseUrl).host;
    } catch {
      return '';
    }
  }, [baseUrl]);

  const handleAuthorize = useCallback(async () => {
    if (!hostPattern) return;
    setRawPermState({ status: 'requesting' });
    const granted = await requestHostPermission(hostPattern);
    // 授权对话框关掉后重查一次（onPermissionsChanged 会补一次，这里保双保险）
    if (granted) {
      const confirmed = await hasHostPermission(hostPattern);
      setRawPermState(confirmed ? { status: 'granted' } : { status: 'denied' });
    } else {
      setRawPermState({ status: 'denied' });
    }
  }, [hostPattern]);

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
    // v0.5.6 P2-A（审计 v4）：复用 createFetchAbortHandle，与引擎侧 fetch-abort 收口一致
    // 15s（比默认 30s 短）—— 测试连接是同步 UI 操作，短超时更好用户体验
    const abort = createFetchAbortHandle(undefined, 15_000);
    try {
      // baseUrl 末尾可能带 /，去掉再拼；跟 openai-compat 引擎 joinUrl 保持一致约定
      const stripped = baseUrl.replace(/\/+$/, '');
      const url = stripped.endsWith('/v1') ? `${stripped}/models` : `${stripped}/v1/models`;
      const resp = await fetch(url, {
        signal: abort.signal,
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        // v0.5.6 P1-A（审计 v4）：先脱敏再切片，防 API key/Bearer token 通过服务端 echo 泄漏
        // 与 free-translate.ts:103 / openai-compat.ts:155 完全一致的模式
        // Gemini review 采纳（PR #514）：先切 1000 char 缓冲区再脱敏，规避大 body（几百 KB Cloudflare
        // 错误页 / HTML 提示）触发多个全局正则时主线程卡顿；1000 » 200 足以覆盖任何 200 char 内可能
        // 展示的密钥完整跨越脱敏边界的情况
        const truncatedBody = body.slice(0, 1000);
        // CodeRabbit review 采纳（PR #514 Major）：sanitizeSecrets 仅覆盖已知格式（sk-/Bearer/x-api-key）,
        // 但本组件支持任意 OpenAI 兼容端点（DeepSeek dsk-.../通义千问 qwen-... 等自定义格式），
        // 服务端若裸回显 apiKey 值无前缀 → 正则漏检。用当前 apiKey 值做字面量兜底替换，双保险。
        // trim 首尾空白避免用户手动多敲空格导致兜底失效
        const patternSanitized = sanitizeSecrets(truncatedBody);
        const trimmedKey = apiKey.trim();
        const finalBody =
          trimmedKey.length >= 8 // 太短的 key（如 test-key）不做兜底，避免误替换 UI 文案
            ? patternSanitized.split(trimmedKey).join('***REDACTED***')
            : patternSanitized;
        setTestState({
          status: 'error',
          message: `HTTP ${resp.status} ${finalBody.slice(0, 200)}`,
        });
        return;
      }
      const data = (await resp.json()) as { data?: unknown[] };
      const count = Array.isArray(data?.data) ? data.data.length : 0;
      setTestState({ status: 'success', modelCount: count });
    } catch (err) {
      setTestState({ status: 'error', message: formatErrorMessage(err) });
    } finally {
      abort.cleanup();
    }
  }, [baseUrl, apiKey]);

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
            className="px-2.5 py-1 text-xs rounded-md bg-slate-100 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
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
          className="w-full rounded-md border border-slate-300 p-2 text-sm font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        {/* Round 5 (#465): host 权限状态 */}
        {hostPattern && hostOrigin && permState.status === 'missing' && (
          <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-300 text-xs">
            <p className="text-amber-800 mb-2">
              ⚠️ 校对鸭还没获得访问 <code className="font-mono">{hostOrigin}</code> 的权限，翻译请求会被浏览器拦截。
            </p>
            <button
              type="button"
              onClick={handleAuthorize}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
            >
              授权访问 {hostOrigin}
            </button>
          </div>
        )}
        {hostPattern && hostOrigin && permState.status === 'requesting' && (
          <div className="mt-2 p-2 rounded-md bg-slate-50 border border-slate-300 text-xs text-slate-600">
            正在请求授权...
          </div>
        )}
        {hostPattern && hostOrigin && permState.status === 'granted' && (
          <p className="mt-2 text-xs text-emerald-600">
            ✅ 已授权访问 <code className="font-mono">{hostOrigin}</code>
          </p>
        )}
        {hostPattern && hostOrigin && permState.status === 'denied' && (
          <div className="mt-2 p-2 rounded-md bg-rose-50 border border-rose-300 text-xs">
            <p className="text-rose-800 mb-2">
              ❌ 授权被拒绝，翻译无法访问 <code className="font-mono">{hostOrigin}</code>。
            </p>
            <button
              type="button"
              onClick={handleAuthorize}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
            >
              授权访问 {hostOrigin}
            </button>
          </div>
        )}
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
            className="flex-1 rounded-md border border-slate-300 p-2 text-sm font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            title={showKey ? '隐藏 API Key' : '显示 API Key'}
            aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
            className="px-2 rounded-md border border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
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
          className="w-full rounded-md border border-slate-300 p-2 text-sm font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* 操作 */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="pd-btn pd-btn-primary px-3 py-1.5 rounded-md text-sm font-medium"
        >
          保存
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={!canTest || testState.status === 'testing'}
          className="px-3 py-1.5 rounded-md text-sm font-medium border border-slate-300 disabled:opacity-50 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
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
