/**
 * message-bus 单元测试
 *
 * 设计动机（RED 阶段先写测试再写实现）：
 * - Chrome 的 chrome.runtime.sendMessage/onMessage 是弱类型 any，容易写错
 * - 我们要一层薄封装，让 sender 和 handler 共享同一个 payload 类型
 * - 使用 discriminated union 保证「type -> payload」的类型映射
 *
 * 契约：
 * 1. defineMessages<M>() 返回一个类型安全的 { send, on } 对象
 * 2. send(type, payload) 应调用 chrome.runtime.sendMessage
 * 3. on(type, handler) 应注册 chrome.runtime.onMessage 监听器
 * 4. handler 只应被匹配 type 的消息触发
 * 5. on() 应返回一个取消订阅函数
 */
import { describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { defineMessages } from '@core/message-bus';

// 定义业务消息 schema（示例：M2 之后真正的消息在这里加）
type AppMessages = {
  'engine:translate': { text: string; targetLang: string };
  'engine:summarize': { text: string; maxTokens?: number };
  'ping': undefined;
};

describe('message-bus', () => {
  describe('send()', () => {
    it('应把带 type 和 payload 的消息发送到 chrome.runtime', async () => {
      const bus = defineMessages<AppMessages>();
      const spy = vi.spyOn(fakeBrowser.runtime, 'sendMessage');

      await bus.send('engine:translate', { text: 'hi', targetLang: 'zh' });

      expect(spy).toHaveBeenCalledWith({
        type: 'engine:translate',
        payload: { text: 'hi', targetLang: 'zh' },
      });
    });

    it('payload 为 undefined 时也能发送（如 ping）', async () => {
      const bus = defineMessages<AppMessages>();
      const spy = vi.spyOn(fakeBrowser.runtime, 'sendMessage');

      await bus.send('ping', undefined);

      expect(spy).toHaveBeenCalledWith({ type: 'ping', payload: undefined });
    });
  });

  describe('on()', () => {
    it('handler 只应被匹配 type 的消息触发', async () => {
      const bus = defineMessages<AppMessages>();
      const translateHandler = vi.fn();
      const summarizeHandler = vi.fn();

      bus.on('engine:translate', translateHandler);
      bus.on('engine:summarize', summarizeHandler);

      // 模拟一条 translate 消息从 content script 发过来
      await fakeBrowser.runtime.sendMessage({
        type: 'engine:translate',
        payload: { text: 'hi', targetLang: 'zh' },
      });

      expect(translateHandler).toHaveBeenCalledWith({ text: 'hi', targetLang: 'zh' });
      expect(summarizeHandler).not.toHaveBeenCalled();
    });

    it('返回 unsubscribe 函数，调用后不再触发', async () => {
      const bus = defineMessages<AppMessages>();
      const handler = vi.fn();

      const unsub = bus.on('ping', handler);
      unsub();

      // 通过 bus.send 走 send 的 no-listeners 容错
      await bus.send('ping', undefined);

      expect(handler).not.toHaveBeenCalled();
    });

    it('忽略格式不合法的消息（无 type 字段）', async () => {
      const bus = defineMessages<AppMessages>();
      const handler = vi.fn();
      bus.on('ping', handler);

      // 直接派一条 garbage 进来（有 listener 存在，不会抛 No listeners）
      await fakeBrowser.runtime.sendMessage({ foo: 'bar' } as never);

      expect(handler).not.toHaveBeenCalled();
    });

    it('handler 返回 Promise 时保持通道开启（关键：Chrome onMessage 契约）', async () => {
      // 这个测试锁定 Gemini review 指出的坑：
      // 如果 handler 是 async 但 listener 直接返回 Promise，Chrome 会当真值关闭通道。
      // 我们的实现必须在检测到 Promise 时显式 return true。
      // 通过检查监听器函数签名的返回行为验证。
      type Bus = { 'echo': string };
      const bus = defineMessages<Bus>();

      let capturedReturn: unknown;
      const originalAdd = fakeBrowser.runtime.onMessage.addListener;
      const wrappedAdd = vi.fn((fn: unknown) => {
        // 用一个包装函数窥探真实 listener 的返回值
        const wrapper = (msg: unknown, s: unknown, sr: unknown) => {
          capturedReturn = (fn as (m: unknown, s: unknown, sr: unknown) => unknown)(msg, s, sr);
          return capturedReturn;
        };
        return originalAdd.call(fakeBrowser.runtime.onMessage, wrapper as never);
      });
      fakeBrowser.runtime.onMessage.addListener = wrappedAdd as never;

      try {
        bus.on('echo', async () => 'reply');
        await fakeBrowser.runtime.sendMessage({ type: 'echo', payload: 'hi' } as never);
        expect(capturedReturn).toBe(true);
      } finally {
        fakeBrowser.runtime.onMessage.addListener = originalAdd;
      }
    });
  });
});
