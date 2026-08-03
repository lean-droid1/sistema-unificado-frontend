import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from 'react';
import * as api from './api';

// ═══════════════════════════════════════════════════════════
// App.jsx — Sistema Unificado v4 (COMPLETO: v2 features + v3 features + fixes)
// ═══════════════════════════════════════════════════════════

const fmt = n => Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtARS = n => `$${fmt(n)}`;
const openWA = (num, msg) => window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');

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
  const [page, setPage] = useState('landing');
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => localStorage.getItem('gm_dark') === 'true');
  const [mobileMenu, setMobileMenu] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  const [secciones, setSecciones] = useState([]);
  const [config, setConfig] = useState({});
  const [design, setDesign] = useState({});
  const [seccionActual, setSeccionActual] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_cart') || '{}'); } catch { return {}; } });
  const [menuItems, setMenuItems] = useState([]);
  const [redesSociales, setRedesSociales] = useState([]);
  const [badges, setBadges] = useState([]);
  const [listas, setListas] = useState([]);
  const [preciosFijos, setPreciosFijos] = useState([]);

  const [adminTab, setAdminTab] = useState('dashboard');
  const [adminSeccion, setAdminSeccion] = useState('all');

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('gm_dark', dark);
  }, [dark]);

  // Save cart
  useEffect(() => { localStorage.setItem('gm_cart', JSON.stringify(cart)); }, [cart]);

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
        if (api.getToken()) {
          try { const me = await api.getMe(); setUser(me); }
          catch { api.logout(); }
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
    if (secId) {
      const sec = secciones.find(s => s.id === Number(secId) || s.slug === secId);
      setSeccionActual(sec || null);
    }
    setPage(p); setMobileMenu(false); window.scrollTo(0, 0);
  }, [secciones]);

  // Cart helpers
  const cartForSection = (secId) => cart[secId] || [];
  const cartCount = Object.values(cart).reduce((s, items) => s + items.length, 0);
  const addToCart = (secId, product, qty = 1, precio) => {
    setCart(prev => {
      const items = [...(prev[secId] || [])];
      const existing = items.find(i => i.id === product.id);
      if (existing) existing.qty += qty;
      else items.push({ ...product, qty, precio_unitario: precio || product.precio_base });
      return { ...prev, [secId]: items };
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
  const handleLogin = async (usuario, password) => {
    try {
      const data = await api.login(usuario, password);
      setUser(data.user); toast('Bienvenido');
      if (['admin','subadmin'].includes(data.user.rol)) nav('admin');
      else nav('landing');
    } catch (e) { toast(e.message, 'error'); }
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
    redesSociales, setRedesSociales, badges, setBadges, listas, setListas,
    preciosFijos, setPreciosFijos, adminTab, setAdminTab, adminSeccion, setAdminSeccion,
    cartForSection, cartCount, addToCart, removeFromCart, updateCartQty, clearCart,
    handleLogin, handleLogout, getPrice, userLista, isAdmin, nav, fmt, fmtARS, openWA
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>;

  // Route
  const renderPage = () => {
    switch (page) {
      case 'section': return seccionActual ? <SectionPage /> : <Landing />;
      case 'product': return selectedProduct ? <ProductDetailPage /> : <Landing />;
      case 'cart': return seccionActual ? <CartPage /> : <Landing />;
      case 'login': return <LoginPage />;
      case 'register': return <RegisterPage />;
      case 'admin': return isAdmin ? <AdminPanel /> : <Landing />;
      case 'account': return user ? <AccountPanel /> : <LoginPage />;
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
function Header() {
  const { user, nav, page, dark, setDark, cartCount, isAdmin, handleLogout, design, menuItems } = useContext(Ctx);
  const [mobMenu, setMobMenu] = useState(false);

  return (
    <>
      {/* KICKS promo banner */}
      <div style={{ background: '#232321', color: '#fff', textAlign: 'center', padding: '8px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <span style={{ color: '#FFA52F' }}>★</span> {design.promo_banner || 'Envíos a todo el país — Comprá seguro'} <span style={{ color: '#FFA52F' }}>★</span>
      </div>
      <header className="header">
        <div className="header-inner">
          <button className="header-logo" onClick={() => nav('landing')}>
            {design.logo_url ? <img src={design.logo_url} alt="" style={{ height: 36 }} /> : <span style={{ background: '#4A69E2', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 16, fontWeight: 900, letterSpacing: '-0.04em' }}>K</span>}
            <span>{design.nombre_tienda || 'MI TIENDA'}</span>
          </button>
          <nav className="header-nav desktop-only">
            {menuItems.map(m => (
              <a key={m.id} href={m.url || '#'} onClick={e => { if (!m.url || m.url === '#') { e.preventDefault(); } }}>{m.titulo}</a>
            ))}
          </nav>
          <div className="header-right">
            <button className="icon-btn" onClick={() => setDark(!dark)} title="Modo oscuro">{dark ? '☀️' : '🌙'}</button>
            <button className="icon-btn cart-btn" onClick={() => nav('cart')} style={{ position: 'relative' }}>
              🛒 {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
            {user ? (
              <>
                {isAdmin && <button className="btn btn-sm btn-primary desktop-only" onClick={() => nav('admin')}>⚙ PANEL</button>}
                <button className="btn btn-sm btn-outline desktop-only" onClick={() => nav('account')}>MI CUENTA</button>
                <button className="btn btn-sm btn-outline desktop-only" onClick={handleLogout}>SALIR</button>
              </>
            ) : (
              <button className="btn btn-sm btn-warning desktop-only" onClick={() => nav('login')} style={{ background: '#FFA52F', color: '#232321', borderColor: '#FFA52F', fontWeight: 800 }}>INGRESAR</button>
            )}
            <button className="hamburger mobile-only" onClick={() => setMobMenu(!mobMenu)}>☰</button>
          </div>
        </div>
        {mobMenu && (
          <div className="mobile-menu" style={{ background: '#232321', padding: '16px 20px' }}>
            {menuItems.map(m => <a key={m.id} href={m.url || '#'} style={{ color: '#fff', fontWeight: 600, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em' }} onClick={() => setMobMenu(false)}>{m.titulo}</a>)}
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            {user ? (
              <>
                {isAdmin && <button style={{ color: '#FFA52F', fontWeight: 700 }} onClick={() => { setMobMenu(false); nav('admin'); }}>⚙ Panel admin</button>}
                <button style={{ color: '#fff' }} onClick={() => { setMobMenu(false); nav('account'); }}>Mi cuenta</button>
                <button style={{ color: '#fff' }} onClick={() => { setMobMenu(false); handleLogout(); }}>Cerrar sesión</button>
              </>
            ) : (
              <>
                <button style={{ color: '#FFA52F', fontWeight: 700 }} onClick={() => { setMobMenu(false); nav('login'); }}>Ingresar</button>
                <button style={{ color: '#fff' }} onClick={() => { setMobMenu(false); nav('register'); }}>Registrarse</button>
              </>
            )}
          </div>
        )}
      </header>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════
function Footer() {
  const { design, redesSociales } = useContext(Ctx);
  const activas = redesSociales.filter(r => r.activo && r.url);
  const labels = {
    facebook: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    instagram: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    tiktok: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
    whatsapp_canal: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
    whatsapp_grupo: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  };
  return (
    <footer className="footer" style={{ background: '#232321', padding: '48px 24px 32px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: 16 }}>
          {design.nombre_tienda || 'MI TIENDA'}
        </div>
        {activas.length > 0 && (
          <div className="footer-social" style={{ marginBottom: 20 }}>
            {activas.map(r => <a key={r.id} href={r.url} target="_blank" rel="noopener" style={{ color: 'rgba(255,255,255,0.6)' }}>{labels[r.tipo] || '🔗'} {r.tipo.replace('_', ' ')}</a>)}
          </div>
        )}
        <div style={{ width: 40, height: 3, background: '#4A69E2', margin: '0 auto 16px', borderRadius: 2 }} />
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{design.footer_texto || '© 2026 — Todos los derechos reservados'}</p>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════
// WHATSAPP FLOAT
// ═══════════════════════════════════════════════════════════
function WhatsAppFloat() {
  const { config } = useContext(Ctx);
  if (!config.whatsapp && !config.whatsapp_flotante) return null;
  const num = config.whatsapp_flotante || config.whatsapp;
  return (
    <a href={`https://wa.me/${num}`} target="_blank" rel="noopener" className="wa-float" title="WhatsApp">
      💬
    </a>
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
// LANDING PAGE
// ═══════════════════════════════════════════════════════════
function Landing() {
  const { secciones, badges, nav, toast, design } = useContext(Ctx);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);
  const [showPopup, setShowPopup] = useState(null);

  useEffect(() => {
    api.getPopups().then(p => { if (p.length) setShowPopup(p[0]); }).catch(() => {});
    api.getBadges().then(r => {}).catch(() => {});
  }, []);

  const doSearch = async () => {
    if (search.length < 2) return;
    const data = await api.busquedaGlobal(search);
    setResults(data);
    api.trackSearch(search, data.total);
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

      {/* KICKS Hero */}
      <div style={{ background: '#232321', borderRadius: 24, margin: '16px 20px', padding: '56px 32px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(74,105,226,0.15)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,165,47,0.1)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: '#4A69E2', color: '#fff', padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>CATÁLOGO ONLINE</span>
          <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 12 }}>
            {design.nombre_tienda || 'MI TIENDA'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: 500, marginBottom: 24 }}>
            Encontrá lo que necesitás en todas las secciones
          </p>
          <div style={{ display: 'flex', gap: 8, maxWidth: 520, margin: '0 auto' }}>
            <input placeholder="¿Qué estás buscando?" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
              style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 12, padding: '14px 18px', fontSize: 15 }} />
            <button onClick={doSearch} style={{ background: '#FFA52F', color: '#232321', border: 'none', borderRadius: 12, padding: '14px 24px', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}>BUSCAR</button>
          </div>
        </div>
      </div>

      {/* Search results */}
      {results && (
        <div style={{ maxWidth: 800, margin: '0 auto 30px', padding: '0 16px' }}>
          {results.total === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No se encontraron resultados</p> : (
            results.resultados.map(r => (
              <div key={r.seccion.id} style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12, fontWeight: 800 }}>{r.seccion.nombre} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 14 }}>({r.productos.length})</span></h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {r.productos.map(p => (
                    <div key={p.id} className="card" style={{ padding: 16, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }} onClick={() => nav('section', r.seccion.id)}>
                      {p.imagen ? <img src={p.imagen} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📦</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre || p.modelo}</div>
                        <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>{p.categoria}</div>
                        {p.precio_base > 0 && <div style={{ fontWeight: 900, fontSize: 15, marginTop: 2 }}>{fmtARS(p.precio_base)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => nav('section', r.seccion.id)} style={{ marginTop: 8 }}>Ver todo en {r.seccion.nombre} →</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* KICKS Section cards */}
      <div className="sections-grid">
        {secciones.filter(s => s.visible !== false).map(s => (
          <div key={s.id} className="section-card" onClick={() => nav('section', s.id)}>
            {s.imagen ? <img src={s.imagen} alt="" /> : (
              <div style={{ height: 200, background: 'linear-gradient(135deg, #4A69E2 0%, #232321 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <span style={{ fontSize: 56, opacity: 0.3 }}>📦</span>
                <div style={{ position: 'absolute', bottom: 16, left: 16 }}>
                  <span style={{ background: '#FFA52F', color: '#232321', padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>VER SECCIÓN</span>
                </div>
              </div>
            )}
            <div className="section-card-body">
              <h2>{s.nombre}</h2>
              <p>{s.descripcion}</p>
              {s.requiere_aprobacion && <span className="badge-tag">🔒 Acceso con aprobación</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="badges-row">
          {badges.map(b => <div key={b.id} className="badge-item"><span className="badge-icon">{b.icono}</span><span>{b.texto}</span></div>)}
        </div>
      )}
    </div>
  );
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
  const [total, setTotal] = useState(0);
  const [promos, setPromos] = useState([]);
  const [secBadges, setSecBadges] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [dolarBlue, setDolarBlue] = useState(null);

  const esMayorista = sec?.slug === 'mayorista';
  const esDropshipping = sec?.slug === 'dropshipping';

  useEffect(() => {
    if (!sec) return;
    api.trackSectionView(sec.nombre);
    loadData();
  }, [sec?.id, catFiltro, busqueda, pagina]);

  if (!sec) return <Landing />;

  const loadData = async () => {
    try {
      const [prodData, cats, promoData, bdg, mp] = await Promise.all([
        api.getProductos({ seccion_id: sec.id, categoria: catFiltro, q: busqueda, page: pagina }),
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
    <div style={{ padding: 20 }}>
      {/* BACK BUTTON */}
      <button className="btn btn-outline btn-sm" onClick={() => nav('landing')} style={{ marginBottom: 16 }}>← Volver al inicio</button>

      <h2>{sec.nombre}</h2>
      {sec.descripcion && <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{sec.descripcion}</p>}

      {/* Badges de sección */}
      {secBadges.length > 0 && (
        <div className="badges-row" style={{ marginBottom: 16 }}>
          {secBadges.map(b => <div key={b.id} className="badge-item"><span>{b.icono}</span><span>{b.texto}</span></div>)}
        </div>
      )}

      {/* Dolar blue for mayorista */}
      {esMayorista && dolarBlue && (
        <div className="card" style={{ padding: '8px 16px', marginBottom: 16, display: 'inline-block' }}>
          💵 Dólar Blue: <strong>${fmt(dolarBlue)}</strong>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input placeholder="Buscar en esta sección..." value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} style={{ flex: 1, minWidth: 200 }} />
        <select value={catFiltro} onChange={e => { setCatFiltro(e.target.value); setPagina(1); }}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
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
                  <button className="btn btn-primary btn-sm" onClick={() => addToCart(sec.id, p, 1, precio.final)}>
                    Agregar 🛒
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {productos.length === 0 && <div className="empty-state"><h3>No hay productos</h3></div>}

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          {pagina > 1 && <button className="btn btn-outline btn-sm" onClick={() => setPagina(pagina - 1)}>← Anterior</button>}
          <span style={{ padding: '6px 12px' }}>Pág {pagina} / {Math.ceil(total / 50)}</span>
          {pagina < Math.ceil(total / 50) && <button className="btn btn-outline btn-sm" onClick={() => setPagina(pagina + 1)}>Siguiente →</button>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CART PAGE
// ═══════════════════════════════════════════════════════════
function CartPage() {
  const { seccionActual: sec, user, nav, toast, cartForSection, removeFromCart, updateCartQty, clearCart } = useContext(Ctx);
  const [cupon, setCupon] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState('');
  const [metodos, setMetodos] = useState([]);
  const [notas, setNotas] = useState('');

  useEffect(() => { if (sec) api.getMetodosPago(sec.id).then(setMetodos).catch(() => {}); }, [sec?.id]);

  if (!sec) return <Landing />;
  const items = cartForSection(sec.id);
  const subtotal = items.reduce((s, i) => s + (i.precio_unitario || i.precio_base) * i.qty, 0);
  const total = Math.max(0, subtotal - descuento);

  const aplicarCupon = async () => {
    try {
      const r = await api.validarCupon(cupon, sec.id, subtotal, metodoPago, items);
      setDescuento(r.descuento); toast(`Cupón aplicado: -$${fmt(r.descuento)}`);
    } catch (e) { toast(e.message, 'error'); }
  };

  const checkout = async () => {
    if (!user) { toast('Necesitás iniciar sesión para comprar', 'warning'); nav('login'); return; }
    if (!items.length) { toast('El carrito está vacío', 'warning'); return; }
    try {
      await api.createPedido({
        seccion_id: sec.id, tipo: 'pedido', metodo_pago: metodoPago, notas,
        cupon_codigo: cupon, subtotal, descuento, total,
        items: items.map(i => ({ producto_id: i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: i.nombre || i.modelo, cantidad: i.qty, precio_unitario: i.precio_unitario || i.precio_base, precio_base: i.precio_base }))
      });
      clearCart(sec.id);
      toast('¡Pedido creado!'); nav('landing');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}>
      <button className="btn btn-outline btn-sm" onClick={() => nav('section', sec.id)} style={{ marginBottom: 16 }}>← Volver a {sec.nombre}</button>
      <h2>🛒 Carrito — {sec.nombre}</h2>

      {items.length === 0 ? (
        <div className="empty-state"><h3>Carrito vacío</h3><button className="btn btn-primary" onClick={() => nav('section', sec.id)}>Ver productos</button></div>
      ) : (
        <>
          {items.map(i => (
            <div key={i.id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
              {i.imagen && <img src={i.imagen} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />}
              <div style={{ flex: 1 }}>
                <strong>{i.nombre || i.modelo}</strong>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{i.categoria} — {fmtARS(i.precio_unitario || i.precio_base)} c/u</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => updateCartQty(sec.id, i.id, i.qty - 1)}>-</button>
                <span style={{ padding: '0 8px', fontWeight: 700 }}>{i.qty}</span>
                <button className="btn btn-outline btn-sm" onClick={() => updateCartQty(sec.id, i.id, i.qty + 1)}>+</button>
              </div>
              <span style={{ fontWeight: 700, minWidth: 80, textAlign: 'right' }}>{fmtARS((i.precio_unitario || i.precio_base) * i.qty)}</span>
              <button className="btn btn-danger btn-sm" onClick={() => removeFromCart(sec.id, i.id)}>✕</button>
            </div>
          ))}

          {/* Coupon */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input placeholder="Código de cupón" value={cupon} onChange={e => setCupon(e.target.value.toUpperCase())} style={{ flex: 1 }} />
            <button className="btn btn-outline" onClick={aplicarCupon}>Aplicar</button>
          </div>

          {/* Payment methods */}
          {metodos.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label className="form-label">Método de pago</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {metodos.map(m => (
                  <button key={m.id} className={`btn ${metodoPago === m.nombre ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMetodoPago(m.nombre)}>
                    {m.icono} {m.nombre}
                  </button>
                ))}
              </div>
              {metodoPago && metodos.find(m => m.nombre === metodoPago)?.instrucciones && (
                <div className="card" style={{ padding: 12, marginTop: 8, fontSize: 13 }}>
                  {metodos.find(m => m.nombre === metodoPago).instrucciones}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div style={{ marginTop: 16 }}>
            <textarea placeholder="Notas del pedido (opcional)" value={notas} onChange={e => setNotas(e.target.value)} rows={2} style={{ width: '100%' }} />
          </div>

          {/* Totals */}
          <div className="card" style={{ padding: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><strong>{fmtARS(subtotal)}</strong></div>
            {descuento > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}><span>Descuento</span><strong>-{fmtARS(descuento)}</strong></div>}
            <hr />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18 }}><span>Total</span><strong>{fmtARS(total)}</strong></div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: '14px' }} onClick={checkout}>
            Confirmar pedido
          </button>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRODUCT DETAIL PAGE
// ═══════════════════════════════════════════════════════════
function ProductDetailPage() {
  const { selectedProduct: p, seccionActual: sec, nav, toast, addToCart, config, user } = useContext(Ctx);
  const [qty, setQty] = useState(1);
  const [metodosPago, setMetodosPago] = useState([]);

  useEffect(() => {
    if (sec) api.getMetodosPago(sec.id).then(setMetodosPago).catch(() => {});
  }, [sec?.id]);

  if (!p) return <Landing />;

  const precioBase = Number(p.precio_base) || 0;
  const precioFinal = p.precioFinal || precioBase;
  const precioOriginal = p.precioOriginal;
  const sinStock = !p.stock || p.stock <= 0;

  // Precios por método de pago (si hay config)
  const preciosMetodo = metodosPago.filter(m => m.activo).map(m => {
    const descStr = (config[`descuento_${m.nombre.toLowerCase().replace(/\s+/g, '_')}`] || '').trim();
    const desc = parseFloat(descStr);
    if (!desc || isNaN(desc)) return null;
    return { nombre: m.nombre, icono: m.icono, precio: Math.round(precioFinal * (1 - desc / 100)), descuento: desc };
  }).filter(Boolean);

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <button className="btn btn-outline btn-sm" onClick={() => nav('section', sec?.id)} style={{ marginBottom: 16 }}>← Volver a {sec?.nombre || 'productos'}</button>

      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        <span style={{ cursor: 'pointer' }} onClick={() => nav('landing')}>Inicio</span> / <span style={{ cursor: 'pointer' }} onClick={() => nav('section', sec?.id)}>{sec?.nombre}</span> / {p.categoria && <><span>{p.categoria}</span> / </>}
        <span style={{ color: 'var(--text)' }}>{p.nombre || p.modelo}</span>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Image */}
        <div style={{ flex: '1 1 350px', minWidth: 280 }}>
          <div style={{ background: 'var(--border-light)', borderRadius: 'var(--radius)', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, position: 'relative' }}>
            {p.envio_gratis && <span className="pbadge pbadge-shipping" style={{ position: 'absolute', top: 12, left: 12 }}>ENVÍO GRATIS</span>}
            {precioOriginal && <span className="pbadge pbadge-discount" style={{ position: 'absolute', top: 12, right: 12 }}>{p.descuentoPct}% OFF</span>}
            {p.imagen ? <img src={p.imagen} alt="" style={{ maxWidth: '100%', maxHeight: 350, objectFit: 'contain', borderRadius: 8 }} /> : <span style={{ fontSize: 64, color: 'var(--text-muted)' }}>📦</span>}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: '1 1 350px', minWidth: 280 }}>
          <div className="product-cat" style={{ marginBottom: 4 }}>{p.categoria}</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>{p.nombre || p.modelo}</h1>

          {/* Price */}
          <div style={{ marginBottom: 16 }}>
            {precioOriginal ? (
              <div><span className="price-old" style={{ fontSize: 18 }}>{fmtARS(precioOriginal)}</span> <span className="price-new" style={{ fontSize: 28 }}>{fmtARS(precioFinal)}</span></div>
            ) : (
              <span className="price-new" style={{ fontSize: 28 }}>{fmtARS(precioFinal)}</span>
            )}
          </div>

          {/* Precios por método de pago */}
          {preciosMetodo.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {preciosMetodo.map(pm => (
                <div key={pm.nombre} style={{ fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{pm.icono}</span>
                  <strong>{fmtARS(pm.precio)}</strong>
                  <span style={{ color: 'var(--success)', fontSize: 12 }}>pagando con {pm.nombre} -{pm.descuento}%</span>
                </div>
              ))}
            </div>
          )}

          {p.envio_gratis && <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>🚚 ¡Envío gratis!</p>}

          {p.descripcion && <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>{p.descripcion}</p>}
          {p.compatibilidad && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Compatible: {p.compatibilidad}</p>}

          {/* Stock */}
          {sinStock ? (
            <div style={{ padding: '12px 16px', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontWeight: 600, marginBottom: 16 }}>Sin stock</div>
          ) : (
            <>
              {/* Qty + Add to cart */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ background: 'none', border: 'none', padding: '10px 14px', fontSize: 18, fontWeight: 700 }}>−</button>
                  <span style={{ padding: '10px 16px', fontWeight: 700, fontSize: 16, minWidth: 40, textAlign: 'center' }}>{qty}</span>
                  <button onClick={() => setQty(qty + 1)} style={{ background: 'none', border: 'none', padding: '10px 14px', fontSize: 18, fontWeight: 700 }}>+</button>
                </div>
                <button className="btn btn-primary" style={{ flex: 1, padding: '12px 24px', fontSize: 15 }} onClick={() => { addToCart(sec.id, p, qty, precioFinal); toast('Agregado al carrito'); }}>
                  Agregar al Carrito
                </button>
              </div>
            </>
          )}

          {/* Info extra */}
          {p.sku && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>SKU: {p.sku}</p>}
          {p.notas && <div className="card" style={{ padding: 12, marginTop: 12, fontSize: 13 }}>📝 {p.notas}</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOGIN / REGISTER / ACCOUNT
// ═══════════════════════════════════════════════════════════
function LoginPage() {
  const { handleLogin, nav, design } = useContext(Ctx);
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  return (
    <div style={{ maxWidth: 420, margin: '48px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: 32, borderRadius: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#232321', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, color: '#FFA52F', fontWeight: 900 }}>
            {design.logo_url ? <img src={design.logo_url} alt="" style={{ height: 32, borderRadius: 8 }} /> : 'K'}
          </div>
          <h2 style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.03em' }}>Iniciar sesión</h2>
          <p style={{ color: '#959595', fontSize: 13, marginTop: 4 }}>Ingresá tus datos para acceder</p>
        </div>
        <div className="form-group"><label className="form-label">USUARIO</label><input value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} placeholder="Tu usuario" /></div>
        <div className="form-group"><label className="form-label">CONTRASEÑA</label>
          <div style={{ position: 'relative' }}>
            <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleLogin(form.usuario, form.password)} placeholder="••••••" style={{ paddingRight: 40 }} />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>{showPass ? '🙈' : '👁'}</button>
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: 14, fontSize: 14, borderRadius: 12, background: '#232321', borderColor: '#232321' }} onClick={() => handleLogin(form.usuario, form.password)}>INGRESAR</button>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>¿No tenés cuenta? <a href="#" onClick={e => { e.preventDefault(); nav('register'); }} style={{ color: '#4A69E2', fontWeight: 700 }}>Registrate</a></p>
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
          <p style={{ color: '#959595', fontSize: 13, marginTop: 4 }}>Completá tus datos para registrarte</p>
        </div>
        <div className="form-group"><label className="form-label">NOMBRE COMPLETO *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">USUARIO *</label><input value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">CONTRASEÑA *</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">TELÉFONO / WHATSAPP</label><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">EMAIL</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">NOMBRE DE FANTASÍA</label><input value={form.nombre_fantasia} onChange={e => setForm({ ...form, nombre_fantasia: e.target.value })} placeholder="Opcional" /></div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 12, background: '#4A69E2', borderColor: '#4A69E2' }} onClick={submit}>CREAR CUENTA</button>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>¿Ya tenés cuenta? <a href="#" onClick={e => { e.preventDefault(); nav('login'); }} style={{ color: '#4A69E2', fontWeight: 700 }}>Iniciá sesión</a></p>
      </div>
    </div>
  );
}

function AccountPanel() {
  const { user, setUser, toast, nav, handleLogout, userLista, config } = useContext(Ctx);
  const [f, setF] = useState({ nombre: user?.nombre || '', telefono: user?.telefono || '', email: user?.email || '', direccion: user?.direccion || '', nombre_fantasia: user?.nombre_fantasia || '', password: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const data = { ...f }; if (!data.password) delete data.password;
      const updated = await api.updateMe(data);
      setUser(updated); toast('Datos actualizados');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 16px' }}>
      <button className="btn btn-outline btn-sm" onClick={() => nav('landing')} style={{ marginBottom: 16 }}>← Volver</button>
      <h2>Mi cuenta</h2>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <p><strong>{user.nombre}</strong> {user.nombre_fantasia && `(${user.nombre_fantasia})`}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{user.usuario} • {user.email} • {user.telefono}</p>
        {userLista && <p style={{ fontSize: 13 }}>Lista: <strong style={{ color: userLista.color }}>{userLista.nombre}</strong></p>}
      </div>
      <div className="form-group"><label className="form-label">Nombre</label><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Teléfono</label><input value={f.telefono} onChange={e => setF({ ...f, telefono: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Email</label><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Dirección</label><input value={f.direccion} onChange={e => setF({ ...f, direccion: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Nombre de fantasía</label><input value={f.nombre_fantasia} onChange={e => setF({ ...f, nombre_fantasia: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Nueva contraseña (vacío = no cambiar)</label><input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
      <button className="btn btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN PANEL (with sidebar!)
// ═══════════════════════════════════════════════════════════
function AdminPanel() {
  const { adminTab, setAdminTab, secciones, adminSeccion, setAdminSeccion, nav } = useContext(Ctx);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'productos', label: '📦 Productos' },
    { id: 'pedidos', label: '🧾 Pedidos' },
    { id: 'usuarios', label: '👥 Usuarios' },
    { id: 'listas', label: '💰 Listas precio' },
    { id: 'cupones', label: '🎟️ Cupones' },
    { id: 'promociones', label: '🏷️ Promociones' },
    { id: 'popups', label: '📢 Pop-ups' },
    { id: 'paginas', label: '📄 Páginas info' },
    { id: 'badges', label: '⭐ Badges' },
    { id: 'metodos_pago', label: '💳 Métodos pago' },
    { id: 'menu', label: '📋 Menú' },
    { id: 'redes', label: '🌐 Redes sociales' },
    { id: 'diseno', label: '🎨 Diseño' },
    { id: 'config', label: '⚙️ Configuración' },
  ];

  return (
    <div className="admin-layout">
      {/* Mobile hamburger bar */}
      <div className="admin-mobile-bar">
        <button className="admin-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '✕' : '☰'} <span style={{ fontSize: 14, fontWeight: 700 }}>Panel Admin</span>
        </button>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{tabs.find(t => t.id === adminTab)?.label}</span>
      </div>

      {/* Sidebar — desktop always visible, mobile toggle */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="btn btn-outline btn-sm" onClick={() => nav('landing')} style={{ marginBottom: 12, width: '100%' }}>← Volver a tienda</button>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Panel Admin</h3>
        <select value={adminSeccion} onChange={e => setAdminSeccion(e.target.value)} style={{ width: '100%', marginBottom: 12, padding: 6 }}>
          <option value="all">Todas las secciones</option>
          {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <nav className="admin-nav">
          {tabs.map(t => (
            <button key={t.id} className={`admin-nav-item ${adminTab === t.id ? 'active' : ''}`} onClick={() => { setAdminTab(t.id); setSidebarOpen(false); }}>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Content */}
      <div className="admin-content">
        {adminTab === 'dashboard' && <AdminDashboard />}
        {adminTab === 'productos' && <AdminProductos />}
        {adminTab === 'pedidos' && <AdminPedidos />}
        {adminTab === 'usuarios' && <AdminUsuarios />}
        {adminTab === 'listas' && <AdminListas />}
        {adminTab === 'cupones' && <AdminCupones />}
        {adminTab === 'promociones' && <AdminPromociones />}
        {adminTab === 'popups' && <AdminPopups />}
        {adminTab === 'paginas' && <AdminPaginas />}
        {adminTab === 'badges' && <AdminBadges />}
        {adminTab === 'metodos_pago' && <AdminMetodosPago />}
        {adminTab === 'menu' && <AdminMenu />}
        {adminTab === 'redes' && <AdminRedes />}
        {adminTab === 'diseno' && <AdminDiseno />}
        {adminTab === 'config' && <AdminConfig />}
      </div>
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
    { label: 'PEDIDOS', value: stats.total_pedidos || 0, icon: '📦', color: '#4A69E2', bg: '#E7EAFB' },
    { label: 'VENTAS', value: fmtARS(stats.total_ventas || 0), icon: '💰', color: '#16a34a', bg: '#dcfce7' },
    { label: 'PRODUCTOS', value: stats.total_productos || 0, icon: '🏷️', color: '#FFA52F', bg: '#fff3d4' },
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
            <div style={{ fontSize: 11, fontWeight: 700, color: '#959595', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {stats.ventas_por_dia?.length > 0 && (
        <div className="card" style={{ padding: 24, marginTop: 20, borderRadius: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontWeight: 800, fontSize: 16 }}>Ventas por día</h4>
            <span style={{ fontSize: 12, color: '#959595', fontWeight: 600 }}>{stats.ventas_por_dia.length} días</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160 }}>
            {stats.ventas_por_dia.slice(0, 14).reverse().map((d, i) => {
              const max = Math.max(...stats.ventas_por_dia.map(x => x.total));
              const h = max > 0 ? (d.total / max * 140) : 5;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', background: 'linear-gradient(180deg, #4A69E2 0%, #232321 120%)', borderRadius: 6, height: h, minHeight: 4, transition: 'height 0.3s' }} title={`$${fmt(d.total)}`} />
                  <span style={{ fontSize: 9, color: '#959595', fontWeight: 600 }}>{new Date(d.fecha).getDate()}/{new Date(d.fecha).getMonth() + 1}</span>
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

  const [secFiltro, setSecFiltro] = useState(adminSeccion);

  const load = async () => {
    const secId = secFiltro !== 'all' ? secFiltro : undefined;
    const data = await api.getProductos({ seccion_id: secId, q: busq, page: pagina, limit: 50 });
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

      {/* Product table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th style={{width:50}}>Img</th><th>Producto</th><th>Categoría</th><th style={{width:90}}>Precio</th><th style={{width:90}}>Oferta</th><th style={{width:70}}>Stock</th><th style={{width:50}}>👁</th><th style={{width:80}}>Acc.</th></tr></thead>
          <tbody>
            {productos.map(p => (
              <tr key={p.id} style={{ opacity: p.visible === false ? 0.5 : 1 }}>
                <td>{p.imagen ? <img src={p.imagen} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : '—'}</td>
                <td><strong style={{ cursor: 'pointer' }} onClick={() => setEditProd(p)}>{p.nombre || p.modelo}</strong><br/><small style={{ color: 'var(--text-muted)' }}>{p.sku || ''}</small></td>
                <td>{p.categoria}</td>
                <td><input type="number" defaultValue={p.precio_base} onBlur={e => inlineUpdate(p.id, 'precio_base', Number(e.target.value))} style={{ width: 80 }} /></td>
                <td><input type="number" defaultValue={p.precio_oferta || ''} onBlur={e => inlineUpdate(p.id, 'precio_oferta', Number(e.target.value))} style={{ width: 80 }} /></td>
                <td><input type="number" defaultValue={p.stock} onBlur={e => inlineUpdate(p.id, 'stock', Number(e.target.value))} style={{ width: 60 }} /></td>
                <td><input type="checkbox" defaultChecked={p.visible !== false} onChange={e => inlineUpdate(p.id, 'visible', e.target.checked)} /></td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditProd(p)} style={{ padding: '2px 6px' }}>✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar?')) return; await api.deleteProducto(p.id); load(); }} style={{ padding: '2px 6px', marginLeft: 4 }}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          {pagina > 1 && <button className="btn btn-outline btn-sm" onClick={() => setPagina(pagina - 1)}>←</button>}
          <span>Pág {pagina}/{Math.ceil(total / 50)}</span>
          {pagina < Math.ceil(total / 50) && <button className="btn btn-outline btn-sm" onClick={() => setPagina(pagina + 1)}>→</button>}
        </div>
      )}

      {/* Modals */}
      {showAdd && <ProductModal onClose={() => { setShowAdd(false); load(); }} />}
      {editProd && <ProductModal product={editProd} onClose={() => { setEditProd(null); load(); }} />}
      {showImport && <ImportModal onClose={() => { setShowImport(false); load(); }} />}
      {showPriceAdj && <PriceAdjustModal categorias={categorias} onClose={() => { setShowPriceAdj(false); load(); }} />}
      {showHistory && <PriceHistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
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
            <div className="form-group"><label className="form-label">Categoría *</label><input value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })} /></div>
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
            <div className="form-group"><label className="form-label">Precio base *</label><input type="number" value={f.precio_base} onChange={e => setF({ ...f, precio_base: Number(e.target.value) })} /></div>
            <div className="form-group"><label className="form-label">Precio oferta</label><input type="number" value={f.precio_oferta || ''} onChange={e => setF({ ...f, precio_oferta: Number(e.target.value) })} placeholder="0 = sin oferta" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Stock *</label><input type="number" value={f.stock} onChange={e => setF({ ...f, stock: Number(e.target.value) })} /></div>
            <div className="form-group"><label className="form-label">Stock mínimo</label><input type="number" value={f.stock_minimo} onChange={e => setF({ ...f, stock_minimo: Number(e.target.value) })} /></div>
          </div>
          {/* Image upload */}
          <div className="form-group">
            <label className="form-label">Imagen</label>
            <div className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleImageUpload(file); }}>
              {uploading ? <span>Subiendo...</span> : f.imagen ? <img src={f.imagen} alt="" style={{ maxHeight: 100 }} /> : <span>Arrastrá una imagen o hacé clic</span>}
              <input type="file" accept="image/*" onChange={e => { const file = e.target.files[0]; if (file) handleImageUpload(file); }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </div>
            {f.imagen && <input value={f.imagen} onChange={e => setF({ ...f, imagen: e.target.value })} placeholder="O pegá URL de imagen" style={{ marginTop: 8 }} />}
          </div>
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
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState('');
  const [reemplazar, setReemplazar] = useState(false);
  const [importSecId, setImportSecId] = useState(adminSeccion !== 'all' ? Number(adminSeccion) : secciones[0]?.id);
  const secId = importSecId;

  const parseFile = async (f) => {
    setFile(f);
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      if (!json.length) { toast('Archivo vacío', 'warning'); return; }
      const keys = Object.keys(json[0]);
      const cC = keys.find(k => /producto|categor|tipo/i.test(k)) || keys[0];
      const cM = keys.find(k => /modelo|model|nombre/i.test(k)) || keys[1];
      const cP = keys.find(k => /precio|price|costo/i.test(k)) || keys[2];
      const prods = json.map(r => ({ seccion_id: secId, categoria: r[cC] || '', modelo: r[cM] || '', nombre: r[cM] || '', precio_base: Number(r[cP]) || 0, stock: Number(r.stock || r.Stock || 0) }));
      setData({ productos: prods, total: prods.length, columns: { categoria: cC, modelo: cM, precio: cP } });
    };
    reader.readAsArrayBuffer(f);
  };

  const doUpload = async () => {
    if (!data?.productos?.length) return;
    setUploading(true); setResult('');
    try {
      const r = await api.bulkProductos(data.productos, reemplazar);
      setResult(`✅ ${r.insertados || data.total} productos cargados`);
      setData(null);
    } catch (e) { setResult(`❌ Error: ${e.message}`); }
    setUploading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Importar productos (Excel/CSV)</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Subí un archivo Excel o CSV. Se detectan automáticamente las columnas de categoría, modelo/nombre y precio.</p>
          <div className="form-group"><label className="form-label">Sección destino</label>
            <select value={importSecId} onChange={e => setImportSecId(Number(e.target.value))}>
              {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); }} />
          {data && (
            <div style={{ marginTop: 12 }}>
              <p>{data.total} productos detectados</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Columnas: Categoría={data.columns.categoria}, Modelo={data.columns.modelo}, Precio={data.columns.precio}</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><input type="checkbox" checked={reemplazar} onChange={e => setReemplazar(e.target.checked)} /> Reemplazar todos los productos de la sección</label>
              <button className="btn btn-primary" onClick={doUpload} disabled={uploading} style={{ marginTop: 12 }}>{uploading ? 'Subiendo...' : `Importar ${data.total} productos`}</button>
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
function AdminPedidos() {
  const { adminSeccion, toast } = useContext(Ctx);
  const [pedidos, setPedidos] = useState([]);
  const [ordTab, setOrdTab] = useState('pedidos');
  const [viewOrder, setViewOrder] = useState(null);

  const load = (tab) => {
    const t = tab || ordTab;
    const params = { all: true, seccion_id: adminSeccion !== 'all' ? adminSeccion : null };
    if (t === 'archivados') params.archivado = true;
    api.getPedidos(params).then(ords => {
      if (t === 'pedidos') setPedidos(ords.filter(o => o.tipo !== 'presupuesto' && o.estado !== 'cancelado' && !o.archivado));
      else if (t === 'presupuestos') setPedidos(ords.filter(o => o.tipo === 'presupuesto' && o.estado !== 'cancelado' && !o.archivado));
      else if (t === 'cancelados') setPedidos(ords.filter(o => o.estado === 'cancelado' && !o.archivado));
      else setPedidos(ords);
    });
  };
  useEffect(() => { load(); }, [adminSeccion, ordTab]);

  const changeTab = (t) => { setOrdTab(t); load(t); };
  const tabs = [{ id: 'pedidos', label: '📦 Pedidos' }, { id: 'presupuestos', label: '📋 Presupuestos' }, { id: 'cancelados', label: '❌ Cancelados' }, { id: 'archivados', label: '🗃 Archivados' }];
  const estados = ['pendiente', 'preparando', 'listo', 'entregado', 'cancelado'];
  const colores = { pendiente: 'var(--warning)', preparando: 'var(--primary)', listo: '#8b5cf6', entregado: 'var(--success)', cancelado: 'var(--danger)' };

  // Export CSV
  const exportCSV = () => {
    const rows = [['ID', 'Fecha', 'Cliente', 'Estado', 'Total', 'Método pago'].join(',')];
    pedidos.forEach(p => rows.push([p.id, new Date(p.created_at).toLocaleDateString('es-AR'), p.usuario_nombre || '', p.estado, p.total, p.metodo_pago || ''].join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pedidos.csv'; a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>Pedidos</h3>
        <button className="btn btn-outline btn-sm" onClick={exportCSV}>📤 Exportar CSV</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {tabs.map(t => <button key={t.id} className={`btn btn-sm ${ordTab === t.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => changeTab(t.id)}>{t.label}</button>)}
      </div>
      {pedidos.map(p => (
        <div key={p.id} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'pointer' }} onClick={() => setViewOrder(p)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong>#{p.id}</strong> — {p.usuario_nombre || '(sin nombre)'} {p.nombre_fantasia && `(${p.nombre_fantasia})`}
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
    </div>
  );
}

// ─── ORDER DETAIL MODAL (full: edit items, print, clone, WA, assign client) ───
function OrderDetailModal({ order: initOrder, onClose }) {
  const { toast, listas, getPrice, userLista, openWA } = useContext(Ctx);
  const [o, setO] = useState(initOrder);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const searchTimer = useRef(null);

  useEffect(() => {
    (async () => {
      setLoadingItems(true);
      const full = await api.getPedido(o.id);
      setItems((full.items || []).map(i => ({ ...i, qty: i.cantidad || 1 })));
      setO(full);
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

  const editTotal = items.reduce((s, i) => s + (Number(i.precio_unitario) || 0) * (i.qty || 0), 0);
  const itemName = i => i.nombre_producto || (i.categoria && i.modelo ? `${i.categoria} - ${i.modelo}` : i.modelo || 'Producto');

  const saveEdit = async () => {
    setSaving(true);
    try {
      const newItems = items.map(i => ({ producto_id: i.producto_id || i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: itemName(i), cantidad: i.qty, precio_unitario: Number(i.precio_unitario) || 0, precio_base: Number(i.precio_base) || 0 }));
      await api.updatePedido(o.id, { items: newItems, total: editTotal });
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
    try { await api.updatePedido(o.id, { estado }); setO({ ...o, estado }); toast('Estado actualizado'); } catch (e) { toast(e.message, 'error'); }
  };

  const cloneOrder = async () => {
    try {
      await api.createPedido({ seccion_id: o.seccion_id, tipo: o.tipo, metodo_pago: o.metodo_pago, notas: `Clonado de #${o.id}`, items: items.map(i => ({ producto_id: i.producto_id || i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: itemName(i), cantidad: i.qty, precio_unitario: i.precio_unitario, precio_base: i.precio_base })), subtotal: editTotal, total: editTotal });
      toast('Pedido duplicado'); onClose();
    } catch (e) { toast(e.message, 'error'); }
  };

  const printOrder = () => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Pedido #${o.id}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body>`);
    w.document.write(`<h2>Pedido #${o.id}</h2><p>Cliente: ${o.usuario_nombre || ''} ${o.nombre_fantasia ? `(${o.nombre_fantasia})` : ''}<br>Fecha: ${new Date(o.created_at).toLocaleString('es-AR')}<br>Estado: ${o.estado}<br>Método: ${o.metodo_pago || '-'}</p>`);
    w.document.write('<table><thead><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>');
    items.forEach(i => w.document.write(`<tr><td>${itemName(i)}</td><td>${i.qty}</td><td>$${fmt(i.precio_unitario)}</td><td>$${fmt(i.precio_unitario * i.qty)}</td></tr>`));
    w.document.write(`</tbody></table><p style="text-align:right;font-size:18px"><strong>Total: $${fmt(editTotal)}</strong></p>`);
    if (o.notas) w.document.write(`<p>Notas: ${o.notas}</p>`);
    w.document.write('</body></html>');
    w.document.close(); w.print();
  };

  const estados = ['pendiente', 'preparando', 'listo', 'entregado', 'cancelado'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Pedido #{o.id}</span><button className="modal-close" onClick={onClose}>✕</button></div>
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
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Total: {fmtARS(editTotal)}</div>
          {o.metodo_pago && <p style={{ fontSize: 13 }}>💳 {o.metodo_pago}</p>}
          {o.notas && <p style={{ fontSize: 13 }}>📝 {o.notas}</p>}
          {o.cupon_codigo && <p style={{ fontSize: 13 }}>🎟️ Cupón: {o.cupon_codigo}</p>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="btn btn-outline btn-sm" onClick={printOrder}>🖨️ Imprimir</button>
            <button className="btn btn-outline btn-sm" onClick={cloneOrder}>📋 Duplicar</button>
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
  const { toast, listas } = useContext(Ctx);
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
            <div><strong>{l.nombre}</strong> <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>×{l.multiplicador} ({l.modo})</span>
              {l.compra_minima > 0 && <span style={{ fontSize: 12, marginLeft: 8 }}>Min: ${fmt(l.compra_minima)}</span>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setEditLista(l)}>✏️</button>
              <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar?')) return; await api.deleteLista(l.id); refresh(); }}>🗑</button>
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
  const [f, setF] = useState(tier || { id: '', nombre: '', multiplicador: 1, modo: 'porcentaje', color: '#2563eb', compra_minima: 0, promo_msg: '' });
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

  const openEdit = (c) => {
    setEdit(c);
    setForm({ codigo: c.codigo, tipo: c.tipo, valor: c.valor, secciones_ids: c.secciones_ids || '', categoria: c.categoria || '', uso_maximo: c.uso_maximo || 0, monto_minimo: c.monto_minimo || 0, metodo_pago: c.metodo_pago || '', fecha_desde: c.fecha_desde || '', fecha_hasta: c.fecha_hasta || '' });
    setSelProds([]); setShowForm(true);
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
              <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>✏️</button>
              <button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteCupon(c.id); api.getCupones().then(setCupones); }}>🗑</button>
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
              <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>✏️</button>
              <button className="btn btn-danger btn-sm" onClick={async () => { await api.deletePromocion(p.id); api.getPromociones().then(setPromos); }}>🗑</button>
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
      {popups.map(p => (<div key={p.id} className="card" style={{ padding: 12, marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><strong>{p.titulo}</strong> <span style={{ fontSize: 12, color: p.activo ? 'var(--success)' : 'var(--danger)' }}>{p.activo ? 'Activo' : 'Inactivo'}</span></div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => { setEdit(p); setForm(p); setShow(true); }}>✏️</button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deletePopup(p.id); api.getPopupsAll().then(setPopups); }}>🗑</button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nuevo'} pop-up</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-group"><label className="form-label">Título</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">URL imagen</label><input value={form.imagen} onChange={e => setForm({ ...form, imagen: e.target.value })} /></div>
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
      {paginas.map(p => (<div key={p.id} className="card" style={{ padding: 12, marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{p.titulo}</strong><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => { setEdit(p); setForm(p); setShow(true); }}>✏️</button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deletePagina(p.id); api.getPaginas().then(setPaginas); }}>🗑</button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nueva'} página</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-group"><label className="form-label">Título</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Slug (URL)</label><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Contenido</label><textarea value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} rows={6} /></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Orden</label><input type="number" value={form.orden} onChange={e => setForm({ ...form, orden: Number(e.target.value) })} /></div></div>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div></div></div>)}
    </div>
  );
}

// ─── ADMIN: Badges (section multi-select, pre-loaded shown) ───
function AdminBadges() {
  const { secciones, toast } = useContext(Ctx);
  const [bgs, setBgs] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ icono: '⭐', texto: '', color: '#2563eb', secciones_ids: '', visible: true, orden: 0 });
  const [edit, setEdit] = useState(null);
  useEffect(() => { api.getBadgesAll().then(setBgs); }, []);
  const toggleSec = (id) => { const ids = form.secciones_ids ? form.secciones_ids.split(',').map(Number).filter(Boolean) : []; const nw = ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]; setForm({ ...form, secciones_ids: nw.join(',') }); };
  const save = async () => { try { if (edit) await api.updateBadge(edit.id, form); else await api.createBadge(form); api.getBadgesAll().then(setBgs); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Badges de confianza</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ icono: '⭐', texto: '', color: '#2563eb', secciones_ids: '', visible: true, orden: 0 }); setShow(true); }}>+ Nuevo</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Se muestran debajo de los productos como indicadores de confianza (envío gratis, compra segura, etc).</p>
      {bgs.map(b => (<div key={b.id} className="card" style={{ padding: 12, marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><span style={{ marginRight: 8 }}>{b.icono}</span><strong>{b.texto}</strong> <span style={{ fontSize: 12, color: b.visible ? 'var(--success)' : 'var(--danger)' }}>{b.visible ? '✓' : '✗'}</span></div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => { setEdit(b); setForm(b); setShow(true); }}>✏️</button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteBadge(b.id); api.getBadgesAll().then(setBgs); }}>🗑</button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nuevo'} badge</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-row"><div className="form-group"><label className="form-label">Icono</label><input value={form.icono} onChange={e => setForm({ ...form, icono: e.target.value })} style={{ width: 60 }} /></div><div className="form-group" style={{ flex: 1 }}><label className="form-label">Texto</label><input value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} /></div></div>
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
  const { secciones, toast } = useContext(Ctx);
  const [mps, setMps] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '', instrucciones: '', icono: '💳', seccion_id: null, activo: true, orden: 0 });
  const [edit, setEdit] = useState(null);
  useEffect(() => { api.getMetodosPagoAll().then(setMps); }, []);
  const save = async () => { try { if (edit) await api.updateMetodoPago(edit.id, form); else await api.createMetodoPago(form); api.getMetodosPagoAll().then(setMps); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Métodos de pago</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ nombre: '', descripcion: '', instrucciones: '', icono: '💳', seccion_id: null, activo: true, orden: 0 }); setShow(true); }}>+ Nuevo</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Los clientes eligen su método de pago al hacer el checkout. Podés poner instrucciones para cada uno (CBU, dirección USDT, etc).</p>
      {mps.map(m => (<div key={m.id} className="card" style={{ padding: 12, marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div>{m.icono} <strong>{m.nombre}</strong> {m.descripcion && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— {m.descripcion}</span>}</div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => { setEdit(m); setForm(m); setShow(true); }}>✏️</button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteMetodoPago(m.id); api.getMetodosPagoAll().then(setMps); }}>🗑</button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nuevo'} método de pago</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-row"><div className="form-group"><label className="form-label">Icono</label><input value={form.icono} onChange={e => setForm({ ...form, icono: e.target.value })} style={{ width: 60 }} /></div><div className="form-group" style={{ flex: 1 }}><label className="form-label">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div></div>
        <div className="form-group"><label className="form-label">Descripción</label><input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Instrucciones (se muestran al elegir este método)</label><textarea value={form.instrucciones} onChange={e => setForm({ ...form, instrucciones: e.target.value })} rows={3} placeholder="Ej: Transferir a CBU 0000...0000 a nombre de..." /></div>
        <div className="form-group"><label className="form-label">Sección (vacío = todas)</label>
          <select value={form.seccion_id || ''} onChange={e => setForm({ ...form, seccion_id: e.target.value ? Number(e.target.value) : null })}><option value="">Todas</option>{secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.activo !== false} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div></div></div>)}
    </div>
  );
}

// ─── ADMIN: Menú editable ───
function AdminMenu() {
  const { toast } = useContext(Ctx);
  const [items, setItems] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ titulo: '', url: '', tipo: 'link', visible: true, orden: 0 });
  const [edit, setEdit] = useState(null);
  useEffect(() => { api.getMenuAll().then(setItems); }, []);
  const save = async () => { try { if (edit) await api.updateMenuItem(edit.id, form); else await api.createMenuItem(form); api.getMenuAll().then(setItems); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Menú principal</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ titulo: '', url: '', tipo: 'link', visible: true, orden: 0 }); setShow(true); }}>+ Nuevo item</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Los items del menú aparecen en el encabezado de la tienda. Podés agregar links a secciones, páginas externas, redes sociales, etc.</p>
      {items.map(m => (<div key={m.id} className="card" style={{ padding: 12, marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong>{m.titulo}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ {m.url || '(sin link)'}</span> {!m.visible && <span style={{ fontSize: 12, color: 'var(--danger)' }}>(oculto)</span>}</div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => { setEdit(m); setForm(m); setShow(true); }}>✏️</button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteMenuItem(m.id); api.getMenuAll().then(setItems); }}>🗑</button></div></div></div>))}
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
  const { toast } = useContext(Ctx);
  const [redes, setRedes] = useState([]);
  useEffect(() => { api.getRedesSociales().then(setRedes); }, []);
  const guardar = async () => { try { await api.updateRedesSociales(redes); toast('Redes guardadas'); } catch (e) { toast(e.message, 'error'); } };
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

  const resetDefaults = () => { setDes({ ...des, color_primario: '#2563eb', color_secundario: '#1e40af', color_acento: '#f59e0b', plantilla: 'moderna' }); };

  return (
    <div>
      <h3 style={{ marginBottom: 12 }}>Diseño y personalización</h3>

      {/* PLANTILLAS */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h4 style={{ marginBottom: 12 }}>🎨 Plantillas</h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Elegí un estilo visual para tu tienda. Después podés personalizar los colores.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { id: 'kicks', name: 'Kicks', desc: 'Moderno y audaz', colors: { p: '#4A69E2', s: '#232321', a: '#FFA52F' }, font: 'Archivo' },
            { id: 'minimal', name: 'Minimal', desc: 'Limpio y elegante', colors: { p: '#18181b', s: '#71717a', a: '#f59e0b' }, font: 'Inter' },
            { id: 'tech', name: 'Tech', desc: 'Para electrónica', colors: { p: '#0ea5e9', s: '#0c4a6e', a: '#22c55e' }, font: 'Space Grotesk' },
            { id: 'classic', name: 'Classic', desc: 'Profesional neutro', colors: { p: '#2563eb', s: '#1e40af', a: '#f59e0b' }, font: 'Open Sans' },
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
            { name: 'Azul Pro', p: '#2563eb', s: '#1e40af', a: '#f59e0b' },
            { name: 'Verde Negocio', p: '#16a34a', s: '#15803d', a: '#eab308' },
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
          <div className="form-group"><label className="form-label">Color primario</label><input type="color" value={des.color_primario || '#2563eb'} onChange={e => setDes({ ...des, color_primario: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Color secundario</label><input type="color" value={des.color_secundario || '#1e40af'} onChange={e => setDes({ ...des, color_secundario: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Color acento</label><input type="color" value={des.color_acento || '#f59e0b'} onChange={e => setDes({ ...des, color_acento: e.target.value })} /></div>
        </div>
        <div className="form-group"><label className="form-label">Texto del footer</label><input value={des.footer_texto || ''} onChange={e => setDes({ ...des, footer_texto: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={guardar}>Guardar diseño</button>
          <button className="btn btn-outline" onClick={resetDefaults}>🔄 Reset colores</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: Configuración completa (restored from v2) ───
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

        {/* Precios diferenciados por método de pago */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <h4 style={{ marginBottom: 8 }}>💲 Descuentos por método de pago</h4>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Si ponés un %, se muestra el precio con descuento en el detalle del producto. Dejá vacío para no mostrar.</p>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Efectivo (%)</label><input type="number" value={c.descuento_efectivo || ''} onChange={e => setC({ ...c, descuento_efectivo: e.target.value })} placeholder="Ej: 10" /></div>
            <div className="form-group"><label className="form-label">Transferencia (%)</label><input type="number" value={c.descuento_transferencia || ''} onChange={e => setC({ ...c, descuento_transferencia: e.target.value })} placeholder="Ej: 5" /></div>
            <div className="form-group"><label className="form-label">USDT (%)</label><input type="number" value={c.descuento_usdt || ''} onChange={e => setC({ ...c, descuento_usdt: e.target.value })} placeholder="Ej: 5" /></div>
          </div>
        </div>

        {/* Dolar blue manual fallback */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <div className="form-group"><label className="form-label">Dólar blue manual (fallback si la API falla)</label><input type="number" value={c.dolar_blue || ''} onChange={e => setC({ ...c, dolar_blue: e.target.value })} placeholder="Se busca automáticamente de dolarapi.com" /></div>
        </div>

        <button className="btn btn-primary" onClick={saveAll} style={{ marginTop: 16, width: '100%' }}>Guardar configuración</button>
      </div>

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
