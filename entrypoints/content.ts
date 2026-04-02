import { t } from '../src/i18n';

export default defineContentScript({
  matches: ['*://*.google.com/*'],
  main() {
    console.log(t('contentHello'));
  },
});
