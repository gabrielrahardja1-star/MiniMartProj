import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zh from './locales/zh.json'

const STORAGE_KEY = 'lang'
const savedLang = localStorage.getItem(STORAGE_KEY)

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    lng: savedLang || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React already escapes
  })

export function setLanguage(lang) {
  i18n.changeLanguage(lang)
  localStorage.setItem(STORAGE_KEY, lang)
}

export default i18n
