import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
};

// 获取系统语言或存储的语言偏好
const getInitialLanguage = (): string => {
  const stored = localStorage.getItem('mxu-language');
  if (stored && (stored === 'zh-CN' || stored === 'en-US')) {
    return stored;
  }
  
  const systemLang = navigator.language;
  if (systemLang.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en-US';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false,
    },
  });

export const setLanguage = (lang: 'zh-CN' | 'en-US') => {
  i18n.changeLanguage(lang);
  localStorage.setItem('mxu-language', lang);
};

export const getCurrentLanguage = () => i18n.language as 'zh-CN' | 'en-US';

export default i18n;
