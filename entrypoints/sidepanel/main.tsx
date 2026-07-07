import { createRoot } from 'react-dom/client';
import App from './App';
import { hydrateSettings } from '@stores/settings';
import { getEngines } from '@core/engines';
import { logSanitizedError } from '@utils/error';
import { isE2EBuild } from '@utils/env';
import '../style.css';

void hydrateSettings().catch((err: unknown) => logSanitizedError('[sidepanel]', err));
const rootEl = document.getElementById('root');
if (rootEl) createRoot(rootEl).render(<App />);

// E2E 测试探针：把 EngineManager 挂到 window，供 Playwright 真调
// 安全 gate：仅在 E2E 构建时挂载（isE2EBuild 收口 VITE_PD_E2E 判断）
//   - 生产 zip（bun run build）：VITE_PD_E2E 未定义 → __pd_engines 不存在
//     防止 XSS 拿到 EngineManager 反射出 openai-compat 的 apiKey
//   - E2E 构建（bun run build:e2e）：VITE_PD_E2E=true → 注入探针
if (typeof window !== 'undefined' && isE2EBuild()) {
  (window as unknown as { __pd_engines: ReturnType<typeof getEngines> }).__pd_engines =
    getEngines();
}
