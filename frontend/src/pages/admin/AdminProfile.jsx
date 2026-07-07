import { useNavigate } from 'react-router-dom'
import { T } from '../../utils/theme'
import Ic from '../../components/Ic'
import { useAuth } from '../../context/AuthContext'

export default function AdminProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = (user?.name || 'A')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const menuItems = [
    { ic: 'trend',   label: 'Reports & exports',  action: () => navigate('/admin/reports') },
    { ic: 'doc',     label: 'Invoices',            action: () => navigate('/admin/invoices') },
    { ic: 'profile', label: 'Manage workers',      action: () => navigate('/admin/workers') },
    { ic: 'wallet',  label: 'Wallet ledger',       action: () => navigate('/admin/wallet-ledger') },
    { ic: 'pkg',     label: 'Suppliers',           action: null },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 16px' }}>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Profile</div>
      </div>

      {/* User card */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: T.surface, borderRadius: 20, padding: 18,
          border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `linear-gradient(135deg, ${T.brand}, ${T.brandDeep})`,
            color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 20, flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.ink, fontSize: 17, fontWeight: 700 }}>{user?.name || 'Admin'}</div>
            <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>{user?.employee_id || '—'}</div>
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 999, background: T.brandSoft, color: T.brand,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
          }}>Admin</div>
        </div>
      </div>

      {/* Menu */}
      <div style={{ margin: '0 20px', borderRadius: 18, border: `1px solid ${T.line}`, overflow: 'hidden', background: T.surface }}>
        {menuItems.map((item, i) => (
          <div key={i} onClick={item.action || undefined} style={{
            padding: '14px 16px', background: T.surface,
            display: 'flex', alignItems: 'center', gap: 14,
            cursor: item.action ? 'pointer' : 'default',
            borderBottom: i < menuItems.length - 1 ? `1px solid ${T.line}` : 'none',
            opacity: item.action ? 1 : 0.5,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: T.surfaceAlt,
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <Ic name={item.ic} size={18} color={T.ink2} />
            </div>
            <div style={{ flex: 1, color: T.ink, fontSize: 14, fontWeight: 600 }}>{item.label}</div>
            {item.action && <Ic name="arrow" size={16} color={T.ink3} />}
          </div>
        ))}
      </div>

      {/* Logout */}
      <div style={{ padding: '20px 20px 0' }}>
        <div onClick={logout} style={{
          padding: 16, borderRadius: 16, background: T.badSoft, color: T.bad,
          fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Ic name="logout" size={18} color={T.bad} />
          Sign out
        </div>
      </div>

      <div style={{ height: 16 }} />
    </div>
  )
}
