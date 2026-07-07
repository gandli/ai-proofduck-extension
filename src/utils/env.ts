/**
 * E2E 编译时开关判断 · 单点收口
 *
 * v0.5.3 P2-E（审计 v2）：sidepanel/main.tsx 原本直接写
 * `env.VITE_PD_E2E === 'true'`，两个脆点：
 * 1. 字符串比较对大小写敏感（'TRUE'/'True' 不生效）
 * 2. 到处重复此字面量易漂移
 *
 * 收口到 helper 后：
 * - 大小写不敏感（转 lower）
 * - trim 首尾空格
 * - 白名单严格 'true' / '1'，'yes'/'on' 一律 false
 * - fail-safe：未定义 → false（生产不注入探针）
 *
 * v0.5.3 Gemini review：加可选链兜底 —— 某些非 Bundler / 特殊测试上下文里
 * `import.meta` 或 `.env` 可能未定义，避免运行时炸。
 *
 * @returns true 仅当当前构建是 E2E 专用构建（`bun run build:e2e`）
 */
interface ProofDuckEnv {
  VITE_PD_E2E?: string;
}

export function isE2EBuild(): boolean {
  const meta = import.meta as { env?: ProofDuckEnv } | undefined;
  const raw = meta?.env?.VITE_PD_E2E;
  if (typeof raw !== 'string') return false;
  const norm = raw.trim().toLowerCase();
  return norm === 'true' || norm === '1';
}
