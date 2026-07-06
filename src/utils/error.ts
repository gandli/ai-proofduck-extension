/**
 * 错误信息规范化
 *
 * 目的：整个扩展里到处出现的 `err instanceof Error ? err.message : String(err)` 模式
 * 集中成一个函数，消灭样板 + 补齐边缘 case（null/undefined、无 toString 的裸对象、DOMException）。
 *
 * Jules AI 在 #454 提出了这个抽取思路，感谢；此实现是采纳精神后的完善版本。
 */

/**
 * 把任意 unknown 值格式化成可读的错误消息字符串。
 *
 * @param err       抛出物（catch 拿到的 unknown）
 * @param fallback  当值本身无信息量时（null/undefined/裸 Object）的备选文本
 */
export function formatErrorMessage(err: unknown, fallback = '未知错误'): string {
  if (err === null || err === undefined) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;

  // Chrome 扩展关键场景：跨进程传递的错误（chrome.runtime.lastError、
  // sendMessage 反序列化后的 Error）会丢失 Error 原型，变成裸对象但保留 message 字段。
  // 没这一层判断，message-bus 里对 'Extension context invalidated' 的静默处理会失效。
  // Gemini review 提出的高严重度问题。
  if (typeof err === 'object' && 'message' in err) {
    const msg = (err as Record<string, unknown>).message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
  }

  // 兜底：走 String(err)；但 `[object Object]` 无信息 → fallback
  const s = String(err);
  if (s === '[object Object]') return fallback;
  return s;
}
