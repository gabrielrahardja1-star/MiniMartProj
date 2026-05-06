// MiniMart — Light Blue Minimalist Redesign
// A worker-side mobile pickup app for the mining-site mini mart.
//
// UX improvements baked in (vs the current build):
//   1. Home dashboard — instead of dropping into the shop, show today's pickup
//      slot, monthly budget meter, and a "Ready for pickup" hand-off card.
//      Workers care MOST about "what do I owe / when can I grab my stuff",
//      not browsing a catalog.
//   2. Categories + recents instead of a flat search-only product grid.
//      Mining-site catalogs are small but repetitive — showing "Order again"
//      surfaces 80% of orders in one tap.
//   3. Quick-add stepper on each product card. No more bouncing between
//      product list and cart for quantity changes.
//   4. Cart is a bottom sheet, not a separate page. Keeps shopping context.
//   5. Pickup pass — once an order is placed, the worker gets a QR/code
//      pickup pass with a status timeline (Placed → Packing → Ready → Picked up).
//      The store worker scans this; no more "is order #34 yours?" confusion.
//   6. Budget guardrails — live "X left in your monthly allowance" so the
//      worker knows BEFORE checkout if they're going over.
//   7. Big touch targets, glove-friendly. Mining sites = gloves.

const { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  // Light-blue minimalist palette
  bg:        '#F4F8FC',     // page background — very pale blue
  surface:   '#FFFFFF',
  surfaceAlt:'#EAF2FA',     // pale blue chip / subtle bg
  ink:       '#0C2340',     // primary text — deep navy
  ink2:      '#445A77',     // secondary text — slate blue
  ink3:      '#8AA0BC',     // tertiary / muted
  line:      '#E1EAF3',     // hairline
  brand:     '#3B82F6',     // primary action — clean blue
  brandDeep: '#1E5BC6',
  brandSoft: '#DCE8F8',
  accent:    '#0EA5C7',     // teal/cyan accent
  good:      '#10B981',
  warn:      '#F59E0B',
  bad:       '#EF4444',
  goodSoft:  '#D6F3E6',
  warnSoft:  '#FDEFD1',
  badSoft:   '#FCE0E0',
};

const FONT = `-apple-system, "SF Pro Display", "SF Pro Text", system-ui, sans-serif`;

// Currency formatter — AUD per existing app
const fmt = (n) => new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', minimumFractionDigits: 2,
}).format(n);

// ─────────────────────────────────────────────────────────────────────────────
// Mock catalog & state
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',     label: 'All',        icon: 'grid' },
  { id: 'drinks',  label: 'Drinks',     icon: 'cup' },
  { id: 'snacks',  label: 'Snacks',     icon: 'snack' },
  { id: 'meals',   label: 'Meals',      icon: 'meal' },
  { id: 'care',    label: 'Personal',   icon: 'care' },
  { id: 'gear',    label: 'Site gear',  icon: 'helmet' },
];

const PRODUCTS = [
  { id: 1,  name: 'Powerade Mountain Blast', unit: '600 mL',  price: 4.50, stock: 24, cat: 'drinks', tag: 'Popular' },
  { id: 2,  name: 'Bottled Water (still)',   unit: '750 mL',  price: 2.20, stock: 80, cat: 'drinks' },
  { id: 3,  name: 'Coca-Cola No Sugar',      unit: '375 mL',  price: 3.20, stock: 42, cat: 'drinks' },
  { id: 4,  name: 'Iced Coffee',             unit: '500 mL',  price: 5.10, stock: 4,  cat: 'drinks' },
  { id: 5,  name: 'Mars Bar',                unit: '53 g',    price: 2.80, stock: 36, cat: 'snacks' },
  { id: 6,  name: 'Smiths Chips Original',   unit: '45 g',    price: 2.50, stock: 22, cat: 'snacks' },
  { id: 7,  name: 'Roasted Almonds',         unit: '100 g',   price: 6.40, stock: 12, cat: 'snacks' },
  { id: 8,  name: 'Muesli Bar — Apricot',    unit: '32 g',    price: 1.80, stock: 60, cat: 'snacks', tag: 'Popular' },
  { id: 9,  name: 'Crib Pack — Chicken',     unit: 'Wrap',    price: 9.50, stock: 6,  cat: 'meals',  tag: 'Today' },
  { id: 10, name: 'Beef & Rice Bowl',        unit: 'Hot meal',price: 12.00,stock: 9,  cat: 'meals',  tag: 'Today' },
  { id: 11, name: 'Fruit Cup',               unit: '200 g',   price: 4.20, stock: 14, cat: 'meals' },
  { id: 12, name: 'Sunscreen SPF 50+',       unit: '100 mL',  price: 8.90, stock: 18, cat: 'care' },
  { id: 13, name: 'Lip Balm',                unit: 'Stick',   price: 3.40, stock: 30, cat: 'care' },
  { id: 14, name: 'Work Gloves',             unit: 'Pair',    price: 14.50,stock: 3,  cat: 'gear' },
  { id: 15, name: 'Hi-Vis Cap',              unit: 'Each',    price: 22.00,stock: 7,  cat: 'gear' },
  { id: 16, name: 'Safety Glasses',          unit: 'Each',    price: 11.50,stock: 11, cat: 'gear' },
];

const RECENT_IDS = [1, 8, 6, 9]; // "Order again"

// Mock historical orders for the "My orders" tab
const PAST_ORDERS = [
  {
    id: 1043,
    placedAt: '2026-05-06T07:12:00',
    status: 'ready',     // placed | packing | ready | picked_up | cancelled
    pickupBy: '12:30',
    items: [
      { name: 'Crib Pack — Chicken', qty: 1, price: 9.50 },
      { name: 'Powerade Mountain Blast', qty: 2, price: 4.50 },
      { name: 'Muesli Bar — Apricot', qty: 3, price: 1.80 },
    ],
  },
  {
    id: 1031,
    placedAt: '2026-05-05T07:04:00',
    status: 'picked_up',
    items: [
      { name: 'Beef & Rice Bowl', qty: 1, price: 12.00 },
      { name: 'Bottled Water', qty: 2, price: 2.20 },
    ],
  },
  {
    id: 1018,
    placedAt: '2026-05-03T17:50:00',
    status: 'picked_up',
    items: [
      { name: 'Sunscreen SPF 50+', qty: 1, price: 8.90 },
      { name: 'Smiths Chips Original', qty: 1, price: 2.50 },
    ],
  },
];

// Worker context
const WORKER = {
  name: 'Jordan Reyes',
  id: 'W-0421',
  monthlyAllowance: 400,
  monthlySpend: 187.40,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tiny SVG icon set (stroke-based, minimalist)
// ─────────────────────────────────────────────────────────────────────────────
function Ic({ name, size = 22, color = 'currentColor', stroke = 1.7 }) {
  const s = size, c = color, sw = stroke;
  const wrap = (children) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
         stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
  switch (name) {
    case 'home':    return wrap(<><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></>);
    case 'shop':    return wrap(<><path d="M4 8h16l-1.2 11a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8Z"/><path d="M9 8V6a3 3 0 1 1 6 0v2"/></>);
    case 'orders':  return wrap(<><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h5"/></>);
    case 'profile': return wrap(<><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5"/></>);
    case 'cart':    return wrap(<><path d="M3 4h2.2l2.6 11.6a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6.5"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></>);
    case 'search':  return wrap(<><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.6-3.6"/></>);
    case 'plus':    return wrap(<><path d="M12 5v14M5 12h14"/></>);
    case 'minus':   return wrap(<><path d="M5 12h14"/></>);
    case 'check':   return wrap(<path d="m5 12 4.5 4.5L19 7"/>);
    case 'arrow':   return wrap(<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>);
    case 'back':    return wrap(<><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></>);
    case 'close':   return wrap(<><path d="M6 6 18 18M18 6 6 18"/></>);
    case 'clock':   return wrap(<><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>);
    case 'pin':     return wrap(<><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></>);
    case 'spark':   return wrap(<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>);
    case 'bell':    return wrap(<><path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4L6 17Z"/><path d="M10 20a2 2 0 0 0 4 0"/></>);
    case 'qr':      return wrap(<><rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 14.5h2v2M20.5 14.5v2M14.5 18.5v2h2M18.5 16.5h2v2M20.5 20.5h0"/></>);
    case 'flame':   return wrap(<path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-1.5.7-2.5 1.5-3.2C9.8 9.5 12 9 12 6.5 14 8 16 9.5 16 12a4 4 0 0 1-8 0"/>);
    case 'cup':     return wrap(<><path d="M6 8h11l-1 11a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6 8Z"/><path d="M17 11h2a2 2 0 0 1 0 4h-1.5"/></>);
    case 'snack':   return wrap(<><path d="M5 7h14l-1.2 12.5a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z"/><path d="M8 7V5h8v2"/></>);
    case 'meal':    return wrap(<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/></>);
    case 'care':    return wrap(<><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M9 7h6l-1 14H10L9 7Z"/></>);
    case 'helmet':  return wrap(<><path d="M4 16h16v3H4z"/><path d="M5 16a7 7 0 0 1 14 0"/><path d="M9 9V6h6v3"/></>);
    case 'grid':    return wrap(<><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/></>);
    case 'wallet':  return wrap(<><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 13h2.5"/><path d="M3 9h12a2 2 0 0 1 0-4H6a3 3 0 0 0-3 3v1Z"/></>);
    case 'box':     return wrap(<><path d="m3 8 9-4 9 4-9 4-9-4Z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/></>);
    case 'star':    return wrap(<path d="m12 4 2.5 5.2 5.7.8-4.1 4 1 5.6L12 17l-5.1 2.6 1-5.6-4.1-4 5.7-.8L12 4Z"/>);
    case 'leaf':    return wrap(<path d="M5 19c8 0 14-6 14-14-7 0-14 5-14 14 0-2 1.5-5 5-7"/>);
    case 'alert':   return wrap(<><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 11v4M12 18h0"/></>);
    case 'phone':   return wrap(<><path d="M5 5a2 2 0 0 1 2-2h2l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v2a2 2 0 0 1-2 2A14 14 0 0 1 5 5Z"/></>);
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────────────────────
function StatusBar({ time = '7:24' }) {
  // simple iOS-style status bar matching our light theme
  return (
    <div style={{
      height: 50, padding: '14px 28px 0', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      fontFamily: FONT, color: T.ink, fontSize: 16, fontWeight: 600,
      flexShrink: 0,
    }}>
      <span>{time}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="18" height="11" viewBox="0 0 18 11">
          <rect x="0" y="7" width="3" height="4" rx="0.6" fill={T.ink}/>
          <rect x="4.5" y="5" width="3" height="6" rx="0.6" fill={T.ink}/>
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.6" fill={T.ink}/>
          <rect x="13.5" y="0" width="3" height="11" rx="0.6" fill={T.ink}/>
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11">
          <path d="M8 3C9.9 3 11.6 3.7 13 5l1-1A8 8 0 0 0 8 1.5 8 8 0 0 0 2 4l1 1A6 6 0 0 1 8 3Z" fill={T.ink}/>
          <path d="M8 6c1.1 0 2.1.4 2.9 1.2l1-1A5.4 5.4 0 0 0 8 4.5a5.4 5.4 0 0 0-3.9 1.7l1 1A4 4 0 0 1 8 6Z" fill={T.ink}/>
          <circle cx="8" cy="9.5" r="1.2" fill={T.ink}/>
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={T.ink} strokeOpacity="0.4" fill="none"/>
          <rect x="2" y="2" width="17" height="8" rx="1.5" fill={T.ink}/>
          <path d="M24 4v4c.7-.3 1.3-1 1.3-2 0-.9-.6-1.7-1.3-2Z" fill={T.ink} fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

function HomeIndicator() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 34,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8,
      pointerEvents: 'none',
    }}>
      <div style={{ width: 134, height: 5, borderRadius: 3, background: T.ink, opacity: 0.85 }} />
    </div>
  );
}

// Simple soft-press button wrapper
function Press({ children, onClick, style, disabled }) {
  const [down, setDown] = useState(false);
  return (
    <div
      onPointerDown={() => !disabled && setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      onClick={() => !disabled && onClick && onClick()}
      style={{
        cursor: disabled ? 'default' : 'pointer',
        transform: down ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 120ms ease',
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Product placeholder thumbnail — colored pastel block by category
const CAT_COLOR = {
  drinks: ['#DCEEFB', '#3B82F6', 'cup'],
  snacks: ['#FCEAD8', '#EA9854', 'snack'],
  meals:  ['#E1F1E6', '#3FA56A', 'meal'],
  care:   ['#F2E5F8', '#9A6BBE', 'care'],
  gear:   ['#FFE9D2', '#D6822E', 'helmet'],
};
function ProductThumb({ cat, size = 64, radius = 14 }) {
  const [bg, fg, ic] = CAT_COLOR[cat] || ['#EAF2FA', T.ink2, 'box'];
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: bg, display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>
      <Ic name={ic} size={size * 0.5} color={fg} stroke={1.6}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME — dashboard
// ─────────────────────────────────────────────────────────────────────────────
function HomeScreen({ go, cart, addToCart, openCart, activeOrder }) {

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Greeting + bell */}
      <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500, letterSpacing: 0.2 }}>Tuesday · Shift A</div>
          <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>
            Morning, Jordan
          </div>
        </div>
        <Press style={{
          width: 44, height: 44, borderRadius: 14, background: T.surface,
          border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', position: 'relative',
        }}>
          <Ic name="bell" size={20} color={T.ink2}/>
          <div style={{
            position: 'absolute', top: 10, right: 10, width: 8, height: 8,
            borderRadius: 4, background: T.brand, border: `2px solid ${T.surface}`,
          }}/>
        </Press>
      </div>

      {/* Active pickup card */}
      {activeOrder && (
        <div style={{ padding: '0 20px 16px' }}>
          <Press onClick={() => go('pass', { orderId: activeOrder.id })} style={{
            background: `linear-gradient(135deg, ${T.brand} 0%, ${T.brandDeep} 100%)`,
            borderRadius: 22, padding: 18, color: '#fff', position: 'relative', overflow: 'hidden',
            boxShadow: '0 10px 30px -8px rgba(59,130,246,0.45)',
          }}>
            {/* decorative orb */}
            <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }}/>
            <div style={{ position: 'absolute', right: 30, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}/>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, opacity: 0.9, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: '#62E6A8', boxShadow: '0 0 0 4px rgba(98,230,168,0.25)' }}/>
              Ready for pickup
            </div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
              Order #{activeOrder.id}
            </div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>
              {activeOrder.items.length} items
            </div>

            <div style={{
              marginTop: 14, display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)',
              borderRadius: 14, padding: '10px 12px',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: '#fff',
                display: 'grid', placeItems: 'center',
              }}>
                <Ic name="qr" size={26} color={T.brandDeep}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Tap to view pickup pass</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
                  PASS · MM{activeOrder.id}
                </div>
              </div>
              <Ic name="arrow" size={18} color="#fff"/>
            </div>
          </Press>
        </div>
      )}

      {/* Budget meter */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: T.surface, borderRadius: 20, padding: 18,
          border: `1px solid ${T.line}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.ink3, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <Ic name="wallet" size={13} color={T.ink3}/>
                Total spending · May
              </div>
              <div style={{ marginTop: 4, color: T.ink, fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>
                {fmt(WORKER.monthlySpend)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: T.ink3, fontSize: 11, fontWeight: 600 }}>ORDERS</div>
              <div style={{ color: T.ink2, fontSize: 14, fontWeight: 600 }}>{PAST_ORDERS.length}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, color: T.ink3, fontSize: 12 }}>
            Auto-deducted from payroll · resets 1 Jun
          </div>
        </div>
      </div>

      {/* Shop CTA + categories */}
      <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ color: T.ink, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>Order again</div>
        <Press onClick={() => go('shop')} style={{ color: T.brand, fontSize: 14, fontWeight: 600 }}>
          Browse all →
        </Press>
      </div>

      {/* Recents — horizontal scroll */}
      <div style={{
        padding: '0 0 18px',
      }}>
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px',
          scrollbarWidth: 'none',
        }}>
          {RECENT_IDS.map(id => {
            const p = PRODUCTS.find(x => x.id === id);
            const inCart = cart.find(c => c.id === id);
            return (
              <div key={id} style={{
                minWidth: 156, background: T.surface, borderRadius: 18,
                border: `1px solid ${T.line}`, padding: 12, display: 'flex',
                flexDirection: 'column', gap: 8,
              }}>
                <ProductThumb cat={p.cat} size={84} radius={12}/>
                <div style={{ color: T.ink, fontSize: 13, fontWeight: 600, lineHeight: 1.25, minHeight: 32 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: T.ink, fontSize: 14, fontWeight: 700 }}>{fmt(p.price)}</div>
                  <Press onClick={() => addToCart(p)} style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: inCart ? T.brand : T.brandSoft,
                    color: inCart ? '#fff' : T.brand,
                    display: 'grid', placeItems: 'center', fontWeight: 700,
                    fontSize: 12,
                  }}>
                    {inCart ? `×${inCart.qty}` : <Ic name="plus" size={16} color={T.brand}/>}
                  </Press>
                </div>
              </div>
            );
          })}
          <div style={{ minWidth: 1 }}/>
        </div>
      </div>

      {/* Today's hot meals */}
      <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ic name="flame" size={18} color={T.warn}/>
          <div style={{ color: T.ink, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>Today's specials</div>
        </div>
      </div>
      <div style={{ padding: '0 20px 110px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PRODUCTS.filter(p => p.tag === 'Today').map(p => {
          const inCart = cart.find(c => c.id === p.id);
          return (
            <div key={p.id} style={{
              background: T.surface, borderRadius: 18, padding: 12,
              border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <ProductThumb cat={p.cat} size={56} radius={12}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{p.unit} · {p.stock} left</div>
              </div>
              <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>{fmt(p.price)}</div>
              <Press onClick={() => addToCart(p)} style={{
                width: 36, height: 36, borderRadius: 12,
                background: inCart ? T.brand : T.brandSoft,
                display: 'grid', placeItems: 'center',
              }}>
                {inCart
                  ? <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>×{inCart.qty}</span>
                  : <Ic name="plus" size={18} color={T.brand}/>}
              </Press>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOP — full catalog with categories + search
// ─────────────────────────────────────────────────────────────────────────────
function ShopScreen({ cart, addToCart, removeFromCart }) {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  const filtered = PRODUCTS.filter(p =>
    (cat === 'all' || p.cat === cat) &&
    (q === '' || p.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 20px 12px' }}>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Shop</div>
        <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>{PRODUCTS.length} items in stock</div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16,
        }}>
          <Ic name="search" size={18} color={T.ink3}/>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search products"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: T.ink, fontFamily: FONT,
            }}
          />
          {q && (
            <Press onClick={() => setQ('')} style={{ display: 'grid', placeItems: 'center' }}>
              <Ic name="close" size={16} color={T.ink3}/>
            </Press>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div style={{ padding: '0 0 14px' }}>
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px',
          scrollbarWidth: 'none',
        }}>
          {CATEGORIES.map(c => {
            const active = cat === c.id;
            return (
              <Press key={c.id} onClick={() => setCat(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 999,
                background: active ? T.ink : T.surface,
                border: `1px solid ${active ? T.ink : T.line}`,
                color: active ? '#fff' : T.ink2,
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                <Ic name={c.icon} size={15} color={active ? '#fff' : T.ink2}/>
                {c.label}
              </Press>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        padding: '0 16px 110px', display: 'grid',
        gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        {filtered.map(p => {
          const inCart = cart.find(c => c.id === p.id);
          const lowStock = p.stock <= 5;
          return (
            <div key={p.id} style={{
              background: T.surface, borderRadius: 18, overflow: 'hidden',
              border: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ position: 'relative', padding: 12, paddingBottom: 6 }}>
                <ProductThumb cat={p.cat} size={'100%'} radius={12}/>
                <div style={{
                  width: '100%', height: 96, marginTop: -96,
                  position: 'relative', pointerEvents: 'none',
                }}/>
                {p.tag && (
                  <div style={{
                    position: 'absolute', top: 18, left: 18,
                    background: '#fff', color: T.brand, fontSize: 10, fontWeight: 700,
                    padding: '4px 8px', borderRadius: 999, letterSpacing: 0.4,
                  }}>{p.tag.toUpperCase()}</div>
                )}
                {lowStock && (
                  <div style={{
                    position: 'absolute', top: 18, right: 18,
                    background: T.warnSoft, color: T.warn, fontSize: 10, fontWeight: 700,
                    padding: '4px 8px', borderRadius: 999, letterSpacing: 0.3,
                  }}>{p.stock} LEFT</div>
                )}
              </div>
              <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ color: T.ink, fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{p.name}</div>
                <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{p.unit}</div>
                <div style={{
                  marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ color: T.ink, fontSize: 16, fontWeight: 700 }}>{fmt(p.price)}</div>
                  {inCart ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 0,
                      background: T.brand, borderRadius: 12, padding: 2,
                    }}>
                      <Press onClick={() => removeFromCart(p)} style={{
                        width: 28, height: 28, display: 'grid', placeItems: 'center',
                      }}>
                        <Ic name="minus" size={16} color="#fff"/>
                      </Press>
                      <div style={{ minWidth: 18, textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                        {inCart.qty}
                      </div>
                      <Press onClick={() => addToCart(p)} style={{
                        width: 28, height: 28, display: 'grid', placeItems: 'center',
                      }}>
                        <Ic name="plus" size={16} color="#fff"/>
                      </Press>
                    </div>
                  ) : (
                    <Press onClick={() => addToCart(p)} style={{
                      padding: '7px 12px', borderRadius: 12,
                      background: T.brandSoft, color: T.brand,
                      fontSize: 13, fontWeight: 700,
                    }}>
                      Add
                    </Press>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: T.ink3 }}>
            No products match "{q}"
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CART — bottom sheet (full screen on mobile)
// ─────────────────────────────────────────────────────────────────────────────
function CartSheet({ open, onClose, cart, addToCart, removeFromCart, onPlace }) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(12,35,64,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease', zIndex: 30,
      }} onClick={onClose}/>

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 40, maxHeight: '88%',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)',
      }}>
        {/* grabber */}
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }}/>
        </div>

        <div style={{
          padding: '8px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Your cart</div>
            <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>
              {cart.reduce((s,i)=>s+i.qty,0)} items · pickup window 12:00–13:00
            </div>
          </div>
          <Press onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center',
          }}>
            <Ic name="close" size={18} color={T.ink2}/>
          </Press>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: T.ink3 }}>
              <Ic name="cart" size={36} color={T.ink3}/>
              <div style={{ marginTop: 8, fontSize: 14 }}>Your cart is empty</div>
            </div>
          ) : cart.map(item => (
            <div key={item.id} style={{
              background: T.surface, borderRadius: 16, padding: 12,
              border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <ProductThumb cat={item.cat} size={48} radius={10}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.ink, fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</div>
                <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{fmt(item.price)} · {item.unit}</div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: T.surfaceAlt, borderRadius: 12, padding: 2,
              }}>
                <Press onClick={() => removeFromCart(item)} style={{
                  width: 28, height: 28, display: 'grid', placeItems: 'center',
                }}>
                  <Ic name="minus" size={14} color={T.ink2}/>
                </Press>
                <div style={{ minWidth: 22, textAlign: 'center', fontWeight: 700, fontSize: 13, color: T.ink }}>
                  {item.qty}
                </div>
                <Press onClick={() => addToCart(item)} style={{
                  width: 28, height: 28, display: 'grid', placeItems: 'center',
                }}>
                  <Ic name="plus" size={14} color={T.ink2}/>
                </Press>
              </div>
            </div>
          ))}

          {cart.length > 0 && (
            <>
              {/* Pickup window selector */}
              <div style={{
                background: T.surface, borderRadius: 16, padding: 14,
                border: `1px solid ${T.line}`, marginTop: 4,
              }}>
                <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
                  Pickup window
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['12:00–12:30', '12:30–13:00', '17:30–18:00'].map((slot, i) => (
                    <Press key={slot} style={{
                      flex: 1, padding: '10px 6px', borderRadius: 12,
                      border: `1.5px solid ${i === 0 ? T.brand : T.line}`,
                      background: i === 0 ? T.brandSoft : T.surface,
                      color: i === 0 ? T.brand : T.ink2,
                      fontSize: 12, fontWeight: 700, textAlign: 'center',
                    }}>
                      {slot}
                    </Press>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{
            background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '16px 20px 26px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: T.ink3, fontSize: 13 }}>Subtotal</span>
              <span style={{ color: T.ink, fontSize: 13, fontWeight: 600 }}>{fmt(subtotal)}</span>
            </div>
            <Press onClick={onPlace} style={{
              width: '100%', padding: '16px', borderRadius: 16,
              background: T.ink, color: '#fff', fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{
                background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 8,
                fontSize: 13,
              }}>
                {cart.reduce((s,i)=>s+i.qty,0)}
              </span>
              <span>Place pickup order</span>
              <span>{fmt(subtotal)}</span>
            </Press>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER PLACED — confirmation
// ─────────────────────────────────────────────────────────────────────────────
function PlacedScreen({ go, order }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14,
        textAlign: 'center',
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: 999,
          background: T.goodSoft, display: 'grid', placeItems: 'center',
          animation: 'mmpop 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 999, background: T.good,
            display: 'grid', placeItems: 'center',
          }}>
            <Ic name="check" size={36} color="#fff" stroke={2.4}/>
          </div>
        </div>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.4 }}>
          Order placed
        </div>
        <div style={{ color: T.ink2, fontSize: 15, lineHeight: 1.45, maxWidth: 280 }}>
          We'll notify you when order <b>#{order.id}</b> is ready. Show your pickup pass at the counter.
        </div>

        <div style={{
          marginTop: 14, padding: '14px 18px', borderRadius: 18,
          background: T.surface, border: `1px solid ${T.line}`, width: '100%',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.brandSoft, display: 'grid', placeItems: 'center' }}>
            <Ic name="clock" size={22} color={T.brand}/>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Pickup window</div>
            <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>Today · 12:00–12:30</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 100px', display: 'flex', gap: 10 }}>
        <Press onClick={() => go('home')} style={{
          flex: 1, padding: 16, borderRadius: 16,
          background: T.surface, border: `1px solid ${T.line}`,
          color: T.ink2, fontSize: 15, fontWeight: 700, textAlign: 'center',
        }}>
          Done
        </Press>
        <Press onClick={() => go('pass', { orderId: order.id })} style={{
          flex: 2, padding: 16, borderRadius: 16, background: T.brand,
          color: '#fff', fontSize: 15, fontWeight: 700, textAlign: 'center',
        }}>
          View pickup pass
        </Press>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PICKUP PASS — QR + status timeline
// ─────────────────────────────────────────────────────────────────────────────
function PassScreen({ go, order }) {
  const STEPS = [
    { id: 'placed',    label: 'Order placed' },
    { id: 'packing',   label: 'Being packed' },
    { id: 'ready',     label: 'Ready for pickup' },
    { id: 'picked_up', label: 'Picked up' },
  ];
  const currentIdx = STEPS.findIndex(s => s.id === order.status);
  const stepIdx = currentIdx === -1 ? 0 : currentIdx;

  const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Press onClick={() => go('home')} style={{
          width: 40, height: 40, borderRadius: 12, background: T.surface,
          border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center',
        }}>
          <Ic name="back" size={18} color={T.ink2}/>
        </Press>
        <div style={{ color: T.ink, fontSize: 18, fontWeight: 700 }}>Pickup pass</div>
      </div>

      {/* Pass card */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: T.surface, borderRadius: 24, overflow: 'hidden',
          border: `1px solid ${T.line}`,
          boxShadow: '0 4px 20px rgba(12,35,64,0.06)',
        }}>
          {/* Top section */}
          <div style={{
            padding: '20px 20px 16px', background: `linear-gradient(135deg, ${T.brand} 0%, ${T.brandDeep} 100%)`,
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.85, textTransform: 'uppercase' }}>MiniMart pickup</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, letterSpacing: -0.4 }}>
                Order #{order.id}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                {WORKER.name} · {WORKER.id}
              </div>
            </div>
          </div>

          {/* Notch / cut */}
          <div style={{ position: 'relative', height: 0 }}>
            <div style={{ position: 'absolute', left: -10, top: -10, width: 20, height: 20, borderRadius: 999, background: T.bg }}/>
            <div style={{ position: 'absolute', right: -10, top: -10, width: 20, height: 20, borderRadius: 999, background: T.bg }}/>
            <div style={{
              position: 'absolute', left: 14, right: 14, top: 0,
              borderTop: `1.5px dashed ${T.line}`,
            }}/>
          </div>

          {/* Ready message */}
          <div style={{ padding: '28px 20px 26px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 999, background: T.goodSoft,
              display: 'grid', placeItems: 'center', marginBottom: 14,
            }}>
              <Ic name="check" size={32} color={T.good} stroke={2.4}/>
            </div>
            <div style={{ color: T.ink, fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>
              Order is ready for pickup
            </div>
            <div style={{ marginTop: 6, color: T.ink2, fontSize: 13, lineHeight: 1.5, maxWidth: 260 }}>
              Show this screen at the MiniMart counter.
            </div>
            <div style={{ marginTop: 14, color: T.ink2, fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
              MM-{order.id}-{WORKER.id.replace('-', '')}
            </div>
          </div>
        </div>
      </div>

      {/* Status timeline */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: T.surface, borderRadius: 18, padding: 18,
          border: `1px solid ${T.line}`,
        }}>
          <div style={{ color: T.ink, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Order status</div>
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={s.id} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative',
                paddingBottom: i < STEPS.length - 1 ? 16 : 0,
              }}>
                {/* connecting line */}
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute', left: 11, top: 26, bottom: 0, width: 2,
                    background: done ? T.brand : T.line,
                  }}/>
                )}
                <div style={{
                  width: 24, height: 24, borderRadius: 999,
                  background: done || active ? T.brand : T.surface,
                  border: `2px solid ${done || active ? T.brand : T.line}`,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  boxShadow: active ? `0 0 0 4px ${T.brandSoft}` : 'none',
                }}>
                  {done && <Ic name="check" size={12} color="#fff" stroke={3}/>}
                  {active && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: 999 }}/>}
                </div>
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <div style={{
                    color: done || active ? T.ink : T.ink3,
                    fontSize: 14, fontWeight: active ? 700 : 600,
                  }}>{s.label}</div>
                  {active && (
                    <div style={{ color: T.brand, fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                      Right now · est. ready in 8 min
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: '0 20px 110px' }}>
        <div style={{ color: T.ink, fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
          {order.items.length} items · {fmt(total)}
        </div>
        <div style={{
          background: T.surface, borderRadius: 18, border: `1px solid ${T.line}`,
          overflow: 'hidden',
        }}>
          {order.items.map((it, i) => (
            <div key={i} style={{
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              borderTop: i === 0 ? 'none' : `1px solid ${T.line}`,
            }}>
              <div style={{
                minWidth: 30, padding: '3px 7px', borderRadius: 8, background: T.surfaceAlt,
                color: T.ink2, fontSize: 12, fontWeight: 700, textAlign: 'center',
              }}>×{it.qty}</div>
              <div style={{ flex: 1, color: T.ink, fontSize: 14, fontWeight: 600 }}>{it.name}</div>
              <div style={{ color: T.ink2, fontSize: 13 }}>{fmt(it.price * it.qty)}</div>
            </div>
          ))}
        </div>

        <Press style={{
          marginTop: 14, padding: '14px', borderRadius: 14,
          background: T.surface, border: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: T.bad, fontSize: 14, fontWeight: 600,
        }}>
          Cancel order
        </Press>
      </div>
    </div>
  );
}

// Fake QR code (deterministic-ish noise pattern)
function FakeQR() {
  // 21x21 like a v1 QR
  const N = 21;
  const cells = [];
  // corner finders
  const isFinder = (r, c) =>
    (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7);
  // small "stable" pseudo-random: hash of r,c
  const hash = (r, c) => ((r * 73856093) ^ (c * 19349663) ^ 0xC0FFEE) >>> 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let on;
      if (isFinder(r, c)) {
        // outer ring + center 3x3 of finder
        const lr = r < 7 ? r : (r - (N - 7));
        const lc = c < 7 ? c : (c - (N - 7));
        on = lr === 0 || lr === 6 || lc === 0 || lc === 6 ||
             (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
      } else {
        on = (hash(r, c) % 100) > 52;
      }
      cells.push({ r, c, on });
    }
  }
  return (
    <div style={{
      padding: 14, background: '#fff', borderRadius: 16,
      border: `1px solid ${T.line}`,
    }}>
      <svg width={196} height={196} viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges">
        {cells.map(({ r, c, on }) => on && (
          <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={T.ink}/>
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS — list of past + active
// ─────────────────────────────────────────────────────────────────────────────
function OrdersScreen({ go }) {
  const STATUS_META = {
    placed:    { label: 'Placed',    color: T.ink2,  bg: T.surfaceAlt },
    packing:   { label: 'Packing',   color: T.warn,  bg: T.warnSoft },
    ready:     { label: 'Ready',     color: T.brand, bg: T.brandSoft },
    picked_up: { label: 'Picked up', color: T.good,  bg: T.goodSoft },
    cancelled: { label: 'Cancelled', color: T.bad,   bg: T.badSoft },
  };
  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 20px 16px' }}>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>My orders</div>
        <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>{PAST_ORDERS.length} orders this month</div>
      </div>

      <div style={{ padding: '0 20px 110px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PAST_ORDERS.map(o => {
          const meta = STATUS_META[o.status];
          const total = o.items.reduce((s, i) => s + i.price * i.qty, 0);
          const dt = new Date(o.placedAt);
          const date = dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
          const time = dt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
          return (
            <Press key={o.id} onClick={() => go('pass', { orderId: o.id })} style={{
              background: T.surface, borderRadius: 18, padding: 16,
              border: `1px solid ${T.line}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>Order #{o.id}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{date} · {time}</div>
                </div>
                <div style={{
                  padding: '5px 10px', borderRadius: 999,
                  background: meta.bg, color: meta.color,
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
                }}>
                  {meta.label}
                </div>
              </div>

              <div style={{
                marginTop: 10, padding: '10px 0', borderTop: `1px solid ${T.line}`,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                {o.items.slice(0, 2).map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: T.ink2 }}>×{it.qty} · {it.name}</span>
                    <span style={{ color: T.ink3 }}>{fmt(it.price * it.qty)}</span>
                  </div>
                ))}
                {o.items.length > 2 && (
                  <div style={{ color: T.ink3, fontSize: 12 }}>+ {o.items.length - 2} more</div>
                )}
              </div>

              <div style={{
                marginTop: 4, paddingTop: 10, borderTop: `1px solid ${T.line}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: T.ink3, fontSize: 12 }}>Total</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: T.ink, fontSize: 16, fontWeight: 700 }}>{fmt(total)}</span>
                  <Ic name="arrow" size={16} color={T.ink3}/>
                </div>
              </div>
            </Press>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE — minimal
// ─────────────────────────────────────────────────────────────────────────────
function ProfileScreen() {
  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 20px 16px' }}>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Profile</div>
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: T.surface, borderRadius: 20, padding: 18,
          border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `linear-gradient(135deg, ${T.brand}, ${T.brandDeep})`,
            color: '#fff', display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 20,
          }}>JR</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.ink, fontSize: 17, fontWeight: 700 }}>{WORKER.name}</div>
            <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>{WORKER.id} · Site B Operations</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: T.surface, borderRadius: 20, padding: 18,
          border: `1px solid ${T.line}`,
        }}>
          <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Total spending · May</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <div style={{ color: T.ink, fontSize: 26, fontWeight: 700 }}>{fmt(WORKER.monthlySpend)}</div>
            <div style={{ color: T.ink3, fontSize: 13 }}>across {PAST_ORDERS.length} orders</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 110px', display: 'flex', flexDirection: 'column', gap: 1, background: T.surface, margin: '0 20px', borderRadius: 18, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
        {[
          { ic: 'bell',    label: 'Notifications', sub: 'Pickup reminders' },
          { ic: 'phone',   label: 'Contact store', sub: 'Site B · ext. 4101' },
          { ic: 'orders',  label: 'Order history', sub: 'View receipts & invoices' },
          { ic: 'star',    label: 'Send feedback', sub: '' },
        ].map((item, i) => (
          <Press key={i} style={{
            padding: '14px 16px', background: T.surface,
            display: 'flex', alignItems: 'center', gap: 14,
            borderBottom: i < 3 ? `1px solid ${T.line}` : 'none',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: T.surfaceAlt,
              display: 'grid', placeItems: 'center',
            }}>
              <Ic name={item.ic} size={18} color={T.ink2}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{item.label}</div>
              {item.sub && <div style={{ color: T.ink3, fontSize: 12, marginTop: 1 }}>{item.sub}</div>}
            </div>
            <Ic name="arrow" size={16} color={T.ink3}/>
          </Press>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom tab bar
// ─────────────────────────────────────────────────────────────────────────────
function TabBar({ active, go, cartCount, onCartClick }) {
  const tabs = [
    { id: 'home',    icon: 'home',    label: 'Home' },
    { id: 'shop',    icon: 'shop',    label: 'Shop' },
    { id: 'cart',    icon: 'cart',    label: 'Cart',   isCart: true },
    { id: 'orders',  icon: 'orders',  label: 'Orders' },
    { id: 'profile', icon: 'profile', label: 'Me' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 24, paddingTop: 8,
      background: 'rgba(244,248,252,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${T.line}`,
      zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 6px' }}>
        {tabs.map(t => {
          const isActive = active === t.id;
          const handle = t.isCart ? onCartClick : () => go(t.id);
          return (
            <Press key={t.id} onClick={handle} style={{
              flex: 1, padding: '6px 0', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, position: 'relative',
            }}>
              <div style={{ position: 'relative' }}>
                <Ic name={t.icon} size={24} color={isActive ? T.brand : T.ink3} stroke={isActive ? 2 : 1.7}/>
                {t.isCart && cartCount > 0 && (
                  <div style={{
                    position: 'absolute', top: -4, right: -8,
                    minWidth: 16, height: 16, padding: '0 4px',
                    background: T.bad, color: '#fff',
                    borderRadius: 999, fontSize: 10, fontWeight: 700,
                    display: 'grid', placeItems: 'center',
                    border: `2px solid ${T.bg}`,
                  }}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: isActive ? T.brand : T.ink3,
              }}>{t.label}</span>
            </Press>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone shell — wraps a screen with status bar + tab bar
// ─────────────────────────────────────────────────────────────────────────────
function Phone({ width = 390, height = 844, label, children, screenLabel }) {
  return (
    <div data-screen-label={screenLabel} style={{
      width, height, background: T.bg, borderRadius: 48,
      boxShadow: '0 30px 60px -20px rgba(12,35,64,0.25), 0 0 0 10px #1a1a1a, 0 0 0 11px #2a2a2a',
      overflow: 'hidden', position: 'relative',
      display: 'flex', flexDirection: 'column', fontFamily: FONT,
    }}>
      <StatusBar/>
      {children}
      <HomeIndicator/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App — state machine across screens
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab]       = useState('home');           // home | shop | orders | profile
  const [route, setRoute]   = useState({ name: 'tab' });  // 'tab' | 'placed' | 'pass'
  const [cart, setCart]     = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(PAST_ORDERS[0]); // first one is "ready"
  const [lastPlaced, setLastPlaced] = useState(null);

  function addToCart(p) {
    setCart(prev => {
      const found = prev.find(i => i.id === p.id);
      if (found) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...p, qty: 1 }];
    });
  }
  function removeFromCart(p) {
    setCart(prev => {
      const found = prev.find(i => i.id === p.id);
      if (!found) return prev;
      if (found.qty <= 1) return prev.filter(i => i.id !== p.id);
      return prev.map(i => i.id === p.id ? { ...i, qty: i.qty - 1 } : i);
    });
  }
  function placeOrder() {
    const id = 1044;
    const placed = {
      id,
      placedAt: new Date().toISOString(),
      status: 'packing',
      pickupBy: '12:30',
      items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
    };
    setLastPlaced(placed);
    setActiveOrder(placed);
    setCart([]);
    setCartOpen(false);
    setRoute({ name: 'placed' });
  }

  function go(name, opts = {}) {
    if (['home', 'shop', 'orders', 'profile'].includes(name)) {
      setTab(name);
      setRoute({ name: 'tab' });
      return;
    }
    if (name === 'pass') {
      const orderId = opts.orderId;
      const order = [lastPlaced, ...PAST_ORDERS].filter(Boolean).find(o => o.id === orderId) || activeOrder;
      setRoute({ name: 'pass', order });
    }
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // What's in the body?
  let body;
  if (route.name === 'placed') {
    body = <PlacedScreen go={go} order={lastPlaced}/>;
  } else if (route.name === 'pass') {
    body = <PassScreen go={go} order={route.order}/>;
  } else {
    if (tab === 'home')    body = <HomeScreen    go={go} cart={cart} addToCart={addToCart} openCart={() => setCartOpen(true)} activeOrder={activeOrder}/>;
    if (tab === 'shop')    body = <ShopScreen    cart={cart} addToCart={addToCart} removeFromCart={removeFromCart}/>;
    if (tab === 'orders')  body = <OrdersScreen  go={go}/>;
    if (tab === 'profile') body = <ProfileScreen/>;
  }

  // Tab bar shown only on tab routes
  const showTabBar = route.name === 'tab';

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {body}
      {showTabBar && (
        <TabBar
          active={tab} go={go}
          cartCount={cartCount}
          onCartClick={() => setCartOpen(true)}
        />
      )}
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        onPlace={placeOrder}
      />
    </div>
  );
}

// Expose to window for the host page to render
Object.assign(window, { App, Phone, T, StatusBar, HomeIndicator });
