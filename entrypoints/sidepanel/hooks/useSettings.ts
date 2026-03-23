import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_SETTINGS, STORAGE_KEYS, type Settings } from '../../shared/contracts';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    browser.storage.local
      .get(STORAGE_KEYS.settings)
      .then((result) => {
        if (!alive) return;
        const saved = result[STORAGE_KEYS.settings] as Partial<Settings> | undefined;
        setSettings({ ...DEFAULT_SETTINGS, ...saved });
      })
      .finally(() => {
        if (alive) setReady(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  const updateSettings = async (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await browser.storage.local.set({ [STORAGE_KEYS.settings]: next });
  };

  return useMemo(
    () => ({
      settings,
      ready,
      updateSettings,
    }),
    [ready, settings],
  );
}
