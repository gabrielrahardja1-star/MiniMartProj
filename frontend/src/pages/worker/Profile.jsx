import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { T, FONT } from '../../utils/theme'
import { formatCurrency, formatMonth } from '../../utils/format'
import Ic from '../../components/Ic'
import api from '../../api'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [spending, setSpending] = useState(null)
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    api.get('/orders/my/spending').then(r => setSpending(r.data)).catch(() => {})
    api.get('/wallet/me').then(r => setWallet(r.data)).catch(() => {})
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const menuRows = [
    { icon: 'bell',   label: 'Notifications',  sub: 'Pickup reminders on' },
    { icon: 'phone',  label: 'Contact store',   sub: 'Tap to call the MiniMart' },
    { icon: 'orders', label: 'Order history',   sub: 'View all past receipts' },
    { icon: 'star',   label: 'Send feedback',   sub: '' },
  ]

  return (
    <div style={{ background: T.bg, fontFamily: FONT, paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 16px' }}>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Profile</div>
      </div>

      {/* Worker card */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: T.surface, borderRadius: 20, padding: 18,
          border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `linear-gradient(135deg, ${T.brand}, ${T.brandDeep})`,
            color: '#fff', display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 20, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.ink, fontSize: 17, fontWeight: 700 }}>{user?.name}</div>
            <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>
              {user?.employee_id} · Worker
            </div>
          </div>
        </div>
      </div>

      {/* Wallet balance */}
      {wallet && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ background: T.surface, borderRadius: 20, padding: 18, border: `1px solid ${T.line}` }}>
            <div style={{
              color: T.ink3, fontSize: 11, fontWeight: 700,
              letterSpacing: 0.5, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Ic name="wallet" size={13} color={T.ink3} />
              Wallet balance
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <div style={{ color: T.ink, fontSize: 26, fontWeight: 700 }}>
                {formatCurrency(wallet.balance)}
              </div>
            </div>
            <div style={{ marginTop: 8, color: T.ink3, fontSize: 12 }}>
              Top up in person at the counter
            </div>
          </div>
        </div>
      )}

      {/* Spending summary */}
      {spending && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ background: T.surface, borderRadius: 20, padding: 18, border: `1px solid ${T.line}` }}>
            <div style={{
              color: T.ink3, fontSize: 11, fontWeight: 700,
              letterSpacing: 0.5, textTransform: 'uppercase',
            }}>
              Total spending · {formatMonth(spending.month)}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <div style={{ color: T.ink, fontSize: 26, fontWeight: 700 }}>
                {formatCurrency(spending.total_spend)}
              </div>
              <div style={{ color: T.ink3, fontSize: 13 }}>
                across {spending.order_count} {spending.order_count === 1 ? 'order' : 'orders'}
              </div>
            </div>
            <div style={{ marginTop: 8, color: T.ink3, fontSize: 12 }}>
              Auto-deducted from payroll · resets next month
            </div>
          </div>
        </div>
      )}

      {/* Menu rows */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ background: T.surface, borderRadius: 18, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
          {menuRows.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                borderBottom: i < menuRows.length - 1 ? `1px solid ${T.line}` : 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: T.surfaceAlt, display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <Ic name={item.icon} size={18} color={T.ink2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                {item.sub && <div style={{ color: T.ink3, fontSize: 12, marginTop: 1 }}>{item.sub}</div>}
              </div>
              <Ic name="arrow" size={16} color={T.ink3} />
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div style={{ padding: '0 20px' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '14px', borderRadius: 16,
            background: T.surface, border: `1px solid ${T.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            color: T.bad, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
          }}
        >
          <Ic name="logout" size={18} color={T.bad} />
          Sign out
        </button>
      </div>
    </div>
  )
}
