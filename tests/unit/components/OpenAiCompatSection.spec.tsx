/**
 * OpenAiCompatSection 组件单元测试
 *
 * 契约：
 * 1. 首次挂载从 openaiCompatConfig.get() 拉配置回填三个 input
 * 2. 用户改动 → 点"保存" → 调用 openaiCompatConfig.set() 且显示"已保存"
 * 3. API Key 默认掩码（type=password），👁️ 切 type=text
 * 4. 快捷预设按钮点击 → 一键填 baseUrl + 常见 model 名
 * 5. "测试连接" → 走 fetch(baseUrl + /v1/models, Bearer key)
 *    - 2xx → 显示"✅ 连接成功（列出 N 个模型）"
 *    - 非 2xx → 显示错误 body
 *    - 网络错误 → 显示 catch 到的 error message
 * 6. baseUrl / apiKey / model 三项缺一，"测试连接"按钮 disabled
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenAiCompatSection } from '@components/OpenAiCompatSection';

vi.mock('@core/openai-compat-config', () => {
  const state = { value: { baseUrl: '', apiKey: '', model: '' } };
  return {
    __mockState: state,
    openaiCompatConfig: {
      get: vi.fn(async () => state.value),
      set: vi.fn(async (cfg: typeof state.value) => {
        state.value = cfg;
      }),
      watch: vi.fn(() => () => {}),
    },
  };
});

// Round 5 (#465): mock host-permissions util 供授权 UI 测试
const permsMocks = vi.hoisted(() => ({
  has: vi.fn(async () => false),
  request: vi.fn(async () => true),
  onChange: vi.fn(() => () => {}),
}));
vi.mock('@core/host-permissions', () => ({
  hasHostPermission: permsMocks.has,
  requestHostPermission: permsMocks.request,
  onPermissionsChanged: permsMocks.onChange,
}));

// 单独引用 mock 以便在测试里操纵/断言
import * as configModule from '@core/openai-compat-config';
const configMock = configModule as unknown as {
  __mockState: { value: { baseUrl: string; apiKey: string; model: string } };
  openaiCompatConfig: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    watch: ReturnType<typeof vi.fn>;
  };
};

describe('OpenAiCompatSection', () => {
  beforeEach(() => {
    // 每个测试重置 mock storage
    configMock.__mockState.value = { baseUrl: '', apiKey: '', model: '' };
    configMock.openaiCompatConfig.get.mockClear();
    configMock.openaiCompatConfig.set.mockClear();
    permsMocks.has.mockClear();
    permsMocks.request.mockClear();
    permsMocks.onChange.mockClear();
    permsMocks.has.mockResolvedValue(false);
    permsMocks.request.mockResolvedValue(true);
    permsMocks.onChange.mockImplementation(() => () => {});
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('首次挂载显示 skeleton，随后回填已存储的值', async () => {
    configMock.__mockState.value = {
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'sk-abc',
      model: 'deepseek-chat',
    };
    render(<OpenAiCompatSection />);

    // 等 useEffect 从 storage 拉完
    await waitFor(() => {
      expect(screen.getByLabelText('API Base URL')).toHaveValue('https://api.deepseek.com');
    });
    expect(screen.getByLabelText('模型 ID')).toHaveValue('deepseek-chat');
    // API Key 也回填了，但是 password type
    const keyInput = screen.getByLabelText("API Key") as HTMLInputElement;
    expect(keyInput.value).toBe('sk-abc');
    expect(keyInput.type).toBe('password');
  });

  it('修改后点"保存" → 调用 set 且显示"已保存"', async () => {
    const user = userEvent.setup();
    render(<OpenAiCompatSection />);
    await waitFor(() => expect(screen.getByLabelText('API Base URL')).toBeInTheDocument());

    await user.type(screen.getByLabelText('API Base URL'), 'https://api.openai.com');
    await user.type(screen.getByLabelText("API Key"), 'sk-test');
    await user.type(screen.getByLabelText('模型 ID'), 'gpt-4o-mini');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(configMock.openaiCompatConfig.set).toHaveBeenCalledWith({
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
      });
    });
    expect(await screen.findByText(/已保存/)).toBeInTheDocument();
  });

  it('点击 👁️ 切换 API Key 显隐（password ↔ text）', async () => {
    const user = userEvent.setup();
    configMock.__mockState.value = { baseUrl: '', apiKey: 'sk-secret', model: '' };
    render(<OpenAiCompatSection />);
    await waitFor(() => expect(screen.getByLabelText("API Key")).toHaveValue('sk-secret'));

    const keyInput = screen.getByLabelText("API Key") as HTMLInputElement;
    expect(keyInput.type).toBe('password');

    await user.click(screen.getByRole('button', { name: /显示 API Key/i }));
    expect(keyInput.type).toBe('text');

    await user.click(screen.getByRole('button', { name: /隐藏 API Key/i }));
    expect(keyInput.type).toBe('password');
  });

  it('快捷预设按钮 → 一键填 baseUrl + model', async () => {
    const user = userEvent.setup();
    render(<OpenAiCompatSection />);
    await waitFor(() => expect(screen.getByLabelText('API Base URL')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'DeepSeek' }));
    expect(screen.getByLabelText('API Base URL')).toHaveValue('https://api.deepseek.com');
    expect(screen.getByLabelText('模型 ID')).toHaveValue('deepseek-chat');
  });

  it('三项缺一时"测试连接"按钮禁用', async () => {
    render(<OpenAiCompatSection />);
    await waitFor(() => expect(screen.getByLabelText('API Base URL')).toBeInTheDocument());

    const testBtn = screen.getByRole('button', { name: '测试连接' });
    expect(testBtn).toBeDisabled();
  });

  it('测试连接：2xx → 显示成功 + 模型数量', async () => {
    const user = userEvent.setup();
    configMock.__mockState.value = {
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'sk-x',
      model: 'deepseek-chat',
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }),
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    render(<OpenAiCompatSection />);
    await waitFor(() => expect(screen.getByLabelText('API Base URL')).toHaveValue('https://api.deepseek.com'));

    await user.click(screen.getByRole('button', { name: '测试连接' }));

    await waitFor(() => {
      expect(screen.getByText(/连接成功.*3.*模型/)).toBeInTheDocument();
    });
    // 检查请求：GET /v1/models + Bearer
    const [url, init] = (fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/v1/models');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-x');
  });

  it('测试连接：非 2xx → 显示错误 status + body', async () => {
    const user = userEvent.setup();
    configMock.__mockState.value = {
      baseUrl: 'https://x',
      apiKey: 'k',
      model: 'm',
    };
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => 'Invalid key',
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    render(<OpenAiCompatSection />);
    await waitFor(() => expect(screen.getByLabelText('API Base URL')).toHaveValue('https://x'));

    await user.click(screen.getByRole('button', { name: '测试连接' }));
    await waitFor(() => {
      expect(screen.getByText(/401.*Invalid key/)).toBeInTheDocument();
    });
  });

  it('测试连接：非 2xx body 里的 Bearer token 被脱敏后再入 UI（P1-A 回归·审计 v4）', async () => {
    // v0.5.6 P1-A：模拟服务端 echo Authorization header 到 4xx body。
    // 修复前：`HTTP 401 Bearer sk-proj-abc...` 直接进 setTestState → 用户截图/日志泄漏。
    // 修复后：sanitizeSecrets 会把 Bearer 令牌替换成 <redacted>。
    const user = userEvent.setup();
    configMock.__mockState.value = {
      baseUrl: 'https://x',
      apiKey: 'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890',
      model: 'm',
    };
    const leaky =
      'invalid_auth: received Bearer sk-proj-abcdefghijklmnopqrstuvwxyz1234567890';
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => leaky,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    render(<OpenAiCompatSection />);
    await waitFor(() => expect(screen.getByLabelText('API Base URL')).toHaveValue('https://x'));

    await user.click(screen.getByRole('button', { name: '测试连接' }));
    // 等状态变化：先看到 "HTTP 401" 出现
    await waitFor(() => {
      expect(screen.getByText(/HTTP 401/)).toBeInTheDocument();
    });
    // 关键断言：Bearer 密钥体不能出现在 DOM 里
    expect(document.body.textContent).not.toContain(
      'sk-proj-abcdefghijklmnopqrstuvwxyz',
    );
    // 但 status 400s 数字要保留
    expect(document.body.textContent).toContain('HTTP 401');
  });

  it('测试连接：超大 body（10KB）先切 1000 char 缓冲区再脱敏（PR #514 Gemini 采纳）', async () => {
    // 场景：Cloudflare 拦截页 / HTML 提示可能返回几百 KB body，
    // 直接对完整 body 跑 sanitizeSecrets（多个全局正则）会阻塞主线程。
    // 修复：先 slice(0, 1000) 再脱敏 —— 1000 » 200（最终展示切片）足以保完整性。
    const user = userEvent.setup();
    configMock.__mockState.value = {
      baseUrl: 'https://x',
      apiKey: 'test-key',
      model: 'm',
    };
    // 10KB body：前 400 char 有 Bearer token，后面全是填充
    const bigBody =
      'invalid_auth: received Bearer sk-proj-oversizedbodyabc1234567890' +
      '_'.repeat(10_000);
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => bigBody,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    render(<OpenAiCompatSection />);
    await waitFor(() => expect(screen.getByLabelText('API Base URL')).toHaveValue('https://x'));

    const t0 = performance.now();
    await user.click(screen.getByRole('button', { name: '测试连接' }));
    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
    });
    const elapsed = performance.now() - t0;

    // Bearer token 仍被脱敏
    expect(document.body.textContent).not.toContain('sk-proj-oversizedbody');
    // 性能：处理 10KB body 应远快于 1s（1000 char 缓冲的效果）
    expect(elapsed).toBeLessThan(1000);
  });

  it('测试连接：apiKey 无标准前缀（DeepSeek 自定义格式）走字面量兜底脱敏（PR #514 CodeRabbit 采纳）', async () => {
    // 场景：sanitizeSecrets 只匹配 sk-/Bearer/x-api-key 模式，
    // DeepSeek 用 dsk-*** 前缀、豆包/通义千问格式各异，若服务端裸回显 apiKey 值本身不带前缀
    // → 正则漏检。修复：用 apiKey 值做字面量兜底替换。
    const user = userEvent.setup();
    const customKey = 'dsk-my-deepseek-custom-key-1234567890';
    configMock.__mockState.value = {
      baseUrl: 'https://api.deepseek.com',
      apiKey: customKey,
      model: 'deepseek-chat',
    };
    // 服务端错误 body 里裸回显 key（无 Bearer 前缀）
    const nakedLeak = `Error: invalid credentials, received key = ${customKey}`;
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 403,
      text: async () => nakedLeak,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    render(<OpenAiCompatSection />);
    await waitFor(() => expect(screen.getByLabelText('API Base URL')).toHaveValue('https://api.deepseek.com'));

    await user.click(screen.getByRole('button', { name: '测试连接' }));
    await waitFor(() => {
      expect(screen.getByText(/HTTP 403/)).toBeInTheDocument();
    });
    // 关键断言：自定义格式 key 值不能在 DOM 中出现
    expect(document.body.textContent).not.toContain(customKey);
    expect(document.body.textContent).toContain('***REDACTED***');
  });

  it('测试连接：网络错误 → 显示 error.message', async () => {
    const user = userEvent.setup();
    configMock.__mockState.value = { baseUrl: 'https://x', apiKey: 'k', model: 'm' };
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    render(<OpenAiCompatSection />);
    await waitFor(() => expect(screen.getByLabelText('API Base URL')).toHaveValue('https://x'));

    await user.click(screen.getByRole('button', { name: '测试连接' }));
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
    });
  });

  // ─── Round 5 (#465): host 权限授权 UI ───
  describe('host permission 授权（#465）', () => {
    it('baseUrl 空 → 不显示授权 UI', async () => {
      configMock.__mockState.value = { baseUrl: '', apiKey: '', model: '' };
      render(<OpenAiCompatSection />);
      await waitFor(() => expect(screen.getByLabelText('API Base URL')).toBeInTheDocument());
      expect(screen.queryByRole('button', { name: /授权|授予|permission/i })).not.toBeInTheDocument();
    });

    it('baseUrl 已填但未授权 → 显示黄色警告 + 授权按钮', async () => {
      configMock.__mockState.value = {
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-xxx',
        model: 'deepseek-chat',
      };
      permsMocks.has.mockResolvedValue(false);
      render(<OpenAiCompatSection />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /授权.*api\.deepseek\.com/i })).toBeInTheDocument();
      });
      expect(permsMocks.has).toHaveBeenCalledWith('https://api.deepseek.com/*');
    });

    it('baseUrl 已授权 → 显示绿色✅已授权', async () => {
      configMock.__mockState.value = {
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-xxx',
        model: 'deepseek-chat',
      };
      permsMocks.has.mockResolvedValue(true);
      render(<OpenAiCompatSection />);
      await waitFor(() => {
        expect(screen.getByText(/已授权/)).toBeInTheDocument();
      });
      // 组件把 host 放进 <code> 分节点了，用 querySelector 兜底
      expect(document.body.textContent).toContain('api.deepseek.com');
      expect(screen.queryByRole('button', { name: /^授权/i })).not.toBeInTheDocument();
    });

    it('点授权按钮 → 调 requestHostPermission，成功后切换为已授权', async () => {
      const user = userEvent.setup();
      configMock.__mockState.value = {
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-xxx',
        model: 'deepseek-chat',
      };
      permsMocks.has.mockResolvedValue(false);
      permsMocks.request.mockResolvedValue(true);
      render(<OpenAiCompatSection />);

      const btn = await screen.findByRole('button', { name: /授权.*api\.deepseek\.com/i });
      // 授权成功后组件会重新查权限；先让第 2 次 has 返 true
      permsMocks.has.mockResolvedValue(true);
      await user.click(btn);

      expect(permsMocks.request).toHaveBeenCalledWith('https://api.deepseek.com/*');
      await waitFor(() => {
        expect(screen.getByText(/已授权/)).toBeInTheDocument();
      });
    });

    it('点授权但用户拒绝 → 保留授权按钮 + 提示', async () => {
      const user = userEvent.setup();
      configMock.__mockState.value = {
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-xxx',
        model: 'deepseek-chat',
      };
      permsMocks.has.mockResolvedValue(false);
      permsMocks.request.mockResolvedValue(false);
      render(<OpenAiCompatSection />);

      const btn = await screen.findByRole('button', { name: /授权.*api\.deepseek\.com/i });
      await user.click(btn);

      await waitFor(() => {
        expect(screen.getByText(/授权被拒绝|拒绝了|denied/i)).toBeInTheDocument();
      });
      // 按钮仍在，用户可重试
      expect(screen.getByRole('button', { name: /授权.*api\.deepseek\.com/i })).toBeInTheDocument();
    });
  });
});
