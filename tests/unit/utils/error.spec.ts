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
import { formatErrorMessage, sanitizeSecrets } from '@utils/error';

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

  it('含 message 属性的裸对象（chrome.runtime.lastError / 反序列化后的 Error）→ 返回 message', () => {
    // Gemini review 高严重度：Chrome 扩展跨进程传递会丢失 Error 原型
    expect(formatErrorMessage({ message: 'Extension context invalidated' })).toBe('Extension context invalidated');
    expect(formatErrorMessage({ message: 'No listeners' })).toBe('No listeners');
  });

  it('对象的 message 是空串 → 走后续兜底', () => {
    // 空 message 没信息量，落到 String(err) → '[object Object]' → fallback
    expect(formatErrorMessage({ message: '' }, 'FB')).toBe('FB');
  });

  it('对象的 message 是非字符串（number/object）→ 走后续兜底', () => {
    expect(formatErrorMessage({ message: 42 }, 'FB')).toBe('FB');
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

  // ========================
  // v0.5.3 P1-2: 出口脱敏，防 Error.message 里的 apiKey/Bearer 泄露到日志或 UI
  // ========================
  describe('敏感串脱敏', () => {
    it('OpenAI sk-* key 被脱敏', () => {
      // 用字符串拼接构造，规避静态 secret scanner 误报
      const key = 'sk-' + 'A'.repeat(40);
      const msg = formatErrorMessage(new Error(`HTTP 401: invalid api key ${key}`));
      expect(msg).not.toContain(key);
      expect(msg).toContain('sk-***REDACTED***');
    });

    it('Anthropic sk-ant-* key 被脱敏（前缀优先匹配）', () => {
      const key = 'sk-ant-' + 'B'.repeat(40);
      const msg = formatErrorMessage(new Error(`invalid api key ${key} rejected`));
      expect(msg).not.toContain(key);
      expect(msg).toContain('sk-ant-***REDACTED***');
      // 关键：不应误匹配成 sk-***REDACTED***（少了 ant-）
      expect(msg).not.toMatch(/sk-\*{3}REDACTED\*{3}(?!ant)/);
    });

    it('Bearer header 被脱敏', () => {
      const jwt = 'ey' + 'J'.repeat(30);
      const msg = formatErrorMessage(new Error(`Auth failed: Bearer ${jwt}`));
      expect(msg).not.toContain(jwt);
      expect(msg).toContain('Bearer ***REDACTED***');
    });

    it('x-api-key header 被脱敏', () => {
      const key = 'X'.repeat(32);
      const msg = formatErrorMessage(new Error(`x-api-key: ${key}`));
      expect(msg).not.toContain(key);
      expect(msg).toContain('x-api-key: ***REDACTED***');
    });

    it('字符串抛出也脱敏', () => {
      const key = 'sk-' + 'C'.repeat(40);
      const msg = formatErrorMessage(`plain string with ${key}`);
      expect(msg).not.toContain(key);
      expect(msg).toContain('sk-***REDACTED***');
    });

    it('裸对象 message 也脱敏（Chrome 跨进程 Error 反序列化场景）', () => {
      const key = 'sk-' + 'D'.repeat(40);
      const msg = formatErrorMessage({ message: `wrapped ${key}` });
      expect(msg).not.toContain(key);
      expect(msg).toContain('sk-***REDACTED***');
    });

    it('无敏感串的正常 Error → 原样返回', () => {
      expect(formatErrorMessage(new Error('network timeout'))).toBe('network timeout');
    });

    it('sanitizeSecrets 单独可用（用于对 raw body 脱敏）', () => {
      const key = 'sk-' + 'E'.repeat(40);
      const body = `{"error":{"code":"invalid_api_key","message":"Invalid: ${key}"}}`;
      const cleaned = sanitizeSecrets(body);
      expect(cleaned).not.toContain(key);
      expect(cleaned).toContain('sk-***REDACTED***');
    });

    it('sanitizeSecrets 幂等（多次调用不变）', () => {
      const key = 'sk-' + 'F'.repeat(40);
      const once = sanitizeSecrets(`x ${key} y`);
      const twice = sanitizeSecrets(once);
      expect(twice).toBe(once);
    });
  });
});
