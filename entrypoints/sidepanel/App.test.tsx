import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { STORAGE_KEYS } from '../shared/contracts';

const storageState: Record<string, unknown> = {};

const runtimeListeners = new Set<(message: { type?: string; payload?: unknown }) => unknown>();

vi.stubGlobal('browser', {
  storage: {
    local: {
      get: vi.fn(async (key: string | string[]) => {
        if (Array.isArray(key)) {
          return Object.fromEntries(key.map((item) => [item, storageState[item]]));
        }

        return { [key]: storageState[key] };
      }),
      set: vi.fn(async (value: Record<string, unknown>) => Object.assign(storageState, value)),
      remove: vi.fn(async (key: string) => {
        delete storageState[key];
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(async () => null),
    onMessage: {
      addListener: vi.fn((listener) => {
        runtimeListeners.add(listener);
      }),
      removeListener: vi.fn((listener) => {
        runtimeListeners.delete(listener);
      }),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
  },
  sidePanel: {
    setPanelBehavior: vi.fn(),
  },
});

describe('App', () => {
  beforeEach(() => {
    cleanup();
    Object.keys(storageState).forEach((key) => delete storageState[key]);
    runtimeListeners.clear();
    Reflect.deleteProperty(globalThis, 'fetch');
  });

  it('renders the sidepanel shell and modes', async () => {
    render(<App />);

    expect(await screen.findByText('SOURCE')).toBeTruthy();
    expect(screen.getByRole('button', { name: '设置' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '翻译' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '摘要' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '校对' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '润色' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '扩写' })).toBeTruthy();
  });

  it('loads pending draft from storage', async () => {
    storageState[STORAGE_KEYS.inputDraft] = {
      text: '来自网页选区的内容',
      source: 'selection',
      capturedAt: new Date().toISOString(),
    };

    render(<App />);

    expect(await screen.findByDisplayValue('来自网页选区的内容')).toBeTruthy();
  });

  it('loads translated draft and switches to translation result without re-running', async () => {
    storageState[STORAGE_KEYS.inputDraft] = {
      text: 'inference',
      source: 'selection',
      preferredMode: 'translate',
      prefilledResult: '推理',
      prefilledNotice: '已复用页内选区翻译结果',
      capturedAt: new Date().toISOString(),
    };

    render(<App />);

    expect(await screen.findByDisplayValue('inference')).toBeTruthy();
    expect(await screen.findByText('推理')).toBeTruthy();
    expect(await screen.findByText('最近结果')).toBeTruthy();
    expect(screen.getByText('TRANSLATION')).toBeTruthy();
  });

  it('loads synced selection translation when sidepanel opens after hover translation', async () => {
    storageState[STORAGE_KEYS.selectionTranslation] = {
      draft: {
        text: 'inference',
        source: 'selection',
        preferredMode: 'translate',
        prefilledResult: '推理',
        prefilledNotice: '已同步选区翻译结果',
        capturedAt: new Date().toISOString(),
      },
      result: '推理',
      notice: '已同步选区翻译结果',
    };

    render(<App />);

    expect(await screen.findByDisplayValue('inference')).toBeTruthy();
    expect(await screen.findByText('推理')).toBeTruthy();
    expect(await screen.findByText('推理')).toBeTruthy();
    expect(screen.getByText('TRANSLATION')).toBeTruthy();
  });

  it('processes text and renders a real result', async () => {
    render(<App />);

    const textarea = await screen.findByRole('textbox');
    fireEvent.change(textarea, { target: { value: '你好，世界。' } });

    fireEvent.click(screen.getByRole('button', { name: '执行翻译' }));

    expect(await screen.findByText(/Hello/)).toBeTruthy();
    expect(await screen.findByText('本地 AI（兼容）')).toBeTruthy();
    expect(screen.getByRole('button', { name: '执行翻译' })).toBeTruthy();
  });

  it('shows a clear fallback when online api is selected but not configured', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [[['Fallback translation']]],
    }));
    vi.stubGlobal('fetch', fetchMock);

    storageState[STORAGE_KEYS.settings] = {
      targetLanguage: '中文',
      enginePreference: 'online',
      localModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      localAllowWasmFallback: false,
      translationFallbackEnabled: true,
      onlineApiBase: '',
      onlineApiKey: '',
      onlineModel: '',
    };

    render(<App />);

    const textarea = await screen.findByRole('textbox');
    fireEvent.change(textarea, { target: { value: '请帮我整理这段文本' } });
    fireEvent.click(screen.getByRole('button', { name: '执行翻译' }));

    expect(await screen.findByText(/Fallback translation/)).toBeTruthy();
    expect(await screen.findByText('翻译服务')).toBeTruthy();
  });

  it('renders remote result when online api is configured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Remote translation result' } }],
        }),
      })),
    );

    storageState[STORAGE_KEYS.settings] = {
      targetLanguage: 'English',
      enginePreference: 'online',
      localModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      localAllowWasmFallback: true,
      translationFallbackEnabled: true,
      onlineApiBase: 'https://example.com/v1',
      onlineApiKey: 'test-key',
      onlineModel: 'demo-model',
    };

    render(<App />);

    const textarea = await screen.findByRole('textbox');
    fireEvent.change(textarea, { target: { value: '你好，世界。' } });
    fireEvent.click(screen.getByRole('button', { name: '执行翻译' }));

    expect(await screen.findByText('Remote translation result')).toBeTruthy();
    expect(await screen.findByText('在线 AI')).toBeTruthy();
    expect(screen.queryByText(/待处理/)).toBeNull();
  });

  it('clears original text and result independently', async () => {
    render(<App />);

    const textarea = await screen.findByRole('textbox');
    fireEvent.change(textarea, { target: { value: '你好，世界。' } });
    fireEvent.click(screen.getByRole('button', { name: '执行翻译' }));

    expect(await screen.findByText(/Hello/)).toBeTruthy();

    const clearButtons = screen.getAllByRole('button', { name: '清空' });
    fireEvent.click(clearButtons[0]);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByText(/Hello/)).toBeTruthy();

    fireEvent.click(clearButtons[1]);
    expect(screen.getByText('Result will appear here.')).toBeTruthy();
  });
});
