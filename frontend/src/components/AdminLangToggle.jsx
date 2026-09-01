import { useTranslation } from 'react-i18next'
import { setLanguage } from '../i18n'
import { T } from '../utils/theme'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
]

// Inline-styled EN / 中文 pill that matches the admin mobile shell (the shared
// LanguageSwitcher is Tailwind/amber and only used on the Tailwind screens).
export default function AdminLangToggle() {
  const { i18n } = useTranslation()
  const current = i18n.language?.startsWith('zh') ? 'zh' : 'en'

  return (
    <div style={{
      display: 'inline-flex', gap: 3, padding: 3,
      background: T.surfaceAlt, borderRadius: 999,
    }}>
      {LANGS.map(({ code, label }) => {
        const active = current === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            style={{
              border: 'none', cursor: 'pointer',
              padding: '5px 12px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              background: active ? T.surface : 'transparent',
              color: active ? T.brand : T.ink3,
              boxShadow: active ? '0 1px 3px rgba(12,35,64,0.12)' : 'none',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
