import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, Fragment } from 'react';
import * as api from './api';
import { Truck, Shield, CreditCard, Clock, Star, Lock, Zap, Package, Heart, ThumbsUp, CheckCircle, Gift, Headphones, Phone, Mail, MapPin, Globe, Award, BadgeCheck, ShoppingCart, Tag, Percent, RefreshCw, Send, Eye, Users, Wrench, Wifi, Battery, Cpu, Monitor, Smartphone, Camera, Bookmark, Bell, MessageCircle, HelpCircle, Info, AlertCircle } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// ═══════════════════════════════════════════════════════════
// App.jsx — Sistema Unificado v4 (COMPLETO)
// ═══════════════════════════════════════════════════════════

const fmt = n => Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtARS = n => `$${fmt(n)}`;
const waLink = (num, msg) => `https://api.whatsapp.com/send?phone=${String(num).replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`;
const openWA = (num, msg) => window.open(waLink(num, msg), '_blank');

// ─── ICON MAP (Lucide icons) ───
const ICON_MAP = {
  truck: Truck, shield: Shield, 'credit-card': CreditCard, clock: Clock, star: Star, lock: Lock, zap: Zap, package: Package, heart: Heart, 'thumbs-up': ThumbsUp, 'check-circle': CheckCircle, gift: Gift, headphones: Headphones, phone: Phone, mail: Mail, 'map-pin': MapPin, globe: Globe, award: Award, 'badge-check': BadgeCheck, 'shopping-cart': ShoppingCart, tag: Tag, percent: Percent, 'refresh-cw': RefreshCw, send: Send, eye: Eye, users: Users, wrench: Wrench, wifi: Wifi, battery: Battery, cpu: Cpu, monitor: Monitor, smartphone: Smartphone, camera: Camera, bookmark: Bookmark, bell: Bell, 'message-circle': MessageCircle, 'help-circle': HelpCircle, info: Info, 'alert-circle': AlertCircle
};
const ICON_LIST = Object.keys(ICON_MAP);

// Render an icon: lucide name → SVG, URL → img, else → emoji
function RenderIcon({ value, size = 20, color }) {
  if (!value) return null;
  if (value.startsWith('http') || value.startsWith('/') || value.startsWith('data:')) return <img src={value} alt="" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 4 }} />;
  const LucideIcon = ICON_MAP[value];
  if (LucideIcon) return <LucideIcon size={size} color={color || 'currentColor'} />;
  return <span style={{ fontSize: size * 0.9 }}>{value}</span>;
}

// IconPicker: grid of lucide icons + emoji fallback + image upload
function IconPicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useContext(Ctx);
  const filtered = ICON_LIST.filter(n => n.includes(search.toLowerCase()));
  const handleUpload = async (file) => {
    try { const r = await api.uploadImagen(file); onChange(r.url); setOpen(false); } catch { toast('Error al subir', 'error'); }
  };
  return (
    <div>
      {label && <label className="form-label">{label}</label>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={() => setOpen(!open)} style={{ width: 44, height: 44, borderRadius: 10, border: '2px solid #e5e7eb', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20 }}>
          <RenderIcon value={value} size={22} />
        </button>
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Emoji, nombre de ícono, o URL" style={{ flex: 1, fontSize: 13 }} />
      </div>
      {open && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginTop: 8, background: 'var(--bg-card)', maxHeight: 260, overflowY: 'auto' }}>
          <input placeholder="Buscar ícono..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 8, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #ddd' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))', gap: 4, marginBottom: 8 }}>
            {filtered.map(name => { const I = ICON_MAP[name]; return (
              <button key={name} type="button" onClick={() => { onChange(name); setOpen(false); }} title={name}
                style={{ width: 42, height: 42, borderRadius: 8, border: value === name ? '2px solid var(--primary)' : '1px solid #eee', background: value === name ? 'var(--primary-light)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <I size={18} />
              </button>
            ); })}
          </div>
          <div style={{ borderTop: '1px solid #eee', paddingTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>O subí tu imagen:</span>
            <input type="file" accept="image/*" onChange={e => { if (e.target.files[0]) handleUpload(e.target.files[0]); }} style={{ fontSize: 11 }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ANDREANI CALCULATOR (product detail) ───
function AndreaniCalculator({ seccionId, peso, volumen, onSelect }) {
  const [cp, setCp] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [customShipping, setCustomShipping] = useState([]);
  const { toast, config } = useContext(Ctx);

  useEffect(() => {
    api.getEnvioCustom(seccionId).then(setCustomShipping).catch(() => {});
  }, [seccionId]);

  const calcular = async () => {
    if (cp.length < 4) { toast('Ingresá un código postal válido', 'error'); return; }
    setLoading(true);
    try {
      const [cotiz, sucs] = await Promise.all([
        api.cotizarAndreani(cp, peso || 0.5, volumen || 0.001, seccionId).catch(() => null),
        api.getSucursalesAndreani(cp).catch(() => [])
      ]);
      setResult({ cotiz, sucursales: Array.isArray(sucs) ? sucs.slice(0, 3) : [] });
    } catch { toast('Error al consultar envío', 'error'); }
    setLoading(false);
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Truck size={18} /> Calculá el costo de envío
      </div>
      {config?.aclaracion_envios && <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--border-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>ℹ️ {config.aclaracion_envios}</div>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={cp} onChange={e => setCp(e.target.value)} placeholder="Tu código postal" maxLength={8}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
          onKeyDown={e => e.key === 'Enter' && calcular()} />
        <button onClick={calcular} disabled={loading}
          style={{ background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {loading ? '...' : 'CALCULAR'}
        </button>
      </div>

      {/* Custom shipping options */}
      {customShipping.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {customShipping.map(m => (
            <div key={m.id} onClick={() => onSelect && onSelect({ nombre: m.nombre, costo: m.precio, tipo: 'custom' })}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border-light)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 20 }}><RenderIcon value={m.icono} size={20} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{m.nombre}</div>
                {m.descripcion && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.descripcion}</div>}
                {m.tiempo_estimado && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.tiempo_estimado}</div>}
              </div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{m.precio > 0 ? fmtARS(m.precio) : 'Gratis'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Andreani results */}
      {result && (
        <div>
          {result.cotiz && result.cotiz.costo > 0 && (
            <div onClick={() => onSelect && onSelect({ nombre: 'Envío a domicilio (Andreani)', costo: result.cotiz.costo, tipo: 'andreani' })}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border-light)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span>🚚</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Envío a domicilio</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>1 a 3 días hábiles</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{fmtARS(result.cotiz.costo)}</div>
            </div>
          )}
          {result.sucursales.map((s, i) => (
            <div key={i} onClick={() => onSelect && onSelect({ nombre: `Retiro en ${s.direccion?.localidad || 'sucursal'}`, costo: (result.cotiz?.costo || 0) * 0.6, tipo: 'sucursal' })}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border-light)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span>📍</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Retiro en sucursal</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.direccion?.calle} {s.direccion?.numero}, {s.direccion?.localidad}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--success)' }}>{fmtARS((result.cotiz?.costo || 0) * 0.6)}</div>
            </div>
          ))}
          {!result.cotiz && result.sucursales.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>No hay opciones de envío para este código postal</p>
          )}
        </div>
      )}
    </div>
  );
}

// Context for shared state
const Ctx = createContext();

// Toast hook
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  const ToastContainer = () => (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
    </div>
  );
  return { show, ToastContainer };
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(() => { const sv = localStorage.getItem('gm_page'); if (!sv || ['login','register','forgot','maintenance'].includes(sv)) return 'landing'; return sv; });
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => localStorage.getItem('gm_dark') === 'true');
  const [testMode, setTestMode] = useState(() => localStorage.getItem('gm_test') === 'true');
  const [mobileMenu, setMobileMenu] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  const [secciones, setSecciones] = useState([]);
  const [config, setConfig] = useState({});
  const [design, setDesign] = useState({});

  // Update browser title + favicon when design changes
  useEffect(() => {
    if (design.nombre_tienda) document.title = design.nombre_tienda;
    if (design.favicon_url) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = design.favicon_url;
    }
  }, [design.nombre_tienda, design.favicon_url]);
  const [seccionActual, setSeccionActual] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_seccion') || 'null'); } catch { return null; } });
  const [selectedProduct, setSelectedProduct] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_product') || 'null'); } catch { return null; } });
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_cart') || '{}'); } catch { return {}; } });
  const [menuItems, setMenuItems] = useState([]);
  const [redesSociales, setRedesSociales] = useState([]);
  const [badges, setBadges] = useState([]);
  const [barras, setBarras] = useState([]);
  const [listas, setListas] = useState([]);
  const [preciosFijos, setPreciosFijos] = useState([]);

  const [adminTab, setAdminTab] = useState('dashboard');
  const [adminSeccion, setAdminSeccion] = useState('all');

  // Global search (shared across Header + Landing + all pages)
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalResults, setGlobalResults] = useState(null);
  const doGlobalSearch = useCallback(async (q) => {
    const term = q !== undefined ? q : globalSearch;
    if (term.length < 2) { setGlobalResults(null); return; }
    const data = await api.busquedaGlobal(term);
    setGlobalResults(data);
    api.trackSearch(term, data.total);
  }, [globalSearch]);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('gm_dark', dark);
  }, [dark]);

  // Save cart
  useEffect(() => { localStorage.setItem('gm_cart', JSON.stringify(cart)); }, [cart]);

  // Auto-limpieza: quitar del carrito secciones inexistentes o ítems inválidos (fantasmas)
  useEffect(() => {
    if (!secciones.length) return;
    const valid = new Set(secciones.map(x => String(x.id)));
    setCart(prev => {
      let changed = false; const next = {};
      for (const [k, items] of Object.entries(prev)) {
        if (valid.has(String(k)) && Array.isArray(items)) {
          const clean = items.filter(i => i && i.qty > 0 && ((i.precio_unitario || i.precio_base || 0) > 0));
          next[k] = clean; if (clean.length !== items.length) changed = true;
        } else changed = true;
      }
      return changed ? next : prev;
    });
  }, [secciones.length]);

  // FIX #4: persistir ruta + seccion
  useEffect(() => { localStorage.setItem('gm_page', page); }, [page]);
  useEffect(() => { localStorage.setItem('gm_seccion', JSON.stringify(seccionActual)); }, [seccionActual]);
  useEffect(() => { localStorage.setItem('gm_product', JSON.stringify(selectedProduct)); }, [selectedProduct]);

  // Init - runs once
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    (async () => {
      try {
        const [secs, cfg, des, menu, redes, lsts, pf] = await Promise.all([
          api.getSecciones(), api.getConfig(), api.getDesign().catch(() => ({})),
          api.getMenu().catch(() => []), api.getRedesSociales().catch(() => []),
          api.getListas().catch(() => []), api.getPreciosFijos().catch(() => [])
        ]);
        setSecciones(secs); setConfig(cfg); setDesign(des);
        setMenuItems(menu); setRedesSociales(redes);
        setListas(Array.isArray(lsts) ? lsts : []); setPreciosFijos(Array.isArray(pf) ? pf : []);
        api.getBadges().then(setBadges).catch(() => {});
        api.getBarras().then(b => setBarras(Array.isArray(b) ? b : [])).catch(() => {});
        if (api.getToken()) {
          try { const me = await api.getMe(); setUser(me); }
          catch { api.logout(); }
        }
        // QR del remito: ?pedido=X abre el pedido en el admin
        const pedidoParam = new URLSearchParams(window.location.search).get('pedido');
        if (pedidoParam) {
          const me = api.getToken() ? await api.getMe().catch(() => null) : null;
          if (me && ['admin','subadmin'].includes(me.rol)) {
            setUser(me); setAdminTab('pedidos'); setPage('admin');
            setTimeout(() => { window.__openPedido = Number(pedidoParam); window.dispatchEvent(new Event('open-pedido')); }, 800);
          }
        }
        // Carrito compartido: ?carrito=BASE64 precarga el carrito y lleva al cart
        const carritoParam = new URLSearchParams(window.location.search).get('carrito');
        if (carritoParam) {
          try {
            const payload = JSON.parse(decodeURIComponent(atob(carritoParam))); // [{s,p,q}]
            const nuevoCart = {};
            for (const it of payload) {
              const prod = await api.getProducto(it.p).catch(() => null);
              if (!prod) continue;
              const secId = String(it.s || prod.seccion_id);
              if (!nuevoCart[secId]) nuevoCart[secId] = [];
              nuevoCart[secId].push({ ...prod, seccion_id: secId, qty: it.q || 1, precio_unitario: prod.precio_base });
            }
            if (Object.keys(nuevoCart).length) { setCart(nuevoCart); setPage('cart'); toast('Carrito cargado — revisá y continuá la compra'); }
            window.history.replaceState({}, '', window.location.pathname);
          } catch {}
        }
        const maint = await api.getMaintenanceStatus();
        if (maint.activo) {
          const me = api.getToken() ? await api.getMe().catch(() => null) : null;
          if (!me || !['admin','subadmin'].includes(me?.rol)) setPage('maintenance');
        }
      } catch (e) { console.error('Init error:', e); }
      setLoading(false);
    })();
  }, []);

  // Nav helper
  const nav = useCallback((p, secId) => {
    // snapshot (con scroll) para el botón atrás del navegador
    window._navHist = window._navHist || [];
    window._navHist.push({ page, sec: seccionActual, prod: selectedProduct, scrollY: window.scrollY });
    try { window.history.pushState({ d: window._navHist.length }, ''); } catch (e) {}
    if (p === 'product' && secId && typeof secId === 'object') {
      setSelectedProduct(secId);
      const sec = seccionActual || secciones.find(s => s.id === secId.seccion_id);
      if (sec) setSeccionActual(sec);
      setPage('product');
    } else if (secId) {
      const sec = secciones.find(s => s.id === Number(secId) || s.slug === secId);
      setSeccionActual(sec || null);
      setPage(p);
    } else {
      setPage(p);
    }
    setMobileMenu(false); window.scrollTo(0, 0);
  }, [secciones, seccionActual, page, selectedProduct]);

  // Bloque 2: el botón atrás del navegador navega dentro de la app (no sale del sitio)
  useEffect(() => {
    const onPop = () => {
      const h = window._navHist || [];
      const snap = h.pop();
      if (!snap) { setPage('landing'); return; }
      setSelectedProduct(snap.prod || null);
      setSeccionActual(snap.sec || null);
      setPage(snap.page || 'landing');
      const y = snap.scrollY || 0;
      if (y > 0) {
        let n = 0;
        const restore = () => {
          window.scrollTo(0, y);
          if (Math.abs(window.scrollY - y) > 3 && ++n < 40) setTimeout(restore, 50);
        };
        setTimeout(restore, 30);
      } else window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Cart helpers
  const cartForSection = (secId) => cart[secId] || [];
  const cartCount = secciones.reduce((s, sec) => {
    const items = Array.isArray(cart[sec.id]) ? cart[sec.id] : [];
    return s + items.reduce((sum, i) => sum + (i.qty > 0 ? i.qty : 0), 0);
  }, 0);
  const addToCart = (secId, product, qty = 1, precio) => {
    // Priorizar la sección REAL del producto para que mínimos/envío/badges apliquen bien
    const realSec = product?.seccion_id ? String(product.seccion_id) : secId;
    setCart(prev => {
      const items = [...(prev[realSec] || [])];
      const existing = items.find(i => i.id === product.id);
      if (existing) existing.qty += qty;
      else items.push({ ...product, seccion_id: realSec, qty, precio_unitario: precio || product.precio_base });
      return { ...prev, [realSec]: items };
    });
    toast('Agregado al carrito');
  };
  const removeFromCart = (secId, productId) => {
    setCart(prev => ({ ...prev, [secId]: (prev[secId] || []).filter(i => i.id !== productId) }));
  };
  const updateCartQty = (secId, productId, qty) => {
    if (qty <= 0) return removeFromCart(secId, productId);
    setCart(prev => ({ ...prev, [secId]: (prev[secId] || []).map(i => i.id === productId ? { ...i, qty } : i) }));
  };
  const clearCart = (secId) => setCart(prev => ({ ...prev, [secId]: [] }));

  // Login
  const handleLogin = async (usuario, password, otp_code) => {
    try {
      const data = await api.login(usuario, password, otp_code);
      if (data.requires_otp) return data; // Return to LoginPage for OTP step
      setUser(data.user); toast('Bienvenido');
      if (['admin','subadmin'].includes(data.user.rol)) nav('admin');
      else nav('landing');
      return data;
    } catch (e) { toast(e.message, 'error'); throw e; }
  };
  const handleLogout = () => { api.logout(); setUser(null); nav('landing'); toast('Sesión cerrada'); };

  // Price helper
  const getPrice = (base, lista, pid) => {
    if (!lista) return Number(base) || 0;
    const pfMap = {};
    preciosFijos.forEach(pf => { pfMap[`${pf.producto_id}_${pf.lista_precio_id}`] = pf.precio_fijo; });
    const k = `${pid}_${lista.id}`;
    if (pfMap[k] != null && pfMap[k] > 0) return Number(pfMap[k]);
    return Math.round((Number(base) || 0) * (lista.multiplicador || 1) * 100) / 100;
  };
  const userLista = useMemo(() => user?.lista_precio_id ? listas.find(l => l.id === user.lista_precio_id) : null, [user, listas]);

  const isAdmin = user && ['admin','subadmin'].includes(user.rol);

  // Context value
  const ctx = {
    user, setUser, page, setPage: nav, loading, dark, setDark, toast,
    secciones, setSecciones, config, setConfig, design, setDesign,
    seccionActual, setSeccionActual, selectedProduct, setSelectedProduct, cart, setCart, menuItems, setMenuItems,
    redesSociales, setRedesSociales, badges, setBadges, barras, setBarras, listas, setListas,
    preciosFijos, setPreciosFijos, adminTab, setAdminTab, adminSeccion, setAdminSeccion,
    cartForSection, cartCount, addToCart, removeFromCart, updateCartQty, clearCart,
    handleLogin, handleLogout, getPrice, userLista, isAdmin, nav, fmt, fmtARS, openWA,
    testMode, setTestMode: (v) => { setTestMode(v); localStorage.setItem('gm_test', v); },
    globalSearch, setGlobalSearch, globalResults, setGlobalResults, doGlobalSearch
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>;

  // Route
  const renderPage = () => {
    switch (page) {
      case 'section': return seccionActual ? <SectionPage /> : <Landing />;
      case 'product': return selectedProduct ? <ProductDetailPage /> : <Landing />;
      case 'cart': return <CartPage />;
      case 'login': return <LoginPage />;
      case 'register': return <RegisterPage />;
      case 'admin': return isAdmin ? <AdminPanel /> : <Landing />;
      case 'account': return user ? <AccountPanel /> : <LoginPage />;
      case 'forgot': return <ForgotPasswordPage />;
      case 'info': return <InfoPage />;
      case 'favoritos': return user ? <FavoritosPage /> : <LoginPage />;
      case 'maintenance': return <MaintenancePage />;
      default: return <Landing />;
    }
  };

  return (
    <Ctx.Provider value={ctx}>
      <div className={`app${dark ? ' dark' : ''}`}>
        <Header />
        <main className="main-content">{renderPage()}</main>
        <Footer />
        <WhatsAppFloat />
        <ToastContainer />
      </div>
    </Ctx.Provider>
  );
}

// ═══════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════
function Ico({ n, s = 18, fill = false }) {
  const p = { width: s, height: s, viewBox: '0 0 24 24', fill: fill ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (n === 'sun') return <svg {...p} fill="none"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
  if (n === 'moon') return <svg {...p} fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
  if (n === 'heart') return <svg {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l7.8-7.6a5.5 5.5 0 0 0 0-7.8z" /></svg>;
  if (n === 'cart') return <svg {...p} fill="none"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>;
  if (n === 'menu') return <svg {...p} fill="none"><path d="M3 12h18M3 6h18M3 18h18" /></svg>;
  if (n === 'message') return <svg {...p} fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
  if (n === 'edit') return <svg {...p} fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
  if (n === 'trash') return <svg {...p} fill="none"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></svg>;
  if (n === 'eye') return <svg {...p} fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>;
  if (n === 'eye-off') return <svg {...p} fill="none"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.5 0-10-7-10-7a18.4 18.4 0 0 1 5.1-6M9.9 4.2A10.1 10.1 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
  if (n === 'shuffle') return <svg {...p} fill="none"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>;
  if (n === 'bell') return <svg {...p} fill="none"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
  if (n === 'plus') return <svg {...p} fill="none"><path d="M12 5v14M5 12h14" /></svg>;
  if (n === 'printer') return <svg {...p} fill="none"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>;
  if (n === 'chart') return <svg {...p} fill="none"><path d="M3 3v18h18M7 16l4-4 3 3 5-6" /></svg>;
  if (n === 'receipt') return <svg {...p} fill="none"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1V2l-2 1-2-1-2 1-2-1-2 1-2-1zM8 7h8M8 11h8M8 15h5" /></svg>;
  if (n === 'box') return <svg {...p} fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 22V12" /></svg>;
  if (n === 'users') return <svg {...p} fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></svg>;
  if (n === 'truck') return <svg {...p} fill="none"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" /></svg>;
  if (n === 'card') return <svg {...p} fill="none"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></svg>;
  if (n === 'palette') return <svg {...p} fill="none"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.3A4.2 4.2 0 0 0 22 11c0-5-4.5-9-10-9z"/></svg>;
  if (n === 'file') return <svg {...p} fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2" /></svg>;
  if (n === 'settings') return <svg {...p} fill="none"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.65 1.65 0 0 0-1.8-.3 1.65 1.65 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-1-1.5 1.65 1.65 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.65 1.65 0 0 0 .3-1.8 1.65 1.65 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.5-1 1.65 1.65 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.65 1.65 0 0 0 1.8.3H9a1.65 1.65 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 1 1.5 1.65 1.65 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.65 1.65 0 0 0-.3 1.8V9a1.65 1.65 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.5 1z" /></svg>;
  if (n === 'tag') return <svg {...p} fill="none"><path d="M20.6 13.4 12 22l-8.6-8.6a2 2 0 0 1 0-2.8L11 3h9v9a2 2 0 0 1-.4 1.4zM16 8h.01" /></svg>;
  if (n === 'ticket') return <svg {...p} fill="none"><path d="M3 7v3a2 2 0 0 1 0 4v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-4V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1zM13 6v2M13 12v2M13 18v-2" /></svg>;
  if (n === 'megaphone') return <svg {...p} fill="none"><path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1zM14 8a4 4 0 0 1 0 8M18 5a8 8 0 0 1 0 14" /></svg>;
  if (n === 'star') return <svg {...p} fill="none"><path d="M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.3 3.2L7 14.2l-5-4.8 7-.9z" /></svg>;
  if (n === 'globe') return <svg {...p} fill="none"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" /></svg>;
  if (n === 'list') return <svg {...p} fill="none"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
  if (n === 'wallet') return <svg {...p} fill="none"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z" /></svg>;
  if (n === 'clipboard') return <svg {...p} fill="none"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /></svg>;
  if (n === 'chevron-down') return <svg {...p} fill="none"><path d="m6 9 6 6 6-6" /></svg>;
  if (n === 'store') return <svg {...p} fill="none"><path d="M3 9l1.5-5h15L21 9M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16M9 21v-6h6v6" /></svg>;
  return null;
}

function HeaderSearch() {
  const { globalSearch, setGlobalSearch, doGlobalSearch, globalResults, setGlobalResults, nav, secciones } = useContext(Ctx);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // cerrar dropdown al click fuera
  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // debounce
  useEffect(() => {
    if (globalSearch.length < 2) { setGlobalResults(null); return; }
    const t = setTimeout(() => { doGlobalSearch(globalSearch); setOpen(true); }, 350);
    return () => clearTimeout(t);
  }, [globalSearch]);

  // aplanar resultados a lista corta para el dropdown
  const flat = [];
  if (globalResults?.resultados) {
    for (const r of globalResults.resultados) {
      for (const p of r.productos) flat.push({ ...p, secId: r.seccion.id, secNombre: r.seccion.nombre });
      if (flat.length >= 8) break;
    }
  }

  const goProduct = (p) => {
    setOpen(false);
    const sec = secciones.find(s => s.id === p.secId);
    if (sec) window.__secId = sec.id;
    nav('product', p);
  };

  return (
    <div className="header-search-wrap" ref={wrapRef} style={{ position: 'relative' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input className="header-search-input" placeholder="Buscar por marca, modelo o repuesto..." value={globalSearch}
        onChange={e => setGlobalSearch(e.target.value)}
        onFocus={() => { if (flat.length) setOpen(true); }}
        onKeyDown={e => { if (e.key === 'Enter') { doGlobalSearch(); setOpen(false); } if (e.key === 'Escape') setOpen(false); }} />
      {globalSearch && <button className="header-search-clear" onClick={() => { setGlobalSearch(''); setGlobalResults(null); setOpen(false); }}>✕</button>}

      {open && globalSearch.length >= 2 && (
        <div className="search-dropdown">
          {flat.length === 0 ? (
            <div className="search-dd-empty">Sin resultados para "{globalSearch}"</div>
          ) : (
            <>
              {flat.map(p => (
                <button key={`${p.secId}-${p.id}`} className="search-dd-item" onClick={() => goProduct(p)}>
                  {p.imagen ? <img src={p.imagen} alt="" /> : <div className="search-dd-noimg"><Ico n="cart" s={18} /></div>}
                  <div className="search-dd-info">
                    <div className="search-dd-name">{p.nombre || p.modelo}</div>
                    <div className="search-dd-sec">{p.secNombre}</div>
                  </div>
                  {p.precio_base > 0 && <div className="search-dd-price">{fmtARS(p.precio_oferta && p.precio_oferta < p.precio_base ? p.precio_oferta : p.precio_base)}</div>}
                </button>
              ))}
              <button className="search-dd-all" onClick={() => { doGlobalSearch(); setOpen(false); }}>Ver todos los resultados →</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TextBar({ barra }) {
  const frases = (barra.frases || '').split('|').map(s => s.trim()).filter(Boolean);
  if (!frases.length) return null;
  const styleVars = {};
  if (barra.estilo === 'custom') { styleVars['--bar-bg'] = barra.color_fondo || '#232321'; styleVars['--bar-fg'] = barra.color_texto || '#fff'; }
  const dur = `${barra.velocidad || 25}s`;
  // repetir frases para loop continuo
  const loop = [...frases, ...frases, ...frases];
  return (
    <div className={`textbar textbar-${barra.estilo || 'negro'}`} style={styleVars}>
      <div className="textbar-track" style={{ animationDuration: dur }}>
        {loop.map((f, i) => <span key={i} className="textbar-item">{f}</span>)}
      </div>
    </div>
  );
}

function Header() {
  const { user, nav, page, dark, setDark, cartCount, isAdmin, handleLogout, design, menuItems, testMode, setTestMode, badges, barras, secciones, globalSearch, setGlobalSearch, doGlobalSearch } = useContext(Ctx);
  const [mobMenu, setMobMenu] = useState(false);
  const showSearch = !['admin','login','register','forgot','maintenance'].includes(page);
  const barrasTop = (barras || []).filter(b => b.activo && b.posicion === 'top');
  const barrasSearch = (barras || []).filter(b => b.activo && b.posicion === 'search');

  return (
    <header className="header">
      {/* BARRA SUPERIOR (arriba de todo) */}
      {showSearch && barrasTop.map(b => <TextBar key={b.id} barra={b} />)}

      {/* ROW 1: logo + buscador + actions */}
      <div className="header-inner">
        <button className="header-logo" onClick={() => nav('landing')}>
          {design.logo_url ? <img src={design.logo_url} alt="" style={{ height: 46 }} /> : <span style={{ background: 'var(--primary)', color: '#fff', padding: '8px 15px', borderRadius: 10, fontSize: 19, fontWeight: 900, letterSpacing: '-0.04em' }}>K</span>}
        </button>
        {/* Buscador inline (siempre visible, al lado del logo) */}
        {showSearch && (
          <div className="header-search-inline">
            <HeaderSearch />
          </div>
        )}
        <div className="header-right">
          <button className="icon-btn desktop-only" onClick={() => setDark(!dark)} title="Modo oscuro">{dark ? <Ico n="sun" /> : <Ico n="moon" />}</button>
          {user && <button className="icon-btn desktop-only" onClick={() => nav('favoritos')} title="Favoritos"><Ico n="heart" /></button>}
          <button className="icon-btn cart-btn" onClick={() => nav('cart')} style={{ position: 'relative' }}>
            <Ico n="cart" /> {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          {user ? (
            <>
              {isAdmin && <button className="btn btn-sm btn-primary desktop-only" onClick={() => nav('admin')}>PANEL</button>}
              <button className="btn btn-sm btn-outline desktop-only" onClick={() => nav('account')}>MI CUENTA</button>
              <button className="btn btn-sm btn-outline desktop-only" onClick={handleLogout}>SALIR</button>
            </>
          ) : (
            <button className="btn btn-sm btn-warning desktop-only" onClick={() => nav('login')} style={{ background: 'var(--accent)', color: 'var(--primary-dark)', borderColor: 'var(--accent)', fontWeight: 800 }}>INGRESAR</button>
          )}
          <button className="hamburger mobile-only" onClick={() => setMobMenu(!mobMenu)}><Ico n="menu" s={20} /></button>
        </div>
      </div>

      {/* BARRA BAJO EL BUSCADOR */}
      {showSearch && barrasSearch.map(b => <TextBar key={b.id} barra={b} />)}

      {/* NAV SECCIONES (fijo, scrolleable en mobile) */}
      {showSearch && secciones.length > 0 && (
        <nav className="header-secnav">
          <button className={`secnav-item${page === 'landing' ? ' active' : ''}`} onClick={() => nav('landing')}>Inicio</button>
          {secciones.map(s => (
            <button key={s.id} className="secnav-item" onClick={() => nav('section', s.id)} style={{ '--sec-color': s.color || 'var(--primary)' }}>
              {s.nombre}{s.requiere_aprobacion ? ' 🔒' : ''}
            </button>
          ))}
        </nav>
      )}

      {/* MARQUEE de badges de confianza (si hay badges y no hay barra configurada) */}
      {badges.length > 0 && showSearch && barrasSearch.length === 0 && barrasTop.length === 0 && (
        <div className="header-marquee">
          <div className="marquee-track">
            {[...badges, ...badges, ...badges].map((b, i) => (
              <span key={i} className="marquee-item">
                <RenderIcon value={b.icono} size={14} color="#fff" />{b.texto}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MOBILE MENU */}
      {mobMenu && (
        <div className="mobile-menu" style={{ background: 'var(--bg-card)', padding: '16px 20px' }}>
          <button style={{ color: 'var(--text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setDark(!dark)}>{dark ? <Ico n="sun" s={18} /> : <Ico n="moon" s={18} />} {dark ? 'Modo claro' : 'Modo oscuro'}</button>
          {user && <button style={{ color: 'var(--text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { setMobMenu(false); nav('favoritos'); }}><span style={{ color: 'var(--danger)', display: 'inline-flex' }}><Ico n="heart" s={18} fill /></span> Favoritos</button>}
          <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          {menuItems.map(m => <a key={m.id} href={m.url || '#'} style={{ color: '#fff', fontWeight: 600, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em' }} onClick={() => setMobMenu(false)}>{m.titulo}</a>)}
          <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          {user ? (
            <>
              {isAdmin && <button style={{ color: 'var(--primary)', fontWeight: 700 }} onClick={() => { setMobMenu(false); nav('admin'); }}>Panel admin</button>}
              {isAdmin && <button style={{ color: testMode ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: 700 }} onClick={() => setTestMode(!testMode)}>{testMode ? 'Modo prueba: ON' : 'Modo prueba: OFF'}</button>}
              <button style={{ color: '#fff' }} onClick={() => { setMobMenu(false); nav('account'); }}>Mi cuenta</button>
              <button style={{ color: '#fff' }} onClick={() => { setMobMenu(false); handleLogout(); }}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <button style={{ color: 'var(--primary)', fontWeight: 700 }} onClick={() => { setMobMenu(false); nav('login'); }}>Ingresar</button>
              <button style={{ color: '#fff' }} onClick={() => { setMobMenu(false); nav('register'); }}>Registrarse</button>
            </>
          )}
        </div>
      )}
    </header>
  );
}

// ═══════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════
function Footer() {
  const { design, redesSociales, nav } = useContext(Ctx);
  const activas = redesSociales.filter(r => r.activo && r.url);
  const [infoPags, setInfoPags] = useState([]);
  useEffect(() => { api.getPaginas().then(setInfoPags).catch(() => {}); }, []);
  const labels = {
    facebook: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    instagram: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    tiktok: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
    whatsapp_canal: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
    whatsapp_grupo: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  };
  return (
    <footer className="footer" style={{ background: 'var(--bg-card)', padding: '48px 24px 32px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: 16 }}>
          {design.nombre_tienda || 'MI TIENDA'}
        </div>
        {activas.length > 0 && (
          <div className="footer-social" style={{ marginBottom: 20 }}>
            {activas.map(r => <a key={r.id} href={r.url} target="_blank" rel="noopener" style={{ color: 'rgba(255,255,255,0.6)' }}>{labels[r.tipo] || '🔗'} {r.tipo.replace('_', ' ')}</a>)}
          </div>
        )}
        {infoPags.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            {infoPags.map(p => <a key={p.id} href="#" onClick={e => { e.preventDefault(); nav('info'); }} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600 }}>{p.titulo}</a>)}
          </div>
        )}
        <div style={{ width: 40, height: 3, background: 'var(--primary)', margin: '0 auto 16px', borderRadius: 2 }} />
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{design.footer_texto || '© 2026 — Todos los derechos reservados'}</p>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════
// WHATSAPP CONTACT WIDGET (multi-agente + captura de leads)
// ═══════════════════════════════════════════════════════════
function WhatsAppFloat() {
  const { config, design, user } = useContext(Ctx);
  const [contactos, setContactos] = useState([]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null); // contacto elegido → muestra formulario
  const [form, setForm] = useState({ nombre: '', telefono: '' });

  useEffect(() => { api.getContactos().then(c => setContactos(Array.isArray(c) ? c : [])).catch(() => {}); }, []);

  // precargar datos si el cliente está logueado
  useEffect(() => {
    if (user) setForm({ nombre: user.nombre_fantasia || user.nombre || '', telefono: user.telefono || '' });
    else setForm({ nombre: '', telefono: '' });
  }, [user, sel]);

  // Fallback: si no hay contactos cargados, usar el número legacy de config
  const legacyNum = design.whatsapp_numero || config.whatsapp_flotante || config.whatsapp;
  const lista = contactos.length ? contactos : (legacyNum ? [{ id: 0, nombre: config.nombre_tienda || 'Atención', rol: 'WhatsApp', telefono: legacyNum, online: true, mensaje_default: design.whatsapp_mensaje || '' }] : []);
  if (!lista.length) return null;

  const enviar = async () => {
    if (!form.nombre.trim() || !form.telefono.trim()) return;
    // guardar lead
    api.createLead({ nombre: form.nombre, telefono: form.telefono, contacto_id: sel.id || null, contacto_nombre: sel.nombre, usuario_id: user?.id || null }).catch(() => {});
    // abrir WhatsApp con mensaje pre-armado
    const saludo = sel.mensaje_default || `Hola ${sel.nombre}, soy ${form.nombre}. Quiero hacer una consulta.`;
    window.open(waLink(sel.telefono, saludo), '_blank');
    setOpen(false); setSel(null);
  };

  return (
    <div className="wa-widget">
      {open && (
        <div className="wa-panel">
          <div className="wa-panel-head">
            <div>
              <div className="wa-panel-title">{sel ? sel.nombre : '¿Necesitás ayuda?'}</div>
              <div className="wa-panel-sub">{sel ? sel.rol : 'Elegí con quién querés hablar'}</div>
            </div>
            <button className="wa-panel-close" onClick={() => { setOpen(false); setSel(null); }}>✕</button>
          </div>
          <div className="wa-panel-body">
            {!sel ? (
              lista.map(c => (
                <button key={c.id} className="wa-contact" onClick={() => setSel(c)}>
                  <div className="wa-avatar" style={c.avatar ? { backgroundImage: `url(${c.avatar})` } : {}}>
                    {!c.avatar && (c.nombre || '?').charAt(0).toUpperCase()}
                    {c.online && <span className="wa-online" />}
                  </div>
                  <div className="wa-contact-info">
                    <div className="wa-contact-name">{c.nombre}</div>
                    <div className="wa-contact-role">{c.rol}{c.online ? ' · En línea' : ''}</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                </button>
              ))
            ) : (
              <div className="wa-form">
                <p className="wa-form-hint">{user ? 'Confirmá tus datos y te llevamos al chat:' : 'Dejanos tus datos para contactarte:'}</p>
                <input placeholder="Tu nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                <input placeholder="Tu número de WhatsApp" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} inputMode="tel" />
                <button className="wa-form-send" onClick={enviar} disabled={!form.nombre.trim() || !form.telefono.trim()}>
                  Abrir WhatsApp
                </button>
                <button className="wa-form-back" onClick={() => setSel(null)}>← Volver</button>
              </div>
            )}
          </div>
        </div>
      )}
      <button className="wa-float" onClick={() => setOpen(!open)} title="Contacto">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAINTENANCE PAGE
// ═══════════════════════════════════════════════════════════
function MaintenancePage() {
  const { nav, config } = useContext(Ctx);
  const [maint, setMaint] = useState({ mensaje: '' });
  useEffect(() => { api.getMaintenanceStatus().then(setMaint).catch(() => {}); }, []);
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h1>🔧 En mantenimiento</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>{maint.mensaje || 'Estamos trabajando en mejoras. Volvemos pronto.'}</p>
      <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={() => nav('login')}>Acceso admin</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INFO PAGE (renders paginas_info content)
// ═══════════════════════════════════════════════════════════
function InfoPage() {
  const { nav, selectedProduct: pageData } = useContext(Ctx);
  const [paginas, setPaginas] = useState([]);
  const [active, setActive] = useState(null);
  useEffect(() => {
    api.getPaginas().then(p => { setPaginas(p); if (pageData?.infoId) { const found = p.find(x => x.id === pageData.infoId); if (found) setActive(found); } else if (p.length) setActive(p[0]); }).catch(() => {});
  }, []);
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      <button onClick={() => nav('landing')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', marginBottom: 16 }}>← VOLVER</button>
      {paginas.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {paginas.map(p => <button key={p.id} className={`btn btn-sm ${active?.id === p.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActive(p)}>{p.titulo}</button>)}
        </div>
      )}
      {active ? (
        <div className="card" style={{ padding: 32, borderRadius: 20 }}>
          <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 16 }}>{active.titulo}</h2>
          <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{active.contenido}</div>
        </div>
      ) : <div className="empty-state"><h3>No hay páginas informativas</h3></div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LANDING PAGE — RXZ-style: products per section
// ═══════════════════════════════════════════════════════════
function Landing() {
  const { secciones, badges, nav, toast, design, config, addToCart, user, getPrice, userLista, globalSearch, setGlobalSearch, globalResults, setGlobalResults, doGlobalSearch } = useContext(Ctx);
  const [showPopup, setShowPopup] = useState(null);
  const [secProds, setSecProds] = useState({});
  const [sliders, setSliders] = useState([]);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [favIds, setFavIds] = useState(new Set());

  useEffect(() => {
    api.getPopups().then(p => { if (p.length) setShowPopup(p[0]); }).catch(() => {});
    api.getSlider().then(s => setSliders(s)).catch(() => {});
    if (user) api.getFavoritos().then(favs => setFavIds(new Set(favs.map(f => f.producto_id)))).catch(() => {});
    // Load first 8 products per visible section
    const visibleSecs = secciones.filter(s => s.visible !== false);
    if (visibleSecs.length === 0 && secciones.length > 0) {
      // No visible flag set — show all sections
      secciones.forEach(s => {
        api.getProductos({ seccion_id: s.id, limit: 8 }).then(data => {
          const prods = data?.productos || (Array.isArray(data) ? data : []);
          setSecProds(prev => ({ ...prev, [s.id]: prods }));
        }).catch(e => console.log('Fetch prods error:', s.nombre, e));
      });
    } else {
      visibleSecs.forEach(s => {
        api.getProductos({ seccion_id: s.id, limit: 8 }).then(data => {
          const prods = data?.productos || (Array.isArray(data) ? data : []);
          setSecProds(prev => ({ ...prev, [s.id]: prods }));
        }).catch(e => console.log('Fetch prods error:', s.nombre, e));
      });
    }
  }, [secciones]);

  // Slider auto-rotate
  useEffect(() => { if (sliders.length < 2) return; const t = setInterval(() => setSliderIdx(i => (i + 1) % sliders.length), 4000); return () => clearInterval(t); }, [sliders.length]);

  const toggleFav = async (prodId) => {
    if (!user) { nav('login'); return; }
    if (favIds.has(prodId)) { await api.removeFavorito(prodId); setFavIds(prev => { const n = new Set(prev); n.delete(prodId); return n; }); }
    else { await api.addFavorito(prodId); setFavIds(prev => new Set(prev).add(prodId)); }
  };

  // Product card component
  const ProductCard = ({ p, secId }) => {
    const precio = getPrice ? getPrice(p.precio_base, userLista, p.id) : (Number(p.precio_base) || 0);
    const tieneOferta = p.precio_oferta && p.precio_oferta > 0 && p.precio_oferta < p.precio_base;
    const descPct = tieneOferta ? Math.round((1 - p.precio_oferta / p.precio_base) * 100) : 0;
    const [notifyEmail, setNotifyEmail] = useState('');
    const [showNotify, setShowNotify] = useState(false);
    const sinStock = p.stock === 0;
    const puedeComprar = !sinStock || p.permitir_sin_stock || p.es_digital;
    return (
      <div className="kicks-card product-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Fav button */}
        <button className={`card-fav${favIds.has(p.id) ? ' active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}>
          <Ico n="heart" s={16} fill={favIds.has(p.id)} />
        </button>
        <div className="product-img-wrap" style={{ cursor: 'pointer' }} onClick={() => nav('product', p)}>
          {p.imagen
            ? <img src={p.imagen} alt="" className="product-img" loading="lazy" />
            : <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Ico n="cart" s={36} /></div>
          }
          {tieneOferta && <span className="pbadge pbadge-discount" style={{ position: 'absolute', top: 10, left: 10 }}>{descPct}% OFF</span>}
          {sinStock && !puedeComprar && <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--text-muted)', color: '#fff', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 10, fontWeight: 700 }}>Sin stock</span>}
          {p.es_digital && <span style={{ position: 'absolute', bottom: 10, left: 10, background: 'var(--purple)', color: '#fff', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 10, fontWeight: 700 }}>Digital</span>}
          {sinStock && p.permitir_sin_stock && !p.es_digital && <span style={{ position: 'absolute', bottom: 10, left: 10, background: 'var(--warning)', color: '#000', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 10, fontWeight: 700 }}>Sin stock OK</span>}
        </div>
        <div className="product-info" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="product-cat">{p.categoria || ''}</div>
          <div className="product-name" style={{ flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', cursor: 'pointer' }} onClick={() => { window.__secId = secId; nav('product', p); }}>{p.nombre || p.modelo}</div>
          <div style={{ marginBottom: 8 }}>
            {tieneOferta ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="price-old" style={{ textDecoration: 'line-through' }}>{fmtARS(p.precio_base)}</span>
                <span className="price-new" style={{ color: 'var(--danger)' }}>{fmtARS(p.precio_oferta)}</span>
              </div>
            ) : (
              precio > 0 && <span className="price-new">{fmtARS(precio)}</span>
            )}
          </div>
          {sinStock && !puedeComprar ? (
            <div>
              {showNotify ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input placeholder="Tu email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} style={{ flex: 1, fontSize: 11, padding: '6px 12px' }} />
                  <button className="btn btn-warning btn-sm" onClick={async (e) => { e.stopPropagation(); if (notifyEmail) { await api.notificarStock(p.id, notifyEmail); toast('Te avisamos cuando llegue'); setShowNotify(false); } }} style={{ whiteSpace: 'nowrap' }}>OK</button>
                </div>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setShowNotify(true); }} style={{ width: '100%' }}>
                  🔔 Avisame cuando llegue
                </button>
              )}
            </div>
          ) : addToCart && (
            <button className="btn" onClick={(e) => { e.stopPropagation(); addToCart(secId, p, 1); }}>
              Agregar
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="landing">
      {/* Popup */}
      {showPopup && (
        <div className="modal-overlay" onClick={() => setShowPopup(null)}>
          <div className="modal popup-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPopup(null)}>✕</button>
            <h3>{showPopup.titulo}</h3>
            {showPopup.imagen && <img src={showPopup.imagen} alt="" style={{ maxWidth: '100%', borderRadius: 8, margin: '12px 0' }} />}
            {showPopup.url_destino && <a href={showPopup.url_destino} target="_blank" rel="noopener" className="btn btn-primary" style={{ marginTop: 8 }}>Ver más</a>}
          </div>
        </div>
      )}

      {/* ── SLIDER BANNERS ── estilo demo con overlay de texto */}
      {sliders.length > 0 && (
        <div style={{ maxWidth: 1200, margin: '16px auto 0', padding: '0 20px' }}>
          <div className="hero-slider">
            {sliders.map((s, i) => (
              <div key={s.id} className="hero-slide" style={{ display: i === sliderIdx ? 'block' : 'none', cursor: s.url_destino ? 'pointer' : 'default' }}
                onClick={() => s.url_destino && window.open(s.url_destino, '_blank')}>
                <img src={s.imagen} alt={s.titulo || ''} className="hero-slide-img" />
                {(s.titulo || s.subtitulo) && (
                  <div className="hero-slide-overlay">
                    {s.etiqueta && <span className="hero-slide-tag">{s.etiqueta}</span>}
                    {s.titulo && <h2 className="hero-slide-title">{s.titulo}</h2>}
                    {s.subtitulo && <p className="hero-slide-sub">{s.subtitulo}</p>}
                  </div>
                )}
              </div>
            ))}
            {sliders.length > 1 && <>
              <button className="hero-slide-nav hero-slide-prev" onClick={() => setSliderIdx((sliderIdx - 1 + sliders.length) % sliders.length)}>‹</button>
              <button className="hero-slide-nav hero-slide-next" onClick={() => setSliderIdx((sliderIdx + 1) % sliders.length)}>›</button>
              <div className="hero-slide-dots">
                {sliders.map((_, i) => <button key={i} onClick={() => setSliderIdx(i)} className={`hero-slide-dot${i === sliderIdx ? ' active' : ''}`} />)}
              </div>
            </>}
          </div>
        </div>
      )}

      {/* ── HERO ── título/subtítulo (editable desde Diseño) */}
      {(design.hero_titulo || design.hero_subtitulo) && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 4px', textAlign: 'center' }}>
          {design.hero_titulo && <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>{design.hero_titulo}</h1>}
          {design.hero_subtitulo && <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>{design.hero_subtitulo}</p>}
        </div>
      )}
      {/* Search bar is now in Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px 0' }}>
        {/* Confianza cards — editable from Diseño, estilo demo */}
        <div className="confianza-row">
          {[1, 2, 3].map(n => {
            const icono = design[`confianza_${n}_icono`]; const titulo = design[`confianza_${n}_titulo`];
            if (!titulo) return null;
            return (
              <div key={n} className="confianza-card">
                <div className="confianza-icon"><RenderIcon value={icono} size={20} color="var(--text)" /></div>
                <div><div className="confianza-title">{titulo}</div><div className="confianza-sub">{design[`confianza_${n}_sub`] || ''}</div></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search results (from global header search) */}
      {globalResults && (
        <div style={{ maxWidth: 1200, margin: '20px auto', padding: '0 20px' }}>
          {globalResults.total === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No se encontraron resultados para "{globalSearch}"</p> : (
            globalResults.resultados.map(r => (
              <div key={r.seccion.id} style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12, fontWeight: 800, fontSize: 18 }}>{r.seccion.nombre} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 14 }}>({r.productos.length})</span></h3>
                <div className="product-grid">
                  {r.productos.map(p => <ProductCard key={p.id} p={p} secId={r.seccion.id} />)}
                </div>
              </div>
            ))
          )}
          <button onClick={() => setGlobalResults(null)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: 13, marginTop: 8 }}>✕ Cerrar resultados</button>
        </div>
      )}

      {/* ── OFERTAS DESTACADAS ── productos con precio_oferta */}
      {!globalResults && (() => {
        const ofertas = [];
        for (const s of secciones) {
          for (const p of (secProds[s.id] || [])) {
            if (p.precio_oferta && p.precio_oferta > 0 && p.precio_oferta < p.precio_base) ofertas.push({ ...p, _secId: s.id });
          }
        }
        if (ofertas.length === 0) return null;
        return (
          <div style={{ maxWidth: 1200, margin: '24px auto 0', padding: '0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: 'var(--danger)', color: '#fff', padding: '2px 12px', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 800 }}>OFERTAS</span>
              </h2>
            </div>
            <div className="product-grid">
              {ofertas.slice(0, 8).map(p => <ProductCard key={`of-${p.id}`} p={p} secId={p._secId} />)}
            </div>
          </div>
        );
      })()}

      {/* ── PRODUCTS PER SECTION ── */}
      {!globalResults && secciones.map(s => {
        const prods = secProds[s.id] || [];
        if (!prods.length) return null;
        return (
          <div key={s.id} style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{s.nombre}</h2>
              <button onClick={() => nav('section', s.id)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Ver todos →
              </button>
            </div>
            <div className="product-grid">
              {prods.slice(0, 8).map(p => <ProductCard key={p.id} p={p} secId={s.id} />)}
            </div>
          </div>
        );
      })}

      {/* ── BANNER PUBLICITARIO ── al pie del catálogo (config.banner_texto) */}
      {config.banner_texto && (
        <div style={{ maxWidth: 1200, margin: '32px auto 0', padding: '0 20px' }}>
          <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: 14, padding: '18px 24px', textAlign: 'center', fontWeight: 700, fontSize: 15, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
            <span>{config.banner_texto}</span>
            {config.banner_whatsapp && <a href={`https://wa.me/${config.banner_whatsapp}`} target="_blank" rel="noopener" style={{ background: '#fff', color: 'var(--primary)', padding: '8px 16px', borderRadius: 8, fontWeight: 800, textDecoration: 'none', fontSize: 13 }}>WhatsApp</a>}
          </div>
        </div>
      )}
      {/* spacer */}
      <div style={{ height: 40 }} />

      {/* GSAP reveal on product cards */}
      <ScrollTriggerInit deps={Object.values(secProds).reduce((n, a) => n + (a?.length || 0), 0)} />
    </div>
  );
}

function ScrollTriggerInit({ deps = 0 }) {
  // FIX #16: re-corre cuando cargan productos (async) y refresca ScrollTrigger
  useEffect(() => {
    const timer = setTimeout(() => {
      gsap.utils.toArray('.kicks-card').forEach(card => {
        if (card._gsapInit) return; card._gsapInit = true;
        gsap.fromTo(card, { scale: 0.82 }, {
          scale: 1, ease: 'none',
          scrollTrigger: { trigger: card, start: 'top bottom', end: 'top center', scrub: 1 }
        });
      });
      ScrollTrigger.refresh();
    }, 300);
    return () => clearTimeout(timer);
  }, [deps]);
  useEffect(() => () => ScrollTrigger.getAll().forEach(t => t.kill()), []);
  return null;
}

// ═══════════════════════════════════════════════════════════
// SECTION PAGE (with back button!)
// ═══════════════════════════════════════════════════════════
function SectionPage() {
  const { seccionActual: sec, user, nav, toast, addToCart, listas, config, getPrice, userLista, setSelectedProduct } = useContext(Ctx);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catFiltro, setCatFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  const [total, setTotal] = useState(0);
  const [promos, setPromos] = useState([]);
  const [secBadges, setSecBadges] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [dolarBlue, setDolarBlue] = useState(null);

  const esMayorista = sec?.slug === 'mayorista';
  const esDropshipping = sec?.slug === 'dropshipping';

  const loadData = async () => {
    if (!sec) return;
    try {
      const [prodData, cats, promoData, bdg, mp] = await Promise.all([
        api.getProductos({ seccion_id: sec.id, categoria: catFiltro, q: busqueda, page: pagina, limit: porPagina === 'todos' ? 100000 : porPagina }),
        api.getCategorias(sec.id),
        api.getPromocionesActivas(sec.id).catch(() => []),
        api.getBadges(sec.id).catch(() => []),
        api.getMetodosPago(sec.id).catch(() => [])
      ]);
      setProductos(prodData.productos || []); setTotal(prodData.total || 0);
      setCategorias(cats || []); setPromos(promoData || []); setSecBadges(bdg || []);
      setMetodosPago(mp || []);
      if (esMayorista) {
        api.getDolarBlue().then(d => { if (d.venta) setDolarBlue(d.venta); }).catch(() => {});
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!sec) return;
    api.trackSectionView(sec.nombre);
    loadData();
  }, [sec?.id, catFiltro, busqueda, pagina, porPagina]);


  if (!sec) return <Landing />;

  // Price with promos
  const getPrecio = (p) => {
    let precio = Number(p.precio_oferta) > 0 ? Number(p.precio_oferta) : Number(p.precio_base);
    if (esDropshipping && user?.es_revendedor && user.descuento_revendedor > 0) {
      return { original: precio, final: Math.round(precio * (1 - user.descuento_revendedor / 100)), descuento: user.descuento_revendedor, esRevendedor: true };
    }
    for (const promo of promos) {
      const aplicaProd = !promo.productos_ids || promo.productos_ids.split(',').map(Number).includes(p.id);
      const aplicaCat = !promo.categoria || promo.categoria === p.categoria;
      if (aplicaProd && aplicaCat) {
        const orig = precio;
        if (promo.tipo === 'porcentaje') precio = Math.round(precio * (1 - promo.valor / 100));
        else if (promo.tipo === 'monto_fijo') precio = Math.max(0, precio - promo.valor);
        if (precio !== orig) return { original: orig, final: precio, descuento: Math.round((1 - precio / orig) * 100), promo: promo.nombre };
      }
    }
    return { original: null, final: precio };
  };

  // Vitrina mode for mayorista
  if (esMayorista && sec.requiere_aprobacion && !user) {
    return (
      <div style={{ padding: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={() => nav('landing')} style={{ marginBottom: 16 }}>← Volver</button>
        <h2>{sec.nombre}</h2>
        <p style={{ margin: '20px 0', color: 'var(--text-secondary)' }}>Esta sección requiere aprobación para ver precios y comprar.</p>
        <div className="product-grid">
          {productos.map(p => (
            <div key={p.id} className="product-card vitrina">
              {p.imagen && <img src={p.imagen} alt="" className="product-img" />}
              <div className="product-info">
                <div className="product-name">{p.nombre || p.modelo}</div>
                <div className="product-cat">{p.categoria}</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Iniciá sesión para ver precios</p>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => nav('login')} style={{ marginTop: 20 }}>Iniciar sesión</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* KICKS back + title */}
      <button onClick={() => nav('landing')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>← VOLVER AL INICIO</button>
      <ScrollTriggerInit deps={productos.length} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.03em' }}>{sec.nombre}</h2>
          {sec.descripcion && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{sec.descripcion}</p>}
        </div>
        {esMayorista && dolarBlue && (
          <div style={{ background: 'var(--bg-card)', color: 'var(--primary)', padding: '8px 16px', borderRadius: 12, fontWeight: 800, fontSize: 14 }}>💵 USD Blue: ${fmt(dolarBlue)}</div>
        )}
      </div>

      {/* KICKS filters row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <input placeholder="¿Qué buscás?" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} style={{ flex: 1, minWidth: 200, borderRadius: 12, padding: '12px 16px', border: '2px solid #E7E7E3', fontSize: 14, fontWeight: 500 }} />
        <select value={catFiltro} onChange={e => { setCatFiltro(e.target.value); setPagina(1); }} style={{ borderRadius: 12, padding: '12px 16px', border: '2px solid var(--border)', fontWeight: 600, fontSize: 13, minWidth: 180, background: 'var(--bg-card)' }}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>


      {/* Cantidad por página */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ver:</span>
        {[50, 100, 'todos'].map(n => (
          <button key={n} onClick={() => { setPorPagina(n); setPagina(1); }} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid var(--border)', background: porPagina === n ? 'var(--primary)' : 'transparent', color: porPagina === n ? '#fff' : 'var(--text-secondary)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{n === 'todos' ? 'Todos' : n}</button>
        ))}
      </div>

      {/* Products grid */}
      <div className="product-grid">
        {productos.map(p => {
          const precio = getPrecio(p);
          const sinStock = !p.stock || p.stock <= 0;
          return (
            <div key={p.id} className={`product-card ${sinStock ? 'sin-stock' : ''}`}>
              <div className="product-img-wrap" style={{ cursor: 'pointer' }} onClick={() => { setSelectedProduct({ ...p, precioFinal: precio.final, precioOriginal: precio.original, descuentoPct: precio.descuento }); nav('product'); }}>
                {p.imagen ? <img src={p.imagen} alt="" className="product-img" /> : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 48 }}>📦</div>}
                {/* Badges */}
                <div className="product-badges">
                  {p.envio_gratis && <span className="pbadge pbadge-shipping">ENVÍO GRATIS</span>}
                  {precio.original && <span className="pbadge pbadge-discount">{precio.descuento}% OFF</span>}
                </div>
                {sinStock && <div className="sin-stock-overlay">SIN STOCK</div>}
              </div>
              <div className="product-info" style={{ cursor: 'pointer' }} onClick={() => { setSelectedProduct({ ...p, precioFinal: precio.final, precioOriginal: precio.original, descuentoPct: precio.descuento }); nav('product'); }}>
                <div className="product-cat">{p.categoria}</div>
                <div className="product-name">{p.nombre || p.modelo}</div>
                <div className="product-price">
                  {precio.original ? (
                    <><span className="price-old">{fmtARS(precio.original)}</span> <span className="price-new">{fmtARS(precio.final)}</span></>
                  ) : (
                    <span className="price-new">{fmtARS(precio.final)}</span>
                  )}
                  {precio.esRevendedor && <span style={{ fontSize: 11, color: 'var(--success)' }}> (Revendedor -{precio.descuento}%)</span>}
                  {esMayorista && dolarBlue && precio.final > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>USD {fmt(Math.round(precio.final / dolarBlue * 100) / 100)}</div>}
                </div>
                {!sinStock && (
                  <button onClick={(e) => { e.stopPropagation(); addToCart(sec.id, p, 1, precio.final); }} style={{ width: '100%', padding: '10px', marginTop: 8, background: 'var(--bg-card)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', transition: 'background 0.2s' }}>
                    AGREGAR 🛒
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {productos.length === 0 && <div className="empty-state"><h3>No hay productos</h3></div>}

      {/* Pagination */}
      {porPagina !== 'todos' && total > porPagina && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          {pagina > 1 && <button className="btn btn-outline btn-sm" onClick={() => setPagina(pagina - 1)}>← Anterior</button>}
          <span style={{ padding: '6px 12px' }}>Pág {pagina} / {Math.ceil(total / porPagina)}</span>
          {pagina < Math.ceil(total / porPagina) && <button className="btn btn-outline btn-sm" onClick={() => setPagina(pagina + 1)}>Siguiente →</button>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CART PAGE
// ═══════════════════════════════════════════════════════════
function CartPage() {
  const { secciones, user, nav, toast, cart, setCart, removeFromCart, updateCartQty, clearCart, testMode, config } = useContext(Ctx);
  const [cupon, setCupon] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState('');
  const [metodos, setMetodos] = useState([]);
  const [notas, setNotas] = useState('');
  const [envio, setEnvio] = useState({});
  const [showMixPopup, setShowMixPopup] = useState(false);
  const [avisos, setAvisos] = useState([]); // cambios detectados al abrir el carrito
  const refreshDone = useRef(false);

  // Al ABRIR el carrito: refrescar precio y stock de cada producto contra la base
  useEffect(() => {
    if (refreshDone.current) return;
    refreshDone.current = true;
    (async () => {
      const cambios = [];
      const nuevoCart = {};
      for (const [secId, items] of Object.entries(cart)) {
        if (!Array.isArray(items)) continue;
        nuevoCart[secId] = [];
        for (const it of items) {
          if (it.qty <= 0) continue;
          try {
            const prod = await api.getProducto(it.id);
            if (!prod) { cambios.push(`"${it.nombre || it.modelo}" ya no está disponible y se quitó del carrito`); continue; }
            const sinStock = !prod.permitir_sin_stock && !prod.es_digital && Number(prod.stock) < it.qty;
            const precioViejo = Number(it.precio_unitario || it.precio_base);
            const precioNuevo = Number(prod.precio_base);
            if (sinStock) {
              if (Number(prod.stock) <= 0) { cambios.push(`"${prod.nombre || prod.modelo}" se quedó sin stock y se quitó`); continue; }
              cambios.push(`"${prod.nombre || prod.modelo}": solo quedan ${prod.stock}, se ajustó la cantidad`);
              nuevoCart[secId].push({ ...it, ...prod, seccion_id: secId, qty: Number(prod.stock), precio_unitario: precioNuevo });
              continue;
            }
            if (precioViejo !== precioNuevo) cambios.push(`"${prod.nombre || prod.modelo}": el precio cambió de ${fmtARS(precioViejo)} a ${fmtARS(precioNuevo)}`);
            nuevoCart[secId].push({ ...it, ...prod, seccion_id: secId, qty: it.qty, precio_unitario: precioNuevo });
          } catch {
            nuevoCart[secId].push(it); // si falla la consulta, dejamos el item como está
          }
        }
      }
      if (cambios.length) { setCart(nuevoCart); setAvisos(cambios); }
    })();
  }, []);

  // Group cart items by section
  const seccionesConItems = secciones.filter(s => (Array.isArray(cart[s.id]) ? cart[s.id] : []).some(i => i.qty > 0));
  const _validSecIds = new Set(secciones.map(x => String(x.id)));
  const allItems = Object.entries(cart).flatMap(([secId, items]) => 
    _validSecIds.has(String(secId)) && Array.isArray(items) ? items.map(i => ({ ...i, seccion_id: Number(secId) })) : []
  ).filter(i => i.qty > 0);

  // Pop-up de carrito mixto: una vez por pedido (mientras el carrito tenga 2+ tiendas)
  useEffect(() => {
    if (seccionesConItems.length > 1 && !window.__mixPopupShown) {
      setShowMixPopup(true);
      window.__mixPopupShown = true;
    }
  }, [seccionesConItems.length]);

  useEffect(() => {
    if (seccionesConItems.length <= 1) window.__mixPopupShown = false; // reset para el próximo carrito mixto
  }, [seccionesConItems.length]);

  // Load payment methods for the first section with items
  useEffect(() => {
    if (seccionesConItems.length > 0) {
      api.getMetodosPago(seccionesConItems[0].id).then(setMetodos).catch(() => {});
    }
  }, [seccionesConItems.length]);

  if (!allItems.length) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
        <h3 style={{ fontWeight: 800, marginBottom: 12 }}>Tu carrito está vacío</h3>
        <button onClick={() => nav('landing')} className="btn btn-primary">Ver productos</button>
      </div>
    );
  }

  const subtotal = allItems.reduce((s, i) => s + (i.precio_unitario || i.precio_base) * i.qty, 0);
  const costoEnvioTotal = Object.values(envio).reduce((s, e) => s + (e?.costo || 0), 0);
  const total = Math.max(0, subtotal - descuento + costoEnvioTotal);

  // ¿Alguna sección no llega a su compra mínima? (bloquea el checkout)
  const algunaBajoMin = seccionesConItems.some(sec => {
    const ss = allItems.filter(i => i.seccion_id === sec.id).reduce((a, i) => a + (i.precio_unitario || i.precio_base) * i.qty, 0);
    const min = Number(config[`compra_minima_${sec.id}`]) || 0;
    return min > 0 && ss < min;
  });

  // Guardar como presupuesto (cliente → admin lo ve en tab presupuestos)
  const guardarPresupuesto = async () => {
    if (!user) { toast('Necesitás iniciar sesión para guardar un presupuesto', 'warning'); nav('login'); return; }
    try {
      const pedidos = seccionesConItems.map(sec => {
        const secItems = allItems.filter(i => i.seccion_id === sec.id);
        const secSubtotal = secItems.reduce((s, i) => s + (i.precio_unitario || i.precio_base) * i.qty, 0);
        return {
          seccion_id: sec.id, tipo: 'presupuesto', estado: 'pendiente', metodo_pago: metodoPago, notas,
          subtotal: secSubtotal, descuento: 0, total: secSubtotal,
          items: secItems.map(i => ({ producto_id: i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: i.nombre || i.modelo, cantidad: i.qty, precio_unitario: i.precio_unitario || i.precio_base, precio_base: i.precio_base }))
        };
      }).filter(pp => pp.items.length);
      for (const p of pedidos) await api.createPedido(p);
      // Vaciar carrito tras guardar el presupuesto
      seccionesConItems.forEach(sec => clearCart(sec.id));
      toast('¡Presupuesto guardado! Te avisaremos cuando lo revisemos.');
      nav('account');
    } catch (e) { toast(e.message, 'error'); }
  };

  // Compartir carrito: genera un LINK que precarga el carrito + texto con el detalle
  const compartirCarrito = () => {
    // Codificar items mínimos en la URL: [{s:secId, p:prodId, q:qty}]
    const payload = allItems.map(i => ({ s: i.seccion_id, p: i.id, q: i.qty }));
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const link = `${window.location.origin}${window.location.pathname}?carrito=${encoded}`;
    let txt = `🛒 *Carrito armado para vos*\n\n`;
    seccionesConItems.forEach(sec => {
      const secItems = allItems.filter(i => i.seccion_id === sec.id);
      txt += `📦 *${sec.nombre}*\n`;
      secItems.forEach(i => { txt += `• ${i.nombre || i.modelo} x${i.qty} — ${fmtARS((i.precio_unitario || i.precio_base) * i.qty)}\n`; });
      txt += '\n';
    });
    txt += `*Total: ${fmtARS(total)}*\n\n👉 Abrí este link para continuar la compra:\n${link}`;
    if (navigator.share) {
      navigator.share({ title: 'Carrito', text: txt }).catch(() => {});
    } else {
      const waNum2 = config.whatsapp_flotante || config.whatsapp || '';
      if (waNum2) window.open(`https://api.whatsapp.com/send?phone=${waNum2}&text=${encodeURIComponent(txt)}`, '_blank');
      else { navigator.clipboard.writeText(txt).then(() => toast('Link del carrito copiado')).catch(() => toast('No se pudo copiar', 'error')); }
    }
  };

  const checkout = async () => {
    if (!user) { toast('Necesitás iniciar sesión', 'warning'); nav('login'); return; }
    // Bloquear si alguna tienda no llega a su compra mínima
    const bajoMin = seccionesConItems.find(sec => {
      const ss = allItems.filter(i => i.seccion_id === sec.id).reduce((a, i) => a + (i.precio_unitario || i.precio_base) * i.qty, 0);
      const min = Number(config[`compra_minima_${sec.id}`]) || 0;
      return min > 0 && ss < min;
    });
    if (bajoMin) { toast(`No llegás al mínimo de compra en ${bajoMin.nombre}`, 'warning'); return; }
    // FIX #14: un pedido por seccion, todo transaccional (si falla uno no se crea ninguno)
    const pedidos = seccionesConItems.map(sec => {
      const secItems = allItems.filter(i => i.seccion_id === sec.id);
      const secSubtotal = secItems.reduce((s, i) => s + (i.precio_unitario || i.precio_base) * i.qty, 0);
      const secEnvio = envio[sec.id];
      return {
        seccion_id: sec.id, metodo_pago: metodoPago, notas, cupon_codigo: cupon,
        subtotal: secSubtotal, descuento: seccionesConItems.length === 1 ? descuento : 0,
        total: secSubtotal - (seccionesConItems.length === 1 ? descuento : 0) + (secEnvio?.costo || 0),
        costo_envio: secEnvio?.costo || 0, metodo_envio: secEnvio?.nombre || '', cp_destino: '',
        items: secItems.map(i => ({ producto_id: i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: i.nombre || i.modelo, cantidad: i.qty, precio_unitario: i.precio_unitario || i.precio_base, precio_base: i.precio_base }))
      };
    }).filter(pp => pp.items.length);
    try {
      await api.createPedidosMulti(pedidos, testMode);
      seccionesConItems.forEach(sec => clearCart(sec.id));
      toast('¡Pedido creado!'); nav('landing');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 700, margin: '0 auto' }}>
      <button onClick={() => nav('landing')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', marginBottom: 12 }}>← Volver</button>
      <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 4 }}>🛒 Carrito</h2>
      {testMode && <div style={{ background: 'var(--warning)', color: '#000', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 800, display: 'inline-block', marginBottom: 12 }}>🧪 MODO PRUEBA — los pedidos se marcan como test</div>}
      {showMixPopup && (
        <div className="modal-overlay" onClick={() => setShowMixPopup(false)} style={{ zIndex: 3000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ padding: '28px 24px' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🏪</div>
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 12 }}>Tenés productos de {seccionesConItems.length} tiendas</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                Cada tienda se despacha por <strong>separado</strong> desde su propio depósito y cotiza su <strong>propio envío</strong>. Vas a ver un solo total, pero vas a recibir <strong>un pedido por cada tienda</strong>. Los productos no se mezclan en un mismo envío.
              </p>
              <button className="btn btn-primary" onClick={() => setShowMixPopup(false)} style={{ width: '100%' }}>Entendido</button>
            </div>
          </div>
        </div>
      )}
      {seccionesConItems.length > 1 && <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>ℹ️ Tenés productos de {seccionesConItems.length} tiendas. Se genera un pedido separado por cada una (no se mezclan).</div>}

      {avisos.length > 0 && (
        <div style={{ background: 'var(--warning-light, rgba(245,180,60,0.12))', border: '1px solid var(--warning, #e8a13a)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>⚠️ El carrito se actualizó</div>
          {avisos.map((a, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 3 }}>• {a}</div>)}
          <button onClick={() => setAvisos([])} style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: 0 }}>Entendido</button>
        </div>
      )}

      {seccionesConItems.map(sec => {
        const secItems = allItems.filter(i => i.seccion_id === sec.id);
        const secSubtotal = secItems.reduce((s, i) => s + (i.precio_unitario || i.precio_base) * i.qty, 0);
        const gratisDesde = Number(config[`envio_gratis_desde_${sec.id}`]) || 0;
        const faltaGratis = gratisDesde > 0 ? Math.max(0, gratisDesde - secSubtotal) : 0;
        const pctGratis = gratisDesde > 0 ? Math.min(100, (secSubtotal / gratisDesde) * 100) : 0;
        const compraMinima = Number(config[`compra_minima_${sec.id}`]) || 0;
        const faltaMin = compraMinima > 0 ? Math.max(0, compraMinima - secSubtotal) : 0;
        const pctMin = compraMinima > 0 ? Math.min(100, (secSubtotal / compraMinima) * 100) : 0;
        return (
          <div key={sec.id} style={{ marginBottom: 24 }}>
            <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>{sec.nombre} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>({secItems.length} items)</span></h3>
            {/* Barra COMPRA MÍNIMA — bloquea el checkout hasta llegar */}
            {compraMinima > 0 && faltaMin > 0 && (
              <div style={{ marginBottom: 8, background: 'var(--danger-light, rgba(231,64,64,0.08))', border: '1px solid var(--danger)', borderRadius: 10, padding: '8px 12px' }}>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${pctMin}%`, background: 'linear-gradient(90deg, var(--danger), var(--accent))', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>
                  🔒 Compra mínima {fmtARS(compraMinima)} — te faltan {fmtARS(faltaMin)} para poder comprar
                </div>
              </div>
            )}
            {compraMinima > 0 && faltaMin === 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>✓ Llegaste al mínimo de compra</div>
            )}
            {/* Barra ENVÍO GRATIS — se muestra una vez alcanzado el mínimo (o si no hay mínimo) */}
            {gratisDesde > 0 && faltaMin === 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pctGratis}%`, background: faltaGratis === 0 ? 'var(--success)' : 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: 4, transition: 'width 0.4s' }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: faltaGratis === 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {faltaGratis === 0 ? '🎉 ¡Envío gratis conseguido!' : `🚚 Te faltan ${fmtARS(faltaGratis)} para envío gratis`}
                </div>
              </div>
            )}
            {secItems.map(i => (
              <div key={i.id} className="card" style={{ padding: 12, marginBottom: 6, display: 'flex', gap: 10, alignItems: 'center', borderRadius: 12 }}>
                {i.imagen ? <img src={i.imagen} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📱</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{i.nombre || i.modelo}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.categoria} — {fmtARS(i.precio_unitario || i.precio_base)} c/u</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <button onClick={() => updateCartQty(sec.id, i.id, i.qty - 1)} style={{ background: 'none', border: 'none', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}>−</button>
                  <input type="number" min="1" value={i.qty} onChange={e => { const v = parseInt(e.target.value) || 1; updateCartQty(sec.id, i.id, Math.max(1, v)); }} style={{ width: 48, padding: '6px 4px', fontWeight: 800, fontSize: 13, textAlign: 'center', border: 'none', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderRadius: 0, background: 'transparent' }} />
                  <button onClick={() => updateCartQty(sec.id, i.id, i.qty + 1)} style={{ background: 'none', border: 'none', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}>+</button>
                </div>
                <span style={{ fontWeight: 800, minWidth: 70, textAlign: 'right', fontSize: 14 }}>{fmtARS((i.precio_unitario || i.precio_base) * i.qty)}</span>
                <button onClick={() => removeFromCart(sec.id, i.id)} style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 8, width: 30, height: 30, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            ))}
            {/* Shipping for this section */}
            <AndreaniCalculator seccionId={sec.id} peso={0.5} volumen={0.001} onSelect={e => setEnvio(prev => ({ ...prev, [sec.id]: e }))} />
            {envio[sec.id] && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginTop: 4 }}>✓ {envio[sec.id].nombre}: {fmtARS(envio[sec.id].costo)}</div>}
            {/* Subtotal de esta tienda */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Subtotal {sec.nombre}</span>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{fmtARS(secSubtotal + (envio[sec.id]?.costo || 0))}</span>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input placeholder="Código de cupón" value={cupon} onChange={e => setCupon(e.target.value.toUpperCase())} style={{ flex: 1, borderRadius: 10, padding: '10px 14px', border: '1.5px solid var(--border)' }} />
        <button onClick={async () => { try { const r = await api.validarCupon(cupon, seccionesConItems[0]?.id, subtotal, metodoPago, allItems); setDescuento(r.descuento); toast(`Cupón: -${fmtARS(r.descuento)}`); } catch (e) { toast(e.message, 'error'); } }}
          className="btn btn-outline" style={{ fontWeight: 700 }}>APLICAR</button>
      </div>

      {metodos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Método de pago</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {metodos.map(m => (
              <button key={m.id} onClick={() => setMetodoPago(m.nombre)}
                style={{ padding: '8px 14px', borderRadius: 10, border: metodoPago === m.nombre ? '2px solid var(--primary)' : '1.5px solid var(--border)', background: metodoPago === m.nombre ? 'var(--primary-light)' : 'var(--bg-card)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                <RenderIcon value={m.icono} size={14} /> {m.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea placeholder="Notas (opcional)" value={notas} onChange={e => setNotas(e.target.value)} rows={2} style={{ width: '100%', borderRadius: 10, padding: '10px 14px', border: '1.5px solid var(--border)', marginTop: 16 }} />

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginTop: 16 }}>
        {seccionesConItems.length > 1 && (
          <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
            {seccionesConItems.map(sec => {
              const ss = allItems.filter(i => i.seccion_id === sec.id).reduce((a, i) => a + (i.precio_unitario || i.precio_base) * i.qty, 0);
              return <div key={sec.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}><span style={{ color: 'var(--text-secondary)' }}>Subtotal {sec.nombre}</span><span style={{ fontWeight: 700 }}>{fmtARS(ss + (envio[sec.id]?.costo || 0))}</span></div>;
            })}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}><span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span style={{ fontWeight: 700 }}>{fmtARS(subtotal)}</span></div>
        {costoEnvioTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}><span style={{ color: 'var(--text-muted)' }}>Envío</span><span style={{ fontWeight: 700 }}>{fmtARS(costoEnvioTotal)}</span></div>}
        {descuento > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}><span style={{ color: 'var(--success)' }}>Descuento</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>-{fmtARS(descuento)}</span></div>}
        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22 }}><span style={{ fontWeight: 700 }}>Total</span><span style={{ fontWeight: 900 }}>{fmtARS(total)}</span></div>
      </div>

      <button onClick={checkout} disabled={algunaBajoMin} style={{ width: '100%', marginTop: 16, padding: 14, background: algunaBajoMin ? 'var(--border)' : 'var(--primary)', color: algunaBajoMin ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: algunaBajoMin ? 'not-allowed' : 'pointer' }}>
        {algunaBajoMin ? '🔒 No llegás a la compra mínima' : (testMode ? '🧪 CONFIRMAR PEDIDO (PRUEBA)' : 'CONFIRMAR PEDIDO')}
      </button>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={guardarPresupuesto} style={{ flex: 1, padding: 12, background: 'var(--bg-card)', border: '1.5px solid var(--primary)', color: 'var(--primary)', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          📋 GUARDAR COMO PRESUPUESTO
        </button>
        <button onClick={compartirCarrito} style={{ flex: 1, padding: 12, background: 'var(--bg-card)', border: '1.5px solid var(--success)', color: 'var(--success)', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          📤 COMPARTIR CARRITO
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRODUCT DETAIL PAGE
// ═══════════════════════════════════════════════════════════
function ProductDetailPage() {
  const { selectedProduct: p, seccionActual: navSec, secciones, nav, toast, addToCart, config, user, design } = useContext(Ctx);
  // Sección REAL del producto (no la de navegación) — evita mostrar Local cuando el producto es de Deposito
  const sec = (p?.seccion_id && secciones.find(s => String(s.id) === String(p.seccion_id))) || navSec;
  const [prodBadges, setProdBadges] = useState([]);
  useEffect(() => { if (sec?.id) api.getBadges(sec.id).then(setProdBadges).catch(() => {}); }, [sec?.id]);
  const [qty, setQty] = useState(1);
  const [metodosPago, setMetodosPago] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [selVariante, setSelVariante] = useState(null);
  const [mainImg, setMainImg] = useState('');
  const [isFav, setIsFav] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [showNotify, setShowNotify] = useState(false);

  useEffect(() => {
    if (!p) return;
    setMainImg(p.imagen || '');
    if (sec) api.getMetodosPago(sec.id).then(setMetodosPago).catch(() => {});
    api.getProductoImagenes(p.id).then(imgs => setGallery(imgs)).catch(() => {});
    api.getVariantes(p.id).then(v => setVariantes(v)).catch(() => {});
    if (user) api.getFavoritos().then(favs => setIsFav(favs.some(f => f.producto_id === p.id))).catch(() => {});
  }, [p?.id, sec?.id]);

  if (!p) return <Landing />;

  const precioBase = Number(p.precio_base) || 0;
  const precioFinal = (p.precioFinal || precioBase) + (selVariante ? Number(selVariante.precio_extra) || 0 : 0);
  const precioOriginal = p.precioOriginal;
  const sinStock = !p.stock || p.stock <= 0;
  const allImages = [p.imagen, ...gallery.map(g => g.url)].filter(Boolean);

  const preciosMetodo = metodosPago.filter(m => m.activo).map(m => {
    const descStr = (config[`descuento_${m.nombre.toLowerCase().replace(/\s+/g, '_')}`] || '').trim();
    const desc = parseFloat(descStr);
    if (!desc || isNaN(desc)) return null;
    return { nombre: m.nombre, icono: m.icono, precio: Math.round(precioFinal * (1 - desc / 100)), descuento: desc };
  }).filter(Boolean);

  const toggleFav = async () => {
    if (!user) { nav('login'); return; }
    if (isFav) { await api.removeFavorito(p.id); setIsFav(false); toast('Eliminado de favoritos'); }
    else { await api.addFavorito(p.id); setIsFav(true); toast('Agregado a favoritos'); }
  };

  const waNum = design.whatsapp_numero || config.whatsapp_flotante || config.whatsapp;
  const shareWA = () => {
    const txt = `Hola, consulto por: *${p.nombre || p.modelo}* — ${fmtARS(precioFinal)}`;
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(txt)}`, '_blank');
  };

  return (
    <div className="pdp">
      <button className="pdp-back" onClick={() => { if (window._navHist && window._navHist.length) window.history.back(); else nav('section', sec?.id); }}>← Volver</button>

      <div className="pdp-crumbs">
        <span onClick={() => nav('landing')}>Inicio</span> / <span onClick={() => nav('section', sec?.id)}>{sec?.nombre}</span> {p.categoria && <> / {p.categoria}</>} / <span className="pdp-crumb-current">{p.nombre || p.modelo}</span>
      </div>

      <div className="pdp-grid">
        {/* Image gallery */}
        <div className="pdp-gallery">
          <div className="pdp-main-img">
            {p.envio_gratis && <span className="pdp-free-badge">ENVÍO GRATIS</span>}
            <button className={`card-fav pdp-fav${isFav ? ' active' : ''}`} onClick={toggleFav}><Ico n="heart" s={18} fill={isFav} /></button>
            {mainImg ? <img src={mainImg} alt={p.nombre || ''} /> : <div className="pdp-noimg"><Ico n="cart" s={64} /></div>}
          </div>
          {allImages.length > 1 && (
            <div className="pdp-thumbs">
              {allImages.map((img, i) => (
                <img key={i} src={img} alt="" onClick={() => setMainImg(img)} className={mainImg === img ? 'active' : ''} />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pdp-info">
          <div className="pdp-cat">{p.categoria}</div>
          <h1 className="pdp-title">{p.nombre || p.modelo}</h1>

          <div className="pdp-price">
            {precioOriginal ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span className="pdp-price-old">{fmtARS(precioOriginal)}</span>
                <span className="pdp-price-new">{fmtARS(precioFinal)}</span>
              </div>
            ) : (
              <span className="pdp-price-new">{fmtARS(precioFinal)}</span>
            )}
          </div>

          {preciosMetodo.length > 0 && (
            <div className="pdp-payments">
              {preciosMetodo.map(pm => (
                <div key={pm.nombre} className="pdp-payment-row">
                  <RenderIcon value={pm.icono} size={16} /><strong>{fmtARS(pm.precio)}</strong>
                  <span className="pdp-payment-desc">con {pm.nombre} −{pm.descuento}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Variantes */}
          {variantes.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Variantes:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {variantes.map(v => (
                  <button key={v.id} onClick={() => setSelVariante(selVariante?.id === v.id ? null : v)}
                    className={`pdp-variant${selVariante?.id === v.id ? ' active' : ''}`}>
                    {v.nombre}: {v.valor} {v.precio_extra > 0 && `(+${fmtARS(v.precio_extra)})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {p.descripcion && <p className="pdp-desc">{p.descripcion}</p>}
          {p.compatibilidad && <p className="pdp-compat">Compatible: {p.compatibilidad}</p>}

          {sinStock ? (
            <div>
              <div className="pdp-nostock">SIN STOCK</div>
              {showNotify ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input placeholder="Tu email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={async () => { if (notifyEmail) { await api.notificarStock(p.id, notifyEmail); toast('Te avisamos cuando llegue'); setShowNotify(false); } }}>Avisar</button>
                </div>
              ) : (
                <button className="btn btn-outline" onClick={() => setShowNotify(true)} style={{ width: '100%' }}>🔔 Avisame cuando llegue</button>
              )}
            </div>
          ) : (
            <div className="pdp-buy">
              <div className="pdp-qty">
                <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: 54, textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 800, fontSize: 16, padding: '12px 4px' }} />
                <button onClick={() => setQty(qty + 1)}>+</button>
              </div>
              <button className="btn pdp-add" onClick={() => { addToCart(sec?.id || p.seccion_id, p, qty, precioFinal); toast('Agregado al carrito'); }}>
                AGREGAR AL CARRITO
              </button>
            </div>
          )}

          {waNum && <button className="pdp-wa" onClick={shareWA}><Ico n="message" s={16} /> Consultar por WhatsApp</button>}

          {p.sku && <p className="pdp-sku">SKU: {p.sku}</p>}
          {p.notas && <div className="pdp-note">📝 {p.notas}</div>}

          {/* Carteles de confianza */}
          {prodBadges.length > 0 && (
            <div className="pdp-badges">
              {prodBadges.map(b => (
                <div key={b.id} className="pdp-badge"><RenderIcon value={b.icono} size={16} /><span>{b.texto}</span></div>
              ))}
            </div>
          )}
          {/* Andreani + custom shipping calculator */}
          <AndreaniCalculator seccionId={sec?.id} peso={p.peso} volumen={(p.alto * p.ancho * p.largo) / 1000000 || 0.001}
            onSelect={(envio) => toast(`${envio.nombre}: ${fmtARS(envio.costo)}`)} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOGIN / REGISTER / ACCOUNT
// ═══════════════════════════════════════════════════════════
function LoginPage() {
  const { handleLogin, nav, design, toast } = useContext(Ctx);
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const doLogin = async (code) => {
    try {
      const r = await handleLogin(form.usuario, form.password, code || undefined);
      if (r && r.requires_otp) { setOtpStep(true); toast('Código enviado a tu email'); }
    } catch (e) { /* handleLogin already toasts */ }
  };

  return (
    <div style={{ maxWidth: 420, margin: '48px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: 32, borderRadius: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, color: 'var(--warning)', fontWeight: 900 }}>
            {design.logo_url ? <img src={design.logo_url} alt="" style={{ height: 32, borderRadius: 8 }} /> : 'K'}
          </div>
          <h2 style={{ fontWeight: 900, fontSize: 22 }}>{otpStep ? 'Verificación' : 'Iniciar sesión'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{otpStep ? 'Ingresá el código que recibiste por email' : 'Ingresá tus datos para acceder'}</p>
        </div>
        {otpStep ? (
          <>
            <div className="form-group"><label className="form-label">CÓDIGO DE VERIFICACIÓN</label>
              <input value={otpCode} onChange={e => setOtpCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin(otpCode)} placeholder="123456" style={{ textAlign: 'center', fontSize: 24, letterSpacing: '0.3em' }} maxLength={6} autoFocus />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: 14, fontSize: 14, borderRadius: 12, background: '#1a1a1a', borderColor: '#1a1a1a' }} onClick={() => doLogin(otpCode)}>VERIFICAR</button>
            <button onClick={() => { setOtpStep(false); setOtpCode(''); }} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>← Volver</button>
          </>
        ) : (
          <>
            <div className="form-group"><label className="form-label">USUARIO</label><input value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} placeholder="Tu usuario" /></div>
            <div className="form-group"><label className="form-label">CONTRASEÑA</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="Mín 8 chars, 1 mayúscula, 1 número" style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>{showPass ? <Ico n="eye-off" s={16} /> : <Ico n="eye" s={16} />}</button>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: 14, fontSize: 14, borderRadius: 12, background: '#1a1a1a', borderColor: '#1a1a1a' }} onClick={() => doLogin()}>INGRESAR</button>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>¿No tenés cuenta? <a href="#" onClick={e => { e.preventDefault(); nav('register'); }} style={{ color: 'var(--primary)', fontWeight: 700 }}>Registrate</a></p>
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 13 }}><a href="#" onClick={e => { e.preventDefault(); nav('forgot'); }} style={{ color: 'var(--text-muted)' }}>¿Olvidaste tu contraseña?</a></p>
          </>
        )}
      </div>
    </div>
  );
}

function RegisterPage() {
  const { nav, toast } = useContext(Ctx);
  const [form, setForm] = useState({ nombre: '', usuario: '', password: '', telefono: '', email: '', nombre_fantasia: '' });
  const submit = async () => {
    try { await api.register(form); toast('Registro enviado. Esperá la aprobación del admin.'); nav('login'); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div style={{ maxWidth: 420, margin: '48px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: 32, borderRadius: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.03em' }}>Crear cuenta</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Completá tus datos para registrarte</p>
        </div>
        <div className="form-group"><label className="form-label">NOMBRE COMPLETO *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">USUARIO *</label><input value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">CONTRASEÑA *</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">TELÉFONO / WHATSAPP</label><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">EMAIL</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">NOMBRE DE FANTASÍA</label><input value={form.nombre_fantasia} onChange={e => setForm({ ...form, nombre_fantasia: e.target.value })} placeholder="Opcional" /></div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 12, background: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={submit}>CREAR CUENTA</button>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>¿Ya tenés cuenta? <a href="#" onClick={e => { e.preventDefault(); nav('login'); }} style={{ color: 'var(--primary)', fontWeight: 700 }}>Iniciá sesión</a></p>
      </div>
    </div>
  );
}

// ═══ FORGOT PASSWORD PAGE ═══
function ForgotPasswordPage() {
  const { nav, toast } = useContext(Ctx);
  const [step, setStep] = useState(1);
  const [usuario, setUsuario] = useState('');
  const [codigo, setCodigo] = useState('');
  const [newPass, setNewPass] = useState('');
  const [result, setResult] = useState(null);

  const requestCode = async () => {
    try {
      const r = await api.forgotPassword(usuario);
      setResult(r); setStep(2);
      toast(r.mensaje || 'Código generado');
    } catch (e) { toast(e.message, 'error'); }
  };
  const resetPass = async () => {
    try {
      await api.resetPassword(codigo, newPass);
      toast('Contraseña cambiada. Iniciá sesión.'); nav('login');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ maxWidth: 420, margin: '48px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: 32, borderRadius: 20 }}>
        <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 16 }}>Recuperar contraseña</h2>
        {step === 1 ? (
          <>
            <div className="form-group"><label className="form-label">Usuario o email</label><input value={usuario} onChange={e => setUsuario(e.target.value)} onKeyDown={e => e.key === 'Enter' && requestCode()} /></div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={requestCode}>Enviar código</button>
          </>
        ) : (
          <>
            {result?.codigo && <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: 12, borderRadius: 8, marginBottom: 12, textAlign: 'center' }}><div style={{ fontSize: 11, fontWeight: 600 }}>Tu código de recuperación:</div><div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.05em', userSelect: 'all' }}>{result.codigo}</div></div>}
            {result?.telefono && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>También por WhatsApp: <a href={`https://wa.me/${result.telefono}?text=Tu código de recuperación: ${result.codigo}`} target="_blank" rel="noopener" style={{ color: '#25d366', fontWeight: 700 }}>Enviar por WA</a></p>}
            <div className="form-group"><label className="form-label">Código</label><input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="KICKS-XXXXXX" /></div>
            <div className="form-group"><label className="form-label">Nueva contraseña</label><input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mín 8 chars, 1 mayúscula, 1 número" /></div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={resetPass}>Cambiar contraseña</button>
          </>
        )}
        <p style={{ textAlign: 'center', marginTop: 16 }}><a href="#" onClick={e => { e.preventDefault(); nav('login'); }} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>← Volver al login</a></p>
      </div>
    </div>
  );
}

function AccountPanel() {
  const { user, setUser, toast, nav, handleLogout, userLista, config } = useContext(Ctx);
  const [f, setF] = useState({ nombre: user?.nombre || '', telefono: user?.telefono || '', email: user?.email || '', direccion: user?.direccion || '', nombre_fantasia: user?.nombre_fantasia || '', password: '' });
  const [saving, setSaving] = useState(false);
  const [accTab, setAccTab] = useState('datos');
  const [misPedidos, setMisPedidos] = useState([]);
  const [misPresup, setMisPresup] = useState([]);
  const [viewDetail, setViewDetail] = useState(null);

  useEffect(() => {
    if (accTab === 'pedidos') api.getPedidos({ tipo: 'pedido' }).then(setMisPedidos).catch(() => {});
    if (accTab === 'presupuestos') api.getPedidos({ tipo: 'presupuesto' }).then(setMisPresup).catch(() => {});
  }, [accTab]);

  const loadDetail = async (id) => {
    try { const d = await api.getPedido(id); setViewDetail(d); } catch (e) { toast(e.message, 'error'); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = { ...f }; if (!data.password) delete data.password;
      const updated = await api.updateMe(data);
      setUser(updated); toast('Datos actualizados');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const estadoColor = { pendiente: 'var(--accent)', preparando: 'var(--primary)', listo: 'var(--success)', entregado: '#666', cancelado: 'var(--danger)' };

  return (
    <div style={{ maxWidth: 600, margin: '48px auto', padding: '0 16px' }}>
      <button onClick={() => nav('landing')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', marginBottom: 16 }}>← VOLVER</button>
      <h2 style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.03em', marginBottom: 20 }}>Mi cuenta</h2>

      <div style={{ background: 'var(--primary-dark)', borderRadius: 20, padding: 20, marginBottom: 24, color: '#fff' }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{user.nombre} {user.nombre_fantasia && <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>({user.nombre_fantasia})</span>}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>@{user.usuario} • {user.email} • {user.telefono}</div>
        {userLista && <div style={{ marginTop: 8 }}><span style={{ background: userLista.color || 'var(--primary)', color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{userLista.nombre}</span></div>}
      </div>

      {/* Tabs: Datos / Pedidos / Presupuestos */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[{ id: 'datos', label: '👤 Datos' }, { id: 'pedidos', label: '📦 Mis pedidos' }, { id: 'presupuestos', label: '📋 Presupuestos' }].map(t => (
          <button key={t.id} onClick={() => setAccTab(t.id)} style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: accTab === t.id ? '2px solid var(--primary)' : '1.5px solid var(--border)', background: accTab === t.id ? 'var(--primary-light)' : 'var(--bg-card)', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: 'var(--text)' }}>{t.label}</button>
        ))}
      </div>

      {accTab === 'datos' && (
        <div className="card" style={{ padding: 24, borderRadius: 20 }}>
          <div className="form-group"><label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>NOMBRE</label><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></div>
          <div className="form-group"><label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>TELÉFONO</label><input value={f.telefono} onChange={e => setF({ ...f, telefono: e.target.value })} /></div>
          <div className="form-group"><label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>EMAIL</label><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          <div className="form-group"><label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>DIRECCIÓN</label><input value={f.direccion} onChange={e => setF({ ...f, direccion: e.target.value })} /></div>
          <div className="form-group"><label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>NOMBRE DE FANTASÍA</label><input value={f.nombre_fantasia} onChange={e => setF({ ...f, nombre_fantasia: e.target.value })} /></div>
          <div className="form-group"><label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>NUEVA CONTRASEÑA</label><input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="Vacío = no cambiar" /></div>
          <button onClick={save} disabled={saving} style={{ width: '100%', marginTop: 16, padding: 14, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer' }}>{saving ? 'Guardando...' : 'GUARDAR CAMBIOS'}</button>
          <button onClick={handleLogout} style={{ width: '100%', marginTop: 8, padding: 14, background: 'none', color: 'var(--danger)', border: '2px solid #E74040', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>CERRAR SESIÓN</button>
        </div>
      )}

      {accTab === 'pedidos' && (
        <div>
          {misPedidos.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No tenés pedidos todavía</p> : misPedidos.map(o => (
            <div key={o.id} className="card" onClick={() => loadDetail(o.id)} style={{ padding: 14, marginBottom: 8, borderRadius: 14, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Pedido #{o.id}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString('es-AR')} • {o.seccion_nombre}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{fmtARS(o.total)}</div>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: estadoColor[o.estado] || '#999', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>{o.estado}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {accTab === 'presupuestos' && (
        <div>
          {misPresup.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No tenés presupuestos</p> : misPresup.map(o => (
            <div key={o.id} className="card" onClick={() => loadDetail(o.id)} style={{ padding: 14, marginBottom: 8, borderRadius: 14, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Presupuesto #{o.id}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString('es-AR')} • {o.seccion_nombre}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{fmtARS(o.total)}</div>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: o.estado === 'pendiente' ? 'var(--accent)' : 'var(--success)', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>{o.tipo === 'presupuesto' ? 'presupuesto' : o.estado}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalle del pedido/presupuesto del cliente */}
      {viewDetail && (
        <div className="modal-overlay" onClick={() => setViewDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header"><span className="modal-title">{viewDetail.tipo === 'presupuesto' ? 'Presupuesto' : 'Pedido'} #{viewDetail.id}</span><button className="modal-close" onClick={() => setViewDetail(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{new Date(viewDetail.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                Estado: <span style={{ background: estadoColor[viewDetail.estado] || '#999', color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 11 }}>{viewDetail.estado}</span>
                {viewDetail.seccion_nombre && <span style={{ background: viewDetail.seccion_color || 'var(--border)', color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 11 }}>{viewDetail.seccion_nombre}</span>}
              </div>
              {(viewDetail.items || []).map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                  <span>{it.nombre_producto} <span style={{ color: 'var(--text-muted)' }}>x{it.cantidad}</span></span>
                  <span style={{ fontWeight: 700 }}>{fmtARS(it.precio_unitario * it.cantidad)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontWeight: 900, fontSize: 18 }}>
                <span>Total</span><span>{fmtARS(viewDetail.total)}</span>
              </div>
              {viewDetail.notas && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', background: 'var(--border-light)', padding: 10, borderRadius: 8 }}>📝 {viewDetail.notas}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN PANEL (with sidebar!)
// ═══════════════════════════════════════════════════════════
function AdminPanel() {
  const { adminTab, setAdminTab, secciones, adminSeccion, setAdminSeccion, nav, user } = useContext(Ctx);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({}); // acordeón: qué grupos están expandidos

  // Permisos: admin ve todo; subadmin solo lo que tenga.
  const esAdmin = user?.rol === 'admin';
  const misPermisos = esAdmin ? null : String(user?.permisos || '').split(',').filter(Boolean);
  const puede = (perm) => esAdmin || (misPermisos || []).includes(perm);

  // Mapa tab → permiso requerido
  const tabPerm = {
    dashboard: 'stats',
    pedidos: 'pedidos', presupuestos: 'pedidos', leads: 'stats', reglas_compra: 'pedidos',
    cupones: 'config', promociones: 'config', venta_manual: 'pedidos', ordenes_compra: 'pedidos',
    productos: 'productos', listas: 'listas',
    usuarios: 'usuarios',
    envios: 'config', metodos_pago: 'config',
    diseno: 'config', barras: 'config', menu: 'config', paginas: 'config', contactos: 'config',
    general: 'config',
  };

  // ── ESTRUCTURA JERÁRQUICA (acordeón) ──
  // Cada grupo: { id, label, icon, items: [{ id (tab), label }] }
  // Grupos de 1 solo item van directo (sin acordeón).
  const nav_tree = [
    { id: 'inicio', label: 'Inicio', icon: 'chart', single: 'dashboard' },
    { id: 'ventas', label: 'Ventas', icon: 'receipt', items: [
      { id: 'pedidos', label: 'Pedidos' },
      { id: 'presupuestos', label: 'Presupuestos' },
      { id: 'venta_manual', label: 'Agregar venta' },
      { id: 'ordenes_compra', label: 'Órdenes de compra' },
      { id: 'reglas_compra', label: 'Reglas de compra' },
      { id: 'cupones', label: 'Cupones' },
      { id: 'promociones', label: 'Promociones' },
      { id: 'leads', label: 'Leads WhatsApp' },
    ]},
    { id: 'catalogo', label: 'Catálogo', icon: 'box', items: [
      { id: 'productos', label: 'Productos' },
      { id: 'listas', label: 'Listas de precio' },
    ]},
    { id: 'clientes', label: 'Clientes', icon: 'users', single: 'usuarios' },
    { id: 'envios_grp', label: 'Envíos', icon: 'truck', single: 'envios' },
    { id: 'pagos', label: 'Pagos', icon: 'card', single: 'metodos_pago' },
    { id: 'diseno_grp', label: 'Diseño', icon: 'palette', single: 'diseno' },
    { id: 'contenido', label: 'Contenido', icon: 'file', items: [
      { id: 'barras', label: 'Barras de texto' },
      { id: 'menu', label: 'Menú' },
      { id: 'paginas', label: 'Páginas' },
      { id: 'contactos', label: 'Contactos WhatsApp' },
    ]},
    { id: 'general_grp', label: 'General', icon: 'settings', single: 'general' },
  ];

  // Filtrar por permisos
  const treeFiltered = nav_tree.map(g => {
    if (g.single) return puede(tabPerm[g.single]) ? g : null;
    const items = g.items.filter(it => puede(tabPerm[it.id]));
    return items.length ? { ...g, items } : null;
  }).filter(Boolean);

  // Todos los tabs disponibles (para validar el activo)
  const allTabs = treeFiltered.flatMap(g => g.single ? [g.single] : g.items.map(it => it.id));

  // Si el tab activo no está permitido, saltar al primero
  useEffect(() => {
    if (allTabs.length && !allTabs.includes(adminTab)) setAdminTab(allTabs[0]);
  }, [adminTab, allTabs.length]);

  // Auto-abrir el grupo que contiene el tab activo
  useEffect(() => {
    const grp = treeFiltered.find(g => !g.single && g.items.some(it => it.id === adminTab));
    if (grp) setOpenGroups(prev => ({ ...prev, [grp.id]: true }));
  }, [adminTab]);

  const toggleGroup = (gid) => setOpenGroups(prev => ({ ...prev, [gid]: !prev[gid] }));
  const goTab = (tid) => { setAdminTab(tid); setSidebarOpen(false); };

  // Label del tab activo (para la barra mobile)
  const activeLabel = (() => {
    for (const g of treeFiltered) {
      if (g.single === adminTab) return g.label;
      if (g.items) { const it = g.items.find(x => x.id === adminTab); if (it) return `${g.label} · ${it.label}`; }
    }
    return 'Panel';
  })();

  return (
    <div className="admin-layout">
      {/* Mobile hamburger bar */}
      <div className="admin-mobile-bar">
        <button className="admin-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '✕' : '☰'} <span style={{ fontSize: 14, fontWeight: 700 }}>Panel Admin</span>
        </button>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{activeLabel}</span>
      </div>

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="btn btn-outline btn-sm" onClick={() => nav('landing')} style={{ marginBottom: 12, width: '100%' }}>← Volver a tienda</button>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Panel Admin</h3>
        <select value={adminSeccion} onChange={e => setAdminSeccion(e.target.value)} style={{ width: '100%', marginBottom: 12, padding: 6 }}>
          <option value="all">Todas las secciones</option>
          {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <nav className="admin-nav">
          {treeFiltered.map(g => {
            // Grupo de 1 item (directo)
            if (g.single) {
              return (
                <button key={g.id} className={`admin-nav-item ${adminTab === g.single ? 'active' : ''}`} onClick={() => goTab(g.single)}>
                  <span style={{ marginRight: 10, display: 'inline-flex' }}><Ico n={g.icon} s={17} /></span>{g.label}
                </button>
              );
            }
            // Grupo acordeón
            const isOpen = openGroups[g.id];
            const hasActive = g.items.some(it => it.id === adminTab);
            return (
              <div key={g.id}>
                <button className={`admin-nav-group ${hasActive ? 'has-active' : ''}`} onClick={() => toggleGroup(g.id)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><Ico n={g.icon} s={17} />{g.label}</span>
                  <span style={{ display: 'inline-flex', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><Ico n="chevron-down" s={15} /></span>
                </button>
                {isOpen && (
                  <div className="admin-nav-sub">
                    {g.items.map(it => (
                      <button key={it.id} className={`admin-nav-item sub ${adminTab === it.id ? 'active' : ''}`} onClick={() => goTab(it.id)}>{it.label}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Content */}
      <div className="admin-content">
        {adminTab === 'dashboard' && <AdminDashboard />}
        {adminTab === 'productos' && <AdminProductos />}
        {adminTab === 'pedidos' && <AdminPedidos filtroTipo="pedidos" />}
        {adminTab === 'presupuestos' && <AdminPedidos filtroTipo="presupuestos" />}
        {adminTab === 'venta_manual' && <AdminVentaManual />}
        {adminTab === 'ordenes_compra' && <AdminOrdenesCompra />}
        {adminTab === 'reglas_compra' && <AdminReglasCompra />}
        {adminTab === 'usuarios' && <AdminUsuarios />}
        {adminTab === 'listas' && <AdminListas />}
        {adminTab === 'cupones' && <AdminCupones />}
        {adminTab === 'promociones' && <AdminPromociones />}
        {adminTab === 'metodos_pago' && <AdminMetodosPago />}
        {adminTab === 'menu' && <AdminMenu />}
        {adminTab === 'envios' && <AdminEnviosCustom />}
        {adminTab === 'diseno' && <AdminDisenoHub />}
        {adminTab === 'general' && <AdminGeneralHub />}
        {adminTab === 'barras' && <AdminBarras />}
        {adminTab === 'contactos' && <AdminContactos />}
        {adminTab === 'paginas' && <AdminPaginas />}
        {adminTab === 'leads' && <AdminLeads />}
      </div>
    </div>
  );
}

// ── Hub de Diseño: sub-pestañas internas (Colores/Logo, Slider, Banners, Badges, Pop-ups, Redes, Novedades) ──
function AdminDisenoHub() {
  const [sub, setSub] = useState('tema');
  const subs = [
    { id: 'tema', label: 'Colores y logo' },
    { id: 'slider', label: 'Slider' },
    { id: 'badges', label: 'Badges' },
    { id: 'popups', label: 'Pop-ups' },
    { id: 'redes', label: 'Redes sociales' },
  ];
  return (
    <div>
      <div className="admin-subtabs">
        {subs.map(s => <button key={s.id} className={`admin-subtab ${sub === s.id ? 'active' : ''}`} onClick={() => setSub(s.id)}>{s.label}</button>)}
      </div>
      {sub === 'tema' && <AdminDiseno />}
      {sub === 'slider' && <AdminSlider />}
      {sub === 'badges' && <AdminBadges />}
      {sub === 'popups' && <AdminPopups />}
      {sub === 'redes' && <AdminRedes />}
    </div>
  );
}

// ── Hub General: config del negocio + mantenimiento ──
function AdminGeneralHub() {
  return <AdminConfig />;
}

// ── Placeholders Fase 2 (se completan después) ──
function AdminVentaManual() {
  return <div className="card" style={{ padding: 24 }}><h3>Agregar venta</h3><p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Venta interna de mostrador. Se implementa en la próxima etapa (con escáner QR a futuro).</p></div>;
}
function AdminOrdenesCompra() {
  return <div className="card" style={{ padding: 24 }}><h3>Órdenes de compra</h3><p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Compras a proveedores (stock entrante). Se implementa en la próxima etapa.</p></div>;
}
function AdminReglasCompra() {
  const { secciones, toast, config, setConfig } = useContext(Ctx);
  const [minimos, setMinimos] = useState({});
  const [saving, setSaving] = useState(null);
  useEffect(() => {
    const d = {}; secciones.forEach(s => { d[s.id] = config[`compra_minima_${s.id}`] || ''; }); setMinimos(d);
  }, [secciones, config]);

  const save = async (sec) => {
    setSaving(sec.id);
    try {
      const upd = { [`compra_minima_${sec.id}`]: String(minimos[sec.id] || 0) };
      await api.updateConfig(upd);
      setConfig({ ...config, ...upd });
      toast(`Compra mínima de ${sec.nombre} guardada`);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(null);
  };

  return (
    <div>
      <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Reglas de compra</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Definí un monto mínimo de compra por sección. El cliente no podrá cerrar el pedido si no lo alcanza (se le muestra una barra de progreso en el carrito). Dejá 0 para no exigir mínimo.</p>
      {secciones.map(s => (
        <div key={s.id} className="card" style={{ padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <strong style={{ fontSize: 15 }}>{s.nombre}</strong>
            {Number(minimos[s.id]) > 0
              ? <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 2 }}>Mínimo activo: {fmtARS(Number(minimos[s.id]))}</div>
              : <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Sin mínimo (se puede comprar cualquier monto)</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>$</span>
            <input type="number" value={minimos[s.id] ?? ''} onChange={e => setMinimos({ ...minimos, [s.id]: e.target.value })} placeholder="0" style={{ width: 130 }} />
            <button className="btn btn-primary btn-sm" onClick={() => save(s)} disabled={saving === s.id}>{saving === s.id ? '...' : 'Guardar'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN: Dashboard ───
function AdminDashboard() {
  const { adminSeccion } = useContext(Ctx);
  const [stats, setStats] = useState({});
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const loadStats = async () => {
    try { const s = await api.getStats(adminSeccion, desde, hasta); setStats(s); } catch {}
  };
  useEffect(() => { loadStats(); }, [adminSeccion, desde, hasta]);

  const kpis = [
    { label: 'PEDIDOS', value: stats.total_pedidos || 0, icon: '📦', color: 'var(--primary)', bg: 'var(--primary-light)' },
    { label: 'VENTAS', value: fmtARS(stats.total_ventas || 0), icon: '💰', color: 'var(--success)', bg: '#dcfce7' },
    { label: 'PRODUCTOS', value: stats.total_productos || 0, icon: '🏷️', color: 'var(--primary)', bg: '#fff3d4' },
    { label: 'USUARIOS', value: stats.total_usuarios || 0, icon: '👥', color: '#8b5cf6', bg: '#ede9fe' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.03em' }}>Dashboard</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ padding: '8px 12px', fontSize: 13, borderRadius: 8, width: 140 }} />
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ padding: '8px 12px', fontSize: 13, borderRadius: 8, width: 140 }} />
        </div>
      </div>

      <div className="stats-grid">
        {kpis.map(k => (
          <div key={k.label} className="stat-card" style={{ borderRadius: 20, padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 12, right: 16, width: 40, height: 40, borderRadius: 12, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{k.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: k.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {stats.ventas_por_dia?.length > 0 && (
        <div className="card" style={{ padding: 24, marginTop: 20, borderRadius: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontWeight: 800, fontSize: 16 }}>Ventas por día</h4>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{stats.ventas_por_dia.length} días</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160 }}>
            {stats.ventas_por_dia.slice(0, 14).reverse().map((d, i) => {
              const max = Math.max(...stats.ventas_por_dia.map(x => x.total));
              const h = max > 0 ? (d.total / max * 140) : 5;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', background: 'linear-gradient(180deg, #4A69E2 0%, #232321 120%)', borderRadius: 6, height: h, minHeight: 4, transition: 'height 0.3s' }} title={`$${fmt(d.total)}`} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>{new Date(d.fecha).getDate()}/{new Date(d.fecha).getMonth() + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: Productos (inline editable table) ───
function AdminProductos() {
  const { adminSeccion, secciones, toast } = useContext(Ctx);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busq, setBusq] = useState('');
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [showPriceAdj, setShowPriceAdj] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [expandVars, setExpandVars] = useState(null);

  const [secFiltro, setSecFiltro] = useState(adminSeccion);

  const load = async () => {
    const secId = secFiltro !== 'all' ? secFiltro : undefined;
    const data = await api.getProductos({ seccion_id: secId, q: busq, page: pagina, limit: pageSize });
    setProductos(data.productos || []); setTotal(data.total || 0);
    const cats = await api.getCategorias(secId).catch(() => []);
    setCategorias(cats || []);
  };
  useEffect(() => { setSecFiltro(adminSeccion); }, [adminSeccion]);
  useEffect(() => { load(); }, [secFiltro, busq, pagina]);

  const inlineUpdate = async (id, field, value) => {
    try { await api.updateProducto(id, { [field]: value }); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3>Productos ({total})</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Nuevo</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowImport(true)}>📥 Importar</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowPriceAdj(true)}>💲 Ajustar precios</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowHistory(true)}>📜 Historial</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={secFiltro} onChange={e => { setSecFiltro(e.target.value); setPagina(1); }} style={{ width: 200 }}>
          <option value="all">📦 Todas las secciones</option>
          {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <input placeholder="Buscar productos..." value={busq} onChange={e => { setBusq(e.target.value); setPagina(1); }} style={{ flex: 1 }} />
      </div>

      {/* Alerta de stock bajo */}
      {(() => {
        const bajos = productos.filter(p => p.stock_minimo > 0 && p.stock <= p.stock_minimo);
        if (!bajos.length) return null;
        return <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ico n="bell" s={16} /> {bajos.length} producto{bajos.length > 1 ? 's' : ''} con stock bajo el mínimo: {bajos.slice(0, 5).map(p => p.nombre || p.modelo).join(', ')}{bajos.length > 5 ? '...' : ''}
        </div>;
      })()}

      {/* Product table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th style={{width:50}}>Img</th><th>Producto</th><th>Categoría</th>{secFiltro === 'all' && <th>Sección</th>}<th style={{width:90}}>Precio</th><th style={{width:90}}>Oferta</th><th style={{width:70}}>Stock</th><th style={{width:50}}>👁</th><th style={{width:110}}>Acc.</th></tr></thead>
          <tbody>
            {productos.map(p => {
              const secNombre = secciones.find(s => s.id === p.seccion_id)?.nombre || '';
              const colCount = secFiltro === 'all' ? 9 : 8;
              return (
              <Fragment key={p.id}>
              <tr style={{ opacity: p.visible === false ? 0.5 : 1 }}>
                <td>{p.imagen ? <img src={p.imagen} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : '—'}</td>
                <td><strong style={{ cursor: 'pointer' }} onClick={() => setEditProd(p)}>{p.nombre || p.modelo}</strong><br/><small style={{ color: 'var(--text-muted)' }}>{p.sku || ''}</small></td>
                <td>{p.categoria}</td>
                {secFiltro === 'all' && <td><span style={{ fontSize: 11, background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{secNombre}</span></td>}
                <td><input type="number" defaultValue={p.precio_base} onBlur={e => inlineUpdate(p.id, 'precio_base', Number(e.target.value))} style={{ width: 80 }} /></td>
                <td><input type="number" defaultValue={p.precio_oferta || ''} onBlur={e => inlineUpdate(p.id, 'precio_oferta', Number(e.target.value))} style={{ width: 80 }} /></td>
                <td><input type="number" defaultValue={p.stock} onBlur={e => inlineUpdate(p.id, 'stock', Number(e.target.value))} style={{ width: 60, ...(p.stock_minimo > 0 && p.stock <= p.stock_minimo ? { borderColor: 'var(--danger)', color: 'var(--danger)', fontWeight: 700 } : {}) }} title={p.stock_minimo > 0 && p.stock <= p.stock_minimo ? `Stock bajo (mínimo: ${p.stock_minimo})` : ''} /></td>
                <td><input type="checkbox" defaultChecked={p.visible !== false} onChange={e => inlineUpdate(p.id, 'visible', e.target.checked)} /></td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => setExpandVars(expandVars === p.id ? null : p.id)} style={{ padding: '2px 6px' }} title="Variantes"><Ico n="shuffle" s={15} /></button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditProd(p)} style={{ padding: '2px 6px', marginLeft: 4 }}><Ico n="edit" s={15} /></button>
                  <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar?')) return; await api.deleteProducto(p.id); load(); }} style={{ padding: '2px 6px', marginLeft: 4 }}><Ico n="trash" s={15} /></button>
                </td>
              </tr>
              {expandVars === p.id && (
                <tr><td colSpan={colCount} style={{ background: 'var(--bg)', padding: '0 12px' }}>
                  <VariantesEditor productoId={p.id} />
                </td></tr>
              )}
              </Fragment>
            ); })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPagina(1); }} style={{ width: 100 }}>
          <option value={50}>50</option><option value={100}>100</option><option value={200}>200</option><option value={9999}>Todos</option>
        </select>
        {total > pageSize && <>
          {pagina > 1 && <button className="btn btn-outline btn-sm" onClick={() => setPagina(pagina - 1)}>←</button>}
          <span>Pág {pagina}/{Math.ceil(total / pageSize)}</span>
          {pagina < Math.ceil(total / pageSize) && <button className="btn btn-outline btn-sm" onClick={() => setPagina(pagina + 1)}>→</button>}
        </>}
      </div>

      {/* Modals */}
      {showAdd && <ProductModal onClose={() => { setShowAdd(false); load(); }} />}
      {editProd && <ProductModal product={editProd} onClose={() => { setEditProd(null); load(); }} />}
      {showImport && <ImportModal onClose={() => { setShowImport(false); load(); }} />}
      {showPriceAdj && <PriceAdjustModal categorias={categorias} onClose={() => { setShowPriceAdj(false); load(); }} />}
      {showHistory && <PriceHistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}

// ─── MULTI IMAGE UPLOAD ───
function MultiImageUpload({ productoId }) {
  const { toast } = useContext(Ctx);
  const [imgs, setImgs] = useState([]);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { api.getProductoImagenes(productoId).then(setImgs).catch(() => {}); }, [productoId]);
  const upload = async (file) => {
    setUploading(true);
    try { const r = await api.uploadImagen(file); await api.addProductoImagen(productoId, r.url, imgs.length); const updated = await api.getProductoImagenes(productoId); setImgs(updated); } catch { toast('Error al subir', 'error'); }
    setUploading(false);
  };
  const remove = async (id) => { await api.deleteProductoImagen(id); setImgs(imgs.filter(i => i.id !== id)); };
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <h4 style={{ marginBottom: 8, fontSize: 14 }}>📸 Galería de imágenes ({imgs.length})</h4>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {imgs.map(img => (
          <div key={img.id} style={{ position: 'relative', width: 80, height: 80 }}>
            <img src={img.url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
            <button onClick={() => remove(img.id)} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer' }}>✕</button>
          </div>
        ))}
        <label style={{ width: 80, height: 80, border: '2px dashed var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 24, color: 'var(--text-muted)' }}>
          {uploading ? '...' : '+'}
          <input type="file" accept="image/*" multiple onChange={e => { Array.from(e.target.files).forEach(upload); }} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
}

// ─── VARIANTES EDITOR (FIX #7: edicion inline + reutilizar opciones) ───
function VariantesEditor({ productoId }) {
  const { toast } = useContext(Ctx);
  const [vars, setVars] = useState([]);
  const [form, setForm] = useState({ nombre: '', valor: '', stock: 0, precio_extra: 0 });
  useEffect(() => { api.getVariantes(productoId).then(setVars).catch(() => {}); }, [productoId]);
  const setLocal = (id, field, value) => setVars(vars.map(x => x.id === id ? { ...x, [field]: value } : x));
  const add = async () => {
    if (!form.nombre) return;
    try { const r = await api.addVariante({ producto_id: productoId, ...form }); setVars([...vars, r]); setForm({ nombre: form.nombre, valor: '', stock: 0, precio_extra: 0 }); } catch (e) { toast(e.message, 'error'); }
  };
  const saveVar = async (v) => {
    try { await api.updateVariante(v.id, { nombre: v.nombre, valor: v.valor, stock: Number(v.stock) || 0, precio_extra: Number(v.precio_extra) || 0 }); } catch (e) { toast(e.message, 'error'); }
  };
  const remove = async (id) => { await api.deleteVariante(id); setVars(vars.filter(v => v.id !== id)); };
  const nombresUsados = [...new Set(vars.map(v => v.nombre).filter(Boolean))];
  const dlId = `varnames-${productoId}`;
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <h4 style={{ marginBottom: 8, fontSize: 14 }}>🔀 Variantes (opcional)</h4>
      <datalist id={dlId}>{nombresUsados.map(n => <option key={n} value={n} />)}</datalist>
      {vars.map(v => (
        <div key={v.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
          <input value={v.nombre} list={dlId} onChange={e => setLocal(v.id, 'nombre', e.target.value)} onBlur={() => saveVar(v)} placeholder="Nombre" style={{ width: 110, fontSize: 13 }} />
          <input value={v.valor} onChange={e => setLocal(v.id, 'valor', e.target.value)} onBlur={() => saveVar(v)} placeholder="Valor" style={{ width: 110, fontSize: 13 }} />
          <input type="number" value={v.stock} onChange={e => setLocal(v.id, 'stock', e.target.value)} onBlur={() => saveVar(v)} placeholder="Stock" style={{ width: 70, fontSize: 13 }} />
          <input type="number" value={v.precio_extra} onChange={e => setLocal(v.id, 'precio_extra', e.target.value)} onBlur={() => saveVar(v)} placeholder="+$" style={{ width: 70, fontSize: 13 }} />
          <button onClick={() => remove(v.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        <input placeholder="Nombre (ej: Color)" list={dlId} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={{ width: 120 }} />
        <input placeholder="Valor (ej: Rojo)" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} style={{ width: 120 }} />
        <input type="number" placeholder="Stock" value={form.stock || ''} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} style={{ width: 70 }} />
        <input type="number" placeholder="+$" value={form.precio_extra || ''} onChange={e => setForm({ ...form, precio_extra: Number(e.target.value) })} style={{ width: 70 }} />
        <button className="btn btn-primary btn-sm" onClick={add}>+ Agregar</button>
      </div>
    </div>
  );
}

// ─── CATEGORY OPTIONS HELPER ───
function CatOptions({ seccionId, exclude }) {
  const [cats, setCats] = useState([]);
  useEffect(() => { api.getCategorias(seccionId).then(setCats).catch(() => {}); }, [seccionId]);
  return cats.filter(c => c && c !== exclude).map(c => <option key={c} value={c}>{c}</option>);
}

// ─── PRODUCT MODAL (add/edit with image upload + precios fijos) ───
function ProductModal({ product, onClose }) {
  const { secciones, adminSeccion, toast, listas, preciosFijos, setPreciosFijos } = useContext(Ctx);
  const isEdit = !!product;
  const [f, setF] = useState(product || {
    seccion_id: adminSeccion !== 'all' ? Number(adminSeccion) : secciones[0]?.id,
    categoria: '', modelo: '', nombre: '', precio_base: 0, stock: 0, stock_minimo: 0,
    imagen: '', descripcion: '', sku: '', tipo: 'fisico', moneda: 'ARS', precio_oferta: 0,
    envio_gratis: false, visible: true, notas: '', compatibilidad: '',
    peso: 0, alto: 0, ancho: 0, largo: 0
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Precios fijos por lista
  const [fp, setFp] = useState(() => {
    if (!product) return {};
    const o = {}; preciosFijos.filter(x => x.producto_id === product.id).forEach(x => { o[x.lista_precio_id] = x.precio_fijo; }); return o;
  });

  const handleImageUpload = async (file) => {
    setUploading(true);
    try { const r = await api.uploadImagen(file); setF({ ...f, imagen: r.url }); } catch (e) { toast('Error al subir imagen', 'error'); }
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateProducto(product.id, f);
        // Save precios fijos
        for (const [listaId, precio] of Object.entries(fp)) {
          await api.setPrecioFijo(product.id, listaId, Number(precio) || 0);
        }
        const pf = await api.getPreciosFijos().catch(() => []);
        setPreciosFijos(Array.isArray(pf) ? pf : []);
      } else {
        await api.createProducto(f);
      }
      toast(isEdit ? 'Producto actualizado' : 'Producto creado');
      onClose();
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">{isEdit ? 'Editar producto' : 'Nuevo producto'}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Sección *</label>
              <select value={f.seccion_id} onChange={e => setF({ ...f, seccion_id: Number(e.target.value) })}>
                {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Categoría *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={f._catCustom ? '__new__' : f.categoria} onChange={e => { if (e.target.value === '__new__') setF({ ...f, categoria: '', _catCustom: true }); else setF({ ...f, categoria: e.target.value, _catCustom: false }); }} style={{ flex: 1 }}>
                  <option value="">— Seleccionar —</option>
                  {f.categoria && <option value={f.categoria}>{f.categoria}</option>}
                  <CatOptions seccionId={f.seccion_id} exclude={f.categoria} />
                  <option value="__new__">+ Nueva categoría...</option>
                </select>
                {f._catCustom && <input value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })} placeholder="Nueva categoría" style={{ flex: 1 }} autoFocus />}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nombre *</label><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Modelo</label><input value={f.modelo} onChange={e => setF({ ...f, modelo: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">SKU</label><input value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Tipo</label>
              <select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}><option value="fisico">Físico</option><option value="digital">Digital</option></select></div>
            <div className="form-group"><label className="form-label">Moneda</label>
              <select value={f.moneda} onChange={e => setF({ ...f, moneda: e.target.value })}><option value="ARS">ARS</option><option value="USD">USD</option><option value="USDT">USDT</option></select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Precio base *</label><input type="number" value={f.precio_base === 0 && f._priceCleared ? '' : f.precio_base} onFocus={e => { if (Number(e.target.value) === 0) { setF({ ...f, precio_base: '', _priceCleared: true }); } }} onChange={e => setF({ ...f, precio_base: e.target.value === '' ? '' : Number(e.target.value), _priceCleared: e.target.value === '' })} onBlur={e => setF({ ...f, precio_base: Number(e.target.value) || 0, _priceCleared: false })} /></div>
            <div className="form-group"><label className="form-label">Precio oferta</label><input type="number" value={f.precio_oferta || ''} onChange={e => setF({ ...f, precio_oferta: e.target.value === '' ? '' : Number(e.target.value) })} onBlur={e => setF({ ...f, precio_oferta: Number(e.target.value) || 0 })} placeholder="0 = sin oferta" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Stock *</label><input type="number" value={f.stock} onChange={e => setF({ ...f, stock: Number(e.target.value) })} /></div>
            <div className="form-group"><label className="form-label">Stock mínimo</label><input type="number" value={f.stock_minimo} onChange={e => setF({ ...f, stock_minimo: Number(e.target.value) })} /></div>
          </div>
          {/* Stock options */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '8px 0 12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.permitir_sin_stock || false} onChange={e => setF({ ...f, permitir_sin_stock: e.target.checked })} /> Permitir compra sin stock</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.es_digital || false} onChange={e => setF({ ...f, es_digital: e.target.checked })} /> Es digital (sin envío)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.envio_gratis || false} onChange={e => setF({ ...f, envio_gratis: e.target.checked })} /> Envío gratis</label>
          </div>
          {/* Peso y dimensiones (para Andreani) */}
          <div className="form-row">
            <div className="form-group"><label className="form-label">Peso (kg)</label><input type="number" step="0.01" value={f.peso || ''} onChange={e => setF({ ...f, peso: Number(e.target.value) })} placeholder="0.5" /></div>
            <div className="form-group"><label className="form-label">Alto (cm)</label><input type="number" value={f.alto || ''} onChange={e => setF({ ...f, alto: Number(e.target.value) })} /></div>
            <div className="form-group"><label className="form-label">Ancho (cm)</label><input type="number" value={f.ancho || ''} onChange={e => setF({ ...f, ancho: Number(e.target.value) })} /></div>
            <div className="form-group"><label className="form-label">Largo (cm)</label><input type="number" value={f.largo || ''} onChange={e => setF({ ...f, largo: Number(e.target.value) })} /></div>
          </div>
          {/* Image upload (principal) */}
          <div className="form-group">
            <label className="form-label">Imagen principal</label>
            <div className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleImageUpload(file); }}>
              {uploading ? <span>Subiendo...</span> : f.imagen ? <img src={f.imagen} alt="" style={{ maxHeight: 100 }} /> : <span>Arrastrá una imagen o hacé clic</span>}
              <input type="file" accept="image/*" onChange={e => { const file = e.target.files[0]; if (file) handleImageUpload(file); }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </div>
            {f.imagen && <input value={f.imagen} onChange={e => setF({ ...f, imagen: e.target.value })} placeholder="O pegá URL de imagen" style={{ marginTop: 8 }} />}
          </div>
          {/* Multi-image gallery (only on edit) */}
          {isEdit && <MultiImageUpload productoId={product.id} />}
          {/* Variantes (only on edit) */}
          {isEdit && <VariantesEditor productoId={product.id} />}
          <div className="form-group"><label className="form-label">Descripción</label><textarea value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} rows={3} /></div>
          <div className="form-group"><label className="form-label">Notas internas</label><textarea value={f.notas} onChange={e => setF({ ...f, notas: e.target.value })} rows={2} /></div>
          <div className="form-group"><label className="form-label">Compatibilidad</label><input value={f.compatibilidad} onChange={e => setF({ ...f, compatibilidad: e.target.value })} /></div>
          <div className="form-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={f.envio_gratis} onChange={e => setF({ ...f, envio_gratis: e.target.checked })} /> Envío gratis</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={f.visible !== false} onChange={e => setF({ ...f, visible: e.target.checked })} /> Visible</label>
          </div>
          {f.tipo === 'fisico' && (
            <div className="form-row">
              <div className="form-group"><label className="form-label">Peso (kg)</label><input type="number" value={f.peso || ''} onChange={e => setF({ ...f, peso: Number(e.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Alto (cm)</label><input type="number" value={f.alto || ''} onChange={e => setF({ ...f, alto: Number(e.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Ancho (cm)</label><input type="number" value={f.ancho || ''} onChange={e => setF({ ...f, ancho: Number(e.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Largo (cm)</label><input type="number" value={f.largo || ''} onChange={e => setF({ ...f, largo: Number(e.target.value) })} /></div>
            </div>
          )}
          {/* Precios fijos por lista (only on edit) */}
          {isEdit && listas.length > 0 && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <h4 style={{ marginBottom: 8 }}>Precios fijos por lista</h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Si ponés un precio acá, se usa ese en vez del cálculo automático (precio base × multiplicador).</p>
              {listas.map(l => (
                <div key={l.id} className="form-row" style={{ marginBottom: 4 }}>
                  <label style={{ minWidth: 120, fontSize: 13 }}>{l.nombre}</label>
                  <input type="number" value={fp[l.id] || ''} onChange={e => setFp({ ...fp, [l.id]: e.target.value })} placeholder={`Auto: $${fmt(Math.round(f.precio_base * l.multiplicador))}`} style={{ width: 120 }} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── IMPORT MODAL ───
function ImportModal({ onClose }) {
  const { secciones, adminSeccion, toast } = useContext(Ctx);
  const [data, setData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState('');
  const [modo, setModo] = useState('crear_actualizar');
  const [faltantes, setFaltantes] = useState('no_tocar');
  const [importSecId, setImportSecId] = useState(adminSeccion !== 'all' ? Number(adminSeccion) : secciones[0]?.id);

  const parseFile = async (f) => {
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      if (!json.length) { toast('Archivo vacío', 'warning'); return; }
      const keys = Object.keys(json[0]);
      const pick = (r, re) => { const k = keys.find(k => re.test(k)); return k !== undefined ? r[k] : undefined; };
      // Detecta ambos formatos (Empretienda "Exportación" y Tienda Negocio "Listado")
      const prods = json.map(r => {
        const nombre = pick(r, /^nombre del producto$|^nombre$|modelo|model/i) || '';
        const precio = Number(String(pick(r, /^precio$|price/i) ?? '').toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const oferta = Number(String(pick(r, /oferta|precio oferta/i) ?? '').toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const stock = Number(pick(r, /^stock$/i)) || 0;
        return {
          seccion_id: importSecId,
          categoria: (pick(r, /categor|subcategor/i) || '').toString().split(/>|\//).pop().trim(),
          modelo: nombre, nombre,
          precio_base: precio, precio_oferta: oferta < precio ? oferta : 0,
          stock,
          sku: (pick(r, /^sku$|codigo|c\u00f3digo/i) || '').toString().trim(),
          descripcion: pick(r, /descrip/i) || '',
          peso: Number(String(pick(r, /peso|weight|kg/i) ?? '').toString().replace(',', '.')) || 0,
          alto: Number(String(pick(r, /alto|height/i) ?? '').toString().replace(',', '.')) || 0,
          ancho: Number(String(pick(r, /ancho|width/i) ?? '').toString().replace(',', '.')) || 0,
          largo: Number(String(pick(r, /profund|largo|length/i) ?? '').toString().replace(',', '.')) || 0,
        };
      }).filter(p => p.nombre);
      const conSku = prods.filter(p => p.sku).length;
      setData({ productos: prods, total: prods.length, conSku });
    };
    reader.readAsArrayBuffer(f);
  };

  const doUpload = async () => {
    if (!data?.productos?.length) return;
    setUploading(true); setResult('');
    try {
      const r = await api.bulkProductos(data.productos, { modo, faltantes, seccion_id: importSecId });
      setResult(`✅ ${r.insertados || 0} nuevos · ${r.actualizados || 0} actualizados${r.saltados ? ` · ${r.saltados} saltados` : ''}${r.marcadosSinStock ? ` · ${r.marcadosSinStock} marcados sin stock` : ''}`);
      setData(null);
    } catch (e) { setResult(`❌ Error: ${e.message}`); }
    setUploading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Importar productos (Excel/CSV)</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Detecta automáticamente el formato (Empretienda o Tienda Negocio). Importa nombre, precio, oferta, stock, peso, medidas, categoría y SKU.</p>
          <div className="form-group"><label className="form-label">Sección destino</label>
            <select value={importSecId} onChange={e => setImportSecId(Number(e.target.value))}>
              {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">¿Qué hacer con los productos?</label>
            <select value={modo} onChange={e => setModo(e.target.value)}>
              <option value="crear_actualizar">Crear nuevos y actualizar existentes (por SKU)</option>
              <option value="solo_nuevos">Solo agregar los que faltan (no toca existentes)</option>
              <option value="reemplazar">Borrar todo de la sección y cargar de cero</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Productos de esta sección que NO están en el Excel</label>
            <select value={faltantes} onChange={e => setFaltantes(e.target.value)} disabled={modo === 'reemplazar'}>
              <option value="no_tocar">No tocar (dejarlos como están)</option>
              <option value="sin_stock">Poner en sin stock (el proveedor los sacó de la lista)</option>
            </select>
            <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Útil para el mayorista: si un producto ya no está en su Excel, lo marcás sin stock.</small>
          </div>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); }} />
          {data && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontWeight: 700 }}>{data.total} productos detectados <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>({data.conSku} con SKU)</span></p>
              {data.conSku < data.total && <p style={{ fontSize: 12, color: 'var(--warning)' }}>⚠️ {data.total - data.conSku} sin SKU: se crearán siempre como nuevos (no se pueden actualizar ni marcar sin stock).</p>}
              <button className="btn btn-primary" onClick={doUpload} disabled={uploading} style={{ marginTop: 12 }}>{uploading ? 'Importando...' : `Importar ${data.total} productos`}</button>
            </div>
          )}
          {result && <p style={{ marginTop: 12, fontWeight: 700 }}>{result}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── PRICE ADJUST MODAL ───
function PriceAdjustModal({ categorias, onClose }) {
  const { toast } = useContext(Ctx);
  const [pct, setPct] = useState('');
  const [cat, setCat] = useState('');
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    if (!pct) return; setBusy(true);
    try { await api.ajustarPrecios(parseFloat(pct), cat || null); toast('Precios ajustados'); onClose(); } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  const reset = async () => {
    setBusy(true);
    try { await api.resetPrecios(); toast('Precios reseteados al original'); onClose(); } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Ajustar precios masivamente</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Porcentaje (+ para subir, - para bajar)</label><input type="number" value={pct} onChange={e => setPct(e.target.value)} placeholder="Ej: 10 para subir 10%, -5 para bajar 5%" /></div>
          <div className="form-group"><label className="form-label">Categoría (vacío = todos)</label>
            <select value={cat} onChange={e => setCat(e.target.value)}><option value="">Todas</option>{categorias.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={apply} disabled={busy}>Aplicar</button>
            <button className="btn btn-warning" onClick={reset} disabled={busy}>Resetear al original</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PRICE HISTORY MODAL ───
function PriceHistoryModal({ onClose }) {
  const [hist, setHist] = useState([]);
  useEffect(() => { api.getHistorialPrecios().then(setHist).catch(() => {}); }, []);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Historial de precios</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {hist.length === 0 ? <p>Sin cambios registrados</p> : (
            <table className="admin-table"><thead><tr><th>Fecha</th><th>Producto</th><th>Anterior</th><th>Nuevo</th><th>Usuario</th></tr></thead>
              <tbody>{hist.map(h => <tr key={h.id}><td>{new Date(h.created_at).toLocaleString('es-AR')}</td><td>{h.nombre || h.modelo} ({h.categoria})</td><td>{fmtARS(h.precio_anterior)}</td><td>{fmtARS(h.precio_nuevo)}</td><td>{h.usuario}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: Pedidos (4 tabs + full OrderDetailModal) ───
function PresupuestoModal({ onClose }) {
  const { secciones, toast } = useContext(Ctx);
  const [cliente, setCliente] = useState(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clientes, setClientes] = useState([]);
  const [seccionId, setSeccionId] = useState(secciones[0]?.id);
  const [items, setItems] = useState([]);
  const [addSearch, setAddSearch] = useState('');
  const [results, setResults] = useState([]);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);

  useEffect(() => { if (clienteSearch.length >= 2) api.getUsuarios(clienteSearch).then(setClientes).catch(() => {}); else setClientes([]); }, [clienteSearch]);
  useEffect(() => {
    clearTimeout(timer.current);
    if (addSearch.length < 2) { setResults([]); return; }
    timer.current = setTimeout(() => api.buscarProductosAdmin(addSearch).then(setResults).catch(() => {}), 400);
  }, [addSearch]);

  const total = items.reduce((s, i) => s + (Number(i.precio_unitario) || 0) * i.qty, 0);
  const addItem = (p) => {
    setItems(prev => { const ex = prev.find(i => i.producto_id === p.id); if (ex) return prev.map(i => i.producto_id === p.id ? { ...i, qty: i.qty + 1 } : i); return [...prev, { producto_id: p.id, categoria: p.categoria, modelo: p.modelo, nombre_producto: p.nombre || p.modelo, qty: 1, precio_unitario: p.precio_base, precio_base: p.precio_base }]; });
    setAddSearch(''); setResults([]);
  };
  const setQty = (id, qty) => setItems(items.map(i => i.producto_id === id ? { ...i, qty: Math.max(1, qty) } : i));
  const setPrecio = (id, precio) => setItems(items.map(i => i.producto_id === id ? { ...i, precio_unitario: Number(precio) || 0 } : i));

  const guardar = async () => {
    if (!items.length) { toast('Agregá al menos un producto', 'error'); return; }
    setSaving(true);
    try {
      await api.createPedido({
        usuario_id: cliente?.id || null, seccion_id: seccionId, tipo: 'presupuesto', estado: 'pendiente',
        notas: notas || (cliente ? '' : `Presupuesto para ${clienteSearch || 'consumidor final'}`),
        items: items.map(i => ({ producto_id: i.producto_id, categoria: i.categoria, modelo: i.modelo, nombre_producto: i.nombre_producto, cantidad: i.qty, precio_unitario: i.precio_unitario, precio_base: i.precio_base })),
        subtotal: total, total,
      });
      toast('Presupuesto creado'); onClose();
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
      <div className="modal-header"><span className="modal-title">Nuevo presupuesto</span><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="modal-body">
        <div className="form-row">
          <div className="form-group"><label className="form-label">Sección</label><select value={seccionId} onChange={e => setSeccionId(Number(e.target.value))}>{secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Cliente (opcional)</label>
            {cliente ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--border-light)', borderRadius: 'var(--radius-pill)' }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{cliente.nombre}</span>
                <button className="btn btn-outline btn-sm" onClick={() => { setCliente(null); setClienteSearch(''); }}>Cambiar</button>
              </div>
            ) : (
              <>
                <input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />
                {clientes.length > 0 && <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 120, overflowY: 'auto' }}>{clientes.slice(0, 6).map(c => <button key={c.id} onClick={() => { setCliente(c); setClientes([]); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text)' }}>{c.nombre} {c.nombre_fantasia && `(${c.nombre_fantasia})`}</button>)}</div>}
              </>
            )}
          </div>
        </div>
        <div className="form-group"><label className="form-label">Agregar productos</label>
          <input placeholder="Buscar producto..." value={addSearch} onChange={e => setAddSearch(e.target.value)} />
          {results.length > 0 && <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>{results.slice(0, 8).map(p => <button key={p.id} onClick={() => addItem(p)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text)' }}><span>{p.nombre || p.modelo}</span><span style={{ fontWeight: 700 }}>{fmtARS(p.precio_base)}</span></button>)}</div>}
        </div>
        {items.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {items.map(i => (
              <div key={i.producto_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ flex: 1, fontSize: 13 }}>{i.nombre_producto}</span>
                <input type="number" min="1" value={i.qty} onChange={e => setQty(i.producto_id, parseInt(e.target.value) || 1)} style={{ width: 56, textAlign: 'center' }} />
                <input type="number" value={i.precio_unitario} onChange={e => setPrecio(i.producto_id, e.target.value)} style={{ width: 90, textAlign: 'right' }} />
                <button className="btn btn-danger btn-sm" onClick={() => setItems(items.filter(x => x.producto_id !== i.producto_id))} style={{ padding: '2px 8px' }}>✕</button>
              </div>
            ))}
            <p style={{ textAlign: 'right', fontWeight: 800, fontSize: 18, marginTop: 8 }}>Total: {fmtARS(total)}</p>
          </div>
        )}
        <div className="form-group" style={{ marginTop: 8 }}><label className="form-label">Notas</label><textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} /></div>
      </div>
      <div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Crear presupuesto'}</button></div>
    </div></div>
  );
}

function AdminPedidos({ filtroTipo }) {
  const { adminSeccion, toast, testMode } = useContext(Ctx);
  const [pedidos, setPedidos] = useState([]);
  const [ordTab, setOrdTab] = useState(filtroTipo === 'presupuestos' ? 'presupuestos' : 'pedidos');
  const [viewOrder, setViewOrder] = useState(null);
  const [showPresupuesto, setShowPresupuesto] = useState(false);
  // Cambiar de tab si cambia el filtro desde el sidebar
  useEffect(() => { if (filtroTipo === 'presupuestos') setOrdTab('presupuestos'); else if (filtroTipo === 'pedidos') setOrdTab('pedidos'); }, [filtroTipo]);

  // Abrir pedido directo desde QR del remito (?pedido=X)
  useEffect(() => {
    const handler = async () => {
      const id = window.__openPedido;
      if (id) { try { const full = await api.getPedido(id); setViewOrder(full); } catch {} window.__openPedido = null; }
    };
    window.addEventListener('open-pedido', handler);
    if (window.__openPedido) handler();
    return () => window.removeEventListener('open-pedido', handler);
  }, []);

  const load = (tab) => {
    const t = tab || ordTab;
    const params = { all: true, seccion_id: adminSeccion !== 'all' ? adminSeccion : null };
    if (t === 'archivados') params.archivado = true;
    if (!testMode) params.is_test = false; // FIX #13: en produccion oculta pedidos de prueba
    api.getPedidos(params).then(ords => {
      if (t === 'pedidos') setPedidos(ords.filter(o => o.tipo !== 'presupuesto' && o.estado !== 'cancelado' && !o.archivado));
      else if (t === 'presupuestos') setPedidos(ords.filter(o => o.tipo === 'presupuesto' && o.estado !== 'cancelado' && !o.archivado));
      else if (t === 'cancelados') setPedidos(ords.filter(o => o.estado === 'cancelado' && !o.archivado));
      else setPedidos(ords);
    });
  };
  useEffect(() => { load(); }, [adminSeccion, ordTab, testMode]);

  const changeTab = (t) => { setOrdTab(t); load(t); };
  const tabs = [{ id: 'pedidos', label: 'Pedidos' }, { id: 'presupuestos', label: 'Presupuestos' }, { id: 'cancelados', label: 'Cancelados' }, { id: 'archivados', label: 'Archivados' }];
  const estados = ['pendiente', 'preparando', 'listo', 'entregado', 'cancelado'];
  const colores = { pendiente: 'var(--warning)', preparando: 'var(--primary)', listo: '#8b5cf6', entregado: 'var(--success)', cancelado: 'var(--danger)' };

  // Export Excel con detalle por ítem (2 hojas: Resumen + Detalle)
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      // Traer items de cada pedido
      const detalle = [];
      const resumen = [];
      for (const p of pedidos) {
        const fecha = new Date(p.created_at).toLocaleDateString('es-AR');
        resumen.push({
          ID: p.id, Fecha: fecha, Cliente: p.usuario_nombre || '', Fantasía: p.nombre_fantasia || '',
          Teléfono: p.usuario_telefono || '', Sección: p.seccion_nombre || '', Estado: p.estado,
          Subtotal: Number(p.subtotal) || 0, Descuento: Number(p.descuento) || 0,
          Envío: Number(p.costo_envio) || 0, Total: Number(p.total) || 0,
          'Método pago': p.metodo_pago || '', Notas: p.notas || ''
        });
        try {
          const full = await api.getPedido(p.id);
          (full.items || []).forEach(it => detalle.push({
            'Pedido ID': p.id, Fecha: fecha, Cliente: p.usuario_nombre || '',
            Producto: it.nombre_producto || '', Categoría: it.categoria || '', Modelo: it.modelo || '',
            Cantidad: it.cantidad || 0, 'Precio unit.': Number(it.precio_unitario) || 0,
            Subtotal: (Number(it.precio_unitario) || 0) * (it.cantidad || 0)
          }));
        } catch {}
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), 'Detalle por ítem');
      const fname = `pedidos_${ordTab}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fname);
      toast('Excel generado');
    } catch (e) { toast('Error exportando: ' + e.message, 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>Pedidos</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {ordTab === 'presupuestos' && <button className="btn btn-primary btn-sm" onClick={() => setShowPresupuesto(true)}>+ Nuevo presupuesto</button>}
          <button className="btn btn-outline btn-sm" onClick={exportExcel}>📊 Exportar Excel</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {tabs.map(t => <button key={t.id} className={`btn btn-sm ${ordTab === t.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => changeTab(t.id)}>{t.label}</button>)}
      </div>
      {pedidos.map(p => (
        <div key={p.id} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'pointer' }} onClick={() => setViewOrder(p)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong>#{p.id}</strong> {p.is_test && <span style={{ background: 'var(--warning)', color: '#000', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>🧪 TEST</span>}
              {p.seccion_nombre && <span style={{ background: p.seccion_color || 'var(--primary)', color: '#fff', padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{p.seccion_nombre}</span>}
              {' — '}{p.usuario_nombre || '(sin nombre)'} {p.nombre_fantasia && `(${p.nombre_fantasia})`}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ background: colores[p.estado], color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{p.estado}</span>
              <strong>{fmtARS(p.total)}</strong>
            </div>
          </div>
        </div>
      ))}
      {pedidos.length === 0 && <div className="empty-state"><h3>No hay {ordTab}</h3></div>}
      {viewOrder && <OrderDetailModal order={viewOrder} onClose={() => { setViewOrder(null); load(); }} />}
      {showPresupuesto && <PresupuestoModal onClose={() => { setShowPresupuesto(false); changeTab('presupuestos'); }} />}
    </div>
  );
}

// ─── ORDER DETAIL MODAL (full: edit items, print, clone, WA, assign client) ───
function OrderDetailModal({ order: initOrder, onClose }) {
  const { toast, listas, getPrice, userLista, openWA, config } = useContext(Ctx);
  const [o, setO] = useState(initOrder);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [ajuste, setAjuste] = useState(0); // + recargo, - descuento
  const searchTimer = useRef(null);

  useEffect(() => {
    (async () => {
      setLoadingItems(true);
      const full = await api.getPedido(o.id);
      setItems((full.items || []).map(i => ({ ...i, qty: i.cantidad || 1 })));
      setO(full);
      if (full.descuento) setAjuste(-Math.abs(Number(full.descuento)));
      const users = await api.getUsuarios('').catch(() => []);
      setAllUsers(users);
      setLoadingItems(false);
    })();
  }, [o.id]);

  // Search products to add
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (addSearch.length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try { const r = await api.buscarProductosAdmin(addSearch); setSearchResults(r); } catch { setSearchResults([]); }
    }, 400);
  }, [addSearch]);

  const editSubtotal = items.reduce((s, i) => s + (Number(i.precio_unitario) || 0) * (i.qty || 0), 0);
  const editTotal = Math.max(0, editSubtotal + (Number(ajuste) || 0));
  const itemName = i => i.nombre_producto || (i.categoria && i.modelo ? `${i.categoria} - ${i.modelo}` : i.modelo || 'Producto');

  const saveEdit = async () => {
    setSaving(true);
    try {
      const newItems = items.map(i => ({ producto_id: i.producto_id || i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: itemName(i), cantidad: i.qty, precio_unitario: Number(i.precio_unitario) || 0, precio_base: Number(i.precio_base) || 0 }));
      await api.updatePedido(o.id, { items: newItems, subtotal: editSubtotal, descuento: ajuste < 0 ? Math.abs(ajuste) : 0, total: editTotal });
      toast('Pedido actualizado'); setEditing(false);
      const full = await api.getPedido(o.id); setO(full); setItems((full.items || []).map(i => ({ ...i, qty: i.cantidad || 1 })));
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const addItem = (p) => {
    const precio = p.precio_base;
    setItems(prev => {
      const ex = prev.find(i => (i.producto_id || i.id) === p.id);
      if (ex) return prev.map(i => (i.producto_id || i.id) === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { producto_id: p.id, id: p.id, categoria: p.categoria, modelo: p.modelo, nombre_producto: p.nombre || p.modelo, qty: 1, precio_unitario: precio, precio_base: p.precio_base }];
    });
    setSearchResults([]); setAddSearch('');
  };

  const changeEstado = async (estado) => {
    try {
      await api.updatePedido(o.id, { estado });
      setO({ ...o, estado });
      toast('Estado actualizado');
      // Notificación opcional al cliente
      const mensajes = {
        preparando: `¡Hola ${o.usuario_nombre || ''}! Tu pedido #${o.id} está siendo preparado 📦`,
        listo: `¡Hola ${o.usuario_nombre || ''}! Tu pedido #${o.id} está listo ✅`,
        entregado: `¡Hola ${o.usuario_nombre || ''}! Tu pedido #${o.id} fue entregado 🎉 ¡Gracias por tu compra!`,
        cancelado: `Hola ${o.usuario_nombre || ''}, tu pedido #${o.id} fue cancelado. Cualquier duda escribinos.`,
      };
      const msg = mensajes[estado];
      if (msg && o.usuario_telefono && confirm(`¿Notificar al cliente por WhatsApp que el pedido está "${estado}"?`)) {
        window.open(waLink('54' + String(o.usuario_telefono).replace(/\D/g, ''), msg), '_blank');
      }
    } catch (e) { toast(e.message, 'error'); }
  };

  const cloneOrder = async () => {
    try {
      await api.createPedido({ seccion_id: o.seccion_id, tipo: o.tipo, metodo_pago: o.metodo_pago, notas: `Clonado de #${o.id}`, items: items.map(i => ({ producto_id: i.producto_id || i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: itemName(i), cantidad: i.qty, precio_unitario: i.precio_unitario, precio_base: i.precio_base })), subtotal: editTotal, total: editTotal });
      toast('Pedido duplicado'); onClose();
    } catch (e) { toast(e.message, 'error'); }
  };

  const printOrder = (format = 'A4') => {
    const logo = config.logo_url || '';
    const biz = config.nombre_tienda || 'Tienda';
    const isSmall = format !== 'A4';
    const widths = { A4: '210mm', '58mm': '58mm', '80mm': '80mm' };
    const fontSize = isSmall ? '10px' : '13px';
    const pagado = o.estado_pago === 'pagado' || o.pagado;
    // URL del pedido para el QR (abre el pedido en el panel)
    const pedidoUrl = `${window.location.origin}/?pedido=${o.id}`;
    const qrSize = isSmall ? 90 : 120;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(pedidoUrl)}`;
    const rows = items.map(i =>
      `<tr><td style="padding:3px 4px;border-bottom:1px solid #eee">${itemName(i)}</td><td style="text-align:center;border-bottom:1px solid #eee">${i.qty}</td><td style="text-align:right;border-bottom:1px solid #eee">$${fmt((i.precio_unitario || 0) * i.qty)}</td></tr>`
    ).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Remito #${o.id}</title><style>
      @page{size:${widths[format]};margin:${isSmall ? '3mm' : '12mm'}}
      body{font-family:Arial,sans-serif;font-size:${fontSize};margin:0;padding:${isSmall ? '4px' : '0'};color:#111}
      table{width:100%;border-collapse:collapse;margin-top:6px}
      th{text-align:left;border-bottom:2px solid #333;padding:4px;font-size:${isSmall ? '10px' : '12px'}}
      .head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
      .biz{font-size:${isSmall ? '15px' : '22px'};font-weight:800;margin:0}
      .badge{display:inline-block;padding:3px 12px;border-radius:6px;font-weight:800;font-size:${isSmall ? '11px' : '13px'};color:#fff}
    </style></head><body>
      <div class="head">
        <div>
          ${logo ? `<img src="${logo}" style="max-height:${isSmall ? '34px' : '58px'};margin-bottom:4px">` : ''}
          <h1 class="biz">${biz}</h1>
          <p style="margin:2px 0;color:#555">Remito / Pedido #${o.id}</p>
        </div>
        <div style="text-align:center">
          <img src="${qrUrl}" width="${qrSize}" height="${qrSize}" style="display:block">
          <span style="font-size:9px;color:#888">Escaneá para abrir</span>
        </div>
      </div>
      <p style="margin:6px 0 2px">${new Date(o.created_at).toLocaleString('es-AR')}</p>
      <p style="margin:2px 0"><strong>${o.usuario_nombre || 'Cliente'}</strong> ${o.nombre_fantasia ? `(${o.nombre_fantasia})` : ''}${o.usuario_telefono ? ` · ${o.usuario_telefono}` : ''}</p>
      <p style="margin:2px 0">${o.tipo_entrega === 'retiro' ? 'Retiro en local' : 'Envío'}${o.direccion ? ` — ${o.direccion}` : ''}</p>
      <p style="margin:6px 0">
        <span class="badge" style="background:${pagado ? '#16a34a' : '#dc2626'}">${pagado ? 'PAGADO' : 'IMPAGO'}</span>
        <span style="margin-left:8px">Método: ${o.metodo_pago || '-'}</span>
      </p>
      <table><thead><tr><th>Producto</th><th style="text-align:center">Cant</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="text-align:right;font-weight:800;font-size:${isSmall ? '14px' : '19px'};margin-top:10px">TOTAL: $${fmt(editTotal)}</p>
      ${o.notas ? `<p style="color:#666;font-size:${isSmall ? '9px' : '11px'};border-top:1px dashed #ccc;padding-top:6px">Notas: ${o.notas}</p>` : ''}
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const estados = ['pendiente', 'preparando', 'listo', 'entregado', 'cancelado'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Pedido #{o.id}{o.seccion_nombre && <span style={{ background: o.seccion_color || 'var(--primary)', color: '#fff', padding: '2px 10px', borderRadius: 5, fontSize: 11, fontWeight: 800, marginLeft: 10, textTransform: 'uppercase', letterSpacing: '0.03em', verticalAlign: 'middle' }}>{o.seccion_nombre}</span>}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Client info */}
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            <strong>{o.usuario_nombre}</strong> {o.nombre_fantasia && `(${o.nombre_fantasia})`}
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {o.usuario_telefono && <span>📱 {o.usuario_telefono} </span>}
              {o.usuario_email && <span>✉️ {o.usuario_email} </span>}
              {o.usuario_direccion && <span>📍 {o.usuario_direccion}</span>}
            </div>
          </div>

          {/* Estado */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Estado:</label>
            <select value={o.estado} onChange={e => changeEstado(e.target.value)} style={{ width: 140 }}>
              {estados.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            {/* Assign client */}
            <select value={o.usuario_id || ''} onChange={async e => { try { await api.updatePedido(o.id, { usuario_id: Number(e.target.value) }); toast('Cliente asignado'); const full = await api.getPedido(o.id); setO(full); } catch (err) { toast(err.message, 'error'); } }} style={{ width: 180 }}>
              <option value="">Asignar cliente...</option>
              {allUsers.filter(u => u.rol !== 'admin').map(u => <option key={u.id} value={u.id}>{u.nombre} {u.nombre_fantasia ? `(${u.nombre_fantasia})` : ''}</option>)}
            </select>
          </div>

          {/* Items */}
          <h4>Items {!editing && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)} style={{ marginLeft: 8 }}>✏️ Editar</button>}</h4>
          {loadingItems ? <p>Cargando...</p> : (
            <table className="admin-table" style={{ marginBottom: 12 }}>
              <thead><tr><th>Producto</th><th style={{width:60}}>Cant</th><th style={{width:80}}>Precio</th><th style={{width:80}}>Subtotal</th>{editing && <th style={{width:40}}></th>}</tr></thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx}>
                    <td>{itemName(i)}</td>
                    <td>{editing ? <input type="number" value={i.qty} onChange={e => setItems(items.map((it, j) => j === idx ? { ...it, qty: Number(e.target.value) } : it))} style={{ width: 50 }} /> : i.qty}</td>
                    <td>{editing ? <input type="number" value={i.precio_unitario} onChange={e => setItems(items.map((it, j) => j === idx ? { ...it, precio_unitario: Number(e.target.value) } : it))} style={{ width: 70 }} /> : fmtARS(i.precio_unitario)}</td>
                    <td>{fmtARS((i.precio_unitario || 0) * (i.qty || 0))}</td>
                    {editing && <td><button className="btn btn-danger btn-sm" onClick={() => setItems(items.filter((_, j) => j !== idx))} style={{ padding: '2px 6px' }}>✕</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Add product (when editing) */}
          {editing && (
            <div style={{ marginBottom: 12 }}>
              <input placeholder="Buscar producto para agregar..." value={addSearch} onChange={e => setAddSearch(e.target.value)} />
              {searchResults.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxHeight: 150, overflowY: 'auto', marginTop: 4 }}>
                  {searchResults.map(p => <div key={p.id} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)' }} onClick={() => addItem(p)}>{p.nombre || p.modelo} — {p.categoria} — ${fmt(p.precio_base)}</div>)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <label style={{ fontWeight: 700 }}>Ajuste $:</label>
                  <input type="number" value={ajuste} onChange={e => setAjuste(Number(e.target.value) || 0)} style={{ width: 100, fontSize: 12 }} placeholder="- desc / + recargo" />
                </div>
                <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            {editing && ajuste !== 0 && <div style={{ fontSize: 12, color: ajuste < 0 ? 'var(--success)' : 'var(--accent)' }}>{ajuste < 0 ? `Descuento: -${fmtARS(Math.abs(ajuste))}` : `Recargo: +${fmtARS(ajuste)}`}</div>}
            <div style={{ fontSize: 18, fontWeight: 700 }}>Total: {fmtARS(editTotal)}</div>
          </div>
          {o.metodo_pago && <p style={{ fontSize: 13 }}>💳 {o.metodo_pago}</p>}
          {o.notas && <p style={{ fontSize: 13 }}>📝 {o.notas}</p>}
          {o.cupon_codigo && <p style={{ fontSize: 13 }}>🎟️ Cupón: {o.cupon_codigo}</p>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="btn btn-outline btn-sm" onClick={() => printOrder('A4')}><Ico n="printer" s={15} /> Remito A4</button>
            <button className="btn btn-outline btn-sm" onClick={() => printOrder('80mm')}><Ico n="printer" s={15} /> Térmica</button>
            <button className="btn btn-outline btn-sm" onClick={cloneOrder}>📋 Duplicar</button>
            {o.tipo === 'presupuesto' && <button className="btn btn-success btn-sm" onClick={async () => {
              try {
                const val = await api.validarConversion(o.id);
                if (val.tiene_cambios) {
                  const msgs = val.cambios.map(c => {
                    if (c.tipo === 'eliminado') return `❌ ${c.item}: ${c.detalle}`;
                    if (c.tipo === 'stock') return `⚠️ ${c.item}: ${c.detalle}`;
                    if (c.tipo === 'precio') return `💰 ${c.item}: ${c.detalle}`;
                    return c.detalle;
                  }).join('\n');
                  if (!window.confirm(`Hay cambios desde que se creó el presupuesto:\n\n${msgs}\n\n¿Convertir a pedido de todas formas?`)) return;
                }
                await api.updatePedido(o.id, { tipo: 'pedido', estado: 'pendiente' });
                toast('Convertido a pedido'); onClose();
              } catch (e) { toast(e.message, 'error'); }
            }}>✓ Convertir a pedido</button>}
            {o.tipo === 'pedido' && <button className="btn btn-outline btn-sm" onClick={async () => { if (!confirm('¿Volver este pedido a presupuesto? Se devolverá el stock descontado.')) return; try { await api.updatePedido(o.id, { tipo: 'presupuesto', estado: 'pendiente' }); toast('Volvió a presupuesto'); onClose(); } catch (e) { toast(e.message, 'error'); } }}>↩ Volver a presupuesto</button>}
            {(o.usuario_telefono) && <button className="btn btn-outline btn-sm" onClick={() => { const tel = (o.usuario_telefono || '').replace(/\D/g, ''); const num = tel.startsWith('54') ? tel : `54${tel}`; openWA(num, `Hola ${o.usuario_nombre || ''}, respecto a tu pedido #${o.id}:`); }}>📱 WhatsApp</button>}
            <button className="btn btn-outline btn-sm" onClick={async () => { try { await api.archivarPedido(o.id); toast('Archivado'); onClose(); } catch (e) { toast(e.message, 'error'); } }}>📥 Archivar</button>
            <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar este pedido?')) return; try { await api.deletePedido(o.id); toast('Eliminado'); onClose(); } catch (e) { toast(e.message, 'error'); } }}>🗑 Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: Usuarios (full modal: edit, approve with lista, subadmin perms) ───
function AdminUsuarios() {
  const { toast, listas, config } = useContext(Ctx);
  const [users, setUsers] = useState([]);
  const [busq, setBusq] = useState('');
  const [editUser, setEditUser] = useState(null);

  useEffect(() => { api.getUsuarios(busq).then(setUsers).catch(() => {}); }, [busq]);
  const refresh = () => api.getUsuarios(busq).then(setUsers);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>Usuarios</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setEditUser({ _isNew: true })}>+ Nuevo</button>
      </div>
      <input placeholder="Buscar por nombre, usuario o fantasía..." value={busq} onChange={e => setBusq(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
      {users.map(u => (
        <div key={u.id} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'pointer' }} onClick={() => setEditUser(u)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong>{u.nombre}</strong> <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>@{u.usuario}</span>
              {u.nombre_fantasia && <span style={{ fontSize: 12, marginLeft: 4 }}>({u.nombre_fantasia})</span>}
              {u.notas_admin && <span style={{ fontSize: 11, color: 'var(--primary)', marginLeft: 8 }}>📝</span>}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ background: u.aprobado === false ? 'var(--warning-light)' : u.activo ? 'var(--success-light)' : 'var(--danger-light)', color: u.aprobado === false ? 'var(--warning)' : u.activo ? 'var(--success)' : 'var(--danger)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                {u.aprobado === false ? 'pendiente' : u.activo ? 'activo' : 'suspendido'}
              </span>
              <span style={{ fontSize: 12 }}>{u.rol}</span>
              {listas.find(l => l.id === u.lista_precio_id) && <span style={{ fontSize: 11, color: listas.find(l => l.id === u.lista_precio_id)?.color }}>{listas.find(l => l.id === u.lista_precio_id)?.nombre}</span>}
              {u.telefono && <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); const saludo = `Hola ${u.nombre}, te contacto de ${config.nombre_tienda || 'la tienda'}.`; window.open(waLink('54' + u.telefono.replace(/\D/g, ''), saludo), '_blank'); }} style={{ background: '#25D366', color: '#fff', padding: '4px 8px' }} title="Escribir por WhatsApp"><Ico n="message" s={14} /></button>}
            </div>
          </div>
        </div>
      ))}
      {editUser && <UserModal u={editUser} onClose={() => { setEditUser(null); refresh(); }} />}
    </div>
  );
}

// ─── USER MODAL (full: edit all fields, approve, subadmin perms, WA) ───
function UserModal({ u, onClose }) {
  const { toast, listas, openWA } = useContext(Ctx);
  const isNew = u._isNew;
  const isPending = !isNew && u.aprobado === false;
  const [f, setF] = useState(isNew
    ? { nombre: '', usuario: '', password: '', telefono: '', email: '', direccion: '', rol: 'cliente', lista_precio_id: listas[0]?.id || '', nombre_fantasia: '', notas_admin: '', permisos: '', activo: true, es_revendedor: false, descuento_revendedor: 0 }
    : { nombre: u.nombre || '', usuario: u.usuario || '', password: '', telefono: u.telefono || '', email: u.email || '', direccion: u.direccion || '', rol: u.rol || 'cliente', lista_precio_id: u.lista_precio_id || '', nombre_fantasia: u.nombre_fantasia || '', notas_admin: u.notas_admin || '', permisos: u.permisos || '', activo: u.activo ?? true, es_revendedor: u.es_revendedor || false, descuento_revendedor: u.descuento_revendedor || 0 }
  );
  const [sv, setSv] = useState(false);

  const save = async () => {
    if (!f.nombre || !f.usuario) { toast('Nombre y usuario obligatorios'); return; }
    setSv(true);
    try {
      const datos = { ...f }; if (!datos.password) delete datos.password;
      if (isNew) { await api.register(datos); await api.getUsuarios().then(users => { const newU = users.find(x => x.usuario === datos.usuario); if (newU && datos.activo) { api.updateUsuario(newU.id, datos); } }); }
      else await api.updateUsuario(u.id, datos);
      toast(isNew ? 'Usuario creado' : 'Usuario actualizado'); onClose();
    } catch (e) { toast(e.message, 'error'); }
    setSv(false);
  };

  const aprobar = async (lid) => {
    setSv(true);
    try {
      await api.aprobarUsuario(u.id, lid); toast('Aprobado ✅');
      if (u.telefono) { const msg = `Hola ${u.nombre}, tu cuenta ya está activa. Tu usuario es: *${u.usuario}*`; openWA(`54${u.telefono.replace(/\D/g, '')}`, msg); }
      onClose();
    } catch (e) { toast(e.message, 'error'); }
    setSv(false);
  };
  const rechazar = async () => { setSv(true); try { await api.rechazarUsuario(u.id); toast('Rechazado'); onClose(); } catch (e) { toast(e.message, 'error'); } setSv(false); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header"><span className="modal-title">{isNew ? 'Nuevo usuario' : isPending ? 'Revisar usuario' : 'Editar usuario'}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Pending approval */}
          {isPending && (
            <div className="card" style={{ padding: 12, marginBottom: 12, background: 'var(--warning-light)' }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>⏳ Pendiente de aprobación</p>
              <p style={{ fontSize: 13, marginBottom: 8 }}>Aprobar con lista de precios:</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {listas.map(l => <button key={l.id} className="btn btn-sm" style={{ borderColor: l.color, color: l.color }} onClick={() => aprobar(l.id)} disabled={sv}>{l.nombre}</button>)}
              </div>
              <button className="btn btn-danger btn-sm" onClick={rechazar} disabled={sv} style={{ marginTop: 8 }}>❌ Rechazar</button>
            </div>
          )}

          {/* User info (if existing) */}
          {!isNew && <div className="card" style={{ padding: 12, marginBottom: 12 }}><strong>{u.nombre}</strong> {u.nombre_fantasia && `(${u.nombre_fantasia})`}<br /><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{u.usuario} {u.telefono && `• ${u.telefono}`} {u.email && `• ${u.email}`}</span></div>}

          {/* Form */}
          <div className="form-group"><label className="form-label">Nombre *</label><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Usuario *</label><input value={f.usuario} onChange={e => setF({ ...f, usuario: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">{isNew ? 'Contraseña *' : 'Nueva contraseña (vacío = no cambiar)'}</label><input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Teléfono</label><input value={f.telefono} onChange={e => setF({ ...f, telefono: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Email</label><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div className="form-group"><label className="form-label">Dirección</label><input value={f.direccion} onChange={e => setF({ ...f, direccion: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Nombre de fantasía</label><input value={f.nombre_fantasia} onChange={e => setF({ ...f, nombre_fantasia: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Rol</label>
              <select value={f.rol} onChange={e => setF({ ...f, rol: e.target.value })}><option value="cliente">Cliente</option><option value="subadmin">Sub-Admin</option><option value="admin">Admin</option></select></div>
            <div className="form-group"><label className="form-label">Lista precio</label>
              <select value={f.lista_precio_id} onChange={e => setF({ ...f, lista_precio_id: e.target.value })}><option value="">Sin lista</option>{listas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}</select></div>
          </div>
          {/* Subadmin permisos */}
          {f.rol === 'subadmin' && (
            <div className="card" style={{ padding: 12, marginTop: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Permisos sub-admin:</p>
              {[['productos','Productos'],['pedidos','Pedidos'],['usuarios','Usuarios'],['listas','Listas'],['config','Configuración'],['stats','Estadísticas']].map(([k,label]) => {
                const perms = (f.permisos || '').split(',').filter(Boolean);
                return <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><input type="checkbox" checked={perms.includes(k)} onChange={() => { const nw = perms.includes(k) ? perms.filter(p => p !== k) : [...perms, k]; setF({ ...f, permisos: nw.join(',') }); }} />{label}</label>;
              })}
            </div>
          )}
          {/* Revendedor */}
          <div className="form-row" style={{ marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={f.es_revendedor} onChange={e => setF({ ...f, es_revendedor: e.target.checked })} /> Es revendedor</label>
            {f.es_revendedor && <div className="form-group"><label className="form-label">Descuento %</label><input type="number" value={f.descuento_revendedor} onChange={e => setF({ ...f, descuento_revendedor: Number(e.target.value) })} style={{ width: 80 }} /></div>}
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas internas (solo admin)</label><textarea value={f.notas_admin} onChange={e => setF({ ...f, notas_admin: e.target.value })} rows={2} placeholder="Ej: Paga a 30 días, viene los viernes..." /></div>
          {!isNew && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}><input type="checkbox" checked={f.activo !== false} onChange={e => setF({ ...f, activo: e.target.checked })} /> {f.activo !== false ? '✅ Cuenta activa' : '🔴 Cuenta suspendida'}</label>
          )}
        </div>
        <div className="modal-footer">
          {!isNew && (
            <button className="btn btn-outline btn-sm" onClick={async () => { const r = await api.resetPassword(u.id); toast('Contraseña reseteada a 1234'); if (r.telefono) { openWA(`54${r.telefono.replace(/\D/g, '')}`, `Hola ${r.nombre}, tu contraseña fue reseteada. Tu nueva contraseña es: 1234`); } }} style={{ marginRight: 'auto' }}>🔑 Reset pass</button>
          )}
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={sv}>{sv ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: Listas de precio (CRUD) ───
function AdminListas() {
  const { listas, setListas, toast } = useContext(Ctx);
  const [editLista, setEditLista] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const refresh = async () => { const l = await api.getListas(); setListas(l); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3>Listas de precio</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ Nueva lista</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Cada lista define un multiplicador sobre el precio base. Los clientes aprobados se asignan a una lista.</p>
      {listas.map(l => (
        <div key={l.id} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${l.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><strong>{l.nombre}</strong> <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{l.modo === 'porcentaje' ? `+${Math.round((l.multiplicador - 1) * 100)}%` : `×${l.multiplicador}`} (sobre precio base)</span>
              {l.compra_minima > 0 && <span style={{ fontSize: 12, marginLeft: 8 }}>Min: ${fmt(l.compra_minima)}</span>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setEditLista(l)}><Ico n="edit" s={15} /></button>
              <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar?')) return; await api.deleteLista(l.id); refresh(); }}><Ico n="trash" s={15} /></button>
            </div>
          </div>
        </div>
      ))}
      {(showNew || editLista) && <TierModal tier={editLista} onClose={() => { setEditLista(null); setShowNew(false); refresh(); }} />}
    </div>
  );
}

// ─── TIER MODAL ───
function TierModal({ tier, onClose }) {
  const { toast } = useContext(Ctx);
  const isNew = !tier;
  const [f, setF] = useState(tier || { id: '', nombre: '', multiplicador: 1, modo: 'porcentaje', color: 'var(--primary)', compra_minima: 0, promo_msg: '' });
  const [sv, setSv] = useState(false);
  const save = async () => {
    if (!f.id || !f.nombre) { toast('ID y nombre obligatorios'); return; }
    setSv(true);
    try {
      if (isNew) await api.createLista(f);
      else await api.updateLista(tier.id, f);
      toast(isNew ? 'Lista creada' : 'Lista actualizada'); onClose();
    } catch (e) { toast(e.message, 'error'); }
    setSv(false);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">{isNew ? 'Nueva lista' : 'Editar lista'}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">ID (slug) *</label><input value={f.id} onChange={e => setF({ ...f, id: e.target.value })} disabled={!isNew} placeholder="ej: may_aaa" /></div>
          <div className="form-group"><label className="form-label">Nombre *</label><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Multiplicador</label><input type="number" step="0.01" value={f.multiplicador} onChange={e => setF({ ...f, multiplicador: Number(e.target.value) })} /></div>
            <div className="form-group"><label className="form-label">Modo</label><select value={f.modo} onChange={e => setF({ ...f, modo: e.target.value })}><option value="porcentaje">Porcentaje</option><option value="fijo">Fijo</option></select></div>
            <div className="form-group"><label className="form-label">Color</label><input type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} /></div>
          </div>
          <div className="form-group"><label className="form-label">Compra mínima ($)</label><input type="number" value={f.compra_minima} onChange={e => setF({ ...f, compra_minima: Number(e.target.value) })} /></div>
          <div className="form-group"><label className="form-label">Mensaje promo</label><input value={f.promo_msg} onChange={e => setF({ ...f, promo_msg: e.target.value })} placeholder="Ej: Comprando +$50.000 envío gratis" /></div>
        </div>
        <div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={sv}>{sv ? 'Guardando...' : 'Guardar'}</button></div>
      </div>
    </div>
  );
}

// ─── ADMIN: Cupones (section checkboxes, product search, label changes) ───
function AdminCupones() {
  const { secciones, toast } = useContext(Ctx);
  const [cupones, setCupones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ codigo: '', tipo: 'porcentaje', valor: 0, secciones_ids: '', categoria: '', uso_maximo: 0, monto_minimo: 0, metodo_pago: '', fecha_desde: '', fecha_hasta: '' });
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [selProds, setSelProds] = useState([]);

  useEffect(() => { api.getCupones().then(setCupones); }, []);

  const openEdit = async (c) => {
    setEdit(c);
    setForm({ codigo: c.codigo, tipo: c.tipo, valor: c.valor, secciones_ids: c.secciones_ids || '', categoria: c.categoria || '', uso_maximo: c.uso_maximo || 0, monto_minimo: c.monto_minimo || 0, metodo_pago: c.metodo_pago || '', fecha_desde: c.fecha_desde ? String(c.fecha_desde).slice(0, 10) : '', fecha_hasta: c.fecha_hasta ? String(c.fecha_hasta).slice(0, 10) : '' });
    // FIX #6: recuperar productos asociados para no borrarlos al guardar
    const pids = Array.isArray(c.productos_ids) ? c.productos_ids.filter(Boolean) : [];
    if (pids.length) { try { const d = await api.getProductos({ limit: 9999 }); setSelProds((d.productos || []).filter(pp => pids.includes(pp.id))); } catch { setSelProds([]); } }
    else setSelProds([]);
    setShowForm(true);
  };
  const openNew = () => {
    setEdit(null); setForm({ codigo: '', tipo: 'porcentaje', valor: 0, secciones_ids: '', categoria: '', uso_maximo: 0, monto_minimo: 0, metodo_pago: '', fecha_desde: '', fecha_hasta: '' });
    setSelProds([]); setShowForm(true);
  };

  const searchProds = async (q) => { setProdSearch(q); if (q.length >= 2) { const r = await api.buscarProductosAdmin(q); setProdResults(r); } else setProdResults([]); };

  const toggleSeccion = (id) => {
    const ids = form.secciones_ids ? form.secciones_ids.split(',').map(Number).filter(Boolean) : [];
    const nw = ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id];
    setForm({ ...form, secciones_ids: nw.join(',') });
  };

  const save = async () => {
    try {
      const data = { ...form, productos_ids: selProds.map(p => p.id) };
      if (edit) { await api.updateCupon(edit.id, data); } else { await api.createCupon(data); }
      api.getCupones().then(setCupones); setShowForm(false); toast(edit ? 'Cupón actualizado' : 'Cupón creado');
    } catch (e) { toast(e.message, 'error'); }
  };

  const secIds = form.secciones_ids ? form.secciones_ids.split(',').map(Number) : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3>Cupones</h3>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo cupón</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Los cupones requieren que el cliente ingrese un código para obtener el descuento.</p>
      {cupones.map(c => (
        <div key={c.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><strong>{c.codigo}</strong> — {c.tipo === 'porcentaje' ? `${c.valor}%` : c.tipo === 'monto_fijo' ? `$${fmt(c.valor)}` : 'Envío gratis'} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Usos: {c.usos_actuales}/{c.uso_maximo || '∞'}</span></div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}><Ico n="edit" s={15} /></button>
              <button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteCupon(c.id); api.getCupones().then(setCupones); }}><Ico n="trash" s={15} /></button>
            </div>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">{edit ? 'Editar cupón' : 'Nuevo cupón'}</span><button className="modal-close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Código *</label><input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })} /></div>
                <div className="form-group"><label className="form-label">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="porcentaje">Porcentaje</option><option value="monto_fijo">Monto fijo</option><option value="envio_gratis">Envío gratis</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">{form.tipo === 'porcentaje' ? 'Porcentaje (%)' : form.tipo === 'monto_fijo' ? 'Monto ($)' : 'Valor'}</label><input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: Number(e.target.value) })} /></div>
                <div className="form-group"><label className="form-label">Máximo de usos (0=ilimitado)</label><input type="number" value={form.uso_maximo} onChange={e => setForm({ ...form, uso_maximo: Number(e.target.value) })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Válido desde</label><input type="date" value={form.fecha_desde} onChange={e => setForm({ ...form, fecha_desde: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Válido hasta</label><input type="date" value={form.fecha_hasta} onChange={e => setForm({ ...form, fecha_hasta: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Monto mínimo ($, 0=sin mínimo)</label><input type="number" value={form.monto_minimo} onChange={e => setForm({ ...form, monto_minimo: Number(e.target.value) })} /></div>
                <div className="form-group"><label className="form-label">Solo con método de pago (opcional)</label><input value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value })} placeholder="Ej: Efectivo" /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Secciones donde aplica</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {secciones.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" checked={secIds.includes(s.id)} onChange={() => toggleSeccion(s.id)} />{s.nombre}</label>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin selección = aplica en todas</p>
              </div>
              <div className="form-group"><label className="form-label">Productos (buscar)</label>
                <input placeholder="Buscar productos..." value={prodSearch} onChange={e => searchProds(e.target.value)} />
                {prodResults.length > 0 && <div style={{ border: '1px solid var(--border)', borderRadius: 4, maxHeight: 150, overflowY: 'auto', marginTop: 4 }}>{prodResults.map(p => <div key={p.id} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)' }} onClick={() => { if (!selProds.find(sp => sp.id === p.id)) setSelProds([...selProds, p]); setProdResults([]); setProdSearch(''); }}>{p.nombre || p.modelo} — {p.categoria}</div>)}</div>}
                {selProds.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>{selProds.map(p => <span key={p.id} style={{ background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }} onClick={() => setSelProds(selProds.filter(sp => sp.id !== p.id))}>{p.nombre || p.modelo} ✕</span>)}</div>}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: Promociones (with envío gratis, section checkboxes, product search) ───
function AdminPromociones() {
  const { secciones, toast } = useContext(Ctx);
  const [promos, setPromos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ nombre: '', tipo: 'porcentaje', valor: 0, secciones_ids: '', categoria: '', productos_ids: '' });
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [selProds, setSelProds] = useState([]);

  useEffect(() => { api.getPromociones().then(setPromos); }, []);

  const openNew = () => { setEdit(null); setForm({ nombre: '', tipo: 'porcentaje', valor: 0, secciones_ids: '', categoria: '', productos_ids: '' }); setSelProds([]); setShowForm(true); };
  const openEdit = (p) => { setEdit(p); setForm({ nombre: p.nombre, tipo: p.tipo, valor: p.valor, secciones_ids: p.secciones_ids || '', categoria: p.categoria || '', productos_ids: p.productos_ids || '' }); setSelProds([]); setShowForm(true); };

  const searchProds = async (q) => { setProdSearch(q); if (q.length >= 2) { const r = await api.buscarProductosAdmin(q); setProdResults(r); } else setProdResults([]); };

  const toggleSeccion = (id) => {
    const ids = form.secciones_ids ? form.secciones_ids.split(',').map(Number).filter(Boolean) : [];
    const nw = ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id];
    setForm({ ...form, secciones_ids: nw.join(',') });
  };

  const save = async () => {
    try {
      const data = { ...form, productos_ids: selProds.length ? selProds.map(p => p.id).join(',') : form.productos_ids };
      if (edit) await api.updatePromocion(edit.id, data); else await api.createPromocion(data);
      api.getPromociones().then(setPromos); setShowForm(false); toast(edit ? 'Promoción actualizada' : 'Promoción creada');
    } catch (e) { toast(e.message, 'error'); }
  };

  const secIds = form.secciones_ids ? form.secciones_ids.split(',').map(Number) : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3>Promociones</h3>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nueva</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Las promociones se aplican automáticamente (sin código). El cliente ve el descuento directo en el producto.</p>
      {promos.map(p => (
        <div key={p.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><strong>{p.nombre}</strong> — {p.tipo === 'porcentaje' ? `${p.valor}%` : p.tipo === 'envio_gratis' ? 'Envío gratis' : `$${fmt(p.valor)}`} <span style={{ fontSize: 12, color: p.activo ? 'var(--success)' : 'var(--danger)' }}>{p.activo ? 'Activa' : 'Inactiva'}</span></div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}><Ico n="edit" s={15} /></button>
              <button className="btn btn-danger btn-sm" onClick={async () => { await api.deletePromocion(p.id); api.getPromociones().then(setPromos); }}><Ico n="trash" s={15} /></button>
            </div>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">{edit ? 'Editar promoción' : 'Nueva promoción'}</span><button className="modal-close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="porcentaje">Porcentaje</option><option value="monto_fijo">Monto fijo</option><option value="envio_gratis">Envío gratis</option></select></div>
                <div className="form-group"><label className="form-label">{form.tipo === 'porcentaje' ? 'Porcentaje (%)' : 'Valor ($)'}</label><input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: Number(e.target.value) })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Secciones</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{secciones.map(s => <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" checked={secIds.includes(s.id)} onChange={() => toggleSeccion(s.id)} />{s.nombre}</label>)}</div>
              </div>
              <div className="form-group"><label className="form-label">Productos (buscar)</label>
                <input placeholder="Buscar..." value={prodSearch} onChange={e => searchProds(e.target.value)} />
                {prodResults.length > 0 && <div style={{ border: '1px solid var(--border)', borderRadius: 4, maxHeight: 120, overflowY: 'auto', marginTop: 4 }}>{prodResults.map(p => <div key={p.id} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 13 }} onClick={() => { if (!selProds.find(sp => sp.id === p.id)) setSelProds([...selProds, p]); setProdResults([]); setProdSearch(''); }}>{p.nombre || p.modelo} — {p.categoria}</div>)}</div>}
                {selProds.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>{selProds.map(p => <span key={p.id} style={{ background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }} onClick={() => setSelProds(selProds.filter(sp => sp.id !== p.id))}>{p.nombre || p.modelo} ✕</span>)}</div>}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: Popups ───
function AdminPopups() {
  const { secciones, toast } = useContext(Ctx);
  const [popups, setPopups] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ titulo: '', imagen: '', url_destino: '', secciones_ids: '', activo: true });
  const [edit, setEdit] = useState(null);
  useEffect(() => { api.getPopupsAll().then(setPopups); }, []);
  const save = async () => { try { if (edit) await api.updatePopup(edit.id, form); else await api.createPopup(form); api.getPopupsAll().then(setPopups); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Pop-ups promocionales</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ titulo: '', imagen: '', url_destino: '', secciones_ids: '', activo: true }); setShow(true); }}>+ Nuevo</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Se muestran al entrar a la tienda. Solo el primero activo aparece.</p>
      {popups.map(p => (<div key={p.id} className="card" style={{ padding: 12, marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><strong>{p.titulo}</strong> <span style={{ fontSize: 12, color: p.activo ? 'var(--success)' : 'var(--danger)' }}>{p.activo ? 'Activo' : 'Inactivo'}</span></div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => { setEdit(p); setForm(p); setShow(true); }}><Ico n="edit" s={15} /></button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deletePopup(p.id); api.getPopupsAll().then(setPopups); }}><Ico n="trash" s={15} /></button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nuevo'} pop-up</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-group"><label className="form-label">Título</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Imagen</label>
          <input type="file" accept="image/*" onChange={async e => { const file = e.target.files[0]; if (file) { try { const r = await api.uploadImagen(file); setForm({ ...form, imagen: r.url }); } catch { toast('Error al subir', 'error'); } } }} />
          {form.imagen && <img src={form.imagen} alt="" style={{ maxHeight: 80, marginTop: 8, borderRadius: 8 }} />}
          <input value={form.imagen} onChange={e => setForm({ ...form, imagen: e.target.value })} placeholder="O pegá URL" style={{ marginTop: 4, fontSize: 12 }} />
        </div>
        <div className="form-group"><label className="form-label">URL destino</label><input value={form.url_destino} onChange={e => setForm({ ...form, url_destino: e.target.value })} /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.activo !== false} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div></div></div>)}
    </div>
  );
}

// ─── ADMIN: Páginas info ───
function AdminPaginas() {
  const { toast } = useContext(Ctx);
  const [paginas, setPaginas] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ titulo: '', slug: '', contenido: '', seccion_id: null, visible: true, orden: 0 });
  const [edit, setEdit] = useState(null);
  useEffect(() => { api.getPaginas().then(setPaginas); }, []);
  const save = async () => { try { if (edit) await api.updatePagina(edit.id, form); else await api.createPagina(form); api.getPaginas().then(setPaginas); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Páginas informativas</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ titulo: '', slug: '', contenido: '', seccion_id: null, visible: true, orden: 0 }); setShow(true); }}>+ Nueva</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Páginas de info como "Cómo comprar", "Envíos", "Preguntas frecuentes", etc.</p>
      {paginas.map(p => (<div key={p.id} className="card" style={{ padding: 12, marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{p.titulo}</strong><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => { setEdit(p); setForm(p); setShow(true); }}><Ico n="edit" s={15} /></button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deletePagina(p.id); api.getPaginas().then(setPaginas); }}><Ico n="trash" s={15} /></button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nueva'} página</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-group"><label className="form-label">Título</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Slug (URL)</label><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Contenido</label><textarea value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} rows={6} /></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Orden</label><input type="number" value={form.orden} onChange={e => setForm({ ...form, orden: Number(e.target.value) })} /></div></div>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div></div></div>)}
    </div>
  );
}

// ─── DRAG & DROP REORDER ───
function useDnDReorder(items, setItems, onSave) {
  const drag = useRef(null); const over = useRef(null);
  const start = (i) => { drag.current = i; };
  const enter = (i) => { over.current = i; };
  const end = () => {
    if (drag.current === null || over.current === null || drag.current === over.current) { drag.current = null; over.current = null; return; }
    const cp = [...items]; const d = cp.splice(drag.current, 1)[0]; cp.splice(over.current, 0, d);
    const re = cp.map((it, i) => ({ ...it, orden: i })); setItems(re); onSave(re);
    drag.current = null; over.current = null;
  };
  return { start, enter, end };
}

// ─── ADMIN: Badges (section multi-select, pre-loaded shown) ───
function AdminBadges() {
  const { secciones, toast } = useContext(Ctx);
  const [bgs, setBgs] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ icono: '⭐', texto: '', color: 'var(--primary)', secciones_ids: '', visible: true, orden: 0 });
  const [edit, setEdit] = useState(null);
  useEffect(() => { api.getBadgesAll().then(b => setBgs(b.sort((a,c) => (a.orden||0) - (c.orden||0)))); }, []);
  const reload = () => api.getBadgesAll().then(b => setBgs(b.sort((a,c) => (a.orden||0) - (c.orden||0))));
  const toggleSec = (id) => { const ids = form.secciones_ids ? form.secciones_ids.split(',').map(Number).filter(Boolean) : []; const nw = ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]; setForm({ ...form, secciones_ids: nw.join(',') }); };
  const save = async () => { if (!form.texto?.trim()) { toast('El texto del badge es obligatorio', 'error'); return; } try { if (edit) await api.updateBadge(edit.id, form); else await api.createBadge(form); reload(); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); } };
  const saveOrder = async (re) => { for (const b of re) { await api.updateBadge(b.id, b).catch(() => {}); } };
  const dnd = useDnDReorder(bgs, setBgs, saveOrder);
  const toggleVisible = async (b) => { const nv = !b.visible; setBgs(bgs.map(x => x.id === b.id ? { ...x, visible: nv } : x)); await api.updateBadge(b.id, { ...b, visible: nv }).catch(() => reload()); };
  const secNames = (ids) => { if (!ids) return 'Todas'; const arr = ids.split(',').map(Number).filter(Boolean); if (!arr.length) return 'Todas'; return arr.map(id => secciones.find(s => s.id === id)?.nombre).filter(Boolean).join(', '); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Badges de confianza</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ icono: '⭐', texto: '', color: 'var(--primary)', secciones_ids: '', visible: true, orden: 0 }); setShow(true); }}>+ Nuevo</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Se muestran debajo de los productos como indicadores de confianza. Arrastrá ⠿ para reordenar, tocá el ojo para activar/desactivar.</p>
      {bgs.map((b, i) => (<div key={b.id} draggable onDragStart={() => dnd.start(i)} onDragEnter={() => dnd.enter(i)} onDragEnd={dnd.end} onDragOver={e => e.preventDefault()} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'grab', opacity: b.visible ? 1 : 0.5 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ opacity: 0.35 }}>⠿</span><RenderIcon value={b.icono} size={16} /><strong>{b.texto}</strong><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({secNames(b.secciones_ids)})</span></div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => toggleVisible(b)} title={b.visible ? 'Ocultar' : 'Mostrar'} style={{ padding: '2px 8px' }}>{b.visible ? <Ico n="eye" s={15} /> : <Ico n="eye-off" s={15} />}</button><button className="btn btn-outline btn-sm" onClick={() => { setEdit(b); setForm(b); setShow(true); }}><Ico n="edit" s={15} /></button><button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar badge?')) return; await api.deleteBadge(b.id); reload(); }}><Ico n="trash" s={15} /></button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nuevo'} badge</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-row"><div className="form-group"><IconPicker label="Icono" value={form.icono} onChange={v => setForm({ ...form, icono: v })} /></div><div className="form-group" style={{ flex: 1 }}><label className="form-label">Texto</label><input value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} /></div></div>
        <div className="form-group"><label className="form-label">Secciones donde mostrar</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{secciones.map(s => <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" checked={(form.secciones_ids || '').split(',').map(Number).includes(s.id)} onChange={() => toggleSec(s.id)} />{s.nombre}</label>)}</div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin selección = se muestra en todas</p></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.visible !== false} onChange={e => setForm({ ...form, visible: e.target.checked })} /> Visible</label>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div></div></div>)}
    </div>
  );
}

// ─── ADMIN: Métodos de pago (section multi-select) ───
function AdminMetodosPago() {
  const { secciones, toast, config, setConfig } = useContext(Ctx);
  const [mps, setMps] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '', instrucciones: '', icono: '💳', seccion_id: null, activo: true, orden: 0 });
  const [descuentoPct, setDescuentoPct] = useState('');
  const [edit, setEdit] = useState(null);
  const loadMps = () => api.getMetodosPagoAll().then(m => setMps(m.sort((a,b) => (a.orden||0) - (b.orden||0))));
  useEffect(() => { loadMps(); }, []);
  const descKey = (nombre) => `descuento_${(nombre || '').toLowerCase().replace(/\s+/g, '_')}`;
  const openNew = () => { setEdit(null); setForm({ nombre: '', descripcion: '', instrucciones: '', icono: '💳', seccion_id: null, activo: true, orden: 0 }); setDescuentoPct(''); setShow(true); };
  const openEdit = (m) => { setEdit(m); setForm(m); setDescuentoPct(config[descKey(m.nombre)] || ''); setShow(true); };
  const save = async () => { if (!form.nombre?.trim()) { toast('El nombre del método de pago es obligatorio', 'error'); return; } try {
    if (edit) await api.updateMetodoPago(edit.id, form); else await api.createMetodoPago(form);
    // Guardar descuento en config (clave normalizada por nombre)
    const key = descKey(form.nombre);
    const newCfg = { ...config, [key]: String(descuentoPct || '').trim() };
    // Si renombró, limpiar la clave vieja
    if (edit && edit.nombre && descKey(edit.nombre) !== key) newCfg[descKey(edit.nombre)] = '';
    await api.updateConfig(newCfg); setConfig(newCfg);
    loadMps(); setShow(false); toast('Guardado');
  } catch (e) { toast(e.message, 'error'); } };
  const saveOrder = async (re) => { for (const m of re) { await api.updateMetodoPago(m.id, m).catch(() => {}); } };
  const dnd = useDnDReorder(mps, setMps, saveOrder);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Métodos de pago</h3><button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Arrastrá para reordenar.</p>
      {mps.map((m, i) => (<div key={m.id} draggable onDragStart={() => dnd.start(i)} onDragEnter={() => dnd.enter(i)} onDragEnd={dnd.end} onDragOver={e => e.preventDefault()} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'grab' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><span style={{ opacity: 0.35, marginRight: 8 }}>⠿</span><RenderIcon value={m.icono} size={16} /> <strong>{m.nombre}</strong> {m.descripcion && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.descripcion}</span>} {config[descKey(m.nombre)] && parseFloat(config[descKey(m.nombre)]) > 0 && <span style={{ fontSize: 11, background: 'var(--success)', color: '#fff', padding: '1px 7px', borderRadius: 4, fontWeight: 700, marginLeft: 4 }}>−{config[descKey(m.nombre)]}%</span>}</div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}><Ico n="edit" s={15} /></button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteMetodoPago(m.id); loadMps(); }}><Ico n="trash" s={15} /></button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nuevo'} método de pago</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-row"><div className="form-group"><IconPicker label="Icono" value={form.icono} onChange={v => setForm({ ...form, icono: v })} /></div><div className="form-group" style={{ flex: 1 }}><label className="form-label">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div></div>
        <div className="form-group"><label className="form-label">Descripción</label><input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Instrucciones (se muestran al elegir este método)</label><textarea value={form.instrucciones} onChange={e => setForm({ ...form, instrucciones: e.target.value })} rows={3} placeholder="Ej: Transferir a CBU 0000...0000 a nombre de..." /></div>
        <div className="form-group"><label className="form-label">Sección (vacío = todas)</label>
          <select value={form.seccion_id || ''} onChange={e => setForm({ ...form, seccion_id: e.target.value ? Number(e.target.value) : null })}><option value="">Todas</option>{secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Descuento (%)</label><input type="number" value={descuentoPct} onChange={e => setDescuentoPct(e.target.value)} placeholder="Ej: 10 (vacío = sin descuento)" /><small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Se muestra el precio con este descuento en el detalle del producto.</small></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.activo !== false} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div></div></div>)}
    </div>
  );
}

// ─── ADMIN: Menú editable ───
function AdminMenu() {
  const { toast, setMenuItems: setGlobalMenu } = useContext(Ctx);
  const [items, setItems] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ titulo: '', url: '', tipo: 'link', visible: true, orden: 0 });
  const [edit, setEdit] = useState(null);
  const loadMenu = () => api.getMenuAll().then(m => { const sorted = m.sort((a,b) => (a.orden||0) - (b.orden||0)); setItems(sorted); });
  useEffect(() => { loadMenu(); }, []);
  const save = async () => { try { if (edit) await api.updateMenuItem(edit.id, form); else await api.createMenuItem(form); loadMenu(); api.getMenu().then(setGlobalMenu).catch(() => {}); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); } };
  const saveOrder = async (re) => { for (const m of re) { await api.updateMenuItem(m.id, m).catch(() => {}); } api.getMenu().then(setGlobalMenu).catch(() => {}); };
  const dnd = useDnDReorder(items, setItems, saveOrder);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Menú principal</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ titulo: '', url: '', tipo: 'link', visible: true, orden: 0 }); setShow(true); }}>+ Nuevo item</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Arrastrá para reordenar.</p>
      {items.map((m, i) => (<div key={m.id} draggable onDragStart={() => dnd.start(i)} onDragEnter={() => dnd.enter(i)} onDragEnd={dnd.end} onDragOver={e => e.preventDefault()} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'grab' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><span style={{ opacity: 0.35, marginRight: 8 }}>⠿</span><strong>{m.titulo}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.url || '(sin link)'}</span> {!m.visible && <span style={{ fontSize: 12, color: 'var(--danger)' }}>(oculto)</span>}</div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => { setEdit(m); setForm(m); setShow(true); }}><Ico n="edit" s={15} /></button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteMenuItem(m.id); loadMenu(); }}><Ico n="trash" s={15} /></button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nuevo'} item</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-group"><label className="form-label">Título</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">URL</label><input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Orden</label><input type="number" value={form.orden} onChange={e => setForm({ ...form, orden: Number(e.target.value) })} /></div></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.visible !== false} onChange={e => setForm({ ...form, visible: e.target.checked })} /> Visible</label>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div></div></div>)}
    </div>
  );
}

// ─── ADMIN: Redes sociales ───
function AdminRedes() {
  const { toast, setRedesSociales } = useContext(Ctx);
  const [redes, setRedes] = useState([])
  useEffect(() => { api.getRedesSociales().then(setRedes); }, []);
  const guardar = async () => { try { await api.updateRedesSociales(redes); setRedesSociales(redes); toast('Redes guardadas'); } catch (e) { toast(e.message, 'error'); } };
  const labels = { facebook: '📘 Facebook', instagram: '📸 Instagram', tiktok: '🎵 TikTok', whatsapp_canal: '📱 Canal WhatsApp', whatsapp_grupo: '👥 Grupo WhatsApp' };
  return (
    <div>
      <h3 style={{ marginBottom: 12 }}>Redes sociales</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Las redes activas se muestran en el pie de página.</p>
      {redes.map((r, i) => (
        <div key={r.id || i} className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 160 }}>
              <input type="checkbox" checked={r.activo} onChange={e => { const n = [...redes]; n[i] = { ...n[i], activo: e.target.checked }; setRedes(n); }} />
              {labels[r.tipo] || r.tipo}
            </label>
            <input placeholder="URL completa" value={r.url || ''} onChange={e => { const n = [...redes]; n[i] = { ...n[i], url: e.target.value }; setRedes(n); }} style={{ flex: 1 }} />
          </div>
        </div>
      ))}
      <button className="btn btn-primary" onClick={guardar} style={{ marginTop: 12 }}>Guardar redes</button>
    </div>
  );
}

// ─── ADMIN: Diseño (file upload logo/favicon, working colors, reset) ───
function AdminDiseno() {
  const { toast, design, setDesign } = useContext(Ctx);
  const [des, setDes] = useState({ ...design });
  useEffect(() => { api.getDesign().then(d => setDes(d)); }, []);

  const handleFileUpload = async (field, file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const r = await api.uploadBase64(ev.target.result, file.name);
        setDes({ ...des, [field]: r.url });
      };
      reader.readAsDataURL(file);
    } catch (e) { toast('Error al subir', 'error'); }
  };

  const guardar = async () => {
    try { await api.updateDesign(des); setDesign(des); toast('Diseño guardado');
      // Apply colors + font
      if (des.color_primario) document.documentElement.style.setProperty('--primary', des.color_primario);
      if (des.color_secundario) document.documentElement.style.setProperty('--primary-dark', des.color_secundario);
      if (des.color_acento) { document.documentElement.style.setProperty('--warning', des.color_acento); document.documentElement.style.setProperty('--accent', des.color_acento); }
      if (des.fuente) document.documentElement.style.setProperty('--font', `'${des.fuente}', sans-serif`);
    } catch (e) { toast(e.message, 'error'); }
  };

  const resetDefaults = () => { setDes({ ...des, color_primario: 'var(--primary)', color_secundario: 'var(--primary-dark)', color_acento: 'var(--warning)', plantilla: 'moderna' }); };

  return (
    <div>
      <h3 style={{ marginBottom: 12 }}>Diseño y personalización</h3>

      {/* PLANTILLAS */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h4 style={{ marginBottom: 12 }}>🎨 Plantillas</h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Elegí un estilo visual para tu tienda. Después podés personalizar los colores.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { id: 'kicks', name: 'Kicks', desc: 'Moderno y audaz', colors: { p: 'var(--primary)', s: 'var(--primary-dark)', a: 'var(--accent)' }, font: 'Archivo' },
            { id: 'minimal', name: 'Minimal', desc: 'Limpio y elegante', colors: { p: '#18181b', s: '#71717a', a: 'var(--warning)' }, font: 'Inter' },
            { id: 'tech', name: 'Tech', desc: 'Para electrónica', colors: { p: '#0ea5e9', s: '#0c4a6e', a: '#22c55e' }, font: 'Space Grotesk' },
            { id: 'classic', name: 'Classic', desc: 'Profesional neutro', colors: { p: 'var(--primary)', s: 'var(--primary-dark)', a: 'var(--warning)' }, font: 'Open Sans' },
            { id: 'dark', name: 'Dark Pro', desc: 'Oscuro premium', colors: { p: '#a78bfa', s: '#1e1b4b', a: '#f472b6' }, font: 'Outfit' },
          ].map(t => (
            <div key={t.id} onClick={() => setDes({ ...des, plantilla: t.id, color_primario: t.colors.p, color_secundario: t.colors.s, color_acento: t.colors.a, fuente: t.font })}
              className="card" style={{ padding: 12, cursor: 'pointer', border: des.plantilla === t.id ? '2px solid var(--primary)' : '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.colors.p }} />
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.colors.s }} />
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.colors.a }} />
              </div>
              <strong style={{ fontSize: 13 }}>{t.name}</strong>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</div>
              {des.plantilla === t.id && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ Activa</div>}
            </div>
          ))}
        </div>
      </div>

      {/* PALETAS DE COLORES PREDEFINIDAS */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h4 style={{ marginBottom: 12 }}>🎯 Paletas de colores</h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Aplicá una paleta rápida o editá los colores individuales abajo.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { name: 'Azul Pro', p: 'var(--primary)', s: 'var(--primary-dark)', a: 'var(--warning)' },
            { name: 'Verde Negocio', p: 'var(--success)', s: '#15803d', a: '#eab308' },
            { name: 'Rojo Audaz', p: '#dc2626', s: '#991b1b', a: '#f97316' },
            { name: 'Violeta', p: '#7c3aed', s: '#5b21b6', a: '#f472b6' },
            { name: 'Naranja', p: '#ea580c', s: '#c2410c', a: '#facc15' },
            { name: 'Turquesa', p: '#0891b2', s: '#155e75', a: '#34d399' },
            { name: 'Rosa', p: '#db2777', s: '#9d174d', a: '#fbbf24' },
            { name: 'Negro Gold', p: '#18181b', s: '#27272a', a: '#d4a853' },
          ].map(pal => (
            <button key={pal.name} onClick={() => setDes({ ...des, color_primario: pal.p, color_secundario: pal.s, color_acento: pal.a })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 12 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: pal.p }} />
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: pal.s }} />
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: pal.a }} />
              </div>
              {pal.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="form-group"><label className="form-label">Nombre de la tienda</label><input value={des.nombre_tienda || ''} onChange={e => setDes({ ...des, nombre_tienda: e.target.value })} /></div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Logo</label>
            <input type="file" accept="image/*" onChange={e => { if (e.target.files[0]) handleFileUpload('logo_url', e.target.files[0]); }} />
            {des.logo_url && <img src={des.logo_url} alt="" style={{ height: 40, marginTop: 8 }} />}
            <input value={des.logo_url || ''} onChange={e => setDes({ ...des, logo_url: e.target.value })} placeholder="O pegá URL" style={{ marginTop: 4, fontSize: 12 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Favicon</label>
            <input type="file" accept="image/*" onChange={e => { if (e.target.files[0]) handleFileUpload('favicon_url', e.target.files[0]); }} />
            {des.favicon_url && <img src={des.favicon_url} alt="" style={{ height: 24, marginTop: 8 }} />}
            <input value={des.favicon_url || ''} onChange={e => setDes({ ...des, favicon_url: e.target.value })} placeholder="O pegá URL" style={{ marginTop: 4, fontSize: 12 }} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Color primario</label><input type="color" value={des.color_primario || 'var(--primary)'} onChange={e => setDes({ ...des, color_primario: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Color secundario</label><input type="color" value={des.color_secundario || 'var(--primary-dark)'} onChange={e => setDes({ ...des, color_secundario: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Color acento</label><input type="color" value={des.color_acento || 'var(--warning)'} onChange={e => setDes({ ...des, color_acento: e.target.value })} /></div>
        </div>
        <div className="form-group"><label className="form-label">Texto del footer</label><input value={des.footer_texto || ''} onChange={e => setDes({ ...des, footer_texto: e.target.value })} /></div>

        {/* Editable texts */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <h4 style={{ marginBottom: 8 }}>📝 Textos de la Landing</h4>
          <div className="form-group"><label className="form-label">Título del hero</label><input value={des.hero_titulo || ''} onChange={e => setDes({ ...des, hero_titulo: e.target.value })} placeholder="Tu título principal" /></div>
          <div className="form-group"><label className="form-label">Subtítulo del hero</label><input value={des.hero_subtitulo || ''} onChange={e => setDes({ ...des, hero_subtitulo: e.target.value })} placeholder="Descripción corta de tu tienda" /></div>
          <div className="form-group"><label className="form-label">Texto del banner superior (marquee)</label><input value={des.promo_banner || ''} onChange={e => setDes({ ...des, promo_banner: e.target.value })} placeholder="Se usa si no hay badges. Ej: Envíos a todo el país" /></div>
        </div>

        {/* WhatsApp */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <h4 style={{ marginBottom: 8 }}>💬 WhatsApp flotante</h4>
          <div className="form-group"><label className="form-label">Número (con código país, sin +)</label><input value={des.whatsapp_numero || ''} onChange={e => setDes({ ...des, whatsapp_numero: e.target.value })} placeholder="5491100000000" /></div>
          <div className="form-group"><label className="form-label">Mensaje inicial</label><input value={des.whatsapp_mensaje || ''} onChange={e => setDes({ ...des, whatsapp_mensaje: e.target.value })} placeholder="Hola, quiero consultar..." /></div>
        </div>

        {/* Tarjetas de confianza */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <h4 style={{ marginBottom: 8 }}>🛡️ Tarjetas de confianza (hero)</h4>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Se muestran al lado del buscador en la landing.</p>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ width: 160 }}><IconPicker label={`Ícono ${n}`} value={des[`confianza_${n}_icono`] || ''} onChange={v => setDes({ ...des, [`confianza_${n}_icono`]: v })} /></div>
              <input value={des[`confianza_${n}_titulo`] || ''} onChange={e => setDes({ ...des, [`confianza_${n}_titulo`]: e.target.value })} style={{ flex: 1, minWidth: 120 }} placeholder="Título" />
              <input value={des[`confianza_${n}_sub`] || ''} onChange={e => setDes({ ...des, [`confianza_${n}_sub`]: e.target.value })} style={{ flex: 1, minWidth: 120 }} placeholder="Subtítulo" />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={guardar}>Guardar diseño</button>
          <button className="btn btn-outline" onClick={resetDefaults}>🔄 Reset colores</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: Slider Banners ───
function AdminContactos() {
  const { toast, secciones } = useContext(Ctx);
  const [items, setItems] = useState([]); const [show, setShow] = useState(false);
  const empty = { nombre: '', rol: '', telefono: '', avatar: '', seccion_id: null, online: true, mensaje_default: '', orden: 0, activo: true };
  const [form, setForm] = useState(empty); const [edit, setEdit] = useState(null);
  const load = () => api.getContactosAll().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const save = async () => { if (!form.nombre.trim() || !form.telefono.trim()) { toast('Nombre y teléfono son obligatorios', 'error'); return; } try { if (edit) await api.updateContacto(edit.id, form); else await api.createContacto(form); load(); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); } };
  const toggleActivo = async (c) => { const nv = !c.activo; setItems(items.map(x => x.id === c.id ? { ...x, activo: nv } : x)); await api.updateContacto(c.id, { ...c, activo: nv }).catch(() => {}); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Contactos de WhatsApp</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm(empty); setShow(true); }}>+ Nuevo contacto</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Contactos que aparecen en el botón flotante de WhatsApp. Podés poner varios (ej: tu número y el del local) y asignarlos a una sección o a todas.</p>
      {items.map(c => (
        <div key={c.id} className="card" style={{ padding: 12, marginBottom: 8, opacity: c.activo ? 1 : 0.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <div className="wa-avatar" style={{ width: 38, height: 38, fontSize: 15, ...(c.avatar ? { backgroundImage: `url(${c.avatar})` } : {}) }}>{!c.avatar && (c.nombre || '?').charAt(0).toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nombre} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{c.rol}</span></div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.telefono} · {c.seccion_id ? (secciones.find(s => s.id === c.seccion_id)?.nombre || 'Sección') : 'Todas las secciones'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-outline btn-sm" onClick={() => toggleActivo(c)} style={{ padding: '2px 8px' }}>{c.activo ? <Ico n="eye" s={15} /> : <Ico n="eye-off" s={15} />}</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setEdit(c); setForm({ ...empty, ...c }); setShow(true); }}><Ico n="edit" s={15} /></button>
              <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar contacto?')) return; await api.deleteContacto(c.id); load(); }}><Ico n="trash" s={15} /></button>
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="empty-state"><p>No hay contactos. Creá uno para el botón de WhatsApp.</p></div>}
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nuevo'} contacto</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Leandro" /></div>
            <div className="form-group"><label className="form-label">Rol / etiqueta</label><input value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} placeholder="Ej: Ventas mayorista" /></div>
            <div className="form-group"><label className="form-label">Número WhatsApp * (con código país, ej 5491122334455)</label><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="549..." inputMode="tel" /></div>
            <div className="form-group"><label className="form-label">Foto (URL, opcional)</label><input value={form.avatar} onChange={e => setForm({ ...form, avatar: e.target.value })} placeholder="https://..." /></div>
            <div className="form-group"><label className="form-label">Sección (vacío = todas)</label>
              <select value={form.seccion_id || ''} onChange={e => setForm({ ...form, seccion_id: e.target.value ? Number(e.target.value) : null })}><option value="">Todas</option>{secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
            </div>
            <div className="form-group"><label className="form-label">Mensaje pre-armado (opcional)</label><textarea value={form.mensaje_default} onChange={e => setForm({ ...form, mensaje_default: e.target.value })} rows={2} placeholder="Si lo dejás vacío se arma automático con el nombre del cliente" /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><input type="checkbox" checked={form.online} onChange={e => setForm({ ...form, online: e.target.checked })} /> Mostrar como "En línea"</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div>
        </div></div>
      )}
    </div>
  );
}

function AdminLeads() {
  const { toast, config } = useContext(Ctx);
  const [leads, setLeads] = useState([]);
  const load = () => api.getLeads().then(setLeads).catch(() => {});
  useEffect(() => { load(); }, []);
  const escribir = (l) => {
    const saludo = `Hola ${l.nombre}, te contacto de ${config.nombre_tienda || 'la tienda'}. Dejaste tu consulta en la web.`;
    window.open(waLink(l.telefono, saludo), '_blank');
    if (!l.contactado) { api.updateLead(l.id, { contactado: true }).then(load).catch(() => {}); }
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Leads de WhatsApp</h3><button className="btn btn-outline btn-sm" onClick={load}>↻ Actualizar</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Clientes que dejaron sus datos en el botón de contacto. Tocá "Escribir" para contactarlos directo por WhatsApp.</p>
      {leads.length === 0 ? <div className="empty-state"><p>Todavía no hay leads.</p></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leads.map(l => (
            <div key={l.id} className="card" style={{ padding: 12, opacity: l.contactado ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{l.nombre} {l.contactado && <span style={{ fontSize: 10, background: 'var(--success)', color: '#fff', padding: '1px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Contactado</span>}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.telefono} · quería hablar con {l.contacto_nombre || 'la tienda'} · {new Date(l.created_at).toLocaleString('es-AR')}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-success btn-sm" onClick={() => escribir(l)} style={{ background: '#25D366', whiteSpace: 'nowrap' }}><Ico n="message" s={14} /> Escribir</button>
                  <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar lead?')) return; await api.deleteLead(l.id); load(); }}><Ico n="trash" s={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminBarras() {
  const { toast, setBarras } = useContext(Ctx);
  const [items, setItems] = useState([]); const [show, setShow] = useState(false);
  const emptyForm = { posicion: 'top', frases: '', estilo: 'negro', color_fondo: '#232321', color_texto: '#ffffff', velocidad: 25, activo: true };
  const [form, setForm] = useState(emptyForm);
  const [edit, setEdit] = useState(null);
  const load = () => api.getBarrasAll().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const refreshPublic = () => api.getBarras().then(b => setBarras(Array.isArray(b) ? b : [])).catch(() => {});
  const save = async () => {
    if (!form.frases.trim()) { toast('Escribí al menos una frase', 'error'); return; }
    try { if (edit) await api.updateBarra(edit.id, form); else await api.createBarra(form); load(); refreshPublic(); setShow(false); toast('Guardado'); }
    catch (e) { toast(e.message, 'error'); }
  };
  const toggleActivo = async (b) => { const nv = !b.activo; setItems(items.map(x => x.id === b.id ? { ...x, activo: nv } : x)); await api.updateBarra(b.id, { ...b, activo: nv }).catch(() => {}); refreshPublic(); };
  const estilos = [
    { id: 'negro', label: 'Negro (demo)' },
    { id: 'primary', label: 'Azul' },
    { id: 'acento', label: 'Naranja' },
    { id: 'custom', label: 'Personalizado' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Barras de texto deslizantes</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm(emptyForm); setShow(true); }}>+ Nueva barra</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Barras de texto que se deslizan. Podés tener una arriba de todo y otra debajo del buscador. Separá las frases con <strong>|</strong> (barra vertical). Activá/desactivá cada una con el ojo.</p>
      {items.map(b => (
        <div key={b.id} className="card" style={{ padding: 12, marginBottom: 8, opacity: b.activo ? 1 : 0.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 700, marginRight: 8 }}>{b.posicion === 'top' ? '↑ Arriba de todo' : '↓ Bajo el buscador'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{estilos.find(e => e.id === b.estilo)?.label || b.estilo}</span>
              <div style={{ fontSize: 13, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>{(b.frases || '').split('|').map(s => s.trim()).filter(Boolean).join('  •  ')}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-outline btn-sm" onClick={() => toggleActivo(b)} title={b.activo ? 'Ocultar' : 'Mostrar'} style={{ padding: '2px 8px' }}>{b.activo ? <Ico n="eye" s={15} /> : <Ico n="eye-off" s={15} />}</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setEdit(b); setForm({ ...emptyForm, ...b }); setShow(true); }}><Ico n="edit" s={15} /></button>
              <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar barra?')) return; await api.deleteBarra(b.id); load(); refreshPublic(); }}><Ico n="trash" s={15} /></button>
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="empty-state"><p>No hay barras. Creá una para mostrar texto deslizante en el header.</p></div>}
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nueva'} barra</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Posición</label>
              <select value={form.posicion} onChange={e => setForm({ ...form, posicion: e.target.value })}>
                <option value="top">↑ Arriba de todo (sobre el logo)</option>
                <option value="search">↓ Debajo del buscador</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Frases (separadas con | )</label>
              <textarea value={form.frases} onChange={e => setForm({ ...form, frases: e.target.value })} rows={3} placeholder="Envío a todo el país | Atención 24/7 | +5000 clientes | Compra segura" />
              <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Ejemplo: Envío gratis | Cuotas sin interés | Garantía</small>
            </div>
            <div className="form-group"><label className="form-label">Estilo</label>
              <select value={form.estilo} onChange={e => setForm({ ...form, estilo: e.target.value })}>
                {estilos.map(es => <option key={es.id} value={es.id}>{es.label}</option>)}
              </select>
            </div>
            {form.estilo === 'custom' && (
              <div className="form-row">
                <div className="form-group"><label className="form-label">Color fondo</label><input type="color" value={form.color_fondo} onChange={e => setForm({ ...form, color_fondo: e.target.value })} style={{ height: 42, padding: 4 }} /></div>
                <div className="form-group"><label className="form-label">Color texto</label><input type="color" value={form.color_texto} onChange={e => setForm({ ...form, color_texto: e.target.value })} style={{ height: 42, padding: 4 }} /></div>
              </div>
            )}
            <div className="form-group"><label className="form-label">Velocidad (segundos por vuelta, más alto = más lento)</label><input type="number" value={form.velocidad} onChange={e => setForm({ ...form, velocidad: Number(e.target.value) })} min={8} max={80} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activa</label>
            {/* Preview en vivo */}
            {form.frases.trim() && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Vista previa:</div>
                <TextBar barra={form} />
              </div>
            )}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div>
        </div></div>
      )}
    </div>
  );
}

function AdminSlider() {
  const { toast } = useContext(Ctx);
  const [items, setItems] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ titulo: '', subtitulo: '', etiqueta: '', imagen: '', url_destino: '', orden: 0, activo: true });
  const [edit, setEdit] = useState(null);
  const load = () => api.getSliderAll().then(s => setItems(s.sort((a, b) => (a.orden || 0) - (b.orden || 0))));
  useEffect(() => { load(); }, []);
  const save = async () => { if (!form.imagen) { toast('Subí una imagen', 'error'); return; } try { if (edit) await api.updateSlider(edit.id, form); else await api.createSlider(form); load(); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); } };
  const dnd = useDnDReorder(items, setItems, async (re) => { for (const s of re) { await api.updateSlider(s.id, s).catch(() => {}); } });
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Slider de banners</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ titulo: '', subtitulo: '', etiqueta: '', imagen: '', url_destino: '', orden: 0, activo: true }); setShow(true); }}>+ Nuevo banner</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Imágenes que rotan automáticamente en la landing. Arrastrá para reordenar.</p>
      {items.map((s, i) => (
        <div key={s.id} draggable onDragStart={() => dnd.start(i)} onDragEnter={() => dnd.enter(i)} onDragEnd={dnd.end} onDragOver={e => e.preventDefault()}
          className="card" style={{ padding: 12, marginBottom: 8, cursor: 'grab', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ opacity: 0.35 }}>⠿</span>
          {s.imagen && <img src={s.imagen} alt="" style={{ width: 100, height: 50, objectFit: 'cover', borderRadius: 6 }} />}
          <div style={{ flex: 1 }}><strong>{s.titulo || '(sin título)'}</strong> <span style={{ fontSize: 12, color: s.activo ? 'var(--success)' : 'var(--danger)' }}>{s.activo ? '✓ Activo' : '✗ Inactivo'}</span></div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-outline btn-sm" onClick={() => { setEdit(s); setForm(s); setShow(true); }}><Ico n="edit" s={15} /></button>
            <button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteSlider(s.id); load(); }}><Ico n="trash" s={15} /></button>
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="empty-state"><p>No hay banners. Agregá uno para activar el slider en la landing.</p></div>}
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShow(false)}>✕</button>
          <h3>{edit ? 'Editar' : 'Nuevo'} banner</h3>
          <div className="form-group"><label className="form-label">Etiqueta (arriba, ej: NUEVA COLECCIÓN)</label><input value={form.etiqueta || ''} onChange={e => setForm({ ...form, etiqueta: e.target.value })} placeholder="Opcional — texto chico arriba del título" /></div>
          <div className="form-group"><label className="form-label">Título (opcional)</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Título grande sobre la imagen" /></div>
          <div className="form-group"><label className="form-label">Subtítulo (opcional)</label><input value={form.subtitulo || ''} onChange={e => setForm({ ...form, subtitulo: e.target.value })} placeholder="Texto debajo del título" /></div>
          <div className="form-group"><label className="form-label">Imagen *</label>
            <input type="file" accept="image/*" onChange={async e => { const file = e.target.files[0]; if (file) { try { const r = await api.uploadImagen(file); setForm({ ...form, imagen: r.url }); } catch { toast('Error al subir', 'error'); } } }} />
            {form.imagen && <img src={form.imagen} alt="" style={{ maxHeight: 100, marginTop: 8, borderRadius: 8 }} />}
            <input value={form.imagen} onChange={e => setForm({ ...form, imagen: e.target.value })} placeholder="O pegá URL" style={{ marginTop: 4, fontSize: 12 }} />
          </div>
          <div className="form-group"><label className="form-label">URL destino (opcional)</label><input value={form.url_destino} onChange={e => setForm({ ...form, url_destino: e.target.value })} placeholder="https://..." /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
          <button className="btn btn-primary" onClick={save} style={{ width: '100%' }}>Guardar</button>
        </div></div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FAVORITOS PAGE
// ═══════════════════════════════════════════════════════════
function FavoritosPage() {
  const { nav, toast, addToCart, getPrice } = useContext(Ctx);
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getFavoritos().then(f => { setFavs(f); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const remove = async (prodId) => { await api.removeFavorito(prodId); setFavs(favs.filter(f => f.producto_id !== prodId)); toast('Eliminado de favoritos'); };
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <button onClick={() => nav('landing')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', marginBottom: 16 }}>← Volver</button>
      <h2 style={{ fontWeight: 800, marginBottom: 16 }}>❤️ Mis favoritos ({favs.length})</h2>
      {loading ? <div className="spinner" /> : favs.length === 0 ? (
        <div className="empty-state"><h3>No tenés favoritos todavía</h3><p>Tocá el corazón en los productos para guardarlos acá.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {favs.map(f => (
            <div key={f.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ cursor: 'pointer' }} onClick={() => nav('section', f.seccion_id)}>
                {f.imagen ? <img src={f.imagen} alt="" style={{ width: '100%', height: 160, objectFit: 'contain', background: 'var(--bg)', padding: 8 }} /> : <div style={{ height: 160, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#ccc' }}>📱</div>}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', marginBottom: 4 }}>{f.categoria}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{f.nombre || f.modelo}</div>
                {f.precio_base > 0 && <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{fmtARS(getPrice ? getPrice(f) : f.precio_base)}</div>}
                <div style={{ display: 'flex', gap: 6 }}>
                  {f.stock > 0 && <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => { addToCart(f.seccion_id, f, 1); toast('Agregado'); }}>Agregar</button>}
                  <button className="btn btn-outline btn-sm" onClick={() => remove(f.producto_id)}><Ico n="trash" s={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: Envíos Custom ───
function AdminEnviosCustom() {
  const { secciones, toast, config, setConfig } = useContext(Ctx);
  const [items, setItems] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ seccion_id: null, nombre: '', descripcion: '', precio: 0, tipo: 'fijo', activo: true, gratis_desde: 0, tiempo_estimado: '', icono: 'truck', orden: 0 });
  const [edit, setEdit] = useState(null);
  const [sub, setSub] = useState('metodos');
  const [aclaracion, setAclaracion] = useState('');
  const load = () => api.getEnvioCustomAll().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { setAclaracion(config.aclaracion_envios || ''); }, [config]);
  const save = async () => { if (!form.nombre?.trim()) { toast('Nombre obligatorio', 'error'); return; } try { if (edit) await api.updateEnvioCustom(edit.id, form); else await api.createEnvioCustom(form); load(); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); } };
  const saveAclaracion = async () => { try { await api.updateConfig({ aclaracion_envios: aclaracion }); setConfig({ ...config, aclaracion_envios: aclaracion }); toast('Aclaración guardada'); } catch (e) { toast(e.message, 'error'); } };

  return (
    <div>
      <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 16 }}>Envíos</h3>
      <div className="admin-subtabs">
        <button className={`admin-subtab ${sub === 'metodos' ? 'active' : ''}`} onClick={() => setSub('metodos')}>Métodos de envío</button>
        <button className={`admin-subtab ${sub === 'gratis' ? 'active' : ''}`} onClick={() => setSub('gratis')}>Envío gratis y stock</button>
        <button className={`admin-subtab ${sub === 'aclaracion' ? 'active' : ''}`} onClick={() => setSub('aclaracion')}>Aclaraciones</button>
      </div>

      {sub === 'gratis' && <SectionStockConfig />}

      {sub === 'aclaracion' && (
        <div className="card" style={{ padding: 16 }}>
          <h4 style={{ marginBottom: 4 }}>Aclaraciones sobre envíos</h4>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Este texto aparece en el checkout, arriba de los métodos de envío. Ej: horarios de despacho, avisar antes de retirar, etc.</p>
          <textarea value={aclaracion} onChange={e => setAclaracion(e.target.value)} rows={3} style={{ width: '100%', marginBottom: 10 }} placeholder="Armado y despacho de pedidos 24/48hs. Avisar antes de retirar por el local." />
          <button className="btn btn-primary btn-sm" onClick={saveAclaracion}>Guardar aclaración</button>
        </div>
      )}

      {sub === 'metodos' && <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h4>Métodos de envío custom</h4><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ seccion_id: null, nombre: '', descripcion: '', precio: 0, tipo: 'fijo', activo: true, gratis_desde: 0, tiempo_estimado: '', icono: 'truck', orden: 0 }); setShow(true); }}>+ Nuevo</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Aparecen junto a Andreani en el checkout. Ej: Uber Moto CABA, Retiro Local, Didi.</p>
      {items.map(m => (
        <div key={m.id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <RenderIcon value={m.icono} size={20} />
          <div style={{ flex: 1 }}><strong>{m.nombre}</strong> {m.descripcion && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— {m.descripcion}</span>}
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{secciones.find(s => s.id === m.seccion_id)?.nombre || 'Todas'} · {m.precio > 0 ? fmtARS(m.precio) : 'Gratis'} {m.tiempo_estimado && `· ${m.tiempo_estimado}`}</div>
          </div>
          <span style={{ fontSize: 11, color: m.activo ? 'var(--success)' : 'var(--danger)' }}>{m.activo ? '✓' : '✗'}</span>
          <button className="btn btn-outline btn-sm" onClick={() => { setEdit(m); setForm(m); setShow(true); }}><Ico n="edit" s={15} /></button>
          <button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteEnvioCustom(m.id); load(); }}><Ico n="trash" s={15} /></button>
        </div>
      ))}
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShow(false)}>✕</button>
          <h3>{edit ? 'Editar' : 'Nuevo'} envío custom</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Este es un <b>método de envío</b> (ej: Andreani, Moto, Retiro). No es la compra mínima — eso se configura en "Diseño y Config → Config por sección".</p>
          <div className="form-group"><label className="form-label">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Uber Moto CABA" /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="A coordinar por WhatsApp" /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Costo del envío $</label><input type="number" value={form.precio} onChange={e => setForm({ ...form, precio: Number(e.target.value) })} placeholder="0 = gratis" /><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Lo que paga el cliente por este envío</span></div>
            <div className="form-group"><label className="form-label">Envío gratis desde $</label><input type="number" value={form.gratis_desde} onChange={e => setForm({ ...form, gratis_desde: Number(e.target.value) })} placeholder="0 = nunca" /><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Si el pedido supera este monto, el envío es gratis</span></div>
          </div>
          <div className="form-group"><label className="form-label">Tiempo estimado</label><input value={form.tiempo_estimado} onChange={e => setForm({ ...form, tiempo_estimado: e.target.value })} placeholder="2-3 horas" /></div>
          <div className="form-group"><label className="form-label">Sección</label><select value={form.seccion_id || ''} onChange={e => setForm({ ...form, seccion_id: e.target.value ? Number(e.target.value) : null })}><option value="">Todas</option>{secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
          <IconPicker label="Ícono" value={form.icono} onChange={v => setForm({ ...form, icono: v })} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
          <button className="btn btn-primary" onClick={save} style={{ width: '100%' }}>Guardar</button>
        </div></div>
      )}
      </>}
    </div>
  );
}

// ─── ADMIN: Configuración completa (restored from v2) ───
// ─── Section-level stock + envio config ───
function SectionStockConfig() {
  const { secciones, setSecciones, toast, config, setConfig } = useContext(Ctx);
  const [secData, setSecData] = useState({});
  useEffect(() => { const d = {}; secciones.forEach(s => { d[s.id] = { ignorar_stock: s.ignorar_stock, permitir_sin_stock: s.permitir_sin_stock, cp_origen: s.cp_origen || '1888', gratis_desde: config[`envio_gratis_desde_${s.id}`] || '' }; }); setSecData(d); }, [secciones, config]);
  const saveSec = async (sec) => {
    try {
      const d = secData[sec.id];
      await api.updateSeccion(sec.id, { ...sec, ignorar_stock: d.ignorar_stock, permitir_sin_stock: d.permitir_sin_stock, cp_origen: d.cp_origen });
      const upd = { [`envio_gratis_desde_${sec.id}`]: String(d.gratis_desde || 0) };
      await api.updateConfig(upd);
      setConfig({ ...config, ...upd });
      toast(`${sec.nombre} actualizada`);
      api.getSecciones().then(setSecciones).catch(() => {});
    } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="card" style={{ padding: 16, marginTop: 16 }}>
      <h4 style={{ marginBottom: 4 }}>Envío gratis y stock por sección</h4>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>El "envío gratis desde" muestra una barra en el carrito. La compra mínima ahora se configura en Ventas → Reglas de compra.</p>
      {secciones.map(s => (
        <div key={s.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
          <strong>{s.nombre}</strong>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><input type="checkbox" checked={secData[s.id]?.ignorar_stock || false} onChange={e => setSecData({ ...secData, [s.id]: { ...secData[s.id], ignorar_stock: e.target.checked } })} /> Ignorar stock (vende siempre)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><input type="checkbox" checked={secData[s.id]?.permitir_sin_stock || false} onChange={e => setSecData({ ...secData, [s.id]: { ...secData[s.id], permitir_sin_stock: e.target.checked } })} /> Permitir sin stock</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ fontSize: 12 }}>CP Origen:</label>
              <input value={secData[s.id]?.cp_origen || ''} onChange={e => setSecData({ ...secData, [s.id]: { ...secData[s.id], cp_origen: e.target.value } })} style={{ width: 80, fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ fontSize: 12 }}>🚚 Envío gratis desde $:</label>
              <input type="number" value={secData[s.id]?.gratis_desde || ''} onChange={e => setSecData({ ...secData, [s.id]: { ...secData[s.id], gratis_desde: e.target.value } })} placeholder="0 = no" style={{ width: 110, fontSize: 12 }} />
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => saveSec(s)} style={{ marginTop: 6 }}>Guardar {s.nombre}</button>
        </div>
      ))}
    </div>
  );
}

function AdminConfig() {
  const { toast, config, setConfig, listas } = useContext(Ctx);
  const [c, setC] = useState({ ...config });
  const [m, setM] = useState({ activo: config.mantenimiento_activo === 'true', mensaje: config.mantenimiento_mensaje || '', countdown: config.mantenimiento_countdown || '' });

  useEffect(() => { api.getConfig().then(cfg => { setC(cfg); setM({ activo: cfg.mantenimiento_activo === 'true', mensaje: cfg.mantenimiento_mensaje || '', countdown: cfg.mantenimiento_countdown || '' }); }); }, []);

  const saveAll = async () => {
    try { await api.updateConfig(c); setConfig(c); toast('Configuración guardada'); } catch (e) { toast(e.message, 'error'); }
  };

  const saveMaint = async () => {
    try { await api.setMaintenanceMode(m.activo, m.mensaje, m.countdown); toast(m.activo ? 'Mantenimiento activado' : 'Mantenimiento desactivado'); } catch (e) { toast(e.message, 'error'); }
  };

  const handleLogoUpload = (file) => {
    const r = new FileReader();
    r.onload = ev => setC({ ...c, logo: ev.target.result });
    r.readAsDataURL(file);
  };

  return (
    <div>
      <h3 style={{ marginBottom: 12 }}>Configuración general</h3>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="form-group"><label className="form-label">Nombre del negocio</label><input value={c.nombre_negocio || ''} onChange={e => setC({ ...c, nombre_negocio: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">WhatsApp (sin +)</label><input value={c.whatsapp || ''} onChange={e => setC({ ...c, whatsapp: e.target.value })} placeholder="5491100000000" /></div>
        <div className="form-group"><label className="form-label">WhatsApp flotante (si es diferente)</label><input value={c.whatsapp_flotante || ''} onChange={e => setC({ ...c, whatsapp_flotante: e.target.value })} placeholder="5491100000000" /></div>
        <div className="form-group"><label className="form-label">Logo</label>
          <input type="file" accept="image/*" onChange={e => { if (e.target.files[0]) handleLogoUpload(e.target.files[0]); }} />
          {c.logo && <img src={c.logo} alt="" style={{ height: 50, marginTop: 8 }} />}
        </div>
        <div className="form-group"><label className="form-label">Lista para vitrina (mayorista sin login)</label>
          <select value={c.vitrina_lista || ''} onChange={e => setC({ ...c, vitrina_lista: e.target.value })}>
            <option value="">Sin vitrina</option>{listas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><input type="checkbox" checked={c.mostrar_stock !== 'false'} onChange={e => setC({ ...c, mostrar_stock: e.target.checked ? 'true' : 'false' })} /> Mostrar botón stock en catálogo</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><input type="checkbox" checked={c.alertas_stock === 'true'} onChange={e => setC({ ...c, alertas_stock: e.target.checked ? 'true' : 'false' })} /> Alertas de stock bajo</label>

        {/* Banner */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <h4 style={{ marginBottom: 8 }}>Banner publicitario</h4>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Se muestra al pie del catálogo. Dejá vacío para ocultar.</p>
          <div className="form-group"><label className="form-label">Texto del banner</label><input value={c.banner_texto || ''} onChange={e => setC({ ...c, banner_texto: e.target.value })} placeholder="¿Querés tu propio catálogo?" /></div>
          <div className="form-group"><label className="form-label">WhatsApp del banner</label><input value={c.banner_wa || ''} onChange={e => setC({ ...c, banner_wa: e.target.value })} placeholder="5491122525568" /></div>
        </div>

        {/* Info pagos/envíos */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <div className="form-group"><label className="form-label">Info de pagos (para clientes)</label><textarea value={c.info_pagos || ''} onChange={e => setC({ ...c, info_pagos: e.target.value })} rows={3} /></div>
          <div className="form-group"><label className="form-label">Info de envíos (para clientes)</label><textarea value={c.info_envios || ''} onChange={e => setC({ ...c, info_envios: e.target.value })} rows={3} /></div>
        </div>

        {/* Los descuentos por método de pago se configuran ahora en la sección "Métodos de pago" */}

        {/* Dolar blue manual fallback */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <div className="form-group"><label className="form-label">Dólar blue manual (fallback si la API falla)</label><input type="number" value={c.dolar_blue || ''} onChange={e => setC({ ...c, dolar_blue: e.target.value })} placeholder="Se busca automáticamente de dolarapi.com" /></div>
        </div>

        <button className="btn btn-primary" onClick={saveAll} style={{ marginTop: 16, width: '100%' }}>Guardar configuración</button>
      </div>

      {/* Section-level config */}
      <SectionStockConfig />

      {/* Mantenimiento */}
      <div className="card" style={{ padding: 16 }}>
        <h4 style={{ marginBottom: 8 }}>🔧 Modo mantenimiento</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><input type="checkbox" checked={m.activo} onChange={e => setM({ ...m, activo: e.target.checked })} /> Activar mantenimiento</label>
        <div className="form-group"><label className="form-label">Mensaje personalizado</label><input value={m.mensaje} onChange={e => setM({ ...m, mensaje: e.target.value })} placeholder="Estamos trabajando en mejoras..." /></div>
        <div className="form-group"><label className="form-label">Fecha de vuelta (countdown)</label><input type="datetime-local" value={m.countdown} onChange={e => setM({ ...m, countdown: e.target.value })} /></div>
        <button className="btn btn-warning" onClick={saveMaint}>{m.activo ? 'Guardar y activar mantenimiento' : 'Guardar (desactivado)'}</button>
      </div>
    </div>
  );
}
