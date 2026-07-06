/**
 * origin-pattern: baseUrl → chrome.permissions match pattern
 *
 * chrome.permissions API 要 "scheme://host[:port]/path" 格式的 pattern，
 * 不吃裸 URL、也不吃 origin 后跟具体 path。此工具做规范化。
 *
 * 参考：https://developer.chrome.com/docs/extensions/reference/api/permissions#match-patterns
 */

export function extractOriginPattern(baseUrl: string): string {
  if (!baseUrl || !baseUrl.trim()) {
    throw new Error('baseUrl 不能为空');
  }
  // URL 构造器要求带 protocol，否则视为畸形（防止用户填 "api.xxx.com" 拼错）
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new Error(`baseUrl 必须以 http:// 或 https:// 开头：${baseUrl}`);
  }
  let u: URL;
  try {
    u = new URL(baseUrl);
  } catch {
    throw new Error(`baseUrl 格式非法：${baseUrl}`);
  }
  // origin 已含 scheme://host[:port]，追加 /* 覆盖所有 path
  return `${u.origin}/*`;
}
