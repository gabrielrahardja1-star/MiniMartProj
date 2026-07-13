import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Plus, Minus, ShoppingCart } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatCurrency, formatSlotLabel } from '../../utils/format'
import EmptyState from '../../components/EmptyState'
import api from '../../api'
import toast from 'react-hot-toast'

export default function Cart() {
  const { items, remove, updateQty, clear, total } = useCart()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [pickupDate, setPickupDate] = useState('')
  const [pickupSlot, setPickupSlot] = useState(null)
  const [slotOptions, setSlotOptions] = useState([])
  const [fetchingSlots, setFetchingSlots] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setPickupDate(today)
  }, [])

  useEffect(() => {
    if (!pickupDate) return
    const fetchSlots = async () => {
      setFetchingSlots(true)
      try {
        const response = await api.get('/orders/pickup-slots', { params: { date: pickupDate } })
        setSlotOptions(response.data)
      } catch (err) {
        toast.error('Failed to load pickup slots')
      } finally {
        setFetchingSlots(false)
      }
    }
    fetchSlots()
  }, [pickupDate])

  async function placeOrder() {
    if (items.length === 0 || !pickupSlot) return
    setLoading(true)
    try {
      await api.post('/orders/', {
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        pickup_date: pickupDate,
        pickup_slot: pickupSlot,
      })
      clear()
      toast.success('Order placed!')
      navigate('/orders')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Order failed')
      // Re-fetch slots in case cutoff has passed
      if (pickupDate) {
        try {
          const response = await api.get('/orders/pickup-slots', { params: { date: pickupDate } })
          setSlotOptions(response.data)
        } catch (e) {
          // Silently fail, slots already shown as unavailable
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen bg-slate-50" style={{ touchAction: 'pan-y' }}>
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10 border-b border-slate-100">
        <button
          onClick={() => navigate('/shop')}
          aria-label="Back to shop"
          style={{ touchAction: 'manipulation' }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 active:scale-95 transition-all duration-150"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900">My Cart</h1>
        {items.length > 0 && (
          <span className="ml-auto text-sm text-slate-400">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        )}
      </header>

      {/* Content */}
      <div className="p-4 space-y-3 pb-40">
        {items.length === 0 ? (
          <div className="pt-12">
            <EmptyState
              icon={ShoppingCart}
              title="Your cart is empty"
              description="Add products from the shop to get started"
              action={{ label: 'Browse Products', onClick: () => navigate('/shop') }}
            />
          </div>
        ) : (
          <>
            {/* Pickup slot selector */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3 border-l-4 border-blue-400">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pickup Date</label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pickup Time</label>
                <div className="space-y-2">
                  {fetchingSlots ? (
                    <p className="text-xs text-slate-400">Loading slots…</p>
                  ) : slotOptions.map(slot => (
                    <button
                      key={slot.slot}
                      onClick={() => setPickupSlot(slot.available ? slot.slot : null)}
                      disabled={!slot.available}
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                        pickupSlot === slot.slot
                          ? 'bg-blue-500 text-white border-2 border-blue-600'
                          : slot.available
                            ? 'bg-slate-100 text-slate-800 border-2 border-slate-200 hover:bg-slate-200'
                            : 'bg-slate-50 text-slate-400 border-2 border-slate-100 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{slot.label}</span>
                        {!slot.available && <span className="text-xs">Cutoff passed</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cart items */}
          </>
        )}
        {items.length > 0 && items.map(item => (
          <div
            key={item.product_id}
            className="bg-white rounded-2xl shadow-sm overflow-hidden flex items-center border-l-4 border-amber-400"
          >
            <div className="flex-1 p-4">
              <p className="font-semibold text-slate-800 leading-snug">{item.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(item.price)} each</p>
              <p className="text-amber-600 font-bold text-base mt-1">{formatCurrency(item.price * item.quantity)}</p>
            </div>
            <div className="flex items-center gap-1 pr-3">
              <button
                onClick={() => updateQty(item.product_id, item.quantity - 1)}
                aria-label="Decrease quantity"
                style={{ touchAction: 'manipulation' }}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 active:scale-95 rounded-xl transition-all duration-150"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-bold text-slate-800">{item.quantity}</span>
              <button
                onClick={() => updateQty(item.product_id, item.quantity + 1)}
                aria-label="Increase quantity"
                style={{ touchAction: 'manipulation' }}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 active:scale-95 rounded-xl transition-all duration-150"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => remove(item.product_id)}
                aria-label={`Remove ${item.name}`}
                style={{ touchAction: 'manipulation' }}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 active:scale-95 rounded-xl ml-1 transition-all duration-150"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
          </>
        )}
      </div>

      {/* Bottom bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Total</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(total)}</p>
            </div>
          </div>
          <button
            onClick={placeOrder}
            disabled={loading || !pickupSlot}
            style={{ touchAction: 'manipulation' }}
            className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg shadow-amber-200 transition-all duration-150 text-base"
          >
            {loading ? 'Placing Order…' : 'Place Order'}
          </button>
        </div>
      )}
    </div>
  )
}
