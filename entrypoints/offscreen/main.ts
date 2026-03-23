import { RUNTIME_MESSAGES, type Settings } from '../shared/contracts';
import { executeProcessing } from '../sidepanel/lib/executeProcessing';

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== RUNTIME_MESSAGES.offscreenTranslate || message?.target !== 'offscreen') {
    return undefined;
  }

  return executeProcessing({
    text: String(message.payload?.text ?? ''),
    mode: 'translate',
    settings: message.payload?.settings as Settings,
  })
    .then((result) => ({
      ok: true,
      ...result,
    }))
    .catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
});
