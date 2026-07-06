/**
 * origin-pattern: baseUrl → match pattern（"https://api.deepseek.com/*"）
 *
 * chrome.permissions.request({ origins: [...] }) 只接受 host+path pattern，
 * 不接受完整 URL。此工具从用户填的 baseUrl 里提取出规范 origin pattern。
 *
 * 契约：
 * - https 与 http 都支持
 * - 端口保留（本地 vLLM/Ollama 常带端口）
 * - path 一律丢弃换成 /*
 * - 空/畸形输入抛错（不静默返回空）
 */
import { describe, it, expect } from 'vitest';
import { extractOriginPattern } from '@core/origin-pattern';

describe('extractOriginPattern', () => {
  it('https + 无 path → 加 /*', () => {
    expect(extractOriginPattern('https://api.deepseek.com')).toBe('https://api.deepseek.com/*');
  });

  it('https + /v1 path → 丢 path 换 /*', () => {
    expect(extractOriginPattern('https://api.openai.com/v1')).toBe('https://api.openai.com/*');
  });

  it('https + trailing slash → /*', () => {
    expect(extractOriginPattern('https://api.groq.com/openai/v1/')).toBe('https://api.groq.com/*');
  });

  it('http + 端口（本地 vLLM）', () => {
    expect(extractOriginPattern('http://127.0.0.1:8000/v1')).toBe('http://127.0.0.1:8000/*');
  });

  it('http + 端口 + localhost（Ollama）', () => {
    expect(extractOriginPattern('http://localhost:11434')).toBe('http://localhost:11434/*');
  });

  it('空字符串抛错', () => {
    expect(() => extractOriginPattern('')).toThrow(/baseUrl/i);
  });

  it('畸形 URL 抛错', () => {
    expect(() => extractOriginPattern('not a url')).toThrow(/baseUrl/i);
  });

  it('缺 protocol 抛错（避免拼错域名）', () => {
    expect(() => extractOriginPattern('api.deepseek.com')).toThrow(/baseUrl/i);
  });
});
