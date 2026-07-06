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
      apiKey: 'wrong',
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
});
