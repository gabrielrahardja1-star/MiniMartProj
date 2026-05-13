// MiniMart — Admin (storekeeper) mobile redesign
// Mobile-first, same light-blue minimalist palette as the worker app.
// Tabs: Dashboard · Orders · Inventory · Profile

const { useState: useStateA } = React;

const fmtA = (n) => new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', minimumFractionDigits: 2,
}).format(n);

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_ORDERS_SEED = [
  { id: 1051, status: 'pending',   placedAt: '07:42', worker: { name: 'Aisha Khan',   id: 'W-0388', initials: 'AK' },
    items: [
      { name: 'Crib Pack — Chicken',     qty: 1, price: 9.50,  cat: 'meals' },
      { name: 'Powerade Mountain Blast', qty: 2, price: 4.50,  cat: 'drinks' },
      { name: 'Muesli Bar — Apricot',    qty: 2, price: 1.80,  cat: 'snacks' },
    ] },
  { id: 1050, status: 'pending',   placedAt: '07:38', worker: { name: 'Marcus Chen',  id: 'W-0412', initials: 'MC' },
    items: [
      { name: 'Beef & Rice Bowl',        qty: 1, price: 12.00, cat: 'meals' },
      { name: 'Bottled Water',           qty: 2, price: 2.20,  cat: 'drinks' },
    ] },
  { id: 1049, status: 'pending',   placedAt: '07:30', worker: { name: 'Priya Nair',   id: 'W-0401', initials: 'PN' },
    items: [
      { name: 'Iced Coffee',             qty: 1, price: 5.10,  cat: 'drinks' },
      { name: 'Mars Bar',                qty: 2, price: 2.80,  cat: 'snacks' },
      { name: 'Sunscreen SPF 50+',       qty: 1, price: 8.90,  cat: 'care' },
    ] },
  { id: 1048, status: 'ready',     placedAt: '07:24', worker: { name: 'Jordan Reyes', id: 'W-0421', initials: 'JR' },
    items: [
      { name: 'Crib Pack — Chicken',     qty: 1, price: 9.50,  cat: 'meals' },
      { name: 'Smiths Chips Original',   qty: 1, price: 2.50,  cat: 'snacks' },
    ] },
  { id: 1047, status: 'ready',     placedAt: '07:18', worker: { name: 'Sam Wright',   id: 'W-0395', initials: 'SW' },
    items: [
      { name: 'Roasted Almonds',         qty: 1, price: 6.40,  cat: 'snacks' },
      { name: 'Bottled Water',           qty: 1, price: 2.20,  cat: 'drinks' },
    ] },
  { id: 1046, status: 'picked_up', placedAt: '06:58', worker: { name: 'Eli Tan',      id: 'W-0376', initials: 'ET' },
    items: [
      { name: 'Coca-Cola No Sugar',      qty: 2, price: 3.20,  cat: 'drinks' },
    ] },
  { id: 1045, status: 'picked_up', placedAt: '06:42', worker: { name: 'Nina Park',    id: 'W-0359', initials: 'NP' },
    items: [
      { name: 'Beef & Rice Bowl',        qty: 1, price: 12.00, cat: 'meals' },
      { name: 'Fruit Cup',               qty: 1, price: 4.20,  cat: 'meals' },
    ] },
];

const ADMIN_INVENTORY_SEED = [
  { id: 1,  name: 'Powerade Mountain Blast', unit: '600 mL',   price: 4.50,  stock: 24, cat: 'drinks', active: true },
  { id: 2,  name: 'Bottled Water (still)',   unit: '750 mL',   price: 2.20,  stock: 80, cat: 'drinks', active: true },
  { id: 3,  name: 'Coca-Cola No Sugar',      unit: '375 mL',   price: 3.20,  stock: 42, cat: 'drinks', active: true },
  { id: 4,  name: 'Iced Coffee',             unit: '500 mL',   price: 5.10,  stock: 4,  cat: 'drinks', active: true },
  { id: 5,  name: 'Mars Bar',                unit: '53 g',     price: 2.80,  stock: 36, cat: 'snacks', active: true },
  { id: 6,  name: 'Smiths Chips Original',   unit: '45 g',     price: 2.50,  stock: 22, cat: 'snacks', active: true },
  { id: 7,  name: 'Roasted Almonds',         unit: '100 g',    price: 6.40,  stock: 0,  cat: 'snacks', active: true },
  { id: 8,  name: 'Muesli Bar — Apricot',    unit: '32 g',     price: 1.80,  stock: 60, cat: 'snacks', active: true },
  { id: 9,  name: 'Crib Pack — Chicken',     unit: 'Wrap',     price: 9.50,  stock: 6,  cat: 'meals',  active: true },
  { id: 10, name: 'Beef & Rice Bowl',        unit: 'Hot meal', price: 12.00, stock: 9,  cat: 'meals',  active: true },
  { id: 11, name: 'Fruit Cup',               unit: '200 g',    price: 4.20,  stock: 14, cat: 'meals',  active: true },
  { id: 12, name: 'Sunscreen SPF 50+',       unit: '100 mL',   price: 8.90,  stock: 18, cat: 'care',   active: true },
  { id: 13, name: 'Lip Balm',                unit: 'Stick',    price: 3.40,  stock: 30, cat: 'care',   active: true },
  { id: 14, name: 'Work Gloves',             unit: 'Pair',     price: 14.50, stock: 3,  cat: 'gear',   active: true },
  { id: 15, name: 'Hi-Vis Cap',              unit: 'Each',     price: 22.00, stock: 7,  cat: 'gear',   active: false },
  { id: 16, name: 'Safety Glasses',          unit: 'Each',     price: 11.50, stock: 11, cat: 'gear',   active: true },
];

const ADMIN_INVOICES = [
  { id: 'INV-2041', supplier: 'Coca-Cola Amatil',   total: 482.50, items: 6, submittedAt: 'Yesterday', status: 'pending_review' },
  { id: 'INV-2040', supplier: 'Crib Foods Co.',     total: 1240.00, items: 18, submittedAt: '2 days ago', status: 'pending_review' },
  { id: 'INV-2039', supplier: 'Outback Distribute', total: 318.20, items: 9, submittedAt: '3 days ago', status: 'pending_review' },
];

function orderTotal(o) { return o.items.reduce((s, i) => s + i.price * i.qty, 0); }

// ─────────────────────────────────────────────────────────────────────────────
// Tiny icon helper (mirrors worker app's Ic so we don't depend on it)
// ─────────────────────────────────────────────────────────────────────────────
function IcA({ name, size = 22, color = 'currentColor', stroke = 1.7 }) {
  const wrap = (children) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
  switch (name) {
    case 'home':    return wrap(<><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></>);
    case 'orders':  return wrap(<><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h5"/></>);
    case 'box':     return wrap(<><path d="m3 8 9-4 9 4-9 4-9-4Z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/></>);
    case 'profile': return wrap(<><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5"/></>);
    case 'plus':    return wrap(<><path d="M12 5v14M5 12h14"/></>);
    case 'minus':   return wrap(<><path d="M5 12h14"/></>);
    case 'check':   return wrap(<path d="m5 12 4.5 4.5L19 7"/>);
    case 'arrow':   return wrap(<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>);
    case 'back':    return wrap(<><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></>);
    case 'close':   return wrap(<><path d="M6 6 18 18M18 6 6 18"/></>);
    case 'search':  return wrap(<><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.6-3.6"/></>);
    case 'alert':   return wrap(<><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 11v4M12 18h0"/></>);
    case 'doc':     return wrap(<><path d="M7 3h7l5 5v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/><path d="M9 14h6M9 18h6"/></>);
    case 'trend':   return wrap(<><path d="m4 17 5-5 4 4 7-8"/><path d="M14 8h6v6"/></>);
    case 'wallet':  return wrap(<><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 13h2.5"/><path d="M3 9h12a2 2 0 0 1 0-4H6a3 3 0 0 0-3 3v1Z"/></>);
    case 'clock':   return wrap(<><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>);
    case 'edit':    return wrap(<><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13 5 4 4"/></>);
    case 'pkg':     return wrap(<><path d="M3 7v10l9 4 9-4V7"/><path d="m3 7 9 4 9-4-9-4-9 4Z"/><path d="M12 11v10"/></>);
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function DashboardScreen({ orders, inventory, invoices, goTab, onOpenInvoice }) {
  const T = window.T;
  const today = orders; // pretend all are today
  const pending = today.filter(o => o.status === 'pending');
  const ready   = today.filter(o => o.status === 'ready');
  const done    = today.filter(o => o.status === 'picked_up');
  const revenue = today.reduce((s, o) => s + orderTotal(o), 0);
  const itemsSold = today.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);

  // Top items today
  const itemAgg = {};
  today.forEach(o => o.items.forEach(i => {
    itemAgg[i.name] = (itemAgg[i.name] || 0) + i.qty;
  }));
  const topItems = Object.entries(itemAgg).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const lowStock = inventory.filter(p => p.active && p.stock > 0 && p.stock <= 5);
  const outOfStock = inventory.filter(p => p.active && p.stock === 0);
  const pendingInvoices = invoices.filter(i => i.status === 'pending_review');

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500, letterSpacing: 0.2 }}>Tuesday · Site B store</div>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>
          Dashboard
        </div>
      </div>

      {/* Hero revenue card */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.brand} 0%, ${T.brandDeep} 100%)`,
          borderRadius: 22, padding: 18, color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 10px 30px -8px rgba(59,130,246,0.45)',
        }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }}/>
          <div style={{ position: 'absolute', right: 30, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}/>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              <IcA name="trend" size={13} color="#fff"/> Revenue today
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4, letterSpacing: -0.6 }}>{fmtA(revenue)}</div>
            <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>ORDERS</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{today.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>ITEMS SOLD</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{itemsSold}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>AVG ORDER</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtA(today.length ? revenue / today.length : 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order status row */}
      <div style={{ padding: '0 20px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Pending',   v: pending.length, color: '#A06B0E', bg: '#FDEFD1', dot: T.warn },
          { label: 'Ready',     v: ready.length,   color: '#1E5BC6', bg: '#DCE8F8', dot: T.brand },
          { label: 'Picked up', v: done.length,    color: '#0E7A4D', bg: '#D6F3E6', dot: T.good },
        ].map(t => (
          <div key={t.label} onClick={() => goTab('orders')} style={{
            background: T.surface, border: `1px solid ${T.line}`,
            borderRadius: 16, padding: 12, cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: t.dot }}/>
              <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.label}</div>
            </div>
            <div style={{ color: T.ink, fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 4 }}>{t.v}</div>
          </div>
        ))}
      </div>

      {/* Top items */}
      <div style={{ padding: '0 20px 6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ color: T.ink, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>Top items today</div>
      </div>
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          background: T.surface, borderRadius: 18, border: `1px solid ${T.line}`, overflow: 'hidden',
        }}>
          {topItems.map(([name, qty], i) => {
            const max = topItems[0][1];
            const pct = (qty / max) * 100;
            return (
              <div key={name} style={{
                padding: '12px 14px', borderTop: i === 0 ? 'none' : `1px solid ${T.line}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: T.ink, fontSize: 13, fontWeight: 600 }}>{name}</span>
                  <span style={{ color: T.ink2, fontSize: 13, fontWeight: 700 }}>{qty} sold</span>
                </div>
                <div style={{ height: 5, background: T.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: `linear-gradient(90deg, ${T.accent}, ${T.brand})`,
                  }}/>
                </div>
              </div>
            );
          })}
          {topItems.length === 0 && (
            <div style={{ padding: 14, color: T.ink3, fontSize: 13, textAlign: 'center' }}>No sales yet today</div>
          )}
        </div>
      </div>

      {/* Stock alerts */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <>
          <div style={{ padding: '0 20px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IcA name="alert" size={16} color={T.warn}/>
            <div style={{ color: T.ink, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>Stock alerts</div>
            <div style={{ marginLeft: 'auto', color: T.brand, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => goTab('inventory')}>
              Manage →
            </div>
          </div>
          <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...outOfStock, ...lowStock].slice(0, 4).map(p => (
              <div key={p.id} style={{
                background: T.surface, borderRadius: 14, border: `1px solid ${T.line}`,
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <window.ProductThumb cat={p.cat} size={36} radius={9}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ color: T.ink3, fontSize: 11, marginTop: 1 }}>{p.unit}</div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: p.stock === 0 ? T.badSoft : T.warnSoft,
                  color:      p.stock === 0 ? T.bad : T.warn,
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
                }}>
                  {p.stock === 0 ? 'Out' : `${p.stock} left`}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pending invoices */}
      {pendingInvoices.length > 0 && (
        <>
          <div style={{ padding: '0 20px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IcA name="doc" size={16} color={T.ink2}/>
            <div style={{ color: T.ink, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>Invoices to review</div>
            <div style={{
              marginLeft: 'auto', background: T.brand, color: '#fff',
              padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            }}>{pendingInvoices.length}</div>
          </div>
          <div style={{ padding: '0 20px 110px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingInvoices.map(inv => (
              <div key={inv.id} onClick={() => onOpenInvoice(inv)} style={{
                background: T.surface, borderRadius: 14, border: `1px solid ${T.line}`,
                padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: T.surfaceAlt,
                  display: 'grid', placeItems: 'center',
                }}>
                  <IcA name="doc" size={20} color={T.ink2}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontSize: 14, fontWeight: 700 }}>{inv.supplier}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 1 }}>{inv.id} · {inv.items} items · {inv.submittedAt}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: T.ink, fontSize: 14, fontWeight: 700 }}>{fmtA(inv.total)}</div>
                  <div style={{
                    marginTop: 2, padding: '2px 8px', borderRadius: 999,
                    background: T.warnSoft, color: T.warn,
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
                    display: 'inline-block',
                  }}>Review</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {pendingInvoices.length === 0 && <div style={{ height: 110 }}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Orders queue (was the previous AdminApp body)
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:   { label: 'Pending',   color: '#A06B0E', bg: '#FDEFD1' },
  ready:     { label: 'Ready',     color: '#1E5BC6', bg: '#DCE8F8' },
  picked_up: { label: 'Picked up', color: '#0E7A4D', bg: '#D6F3E6' },
};

function OrdersScreen({ orders, advance, cancel, openOrderId, setOpenOrderId }) {
  const T = window.T;
  const [tab, setTab] = useStateA('pending');

  const counts = {
    pending:   orders.filter(o => o.status === 'pending').length,
    ready:     orders.filter(o => o.status === 'ready').length,
    picked_up: orders.filter(o => o.status === 'picked_up').length,
  };
  const visible = orders.filter(o => o.status === tab);

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500 }}>Order fulfillment</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 }}>
          <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Order queue</div>
          <div style={{
            background: T.brand, color: '#fff',
            padding: '6px 12px', borderRadius: 999,
            fontSize: 13, fontWeight: 700,
          }}>{counts.pending} to pack</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          display: 'flex', gap: 4, padding: 4, background: T.surfaceAlt, borderRadius: 14,
        }}>
          {[
            { id: 'pending', label: 'Pending' },
            { id: 'ready',   label: 'Ready' },
            { id: 'picked_up', label: 'Done' },
          ].map(t => {
            const active = tab === t.id;
            return (
              <div key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '9px 0', textAlign: 'center', borderRadius: 10,
                background: active ? T.surface : 'transparent',
                boxShadow: active ? '0 1px 3px rgba(12,35,64,0.08)' : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <span style={{ color: active ? T.ink : T.ink3, fontSize: 13, fontWeight: 700 }}>{t.label}</span>
                {counts[t.id] > 0 && (
                  <span style={{
                    background: active ? T.brand : T.line,
                    color: active ? '#fff' : T.ink2,
                    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                    minWidth: 18, textAlign: 'center',
                  }}>{counts[t.id]}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '0 20px 110px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.length === 0 ? (
          <div style={{
            background: T.surface, borderRadius: 18, padding: 30,
            border: `1px dashed ${T.line}`, textAlign: 'center',
            color: T.ink3, fontSize: 14,
          }}>All caught up — nothing in this queue.</div>
        ) : visible.map(o => (
          <OrderCard key={o.id} order={o}
            onOpen={() => setOpenOrderId(o.id)}
            onAdvance={advance} onCancel={cancel}/>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, onOpen, onAdvance, onCancel }) {
  const T = window.T;
  const meta = STATUS_META[order.status];
  const total = orderTotal(order);
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);

  return (
    <div onClick={onOpen} style={{
      background: T.surface, borderRadius: 18, padding: 14,
      border: `1px solid ${T.line}`, cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${T.brand}, ${T.brandDeep})`,
          color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0,
        }}>{order.worker.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.ink, fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{order.worker.name}</div>
          <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
            #{order.id} · {order.placedAt} · {order.worker.id}
          </div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 999,
          background: meta.bg, color: meta.color,
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
        }}>{meta.label}</div>
      </div>

      <div style={{
        marginTop: 12, padding: '10px 0', borderTop: `1px solid ${T.line}`,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {order.items.slice(0, 3).map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{
              minWidth: 26, padding: '2px 6px', borderRadius: 6, background: T.surfaceAlt,
              color: T.ink2, fontWeight: 700, fontSize: 11, textAlign: 'center',
            }}>×{it.qty}</span>
            <span style={{ color: T.ink2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <div style={{ color: T.ink3, fontSize: 12, paddingLeft: 34 }}>+ {order.items.length - 3} more</div>
        )}
      </div>

      <div style={{
        paddingTop: 10, borderTop: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ color: T.ink3, fontSize: 12 }}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'} · <span style={{ color: T.ink, fontWeight: 700 }}>{fmtA(total)}</span>
        </div>
        {order.status === 'pending' && (
          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
            <div onClick={() => onCancel(order)} style={{
              padding: '7px 12px', borderRadius: 10, background: T.badSoft, color: T.bad,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>Cancel</div>
            <div onClick={() => onAdvance(order)} style={{
              padding: '7px 12px', borderRadius: 10, background: T.brand, color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>Mark ready</div>
          </div>
        )}
        {order.status === 'ready' && (
          <div onClick={e => { e.stopPropagation(); onAdvance(order); }} style={{
            padding: '7px 12px', borderRadius: 10, background: T.good, color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>Mark picked up</div>
        )}
      </div>
    </div>
  );
}

function FulfillSheet({ order, open, onClose, onAdvance }) {
  const T = window.T;
  const [checked, setChecked] = useStateA({});
  React.useEffect(() => { if (open) setChecked({}); }, [open, order?.id]);

  if (!order) return null;
  const meta = STATUS_META[order.status];
  const total = orderTotal(order);
  const allChecked = order.items.every((_, i) => checked[i]);
  const totalQty = order.items.reduce((s, i) => s + i.qty, 0);
  const checkedQty = order.items.reduce((s, i, idx) => s + (checked[idx] ? i.qty : 0), 0);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(12,35,64,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease', zIndex: 30,
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 40, maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)',
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }}/>
        </div>

        <div style={{ padding: '8px 20px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
              Order #{order.id}
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 999,
              background: meta.bg, color: meta.color,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
            }}>{meta.label}</div>
          </div>
          <div style={{ color: T.ink2, fontSize: 14, marginTop: 4 }}>
            {order.worker.name} · {order.worker.id} · placed {order.placedAt}
          </div>
        </div>

        {order.status === 'pending' && (
          <div style={{ padding: '0 20px 14px' }}>
            <div style={{
              background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Picking progress</div>
                <div style={{ color: T.ink, fontSize: 13, fontWeight: 700 }}>{checkedQty}/{totalQty}</div>
              </div>
              <div style={{ height: 8, background: T.surfaceAlt, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${(checkedQty / totalQty) * 100}%`, height: '100%',
                  background: `linear-gradient(90deg, ${T.accent}, ${T.brand})`,
                  borderRadius: 8, transition: 'width 250ms ease',
                }}/>
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {order.items.map((it, i) => {
            const isChecked = !!checked[i];
            return (
              <div key={i} onClick={() => order.status === 'pending' && setChecked(c => ({ ...c, [i]: !c[i] }))} style={{
                background: T.surface, borderRadius: 14, padding: 12,
                border: `1px solid ${isChecked ? T.brand : T.line}`,
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: order.status === 'pending' ? 'pointer' : 'default',
                opacity: isChecked ? 0.6 : 1, transition: 'all 200ms ease',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8,
                  border: `2px solid ${isChecked ? T.brand : T.line}`,
                  background: isChecked ? T.brand : T.surface,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  {isChecked && <IcA name="check" size={14} color="#fff" stroke={3}/>}
                </div>
                <window.ProductThumb cat={it.cat} size={42} radius={10}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: T.ink, fontSize: 14, fontWeight: 600,
                    textDecoration: isChecked ? 'line-through' : 'none',
                  }}>{it.name}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{it.qty} × {fmtA(it.price)}</div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 8, background: T.surfaceAlt,
                  color: T.ink2, fontWeight: 700, fontSize: 13,
                }}>×{it.qty}</div>
              </div>
            );
          })}
        </div>

        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 20px 26px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: T.ink3, fontSize: 13 }}>Order total</span>
            <span style={{ color: T.ink, fontSize: 16, fontWeight: 700 }}>{fmtA(total)}</span>
          </div>
          {order.status === 'pending' && (
            <div onClick={() => allChecked && (onAdvance(order), onClose())} style={{
              padding: 16, borderRadius: 16,
              background: allChecked ? T.brand : T.surfaceAlt,
              color: allChecked ? '#fff' : T.ink3,
              fontSize: 15, fontWeight: 700, textAlign: 'center',
              cursor: allChecked ? 'pointer' : 'default',
            }}>
              {allChecked ? 'Mark ready for pickup' : `Pick all items (${checkedQty}/${totalQty})`}
            </div>
          )}
          {order.status === 'ready' && (
            <div onClick={() => { onAdvance(order); onClose(); }} style={{
              padding: 16, borderRadius: 16, background: T.good, color: '#fff',
              fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
            }}>Confirm pickup</div>
          )}
          {order.status === 'picked_up' && (
            <div onClick={onClose} style={{
              padding: 16, borderRadius: 16, background: T.surfaceAlt, color: T.ink2,
              fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
            }}>Close</div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory
// ─────────────────────────────────────────────────────────────────────────────
function InventoryScreen({ inventory, onChange, openEditId, setOpenEditId }) {
  const T = window.T;
  const [q, setQ] = useStateA('');
  const [filter, setFilter] = useStateA('all'); // all | low | out | inactive

  const lowCount = inventory.filter(p => p.active && p.stock > 0 && p.stock <= 5).length;
  const outCount = inventory.filter(p => p.active && p.stock === 0).length;
  const inactiveCount = inventory.filter(p => !p.active).length;

  let list = inventory;
  if (filter === 'low')      list = inventory.filter(p => p.active && p.stock > 0 && p.stock <= 5);
  if (filter === 'out')      list = inventory.filter(p => p.active && p.stock === 0);
  if (filter === 'inactive') list = inventory.filter(p => !p.active);
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  function adjust(p, delta) {
    onChange(p.id, { stock: Math.max(0, p.stock + delta) });
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500 }}>{inventory.length} products</div>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>Inventory</div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16,
        }}>
          <IcA name="search" size={18} color={T.ink3}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: T.ink,
              fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
            }}/>
          {q && <div onClick={() => setQ('')} style={{ display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <IcA name="close" size={16} color={T.ink3}/>
          </div>}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: '0 0 14px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px', scrollbarWidth: 'none' }}>
          {[
            { id: 'all',      label: 'All',          count: inventory.length },
            { id: 'low',      label: 'Low stock',    count: lowCount,       color: T.warn },
            { id: 'out',      label: 'Out of stock', count: outCount,       color: T.bad },
            { id: 'inactive', label: 'Inactive',     count: inactiveCount,  color: T.ink3 },
          ].map(c => {
            const active = filter === c.id;
            return (
              <div key={c.id} onClick={() => setFilter(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 999,
                background: active ? T.ink : T.surface,
                border: `1px solid ${active ? T.ink : T.line}`,
                color: active ? '#fff' : (c.color || T.ink2),
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                cursor: 'pointer',
              }}>
                {c.label}
                {c.count > 0 && (
                  <span style={{
                    background: active ? 'rgba(255,255,255,0.2)' : T.surfaceAlt,
                    color: active ? '#fff' : T.ink2,
                    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, minWidth: 18, textAlign: 'center',
                  }}>{c.count}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0 20px 110px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.length === 0 && (
          <div style={{
            background: T.surface, borderRadius: 18, padding: 30,
            border: `1px dashed ${T.line}`, textAlign: 'center', color: T.ink3, fontSize: 14,
          }}>No products match.</div>
        )}
        {list.map(p => {
          const out = p.stock === 0;
          const low = p.stock > 0 && p.stock <= 5;
          const inactive = !p.active;
          const stockChip =
            inactive ? { label: 'Hidden',     bg: T.surfaceAlt, fg: T.ink3 } :
            out      ? { label: 'Out',        bg: T.badSoft,    fg: T.bad } :
            low      ? { label: `${p.stock}`, bg: T.warnSoft,   fg: T.warn } :
                       { label: `${p.stock}`, bg: T.goodSoft,   fg: T.good };

          return (
            <div key={p.id} style={{
              background: T.surface, borderRadius: 16, padding: 12,
              border: `1px solid ${T.line}`,
              opacity: inactive ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <window.ProductThumb cat={p.cat} size={48} radius={11}/>
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => setOpenEditId(p.id)}>
                  <div style={{ color: T.ink, fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{p.unit} · {fmtA(p.price)}</div>
                </div>
                <div style={{
                  minWidth: 48, padding: '6px 10px', borderRadius: 10,
                  background: stockChip.bg, color: stockChip.fg,
                  fontSize: 13, fontWeight: 700, textAlign: 'center',
                }}>{stockChip.label}</div>
              </div>

              <div style={{
                marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ color: T.ink3, fontSize: 12, fontWeight: 600 }}>Stock</div>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: T.surfaceAlt, borderRadius: 10, padding: 2,
                }}>
                  <div onClick={() => adjust(p, -1)} style={{
                    width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer',
                  }}>
                    <IcA name="minus" size={14} color={T.ink2}/>
                  </div>
                  <div style={{ minWidth: 28, textAlign: 'center', fontWeight: 700, fontSize: 13, color: T.ink }}>{p.stock}</div>
                  <div onClick={() => adjust(p, 1)} style={{
                    width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer',
                  }}>
                    <IcA name="plus" size={14} color={T.ink2}/>
                  </div>
                </div>
                <div style={{ flex: 1 }}/>
                <div onClick={() => setOpenEditId(p.id)} style={{
                  padding: '7px 12px', borderRadius: 10, background: T.brandSoft, color: T.brand,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <IcA name="edit" size={13} color={T.brand}/> Edit
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditProductSheet({ product, open, onClose, onSave }) {
  const T = window.T;
  const [draft, setDraft] = useStateA(null);
  React.useEffect(() => { if (product) setDraft({ ...product }); }, [product?.id, open]);
  if (!draft) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(12,35,64,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease', zIndex: 30,
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 40, maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)',
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }}/>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Edit product</div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <IcA name="close" size={18} color={T.ink2}/>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}` }}>
            <window.ProductThumb cat={draft.cat} size={56} radius={12}/>
            <div style={{ flex: 1, color: T.ink3, fontSize: 12 }}>Product ID #{draft.id}</div>
          </div>

          <Field label="Name">
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
              style={inputStyle()}/>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Unit">
              <input value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} style={inputStyle()}/>
            </Field>
            <Field label="Price (AUD)">
              <input type="number" step="0.10" value={draft.price}
                onChange={e => setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })}
                style={inputStyle()}/>
            </Field>
          </div>

          <Field label="Stock on hand">
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 6,
            }}>
              <div onClick={() => setDraft({ ...draft, stock: Math.max(0, draft.stock - 1) })} style={{
                width: 40, height: 40, display: 'grid', placeItems: 'center', cursor: 'pointer',
                background: T.surfaceAlt, borderRadius: 10,
              }}>
                <IcA name="minus" size={16} color={T.ink2}/>
              </div>
              <input type="number" value={draft.stock}
                onChange={e => setDraft({ ...draft, stock: parseInt(e.target.value) || 0 })}
                style={{ ...inputStyle(), border: 'none', textAlign: 'center', fontSize: 18, fontWeight: 700 }}/>
              <div onClick={() => setDraft({ ...draft, stock: draft.stock + 1 })} style={{
                width: 40, height: 40, display: 'grid', placeItems: 'center', cursor: 'pointer',
                background: T.surfaceAlt, borderRadius: 10,
              }}>
                <IcA name="plus" size={16} color={T.ink2}/>
              </div>
            </div>
          </Field>

          {/* Visibility toggle */}
          <div style={{
            background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 14,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.ink, fontSize: 14, fontWeight: 700 }}>Show to workers</div>
              <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
                {draft.active ? 'Visible in shop. If stock = 0, shown grayed-out.' : 'Hidden from shop entirely.'}
              </div>
            </div>
            <Toggle value={draft.active} onChange={v => setDraft({ ...draft, active: v })}/>
          </div>
        </div>

        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 20px 26px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
          display: 'flex', gap: 10,
        }}>
          <div onClick={onClose} style={{
            flex: 1, padding: 16, borderRadius: 16,
            background: T.surfaceAlt, color: T.ink2,
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
          }}>Cancel</div>
          <div onClick={() => { onSave(draft); onClose(); }} style={{
            flex: 2, padding: 16, borderRadius: 16,
            background: T.brand, color: '#fff',
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
          }}>Save changes</div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ color: window.T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', borderRadius: 12,
    border: `1px solid ${window.T.line}`, background: window.T.surface,
    fontSize: 15, color: window.T.ink,
    fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
    outline: 'none',
  };
}
function Toggle({ value, onChange }) {
  const T = window.T;
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 26, borderRadius: 999, padding: 3, cursor: 'pointer',
      background: value ? T.brand : T.line, transition: 'background 200ms ease',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 999, background: '#fff',
        transform: value ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 200ms ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
      }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice review sheet
// ─────────────────────────────────────────────────────────────────────────────
function InvoiceSheet({ invoice, open, onClose, onResolve }) {
  const T = window.T;
  if (!invoice) return null;
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(12,35,64,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease', zIndex: 30,
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 40, maxHeight: '88%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)',
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }}/>
        </div>
        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: T.ink3, fontSize: 12, fontWeight: 600 }}>Invoice review</div>
            <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>{invoice.id}</div>
          </div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <IcA name="close" size={18} color={T.ink2}/>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: T.ink3, fontSize: 13 }}>Supplier</span>
              <span style={{ color: T.ink, fontSize: 14, fontWeight: 700 }}>{invoice.supplier}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: T.ink3, fontSize: 13 }}>Submitted</span>
              <span style={{ color: T.ink2, fontSize: 14 }}>{invoice.submittedAt}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: T.ink3, fontSize: 13 }}>Items</span>
              <span style={{ color: T.ink2, fontSize: 14 }}>{invoice.items}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${T.line}` }}>
              <span style={{ color: T.ink3, fontSize: 13 }}>Total</span>
              <span style={{ color: T.ink, fontSize: 18, fontWeight: 700 }}>{fmtA(invoice.total)}</span>
            </div>
          </div>

          <div style={{
            background: T.surface, borderRadius: 16, padding: 30, border: `1px dashed ${T.line}`,
            textAlign: 'center', color: T.ink3, fontSize: 13,
          }}>
            <IcA name="doc" size={28} color={T.ink3}/>
            <div style={{ marginTop: 6 }}>Invoice PDF preview</div>
          </div>
        </div>

        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 20px 26px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
          display: 'flex', gap: 10,
        }}>
          <div onClick={() => onResolve(invoice, 'rejected')} style={{
            flex: 1, padding: 16, borderRadius: 16, background: T.badSoft, color: T.bad,
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
          }}>Reject</div>
          <div onClick={() => onResolve(invoice, 'approved')} style={{
            flex: 2, padding: 16, borderRadius: 16, background: T.good, color: '#fff',
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
          }}>Approve invoice</div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile (admin)
// ─────────────────────────────────────────────────────────────────────────────
function AdminProfile() {
  const T = window.T;
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
            color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 20,
          }}>RS</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.ink, fontSize: 17, fontWeight: 700 }}>Riley Stone</div>
            <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>Storekeeper · Site B</div>
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 999, background: T.brandSoft, color: T.brand,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
          }}>Admin</div>
        </div>
      </div>
      <div style={{ padding: '0 20px 110px', display: 'flex', flexDirection: 'column', gap: 1, background: T.surface, margin: '0 20px', borderRadius: 18, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
        {[
          { ic: 'trend',  label: 'Reports & exports' },
          { ic: 'pkg',    label: 'Suppliers' },
          { ic: 'profile',label: 'Manage workers' },
          { ic: 'doc',    label: 'Settings' },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '14px 16px', background: T.surface,
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            borderBottom: i < 3 ? `1px solid ${T.line}` : 'none',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: T.surfaceAlt,
              display: 'grid', placeItems: 'center',
            }}>
              <IcA name={item.ic} size={18} color={T.ink2}/>
            </div>
            <div style={{ flex: 1, color: T.ink, fontSize: 14, fontWeight: 600 }}>{item.label}</div>
            <IcA name="arrow" size={16} color={T.ink3}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab bar (admin)
// ─────────────────────────────────────────────────────────────────────────────
function AdminTabBar({ active, go, pendingCount }) {
  const T = window.T;
  const tabs = [
    { id: 'dashboard', icon: 'home',    label: 'Dashboard' },
    { id: 'orders',    icon: 'orders',  label: 'Orders', badge: pendingCount },
    { id: 'inventory', icon: 'box',     label: 'Inventory' },
    { id: 'profile',   icon: 'profile', label: 'Me' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 24, paddingTop: 8,
      background: 'rgba(244,248,252,0.85)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${T.line}`, zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 6px' }}>
        {tabs.map(t => {
          const isActive = active === t.id;
          return (
            <div key={t.id} onClick={() => go(t.id)} style={{
              flex: 1, padding: '6px 0', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, position: 'relative', cursor: 'pointer',
            }}>
              <div style={{ position: 'relative' }}>
                <IcA name={t.icon} size={24} color={isActive ? T.brand : T.ink3} stroke={isActive ? 2 : 1.7}/>
                {t.badge > 0 && (
                  <div style={{
                    position: 'absolute', top: -4, right: -8,
                    minWidth: 16, height: 16, padding: '0 4px',
                    background: T.bad, color: '#fff',
                    borderRadius: 999, fontSize: 10, fontWeight: 700,
                    display: 'grid', placeItems: 'center',
                    border: `2px solid ${T.bg}`,
                  }}>{t.badge > 9 ? '9+' : t.badge}</div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? T.brand : T.ink3 }}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminApp shell
// ─────────────────────────────────────────────────────────────────────────────
function AdminApp() {
  const T = window.T;
  const [tab, setTab] = useStateA('dashboard');
  const [orders, setOrders] = useStateA(ADMIN_ORDERS_SEED);
  const [inventory, setInventory] = useStateA(ADMIN_INVENTORY_SEED);
  const [invoices, setInvoices] = useStateA(ADMIN_INVOICES);
  const [openOrderId, setOpenOrderId] = useStateA(null);
  const [openEditId, setOpenEditId] = useStateA(null);
  const [openInvoice, setOpenInvoice] = useStateA(null);

  const openOrder = orders.find(o => o.id === openOrderId) || null;
  const editingProduct = inventory.find(p => p.id === openEditId) || null;
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  function advance(order) {
    setOrders(prev => prev.map(o => {
      if (o.id !== order.id) return o;
      if (o.status === 'pending') return { ...o, status: 'ready' };
      if (o.status === 'ready')   return { ...o, status: 'picked_up' };
      return o;
    }));
  }
  function cancel(order) { setOrders(prev => prev.filter(o => o.id !== order.id)); }
  function saveProduct(p) { setInventory(prev => prev.map(x => x.id === p.id ? p : x)); }
  function adjustProduct(id, patch) { setInventory(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x)); }
  function resolveInvoice(inv, decision) {
    setInvoices(prev => prev.filter(i => i.id !== inv.id));
    setOpenInvoice(null);
  }

  let body;
  if (tab === 'dashboard') body = <DashboardScreen orders={orders} inventory={inventory} invoices={invoices} goTab={setTab} onOpenInvoice={setOpenInvoice}/>;
  if (tab === 'orders')    body = <OrdersScreen orders={orders} advance={advance} cancel={cancel} openOrderId={openOrderId} setOpenOrderId={setOpenOrderId}/>;
  if (tab === 'inventory') body = <InventoryScreen inventory={inventory} onChange={adjustProduct} openEditId={openEditId} setOpenEditId={setOpenEditId}/>;
  if (tab === 'profile')   body = <AdminProfile/>;

  return (
    <div style={{
      position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
    }}>
      {body}
      <AdminTabBar active={tab} go={setTab} pendingCount={pendingCount}/>

      <FulfillSheet
        order={openOrder}
        open={!!openOrder}
        onClose={() => setOpenOrderId(null)}
        onAdvance={advance}
      />
      <EditProductSheet
        product={editingProduct}
        open={!!editingProduct}
        onClose={() => setOpenEditId(null)}
        onSave={saveProduct}
      />
      <InvoiceSheet
        invoice={openInvoice}
        open={!!openInvoice}
        onClose={() => setOpenInvoice(null)}
        onResolve={resolveInvoice}
      />
    </div>
  );
}

Object.assign(window, { AdminApp });
