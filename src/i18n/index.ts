import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { hu } from './hu';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: Object.fromEntries(Object.keys(hu).map((key) => [key, key])) },
    hu: { translation: hu },
  },
  lng:
    typeof window !== 'undefined' && localStorage.getItem('campus-language') === 'hu' ? 'hu' : 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'hu'],
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});

export default i18n;
