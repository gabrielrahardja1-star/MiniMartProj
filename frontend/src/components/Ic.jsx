export default function Ic({ name, size = 22, color = 'currentColor', stroke = 1.7 }) {
  const s = size, c = color, sw = stroke
  const wrap = (children) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
         stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
  switch (name) {
    case 'home':    return wrap(<><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></>)
    case 'shop':    return wrap(<><path d="M4 8h16l-1.2 11a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8Z"/><path d="M9 8V6a3 3 0 1 1 6 0v2"/></>)
    case 'orders':  return wrap(<><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h5"/></>)
    case 'profile': return wrap(<><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5"/></>)
    case 'cart':    return wrap(<><path d="M3 4h2.2l2.6 11.6a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6.5"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></>)
    case 'search':  return wrap(<><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.6-3.6"/></>)
    case 'plus':    return wrap(<><path d="M12 5v14M5 12h14"/></>)
    case 'minus':   return wrap(<path d="M5 12h14"/>)
    case 'check':   return wrap(<path d="m5 12 4.5 4.5L19 7"/>)
    case 'arrow':   return wrap(<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>)
    case 'back':    return wrap(<><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></>)
    case 'close':   return wrap(<><path d="M6 6 18 18M18 6 6 18"/></>)
    case 'clock':   return wrap(<><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>)
    case 'bell':    return wrap(<><path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4L6 17Z"/><path d="M10 20a2 2 0 0 0 4 0"/></>)
    case 'qr':      return wrap(<><rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 14.5h2v2M20.5 14.5v2M14.5 18.5v2h2M18.5 16.5h2v2M20.5 20.5h0"/></>)
    case 'flame':   return wrap(<path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-1.5.7-2.5 1.5-3.2C9.8 9.5 12 9 12 6.5 14 8 16 9.5 16 12a4 4 0 0 1-8 0"/>)
    case 'wallet':  return wrap(<><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 13h2.5"/><path d="M3 9h12a2 2 0 0 1 0-4H6a3 3 0 0 0-3 3v1Z"/></>)
    case 'box':     return wrap(<><path d="m3 8 9-4 9 4-9 4-9-4Z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/></>)
    case 'star':    return wrap(<path d="m12 4 2.5 5.2 5.7.8-4.1 4 1 5.6L12 17l-5.1 2.6 1-5.6-4.1-4 5.7-.8L12 4Z"/>)
    case 'phone':   return wrap(<path d="M5 5a2 2 0 0 1 2-2h2l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v2a2 2 0 0 1-2 2A14 14 0 0 1 5 5Z"/>)
    case 'cup':     return wrap(<><path d="M6 8h11l-1 11a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6 8Z"/><path d="M17 11h2a2 2 0 0 1 0 4h-1.5"/></>)
    case 'snack':   return wrap(<><path d="M5 7h14l-1.2 12.5a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z"/><path d="M8 7V5h8v2"/></>)
    case 'meal':    return wrap(<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/></>)
    case 'care':    return wrap(<><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M9 7h6l-1 14H10L9 7Z"/></>)
    case 'helmet':  return wrap(<><path d="M4 16h16v3H4z"/><path d="M5 16a7 7 0 0 1 14 0"/><path d="M9 9V6h6v3"/></>)
    case 'grid':    return wrap(<><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/></>)
    case 'logout':  return wrap(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>)
    case 'alert':   return wrap(<><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 11v4M12 18h0"/></>)
    case 'doc':     return wrap(<><path d="M7 3h7l5 5v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/><path d="M9 14h6M9 18h6"/></>)
    case 'trend':   return wrap(<><path d="m4 17 5-5 4 4 7-8"/><path d="M14 8h6v6"/></>)
    case 'edit':    return wrap(<><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13 5 4 4"/></>)
    case 'pkg':     return wrap(<><path d="M3 7v10l9 4 9-4V7"/><path d="m3 7 9 4 9-4-9-4-9 4Z"/><path d="M12 11v10"/></>)
    case 'download': return wrap(<><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/></>)
    case 'users':   return wrap(<><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c1-3 3-4.5 5.5-4.5S13.5 17 14.5 20"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M18 15.2c1.9.5 3.2 1.9 4 4.8"/></>)
    case 'calendar':return wrap(<><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></>)
    default: return null
  }
}
