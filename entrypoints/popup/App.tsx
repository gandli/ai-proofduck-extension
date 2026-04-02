import { useState } from 'react';
import reactLogo from '@/assets/react.svg';
import wxtLogo from '/wxt.svg';
import { t } from '../../src/i18n';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://wxt.dev" target="_blank">
          <img src={wxtLogo} className="logo" alt="WXT logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>{t('popupTitle')}</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          {t('popupButtonLabel')}: {count}
        </button>
        <p>
          {t('popupEditText')}
        </p>
      </div>
      <p className="read-the-docs">
        {t('popupReadDocs')}
      </p>
    </>
  );
}

export default App;
