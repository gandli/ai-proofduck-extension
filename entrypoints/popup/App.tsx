import { useState } from 'react';
import { t } from '../../src/i18n';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <img src="/icon.svg" className="logo" alt="ProofDuck logo" />
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
