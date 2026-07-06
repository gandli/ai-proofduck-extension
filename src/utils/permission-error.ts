/**
 * PermissionRequiredError
 *
 * 语义：引擎运行时发现自己缺 host 权限，抛此错误让上层 UI 展示【授权 CTA】而非通用『翻译失败』。
 *
 * 跨进程传递注意：
 * 校对鸭里 SidePanel/Bubble ↔ background 之间的错误会走 chrome.runtime.sendMessage
 * 反序列化后 Error 原型丢失变成裸对象。因此 isPermissionRequiredError 双通道识别：
 * 1) instanceof（同进程正常路径）
 * 2) 鸭子类型（name === 'PermissionRequiredError' && origin && pattern）
 */

export interface PermissionRequiredErrorInit {
  /** 待授权的 origin，如 'https://api.deepseek.com' */
  origin: string;
  /** 授权 pattern，用于 chrome.permissions.request，如 'https://api.deepseek.com/*' */
  pattern: string;
}

export class PermissionRequiredError extends Error {
  readonly origin: string;
  readonly pattern: string;

  constructor(init: PermissionRequiredErrorInit) {
    super(`permission required: ${init.origin}`);
    this.name = 'PermissionRequiredError';
    this.origin = init.origin;
    this.pattern = init.pattern;
    // 保证 stack 在 Chrome/V8 里指向业务代码而非 constructor 本身
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, PermissionRequiredError);
    }
  }
}

interface RehydratedShape {
  name?: unknown;
  origin?: unknown;
  pattern?: unknown;
}

/**
 * 类型守卫：识别 PermissionRequiredError（含跨进程反序列化后的裸对象形态）
 */
export function isPermissionRequiredError(err: unknown): boolean {
  if (err instanceof PermissionRequiredError) return true;
  if (typeof err !== 'object' || err === null) return false;
  const o = err as RehydratedShape;
  return (
    o.name === 'PermissionRequiredError' &&
    typeof o.origin === 'string' &&
    typeof o.pattern === 'string'
  );
}
