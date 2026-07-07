/**
 * 错误信息规范化
 *
 * 目的：整个扩展里到处出现的 `err instanceof Error ? err.message : String(err)` 模式
 * 集中成一个函数，消灭样板 + 补齐边缘 case（null/undefined、无 toString 的裸对象、DOMException）。
 *
 * Jules AI 在 #454 提出了这个抽取思路，感谢；此实现是采纳精神后的完善版本。
 *
 * v0.5.3 P1-2：所有 formatErrorMessage 出口都过一层脱敏。
 * 场景：某些引擎（openai-compat / webllm / chrome-ai）抛的 Error.message 里可能拼进
 * 网关 4xx body（含 apiKey / Bearer token）；如果不在入口统一脱敏，
 * message-bus 的 console.error 或 UI 显示会泄漏。
 * 单点脱敏 > 分散在每个引擎里各修各的。
 */

/**
 * 敏感串脱敏 pattern。
 * 单独 export 供 openai-compat 等场景直接对 body 脱敏（避免拼进 Error message 前二次拷贝）。
 */
export const SECRET_PATTERNS: Array<[RegExp, string]> = [
  // Anthropic sk-ant-* 必须排在 OpenAI sk-* 前面，否则 sk- 前缀会先匹配
  [/sk-ant-[A-Za-z0-9_-]{20,}/g, 'sk-ant-***REDACTED***'],
  [/sk-[A-Za-z0-9_-]{20,}/g, 'sk-***REDACTED***'],
  // Bearer / x-api-key 字符集覆盖标准 Base64 + Base64URL + RFC 6750：
  // +、/、=、~ 都是合法字符，不覆盖会导致 token 部分泄漏或完全不脱敏（Gemini high sev）
  [/Bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer ***REDACTED***'],
  [/x-api-key[:\s=]+[A-Za-z0-9._~+/=-]{16,}/gi, 'x-api-key: ***REDACTED***'],
];

/** 对任意字符串做敏感串脱敏，返回新字符串（不修改原值） */
export function sanitizeSecrets(text: string): string {
  return SECRET_PATTERNS.reduce((acc, [re, repl]) => acc.replace(re, repl), text);
}

/**
 * 把任意 unknown 值格式化成可读的错误消息字符串。
 * 出口默认做敏感串脱敏，防止 Error.message 里的 apiKey / Bearer 泄漏到日志或 UI。
 *
 * @param err       抛出物（catch 拿到的 unknown）
 * @param fallback  当值本身无信息量时（null/undefined/裸 Object）的备选文本
 */
export function formatErrorMessage(err: unknown, fallback = '未知错误'): string {
  const raw = extractRawMessage(err, fallback);
  return sanitizeSecrets(raw);
}

/**
 * 统一的"打日志前脱敏"入口。
 *
 * v0.5.3 P2-B（审计 v2）：popup/options/sidepanel 的 main.tsx 里裸写 console.error(err) 会
 * 直接把 err.message/err.stack 打到 devtools，绕过 formatErrorMessage 建立的脱敏出口。
 * 全站换用 logSanitizedError 后，任何 apiKey/Bearer/x-api-key 在日志侧都不会明文出现。
 *
 * v0.5.3 P2-B Gemini review（high）：只打 message 会丢 stack，生产 debug 困难。
 * 修复：Error 实例时同时打脱敏后的 stack；非 Error 或无 stack 时退化为只打 message。
 *
 * @param prefix - 场景标记（用于日志分区，如 '[popup]'）
 * @param err    - 未知错误对象
 */
export function logSanitizedError(prefix: string, err: unknown): void {
  const msg = formatErrorMessage(err);
  if (err instanceof Error && typeof err.stack === 'string') {
    // 允许直接 console.error：这就是全站"打日志前脱敏"的收口
    console.error(`${prefix} ${msg}\n${sanitizeSecrets(err.stack)}`);
    return;
  }
  console.error(`${prefix} ${msg}`);
}

function extractRawMessage(err: unknown, fallback: string): string {
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
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- 这里就是要探测默认 toString
  const s = String(err);
  if (s === '[object Object]') return fallback;
  return s;
}
