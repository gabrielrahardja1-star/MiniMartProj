import { useTranslation } from 'react-i18next'
import { setLanguage } from '../i18n'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
]

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation()

  return (
    <div className={`inline-flex rounded-full bg-slate-100 p-1 ${className}`}>
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
            i18n.language === code
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
