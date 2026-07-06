import { createRoot } from 'react-dom/client';
import App from './App';
import { hydrateSettings } from '@stores/settings';
import { getEngines } from '@core/engines';
import '../style.css';

hydrateSettings().catch(console.error);
createRoot(document.getElementById('root')!).render(<App />);

// E2E 测试探针：把 EngineManager 挂到 window，供 Playwright 真调
// 安全 gate：仅在 __PD_E2E__ 编译常量为 true 时挂载
//   - 生产 zip（bun run build）：__PD_E2E__ = false，__pd_engines 不存在
//     → 防止 XSS 拿到 EngineManager 反射出 openai-compat 的 apiKey
//   - E2E 构建（bun run build:e2e）：__PD_E2E__ = true，注入探针
if (typeof window !== 'undefined' && (import.meta.env as any).VITE_PD_E2E === 'true') {
  (window as any).__pd_engines = getEngines();
}
