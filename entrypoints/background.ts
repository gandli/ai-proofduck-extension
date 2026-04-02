import { t } from '../src/i18n';

export default defineBackground(() => {
  console.log(t('backgroundHello'), { id: browser.runtime.id });
});
