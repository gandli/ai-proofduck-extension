/**
 * formatErrorMessage util 单元测试
 *
 * 契约：
 * 1. Error 实例 → 返回 error.message
 * 2. 字符串 → 直接返回
 * 3. 其他（对象/null/undefined/number）→ 返回 String(err)
 * 4. 保留 fallback 参数：当 String(err) === '[object Object]' 之类无信息值时使用 fallback
 */
import { describe, it, expect } from 'vitest';
import { formatErrorMessage } from '@utils/error';

describe('formatErrorMessage', () => {
  it('Error 实例 → 返回 message', () => {
    expect(formatErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('字符串 → 直接返回', () => {
    expect(formatErrorMessage('oops')).toBe('oops');
  });

  it('对象（无 toString）→ 用 fallback', () => {
    // String({}) === '[object Object]'，没信息量 → fallback
    expect(formatErrorMessage({}, 'fallback')).toBe('fallback');
  });

  it('对象有 toString 时返回其结果', () => {
    const err = {
      toString() {
        return 'CustomError: xxx';
      },
    };
    expect(formatErrorMessage(err)).toBe('CustomError: xxx');
  });

  it('null → 返回 fallback', () => {
    expect(formatErrorMessage(null, '未知错误')).toBe('未知错误');
  });

  it('undefined → 返回 fallback', () => {
    expect(formatErrorMessage(undefined, '未知错误')).toBe('未知错误');
  });

  it('number → 转 string', () => {
    expect(formatErrorMessage(42)).toBe('42');
  });

  it('没传 fallback 时默认为 "未知错误"', () => {
    expect(formatErrorMessage(null)).toBe('未知错误');
  });

  it('DOMException（Chrome AI 常见）→ 返回 message', () => {
    const err = new DOMException('User denied', 'NotAllowedError');
    expect(formatErrorMessage(err)).toBe('User denied');
  });
});
