/**
 * PermissionRequiredError 单元测试
 *
 * 契约：
 * - 有 name = 'PermissionRequiredError'
 * - 携带 origin (https://api.deepseek.com) + pattern (https://api.deepseek.com/*)
 * - instanceof Error（能被通用 catch 抓）
 * - isPermissionRequiredError(e) 类型守卫
 *
 * 为什么单独一类错：
 * SidePanel / SelectionBubble 拿到时要展示【授权 CTA】而不是普通『翻译失败』文案。
 * 用 name/instanceof 判定，避免依赖 message 字符串 match。
 */
import { describe, it, expect } from 'vitest';
import {
  PermissionRequiredError,
  isPermissionRequiredError,
} from '@utils/permission-error';

describe('PermissionRequiredError', () => {
  it('是 Error 的子类', () => {
    const err = new PermissionRequiredError({
      origin: 'https://api.deepseek.com',
      pattern: 'https://api.deepseek.com/*',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(PermissionRequiredError);
  });

  it('name === PermissionRequiredError（用于跨进程传递后的类型识别）', () => {
    const err = new PermissionRequiredError({
      origin: 'https://x',
      pattern: 'https://x/*',
    });
    expect(err.name).toBe('PermissionRequiredError');
  });

  it('携带 origin + pattern', () => {
    const err = new PermissionRequiredError({
      origin: 'https://api.groq.com',
      pattern: 'https://api.groq.com/*',
    });
    expect(err.origin).toBe('https://api.groq.com');
    expect(err.pattern).toBe('https://api.groq.com/*');
  });

  it('message 包含 origin，方便日志排查', () => {
    const err = new PermissionRequiredError({
      origin: 'https://api.deepseek.com',
      pattern: 'https://api.deepseek.com/*',
    });
    expect(err.message).toContain('api.deepseek.com');
  });
});

describe('isPermissionRequiredError', () => {
  it('自家实例 → true', () => {
    const err = new PermissionRequiredError({
      origin: 'https://x',
      pattern: 'https://x/*',
    });
    expect(isPermissionRequiredError(err)).toBe(true);
  });

  it('普通 Error → false', () => {
    expect(isPermissionRequiredError(new Error('boom'))).toBe(false);
  });

  it('跨进程传递后的裸对象（Error 原型丢了但 name/origin/pattern 都在）→ true', () => {
    // message-bus 反序列化后 instanceof 失效；用 name + 字段兜底
    const rehydrated = {
      name: 'PermissionRequiredError',
      message: 'permission required: https://api.deepseek.com',
      origin: 'https://api.deepseek.com',
      pattern: 'https://api.deepseek.com/*',
    };
    expect(isPermissionRequiredError(rehydrated)).toBe(true);
  });

  it('name 对但字段缺 → false', () => {
    expect(
      isPermissionRequiredError({ name: 'PermissionRequiredError' }),
    ).toBe(false);
  });

  it('null / undefined / 字符串 → false', () => {
    expect(isPermissionRequiredError(null)).toBe(false);
    expect(isPermissionRequiredError(undefined)).toBe(false);
    expect(isPermissionRequiredError('nope')).toBe(false);
  });
});
