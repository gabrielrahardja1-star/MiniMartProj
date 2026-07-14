import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { Delete, HardHat } from 'lucide-react'
import toast from 'react-hot-toast'
import LanguageSwitcher from '../components/LanguageSwitcher'

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function Login() {
  const [employeeId, setEmployeeId] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [shaking, setShaking] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!employeeId.trim()) return toast.error(t('login.errors.missingId'))
    if (pin.length !== 4) return toast.error(t('login.errors.missingPin'))
    setLoading(true)
    try {
      const user = await login(employeeId.toUpperCase().trim(), pin)
      navigate(user.role === 'admin' ? '/admin' : '/shop')
    } catch {
      setShaking(true)
      setPin('')
      setTimeout(() => setShaking(false), 500)
      toast.error(t('login.errors.invalidCreds'))
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit when PIN is complete
  function onDigitPress(d) {
    if (d === '⌫') { setPin(p => p.slice(0, -1)); return }
    if (d === '') return
    if (pin.length < 4) {
      const newPin = pin + d
      setPin(newPin)
      if (newPin.length === 4 && employeeId.trim()) {
        // small delay so user sees the 4th dot fill
        setTimeout(() => handleSubmitWithPin(newPin), 120)
      }
    }
  }

  async function handleSubmitWithPin(pinValue) {
    if (!employeeId.trim()) return toast.error(t('login.errors.missingId'))
    setLoading(true)
    try {
      const user = await login(employeeId.toUpperCase().trim(), pinValue)
      navigate(user.role === 'admin' ? '/admin' : '/shop')
    } catch {
      setShaking(true)
      setPin('')
      setTimeout(() => setShaking(false), 500)
      toast.error(t('login.errors.invalidCreds'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-amber-500 rounded-2xl p-3.5 mb-3 shadow-lg shadow-amber-200">
            <HardHat size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('login.title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Employee ID */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {t('login.employeeId')}
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value.toUpperCase())}
              placeholder={t('login.employeeIdPlaceholder')}
              autoComplete="username"
              className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-4 py-3 text-lg font-bold uppercase tracking-widest text-slate-900 focus:outline-none transition-colors duration-150 text-center"
            />
          </div>

          {/* PIN dots */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
              {t('login.pin')}
            </label>
            <div className={`flex justify-center gap-4 mb-5 ${shaking ? 'animate-shake' : ''}`}>
              {[0,1,2,3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    i < pin.length
                      ? 'bg-amber-500 scale-110 shadow-md shadow-amber-200'
                      : 'border-2 border-slate-300'
                  }`}
                />
              ))}
            </div>

            {/* PIN pad */}
            <div className="grid grid-cols-3 gap-3">
              {DIGITS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onDigitPress(d)}
                  disabled={loading}
                  style={{ touchAction: 'manipulation' }}
                  className={`h-14 rounded-2xl text-xl font-bold transition-all duration-150
                    ${d === ''
                      ? 'cursor-default'
                      : d === '⌫'
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 active:bg-slate-300'
                        : 'bg-slate-50 text-slate-900 hover:bg-amber-50 hover:border-amber-300 border-2 border-slate-100 active:scale-95 active:bg-amber-100'
                    } disabled:opacity-50`}
                >
                  {d === '⌫' ? <Delete size={20} className="mx-auto" /> : d}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || pin.length !== 4 || !employeeId.trim()}
            style={{ touchAction: 'manipulation' }}
            className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 active:scale-[0.98] disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-all duration-150 shadow-lg shadow-amber-200 text-base"
          >
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>
      </div>
    </div>
  )
}
