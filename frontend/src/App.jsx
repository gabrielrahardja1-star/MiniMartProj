import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'

import Login from './pages/Login'
import WorkerLayout from './pages/worker/WorkerLayout'
import Home from './pages/worker/Home'
import Shop from './pages/worker/Shop'
import Orders from './pages/worker/Orders'
import Profile from './pages/worker/Profile'
import AdminLayout from './pages/admin/Layout'
import AdminProducts from './pages/admin/Products'
import AdminOrders from './pages/admin/AdminOrders'
import Invoices from './pages/admin/Invoices'
import Reports from './pages/admin/Reports'

function RequireAuth({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/home'} replace />
  return children
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/admin' : '/home'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 2500,
              style: { borderRadius: '12px', fontWeight: 500, fontSize: '14px' },
              success: { iconTheme: { primary: '#3B82F6', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />

            {/* Worker routes — all nested under WorkerLayout (tab bar + cart sheet) */}
            <Route element={<RequireAuth role="worker"><WorkerLayout /></RequireAuth>}>
              <Route path="/home"    element={<Home />} />
              <Route path="/shop"    element={<Shop />} />
              <Route path="/orders"  element={<Orders />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
              <Route index element={<Navigate to="products" replace />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}
