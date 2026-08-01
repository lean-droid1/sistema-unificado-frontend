import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api';

// ═══════════════════════════════════════════════════════════
// App.jsx — Sistema Unificado v3 (Fases 1+2+3 completas)
// ═══════════════════════════════════════════════════════════

// Toast system
let toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'success') => {
    const id = ++toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  const ToastContainer = () => (
    <div className="toast-container">
      {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
    </div>
  );
  return { show, ToastContainer };
}

// Format price
const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—';

export default function App() {
  // Auth
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('landing');
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => localStorage.getItem('gm_dark') === 'true');
  const [mobileMenu, setMobileMenu] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  // Data
  const [secciones, setSecciones] = useState([]);
  const [config, setConfig] = useState({});
  const [design, setDesign] = useState({});
  const [seccionActual, setSeccionActual] = useState(null);
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_cart') || '{}'); } catch { return {}; } });
  const [menuItems, setMenuItems] = useState([]);
  const [redesSociales, setRedesSociales] = useState([]);
  const [badges, setBadges] = useState([]);

  // Admin state
  const [adminTab, setAdminTab] = useState('dashboard');
  const [adminSeccion, setAdminSeccion] = useState('all');

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('gm_dark', dark);
  }, [dark]);

  // Save cart
  useEffect(() => { localStorage.setItem('gm_cart', JSON.stringify(cart)); }, [cart]);

  // Init
  useEffect(() => {
    (async () => {
      try {
        const [secs, cfg, des, menu, redes] = await Promise.all([
          api.getSecciones(), api.getConfig(), api.getDesign().catch(() => ({})),
          api.getMenu().catch(() => []), api.getRedesSociales().catch(() => [])
        ]);
        setSecciones(secs); setConfig(cfg); setDesign(des);
        setMenuItems(menu); setRedesSociales(redes);
        // Check auth
        if (api.getToken()) {
          try { const me = await api.getMe(); setUser(me); if (me.rol === 'admin' || me.rol === 'subadmin') setPage('admin'); }
          catch { api.logout(); }
        }
        // Maintenance check
        const maint = await api.getMaintenanceStatus();
        if (maint.activo && (!user || !['admin','subadmin'].includes(user?.rol))) setPage('maintenance');
      } catch (e) { console.error('Init error:', e); }
      setLoading(false);
    })();
  }, []);

  // Navigate
  const nav = useCallback((p, secId) => {
    if (secId) setSeccionActual(secciones.find(s => s.id === secId || s.slug === secId) || null);
    setPage(p); setMobileMenu(false); window.scrollTo(0, 0);
  }, [secciones]);

  // Cart helpers
  const cartForSection = (secId) => cart[secId] || [];
  const addToCart = (secId, producto, qty = 1, precio) => {
    setCart(prev => {
      const items = [...(prev[secId] || [])];
      const idx = items.findIndex(i => i.producto_id === producto.id);
      if (idx >= 0) items[idx].cantidad += qty;
      else items.push({ producto_id: producto.id, nombre_producto: producto.nombre || producto.modelo, categoria: producto.categoria, cantidad: qty, precio_unitario: precio, imagen: producto.imagen });
      return { ...prev, [secId]: items };
    });
    api.trackAddToCart(producto, qty, precio);
    toast(`${producto.nombre || producto.modelo} agregado al carrito`);
  };
  const updateCartQty = (secId, prodId, qty) => {
    setCart(prev => {
      const items = (prev[secId] || []).map(i => i.producto_id === prodId ? { ...i, cantidad: Math.max(1, qty) } : i);
      return { ...prev, [secId]: items };
    });
  };
  const removeFromCart = (secId, prodId) => {
    setCart(prev => ({ ...prev, [secId]: (prev[secId] || []).filter(i => i.producto_id !== prodId) }));
  };
  const cartTotal = (secId) => (cart[secId] || []).reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
  const cartCount = Object.values(cart).reduce((s, items) => s + items.length, 0);

  // Login handler
  const handleLogin = async (usuario, password) => {
    try {
      const data = await api.login(usuario, password);
      setUser(data);
      if (data.rol === 'admin' || data.rol === 'subadmin') nav('admin');
      else nav('landing');
      toast('Sesión iniciada');
    } catch (e) {
      if (e.pendiente) toast('Tu cuenta está pendiente de aprobación', 'warning');
      else toast(e.message, 'error');
    }
  };

  const handleLogout = () => { api.logout(); setUser(null); nav('landing'); toast('Sesión cerrada'); };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Cargando...</div>;

  // ─── HEADER ───
  const Header = () => {
    const logoUrl = design.logo_url;
    const storeName = design.nombre_tienda || 'Mi Tienda';
    const waFloat = config.whatsapp_flotante;
    return (
      <>
        <header className="header">
          <div className="header-logo" onClick={() => nav('landing')} style={{ cursor: 'pointer' }}>
            {logoUrl && <img src={logoUrl} alt={storeName} />}
            <span>{storeName}</span>
          </div>
          <nav className="header-nav">
            {menuItems.map(m => (
              <a key={m.id} href="#" onClick={e => { e.preventDefault();
                if (m.tipo === 'seccion') { const sec = secciones.find(s => m.url?.includes(s.slug)); if (sec) nav('seccion', sec.slug); }
                else if (m.url === '/') nav('landing');
                else if (m.url === '/contacto') nav('contacto');
              }} className={page === 'seccion' && seccionActual?.slug && m.url?.includes(seccionActual.slug) ? 'active' : ''}>
                {m.titulo}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            {cartCount > 0 && <button className="btn btn-outline btn-sm" onClick={() => nav('cart')}>🛒 {cartCount}</button>}
            <button className="dark-toggle" onClick={() => setDark(!dark)}>{dark ? '☀️' : '🌙'}</button>
            {user ? (
              <>
                {['admin','subadmin'].includes(user.rol) && <button className="btn btn-sm btn-primary" onClick={() => nav('admin')}>Panel</button>}
                <button className="btn btn-sm btn-outline" onClick={handleLogout}>Salir</button>
              </>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={() => nav('login')}>Ingresar</button>
            )}
            <button className="hamburger" onClick={() => setMobileMenu(true)}>☰</button>
          </div>
        </header>
        {mobileMenu && <MobileMenu />}
        {waFloat && <a href={`https://wa.me/${waFloat}`} target="_blank" rel="noopener" className="whatsapp-float">💬</a>}
      </>
    );
  };

  const MobileMenu = () => (
    <div className="mobile-menu">
      <button className="mobile-menu-close" onClick={() => setMobileMenu(false)}>✕</button>
      {menuItems.map(m => (
        <a key={m.id} href="#" onClick={e => { e.preventDefault(); setMobileMenu(false);
          if (m.tipo === 'seccion') { const sec = secciones.find(s => m.url?.includes(s.slug)); if (sec) nav('seccion', sec.slug); }
          else if (m.url === '/') nav('landing');
        }}>{m.titulo}</a>
      ))}
      {cartCount > 0 && <button onClick={() => { setMobileMenu(false); nav('cart'); }}>🛒 Carrito ({cartCount})</button>}
      {user ? <button onClick={() => { setMobileMenu(false); handleLogout(); }}>Cerrar sesión</button>
        : <button onClick={() => { setMobileMenu(false); nav('login'); }}>Ingresar</button>}
    </div>
  );

  const Footer = () => {
    const activeRedes = redesSociales.filter(r => r.activo && r.url);
    return (
      <footer className="footer">
        {activeRedes.length > 0 && (
          <div className="social-links" style={{ justifyContent: 'center', marginBottom: 12 }}>
            {activeRedes.map(r => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener" className="social-link" title={r.tipo}>
                {r.tipo === 'facebook' ? '📘' : r.tipo === 'instagram' ? '📸' : r.tipo === 'tiktok' ? '🎵' : r.tipo.includes('whatsapp') ? '💬' : '🔗'}
              </a>
            ))}
          </div>
        )}
        <p>{design.footer_texto || `© ${new Date().getFullYear()} ${design.nombre_tienda || 'Mi Tienda'}`}</p>
      </footer>
    );
  };

  // ─── PAGES ───
  const renderPage = () => {
    switch (page) {
      case 'landing': return <Landing />;
      case 'seccion': return <SeccionPage />;
      case 'login': return <LoginPage />;
      case 'register': return <RegisterPage />;
      case 'cart': return <CartPage />;
      case 'admin': return ['admin','subadmin'].includes(user?.rol) ? <AdminPanel /> : <Landing />;
      case 'maintenance': return <MaintenancePage />;
      default: return <Landing />;
    }
  };

  // ═══ LANDING ═══
  const Landing = () => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState(null);
    const [popups, setPopups] = useState([]);
    const [showPopup, setShowPopup] = useState(null);

    useEffect(() => {
      api.getPopups().then(p => { if (p.length) setShowPopup(p[0]); }).catch(() => {});
      api.getBadges().then(setBadges).catch(() => {});
    }, []);

    const doSearch = async () => {
      if (search.length < 2) return;
      const data = await api.busquedaGlobal(search);
      setResults(data);
      api.trackSearch(search, data.total);
    };

    return (
      <div className="fade-in">
        {showPopup && (
          <div className="popup-overlay" onClick={() => setShowPopup(null)}>
            <div className="popup-content" onClick={e => e.stopPropagation()}>
              <button className="popup-close" onClick={() => setShowPopup(null)}>✕</button>
              {showPopup.imagen && <img className="popup-img" src={showPopup.imagen} alt={showPopup.titulo} onClick={() => { if (showPopup.url_destino) window.open(showPopup.url_destino); setShowPopup(null); }} />}
              {showPopup.titulo && <div className="popup-title">{showPopup.titulo}</div>}
            </div>
          </div>
        )}
        <div className="landing-hero">
          <h1>{design.nombre_tienda || 'Bienvenido'}</h1>
          <p>Encontrá lo que necesitás en nuestras secciones</p>
          <div className="landing-search">
            <input placeholder="Buscar productos en toda la tienda..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} />
          </div>
        </div>

        {results && (
          <div className="search-results fade-in">
            {results.total === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron resultados</p> :
              Object.entries(results.porSeccion).map(([slug, data]) => (
                <div key={slug} className="search-section-group">
                  <span className="search-section-title" style={{ background: data.color }}>{data.nombre} ({data.productos.length})</span>
                  <div className="product-grid" style={{ marginTop: 8 }}>
                    {data.productos.slice(0, 4).map(p => (
                      <div key={p.id} className="product-card" onClick={() => nav('seccion', slug)}>
                        <div className="product-card-img">{p.imagen ? <img src={p.imagen} alt={p.nombre} /> : <span className="no-img">📦</span>}</div>
                        <div className="product-card-body">
                          <div className="product-card-name">{p.nombre || p.modelo}</div>
                          <div className="product-card-cat">{p.categoria}</div>
                          {p.precio_base !== undefined && <div className="product-card-price">${fmt(p.precio_base)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {data.productos.length > 4 && <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => nav('seccion', slug)}>Ver todos en {data.nombre} →</button>}
                </div>
              ))
            }
          </div>
        )}

        <div className="sections-grid" style={{ marginTop: 24 }}>
          {secciones.filter(s => s.activa).map(s => (
            <div key={s.id} className="section-card" onClick={() => nav('seccion', s.slug)} style={{ borderColor: s.color }}>
              <div className="section-icon">{s.slug === 'local' ? '🏪' : s.slug === 'dropshipping' ? '🚀' : s.slug === 'mayorista' ? '📦' : '🛒'}</div>
              <h3 style={{ color: s.color }}>{s.nombre}</h3>
              <p>{s.descripcion || (s.requiere_aprobacion ? 'Acceso con aprobación' : 'Abierto al público')}</p>
            </div>
          ))}
        </div>

        {badges.length > 0 && (
          <div className="badges-row">
            {badges.map(b => <div key={b.id} className="badge-item"><span className="badge-icon">{b.icono}</span><span>{b.texto}</span></div>)}
          </div>
        )}
      </div>
    );
  };

  // ═══ SECCIÓN PAGE ═══
  const SeccionPage = () => {
    const sec = seccionActual;
    if (!sec) return <div className="empty-state"><h3>Sección no encontrada</h3><button className="btn btn-primary" onClick={() => nav('landing')}>Volver</button></div>;

    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [catFiltro, setCatFiltro] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [pagina, setPagina] = useState(1);
    const [total, setTotal] = useState(0);
    const [promos, setPromos] = useState([]);
    const [listas, setListas] = useState([]);
    const [dolarBlue, setDolarBlue] = useState(null);
    const [secBadges, setSecBadges] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);

    const esMayorista = sec.slug === 'mayorista';
    const esDropshipping = sec.slug === 'dropshipping';

    useEffect(() => {
      api.trackSectionView(sec.nombre);
      loadData();
    }, [sec.id, catFiltro, busqueda, pagina]);

    const loadData = async () => {
      try {
        const [prodData, cats, promoData, bdg, mp] = await Promise.all([
          api.getProductos({ seccion_id: sec.id, categoria: catFiltro, q: busqueda, page: pagina }),
          api.getCategorias(sec.id),
          api.getPromocionesActivas(sec.id).catch(() => []),
          api.getBadges(sec.id).catch(() => []),
          api.getMetodosPago(sec.id).catch(() => [])
        ]);
        setProductos(prodData.productos); setTotal(prodData.total);
        setCategorias(cats); setPromos(promoData); setSecBadges(bdg);
        setMetodosPago(mp);
        if (esMayorista) {
          const [l, cfg] = await Promise.all([api.getListas(), api.getConfig()]);
          setListas(l); if (cfg.dolar_blue) setDolarBlue(Number(cfg.dolar_blue));
        }
      } catch (e) { console.error(e); }
    };

    // Calcular precio con promociones
    const getPrecio = (p) => {
      let precio = Number(p.precio_oferta) > 0 ? Number(p.precio_oferta) : Number(p.precio_base);
      // Revendedor en dropshipping
      if (esDropshipping && user?.es_revendedor && user.descuento_revendedor > 0) {
        return { original: precio, final: Math.round(precio * (1 - user.descuento_revendedor / 100)), descuento: user.descuento_revendedor, esRevendedor: true };
      }
      // Promociones automáticas
      for (const promo of promos) {
        const aplicaProducto = !promo.productos_ids || promo.productos_ids.split(',').map(Number).includes(p.id);
        const aplicaCategoria = !promo.categoria || promo.categoria === p.categoria;
        if (aplicaProducto && aplicaCategoria) {
          const original = precio;
          if (promo.tipo === 'porcentaje') precio = Math.round(precio * (1 - promo.valor / 100));
          else if (promo.tipo === 'monto_fijo') precio = Math.max(0, precio - promo.valor);
          return { original, final: precio, descuento: promo.valor, promoNombre: promo.nombre };
        }
      }
      if (Number(p.precio_oferta) > 0 && Number(p.precio_oferta) < Number(p.precio_base)) {
        return { original: Number(p.precio_base), final: Number(p.precio_oferta), descuento: Math.round((1 - p.precio_oferta / p.precio_base) * 100) };
      }
      return { final: precio };
    };

    // Check si la sección requiere login y el usuario no está logueado
    if (esMayorista && sec.requiere_aprobacion && !user) {
      return (
        <div className="fade-in">
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h2>Sección Mayorista</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '12px 0 20px' }}>Esta sección requiere cuenta aprobada para ver precios y comprar.</p>
            <p style={{ marginBottom: 20 }}>Podés ver nuestros productos, pero los precios están ocultos.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => nav('login')}>Iniciar sesión</button>
              <button className="btn btn-outline" onClick={() => nav('register')}>Registrarse</button>
            </div>
          </div>
          {/* Vitrina sin precios */}
          <VitrineGrid productos={productos} categorias={categorias} catFiltro={catFiltro} setCatFiltro={setCatFiltro} busqueda={busqueda} setBusqueda={setBusqueda} showPrices={false} />
        </div>
      );
    }

    const totalPages = Math.ceil(total / 50);

    return (
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ color: sec.color }}>{sec.nombre}</h2>
          {esMayorista && dolarBlue && <span style={{ background: 'var(--warning-light)', padding: '4px 12px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 14 }}>💵 Dólar Blue: ${fmt(dolarBlue)}</span>}
        </div>

        {secBadges.length > 0 && (
          <div className="badges-row" style={{ marginBottom: 16 }}>
            {secBadges.map(b => <div key={b.id} className="badge-item"><span className="badge-icon">{b.icono}</span><span>{b.texto}</span></div>)}
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input style={{ flex: 1, minWidth: 200 }} placeholder="Buscar productos..." value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} />
          <select style={{ width: 200 }} value={catFiltro} onChange={e => { setCatFiltro(e.target.value); setPagina(1); }}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {cartForSection(sec.id).length > 0 && <button className="btn btn-primary" onClick={() => nav('cart')}>🛒 Ver carrito ({cartForSection(sec.id).length})</button>}
        </div>

        {/* Productos */}
        <div className="product-grid">
          {productos.map(p => {
            const pricing = getPrecio(p);
            const inStock = p.stock > 0;
            return (
              <div key={p.id} className="product-card" onClick={() => { if (inStock && pricing.final) addToCart(sec.id, p, 1, pricing.final); }}>
                <div className="product-card-img">
                  {p.imagen ? <img src={p.imagen} alt={p.nombre || p.modelo} /> : <span className="no-img">📦</span>}
                  <div className="product-badges">
                    {p.envio_gratis && <span className="product-badge envio-gratis">ENVÍO GRATIS</span>}
                    {pricing.descuento && <span className="product-badge descuento">{pricing.descuento}% OFF</span>}
                  </div>
                </div>
                <div className="product-card-body">
                  <div className="product-card-name">{p.nombre || p.modelo}</div>
                  <div className="product-card-cat">{p.categoria}</div>
                  {pricing.final !== undefined && (
                    pricing.original ? (
                      <div className="price-revendedor">
                        <span className="price-old">${fmt(pricing.original)}</span>
                        <span className="price-new">${fmt(pricing.final)}</span>
                      </div>
                    ) : <div className="product-card-price">${fmt(pricing.final)}</div>
                  )}
                  <div className={`product-card-stock ${inStock ? 'in-stock' : 'no-stock'}`}>{inStock ? `Stock: ${p.stock}` : 'Sin stock'}</div>
                </div>
              </div>
            );
          })}
        </div>
        {productos.length === 0 && <div className="empty-state"><div className="empty-icon">📭</div><h3>No hay productos</h3></div>}

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>← Ant</button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Pág {pagina} de {totalPages}</span>
            <button disabled={pagina >= totalPages} onClick={() => setPagina(pagina + 1)}>Sig →</button>
          </div>
        )}
      </div>
    );
  };

  // Vitrina grid (sin precios para mayorista)
  const VitrineGrid = ({ productos, categorias, catFiltro, setCatFiltro, busqueda, setBusqueda, showPrices = true }) => (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input style={{ flex: 1, minWidth: 200 }} placeholder="Buscar productos..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select style={{ width: 200 }} value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="product-grid">
        {productos.map(p => (
          <div key={p.id} className="product-card">
            <div className="product-card-img">{p.imagen ? <img src={p.imagen} alt={p.nombre || p.modelo} /> : <span className="no-img">📦</span>}</div>
            <div className="product-card-body">
              <div className="product-card-name">{p.nombre || p.modelo}</div>
              <div className="product-card-cat">{p.categoria}</div>
              {showPrices && p.precio_base && <div className="product-card-price">${fmt(p.precio_base)}</div>}
              {!showPrices && <a href="#" onClick={e => { e.preventDefault(); nav('login'); }} style={{ fontSize: 13 }}>🔒 Iniciar sesión para ver precios</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ═══ LOGIN / REGISTER ═══
  const LoginPage = () => {
    const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
    return (
      <div className="fade-in" style={{ maxWidth: 400, margin: '40px auto' }}>
        <div className="card">
          <h2 style={{ marginBottom: 20 }}>Iniciar sesión</h2>
          {err && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: 10, borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 14 }}>{err}</div>}
          <div className="form-group"><label className="form-label">Usuario</label><input value={u} onChange={e => setU(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Contraseña</label><input type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin(u, p)} /></div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => handleLogin(u, p)}>Ingresar</button>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-secondary)' }}>¿No tenés cuenta? <a href="#" onClick={e => { e.preventDefault(); nav('register'); }}>Registrarse</a></p>
        </div>
      </div>
    );
  };

  const RegisterPage = () => {
    const [form, setForm] = useState({ nombre: '', usuario: '', password: '', telefono: '', email: '', nombre_fantasia: '' });
    const [msg, setMsg] = useState('');
    const doRegister = async () => {
      try { await api.register(form); setMsg('Registro exitoso. Tu cuenta está pendiente de aprobación.'); } catch (e) { setMsg(e.message); }
    };
    return (
      <div className="fade-in" style={{ maxWidth: 500, margin: '40px auto' }}>
        <div className="card">
          <h2 style={{ marginBottom: 20 }}>Registrarse</h2>
          {msg && <div style={{ background: msg.includes('exitoso') ? 'var(--success-light)' : 'var(--danger-light)', color: msg.includes('exitoso') ? 'var(--success)' : 'var(--danger)', padding: 10, borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 14 }}>{msg}</div>}
          <div className="form-group"><label className="form-label">Nombre completo *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Usuario *</label><input value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Contraseña *</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Teléfono</label><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="form-group"><label className="form-label">Nombre de fantasía (opcional)</label><input value={form.nombre_fantasia} onChange={e => setForm({ ...form, nombre_fantasia: e.target.value })} /></div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={doRegister}>Registrarse</button>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-secondary)' }}>¿Ya tenés cuenta? <a href="#" onClick={e => { e.preventDefault(); nav('login'); }}>Ingresar</a></p>
        </div>
      </div>
    );
  };

  // ═══ CART PAGE ═══
  const CartPage = () => {
    const [cuponCode, setCuponCode] = useState('');
    const [cuponDesc, setCuponDesc] = useState(0);
    const [selectedMP, setSelectedMP] = useState('');
    const [metodosPago, setMetodosPago] = useState([]);
    const [enviando, setEnviando] = useState(false);

    const sectionsWithItems = Object.entries(cart).filter(([, items]) => items.length > 0);
    if (sectionsWithItems.length === 0) return <div className="fade-in empty-state"><div className="empty-icon">🛒</div><h3>Tu carrito está vacío</h3><button className="btn btn-primary" onClick={() => nav('landing')}>Ir a comprar</button></div>;

    useEffect(() => {
      if (sectionsWithItems.length === 1) {
        api.getMetodosPago(sectionsWithItems[0][0]).then(setMetodosPago).catch(() => {});
      }
    }, []);

    const aplicarCupon = async (secId) => {
      try {
        const items = cart[secId].map(i => ({ producto_id: i.producto_id, categoria: i.categoria, cantidad: i.cantidad, precio_unitario: i.precio_unitario }));
        const result = await api.validarCupon(cuponCode, secId, cartTotal(secId), selectedMP, items);
        setCuponDesc(result.descuento); toast(`Cupón aplicado: -$${fmt(result.descuento)}`);
      } catch (e) { toast(e.message, 'error'); setCuponDesc(0); }
    };

    const checkout = async (secId) => {
      if (!user) { toast('Necesitás iniciar sesión para comprar', 'warning'); nav('login'); return; }
      setEnviando(true);
      try {
        const items = cart[secId]; const total = cartTotal(secId) - cuponDesc;
        const order = await api.createPedido({ items, total, seccion_id: parseInt(secId), metodo_pago: selectedMP, cupon_codigo: cuponCode || '', cupon_descuento: cuponDesc });
        api.trackPurchase(order.id, total, items);
        setCart(prev => { const n = { ...prev }; delete n[secId]; return n; });
        setCuponCode(''); setCuponDesc(0);
        toast('¡Pedido creado exitosamente!');
      } catch (e) { toast(e.message, 'error'); }
      setEnviando(false);
    };

    return (
      <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 20 }}>🛒 Carrito</h2>
        {sectionsWithItems.map(([secId, items]) => {
          const sec = secciones.find(s => s.id === parseInt(secId));
          return (
            <div key={secId} className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title" style={{ color: sec?.color }}>{sec?.nombre || 'Sección'}</span></div>
              {items.map(item => (
                <div key={item.producto_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  {item.imagen ? <img src={item.imagen} style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>📦</span>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{item.nombre_producto}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>${fmt(item.precio_unitario)} x {item.cantidad}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => updateCartQty(secId, item.producto_id, item.cantidad - 1)}>-</button>
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{item.cantidad}</span>
                    <button className="btn btn-outline btn-sm" onClick={() => updateCartQty(secId, item.producto_id, item.cantidad + 1)}>+</button>
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 8 }} onClick={() => removeFromCart(secId, item.producto_id)}>🗑</button>
                  </div>
                  <div style={{ fontWeight: 600, minWidth: 80, textAlign: 'right' }}>${fmt(item.precio_unitario * item.cantidad)}</div>
                </div>
              ))}
              {/* Cupón */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input placeholder="Código de cupón" value={cuponCode} onChange={e => setCuponCode(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-outline btn-sm" onClick={() => aplicarCupon(secId)}>Aplicar</button>
              </div>
              {cuponDesc > 0 && <div style={{ color: 'var(--success)', fontSize: 14, marginTop: 4 }}>Descuento: -${fmt(cuponDesc)}</div>}
              {/* Método de pago */}
              {metodosPago.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label className="form-label">Método de pago</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {metodosPago.map(mp => (
                      <button key={mp.id} className={`btn ${selectedMP === mp.nombre ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setSelectedMP(mp.nombre)} title={mp.instrucciones}>
                        {mp.nombre}
                      </button>
                    ))}
                  </div>
                  {selectedMP && metodosPago.find(m => m.nombre === selectedMP)?.instrucciones && (
                    <div style={{ background: 'var(--bg-section)', padding: 10, borderRadius: 'var(--radius)', marginTop: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                      {metodosPago.find(m => m.nombre === selectedMP).instrucciones}
                    </div>
                  )}
                </div>
              )}
              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '2px solid var(--border)' }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>Total: ${fmt(cartTotal(secId) - cuponDesc)}</span>
                <button className="btn btn-primary btn-lg" onClick={() => checkout(secId)} disabled={enviando}>{enviando ? 'Enviando...' : 'Confirmar pedido'}</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ═══ MAINTENANCE ═══
  const MaintenancePage = () => (
    <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}>
      <h1>🔧 En mantenimiento</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Estamos trabajando en mejoras. Volvemos pronto.</p>
      <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={() => nav('login')}>Acceso admin</button>
    </div>
  );

  // ═══ ADMIN PANEL ═══
  const AdminPanel = () => {
    const tabs = [
      { id: 'dashboard', label: '📊 Dashboard' },
      { id: 'productos', label: '📦 Productos' },
      { id: 'pedidos', label: '🛍 Pedidos' },
      { id: 'usuarios', label: '👥 Usuarios' },
      { id: 'cupones', label: '🎫 Cupones' },
      { id: 'promociones', label: '🏷 Promociones' },
      { id: 'popups', label: '📢 Pop-ups' },
      { id: 'paginas', label: '📄 Páginas' },
      { id: 'badges', label: '⭐ Badges' },
      { id: 'metodos_pago', label: '💳 Pagos' },
      { id: 'menu', label: '📋 Menú' },
      { id: 'redes', label: '🌐 Redes' },
      { id: 'diseno', label: '🎨 Diseño' },
      { id: 'config', label: '⚙️ Config' },
    ];

    return (
      <div className="fade-in full-width">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2>Panel de Administración</h2>
          <div className="section-selector">
            <button className={`section-btn ${adminSeccion === 'all' ? 'active' : ''}`} onClick={() => setAdminSeccion('all')}>Todas</button>
            {secciones.map(s => <button key={s.id} className={`section-btn ${adminSeccion === String(s.id) ? 'active' : ''}`} style={adminSeccion === String(s.id) ? { borderColor: s.color, background: s.color } : {}} onClick={() => setAdminSeccion(String(s.id))}>{s.nombre}</button>)}
          </div>
        </div>
        <div className="tabs">
          {tabs.map(t => <button key={t.id} className={`tab ${adminTab === t.id ? 'active' : ''}`} onClick={() => setAdminTab(t.id)}>{t.label}</button>)}
        </div>
        {adminTab === 'dashboard' && <AdminDashboard />}
        {adminTab === 'productos' && <AdminProductos />}
        {adminTab === 'pedidos' && <AdminPedidos />}
        {adminTab === 'usuarios' && <AdminUsuarios />}
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
    );
  };

  // ─── ADMIN DASHBOARD ───
  const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    useEffect(() => { loadStats(); }, [adminSeccion, desde, hasta]);
    const loadStats = async () => {
      const data = await api.getStats(adminSeccion !== 'all' ? adminSeccion : null, desde || null, hasta || null);
      setStats(data);
    };
    if (!stats) return <div>Cargando...</div>;
    const maxMonto = Math.max(...(stats.por_dia || []).map(d => Number(d.monto)), 1);
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="form-label" style={{ margin: 0 }}>Período:</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 150 }} />
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 150 }} />
          <button className="btn btn-outline btn-sm" onClick={() => { setDesde(''); setHasta(''); }}>Limpiar</button>
        </div>
        <div className="stat-cards">
          <div className="stat-card"><div className="stat-card-value">{stats.total_productos}</div><div className="stat-card-label">Productos</div></div>
          <div className="stat-card"><div className="stat-card-value">{stats.total_pedidos}</div><div className="stat-card-label">Pedidos</div></div>
          <div className="stat-card"><div className="stat-card-value">{stats.total_usuarios}</div><div className="stat-card-label">Usuarios</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: 'var(--success)' }}>${fmt(stats.total_ventas)}</div><div className="stat-card-label">Ventas</div></div>
        </div>
        {stats.por_dia?.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><span className="card-title">Ventas por día</span></div>
            <div className="stat-chart">
              {stats.por_dia.slice().reverse().map((d, i) => (
                <div key={i} className="stat-bar" style={{ height: `${(Number(d.monto) / maxMonto) * 100}%`, minHeight: 4 }} data-label={`${d.fecha?.slice(5)}: $${fmt(d.monto)} (${d.cantidad})`} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── ADMIN PRODUCTOS (inline editable) ───
  const AdminProductos = () => {
    const [productos, setProductos] = useState([]); const [busq, setBusq] = useState(''); const [showForm, setShowForm] = useState(false); const [editProd, setEditProd] = useState(null);
    const [pagina, setPagina] = useState(1); const [total, setTotal] = useState(0);

    useEffect(() => { load(); }, [adminSeccion, busq, pagina]);
    const load = async () => {
      const data = await api.getProductos({ seccion_id: adminSeccion !== 'all' ? adminSeccion : undefined, q: busq, page: pagina, limit: 30 });
      setProductos(data.productos); setTotal(data.total);
    };

    const inlineUpdate = async (id, field, value) => {
      await api.updateProducto(id, { [field]: value });
      setProductos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input placeholder="Buscar productos..." value={busq} onChange={e => { setBusq(e.target.value); setPagina(1); }} style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => { setEditProd(null); setShowForm(true); }}>+ Nuevo producto</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-product-list">
            <thead><tr><th></th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Oferta</th><th>Stock</th><th>Sección</th><th>👁</th><th></th></tr></thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id}>
                  <td>{p.imagen ? <img className="thumb" src={p.imagen} /> : '📦'}</td>
                  <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre || p.modelo}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.categoria}</td>
                  <td><input className="inline-input" type="number" defaultValue={p.precio_base} onBlur={e => { if (e.target.value !== String(p.precio_base)) inlineUpdate(p.id, 'precio_base', Number(e.target.value)); }} /></td>
                  <td><input className="inline-input" type="number" defaultValue={p.precio_oferta || ''} placeholder="0" onBlur={e => inlineUpdate(p.id, 'precio_oferta', Number(e.target.value) || 0)} /></td>
                  <td><input className="inline-input" type="number" defaultValue={p.stock} style={{ width: 60 }} onBlur={e => inlineUpdate(p.id, 'stock', parseInt(e.target.value) || 0)} /></td>
                  <td style={{ fontSize: 12 }}>{secciones.find(s => s.id === p.seccion_id)?.nombre || '—'}</td>
                  <td><span className={`toggle-vis ${p.visible ? 'active' : ''}`} onClick={() => inlineUpdate(p.id, 'visible', !p.visible)}>{p.visible ? '👁' : '🚫'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setEditProd(p); setShowForm(true); }}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('¿Eliminar?')) { await api.deleteProducto(p.id); load(); toast('Eliminado'); } }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{total} productos</span>
          <div className="pagination">
            <button disabled={pagina <= 1} onClick={() => setPagina(pagina-1)}>←</button>
            <button disabled={pagina >= Math.ceil(total/30)} onClick={() => setPagina(pagina+1)}>→</button>
          </div>
        </div>

        {showForm && <ProductFormModal producto={editProd} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); load(); toast(editProd ? 'Actualizado' : 'Creado'); }} secciones={secciones} />}
      </div>
    );
  };

  // ─── PRODUCT FORM MODAL ───
  const ProductFormModal = ({ producto, onClose, onSave, secciones }) => {
    const [form, setForm] = useState(producto || { nombre: '', categoria: '', modelo: '', precio_base: 0, precio_oferta: 0, stock: 0, stock_minimo: 0, imagen: '', descripcion: '', sku: '', tipo: 'fisico', moneda: 'ARS', envio_gratis: false, visible: true, compatibilidad: '', seccion_id: adminSeccion !== 'all' ? parseInt(adminSeccion) : 1, marca: '', compra_minima_unidades: 1, peso: 0, alto: 0, ancho: 0, largo: 0, notas: '' });
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();

    const handleUpload = async (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      setUploading(true);
      try { const data = await api.uploadImagen(file); setForm(f => ({ ...f, imagen: data.url })); }
      catch (e) { toast('Error subiendo imagen', 'error'); }
      setUploading(false);
    };

    const save = async () => {
      try {
        if (producto?.id) await api.updateProducto(producto.id, form);
        else await api.createProducto(form);
        onSave();
      } catch (e) { toast(e.message, 'error'); }
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><span className="modal-title">{producto ? 'Editar producto' : 'Nuevo producto'}</span><button className="modal-close" onClick={onClose}>✕</button></div>
          <div className="modal-body">
            {/* Imagen */}
            <div className="form-group">
              <label className="form-label">Imagen</label>
              <div className="dropzone" onClick={() => fileRef.current?.click()}>
                {form.imagen ? <img src={form.imagen} alt="Preview" /> : <div><p>📷 Click o arrastrá una imagen</p><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>JPG, PNG, WebP (máx 5MB)</p></div>}
                {uploading && <p>Subiendo...</p>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
              <input placeholder="O pegar URL de imagen" value={form.imagen} onChange={e => setForm({ ...form, imagen: e.target.value })} style={{ marginTop: 8 }} />
            </div>

            <div className="form-row">
              <div className="form-group"><label className="form-label">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Categoría *</label><input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Marca</label><input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">SKU</label><input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">Descripción</label><textarea rows={3} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>

            <div className="form-row-3">
              <div className="form-group"><label className="form-label">Precio base</label><input type="number" value={form.precio_base} onChange={e => setForm({ ...form, precio_base: Number(e.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Precio oferta</label><input type="number" value={form.precio_oferta} onChange={e => setForm({ ...form, precio_oferta: Number(e.target.value) })} /><div className="form-help">0 = sin oferta</div></div>
              <div className="form-group"><label className="form-label">Moneda</label><select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}><option value="ARS">ARS</option><option value="USD">USD</option><option value="USDT">USDT</option></select></div>
            </div>
            <div className="form-row-3">
              <div className="form-group"><label className="form-label">Stock</label><input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} /></div>
              <div className="form-group"><label className="form-label">Stock mínimo</label><input type="number" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })} /></div>
              <div className="form-group"><label className="form-label">Compra mín. unid.</label><input type="number" value={form.compra_minima_unidades} onChange={e => setForm({ ...form, compra_minima_unidades: parseInt(e.target.value) || 1 })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="fisico">Físico</option><option value="digital">Digital</option></select></div>
              <div className="form-group"><label className="form-label">Sección</label><select value={form.seccion_id} onChange={e => setForm({ ...form, seccion_id: parseInt(e.target.value) })}>{secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
            </div>
            {form.tipo === 'fisico' && (
              <div className="form-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                <div className="form-group"><label className="form-label">Peso (g)</label><input type="number" value={form.peso} onChange={e => setForm({ ...form, peso: parseInt(e.target.value) || 0 })} /></div>
                <div className="form-group"><label className="form-label">Alto (cm)</label><input type="number" value={form.alto} onChange={e => setForm({ ...form, alto: parseInt(e.target.value) || 0 })} /></div>
                <div className="form-group"><label className="form-label">Ancho (cm)</label><input type="number" value={form.ancho} onChange={e => setForm({ ...form, ancho: parseInt(e.target.value) || 0 })} /></div>
                <div className="form-group"><label className="form-label">Largo (cm)</label><input type="number" value={form.largo} onChange={e => setForm({ ...form, largo: parseInt(e.target.value) || 0 })} /></div>
              </div>
            )}
            <div className="form-group"><label className="form-label">Compatibilidad</label><input value={form.compatibilidad} onChange={e => setForm({ ...form, compatibilidad: e.target.value })} placeholder="Ej: iPhone 12, 12 Pro, 13" /></div>
            <div className="form-group"><label className="form-label">Notas internas</label><textarea rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={form.envio_gratis} onChange={e => setForm({ ...form, envio_gratis: e.target.checked })} /> Envío gratis</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })} /> Visible</label>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>Guardar</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── ADMIN: Pedidos, Usuarios, Cupones, etc (simplified for space) ───
  const AdminPedidos = () => { const [pedidos, setPedidos] = useState([]); const [arch, setArch] = useState(false);
    useEffect(() => { api.getPedidos({ all: true, archivado: arch, seccion_id: adminSeccion !== 'all' ? adminSeccion : null }).then(setPedidos); }, [adminSeccion, arch]);
    const estados = ['pendiente','preparando','listo','entregado','cancelado'];
    const colores = { pendiente:'var(--warning)',preparando:'var(--primary)',listo:'var(--purple)',entregado:'var(--success)',cancelado:'var(--danger)' };
    return (<div><div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><button className={`btn btn-sm ${!arch ? 'btn-primary' : 'btn-outline'}`} onClick={() => setArch(false)}>Activos ({pedidos.filter(p => !p.archivado).length})</button><button className={`btn btn-sm ${arch ? 'btn-primary' : 'btn-outline'}`} onClick={() => setArch(true)}>Archivados</button></div>
      {pedidos.map(p => (<div key={p.id} className="card" style={{ marginBottom: 8, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong>#{p.id}</strong> — {p.usuario_nombre || p.cliente_nombre} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</span></div><div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ background: colores[p.estado], color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{p.estado}</span><select value={p.estado} onChange={async e => { await api.updatePedido(p.id, { estado: e.target.value }); api.getPedidos({ all: true, archivado: arch, seccion_id: adminSeccion !== 'all' ? adminSeccion : null }).then(setPedidos); toast('Estado actualizado'); }} style={{ width: 120, padding: 4 }}>{estados.map(e => <option key={e} value={e}>{e}</option>)}</select><span style={{ fontWeight: 700 }}>${fmt(p.total)}</span>
        {!p.archivado && <button className="btn btn-outline btn-sm" onClick={async () => { await api.archivarPedido(p.id); api.getPedidos({ all: true, archivado: arch, seccion_id: adminSeccion !== 'all' ? adminSeccion : null }).then(setPedidos); }}>📥</button>}
      </div></div></div>))}
      {pedidos.length === 0 && <div className="empty-state"><h3>No hay pedidos</h3></div>}
    </div>);
  };

  const AdminUsuarios = () => { const [users, setUsers] = useState([]); const [busq, setBusq] = useState('');
    useEffect(() => { api.getUsuarios(busq).then(setUsers); }, [busq]);
    return (<div><input placeholder="Buscar por nombre, usuario o fantasía..." value={busq} onChange={e => setBusq(e.target.value)} style={{ marginBottom: 12 }} />
      {users.map(u => (<div key={u.id} className="card" style={{ marginBottom: 8, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}><div><strong>{u.nombre}</strong> <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>@{u.usuario}</span> {u.nombre_fantasia && <span style={{ fontSize: 12 }}>({u.nombre_fantasia})</span>}</div><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ background: u.estado === 'activo' ? 'var(--success-light)' : u.estado === 'pendiente' ? 'var(--warning-light)' : 'var(--danger-light)', color: u.estado === 'activo' ? 'var(--success)' : u.estado === 'pendiente' ? 'var(--warning)' : 'var(--danger)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{u.estado}</span>
        {u.estado === 'pendiente' && <><button className="btn btn-success btn-sm" onClick={async () => { await api.aprobarUsuario(u.id); api.getUsuarios(busq).then(setUsers); toast('Aprobado'); }}>✓ Aprobar</button><button className="btn btn-danger btn-sm" onClick={async () => { await api.rechazarUsuario(u.id); api.getUsuarios(busq).then(setUsers); }}>✕ Rechazar</button></>}
        {u.estado === 'activo' && <button className="btn btn-outline btn-sm" onClick={async () => { await api.resetPassword(u.id); toast('Contraseña reseteada a 1234'); }}>🔑 Reset</button>}
      </div></div></div>))}
    </div>);
  };

  const AdminCupones = () => { const [cupones, setCupones] = useState([]); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ codigo: '', tipo: 'porcentaje', valor: 0, secciones_ids: '', categoria: '' });
    const [prodSearch, setProdSearch] = useState(''); const [prodResults, setProdResults] = useState([]); const [selProds, setSelProds] = useState([]);
    useEffect(() => { api.getCupones().then(setCupones); }, []);
    const searchProds = async (q) => { setProdSearch(q); if (q.length >= 2) { const r = await api.buscarProductosAdmin(q); setProdResults(r); } else setProdResults([]); };
    const save = async () => { try { await api.createCupon({ ...form, productos_ids: selProds.map(p => p.id) }); api.getCupones().then(setCupones); setShowForm(false); toast('Cupón creado'); } catch (e) { toast(e.message, 'error'); } };
    return (<div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Cupones</h3><button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Nuevo cupón</button></div>
      {cupones.map(c => (<div key={c.id} className="card" style={{ marginBottom: 8, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong>{c.codigo}</strong> — {c.tipo}: {c.valor}{c.tipo === 'porcentaje' ? '%' : '$'} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Usos: {c.usos_actuales}/{c.uso_maximo || '∞'}</span></div><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteCupon(c.id); api.getCupones().then(setCupones); }}>🗑</button></div></div>))}
      {showForm && (<div className="modal-overlay" onClick={() => setShowForm(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">Nuevo cupón</span><button className="modal-close" onClick={() => setShowForm(false)}>✕</button></div><div className="modal-body">
        <div className="form-row"><div className="form-group"><label className="form-label">Código</label><input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })} /></div><div className="form-group"><label className="form-label">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="porcentaje">Porcentaje</option><option value="monto_fijo">Monto fijo</option><option value="envio_gratis">Envío gratis</option></select></div></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Valor</label><input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: Number(e.target.value) })} /></div><div className="form-group"><label className="form-label">Secciones (IDs sep. por coma)</label><input value={form.secciones_ids} onChange={e => setForm({ ...form, secciones_ids: e.target.value })} placeholder="1,2,3" /></div></div>
        <div className="form-group"><label className="form-label">Productos (buscar)</label><input placeholder="Buscar productos..." value={prodSearch} onChange={e => searchProds(e.target.value)} />
          {prodResults.length > 0 && <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxHeight: 150, overflowY: 'auto', marginTop: 4 }}>{prodResults.map(p => <div key={p.id} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)' }} onClick={() => { if (!selProds.find(sp => sp.id === p.id)) setSelProds([...selProds, p]); setProdResults([]); setProdSearch(''); }}>{p.nombre || p.modelo} — {p.categoria}</div>)}</div>}
          {selProds.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>{selProds.map(p => <span key={p.id} style={{ background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }} onClick={() => setSelProds(selProds.filter(sp => sp.id !== p.id))}>{p.nombre || p.modelo} ✕</span>)}</div>}
        </div>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Crear</button></div></div></div>)}
    </div>);
  };

  // Simplified admin sections
  const AdminPromociones = () => { const [promos, setPromos] = useState([]); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ nombre: '', tipo: 'porcentaje', valor: 0, secciones_ids: '', categoria: '', productos_ids: '' });
    useEffect(() => { api.getPromociones().then(setPromos); }, []);
    const save = async () => { try { await api.createPromocion(form); api.getPromociones().then(setPromos); setShowForm(false); toast('Promoción creada'); } catch (e) { toast(e.message, 'error'); } };
    return (<div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Promociones automáticas</h3><button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Nueva</button></div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>Se aplican automáticamente sin código. El cliente ve el descuento directo.</p>
      {promos.map(p => (<div key={p.id} className="card" style={{ marginBottom: 8, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong>{p.nombre}</strong> — {p.tipo}: {p.valor}{p.tipo === 'porcentaje' ? '%' : '$'} <span style={{ background: p.activa ? 'var(--success-light)' : 'var(--danger-light)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{p.activa ? 'Activa' : 'Inactiva'}</span></div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={async () => { await api.updatePromocion(p.id, { activa: !p.activa }); api.getPromociones().then(setPromos); }}>{p.activa ? '⏸' : '▶'}</button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deletePromocion(p.id); api.getPromociones().then(setPromos); }}>🗑</button></div></div></div>))}
      {showForm && (<div className="modal-overlay" onClick={() => setShowForm(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">Nueva promoción</span><button className="modal-close" onClick={() => setShowForm(false)}>✕</button></div><div className="modal-body">
        <div className="form-group"><label className="form-label">Nombre</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="porcentaje">Porcentaje</option><option value="monto_fijo">Monto fijo</option></select></div><div className="form-group"><label className="form-label">Valor</label><input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: Number(e.target.value) })} /></div></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Secciones (IDs)</label><input value={form.secciones_ids} onChange={e => setForm({ ...form, secciones_ids: e.target.value })} placeholder="1,2,3" /></div><div className="form-group"><label className="form-label">Categoría</label><input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} /></div></div>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Crear</button></div></div></div>)}
    </div>);
  };

  const AdminPopups = () => { const [popups, setPopups] = useState([]); const [form, setForm] = useState({ titulo: '', imagen: '', url_destino: '', secciones_ids: '' }); const [show, setShow] = useState(false);
    useEffect(() => { api.getPopupsAll().then(setPopups); }, []);
    const save = async () => { await api.createPopup(form); api.getPopupsAll().then(setPopups); setShow(false); toast('Pop-up creado'); };
    return (<div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Pop-ups promocionales</h3><button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ Nuevo</button></div>
      {popups.map(p => (<div key={p.id} className="card" style={{ marginBottom: 8, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div>{p.imagen && <img src={p.imagen} style={{ height: 40, borderRadius: 4, marginRight: 8 }} />}<strong>{p.titulo || 'Sin título'}</strong></div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={async () => { await api.updatePopup(p.id, { activo: !p.activo }); api.getPopupsAll().then(setPopups); }}>{p.activo ? '⏸' : '▶'}</button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deletePopup(p.id); api.getPopupsAll().then(setPopups); }}>🗑</button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">Nuevo pop-up</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-group"><label className="form-label">Título</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">URL imagen</label><input value={form.imagen} onChange={e => setForm({ ...form, imagen: e.target.value })} placeholder="https://..." /></div>
        <div className="form-group"><label className="form-label">URL destino (click)</label><input value={form.url_destino} onChange={e => setForm({ ...form, url_destino: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Secciones (IDs sep. por coma, vacío = todas)</label><input value={form.secciones_ids} onChange={e => setForm({ ...form, secciones_ids: e.target.value })} /></div>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Crear</button></div></div></div>)}
    </div>);
  };

  const AdminPaginas = () => { const [paginas, setPaginas] = useState([]); const [show, setShow] = useState(false); const [form, setForm] = useState({ titulo: '', slug: '', contenido: '', seccion_id: null, orden: 0 });
    useEffect(() => { api.getPaginas().then(setPaginas); }, []);
    const save = async () => { await api.createPagina(form); api.getPaginas().then(setPaginas); setShow(false); toast('Página creada'); };
    return (<div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Páginas informativas</h3><button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ Nueva</button></div>
      {paginas.map(p => (<div key={p.id} className="card" style={{ marginBottom: 8, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><strong>{p.titulo}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/{p.slug}</span></div><button className="btn btn-danger btn-sm" onClick={async () => { await api.deletePagina(p.id); api.getPaginas().then(setPaginas); }}>🗑</button></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">Nueva página</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-row"><div className="form-group"><label className="form-label">Título</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div><div className="form-group"><label className="form-label">Slug</label><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div></div>
        <div className="form-group"><label className="form-label">Contenido</label><textarea rows={6} value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} /></div>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Crear</button></div></div></div>)}
    </div>);
  };

  const AdminBadges = () => { const [bgs, setBgs] = useState([]); const [show, setShow] = useState(false); const [form, setForm] = useState({ icono: '⭐', texto: '', secciones_ids: '' });
    useEffect(() => { api.getBadgesAll().then(setBgs); }, []);
    const save = async () => { await api.createBadge(form); api.getBadgesAll().then(setBgs); setShow(false); toast('Badge creado'); };
    return (<div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Badges de confianza</h3><button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ Nuevo</button></div>
      {bgs.map(b => (<div key={b.id} className="card" style={{ marginBottom: 8, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><span style={{ fontSize: 24, marginRight: 8 }}>{b.icono}</span>{b.texto} {b.secciones_ids && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(Secciones: {b.secciones_ids})</span>}</div><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteBadge(b.id); api.getBadgesAll().then(setBgs); }}>🗑</button></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">Nuevo badge</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-row"><div className="form-group"><label className="form-label">Ícono</label><input value={form.icono} onChange={e => setForm({ ...form, icono: e.target.value })} maxLength={4} /></div><div className="form-group"><label className="form-label">Texto</label><input value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} /></div></div>
        <div className="form-group"><label className="form-label">Secciones (IDs, vacío = todas)</label><input value={form.secciones_ids} onChange={e => setForm({ ...form, secciones_ids: e.target.value })} placeholder="1,2,3" /></div>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Crear</button></div></div></div>)}
    </div>);
  };

  const AdminMetodosPago = () => { const [mps, setMps] = useState([]); const [show, setShow] = useState(false); const [form, setForm] = useState({ nombre: '', descripcion: '', instrucciones: '', seccion_id: null });
    useEffect(() => { api.getMetodosPagoAll().then(setMps); }, []);
    const save = async () => { await api.createMetodoPago(form); api.getMetodosPagoAll().then(setMps); setShow(false); toast('Método creado'); };
    return (<div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Métodos de pago</h3><button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ Nuevo</button></div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>El cliente ve botones seleccionables con las instrucciones correspondientes.</p>
      {mps.map(m => (<div key={m.id} className="card" style={{ marginBottom: 8, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong>{m.nombre}</strong> {m.descripcion && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>— {m.descripcion}</span>}</div><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteMetodoPago(m.id); api.getMetodosPagoAll().then(setMps); }}>🗑</button></div>{m.instrucciones && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{m.instrucciones}</div>}</div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">Nuevo método de pago</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-group"><label className="form-label">Nombre</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Transferencia, Efectivo, USDT" /></div>
        <div className="form-group"><label className="form-label">Descripción</label><input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Transferencia bancaria" /></div>
        <div className="form-group"><label className="form-label">Instrucciones</label><textarea rows={4} value={form.instrucciones} onChange={e => setForm({ ...form, instrucciones: e.target.value })} placeholder="CBU: 000000000000&#10;Alias: MI-ALIAS&#10;Titular: Nombre" /></div>
        <div className="form-group"><label className="form-label">Sección (vacío = todas)</label><select value={form.seccion_id || ''} onChange={e => setForm({ ...form, seccion_id: e.target.value ? parseInt(e.target.value) : null })}><option value="">Todas</option>{secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Crear</button></div></div></div>)}
    </div>);
  };

  const AdminMenu = () => { const [items, setItems] = useState([]); const [show, setShow] = useState(false); const [form, setForm] = useState({ titulo: '', url: '', tipo: 'link', orden: 0 });
    useEffect(() => { api.getMenuAll().then(setItems); }, []);
    const save = async () => { await api.createMenuItem(form); api.getMenuAll().then(setItems); setShow(false); toast('Item creado'); };
    return (<div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Menú principal</h3><button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ Nuevo item</button></div>
      {items.map(m => (<div key={m.id} className="card" style={{ marginBottom: 8, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong>{m.titulo}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.url} ({m.tipo})</span></div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={async () => { await api.updateMenuItem(m.id, { visible: !m.visible }); api.getMenuAll().then(setItems); }}>{m.visible ? '👁' : '🚫'}</button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteMenuItem(m.id); api.getMenuAll().then(setItems); }}>🗑</button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">Nuevo item</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-row"><div className="form-group"><label className="form-label">Título</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div><div className="form-group"><label className="form-label">URL</label><input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="/seccion/local" /></div></div>
        <div className="form-row"><div className="form-group"><label className="form-label">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="link">Link</option><option value="seccion">Sección</option></select></div><div className="form-group"><label className="form-label">Orden</label><input type="number" value={form.orden} onChange={e => setForm({ ...form, orden: parseInt(e.target.value) || 0 })} /></div></div>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Crear</button></div></div></div>)}
    </div>);
  };

  const AdminRedes = () => { const [redes, setRedes] = useState([]);
    useEffect(() => { api.getRedesSociales().then(setRedes); }, []);
    const guardar = async () => { await api.updateRedesSociales(redes); toast('Redes guardadas'); };
    const labels = { facebook: '📘 Facebook', instagram: '📸 Instagram', tiktok: '🎵 TikTok', whatsapp_canal: '💬 Canal WhatsApp', whatsapp_grupo: '💬 Grupo WhatsApp' };
    return (<div><h3 style={{ marginBottom: 12 }}>Redes sociales</h3>
      {redes.map((r, i) => (<div key={r.id || i} className="card" style={{ marginBottom: 8, padding: 12 }}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 100 }}><input type="checkbox" checked={r.activo} onChange={e => { const n = [...redes]; n[i] = { ...n[i], activo: e.target.checked }; setRedes(n); }} />{labels[r.tipo] || r.tipo}</label>
        <input placeholder="URL" value={r.url} onChange={e => { const n = [...redes]; n[i] = { ...n[i], url: e.target.value }; setRedes(n); }} style={{ flex: 1 }} />
      </div></div>))}
      <button className="btn btn-primary" onClick={guardar}>Guardar redes</button>
    </div>);
  };

  const AdminDiseno = () => { const [des, setDes] = useState({});
    useEffect(() => { api.getDesign().then(setDes); }, []);
    const guardar = async () => { await api.updateDesign(des); setDesign(des); toast('Diseño guardado'); };
    return (<div><h3 style={{ marginBottom: 12 }}>Diseño y personalización</h3><div className="card">
      <div className="form-row"><div className="form-group"><label className="form-label">Nombre de la tienda</label><input value={des.nombre_tienda || ''} onChange={e => setDes({ ...des, nombre_tienda: e.target.value })} /></div><div className="form-group"><label className="form-label">URL del logo</label><input value={des.logo_url || ''} onChange={e => setDes({ ...des, logo_url: e.target.value })} /></div></div>
      <div className="form-row"><div className="form-group"><label className="form-label">URL del favicon</label><input value={des.favicon_url || ''} onChange={e => setDes({ ...des, favicon_url: e.target.value })} /></div><div className="form-group"><label className="form-label">Plantilla</label><select value={des.plantilla || 'moderna'} onChange={e => setDes({ ...des, plantilla: e.target.value })}><option value="moderna">Moderna</option><option value="clasica">Clásica</option><option value="minimalista">Minimalista</option></select></div></div>
      <div className="form-row-3"><div className="form-group"><label className="form-label">Color primario</label><input type="color" value={des.color_primario || '#2563eb'} onChange={e => setDes({ ...des, color_primario: e.target.value })} /></div><div className="form-group"><label className="form-label">Color secundario</label><input type="color" value={des.color_secundario || '#1e40af'} onChange={e => setDes({ ...des, color_secundario: e.target.value })} /></div><div className="form-group"><label className="form-label">Color acento</label><input type="color" value={des.color_acento || '#f59e0b'} onChange={e => setDes({ ...des, color_acento: e.target.value })} /></div></div>
      <div className="form-group"><label className="form-label">Texto del footer</label><input value={des.footer_texto || ''} onChange={e => setDes({ ...des, footer_texto: e.target.value })} /></div>
      <button className="btn btn-primary" onClick={guardar} style={{ marginTop: 12 }}>Guardar diseño</button>
    </div></div>);
  };

  const AdminConfig = () => { const [cfg, setCfg] = useState({});
    useEffect(() => { api.getConfig().then(setCfg); }, []);
    const guardar = async () => { await api.updateConfig(cfg); setConfig(cfg); toast('Configuración guardada'); };
    return (<div><h3 style={{ marginBottom: 12 }}>Configuración general</h3><div className="card">
      <div className="form-row"><div className="form-group"><label className="form-label">WhatsApp flotante (número)</label><input value={cfg.whatsapp_flotante || ''} onChange={e => setCfg({ ...cfg, whatsapp_flotante: e.target.value })} placeholder="5491122525568" /></div><div className="form-group"><label className="form-label">Dólar Blue (solo mayorista)</label><input type="number" value={cfg.dolar_blue || ''} onChange={e => setCfg({ ...cfg, dolar_blue: e.target.value })} /></div></div>
      <div className="form-row"><div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={cfg.alertas_stock === 'true'} onChange={e => setCfg({ ...cfg, alertas_stock: e.target.checked ? 'true' : 'false' })} /> Alertas de stock bajo</label></div></div>
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <h4 style={{ marginBottom: 8 }}>Mantenimiento</h4>
        <button className="btn btn-warning" onClick={async () => { const activo = cfg.mantenimiento_activo !== 'true'; await api.setMaintenanceMode(activo, cfg.mantenimiento_mensaje || 'En mantenimiento'); setCfg({ ...cfg, mantenimiento_activo: activo ? 'true' : 'false' }); toast(activo ? 'Mantenimiento activado' : 'Mantenimiento desactivado'); }}>
          {cfg.mantenimiento_activo === 'true' ? '🔓 Desactivar mantenimiento' : '🔧 Activar mantenimiento'}
        </button>
      </div>
      <button className="btn btn-primary" onClick={guardar} style={{ marginTop: 16 }}>Guardar configuración</button>
    </div></div>);
  };

  // ═══ RENDER ═══
  return (
    <div className="app-container">
      <Header />
      <ToastContainer />
      <div className="main-content">{renderPage()}</div>
      <Footer />
    </div>
  );
}
