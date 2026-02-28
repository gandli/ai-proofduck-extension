import { describe, it, expect } from 'vitest';
import { isValidModelUrl } from '../utils/urlValidation';

describe('Feature: URL Validation', () => {
  describe('Scenario: Valid URLs', () => {
    it('Given a valid HuggingFace URL When validating Then should return true', () => {
      const url = 'https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC/resolve/main/model.bin';
      expect(isValidModelUrl(url)).toBe(true);
    });

    it('Given a valid GitHub MLC-AI URL When validating Then should return true', () => {
      const url = 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/model.wasm';
      expect(isValidModelUrl(url)).toBe(true);
    });

    it('Given the root HuggingFace URL When validating Then should return true', () => {
      expect(isValidModelUrl('https://huggingface.co/')).toBe(true);
    });
  });

  describe('Scenario: Invalid URLs', () => {
    it('Given a malicious domain When validating Then should return false', () => {
      expect(isValidModelUrl('https://evil.com/model.bin')).toBe(false);
    });

    it('Given an HTTP URL When validating Then should return false', () => {
      expect(isValidModelUrl('http://huggingface.co/model.bin')).toBe(false);
    });

    it('Given a domain suffix attack When validating Then should return false', () => {
      expect(isValidModelUrl('https://huggingface.co.evil.com/model.bin')).toBe(false);
    });

    it('Given a GitHub user other than mlc-ai When validating Then should return false', () => {
      expect(isValidModelUrl('https://raw.githubusercontent.com/attacker/repo/main/exploit.bin')).toBe(false);
    });

    it('Given an empty URL When validating Then should return false', () => {
      expect(isValidModelUrl('')).toBe(false);
    });

    it('Given a URL without https scheme When validating Then should return false', () => {
        expect(isValidModelUrl('ftp://huggingface.co/test')).toBe(false);
    });
  });
});
