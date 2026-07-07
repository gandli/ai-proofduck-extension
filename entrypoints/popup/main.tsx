import { createRoot } from 'react-dom/client';
import App from './App';
import { hydrateSettings } from '@stores/settings';
import { logSanitizedError } from '@utils/error';
import '../style.css';

hydrateSettings().catch((err: unknown) => logSanitizedError('[popup]', err));
createRoot(document.getElementById('root')!).render(<App />);
