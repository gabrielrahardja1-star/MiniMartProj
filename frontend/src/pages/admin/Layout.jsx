import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Package, ShoppingBag, FileText, BarChart2, LogOut, PanelLeft, HardHat } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/admin/products', icon: Package, label: 'Inventory' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/admin/invoices', icon: FileText, label: 'Invoices' },
  { to: '/admin/reports', icon: BarChart2, label: 'Reports' },
]

const PAGE_TITLES = {
  '/admin/products': 'Inventory',
  '/admin/orders': 'Orders',
  '/admin/invoices': 'Invoices',
  '/admin/reports': 'Reports',
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', collapsed) } catch {}
  }, [collapsed])

  function handleLogout() { logout(); navigate('/login') }

  const pageTitle = PAGE_TITLES[pathname] || 'Admin'
  const initials = user?.name?.charAt(0)?.toUpperCase() || 'A'

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-14' : 'w-56'} bg-slate-900 flex flex-col shrink-0 transition-all duration-200 ease-in-out`}
        style={{ minHeight: '100vh' }}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-3 py-4 border-b border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
          <div className="bg-amber-500 rounded-xl p-1.5 shrink-0">
            <HardHat size={16} className="text-white" />
          </div>
          {!collapsed && <span className="font-bold text-white text-sm leading-tight">MiniMart<br /><span className="text-slate-400 font-normal text-xs">Admin Panel</span></span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm transition-all duration-150 group relative
                ${isActive
                  ? 'bg-slate-800 text-white font-semibold border-l-2 border-amber-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: collapse toggle + logout */}
        <div className="border-t border-slate-800 p-2 space-y-0.5">
          <button
            onClick={handleLogout}
            title="Sign out"
            className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-slate-800 hover:text-white transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          >
            <PanelLeft size={18} className={`shrink-0 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Admin</p>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">{user?.name}</span>
            <div
              className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0"
              title={user?.name}
            >
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
