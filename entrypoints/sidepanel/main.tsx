import { createRoot } from 'react-dom/client';
import App from './App';
import { hydrateSettings } from '@stores/settings';
import { getEngines } from '@core/engines';
import '../style.css';

hydrateSettings().catch(console.error);
createRoot(document.getElementById('root')!).render(<App />);

// E2E 测试探针：把 EngineManager + 单个引擎实例挂到 window，供 Playwright 真调
// 生产装机不影响业务逻辑（只是 window 上多一个引用，没有网络/存储副作用）
if (typeof window !== 'undefined') {
  (window as any).__pd_engines = getEngines();
}
