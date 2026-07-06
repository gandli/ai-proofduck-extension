import { createRoot } from 'react-dom/client';
import App from './App';
import { hydrateSettings } from '@stores/settings';
import '../style.css';

hydrateSettings().catch(console.error);
createRoot(document.getElementById('root')!).render(<App />);
