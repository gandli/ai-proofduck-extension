/**
 * message-bus: 类型安全的 Chrome runtime 消息封装
 *
 * 为什么需要这层封装？
 * - chrome.runtime.sendMessage/onMessage 是 any 类型，容易写错消息 payload
 * - 我们把「消息类型 -> payload 类型」映射用 TS 泛型固定下来
 * - send() 和 on() 在编译期就能校验 payload 结构
 *
 * 使用方式（在 src/core/messages.ts 里定义 schema，然后 export 出 bus）：
 *   type Messages = { 'engine:translate': { text: string } };
 *   export const bus = defineMessages<Messages>();
 *
 * background 侧：bus.on('engine:translate', ({ text }) => ...)
 * content 侧：  bus.send('engine:translate', { text: 'hi' })
 */

/** 消息 schema 约束：key 是消息类型字符串，value 是 payload 类型 */
import { formatErrorMessage } from '../utils/error';

export type MessageSchema = Record<string, unknown>;

/** 内部使用的 wire format */
interface Envelope<T extends string, P> {
  type: T;
  payload: P;
}

/** 类型安全的消息总线 */
export interface MessageBus<M extends MessageSchema> {
  /** 发送一条消息到 background / 其它上下文 */
  send<K extends keyof M & string>(type: K, payload: M[K]): Promise<unknown>;
  /**
   * 注册一个消息处理器，仅在 type 匹配时触发。
   * 返回 unsubscribe 函数用于清理。
   */
  on<K extends keyof M & string>(type: K, handler: (payload: M[K]) => void | Promise<unknown>): () => void;
}

/**
 * 创建一个类型安全的消息总线实例。
 *
 * 内部约定 wire format 为 { type, payload }，
 * 派发时按 type 字段精确匹配，忽略格式非法的消息（防守式编程）。
 */
export function defineMessages<M extends MessageSchema>(): MessageBus<M> {
  return {
    async send(type, payload) {
      try {
        return await chrome.runtime.sendMessage({ type, payload } satisfies Envelope<typeof type, typeof payload>);
      } catch (err) {
        // Chrome 在无监听器 / 上下文断开时抛 "No listeners" / "Extension context invalidated"
        // 这是常见场景（如 sidepanel 关闭时 content 发消息），静默处理，返回 undefined
        const message = formatErrorMessage(err, '');
        if (message.includes('No listeners') || message.includes('context invalidated')) {
          return undefined;
        }
        throw err;
      }
    },

    on(type, handler) {
      const listener = (
        message: unknown,
        _sender: chrome.runtime.MessageSender,
        sendResponse?: (response: unknown) => void,
      ) => {
        // 防御：忽略非我们定义的 envelope
        if (
          typeof message !== 'object' ||
          message === null ||
          !('type' in message) ||
          (message as { type: unknown }).type !== type
        ) {
          return undefined;
        }
        const env = message as Envelope<string, unknown>;
        const result = handler(env.payload as M[typeof type]);

        // 关键：Chrome onMessage 的 handler 若返回 Promise，Chrome 会把它当真值
        // 直接关闭 message 通道 —— 发送方拿不到异步结果。
        // 正确做法：显式 return true 保持通道开启，Promise resolve 后调 sendResponse。
        // sendResponse 在测试环境（fakeBrowser）可能未提供，做防御式判断。
        if (result instanceof Promise) {
          result
            .then((res) => sendResponse?.(res))
            .catch((err: unknown) => {
              console.error('[message-bus] handler failed:', err);
              sendResponse?.({ error: formatErrorMessage(err, '') });
            });
          return true;
        }
        if (result !== undefined) {
          sendResponse?.(result);
        }
        return undefined;
      };

      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
  };
}
