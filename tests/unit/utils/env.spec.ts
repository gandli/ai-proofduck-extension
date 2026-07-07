/**
 * isE2EBuild util 单元测试
 *
 * v0.5.3 P2-E（审计 v2）：VITE_PD_E2E === 'true' 字符串比较收口
 * 契约：
 * 1. 未定义 / undefined → false（fail-safe：生产不注入探针）
 * 2. 'true' / 'True' / 'TRUE' → true（大小写不敏感）
 * 3. '1' → true（兼容常见 CI 字面量）
 * 4. 'false' / '0' / 空串 / 其他 → false
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('isE2EBuild', () => {
  let originalEnv: Record<string, unknown>;

  beforeEach(() => {
    // vitest 的 import.meta.env 是 proxy，直接写属性会抛，得用 vi.stubEnv
    originalEnv = { ...import.meta.env };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function loadIsE2EBuild(value: string | undefined) {
    if (value === undefined) {
      vi.stubEnv('VITE_PD_E2E', '');
    } else {
      vi.stubEnv('VITE_PD_E2E', value);
    }
    // 动态 import 避免缓存
    vi.resetModules();
    const mod = await import('@utils/env');
    return mod.isE2EBuild();
  }

  it("未定义 → false（fail-safe）", async () => {
    expect(await loadIsE2EBuild(undefined)).toBe(false);
  });

  it("'true' → true", async () => {
    expect(await loadIsE2EBuild('true')).toBe(true);
  });

  it("'TRUE' 大写 → true（不敏感）", async () => {
    expect(await loadIsE2EBuild('TRUE')).toBe(true);
  });

  it("'True' 混合大小写 → true", async () => {
    expect(await loadIsE2EBuild('True')).toBe(true);
  });

  it("'1' 数字字面量 → true", async () => {
    expect(await loadIsE2EBuild('1')).toBe(true);
  });

  it("' true ' 首尾空格 → true（trim）", async () => {
    expect(await loadIsE2EBuild(' true ')).toBe(true);
  });

  it("'false' → false", async () => {
    expect(await loadIsE2EBuild('false')).toBe(false);
  });

  it("'0' → false", async () => {
    expect(await loadIsE2EBuild('0')).toBe(false);
  });

  it("空串 → false", async () => {
    expect(await loadIsE2EBuild('')).toBe(false);
  });

  it("垃圾值 'yes' → false（严格白名单）", async () => {
    expect(await loadIsE2EBuild('yes')).toBe(false);
  });

  // 断言原始 env 未被污染
  it('测试后 env 恢复原状', () => {
    expect(import.meta.env).toEqual(originalEnv);
  });
});
