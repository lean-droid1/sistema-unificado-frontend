// Panel de administración y web de ComerciApp: se cargan aparte (lazy) para que la tienda baje menos código.
import { useState, useEffect, useRef, useMemo, useContext, Fragment } from 'react';
import { createPortal } from 'react-dom';
import * as api from './api';
import { ChevronDown, Check, Store, Search, Trash2, ClipboardList, FlaskConical, Shield, CreditCard, Clock, Lock, Package, CheckCircle, Mail, MapPin, Globe, Tag, RefreshCw, Eye, Users, Wrench, Monitor, Smartphone, Camera, Bookmark, MessageCircle, AlertTriangle, Archive, BarChart3, DollarSign, FileText, History, Lightbulb, Printer, Receipt, Ticket, User, Wallet, XCircle, EyeOff, Ban, X, ChevronLeft, ChevronRight, ImagePlus, LayoutList, SquareKanban, ArrowLeft, Plus } from 'lucide-react';
import { AvisoSeccion, CARD_STYLES, Ctx, FONT_OPTIONS, ICON_MAP, Ico, ItemProd, RADIUS_STYLES, RedIcon, RenderIcon, SHADOW_STYLES, TEMA_KEYS, THEME_PRESETS, TextBar, applyDesignVars, codificarCarrito, ensureFont, faltaTxt, fmt, fmtARS, fmtUSD, imagenesPopup, imgOpt, mostrarUsdSec, numOrden, productPath, redIconTipo, slugify, urlSegura, useCotizacionUsd, waIntl, waLink } from './App.jsx';

// Escapa texto para el HTML que se arma a mano (ventanas de impresión): un nombre o nota con código no se ejecuta
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Imprime una ventana armada con document.write sin scripts adentro (la política de seguridad los bloquea):
// espera las imágenes desde la página que la abrió y muestra el texto de respaldo si una imagen falla
function imprimirCuandoCargue(w, { espera = 300, maximo = 3000 } = {}) {
  let hecho = false;
  const imprimir = () => { if (hecho) return; hecho = true; setTimeout(() => { try { w.focus(); w.print(); } catch { /* ventana cerrada */ } }, espera); };
  try {
    const imgs = Array.from(w.document.images || []);
    imgs.forEach(i => i.addEventListener('error', () => { i.style.display = 'none'; const n = i.nextElementSibling; if (n && n.dataset && n.dataset.respaldo) n.style.display = 'block'; }));
    const pend = imgs.filter(i => !i.complete);
    if (!pend.length) { imprimir(); return; }
    let d = 0; const fin = () => { d++; if (d >= pend.length) imprimir(); };
    pend.forEach(i => { i.addEventListener('load', fin); i.addEventListener('error', fin); });
  } catch { imprimir(); return; }
  setTimeout(imprimir, maximo);
}

// Nº de orden con prefijo según tipo: presupuesto → P-0001, pedido → #0001. El id interno no cambia.
// Mensaje de WhatsApp sugerido al cambiar el estado de un pedido
const mensajeEstadoPedido = (o, estado, tracking) => {
  const n = o?.usuario_nombre || '';
  const cod = tracking || o?.codigo_seguimiento || '';
  return ({
    preparando: `¡Hola ${n}! Tu pedido #${o.id} está siendo preparado 📦`,
    listo: `¡Hola ${n}! Tu pedido #${o.id} está listo ✅`,
    enviado: `¡Hola ${n}! Tu pedido #${o.id} fue despachado 🚚${cod ? `. Código de seguimiento: ${cod}` : ''}`,
    entregado: `¡Hola ${n}! Tu pedido #${o.id} fue entregado 🎉 ¡Gracias por tu compra!`,
    cancelado: `Hola ${n}, tu pedido #${o.id} fue cancelado. Cualquier duda escribinos.`,
    pagado: `¡Hola ${n}! Confirmamos el pago de tu pedido #${o.id}. ¡Gracias! 🙌`,
  })[estado] || '';
};

const telWaPedido = (o) => { let t = o?.usuario_telefono || ''; if (!t) { try { const de = typeof o?.datos_envio === 'string' ? JSON.parse(o.datos_envio || '{}') : (o?.datos_envio || {}); t = de?.contacto?.telefono || ''; } catch {} } const d = String(t).replace(/\D/g, ''); return d ? (d.startsWith('54') ? d : '54' + d) : ''; };

// Paletas de color rápidas
const COLOR_PALETTES = [
  { name: 'Azul Pro', p: '#4A69E2', s: '#232321', a: '#FFA52F' },
  { name: 'Verde Negocio', p: '#16a34a', s: '#15803d', a: '#eab308' },
  { name: 'Rojo Audaz', p: '#dc2626', s: '#991b1b', a: '#f97316' },
  { name: 'Violeta', p: '#7c3aed', s: '#5b21b6', a: '#f472b6' },
  { name: 'Naranja', p: '#ea580c', s: '#c2410c', a: '#facc15' },
  { name: 'Turquesa', p: '#0891b2', s: '#155e75', a: '#34d399' },
  { name: 'Rosa', p: '#db2777', s: '#9d174d', a: '#fbbf24' },
  { name: 'Negro Gold', p: '#18181b', s: '#27272a', a: '#d4a853' },
];

const temaDe = (d) => Object.fromEntries(TEMA_KEYS.map(k => [k, (d && d[k]) || '']));

const ICON_LIST = Object.keys(ICON_MAP);

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

// ═══════════════════════════════════════════════════════════
// LANDING PAGE — RXZ-style: products per section
// ═══════════════════════════════════════════════════════════
function ComerciappLoginPage({ forgot, onVolver, onForgot, onLogin }) {
  const { handleLogin, toast } = useContext(Ctx);
  const [tienda, setTienda] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [busy, setBusy] = useState(false);

  const doLogin = async (code) => {
    setBusy(true);
    try {
      // Si indicó una dirección de tienda, la usamos como tenant (override). Si no, entra a la principal.
      const slug = tienda.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
      try { if (slug) sessionStorage.setItem('tenant_override', slug); else sessionStorage.removeItem('tenant_override'); } catch {}
      const r = await handleLogin(usuario, password, code || undefined);
      if (r && r.requires_otp) { setOtpStep(true); toast('Código enviado a tu email'); }
    } catch (e) { /* handleLogin ya avisa */ }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: 'calc(var(--app-vh, 1vh) * 100)', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* nav ComerciApp */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <button onClick={onVolver} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 22, color: 'var(--text-primary)' }}>Comerci<span style={{ color: 'var(--primary)' }}>App</span></button>
        <button className="btn btn-outline btn-sm" onClick={onVolver}>← Volver</button>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div className="card" style={{ maxWidth: 420, width: '100%', padding: 32, borderRadius: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 26, marginBottom: 6 }}>Comerci<span style={{ color: 'var(--primary)' }}>App</span></div>
            <h2 style={{ fontWeight: 900, fontSize: 20, margin: 0 }}>{otpStep ? 'Verificación' : forgot ? 'Recuperar contraseña' : 'Ingresá a tu panel'}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{otpStep ? 'Ingresá el código que recibiste por email' : forgot ? 'Te enviaremos instrucciones por email' : 'Administrá tu tienda'}</p>
          </div>

          {forgot ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16 }}>Para recuperar tu contraseña, escribinos por WhatsApp o email y te ayudamos a restablecerla.</p>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={onLogin}>← Volver a ingresar</button>
            </>
          ) : otpStep ? (
            <>
              <div className="form-group"><label className="form-label">CÓDIGO DE VERIFICACIÓN</label>
                <input value={otpCode} onChange={e => setOtpCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin(otpCode)} placeholder="123456" style={{ textAlign: 'center', fontSize: 24, letterSpacing: '0.3em' }} maxLength={6} autoFocus />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => doLogin(otpCode)} disabled={busy}>Verificar</button>
              <button onClick={() => { setOtpStep(false); setOtpCode(''); }} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>← Volver</button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">DIRECCIÓN DE TU TIENDA</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input value={tienda} onChange={e => setTienda(e.target.value)} placeholder="mitienda" style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>.comerciapp.com.ar</span>
                </div>
              </div>
              <div className="form-group"><label className="form-label">USUARIO</label>
                <input value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Tu usuario" />
              </div>
              <div className="form-group"><label className="form-label">CONTRASEÑA</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="Tu contraseña" style={{ width: '100%' }} />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => doLogin()} disabled={busy}>{busy ? 'Ingresando...' : 'Ingresar'}</button>
              <p style={{ textAlign: 'center', fontSize: 13, marginTop: 16, color: 'var(--text-muted)' }}>
                <button onClick={onForgot} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>¿Olvidaste tu contraseña?</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CrearTiendaPage({ onListo, onVolver }) {
  const [form, setForm] = useState({ nombre_tienda: '', slug: '', nombre: '', usuario: '', password: '', email: '', telefono: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Autogenerar slug desde el nombre de la tienda (hasta que el usuario lo edite a mano)
  const onNombreTienda = (v) => {
    set('nombre_tienda', v);
    if (!slugTouched) {
      const s = v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 30);
      set('slug', s);
    }
  };

  const enviar = async () => {
    setError('');
    if (!form.nombre_tienda || !form.slug || !form.usuario || !form.password) { setError('Completá los campos obligatorios (*)'); return; }
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) { setError('La contraseña necesita 8 caracteres o más, una mayúscula y un número'); return; }
    setSaving(true);
    try {
      const r = await api.registrarTienda(form);
      setOk(r);
    } catch (e) { setError(e.message || 'No se pudo crear la tienda'); setSaving(false); }
  };

  if (ok) {
    return (
      <div style={{ minHeight: 'calc(var(--app-vh, 1vh) * 100)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
        <div className="card" style={{ maxWidth: 460, padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}><CheckCircle size={44} style={{ verticalAlign: '-2px' }} /></div>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 10px' }}>¡Tu tienda está lista!</h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Tenés <strong>{ok.dias} días gratis</strong> con todas las funciones. Ingresá con tu usuario <strong>{ok.usuario}</strong> para empezar a cargar tu tienda.
          </p>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
            Tu dirección web: <strong>{ok.slug}.comerciapp.com.ar</strong>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onListo}>Ingresar a mi tienda</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(var(--app-vh, 1vh) * 100)', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button className="btn btn-sm btn-outline" style={{ marginBottom: 16 }} onClick={onVolver}>← Volver</button>
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 4px', textAlign: 'center' }}>Creá tu tienda</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 8px', textAlign: 'center' }}>15 días gratis con todas las funciones. Sin tarjeta.</p>

          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre de tu tienda *</label>
              <input value={form.nombre_tienda} onChange={e => onNombreTienda(e.target.value)} placeholder="Ej: Repuestos García" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Dirección web *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input value={form.slug} onChange={e => { setSlugTouched(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} placeholder="mitienda" style={{ flex: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>.comerciapp.com.ar</span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tu nombre</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Tu nombre y apellido" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Usuario *</label>
              <input value={form.usuario} onChange={e => set('usuario', e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="Con el que vas a entrar" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Contraseña *</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="8+ caracteres, una mayúscula y un número" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Opcional" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Teléfono / WhatsApp</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="Opcional" style={{ width: '100%' }} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} onClick={enviar} disabled={saving}>{saving ? 'Creando tu tienda...' : 'Crear mi tienda gratis'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComerciappLanding({ onLogin, onRegister }) {
  const [precios, setPrecios] = useState({ basic: 30000, pro: 45000, full: 60000 });
  const [oferta, setOferta] = useState({ descuento_pct: 25, meses: 3 });

  useEffect(() => {
    api.getPlanesPublicos().then(p => {
      if (p) {
        setPrecios({ basic: p.basic, pro: p.pro, full: p.full });
        setOferta({ descuento_pct: p.descuento_pct ?? 0, meses: p.meses ?? 0 });
      }
    }).catch(() => {});
  }, []);

  const money = (n) => '$' + (n || 0).toLocaleString('es-AR');
  const hayOferta = oferta.descuento_pct > 0;
  const conDescuento = (p) => Math.round((p || 0) * (1 - oferta.descuento_pct / 100));

  const planes = [
    {
      id: 'basic', nombre: 'Basic', tagline: 'Vender', precio: precios.basic, color: '#6b7280',
      destacado: false,
      features: ['Tienda online completa', 'Catálogo de productos ilimitado', 'Editor visual + 12 temas', 'Checkout, pagos y envíos', 'Página de contacto con QR', 'WhatsApp integrado', '1 administrador'],
    },
    {
      id: 'pro', nombre: 'Pro', tagline: 'Crecer', precio: precios.pro, color: '#2563eb',
      destacado: true,
      features: ['Todo lo de Basic', 'Hasta 3 tiendas', 'Punto de venta (buscador)', 'Marketing: cupones, promos, carritos', 'Caja y arqueo', 'Presupuestos', 'Reportes y analytics', 'Hasta 3 sub-administradores'],
    },
    {
      id: 'full', nombre: 'Full', tagline: 'Escalar', precio: precios.full, color: '#7c3aed',
      destacado: false,
      features: ['Todo lo de Pro', 'Tiendas ilimitadas', 'Punto de venta con lector de código', 'Mayorista con aprobación', 'Listas de precio', 'Cuenta corriente', 'Sub-administradores ilimitados', 'Soporte prioritario'],
    },
  ];

  const funciones = [
    { t: 'Tienda profesional', d: 'Catálogo con categorías, variantes, fotos y buscador. Carrito multi-sección, checkout por pasos, favoritos y modo oscuro. Todo listo para vender online desde el primer día, sin comisiones por venta.' },
    { t: 'Punto de venta', d: 'Cobrá en el mostrador buscando el producto o escaneándolo con lector de código de barras. Ventas rápidas, control de sobreventa y ficha de cliente imprimible. Ideal para local físico y online a la vez.' },
    { t: 'Control de stock', d: 'Stock en tiempo real que se descuenta con cada venta. Alertas de bajo stock, órdenes de compra que suman stock al recibir, y aviso por WhatsApp o email cuando algo se está por agotar.' },
    { t: 'Diseño a tu marca', d: 'Editor visual con vista previa en vivo: cambiá colores, logo, tipografía y textos sin saber programar. 12 temas listos para elegir, banners, popups y secciones que ordenás arrastrando.' },
    { t: 'Clientes y mayoristas', d: 'Cuenta corriente para tus clientes, listas de precio por tipo de cliente, y sección mayorista con aprobación de cuentas. Manejá minoristas y mayoristas desde el mismo lugar.' },
    { t: 'Reportes y caja', d: 'Arqueo de caja por día, semana y mes con totales por medio de pago. Reportes de ventas, productos más vendidos y métricas de tu negocio para saber siempre cómo venís.' },
  ];

  return (
    <div style={{ minHeight: 'calc(var(--app-vh, 1vh) * 100)', background: 'var(--bg)', color: 'var(--text-primary)' }}>
      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', maxWidth: 1200, margin: '0 auto', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 22 }}>Comerci<span style={{ color: 'var(--primary)' }}>App</span></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={onLogin}>Ingresar</button>
          <button className="btn btn-primary btn-sm" onClick={onRegister}>Crear mi tienda</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '64px 24px 48px', maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'var(--primary)', color: 'var(--on-primary, #fff)', fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 999, marginBottom: 20 }}>15 días gratis · sin tarjeta</div>
        <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, margin: '0 0 16px' }}>Tu tienda online y tu sistema de ventas, todo en uno</h1>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.5 }}>Creá tu tienda, gestioná stock, vendé en el mostrador y hacé crecer tu negocio. Sin comisiones por venta.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ fontSize: 16, padding: '12px 28px' }} onClick={onRegister}>Empezar gratis</button>
          <button className="btn btn-outline" style={{ fontSize: 16, padding: '12px 28px' }} onClick={() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })}>Ver planes</button>
        </div>
      </section>

      {/* FUNCIONES */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 30, fontWeight: 900, margin: '0 0 8px' }}>Todo lo que necesitás para vender</h2>
        <p style={{ textAlign: 'center', fontSize: 16, color: 'var(--text-muted)', margin: '0 0 36px' }}>Una plataforma completa, pensada para comercios y mayoristas.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {funciones.map((f, i) => (
            <div key={i} className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, color: 'var(--primary)' }}>{f.t}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 30, fontWeight: 900, margin: '0 0 8px' }}>Planes y precios</h2>
        <p style={{ textAlign: 'center', fontSize: 16, color: 'var(--text-muted)', margin: '0 0 12px' }}>Empezá con 15 días gratis. Cambiá o cancelá cuando quieras.</p>
        {hayOferta && <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--primary)', fontWeight: 700, margin: '0 0 36px' }}>Oferta de lanzamiento: {oferta.descuento_pct}% OFF los primeros {oferta.meses} meses</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>
          {planes.map(pl => (
            <div key={pl.id} className="card" style={{ padding: 28, position: 'relative', border: pl.destacado ? `2px solid ${pl.color}` : undefined, boxShadow: pl.destacado ? '0 8px 30px rgba(37,99,235,0.15)' : undefined }}>
              {pl.destacado && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: pl.color, color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 999 }}>Más elegido</div>}
              <div style={{ fontSize: 14, fontWeight: 700, color: pl.color, marginBottom: 4 }}>{pl.nombre}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{pl.tagline}</div>
              <div style={{ marginBottom: 20 }}>
                {hayOferta ? (
                  <>
                    <div style={{ fontSize: 16, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{money(pl.precio)}</div>
                    <div>
                      <span style={{ fontSize: 34, fontWeight: 900, color: pl.color }}>{money(conDescuento(pl.precio))}</span>
                      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}> /mes</span>
                    </div>
                    <div style={{ fontSize: 12, color: pl.color, fontWeight: 700, marginTop: 2 }}>{oferta.descuento_pct}% OFF los primeros {oferta.meses} meses</div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 34, fontWeight: 900 }}>{money(pl.precio)}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}> /mes</span>
                  </>
                )}
              </div>
              <button className={pl.destacado ? 'btn btn-primary' : 'btn btn-outline'} style={{ width: '100%', marginBottom: 20 }} onClick={onRegister}>Empezar gratis</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pl.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 14, alignItems: 'flex-start' }}>
                    <span style={{ color: pl.color, fontWeight: 900, flexShrink: 0 }}>✓</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ textAlign: 'center', padding: '48px 24px 64px', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 14px' }}>¿Listo para vender más?</h2>
        <p style={{ fontSize: 16, color: 'var(--text-muted)', margin: '0 0 24px' }}>Creá tu tienda en minutos y probá todo gratis por 15 días.</p>
        <button className="btn btn-primary" style={{ fontSize: 16, padding: '12px 32px' }} onClick={onRegister}>Crear mi tienda gratis</button>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: 'var(--text-primary)' }}>Comerci<span style={{ color: 'var(--primary)' }}>App</span></div>
        <div>Tu tienda online y sistema de ventas · Argentina</div>
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-sm btn-outline" onClick={onLogin}>Ingresar a mi cuenta</button>
        </div>
      </footer>
    </div>
  );
}

// Semáforo de mantenimiento: indicador verde/rojo + toggle de un clic, en el panel admin
function MantenimientoToggle() {
  const { toast } = useContext(Ctx);
  const [st, setSt] = useState({ activo: false, mensaje: '', countdown: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.getMaintenanceStatus().then(s => setSt({ activo: !!s.activo, mensaje: s.mensaje || '', countdown: s.countdown || '' })).catch(() => {}); }, []);
  const toggle = async () => {
    if (saving) return;
    const nuevo = !st.activo;
    if (nuevo && !window.confirm('¿Poner la web EN MANTENIMIENTO? Los clientes no van a poder entrar.')) return;
    setSaving(true);
    try {
      await api.setMaintenanceMode(nuevo, st.mensaje, st.countdown);
      setSt({ ...st, activo: nuevo });
      toast(nuevo ? 'Web puesta en mantenimiento' : 'Web activada', 'success');
    } catch (e) { toast(e.message || 'No se pudo cambiar', 'error'); }
    setSaving(false);
  };
  return (
    <button onClick={toggle} disabled={saving} title={st.activo ? 'La web está en mantenimiento. Tocá para activarla.' : 'La web está activa. Tocá para ponerla en mantenimiento.'}
      style={{ width: '100%', marginBottom: 12, padding: '9px 11px', borderRadius: 10, border: `1px solid ${st.activo ? '#e74c3c' : '#2ecc71'}`, background: st.activo ? 'rgba(231,76,60,0.12)' : 'rgba(46,204,113,0.12)', color: st.activo ? '#e74c3c' : '#2ecc71', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: st.activo ? '#e74c3c' : '#2ecc71', flexShrink: 0, boxShadow: `0 0 7px ${st.activo ? '#e74c3c' : '#2ecc71'}` }} />
      {saving ? 'Guardando...' : (st.activo ? 'EN MANTENIMIENTO' : 'WEB ACTIVA')}
    </button>
  );
}

function AdminPanel() {
  const { adminTab, setAdminTab, secciones, adminSeccion, setAdminSeccion, nav, user, miPlan } = useContext(Ctx);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({}); // acordeón: qué grupos están expandidos

  // Permisos: admin ve todo; subadmin solo lo que tenga.
  const esAdmin = user?.rol === 'admin';
  const misPermisos = esAdmin ? null : String(user?.permisos || '').split(',').filter(Boolean);
  const puede = (perm) => {
    if (perm === '__owner__') return !!user?.es_owner;
    return esAdmin || (misPermisos || []).includes(perm);
  };

  // Mapa tab → permiso requerido
  const tabPerm = {
    dashboard: 'stats',
    pedidos: 'pedidos', presupuestos: 'pedidos', reglas_compra: 'pedidos', arrepentimientos: 'pedidos',
    venta_manual: 'pedidos', ordenes_compra: 'pedidos', caja: 'stats',
    cupones: 'config', promociones: 'config', carritos: 'stats', reportes: 'stats',
    leads: 'stats', analytics: 'config',
    productos: 'productos', categorias: 'productos', listas: 'listas', notif_stock: 'productos', costo_proveedor: 'config',
    usuarios: 'usuarios',
    envios: 'config', metodos_pago: 'config',
    diseno: 'config',
    general: 'config',
    owner_tenants: '__owner__',
  };

  // ── ESTRUCTURA JERÁRQUICA (acordeón) ──
  // Cada grupo: { id, label, icon, items: [{ id (tab), label }] }
  // Grupos de 1 solo item van directo (sin acordeón).
  const nav_tree = [
    { id: 'inicio', label: 'Inicio', icon: 'chart', single: 'dashboard' },
    { id: 'ventas', label: 'Ventas', icon: 'receipt', items: [
      { id: 'pedidos', label: 'Pedidos' },
      { id: 'arrepentimientos', label: 'Arrepentimientos' },
      { id: 'presupuestos', label: 'Presupuestos' },
      { id: 'venta_manual', label: 'Punto de venta' },
      { id: 'caja', label: 'Caja / Arqueo' },
      { id: 'ordenes_compra', label: 'Órdenes de compra' },
      { id: 'reglas_compra', label: 'Reglas de compra' },
    ]},
    { id: 'catalogo', label: 'Catálogo', icon: 'box', items: [
      { id: 'productos', label: 'Productos' },
      { id: 'categorias', label: 'Categorías' },
      { id: 'listas', label: 'Listas de precio' },
      { id: 'notif_stock', label: 'Avisos de stock' },
      { id: 'costo_proveedor', label: 'Costo proveedor' },
    ]},
    { id: 'clientes', label: 'Clientes', icon: 'users', single: 'usuarios' },
    { id: 'marketing_grp', label: 'Marketing', icon: 'megaphone', items: [
      { id: 'cupones', label: 'Cupones' },
      { id: 'promociones', label: 'Promociones' },
      { id: 'carritos', label: 'Carritos abandonados' },
      { id: 'leads', label: 'Leads WhatsApp' },
      { id: 'reportes', label: 'Reportes' },
      { id: 'analytics', label: 'Analytics / Pixels' },
    ]},
    { id: 'envios_grp', label: 'Envíos', icon: 'truck', single: 'envios' },
    { id: 'pagos_grp', label: 'Pagos', icon: 'card', single: 'metodos_pago' },
    { id: 'diseno_grp', label: 'Personalizar tienda', icon: 'palette', single: 'diseno' },
    { id: 'general_grp', label: 'General', icon: 'settings', single: 'general' },
  ];

  // Mapa tab → feature del plan (si la feature está off, se oculta la sección). El dueño (es_owner) ve todo.
  const tabFeature = {
    costo_proveedor: 'proveedor_dropshipping', // solo el dueño (tiendas con proveedor conectado por el bot)
    presupuestos: 'presupuestos',
    venta_manual: 'pdv',        // pdv 'no' oculta; 'buscador'/'lector' muestra
    caja: 'caja',
    ordenes_compra: 'ordenes_compra',
    cupones: 'marketing', promociones: 'marketing', carritos: 'marketing', leads: 'marketing',
    reportes: 'reportes', analytics: 'analytics',
    listas: 'listas_precio',
  };
  const feats = miPlan?.features || null;
  const planPermite = (tabId) => {
    if (user?.es_owner) return true;         // el dueño siempre ve todo
    if (!feats) return true;                 // si no cargó el plan, no ocultar (fail-open)
    const f = tabFeature[tabId];
    if (!f) return true;                     // tab sin feature asociada = siempre visible
    const v = feats[f];
    return !(v === false || v === 'no' || v === undefined || v === null);
  };

  // Filtrar por permisos Y por plan
  const treeFiltered = nav_tree.map(g => {
    if (g.single) return (puede(tabPerm[g.single]) && planPermite(g.single)) ? g : null;
    const items = g.items.filter(it => puede(tabPerm[it.id]) && planPermite(it.id));
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
      <VisorProductoPanel />
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
        {user?.es_owner && (
          <button className="btn btn-primary btn-sm" onClick={() => { try { const u = new URL(window.location.href); u.searchParams.set('comerciapp', '1'); window.location.href = u.pathname + '?' + u.searchParams.toString(); } catch { window.location.href = '/?comerciapp=1'; } }} style={{ marginBottom: 12, width: '100%' }}><Globe size={15} style={{ verticalAlign: '-2px' }} /> Panel de webs</button>
        )}
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Panel Admin</h3>
        {puede('config') && <MantenimientoToggle />}
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
        {adminTab === 'categorias' && <AdminCategorias />}
        {adminTab === 'notif_stock' && <AdminNotifStock />}
        {adminTab === 'cupones' && <AdminCupones />}
        {adminTab === 'promociones' && <AdminPromociones />}
        {adminTab === 'carritos' && <AdminCarritosAbandonados />}
        {adminTab === 'arrepentimientos' && <AdminArrepentimientos />}
        {adminTab === 'reportes' && <AdminReportes />}
        {adminTab === 'caja' && <AdminCaja />}
        {adminTab === 'metodos_pago' && <AdminMetodosPago />}
        {adminTab === 'envios' && <AdminEnviosCustom />}
        {adminTab === 'diseno' && <AdminDisenoHub />}
        {adminTab === 'general' && <AdminGeneralHub />}
        {adminTab === 'owner_tenants' && user?.es_owner && <AdminOwner />}
        {adminTab === 'analytics' && <AdminAnalytics />}
        {adminTab === 'costo_proveedor' && <AdminCostoProveedor />}
        {adminTab === 'leads' && <AdminLeads />}
      </div>
    </div>
  );
}

// ── Hub de Diseño: sub-pestañas internas (Colores/Logo, Slider, Banners, Badges, Pop-ups, Redes, Novedades) ──
function AdminDisenoHub() {
  const [sub, setSub] = useState('editor');
  const subs = [
    { id: 'editor', label: 'Tema y estilos' },
    { id: 'slider', label: 'Slider / Banners' },
    { id: 'barras', label: 'Barras de texto' },
    { id: 'orden', label: 'Orden de secciones' },
    { id: 'menu', label: 'Menú' },
    { id: 'paginas', label: 'Páginas' },
    { id: 'badges', label: 'Badges' },
    { id: 'popups', label: 'Pop-ups' },
    { id: 'redes', label: 'Redes sociales' },
    { id: 'contactos', label: 'Contactos WhatsApp' },
  ];
  return (
    <div>
      <div className="admin-subtabs" style={{ flexWrap: 'wrap' }}>
        {subs.map(s => <button key={s.id} className={`admin-subtab ${sub === s.id ? 'active' : ''}`} onClick={() => setSub(s.id)}>{s.label}</button>)}
      </div>
      {sub === 'editor' && <AdminDiseno />}
      {sub === 'slider' && <AdminSlider />}
      {sub === 'barras' && <AdminBarras />}
      {sub === 'orden' && <AdminOrdenSecciones />}
      {sub === 'menu' && <AdminMenu />}
      {sub === 'paginas' && <AdminPaginas />}
      {sub === 'badges' && <AdminBadges />}
      {sub === 'popups' && <AdminPopups />}
      {sub === 'redes' && <AdminRedes />}
      {sub === 'contactos' && <AdminContactos />}
    </div>
  );
}

// ── Hub General: config del negocio + mantenimiento ──
// ─── COSTO PROVEEDOR: tu descuento sobre el precio del proveedor → costo real y ganancia real ───
function AdminCostoProveedor() {
  const { toast } = useContext(Ctx);
  const [data, setData] = useState(null);
  const [defecto, setDefecto] = useState('');
  const [cats, setCats] = useState({});
  const [marcas, setMarcas] = useState([]);
  const [saving, setSaving] = useState(false);
  const cargar = () => api.getCostosProveedor().then(d => {
    setData(d); setDefecto(String(d.defecto ?? ''));
    const c = {}; (d.categorias || []).forEach(x => { c[x.categoria] = String(x.pct); }); setCats(c);
    setMarcas(Object.entries(d.marcas || {}).map(([m, p]) => ({ m, p: String(p) })));
  }).catch(e => toast(e.message, 'error'));
  useEffect(() => { cargar(); }, []);
  const guardar = async () => {
    setSaving(true);
    try {
      const m = {}; marcas.forEach(x => { if (x.m.trim()) m[x.m.trim()] = Number(x.p) || 0; });
      const c = {}; Object.entries(cats).forEach(([k, v]) => { c[k] = Number(v) || 0; });
      const r = await api.saveCostosProveedor({ defecto: Number(defecto) || 0, marcas: m, categorias: c });
      toast(r.actualizados ? `Guardado: se actualizó el costo de ${r.actualizados} producto${r.actualizados === 1 ? '' : 's'}` : 'Guardado');
      cargar();
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };
  const ej = 100000; const pctEj = Number(defecto) || 0;
  if (!data) return <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>;
  return (
    <div className="cprov" style={{ maxWidth: 680 }}>
      <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Costo del proveedor</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        Tu costo real es el precio del proveedor menos tu descuento. Con eso se calcula la ganancia en Inicio y en Reportes. Cada venta guarda el costo de ese día, así la ganancia de ventas viejas no cambia cuando el proveedor aumenta.
        {' '}Ejemplo con {pctEj}%: precio proveedor {fmtARS(ej)} → tu costo {fmtARS(ej * (1 - pctEj / 100))}.
      </p>
      {data.total === 0 ? (
        <div className="empty-state"><h3>Todavía no hay productos del proveedor</h3><p>Aparecen cuando el bot sincroniza el catálogo.</p></div>
      ) : (
        <>
          <div className="cprov-card">
            <div className="cprov-fila">
              <div><strong>Descuento general</strong><small>Se usa en las categorías que no tengan uno propio</small></div>
              <div className="cprov-pct"><input type="number" inputMode="decimal" min="0" max="90" value={defecto} onChange={e => setDefecto(e.target.value)} /><span>%</span></div>
            </div>
          </div>

          <div className="cprov-card">
            <div className="cprov-titulo">Por marca <small>tiene prioridad sobre la categoría</small></div>
            {marcas.map((x, i) => (
              <div key={i} className="cprov-fila">
                <div><input value={x.m} onChange={e => setMarcas(marcas.map((y, j) => j === i ? { ...y, m: e.target.value } : y))} placeholder="Marca (ej. JCID)" />{data.productos_marca?.[x.m] ? <small>{data.productos_marca[x.m]} productos</small> : null}</div>
                <div className="cprov-pct">
                  <input type="number" inputMode="decimal" min="0" max="90" value={x.p} onChange={e => setMarcas(marcas.map((y, j) => j === i ? { ...y, p: e.target.value } : y))} /><span>%</span>
                  <button className="pago-quitar" onClick={() => setMarcas(marcas.filter((_, j) => j !== i))} aria-label="Quitar marca" title="Quitar"><X size={15} /></button>
                </div>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" onClick={() => setMarcas([...marcas, { m: '', p: String(defecto || 0) }])} style={{ marginTop: 8 }}><Plus size={14} style={{ verticalAlign: '-2px' }} /> Agregar marca</button>
          </div>

          <div className="cprov-card">
            <div className="cprov-titulo">Por categoría <small>{data.total} productos del proveedor</small></div>
            {(data.categorias || []).map(c => (
              <div key={c.categoria} className="cprov-fila">
                <div><span>{c.categoria}</span><small>{c.productos} {c.productos === 1 ? 'producto' : 'productos'}</small></div>
                <div className="cprov-pct"><input type="number" inputMode="decimal" min="0" max="90" value={cats[c.categoria] ?? ''} onChange={e => setCats({ ...cats, [c.categoria]: e.target.value })} /><span>%</span></div>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar y recalcular costos'}</button>
        </>
      )}
    </div>
  );
}

function AdminAnalytics() {
  const { config, setConfig, toast } = useContext(Ctx);
  const [gaId, setGaId] = useState(config.ga_id || '');
  const [pixelId, setPixelId] = useState(config.fb_pixel_id || '');
  const [clarityId, setClarityId] = useState(config.clarity_id || '');
  const [gscArchivo, setGscArchivo] = useState(config.gsc_archivo || '');
  const [merchantId, setMerchantId] = useState(config.google_merchant_id || '');
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    setSaving(true);
    try {
      // Search Console: aceptamos el nombre del archivo, el link entero o solo "googleXXXX"
      const mg = gscArchivo.trim().toLowerCase().match(/google[a-z0-9]{6,64}/);
      const upd = { ga_id: gaId.trim(), fb_pixel_id: pixelId.trim(), clarity_id: clarityId.trim().replace(/[^a-z0-9]/gi, ''), gsc_archivo: mg ? mg[0] + '.html' : '', google_merchant_id: merchantId.replace(/\D/g, '') };
      await api.updateConfig(upd);
      setConfig({ ...config, ...upd });
      setGscArchivo(upd.gsc_archivo);
      toast('Guardado. Recargá la página para que empiece a medir.');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Marketing y estadísticas</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Tu panel ya cuenta las visitas y búsquedas solo (Inicio → Visitas de la tienda). Además podés conectar Google Analytics, Meta y Clarity para analizarlo también ahí: pegá los IDs y guardá.</p>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Google Analytics (GA4) — ID de medición</label>
          <input value={gaId} onChange={e => setGaId(e.target.value)} placeholder="G-XXXXXXXXXX" />
          <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Lo sacás de Google Analytics → Administrar → Flujos de datos. Empieza con "G-".</small>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Facebook / Meta Pixel — ID</label>
          <input value={pixelId} onChange={e => setPixelId(e.target.value)} placeholder="123456789012345" />
          <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Lo sacás del Administrador de eventos de Meta → tu Pixel → Configuración. Son solo números.</small>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Microsoft Clarity — ID del proyecto (gratis)</label>
          <input value={clarityId} onChange={e => setClarityId(e.target.value)} placeholder="abcd1234ef" />
          <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Grabaciones de cómo navegan los clientes y mapas de dónde tocan. Creá el proyecto en clarity.microsoft.com → Configuración → Información general → "ID del proyecto".</small>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Google Search Console — archivo de verificación</label>
          <input value={gscArchivo} onChange={e => setGscArchivo(e.target.value)} placeholder="google1a2b3c4d5e6f7a8b.html" />
          <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Para aparecer en Google. En Search Console → Prefijo de URL → método "Archivo HTML": copiá solo el nombre del archivo (no hace falta descargarlo), pegalo acá, guardá y tocá "Verificar".</small>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Reseñas de Clientes en Google — ID de comerciante</label>
          <input value={merchantId} onChange={e => setMerchantId(e.target.value)} placeholder="1234567890" inputMode="numeric" />
          <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>El número de tu cuenta de Merchant Center. Al terminar una compra, Google le ofrece al cliente una encuesta para calificar tu tienda (llega por mail después de la fecha de entrega). En los pedidos de prueba no aparece.</small>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
        <strong>Qué se mide automáticamente:</strong> visitas a la tienda, ver un producto, agregar al carrito, iniciar la compra y compra realizada (con el monto). Si dejás un campo vacío, esa plataforma no se activa.
      </div>

      <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
    </div>
  );
}

function CobrosModal({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getCobros().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR');
  const fmtF = (f) => f ? new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header"><h3>Cobros</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{ padding: 20 }}>
          {loading ? <div style={{ color: 'var(--text-muted)' }}>Cargando...</div> : data && (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140, background: 'var(--bg-secondary)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cobrado este mes</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a' }}>{fmt(data.mes_total)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 140, background: 'var(--bg-secondary)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pagos este mes</div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{data.mes_cant}</div>
                </div>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Últimos pagos</h4>
              {(!data.ultimos || data.ultimos.length === 0)
                ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Todavía no registraste pagos. Entrá a una tienda y tocá "Pagos" para registrar el primero.</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.ultimos.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                        <div><strong>{p.tienda || 'Tienda #' + p.tenant_id}</strong> <span style={{ color: 'var(--text-muted)' }}>· {fmtF(p.pagado_en)}{p.periodo ? ' · ' + p.periodo : ''}</span></div>
                        <div style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(p.monto)}</div>
                      </div>
                    ))}
                  </div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PagosTenantModal({ tenant, onClose }) {
  const { toast } = useContext(Ctx);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ monto: '', metodo: 'Efectivo', periodo: '', notas: '', proximo_venc: '' });
  const [saving, setSaving] = useState(false);

  const cargar = () => { api.getPagosTenant(tenant.id).then(d => { setPagos(d || []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { cargar(); }, []);

  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR');
  const fmtF = (f) => f ? new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

  const registrar = async () => {
    if (!form.monto || parseFloat(form.monto) <= 0) { toast('Poné un monto', 'error'); return; }
    setSaving(true);
    try {
      await api.registrarPago({ tenant_id: tenant.id, ...form, proximo_venc: form.proximo_venc || null });
      toast('Pago registrado'); setForm({ monto: '', metodo: 'Efectivo', periodo: '', notas: '', proximo_venc: '' }); cargar();
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };
  const borrar = async (id) => { try { await api.deletePagoSuscripcion(id); toast('Pago eliminado'); cargar(); } catch (e) { toast(e.message, 'error'); } };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header"><h3>Pagos · {tenant.nombre}</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{ padding: 20 }}>
          {/* Formulario nuevo pago */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Registrar pago</h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Monto *</label>
                <input type="number" inputMode="numeric" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="45000" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Método</label>
                <select value={form.metodo} onChange={e => setForm(f => ({ ...f, metodo: e.target.value }))} style={{ width: '100%' }}>
                  <option>Efectivo</option><option>Transferencia</option><option>Mercado Pago</option><option>Otro</option>
                </select>
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Período</label>
                <input value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} placeholder="Ago 2026" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Próximo vencimiento</label>
                <input type="date" value={form.proximo_venc} onChange={e => setForm(f => ({ ...f, proximo_venc: e.target.value }))} style={{ width: '100%' }} />
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={registrar} disabled={saving}>{saving ? 'Guardando...' : 'Registrar pago'}</button>
          </div>
          {/* Historial */}
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Historial</h4>
          {loading ? <div style={{ color: 'var(--text-muted)' }}>Cargando...</div>
            : pagos.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin pagos todavía.</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pagos.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                    <div>
                      <strong style={{ color: '#16a34a' }}>{fmt(p.monto)}</strong> <span style={{ color: 'var(--text-muted)' }}>· {fmtF(p.pagado_en)}{p.metodo ? ' · ' + p.metodo : ''}{p.periodo ? ' · ' + p.periodo : ''}</span>
                      {p.proximo_venc && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Próx. venc: {fmtF(p.proximo_venc)}</div>}
                    </div>
                    <button onClick={() => borrar(p.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}><Trash2 size={15} style={{ verticalAlign: '-2px' }} /></button>
                  </div>
                ))}
              </div>}
        </div>
      </div>
    </div>
  );
}

function OfertaModal({ onClose, onSaved }) {
  const { toast } = useContext(Ctx);
  const [oferta, setOferta] = useState({ descuento_pct: '', meses: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getOferta().then(o => { setOferta({ descuento_pct: o.descuento_pct ?? '', meses: o.meses ?? '' }); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const guardar = async () => {
    setSaving(true);
    try { await api.updateOferta(oferta); toast('Oferta actualizada'); onSaved(); }
    catch (e) { toast(e.message, 'error'); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header"><h3>Oferta de lanzamiento</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? <div style={{ color: 'var(--text-muted)' }}>Cargando...</div> : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Este descuento se muestra en el landing con el precio tachado. Poné 0% para desactivar la oferta.</p>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Descuento (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" inputMode="numeric" value={oferta.descuento_pct} onChange={e => setOferta(o => ({ ...o, descuento_pct: e.target.value }))} placeholder="25" style={{ flex: 1 }} min="0" max="100" />
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Durante (meses)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" inputMode="numeric" value={oferta.meses} onChange={e => setOferta(o => ({ ...o, meses: e.target.value }))} placeholder="3" style={{ flex: 1 }} min="0" />
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>meses</span>
                </div>
              </div>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar oferta'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PreciosModal({ onClose, onSaved }) {
  const { toast } = useContext(Ctx);
  const [precios, setPrecios] = useState({ basic: '', pro: '', full: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getPlanPrecios().then(p => { setPrecios({ basic: p.basic ?? '', pro: p.pro ?? '', full: p.full ?? '' }); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const guardar = async () => {
    setSaving(true);
    try { await api.updatePlanPrecios(precios); toast('Precios actualizados'); onSaved(); }
    catch (e) { toast(e.message, 'error'); setSaving(false); }
  };

  const planes = [
    { plan: 'basic', label: 'Basic — Vender', color: '#6b7280' },
    { plan: 'pro', label: 'Pro — Crecer', color: '#2563eb' },
    { plan: 'full', label: 'Full — Escalar', color: '#7c3aed' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header"><h3>Precios de los planes</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? <div style={{ color: 'var(--text-muted)' }}>Cargando...</div> : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Precio mensual de cada plan. Se usa para calcular tu facturación y se mostrará en el sitio.</p>
              {planes.map(({ plan, label, color }) => (
                <div key={plan}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color }}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>$</span>
                    <input type="number" inputMode="numeric" value={precios[plan]} onChange={e => setPrecios(p => ({ ...p, [plan]: e.target.value }))} placeholder="0" style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/mes</span>
                  </div>
                </div>
              ))}
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar precios'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OwnerStats({ stats }) {
  const money = (n) => '$' + (n || 0).toLocaleString('es-AR');
  const nombreMes = (ym) => { const [y, m] = ym.split('-'); return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][parseInt(m) - 1] + ' ' + y.slice(2); };
  const e = stats.por_estado || {};
  const p = stats.por_plan || {};
  const precios = stats.precios || {};

  const Card = ({ label, valor, sub, color }) => (
    <div className="card" style={{ padding: 16, flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: color || 'var(--text-primary)', lineHeight: 1 }}>{valor}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const maxMes = Math.max(1, ...(stats.nuevas_por_mes || []).map(m => m.nuevas));

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Fila de números grandes */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <Card label="Facturación mensual" valor={money(stats.facturacion_mensual)} sub="tiendas activas que pagan" color="#16a34a" />
        <Card label="Tiendas totales" valor={stats.total_tiendas} sub={`${e.activo || 0} activas · ${e.trial || 0} en prueba`} />
        <Card label="En prueba" valor={e.trial || 0} sub="pruebas activas" color="#f59e0b" />
        <Card label="Suspendidas" valor={e.suspendido || 0} sub="sin acceso" color={e.suspendido ? '#dc2626' : undefined} />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {/* Ingresos por plan */}
        <div className="card" style={{ padding: 16, flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Tiendas por plan</div>
          {['basic', 'pro', 'full'].map(pl => {
            const cant = p[pl] || 0;
            const label = { basic: 'Basic', pro: 'Pro', full: 'Full' }[pl];
            const col = { basic: '#6b7280', pro: '#2563eb', full: '#7c3aed' }[pl];
            return (
              <div key={pl} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, width: 44, fontWeight: 700, color: col }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, width: 24 }}>{cant}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>× {money(precios[pl])} = <strong style={{ color: 'var(--text-secondary)' }}>{money(cant * (precios[pl] || 0))}</strong></span>
              </div>
            );
          })}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Potencial total (si todas pagaran): <strong style={{ color: 'var(--text-secondary)' }}>{money((p.basic || 0) * (precios.basic || 0) + (p.pro || 0) * (precios.pro || 0) + (p.full || 0) * (precios.full || 0))}</strong>
          </div>
        </div>

        {/* Próximos vencimientos de prueba */}
        <div className="card" style={{ padding: 16, flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Pruebas por vencer</div>
          {(stats.proximos_trials || []).length === 0
            ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ninguna prueba vence en los próximos 7 días.</div>
            : stats.proximos_trials.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Tienda #{t.id}</span>
                <span style={{ fontWeight: 700, color: t.dias <= 2 ? '#dc2626' : '#f59e0b' }}>{t.dias > 0 ? `en ${t.dias} día${t.dias === 1 ? '' : 's'}` : 'vencida'}</span>
              </div>
            ))}
        </div>

        {/* Tiendas nuevas por mes */}
        <div className="card" style={{ padding: 16, flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Tiendas nuevas por mes</div>
          {(stats.nuevas_por_mes || []).length === 0
            ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Todavía no hay altas registradas.</div>
            : stats.nuevas_por_mes.map(m => (
              <div key={m.mes} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, width: 50, color: 'var(--text-muted)' }}>{nombreMes(m.mes)}</span>
                <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 4, height: 16, overflow: 'hidden' }}>
                  <div style={{ width: `${(m.nuevas / maxMes) * 100}%`, background: 'var(--primary)', height: '100%', borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, width: 20, textAlign: 'right' }}>{m.nuevas}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Uso total de la plataforma */}
      {stats.uso_total && (
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap', padding: '0 4px' }}>
          <span>Uso total de la plataforma:</span>
          <span><strong style={{ color: 'var(--text-secondary)' }}>{(stats.uso_total.productos || 0).toLocaleString('es-AR')}</strong> productos</span>
          <span><strong style={{ color: 'var(--text-secondary)' }}>{(stats.uso_total.pedidos || 0).toLocaleString('es-AR')}</strong> pedidos</span>
          <span><strong style={{ color: 'var(--text-secondary)' }}>{(stats.uso_total.clientes || 0).toLocaleString('es-AR')}</strong> clientes finales</span>
        </div>
      )}
    </div>
  );
}

function PanelPlataforma({ onLogout }) {
  return (
    <div style={{ minHeight: 'calc(var(--app-vh, 1vh) * 100)', background: 'var(--bg)' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Comerci<span style={{ color: 'var(--primary)' }}>App</span></div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 10px' }}>Panel de dueño</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn btn-sm btn-outline" href={typeof window !== 'undefined' ? window.location.pathname : '/'} rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); try { const u = new URL(window.location.href); u.searchParams.delete('comerciapp'); window.location.href = u.pathname + u.search; } catch { window.location.href = '/'; } }}>Ir a mi tienda ↗</a>
          <button className="btn btn-sm btn-outline" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </nav>
      <div style={{ padding: '24px 16px' }}>
        <AdminOwner />
      </div>
    </div>
  );
}

function AdminOwner() {
  const { toast } = useContext(Ctx);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState(null);
  const [creds, setCreds] = useState(null); // credenciales recién creadas
  const [stats, setStats] = useState(null);
  const [showPrecios, setShowPrecios] = useState(false);
  const [showOferta, setShowOferta] = useState(false);
  const [showCobros, setShowCobros] = useState(false);
  const [pagoTenant, setPagoTenant] = useState(null); // tienda para registrar pago / ver historial

  const PLANES = [
    { id: 'basic', label: 'Basic - Vender' },
    { id: 'pro', label: 'Pro - Crecer' },
    { id: 'full', label: 'Full - Escalar' },
  ];
  const ESTADOS = { trial: { t: 'Prueba', c: '#f59e0b' }, activo: { t: 'Activo', c: '#16a34a' }, suspendido: { t: 'Suspendido', c: '#dc2626' }, vencido: { t: 'Vencido', c: '#6b7280' } };

  const cargar = () => {
    setLoading(true);
    api.getTenants().then(d => { setTenants(d || []); setLoading(false); }).catch(e => { toast(e.message, 'error'); setLoading(false); });
    api.getPlataformaStats().then(setStats).catch(() => {});
  };
  useEffect(() => { cargar(); }, []);

  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const diasRestantes = (f) => { if (!f) return null; const d = Math.ceil((new Date(f) - new Date()) / 86400000); return d; };

  const cambiarEstado = async (t, estado) => {
    try { await api.setTenantEstado(t.id, estado); toast(`Tienda ${estado==='activo'?'activada':'suspendida'}`); cargar(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const dominioTienda = (t) => t.dominio_propio ? t.dominio_propio : `${t.slug}.comerciapp.com.ar`;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Plataforma</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Administrá las tiendas de tus clientes. {tenants.length} {tenants.length === 1 ? 'tienda' : 'tiendas'}.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setShowCobros(true)}><Wallet size={15} style={{ verticalAlign: '-2px' }} /> Cobros</button>
          <button className="btn btn-outline" onClick={() => setShowPrecios(true)}>Editar precios</button>
          <button className="btn btn-outline" onClick={() => setShowOferta(true)}>Editar oferta</button>
          <button className="btn btn-primary" onClick={() => { setCreds(null); setShowCrear(true); }}>+ Nueva tienda</button>
        </div>
      </div>

      {stats && <OwnerStats stats={stats} />}

      {loading ? <div style={{ padding: 20, color: 'var(--text-muted)' }}>Cargando...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tenants.map(t => {
            const est = ESTADOS[t.estado] || { t: t.estado, c: '#6b7280' };
            const dias = diasRestantes(t.fecha_fin_trial);
            return (
              <div key={t.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{t.nombre}</span>
                      {t.id === 1 && <span style={{ fontSize: 11, background: 'var(--primary)', color: 'var(--on-primary, #fff)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>Vos</span>}
                      <span style={{ fontSize: 11, background: est.c, color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{est.t}</span>
                      <span style={{ fontSize: 11, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 10, fontWeight: 700, textTransform: 'uppercase' }}>{t.plan}</span>
                    </div>
                    <a href={`https://${dominioTienda(t)}`} target="_blank" rel="noopener" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>{dominioTienda(t)} ↗</a>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>{t.productos} productos</span>
                      <span>{t.pedidos} pedidos</span>
                      <span>{t.clientes} clientes</span>
                      {t.estado === 'trial' && dias !== null && <span style={{ color: dias <= 3 ? '#dc2626' : '#f59e0b', fontWeight: 700 }}>{dias > 0 ? `${dias} días de prueba` : 'Prueba vencida'}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setEditando(t)}>Editar</button>
                    {t.id !== 1 && <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setPagoTenant(t)}>Pagos</button>}
                    {t.id !== 1 && (t.estado === 'suspendido'
                      ? <button className="btn" style={{ fontSize: 12, padding: '6px 12px', background: '#16a34a', color: '#fff' }} onClick={() => cambiarEstado(t, 'activo')}>Activar</button>
                      : <button className="btn" style={{ fontSize: 12, padding: '6px 12px', background: '#dc2626', color: '#fff' }} onClick={() => cambiarEstado(t, 'suspendido')}>Suspender</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCrear && <TenantCrearModal onClose={() => setShowCrear(false)} onCreated={(c) => { setCreds(c); setShowCrear(false); cargar(); }} planes={PLANES} />}
      {creds && <TenantCredsModal creds={creds} onClose={() => setCreds(null)} />}
      {editando && <TenantEditarModal tenant={editando} planes={PLANES} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); cargar(); }} onDeleted={() => { setEditando(null); cargar(); }} />}
      {showPrecios && <PreciosModal onClose={() => setShowPrecios(false)} onSaved={() => { setShowPrecios(false); cargar(); }} />}
      {showOferta && <OfertaModal onClose={() => setShowOferta(false)} onSaved={() => { setShowOferta(false); cargar(); }} />}
      {showCobros && <CobrosModal onClose={() => setShowCobros(false)} />}
      {pagoTenant && <PagosTenantModal tenant={pagoTenant} onClose={() => setPagoTenant(null)} />}
    </div>
  );
}

function TenantCrearModal({ onClose, onCreated, planes }) {
  const { toast } = useContext(Ctx);
  const [f, setF] = useState({ nombre: '', slug: '', plan: 'full', admin_usuario: 'admin', admin_password: '', dias_trial: 15 });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const slugAuto = (nombre) => nombre.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

  const crear = async () => {
    if (!f.nombre.trim()) return toast('Poné un nombre', 'error');
    const slug = (f.slug || slugAuto(f.nombre)).toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) return toast('Slug inválido', 'error');
    setSaving(true);
    try {
      const r = await api.createTenant({ ...f, slug });
      onCreated(r);
    } catch (e) { toast(e.message, 'error'); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header"><h3>Nueva tienda</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre de la tienda</label>
            <input value={f.nombre} onChange={e => { set('nombre', e.target.value); if (!f.slug) set('slug', slugAuto(e.target.value)); }} placeholder="Ej: Kiosco Don José" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Dirección web (subdominio)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input value={f.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="kioscodonjose" style={{ flex: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>.comerciapp.com.ar</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Plan</label>
            <select value={f.plan} onChange={e => set('plan', e.target.value)}>
              {planes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Usuario admin</label>
              <input value={f.admin_usuario} onChange={e => set('admin_usuario', e.target.value)} placeholder="admin" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Contraseña</label>
              <input value={f.admin_password} onChange={e => set('admin_password', e.target.value)} placeholder="(auto si vacío)" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Días de prueba gratis</label>
            <input type="number" value={f.dias_trial} onChange={e => set('dias_trial', parseInt(e.target.value) || 0)} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>0 = activa directo. 15 = prueba de 15 días.</p>
          </div>
          <button className="btn btn-primary" onClick={crear} disabled={saving}>{saving ? 'Creando...' : 'Crear tienda'}</button>
        </div>
      </div>
    </div>
  );
}

function TenantCredsModal({ creds, onClose }) {
  const { toast } = useContext(Ctx);
  const dominio = `${creds.slug}.comerciapp.com.ar`;
  const texto = `Tu tienda está lista!\n\nLink: https://${dominio}\nUsuario: ${creds.admin_usuario}\nContraseña: ${creds.admin_password}\n\nEntrá y personalizala.`;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header"><h3>Tienda creada ✓</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 14, marginBottom: 16 }}>Guardá estos datos y pasáselos al cliente. La contraseña no se vuelve a mostrar.</p>
          <div className="card" style={{ padding: 14, marginBottom: 16, fontSize: 14 }}>
            <div style={{ marginBottom: 8 }}><strong>Link:</strong> <a href={`https://${dominio}`} target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>{dominio}</a></div>
            <div style={{ marginBottom: 8 }}><strong>Usuario:</strong> {creds.admin_usuario}</div>
            <div><strong>Contraseña:</strong> <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>{creds.admin_password}</code></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { navigator.clipboard?.writeText(texto); toast('Copiado'); }}>Copiar datos</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>Listo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TenantEditarModal({ tenant, planes, onClose, onSaved, onDeleted }) {
  const { toast } = useContext(Ctx);
  const [f, setF] = useState({ nombre: tenant.nombre || '', plan: tenant.plan || 'full', estado: tenant.estado || 'activo', dominio_propio: tenant.dominio_propio || '', notas: tenant.notas || '' });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    setSaving(true);
    try { await api.updateTenant(tenant.id, f); toast('Guardado'); onSaved(); }
    catch (e) { toast(e.message, 'error'); setSaving(false); }
  };
  const borrar = async () => {
    if (confirmDel !== tenant.slug) return toast('Escribí el slug para confirmar', 'error');
    try { await api.deleteTenant(tenant.id); toast('Tienda eliminada'); onDeleted(); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header"><h3>Editar {tenant.nombre}</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre</label>
            <input value={f.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Plan</label>
              <select value={f.plan} onChange={e => set('plan', e.target.value)}>{planes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Estado</label>
              <select value={f.estado} onChange={e => set('estado', e.target.value)} disabled={tenant.id === 1}>
                <option value="trial">Prueba</option><option value="activo">Activo</option><option value="suspendido">Suspendido</option><option value="vencido">Vencido</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Dominio propio (opcional)</label>
            <input value={f.dominio_propio} onChange={e => set('dominio_propio', e.target.value)} placeholder="mitienda.com" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notas internas</label>
            <textarea value={f.notas} onChange={e => set('notas', e.target.value)} rows={2} placeholder="Ej: paga por transferencia el 5 de cada mes" />
          </div>
          <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>

          {tenant.id !== 1 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
              <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 700, marginBottom: 8 }}>Zona peligrosa</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Borrar la tienda elimina TODOS sus datos (productos, pedidos, clientes). No se puede deshacer. Escribí <code style={{ background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3 }}>{tenant.slug}</code> para confirmar.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={confirmDel} onChange={e => setConfirmDel(e.target.value)} placeholder={tenant.slug} style={{ flex: 1 }} />
                <button className="btn" style={{ background: '#dc2626', color: '#fff' }} onClick={borrar} disabled={confirmDel !== tenant.slug}>Borrar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminGeneralHub() {
  const [sub, setSub] = useState('config');
  return (
    <div>
      <div className="admin-subtabs">
        <button className={`admin-subtab ${sub === 'config' ? 'active' : ''}`} onClick={() => setSub('config')}>Datos del negocio</button>
        <button className={`admin-subtab ${sub === 'tiendas' ? 'active' : ''}`} onClick={() => setSub('tiendas')}>Tiendas / Puntos de venta</button>
      </div>
      {sub === 'config' && <AdminConfig />}
      {sub === 'tiendas' && <AdminTiendas />}
    </div>
  );
}

function AdminTiendas() {
  const { secciones, setSecciones, toast } = useContext(Ctx);
  const [edit, setEdit] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [delSec, setDelSec] = useState(null);
  const [delStats, setDelStats] = useState(null);
  const [delModo, setDelModo] = useState({ tipo: '', destino: '' });

  const refresh = () => api.getSecciones().then(setSecciones).catch(() => {});

  const abrirEliminar = async (sec) => {
    if (secciones.length <= 1) { toast('No podés eliminar la única tienda', 'warning'); return; }
    setDelSec(sec); setDelStats(null); setDelModo({ tipo: '', destino: '' });
    try { const s = await api.getSeccionStats(sec.id); setDelStats(s); } catch (e) { toast(e.message, 'error'); }
  };

  const confirmarEliminar = async () => {
    try {
      const opts = {};
      if (delModo.tipo === 'mover') { if (!delModo.destino) { toast('Elegí a qué tienda mover', 'error'); return; } opts.mover_a = delModo.destino; }
      else if (delModo.tipo === 'borrar') opts.borrar_productos = true;
      else if (delStats && delStats.productos > 0) { toast('Elegí qué hacer con los productos', 'warning'); return; }
      await api.deleteSeccion(delSec.id, opts);
      toast('Tienda eliminada'); setDelSec(null); refresh();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontWeight: 900, fontSize: 22 }}>Tiendas / Puntos de venta ({secciones.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ Nueva tienda</button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Cada tienda es un punto de venta con su propio stock, carrito, envíos y checkout. Podés agregar todas las que necesites (local, depósito, mayorista, otra sucursal).</p>

      {secciones.map(s => (
        <div key={s.id} className="card" style={{ padding: 14, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <strong style={{ fontSize: 15 }}>{s.nombre}</strong>
            {s.requiere_aprobacion && <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 4, marginLeft: 8 }}>Requiere aprobación</span>}
            {s.visible === false && <span style={{ fontSize: 10, background: '#999', color: '#fff', padding: '2px 8px', borderRadius: 4, marginLeft: 6 }}>Oculta</span>}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.descripcion || 'Sin descripción'}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setEdit(s)}>Editar</button>
            <button className="btn btn-danger btn-sm" onClick={() => abrirEliminar(s)}>Eliminar</button>
          </div>
        </div>
      ))}

      {(showNew || edit) && <TiendaModal sec={edit} onClose={() => { setShowNew(false); setEdit(null); }} onSaved={() => { setShowNew(false); setEdit(null); refresh(); }} toast={toast} />}

      {/* Modal eliminar seguro */}
      {delSec && (
        <div className="modal-overlay" onClick={() => setDelSec(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header"><span className="modal-title">Eliminar "{delSec.nombre}"</span><button className="modal-close" onClick={() => setDelSec(null)}>✕</button></div>
            <div className="modal-body">
              {!delStats ? <p style={{ color: 'var(--text-muted)' }}>Cargando...</p> : (
                <>
                  <p style={{ fontSize: 13, marginBottom: 12 }}>Esta tienda tiene <b>{delStats.productos} productos</b> y <b>{delStats.pedidos} pedidos</b>.</p>
                  {delStats.productos > 0 ? (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>¿Qué hacemos con los productos?</p>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input type="radio" name="delmodo" checked={delModo.tipo === 'mover'} onChange={() => setDelModo({ tipo: 'mover', destino: '' })} />
                        Mover a otra tienda
                      </label>
                      {delModo.tipo === 'mover' && (
                        <select value={delModo.destino} onChange={e => setDelModo({ ...delModo, destino: e.target.value })} style={{ width: '100%', marginBottom: 10 }}>
                          <option value="">Elegí destino...</option>
                          {secciones.filter(x => x.id !== delSec.id).map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                        </select>
                      )}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, cursor: 'pointer' }}>
                        <input type="radio" name="delmodo" checked={delModo.tipo === 'borrar'} onChange={() => setDelModo({ tipo: 'borrar', destino: '' })} />
                        <span style={{ color: 'var(--danger)' }}>Borrar los productos también</span>
                      </label>
                    </>
                  ) : <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>La tienda está vacía, se puede eliminar sin problemas.</p>}
                  <button className="btn btn-danger" onClick={confirmarEliminar} style={{ width: '100%' }}>Eliminar tienda</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TiendaModal({ sec, onClose, onSaved, toast }) {
  const isNew = !sec;
  const [f, setF] = useState({
    nombre: sec?.nombre || '', slug: sec?.slug || '', descripcion: sec?.descripcion || '',
    requiere_aprobacion: sec?.requiere_aprobacion || false, visible: sec?.visible !== false,
    cp_origen: sec?.cp_origen || '1888', ignorar_stock: sec?.ignorar_stock || false, permitir_sin_stock: sec?.permitir_sin_stock || false,
    aviso_titulo: sec?.aviso_titulo || '', aviso: sec?.aviso || '',
  });
  const save = async () => {
    if (!f.nombre.trim()) { toast('Poné un nombre', 'error'); return; }
    const slug = f.slug || f.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      if (isNew) await api.createSeccion({ ...f, slug });
      else await api.updateSeccion(sec.id, { ...sec, ...f, slug });
      toast(isNew ? 'Tienda creada' : 'Tienda actualizada'); onSaved();
    } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header"><span className="modal-title">{isNew ? 'Nueva tienda' : 'Editar tienda'}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Nombre *</label><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Ej: Sucursal Centro" autoFocus /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} placeholder="Ej: Retiro en local zona sur" /></div>
          <div className="form-group"><label className="form-label">CP de origen (para envíos)</label><input value={f.cp_origen} onChange={e => setF({ ...f, cp_origen: e.target.value })} placeholder="1888" /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.requiere_aprobacion} onChange={e => setF({ ...f, requiere_aprobacion: e.target.checked })} /> Requiere aprobación (mayorista)</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.visible} onChange={e => setF({ ...f, visible: e.target.checked })} /> Visible en la tienda</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.permitir_sin_stock} onChange={e => setF({ ...f, permitir_sin_stock: e.target.checked })} /> Permitir vender sin stock</label>
          <div className="form-group">
            <label className="form-label">Aviso destacado (opcional)</label>
            <input value={f.aviso_titulo} maxLength={200} onChange={e => setF({ ...f, aviso_titulo: e.target.value })} placeholder="Título. Ej: Importante: cómo funcionan los pedidos" style={{ marginBottom: 6 }} />
            <textarea value={f.aviso} rows={5} maxLength={3000} onChange={e => setF({ ...f, aviso: e.target.value })} placeholder={'Una condición por renglón. Ej:\nEl armado demora de 24 a 72 hs hábiles.'} style={{ width: '100%', resize: 'vertical' }} />
            <small style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>Se muestra como alerta arriba de la tienda, en cada producto y en el carrito. Al confirmar el pedido, el cliente tiene que marcar que lo leyó.</small>
          </div>
          {f.aviso.trim() && <AvisoSeccion sec={{ ...f, nombre: f.nombre }} compacto />}
          <button className="btn btn-primary" onClick={save} style={{ width: '100%' }}>{isNew ? 'Crear tienda' : 'Guardar cambios'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Placeholders Fase 2 (se completan después) ──
// Escáner por cámara: carga html5-qrcode por CDN, lee QR y códigos de barras
// Modo escáner pantalla completa: cámara arriba + lista de venta editable abajo
function CamScanner({ onScan, onClose, items, setQty, setPrecio, quitar, total, onRegistrar, saving, cliente }) {
  const scannerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [ultimo, setUltimo] = useState('');

  useEffect(() => {
    let scanner = null;
    let cancelled = false;
    const loadLib = () => new Promise((resolve, reject) => {
      if (window.Html5Qrcode) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
      s.onload = resolve; s.onerror = reject;
      document.body.appendChild(s);
    });
    (async () => {
      try {
        await loadLib();
        if (cancelled) return;
        setReady(true);
        scanner = new window.Html5Qrcode('cam-scanner-box');
        scannerRef.current = scanner;
        let lastCode = ''; let lastTime = 0;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 120 } },
          (decodedText) => {
            const now = Date.now();
            if (decodedText === lastCode && now - lastTime < 2000) return;
            lastCode = decodedText; lastTime = now;
            setUltimo(decodedText);
            onScan(decodedText);
            if (navigator.vibrate) navigator.vibrate(80);
          },
          () => {}
        );
      } catch (e) {
        setErr('No se pudo abrir la cámara. Revisá los permisos del navegador.');
      }
    })();
    return () => { cancelled = true; if (scanner) { scanner.stop().then(() => scanner.clear()).catch(() => {}); } };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <strong style={{ fontSize: 16 }}><Camera size={15} style={{ verticalAlign: '-2px' }} /> Venta con escáner{cliente ? ` · ${cliente.nombre}` : ''}</strong>
        <button className="btn btn-outline btn-sm" onClick={onClose}>✕ Cerrar</button>
      </div>

      {/* Cámara arriba */}
      <div style={{ flexShrink: 0, background: '#000', position: 'relative' }}>
        {err ? <p style={{ color: '#fff', padding: 24, textAlign: 'center' }}>{err}</p> : (
          <div id="cam-scanner-box" style={{ width: '100%', maxHeight: '38vh', overflow: 'hidden' }}></div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, padding: '4px 10px', textAlign: 'center' }}>
          {ready ? (ultimo ? `Último: ${ultimo}` : 'Apuntá al código de barras o QR') : 'Cargando cámara...'}
        </div>
      </div>

      {/* Lista de venta abajo (scroll) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 14 }}>Escaneá productos para agregarlos a la venta</p>
        ) : (
          items.map(i => (
            <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.nombre || i.modelo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtARS(i.precio_unitario * i.qty)}</div>
              </div>
              <input type="number" value={i.qty} onChange={e => setQty(i.id, Number(e.target.value))} style={{ width: 52, textAlign: 'center' }} />
              <input type="number" value={i.precio_unitario} onChange={e => setPrecio(i.id, Number(e.target.value))} style={{ width: 80 }} />
              <button className="btn btn-danger btn-sm" onClick={() => quitar(i.id)}>✕</button>
            </div>
          ))
        )}
      </div>

      {/* Footer fijo: total + registrar */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--bg-card)' }}>
        <div style={{ fontWeight: 900, fontSize: 20 }}>Total: {fmtARS(total)}</div>
        <button className="btn btn-primary" onClick={onRegistrar} disabled={saving || !items.length} style={{ padding: '12px 24px' }}>{saving ? 'Registrando...' : 'Registrar venta'}</button>
      </div>
    </div>
  );
}

// Formulario para agregar un pago parcial en la venta de mostrador
function PagoParcialInput({ total, pagosVenta, onAdd }) {
  const { config } = useContext(Ctx);
  const [metodo, setMetodo] = useState('efectivo');
  const [cuentaComo, setCuentaComo] = useState('');
  const [ajustePct, setAjustePct] = useState(0);
  let ajustesMetodo = {};
  try { ajustesMetodo = config.ajustes_metodo ? JSON.parse(config.ajustes_metodo) : {}; } catch {}
  const saldado = pagosVenta.reduce((s, p) => s + Number(p.cuenta_como || 0), 0);
  const saldo = Math.max(0, total - saldado);
  const previewRec = Math.round((Number(cuentaComo) || 0) * (1 + (Number(ajustePct) || 0) / 100));
  const onMetodo = (m) => { setMetodo(m); setAjustePct(ajustesMetodo[m] !== undefined ? ajustesMetodo[m] : 0); };
  const add = () => {
    const cta = Number(cuentaComo);
    if (!(cta > 0)) return;
    const pct = Number(ajustePct) || 0;
    const rec = Math.round(cta * (1 + pct / 100));
    onAdd({ metodo, recibido: rec, cuenta_como: cta, ajuste_pct: pct });
    setCuentaComo(''); setAjustePct(ajustesMetodo[metodo] !== undefined ? ajustesMetodo[metodo] : 0);
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 6 }}>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Método</label>
          <select value={metodo} onChange={e => onMetodo(e.target.value)} style={{ width: '100%' }}>
            <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="débito">Débito</option><option value="crédito">Crédito</option><option value="mercadopago">MercadoPago</option><option value="otro">Otro</option>
          </select>
        </div>
        <div style={{ width: 110 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Salda</label>
          <input type="number" value={cuentaComo} onChange={e => setCuentaComo(e.target.value)} placeholder="0" style={{ width: '100%' }} />
        </div>
        <div style={{ width: 68 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ajuste %</label>
          <input type="number" value={ajustePct} onChange={e => setAjustePct(e.target.value)} placeholder="0" style={{ width: '100%' }} title="+ recargo, - descuento" />
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setCuentaComo(String(saldo))}>Resto</button>
        <button className="btn btn-primary btn-sm" onClick={add}>+ Pago</button>
      </div>
      {Number(cuentaComo) > 0 && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          Cobrale <strong style={{ color: 'var(--text)' }}>{fmtARS(previewRec)}</strong> en {metodo}{previewRec !== Number(cuentaComo) ? (previewRec < Number(cuentaComo) ? ` (descuento ${fmtARS(Number(cuentaComo) - previewRec)})` : ` (recargo ${fmtARS(previewRec - Number(cuentaComo))})`) : ''}
        </div>
      )}
    </div>
  );
}

function AdminVentaManual() {
  const { secciones, toast, miPlan, user } = useContext(Ctx);
  const pdvLector = user?.es_owner || (miPlan?.features?.pdv === 'lector') || !miPlan?.features; // lector de código solo Full
  const [seccionId, setSeccionId] = useState('');
  const [items, setItems] = useState([]);
  const [busq, setBusq] = useState('');
  const [resultados, setResultados] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanCam, setScanCam] = useState(false);
  const [scanBuffer, setScanBuffer] = useState('');
  const [cliente, setCliente] = useState(null); // cliente seleccionado {id, nombre}
  const [busqCliente, setBusqCliente] = useState('');
  const [resClientes, setResClientes] = useState([]);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', email: '' });
  const [credsNuevoCliente, setCredsNuevoCliente] = useState(null);
  const [pagosVenta, setPagosVenta] = useState([]); // pagos parciales de la venta de mostrador
  const [pagoParcial, setPagoParcial] = useState(false); // si activa, la venta no es "todo pagado"
  const searchTimer = useRef(null);
  const clienteTimer = useRef(null);
  const scanInputRef = useRef(null);

  useEffect(() => { if (secciones.length && !seccionId) setSeccionId(secciones[0].id); }, [secciones]);

  const buscarCliente = (q) => {
    setBusqCliente(q);
    clearTimeout(clienteTimer.current);
    if (q.length < 2) { setResClientes([]); return; }
    clienteTimer.current = setTimeout(async () => {
      try { const r = await api.getUsuarios(q); setResClientes(r || []); } catch {}
    }, 300);
  };
  const crearClienteRapido = async () => {
    if (!nuevoCliente.nombre) { toast('Poné al menos el nombre', 'error'); return; }
    try {
      const u = await api.createUsuario({ ...nuevoCliente, rol: 'cliente', activo: true });
      setCliente({ id: u.id, nombre: u.nombre });
      setShowNuevoCliente(false); setNuevoCliente({ nombre: '', telefono: '', email: '' });
      // Guardar credenciales para mostrar/imprimir (el cliente las usa para entrar online)
      setCredsNuevoCliente({ nombre: u.nombre, usuario: u.usuario, password: u.password_temporal });
      toast('Cliente creado y asignado');
    } catch (e) { toast(e.message, 'error'); }
  };

  // Imprime una ficha con los datos de acceso del cliente nuevo
  const imprimirCredenciales = (creds) => {
    const w = window.open('', '', 'width=400,height=400');
    if (!w) { toast('Permití los pop-ups para imprimir', 'error'); return; }
    w.document.write(`<html><head><title>Datos de acceso</title></head>
      <body style="font-family:sans-serif;padding:20px;text-align:center">
        <div style="border:2px solid #000;border-radius:10px;padding:20px;display:inline-block;max-width:320px">
          <h2 style="margin:0 0 4px">Tus datos de acceso</h2>
          <p style="color:#555;font-size:13px;margin:0 0 16px">Entrá a nuestra tienda online con estos datos</p>
          <div style="text-align:left;font-size:15px;line-height:2">
            <div><strong>Cliente:</strong> ${escHtml(creds.nombre)}</div>
            <div style="background:#f0f0f0;padding:8px;border-radius:6px;margin-top:8px">
              <div><strong>Usuario:</strong> ${escHtml(creds.usuario)}</div>
              <div><strong>Contraseña:</strong> ${escHtml(creds.password)}</div>
            </div>
          </div>
          <p style="color:#777;font-size:12px;margin-top:16px">Podés cambiar tu contraseña desde tu perfil cuando ingreses.</p>
          <p style="color:#999;font-size:11px;margin-top:8px">${escHtml(window.location.origin)}</p>
        </div>
      </body></html>`);
    w.document.close();
    imprimirCuandoCargue(w);
  };

  // Buscar producto por código exacto (pistola USB o cámara) y agregarlo
  const agregarPorCodigo = async (codigo) => {
    const c = (codigo || '').trim();
    if (!c) return;
    try {
      const p = await api.getProductoPorCodigo(c);
      agregar(p);
      toast(`✓ ${p.nombre || p.modelo}`);
    } catch (e) {
      toast(`Código "${c}" no encontrado`, 'error');
    }
  };

  const buscar = (q) => {
    setBusq(q);
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setResultados([]); return; }
    searchTimer.current = setTimeout(async () => {
      try { const r = await api.buscarProductosAdmin(q); setResultados(r || []); } catch {}
    }, 300);
  };

  const agregar = (p) => {
    const stockMax = (p.permitir_sin_stock || p.es_digital || p.es_preventa) ? Infinity : Number(p.stock || 0);
    const actual = items.find(i => i.id === p.id);
    const yaLleva = actual ? actual.qty : 0;
    if (yaLleva + 1 > stockMax) { toast(`Sin stock suficiente de "${p.nombre || p.modelo}" (disponible: ${stockMax})`, 'error'); return; }
    if (actual) { setItems(items.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)); }
    else setItems([...items, { ...p, qty: 1, precio_unitario: p.precio_base }]);
    setBusq(''); setResultados([]);
  };
  const setQty = (id, qty) => setItems(items.map(i => {
    if (i.id !== id) return i;
    const stockMax = (i.permitir_sin_stock || i.es_digital || i.es_preventa) ? Infinity : Number(i.stock || 0);
    let q = Math.max(1, qty);
    if (q > stockMax) { toast(`Solo hay ${stockMax} en stock de "${i.nombre || i.modelo}"`, 'error'); q = stockMax; }
    return { ...i, qty: q };
  }));
  const setPrecio = (id, precio) => setItems(items.map(i => i.id === id ? { ...i, precio_unitario: precio } : i));
  const quitar = (id) => setItems(items.filter(i => i.id !== id));

  const total = items.reduce((s, i) => s + (Number(i.precio_unitario) || 0) * i.qty, 0);

  const guardar = async () => {
    if (!items.length) { toast('Agregá al menos un producto', 'warning'); return; }
    setSaving(true);
    try {
      // Estado de pago según los pagos parciales (por cuenta_como = lo saldado)
      const totalSald = pagosVenta.reduce((s, p) => s + Number(p.cuenta_como || 0), 0);
      let estadoPago = 'pagado';
      if (pagoParcial && pagosVenta.length) {
        estadoPago = totalSald >= Number(total) - 0.01 ? 'pagado' : (totalSald > 0 ? 'senado' : 'impago');
      }
      await api.createPedido({
        seccion_id: Number(seccionId), tipo: 'pedido', estado: 'entregado', estado_pago: estadoPago,
        usuario_id: cliente ? cliente.id : undefined,
        metodo_pago: pagoParcial && pagosVenta.length ? pagosVenta.map(p => p.metodo).join('+') : metodoPago,
        notas: notas || 'Venta de mostrador', subtotal: total, descuento: 0, total,
        sena: (pagoParcial && estadoPago !== 'pagado') ? totalSald : 0,
        pagos: pagoParcial && pagosVenta.length ? pagosVenta : [{ metodo: metodoPago, recibido: total, cuenta_como: total, ajuste_pct: 0 }],
        items: items.map(i => ({ producto_id: i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: i.nombre || i.modelo, cantidad: i.qty, precio_unitario: i.precio_unitario, precio_base: i.precio_base }))
      });
      toast(cliente ? `¡Venta registrada a ${cliente.nombre}!` : '¡Venta registrada! Stock descontado.');
      setItems([]); setNotas(''); setScanCam(false); setCliente(null); setPagosVenta([]); setPagoParcial(false);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Punto de venta</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Venta de mostrador: buscá productos, ajustá cantidad y precio, y registrá. Descuenta stock y queda como pedido entregado y pagado. (Próximamente: escanear con la cámara.)</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={seccionId} onChange={e => setSeccionId(e.target.value)} style={{ width: 200 }}>
          {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={{ width: 160 }}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="qr">QR / Mercado Pago</option>
        </select>
      </div>

      {/* Cliente (opcional) */}
      <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
        {cliente ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 14 }}><User size={15} style={{ verticalAlign: '-2px' }} /> Cliente: <strong>{cliente.nombre}</strong></span>
            <button className="btn btn-outline btn-sm" onClick={() => setCliente(null)}>Quitar</button>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Asignar a un cliente (opcional): buscá por nombre..." value={busqCliente} onChange={e => buscarCliente(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
              <button className="btn btn-outline btn-sm" onClick={() => setShowNuevoCliente(!showNuevoCliente)}>+ Nuevo cliente</button>
            </div>
            {resClientes.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto', zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                {resClientes.map(u => (
                  <div key={u.id} onClick={() => { setCliente({ id: u.id, nombre: u.nombre }); setBusqCliente(''); setResClientes([]); }} style={{ padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                    {u.nombre} <span style={{ color: 'var(--text-muted)' }}>{u.telefono || u.email || ''}</span>
                  </div>
                ))}
              </div>
            )}
            {showNuevoCliente && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <input placeholder="Nombre *" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} style={{ flex: 1, minWidth: 130 }} />
                <input placeholder="Teléfono" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} style={{ width: 130 }} />
                <input placeholder="Email" value={nuevoCliente.email} onChange={e => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} style={{ width: 160 }} />
                <button className="btn btn-primary btn-sm" onClick={crearClienteRapido}>Crear</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ficha de credenciales del cliente recién creado */}
      {credsNuevoCliente && (
        <div style={{ marginBottom: 16, padding: 14, background: 'var(--success-light, #ecfdf5)', border: '1.5px solid var(--success)', borderRadius: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>✓ Cliente creado — datos de acceso</div>
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>
            <div><strong>Usuario:</strong> {credsNuevoCliente.usuario}</div>
            <div><strong>Contraseña:</strong> {credsNuevoCliente.password}</div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 10px' }}>Dale estos datos al cliente para que pueda comprar online la próxima vez. Puede cambiar la contraseña desde su perfil.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => imprimirCredenciales(credsNuevoCliente)}><Printer size={15} style={{ verticalAlign: '-2px' }} /> Imprimir ficha</button>
            <button className="btn btn-outline btn-sm" onClick={() => setCredsNuevoCliente(null)}>Cerrar</button>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input placeholder="Buscar producto por nombre o SKU..." value={busq} onChange={e => buscar(e.target.value)} style={{ width: '100%' }} />
        {resultados.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, maxHeight: 260, overflowY: 'auto', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            {resultados.map(p => (
              <div key={p.id} onClick={() => agregar(p)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
                {p.imagen ? <img src={imgOpt(p.imagen, 80)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} /> : <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--border-light)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}><Package size={15} style={{ verticalAlign: '-2px' }} /></div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre || p.modelo} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({p.categoria})</span></div>
                  {p.seccion_nombre && <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: p.seccion_color || '#888', display: 'inline-block' }}></span>{p.seccion_nombre}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700 }}>{fmtARS(p.precio_base)}</div>
                  <div style={{ fontSize: 11, color: p.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>stock: {p.stock}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Escáner: pistola USB (input) + cámara — solo plan con lector de código (Full) */}
      {pdvLector && (
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          ref={scanInputRef}
          placeholder="Escaneá con pistola acá (o escribí el código y Enter)"
          value={scanBuffer}
          onChange={e => setScanBuffer(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarPorCodigo(scanBuffer); setScanBuffer(''); } }}
          style={{ flex: 1, minWidth: 220, borderColor: 'var(--accent)' }}
        />
        <button className="btn btn-primary btn-sm" onClick={() => setScanCam(true)}><Camera size={15} style={{ verticalAlign: '-2px' }} /> Escanear con cámara (modo venta rápida)</button>
      </div>
      )}
      {scanCam && <CamScanner
        onScan={(code) => { agregarPorCodigo(code); }}
        onClose={() => setScanCam(false)}
        items={items}
        setQty={setQty}
        setPrecio={setPrecio}
        quitar={quitar}
        total={total}
        saving={saving}
        cliente={cliente}
        onRegistrar={guardar}
      />}

      {items.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Buscá y agregá productos a la venta</p> : (
        <table className="admin-table" style={{ marginBottom: 12 }}>
          <thead><tr><th>Producto</th><th style={{width:80}}>Cant</th><th style={{width:110}}>Precio</th><th style={{width:100}}>Subtotal</th><th style={{width:40}}></th></tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id}>
                <td><ItemProd id={i.id} nombre={i.nombre || i.modelo} imagen={i.imagen} tam={36} /></td>
                <td><input type="number" value={i.qty} onChange={e => setQty(i.id, Number(e.target.value))} style={{ width: 60 }} /></td>
                <td><input type="number" value={i.precio_unitario} onChange={e => setPrecio(i.id, Number(e.target.value))} style={{ width: 90 }} /></td>
                <td style={{ fontWeight: 700 }}>{fmtARS(i.precio_unitario * i.qty)}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => quitar(i.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas (opcional)" rows={2} style={{ width: '100%', marginBottom: 12 }} />

      {/* Pago parcial / mixto */}
      <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: pagoParcial ? 10 : 0 }}>
          <input type="checkbox" checked={pagoParcial} onChange={e => { setPagoParcial(e.target.checked); if (!e.target.checked) setPagosVenta([]); }} />
          Pago parcial o en varios métodos (seña, mixto)
        </label>
        {pagoParcial && (
          <div>
            {pagosVenta.map((p, idx) => { const dif = Number(p.cuenta_como || 0) - Number(p.recibido || 0); return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ textTransform: 'capitalize' }}>{p.metodo}{Number(p.ajuste_pct) !== 0 ? ` (${Number(p.ajuste_pct) > 0 ? '+' : ''}${p.ajuste_pct}%)` : ''}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right' }}>
                  <span><strong>{fmtARS(p.recibido)}</strong>{Math.abs(dif) > 0.01 && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>salda {fmtARS(p.cuenta_como)}</span>}</span>
                  <button onClick={() => setPagosVenta(pagosVenta.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
                </span>
              </div>); })}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '6px 0 2px' }}>
              <span>Recibido (plata real)</span><span style={{ color: 'var(--success)' }}>{fmtARS(pagosVenta.reduce((s, p) => s + Number(p.recibido || 0), 0))}</span>
            </div>
            {(() => { const saldado = pagosVenta.reduce((s, p) => s + Number(p.cuenta_como || 0), 0); const saldo = total - saldado; return saldo > 0.01 ? <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: 'var(--danger)', marginBottom: 6 }}><span>Falta saldar</span><span>{fmtARS(saldo)}</span></div> : <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700, marginBottom: 6 }}>✓ Cubre el total</div>; })()}
            <PagoParcialInput total={total} pagosVenta={pagosVenta} onAdd={(p) => setPagosVenta([...pagosVenta, p])} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 22 }}>Total: {fmtARS(total)}</div>
        <button className="btn btn-primary" onClick={guardar} disabled={saving || !items.length} style={{ padding: '12px 28px' }}>{saving ? 'Registrando...' : 'Registrar venta'}</button>
      </div>
    </div>
  );
}

function AdminOrdenesCompra() {
  const { secciones, toast } = useContext(Ctx);
  const [ordenes, setOrdenes] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [ver, setVer] = useState(null);
  const load = () => api.getOrdenesCompra().then(setOrdenes).catch(() => {});
  useEffect(() => { load(); }, []);

  const recibir = async (id) => {
    if (!confirm('¿Marcar como recibida? Se sumará el stock de todos los productos.')) return;
    try { const r = await api.recibirOrdenCompra(id); toast(`Stock actualizado (${r.items_recibidos} items)`); load(); setVer(null); }
    catch (e) { toast(e.message, 'error'); }
  };
  const borrar = async (id) => {
    if (!confirm('¿Eliminar esta orden de compra?')) return;
    try { await api.deleteOrdenCompra(id); toast('Eliminada'); load(); setVer(null); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontWeight: 900, fontSize: 22 }}>Órdenes de compra</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ Nueva orden</button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Registrá tus compras a proveedores. Al marcar una orden como "recibida", se suma automáticamente el stock. (Próximamente: cargar desde foto de la factura.)</p>

      {ordenes.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No hay órdenes de compra todavía</p> : ordenes.map(o => (
        <div key={o.id} className="card" onClick={() => api.getOrdenCompra(o.id).then(setVer)} style={{ padding: 14, marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <strong>OC-{String(o.id).padStart(4, '0')}</strong>
            <span style={{ marginLeft: 8 }}>{o.proveedor || 'Sin proveedor'}</span>
            {o.seccion_nombre && <span style={{ fontSize: 10, background: 'var(--border)', padding: '1px 8px', borderRadius: 4, marginLeft: 6 }}>{o.seccion_nombre}</span>}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{new Date(o.created_at).toLocaleDateString('es-AR')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: o.recibida ? 'var(--success)' : 'var(--accent)', color: '#fff' }}>{o.recibida ? 'recibida' : 'pendiente'}</span>
            <strong>{fmtARS(o.total)}</strong>
          </div>
        </div>
      ))}

      {showNew && <OrdenCompraModal secciones={secciones} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} toast={toast} />}

      {ver && (
        <div className="modal-overlay" onClick={() => setVer(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header"><span className="modal-title">OC-{String(ver.id).padStart(4, '0')}</span><button className="modal-close" onClick={() => setVer(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{ fontSize: 13, marginBottom: 4 }}><b>Proveedor:</b> {ver.proveedor || '—'}</div>
              <div style={{ fontSize: 13, marginBottom: 4 }}><b>Sección:</b> {ver.seccion_nombre || '—'}</div>
              <div style={{ fontSize: 13, marginBottom: 12 }}><b>Estado:</b> <span style={{ background: ver.recibida ? 'var(--success)' : 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{ver.recibida ? 'recibida' : 'pendiente'}</span></div>
              {(ver.items || []).map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                  <ItemProd id={it.producto_id} nombre={it.nombre_producto} imagen={it.imagen} sub={`x${it.cantidad} · ${fmtARS(it.costo_unitario)} c/u`} tam={36} />
                  <span style={{ fontWeight: 700 }}>{fmtARS(it.costo_unitario * it.cantidad)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontWeight: 900, fontSize: 18 }}><span>Total</span><span>{fmtARS(ver.total)}</span></div>
              {ver.notas && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}><FileText size={15} style={{ verticalAlign: '-2px' }} /> {ver.notas}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {!ver.recibida && <button className="btn btn-success" onClick={() => recibir(ver.id)} style={{ flex: 1 }}>✓ Marcar recibida (sumar stock)</button>}
                <button className="btn btn-danger" onClick={() => borrar(ver.id)}><Trash2 size={15} style={{ verticalAlign: '-2px' }} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdenCompraModal({ secciones, onClose, onSaved, toast }) {
  const [proveedor, setProveedor] = useState('');
  const [seccionId, setSeccionId] = useState(secciones[0]?.id || '');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([]);
  const [busq, setBusq] = useState('');
  const [resultados, setResultados] = useState([]);
  const searchTimer = useRef(null);

  const buscar = (q) => {
    setBusq(q); clearTimeout(searchTimer.current);
    if (q.length < 2) { setResultados([]); return; }
    searchTimer.current = setTimeout(async () => { try { const r = await api.buscarProductosAdmin(q); setResultados(r || []); } catch {} }, 300);
  };
  const agregar = (p) => {
    if (!items.find(i => i.producto_id === p.id)) setItems([...items, { producto_id: p.id, nombre_producto: p.nombre || p.modelo, cantidad: 1, costo_unitario: p.precio_original || 0 }]);
    setBusq(''); setResultados([]);
  };
  const agregarManual = () => setItems([...items, { producto_id: null, nombre_producto: '', cantidad: 1, costo_unitario: 0 }]);
  const upd = (idx, campo, val) => setItems(items.map((it, i) => i === idx ? { ...it, [campo]: val } : it));
  const quitar = (idx) => setItems(items.filter((_, i) => i !== idx));
  const total = items.reduce((s, i) => s + (Number(i.costo_unitario) || 0) * (Number(i.cantidad) || 0), 0);

  const guardar = async () => {
    if (!items.length) { toast('Agregá al menos un producto', 'warning'); return; }
    try { await api.createOrdenCompra({ proveedor, seccion_id: Number(seccionId), notas, items, total }); toast('Orden de compra creada'); onSaved(); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header"><span className="modal-title">Nueva orden de compra</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <input placeholder="Proveedor" value={proveedor} onChange={e => setProveedor(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <select value={seccionId} onChange={e => setSeccionId(e.target.value)} style={{ width: 160 }}>{secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
          </div>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input placeholder="Buscar producto..." value={busq} onChange={e => buscar(e.target.value)} style={{ width: '100%' }} />
            {resultados.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto', zIndex: 10 }}>
                {resultados.map(p => <div key={p.id} onClick={() => agregar(p)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 8, alignItems: 'center' }}>{p.imagen ? <img src={p.imagen} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} /> : <span style={{ fontSize: 16 }}><Package size={15} style={{ verticalAlign: '-2px' }} /></span>}<span style={{ flex: 1 }}>{p.nombre || p.modelo}{p.seccion_nombre && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> · {p.seccion_nombre}</span>}</span></div>)}
              </div>
            )}
          </div>
          <button className="btn btn-outline btn-sm" onClick={agregarManual} style={{ marginBottom: 10 }}>+ Item manual (sin producto)</button>
          {items.map((it, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <input value={it.nombre_producto} onChange={e => upd(idx, 'nombre_producto', e.target.value)} placeholder="Producto" style={{ flex: 1 }} />
              <input type="number" value={it.cantidad} onChange={e => upd(idx, 'cantidad', Number(e.target.value))} style={{ width: 60 }} title="Cantidad" />
              <input type="number" value={it.costo_unitario} onChange={e => upd(idx, 'costo_unitario', Number(e.target.value))} style={{ width: 90 }} title="Costo unitario" />
              <button className="btn btn-danger btn-sm" onClick={() => quitar(idx)}>✕</button>
            </div>
          ))}
          <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas" rows={2} style={{ width: '100%', margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 18 }}>Total: {fmtARS(total)}</strong>
            <button className="btn btn-primary" onClick={guardar}>Crear orden</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cómo se cobra un método de envío propio. Un 'fijo' sin precio se trata como "a cotizar" (nunca "gratis" por error).
const cobroEnvio = (m) => m?.tipo === 'gratis' ? 'gratis' : (m?.tipo === 'a_cotizar' || !(Number(m?.precio) > 0)) ? 'a_cotizar' : 'fijo';

function AdminReglasCompra() {
  const { secciones, toast, config, setConfig } = useContext(Ctx);
  const [minimos, setMinimos] = useState({});
  const [monedas, setMonedas] = useState({});
  const [aplicaRetiro, setAplicaRetiro] = useState({});
  const [verUsd, setVerUsd] = useState({});
  const [fuente, setFuente] = useState(config.usd_fuente || 'blue');
  const [manual, setManual] = useState(config.usd_manual || '');
  const [saving, setSaving] = useState(null);
  const cot = useCotizacionUsd(true);
  useEffect(() => {
    const d = {}, mo = {}, ar = {}, vu = {};
    secciones.forEach(s => {
      d[s.id] = config[`compra_minima_${s.id}`] || '';
      mo[s.id] = config[`compra_minima_moneda_${s.id}`] === 'USD' ? 'USD' : 'ARS';
      ar[s.id] = config[`min_aplica_retiro_${s.id}`] === 'true';
      vu[s.id] = mostrarUsdSec(config, s);
    });
    setMinimos(d); setMonedas(mo); setAplicaRetiro(ar); setVerUsd(vu);
  }, [secciones, config]);

  const save = async (sec) => {
    setSaving(sec.id);
    try {
      const upd = {
        [`compra_minima_${sec.id}`]: String(minimos[sec.id] || 0),
        [`compra_minima_moneda_${sec.id}`]: monedas[sec.id] === 'USD' ? 'USD' : 'ARS',
        [`min_aplica_retiro_${sec.id}`]: aplicaRetiro[sec.id] ? 'true' : 'false',
        [`mostrar_usd_${sec.id}`]: verUsd[sec.id] ? 'true' : 'false',
      };
      await api.updateConfig(upd);
      setConfig({ ...config, ...upd });
      toast(`Reglas de ${sec.nombre} guardadas`);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(null);
  };
  const guardarDolar = async () => {
    setSaving('usd');
    try { const upd = { usd_fuente: fuente, usd_manual: String(Number(manual) || '') }; await api.updateConfig(upd); setConfig({ ...config, ...upd }); toast('Cotización del dólar guardada'); }
    catch (e) { toast(e.message, 'error'); }
    setSaving(null);
  };

  return (
    <div>
      <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Reglas de compra</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Monto mínimo de compra por sección, en pesos o en dólares. Si es en dólares se pasa a pesos con la cotización del momento en que el cliente cierra el carrito. Por defecto el mínimo aplica solo al envío; marcá la casilla si también vale para el retiro. Dejá 0 para no exigir mínimo.</p>

      <div className="card rc-dolar">
        <div>
          <strong>Cotización del dólar</strong>
          <div className="rc-cot">{cot ? <>Hoy: <b>${fmt(cot.valor)}</b> <span>({cot.fuente === 'manual' ? 'manual' : cot.fuente === 'oficial' ? 'oficial' : cot.fuente === 'blue' ? 'blue' : 'último valor guardado'})</span></> : 'Consultando…'}</div>
        </div>
        <div className="rc-dolar-ctrl">
          <select value={fuente} onChange={e => setFuente(e.target.value)} aria-label="Fuente de la cotización">
            <option value="blue">Dólar blue (automático)</option>
            <option value="oficial">Dólar oficial (automático)</option>
            <option value="manual">Valor fijo que pongo yo</option>
          </select>
          {fuente === 'manual' && <input type="number" inputMode="decimal" value={manual} onChange={e => setManual(e.target.value)} placeholder="Ej: 1250" style={{ width: 110 }} aria-label="Valor del dólar" />}
          <button className="btn btn-primary btn-sm" onClick={guardarDolar} disabled={saving === 'usd'}>{saving === 'usd' ? '...' : 'Guardar'}</button>
        </div>
      </div>

      {secciones.map(s => {
        const n = Number(minimos[s.id]) || 0; const enUsd = monedas[s.id] === 'USD';
        return (
          <div key={s.id} className="card" style={{ padding: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: 15 }}>{s.nombre}</strong>
                {n > 0
                  ? <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 2 }}>Mínimo activo: {enUsd ? `${fmtUSD(n)}${cot ? ` (hoy ${fmtARS(Math.round(n * cot.valor))})` : ''}` : fmtARS(n)}</div>
                  : <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Sin mínimo (se puede comprar cualquier monto)</div>}
              </div>
              <div className="rc-min-ctrl">
                <select value={monedas[s.id] || 'ARS'} onChange={e => setMonedas({ ...monedas, [s.id]: e.target.value })} aria-label="Moneda del mínimo" style={{ width: 118 }}>
                  <option value="ARS">Pesos $</option><option value="USD">Dólares</option>
                </select>
                <input type="number" value={minimos[s.id] ?? ''} onChange={e => setMinimos({ ...minimos, [s.id]: e.target.value })} placeholder="0" />
                <button className="btn btn-primary btn-sm" onClick={() => save(s)} disabled={saving === s.id}>{saving === s.id ? '...' : 'Guardar'}</button>
              </div>
            </div>
            <div className="rc-opciones">
              {n > 0 && (
                <label><input type="checkbox" checked={!!aplicaRetiro[s.id]} onChange={e => setAplicaRetiro({ ...aplicaRetiro, [s.id]: e.target.checked })} /> <span>El mínimo también aplica al <strong>retiro en el local</strong></span></label>
              )}
              <label><input type="checkbox" checked={!!verUsd[s.id]} onChange={e => setVerUsd({ ...verUsd, [s.id]: e.target.checked })} /> <span>Mostrar los precios también en <strong>dólares</strong> (el cliente elige cómo pagar)</span></label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ADMIN: Dashboard ───
// ─── DASHBOARD: cada número se puede tocar y muestra lo que lo forma ───
// ─── GRÁFICOS CON ONDAS (curvas suaves con relleno degradé) y ANILLO ───
// Curva suave (Catmull-Rom) que pasa por todos los puntos; los controles no bajan del piso ni pasan el techo
function curvaSuave(pts, techo, piso) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const lim = (y) => Math.max(techo, Math.min(piso, y));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = lim(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = lim(p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

const techoLindo = (v) => { if (v <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; };

function GraficoOndas({ etiquetas = [], series = [], alto = 260, formato = (v) => fmt(v), tip, onPunto }) {
  const ref = useRef(null); const [ancho, setAncho] = useState(600); const [hover, setHover] = useState(null);
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(([e]) => setAncho(Math.max(260, Math.round(e.contentRect.width)))); ro.observe(el); return () => ro.disconnect(); }, []);
  const n = etiquetas.length; const pL = 46, pR = 12, pT = 14, pB = 40; const W = ancho, H = alto;
  const maxV = techoLindo(Math.max(1, ...series.flatMap(s => s.valores.map(Number))));
  const x = (i) => n <= 1 ? (pL + (W - pL - pR) / 2) : pL + i * (W - pL - pR) / (n - 1);
  const y = (v) => pT + (1 - Number(v || 0) / maxV) * (H - pT - pB);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => maxV * f);
  const cada = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - pL) / 34))));
  const uid = useMemo(() => 'g' + Math.random().toString(36).slice(2, 8), []);
  const colW = n > 1 ? (W - pL - pR) / (n - 1) : W - pL - pR;
  return (
    <div className="ondas" ref={ref}>
      <svg width={W} height={H} role="img" aria-label={series.map(s => s.nombre).join(' y ')}>
        <defs>{series.map((s, si) => (
          <linearGradient key={si} id={`${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.32" /><stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
          </linearGradient>))}</defs>
        {ticks.map((t, i) => <g key={i}><line x1={pL} x2={W - pR} y1={y(t)} y2={y(t)} className="ondas-grid" /><text x={pL - 8} y={y(t) + 4} textAnchor="end" className="ondas-eje">{formato(t)}</text></g>)}
        {etiquetas.map((_, i) => <line key={i} x1={x(i)} x2={x(i)} y1={pT} y2={H - pB} className="ondas-grid v" />)}
        {series.map((s, si) => { const pts = s.valores.map((v, i) => [x(i), y(v)]); const linea = curvaSuave(pts, pT, H - pB); return (
          <g key={si}>
            {pts.length > 1 && <path d={`${linea} L${pts[pts.length - 1][0]},${H - pB} L${pts[0][0]},${H - pB} Z`} fill={`url(#${uid}-${si})`} />}
            <path d={linea} fill="none" stroke={s.color} strokeWidth="2.6" strokeLinecap="round" />
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 5 : 3.2} fill="var(--bg-card)" stroke={s.color} strokeWidth="2" />)}
          </g>); })}
        {etiquetas.map((e, i) => i % cada === 0 || (i === n - 1 && (n - 1) % cada >= Math.ceil(cada / 2)) ? <text key={i} transform={`translate(${x(i)},${H - pB + 14}) rotate(-40)`} textAnchor="end" className="ondas-eje">{e}</text> : null)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pT} y2={H - pB} className="ondas-guia" />}
        {etiquetas.map((_, i) => <rect key={i} x={x(i) - colW / 2} y={pT} width={colW} height={H - pT - pB} fill="transparent" style={{ cursor: onPunto ? 'pointer' : 'default' }}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onPunto && onPunto(i)} />)}
      </svg>
      {hover !== null && (
        <div className="ondas-tip" style={{ left: Math.min(Math.max(x(hover), 80), W - 80), top: Math.max(0, Math.min(...series.map(s => y(s.valores[hover]))) - 12) }}>
          <b>{etiquetas[hover]}</b>
          {tip ? tip(hover) : series.map((s, si) => <span key={si}><i style={{ background: s.color }} />{s.nombre}: {formato(s.valores[hover])}</span>)}
        </div>
      )}
      {series.length > 1 && <div className="ondas-ley">{series.map((s, si) => <span key={si}><i style={{ background: s.color }} />{s.nombre}</span>)}</div>}
    </div>
  );
}

function Anillo({ datos = [], tam = 190 }) {
  const total = datos.reduce((a, d) => a + (Number(d.n) || 0), 0);
  const r = tam / 2 - 16, C = 2 * Math.PI * r; let acum = 0;
  return (
    <div className="anillo">
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} role="img" aria-label="Distribución">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="26" />
        {total > 0 && datos.map((d, i) => { const largo = (d.n / total) * C; const el = <circle key={i} cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={d.color} strokeWidth="26" strokeDasharray={`${largo} ${C - largo}`} strokeDashoffset={-acum} transform={`rotate(-90 ${tam / 2} ${tam / 2})`}><title>{`${d.label}: ${d.n}`}</title></circle>; acum += largo; return el; })}
        <text x="50%" y="48%" textAnchor="middle" className="anillo-num">{fmt(total)}</text>
        <text x="50%" y="60%" textAnchor="middle" className="anillo-sub">visitas</text>
      </svg>
      <div className="anillo-ley">{datos.map((d, i) => <span key={i}><i style={{ background: d.color }} />{d.label} <b>{total ? Math.round(d.n / total * 100) : 0}%</b></span>)}</div>
    </div>
  );
}

const fmtDuracion = (seg) => { const s = Math.max(0, Math.round(Number(seg) || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}h ${m}m` : m ? `${m}m ${r}s` : `${r}s`; };

const DISPOSITIVOS = { desktop: ['PC', '#10b981'], mobile: ['Celular', '#0ea5e9'], tablet: ['Tablet', '#8b5cf6'], bot: ['Bots', '#f59e0b'] };

// Visitas de la tienda (contador propio): tarjetas, evolución diaria con ondas, dispositivos y búsquedas
function DashVisitas({ desde, hasta }) {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { let vivo = true; setErr(''); api.getAnalyticsVisitas({ ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) }).then(r => { if (vivo) setD(r); }).catch(e => { if (vivo) setErr(e.message); }); return () => { vivo = false; }; }, [desde, hasta]);
  if (err) return null;
  if (!d) return <div className="dash-cargando">Cargando visitas…</div>;
  // Días seguidos (los días sin visitas también aparecen)
  const ini = fechaDia(d.desde); const fin = d.hasta ? fechaDia(d.hasta) : new Date(); fin.setHours(0, 0, 0, 0);
  const porDia = Object.fromEntries((d.dias || []).map(x => [x.fecha, x]));
  const dias = []; for (let t = new Date(ini); t <= fin && dias.length < 400; t.setDate(t.getDate() + 1)) dias.push(ymd(t));
  const etiquetas = dias.map(f => `${f.slice(8, 10)}/${f.slice(5, 7)}`);
  const kpis = [
    { l: 'Visitas', v: fmt(d.visitas), I: Eye, c: '#10b981' }, { l: 'Visitantes', v: fmt(d.visitantes), I: Users, c: '#0ea5e9' },
    { l: 'Páginas vistas', v: fmt(d.paginas), I: FileText, c: '#8b5cf6' }, { l: 'Tiempo promedio', v: fmtDuracion(d.tiempo_promedio_seg), I: Clock, c: '#f59e0b' },
  ];
  const disp = (d.dispositivos || []).map(x => ({ label: (DISPOSITIVOS[x.k] || [x.k])[0], color: (DISPOSITIVOS[x.k] || [0, '#94a3b8'])[1], n: x.n }));
  const maxOr = Math.max(1, ...(d.origenes || []).map(o => o.n));
  const sinDatos = !d.visitas && !d.busquedas;
  return (
    <div className="vis">
      <div className="dash-card-head" style={{ marginTop: 22 }}><h4 style={{ fontSize: 18 }}>Visitas de la tienda</h4><span>contador propio{!desde ? ' · últimos 30 días' : ''}</span></div>
      <div className="vkpis">{kpis.map(k => <div key={k.l} className="vkpi" style={{ '--k': k.c }}><div><span>{k.l}</span><b>{k.v}</b></div><i><k.I size={20} /></i></div>)}</div>
      {sinDatos ? <div className="dash-card vis-vacio">Todavía no hay visitas registradas en este período. Se cuentan desde que se activó el contador.</div> : <>
        <div className="vis-grid">
          <div className="dash-card"><h4 className="vis-t">Evolución diaria</h4><p className="vis-s">Visitas y páginas vistas por día.</p>
            <GraficoOndas etiquetas={etiquetas} series={[{ nombre: 'Páginas vistas', color: '#0ea5e9', valores: dias.map(f => porDia[f]?.paginas || 0) }, { nombre: 'Visitas', color: '#10b981', valores: dias.map(f => porDia[f]?.visitas || 0) }]} />
          </div>
          <div className="dash-card"><h4 className="vis-t">Dispositivos</h4><p className="vis-s">Desde qué equipo entran.</p><Anillo datos={disp} />
            {(d.bots || []).length > 0 && <>
              <h4 className="vis-t" style={{ marginTop: 16 }}>Bots que entraron</h4>
              <p className="vis-s">Programas automáticos (Google, Vercel…). No se cuentan como visitas.</p>
              <ol className="vis-lista">{d.bots.map(b => <li key={b.k}><span>{b.k}</span><b>{b.n}</b></li>)}</ol>
            </>}
          </div>
        </div>
        <div className="vis-grid3">
          <div className="dash-card"><h4 className="vis-t">Lo más buscado</h4><p className="vis-s">Lo que más escriben en el buscador.</p>
            {(d.busquedas_top || []).length ? <ol className="vis-lista">{d.busquedas_top.map(b => <li key={b.k}><span>{b.k}{b.min_res === 0 && <em className="vis-sin">sin resultados</em>}</span><b>{b.n}</b></li>)}</ol> : <p className="vis-s">Sin búsquedas todavía.</p>}
          </div>
          <div className="dash-card vis-alerta"><h4 className="vis-t">Buscado y sin resultados</h4><p className="vis-s">Lo que te piden y no encontraron: conseguilo o cargalo.</p>
            {(d.busquedas_sin_resultado || []).length ? <ol className="vis-lista">{d.busquedas_sin_resultado.map(b => <li key={b.k}><span>{b.k}</span><b>{b.n}</b></li>)}</ol> : <p className="vis-s">Nada por ahora: todo lo buscado tuvo resultados.</p>}
          </div>
          <div className="dash-card"><h4 className="vis-t">De dónde llegan</h4><p className="vis-s">Visitas por origen.</p>
            <ul className="vis-origen">{(d.origenes || []).map(o => <li key={o.k}><span>{o.k}</span><i><em style={{ width: `${o.n / maxOr * 100}%` }} /></i><b>{o.n}</b></li>)}</ul>
            <h4 className="vis-t" style={{ marginTop: 14 }}>Páginas más vistas</h4>
            <ol className="vis-lista">{(d.paginas_top || []).slice(0, 6).map(p => <li key={p.k}><span title={p.k}>{p.nombre || (p.k === '/' ? 'Inicio' : p.k)}</span><b>{p.n}</b></li>)}</ol>
          </div>
        </div>
      </>}
    </div>
  );
}

const RANGOS_DASH = [
  { k: 'todo', t: 'Todo' }, { k: 'hoy', t: 'Hoy' }, { k: '7', t: '7 días' }, { k: '30', t: '30 días' },
  { k: 'mes', t: 'Este mes' }, { k: 'mes_ant', t: 'Mes anterior' }, { k: 'custom', t: 'Elegir fechas' },
];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fechaDia = (txt) => { const [y, m, d] = String(txt).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };

function rangoFechas(k, desdeC, hastaC) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const menos = (n) => { const d = new Date(hoy); d.setDate(d.getDate() - n); return d; };
  if (k === 'hoy') return { desde: ymd(hoy), hasta: ymd(hoy) + 'T23:59:59' };
  if (k === '7') return { desde: ymd(menos(6)), hasta: '' };
  if (k === '30') return { desde: ymd(menos(29)), hasta: '' };
  if (k === 'mes') return { desde: ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: '' };
  if (k === 'mes_ant') return { desde: ymd(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)), hasta: ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 0)) + 'T23:59:59' };
  if (k === 'custom') return { desde: desdeC || '', hasta: hastaC ? hastaC + 'T23:59:59' : '' };
  return { desde: '', hasta: '' };
}

const ESTADOS_DASH = [
  { k: 'pendiente', l: 'Pendientes', c: 'var(--warning)' }, { k: 'preparando', l: 'Preparando', c: 'var(--primary)' },
  { k: 'listo', l: 'Listos', c: '#8b5cf6' }, { k: 'enviado', l: 'Enviados', c: '#0ea5e9' }, { k: 'entregado', l: 'Entregados', c: 'var(--success)' },
];

const colorEstadoDash = (e) => (ESTADOS_DASH.find(x => x.k === e) || {}).c || 'var(--text-muted)';

function AdminDashboard() {
  const { adminSeccion, setAdminTab, toast } = useContext(Ctx);
  const [stats, setStats] = useState(null);
  const [rango, setRango] = useState(() => { try { return localStorage.getItem('gm_dash_rango') || 'todo'; } catch { return 'todo'; } });
  const [desdeC, setDesdeC] = useState(''); const [hastaC, setHastaC] = useState('');
  const [stockBajo, setStockBajo] = useState([]);
  const [pila, setPila] = useState(null);           // detalle abierto: [{ tipo, titulo, valor }] (se puede profundizar)
  const [pedidoAbierto, setPedidoAbierto] = useState(null);
  const [prodEdit, setProdEdit] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const { desde, hasta } = rangoFechas(rango, desdeC, hastaC);
  const filtros = { seccion_id: adminSeccion, desde, hasta, is_test: 'false' };

  const loadStats = async () => {
    try { const s = await api.getStats({ seccion_id: adminSeccion, ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}), is_test: 'false' }); setStats(s || {}); }
    catch { setStats(prev => prev || {}); }
  };
  useEffect(() => { loadStats(); }, [adminSeccion, desde, hasta, recarga]);
  useEffect(() => { api.getStockBajo().then(setStockBajo).catch(() => {}); }, [recarga]);
  const elegirRango = (k) => { setRango(k); try { localStorage.setItem('gm_dash_rango', k); } catch {} };
  const abrir = (tipo, titulo, valor) => setPila([{ tipo, titulo, valor }]);
  const verPedido = async (p) => { try { setPedidoAbierto(await api.getPedido(p.id)); } catch (e) { toast(e.message, 'error'); } };
  const editarProducto = async (id) => { try { setProdEdit(await api.getProducto(id)); } catch (e) { toast(e.message, 'error'); } };

  const st = stats || {};
  const pct = (st.ventas_mes_anterior > 0) ? Math.round((st.ventas_mes_actual - st.ventas_mes_anterior) / st.ventas_mes_anterior * 100) : null;
  const g = st.ganancia || {};
  const hoyS = st.hoy || {};
  const aCobrarN = st.pedidos_a_cobrar || 0;
  const periodo = rango === 'todo' ? 'desde el inicio' : (RANGOS_DASH.find(r => r.k === rango) || {}).t?.toLowerCase();
  const kpis = [
    { k: 'cobrados', I: DollarSign, titulo: 'Ventas cobradas', label: 'Ventas cobradas', value: fmtARS(st.total_ventas || 0), color: 'var(--success)',
      sub: pct !== null && rango === 'todo' ? <>Este mes {fmtARS(st.ventas_mes_actual || 0)} <span className={pct >= 0 ? 'dash-up' : 'dash-down'}>{pct >= 0 ? '+' : ''}{pct}%</span> vs mismos días del mes pasado</> : `${st.pedidos_pagados || 0} pedidos pagados` },
    { k: 'a_cobrar', I: CreditCard, titulo: 'Pedidos a cobrar', label: 'A cobrar', value: fmtARS(st.total_a_cobrar || 0), color: 'var(--accent, #e8a13a)', sub: `${aCobrarN} pedido${aCobrarN !== 1 ? 's' : ''} con saldo` },
    { k: 'ganancia', I: BarChart3, titulo: 'Ganancia por producto', label: 'Ganancia estimada', value: g.facturado_con_costo > 0 ? fmtARS(Math.round(g.ganancia || 0)) : 'Sin datos', color: '#10b981',
      sub: g.facturado_con_costo > 0 ? `margen ${g.margen_pct}% · ${g.cobertura_pct}% de lo vendido tiene costo` : 'cargá el precio de costo en los productos' },
    { k: 'pedidos', I: ClipboardList, titulo: 'Pedidos', label: 'Pedidos', value: st.total_pedidos || 0, color: 'var(--primary)', sub: `ticket promedio ${fmtARS(Math.round(st.ticket_promedio || 0))}` },
    { k: 'hoy', I: Clock, titulo: 'Pedidos de hoy', label: 'Hoy', value: fmtARS(hoyS.total || 0), color: 'var(--primary)', sub: `${hoyS.pedidos || 0} pedido${hoyS.pedidos !== 1 ? 's' : ''} · cobrado ${fmtARS(hoyS.cobrado || 0)}` },
  ];
  const minis = [
    { label: 'Productos', value: st.total_productos || 0, go: () => setAdminTab('productos') },
    { label: 'Sin stock', value: st.productos_sin_stock || 0, alerta: (st.productos_sin_stock || 0) > 0, go: () => setAdminTab('productos') },
    { label: 'Clientes nuevos', value: st.clientes_nuevos || 0, sub: (desde || hasta) ? 'en el período' : 'últimos 30 días', go: () => abrir('clientes_nuevos', 'Clientes nuevos') },
    { label: 'Clientes por aprobar', value: st.clientes_por_aprobar || 0, alerta: (st.clientes_por_aprobar || 0) > 0, go: () => setAdminTab('usuarios') },
    { label: 'Carritos dejados', value: st.carritos_abandonados || 0, go: () => setAdminTab('carritos') },
  ];
  const estados = st.pedidos_por_estado || {};

  // Ventas por día: 14 días seguidos (los días sin ventas también aparecen)
  const fin = hasta ? fechaDia(hasta) : new Date(); fin.setHours(0, 0, 0, 0);
  const porDia = Object.fromEntries((st.ventas_por_dia || []).map(x => [String(x.fecha).slice(0, 10), x]));
  const serie = Array.from({ length: 14 }, (_, n) => { const d = new Date(fin); d.setDate(d.getDate() - (13 - n)); const f = ymd(d); const x = porDia[f] || {}; return { f, d, total: Number(x.total) || 0, pedidos: Number(x.pedidos) || 0, vendido: Number(x.vendido) || 0 }; });
  const maxDia = Math.max(1, ...serie.map(x => x.total));
  const suma14 = serie.reduce((a, x) => a + x.total, 0);
  const DIAS_SEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  return (
    <div className="dash">
      <div className="dash-head">
        <h3>Dashboard</h3>
        <div className="dash-rangos" role="group" aria-label="Período">
          {RANGOS_DASH.map(r => <button key={r.k} type="button" className={rango === r.k ? 'on' : ''} onClick={() => elegirRango(r.k)}>{r.t}</button>)}
        </div>
        {rango === 'custom' && (
          <div className="dash-fechas">
            <input type="date" value={desdeC} onChange={e => setDesdeC(e.target.value)} aria-label="Desde" />
            <input type="date" value={hastaC} onChange={e => setHastaC(e.target.value)} aria-label="Hasta" />
          </div>
        )}
      </div>
      {!stats && <div className="dash-cargando">Cargando…</div>}

      <div className="dash-kpis">
        {kpis.map(k => (
          <button key={k.k} type="button" className="dash-kpi" style={{ '--k': k.color }} onClick={() => abrir(k.k, k.titulo)}>
            <span className="dash-kpi-label">{k.label}<ChevronRight size={15} /></span>
            <span className="dash-kpi-valor">{k.value}</span>
            {k.I && <i className="dash-kpi-ico"><k.I size={20} /></i>}
            <span className="dash-kpi-sub">{k.sub}</span>
          </button>
        ))}
      </div>

      <div className="dash-minis">
        {minis.map(m => (
          <button key={m.label} type="button" className={`dash-mini${m.alerta ? ' alerta' : ''}`} onClick={m.go}>
            <span className="dash-mini-valor">{m.value}</span>
            <span className="dash-mini-label">{m.label}{m.sub ? <small> · {m.sub}</small> : null}</span>
          </button>
        ))}
      </div>

      {st.usdt && ((st.usdt.total_ventas || 0) > 0 || (st.usdt.pedidos || 0) > 0 || (st.usdt.total_a_cobrar || 0) > 0) && (
        <div className="dash-card" style={{ borderTop: '3px solid #10b981' }}>
          <h4>Ventas en USDT</h4>
          <div className="dash-usdt">
            <div><b>USDT {fmt(st.usdt.total_ventas || 0)}</b><span>Cobrado</span></div>
            <div><b>USDT {fmt(st.usdt.total_a_cobrar || 0)}</b><span>A cobrar</span></div>
            <div><b>{st.usdt.pedidos || 0}</b><span>Pedidos ({st.usdt.pedidos_pagados || 0} pagados)</span></div>
          </div>
        </div>
      )}

      <DashVisitas desde={desde} hasta={hasta} />

      <div className="dash-card">
        <div className="dash-card-head"><h4>Pedidos por estado</h4><span>{periodo}</span></div>
        <div className="dash-estados">
          {ESTADOS_DASH.map(e => (
            <button key={e.k} type="button" className="dash-estado" style={{ '--k': e.c }} onClick={() => abrir('estado', e.l, e.k)} disabled={!estados[e.k]}>
              <b>{estados[e.k] || 0}</b><span>{e.l}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-head"><h4>Cobrado por día</h4><span>{fmtARS(suma14)} en estos 14 días · tocá un punto para ver los pedidos del día</span></div>
        <GraficoOndas etiquetas={serie.map(x => `${x.d.getDate()}/${x.d.getMonth() + 1}`)} alto={230} formato={(v) => v >= 1000 ? `$${fmt(v / 1000)}k` : `$${fmt(v)}`}
          series={[{ nombre: 'Cobrado', color: 'var(--primary)', valores: serie.map(x => x.total) }]}
          tip={(i) => <><span>{DIAS_SEM[serie[i].d.getDay()]} · <b>{fmtARS(serie[i].total)}</b> cobrado</span><span>{serie[i].pedidos} pedido{serie[i].pedidos !== 1 ? 's' : ''} · {fmtARS(serie[i].vendido)} vendido</span></>}
          onPunto={(i) => { const x = serie[i]; if (x.pedidos) abrir('dia', `Pedidos del ${x.d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`, x.f); }} />
      </div>

      <div className="dash-grid2">
        {st.top_productos?.length > 0 && (
          <div className="dash-card">
            <div className="dash-card-head"><h4>Más vendidos</h4><span>unidades cobradas</span></div>
            {st.top_productos.slice(0, 10).map((p, i) => (
              <button key={i} type="button" className="dash-fila" onClick={() => abrir('producto', p.nombre, p.nombre)}>
                <span className="dash-fila-txt"><b className="dash-num">{i + 1}</b>{p.nombre}</span>
                <span className="dash-fila-val">{p.cantidad} u.<ChevronRight size={14} /></span>
              </button>
            ))}
          </div>
        )}
        {st.top_categorias?.length > 0 && (
          <div className="dash-card">
            <div className="dash-card-head"><h4>Categorías que más facturan</h4></div>
            {(() => { const max = Math.max(...st.top_categorias.map(c => Number(c.total) || 0), 1); return st.top_categorias.slice(0, 8).map((c, i) => (
              <button key={i} type="button" className="dash-fila dash-fila-barra" onClick={() => abrir('categoria', c.categoria, c.categoria)}>
                <span className="dash-fila-txt">{c.categoria}</span>
                <span className="dash-fila-val">{fmtARS(c.total)}<ChevronRight size={14} /></span>
                <span className="dash-mini-barra"><span style={{ width: `${Math.round((Number(c.total) || 0) / max * 100)}%` }} /></span>
              </button>
            )); })()}
          </div>
        )}
        {st.ventas_por_metodo?.length > 0 && (
          <div className="dash-card">
            <div className="dash-card-head"><h4>Por método de pago</h4><span>cobrado</span></div>
            {st.ventas_por_metodo.map((m, i) => (
              <button key={i} type="button" className="dash-fila" onClick={() => abrir('metodo', `Pagos con ${m.metodo}`, m.metodo)}>
                <span className="dash-fila-txt">{m.metodo} <small>{m.cantidad} pedido{Number(m.cantidad) !== 1 ? 's' : ''}</small></span>
                <span className="dash-fila-val">{fmtARS(m.total)}<ChevronRight size={14} /></span>
              </button>
            ))}
          </div>
        )}
        {st.ventas_por_seccion?.length > 0 && (
          <div className="dash-card">
            <div className="dash-card-head"><h4>Por tienda</h4><span>cobrado</span></div>
            {st.ventas_por_seccion.map((x, i) => (
              <button key={i} type="button" className="dash-fila" onClick={() => abrir('seccion', `Pedidos de ${x.seccion}`, x.seccion_id)}>
                <span className="dash-fila-txt">{x.seccion} <small>{x.cantidad} pedido{Number(x.cantidad) !== 1 ? 's' : ''}</small></span>
                <span className="dash-fila-val">{fmtARS(x.total)}<ChevronRight size={14} /></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {stockBajo.length > 0 && (
        <div className="dash-card dash-stock">
          <div className="dash-card-head"><h4>{stockBajo.length} producto{stockBajo.length !== 1 ? 's' : ''} con stock bajo</h4><button className="btn btn-outline btn-sm" onClick={() => setAdminTab('productos')}>Ver en productos</button></div>
          <div className="dash-stock-lista">
            {stockBajo.slice(0, 20).map(p => (
              <button key={p.id} type="button" className="dash-fila" onClick={() => editarProducto(p.id)} title="Editar producto">
                <span className="dash-fila-txt"><ItemProd nombre={p.nombre || p.modelo} imagen={p.imagen} sub={p.seccion_nombre} tam={30} /></span>
                <span className="dash-fila-val" style={{ color: p.stock <= 0 ? 'var(--danger)' : 'var(--accent)' }}>{p.stock} / mín {p.stock_minimo}<ChevronRight size={14} /></span>
              </button>
            ))}
            {stockBajo.length > 20 && <div className="dash-nota">y {stockBajo.length - 20} más…</div>}
          </div>
        </div>
      )}

      {pila && !pedidoAbierto && (
        <DashDetalle pila={pila} setPila={setPila} filtros={filtros} recarga={recarga} onVerPedido={verPedido}
          onIrA={(tab) => { setPila(null); setAdminTab(tab); }} />
      )}
      {pedidoAbierto && <OrderDetailModal order={pedidoAbierto} onClose={() => { setPedidoAbierto(null); setRecarga(x => x + 1); }} />}
      {prodEdit && <ProductModal product={prodEdit} onClose={() => { setProdEdit(null); setRecarga(x => x + 1); }} />}
    </div>
  );
}

// Panel con el detalle de un número del dashboard. Se puede profundizar (categoría → producto → pedidos).
function DashDetalle({ pila, setPila, filtros, recarga, onVerPedido, onIrA }) {
  const actual = pila[pila.length - 1];
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let vivo = true; setData(null); setError('');
    api.getStatsDetalle({ ...filtros, tipo: actual.tipo, valor: actual.valor })
      .then(d => { if (vivo) setData(d); }).catch(e => { if (vivo) setError(e.message || 'No se pudo cargar'); });
    return () => { vivo = false; };
  }, [actual.tipo, actual.valor, filtros.desde, filtros.hasta, filtros.seccion_id, recarga]);
  const cerrar = () => setPila(null);
  const atras = () => setPila(pila.slice(0, -1));
  const profundizar = (tipo, titulo, valor) => setPila([...pila, { tipo, titulo, valor }]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { if (pila.length > 1) atras(); else cerrar(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const r = (data && data.resumen) || {};
  const recordarPago = (e, p) => {
    e.stopPropagation();
    const tel = telWaPedido(p); if (!tel) return;
    window.open(waLink(tel, `Hola ${p.usuario_nombre || ''}, ¿cómo estás? Te escribo por tu pedido ${numOrden(p)}: queda un saldo de ${fmtARS(p.saldo)}. Cuando puedas me avisás y te paso los datos para abonarlo.`), '_blank');
  };
  const saludarCliente = (e, c) => { e.stopPropagation(); if (c.telefono) window.open(waLink(c.telefono, `Hola ${c.nombre || ''}, gracias por registrarte en nuestra tienda. Cualquier consulta escribime por acá.`), '_blank'); };
  const fila = (onClick, hijos, k) => <div key={k} className="dd-fila" role="button" tabIndex={0} onClick={onClick} onKeyDown={e => { if (e.key === 'Enter') onClick(); }}>{hijos}</div>;

  return createPortal(
    <div className="dd-overlay" onClick={cerrar}>
      <aside className="dd-panel" onClick={e => e.stopPropagation()} role="dialog" aria-label={actual.titulo}>
        <header className="dd-head">
          {pila.length > 1 && <button type="button" className="dd-icono" onClick={atras} aria-label="Volver"><ArrowLeft size={18} /></button>}
          <div className="dd-titulos">
            <span className="dd-sup">{pila.length > 1 ? pila[pila.length - 2].titulo : 'Dashboard'}</span>
            <h4>{actual.titulo}</h4>
          </div>
          <button type="button" className="dd-icono" onClick={cerrar} aria-label="Cerrar"><X size={18} /></button>
        </header>
        {data && (
          <div className="dd-resumen">
            {data.modo === 'pedidos' && <>
              <span><b>{r.cantidad}</b> pedido{r.cantidad !== 1 ? 's' : ''}</span>
              <span>Total <b>{fmtARS(r.total)}</b></span>
              {r.cobrado > 0 && <span className="ok">Cobrado <b>{fmtARS(r.cobrado)}</b></span>}
              {r.saldo > 0 && <span className="warn">A cobrar <b>{fmtARS(r.saldo)}</b></span>}
            </>}
            {data.modo === 'productos' && <>
              <span><b>{r.cantidad}</b> producto{r.cantidad !== 1 ? 's' : ''} · {r.unidades} u.</span>
              <span>Facturado <b>{fmtARS(r.total)}</b></span>
              {r.cantidad > r.sin_costo && <span className="ok">Ganancia <b>{fmtARS(Math.round(r.ganancia))}</b></span>}
              {r.sin_costo > 0 && <span className="warn">{r.sin_costo} sin precio de costo</span>}
            </>}
            {data.modo === 'clientes' && <>
              <span><b>{r.cantidad}</b> cliente{r.cantidad !== 1 ? 's' : ''}</span>
              <span className="ok">{r.compraron} ya compraron</span>
            </>}
          </div>
        )}
        <div className="dd-lista">
          {!data && !error && <div className="dd-vacio">Cargando…</div>}
          {error && <div className="dd-vacio">{error}</div>}
          {data && !data.filas.length && <div className="dd-vacio">No hay nada para mostrar con estos filtros.</div>}
          {data && data.modo === 'pedidos' && data.filas.map(p => fila(() => onVerPedido(p), <>
            <div className="dd-fila-main">
              <div className="dd-fila-l1"><strong>{numOrden(p)}</strong><span>{p.usuario_nombre || '(sin nombre)'}{p.nombre_fantasia ? ` · ${p.nombre_fantasia}` : ''}</span></div>
              <div className="dd-fila-l2">
                {p.seccion_nombre && <span className="kb-sec" style={{ background: p.seccion_color || 'var(--primary)' }}>{p.seccion_nombre}</span>}
                <span className="dd-estado" style={{ '--k': colorEstadoDash(p.estado) }}>{p.estado}</span>
                <span className={`kb-pago ${p.estado_pago}`}>{p.estado_pago}</span>
                {p.cantidad_producto ? <span className="dd-fecha">{p.cantidad_producto} u.</span> : null}
                <span className="dd-fecha">{fechaCortaPed(p.created_at)}</span>
              </div>
            </div>
            <div className="dd-fila-r">
              <b>{fmtARS(p.total)}</b>
              {Number(p.saldo) > 0 && <span className="dd-saldo">debe {fmtARS(p.saldo)}</span>}
              {Number(p.saldo) > 0 && telWaPedido(p) && <button type="button" className="dd-wa" onClick={e => recordarPago(e, p)}><MessageCircle size={13} /> Recordar</button>}
            </div>
          </>, p.id))}
          {data && data.modo === 'productos' && data.filas.map((x, i) => fila(() => profundizar('producto', x.nombre, x.nombre), <>
            <div className="dd-fila-main">
              <div className="dd-fila-l1"><ItemProd id={x.producto_id} nombre={x.nombre} imagen={x.imagen} tam={36} /></div>
              <div className="dd-fila-l2">
                <span className="dd-fecha">{x.cantidad} u.</span>
                {x.costo === null ? <span className="dd-sincosto">sin precio de costo</span> : <span className="dd-fecha">costo {fmtARS(x.costo)}</span>}
              </div>
            </div>
            <div className="dd-fila-r">
              <b>{fmtARS(x.total)}</b>
              {x.ganancia !== null && <span className={x.ganancia >= 0 ? 'dd-gan' : 'dd-perd'}>{x.ganancia >= 0 ? '+' : ''}{fmtARS(Math.round(x.ganancia))}</span>}
            </div>
          </>, i))}
          {data && data.modo === 'clientes' && data.filas.map(c => fila(() => onIrA('usuarios'), <>
            <div className="dd-fila-main">
              <div className="dd-fila-l1"><strong>{c.nombre || c.usuario}</strong>{!c.aprobado && <span className="dd-sincosto">por aprobar</span>}</div>
              <div className="dd-fila-l2"><span className="dd-fecha">{c.telefono || c.email || c.usuario}</span><span className="dd-fecha">alta {fechaCortaPed(c.created_at)}</span></div>
            </div>
            <div className="dd-fila-r">
              <b>{c.compras} compra{c.compras !== 1 ? 's' : ''}</b>
              {c.telefono && <button type="button" className="dd-wa" onClick={e => saludarCliente(e, c)}><MessageCircle size={13} /> Escribir</button>}
            </div>
          </>, c.id))}
          {data && data.modo === 'pedidos' && r.cantidad > data.filas.length && <div className="dd-vacio">Se muestran los {data.filas.length} más recientes de {r.cantidad}.</div>}
        </div>
        <footer className="dd-pie">
          {data && data.modo === 'pedidos' && <button type="button" className="btn btn-outline btn-sm" onClick={() => onIrA('pedidos')}>Ir a Pedidos</button>}
          {data && data.modo === 'productos' && r.sin_costo > 0 && <button type="button" className="btn btn-outline btn-sm" onClick={() => onIrA('productos')}>Cargar precios de costo</button>}
          {data && data.modo === 'clientes' && <button type="button" className="btn btn-outline btn-sm" onClick={() => onIrA('usuarios')}>Ir a Clientes</button>}
          <span className="dd-ayuda">Tocá una fila para ver más</span>
        </footer>
      </aside>
    </div>, document.body);
}

// ─── ADMIN: Productos (inline editable table) ───
function AdminCategorias() {
  const { adminSeccion, secciones, toast } = useContext(Ctx);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(null);
  const [merging, setMerging] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [sel, setSel] = useState(new Set());
  const [busq, setBusq] = useState('');
  const [showMasa, setShowMasa] = useState(false);
  const [masaDestino, setMasaDestino] = useState('');
  const [showCrear, setShowCrear] = useState(false);
  const [nuevaCat, setNuevaCat] = useState('');
  const [seoEdit, setSeoEdit] = useState(null); // {nombre, titulo, descripcion} → página /categoria/... para Google
  const guardarSeo = async () => {
    try { await api.saveCategoriaSeo(seoEdit); toast('Guardado'); setSeoEdit(null); load(); } catch (e) { toast(e.message, 'error'); }
  };

  const crearCat = async () => {
    if (!nuevaCat.trim()) { toast('Poné un nombre', 'error'); return; }
    try { await api.crearCategoria(nuevaCat.trim()); toast('Categoría creada'); setShowCrear(false); setNuevaCat(''); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const load = async () => {
    setLoading(true);
    try { const d = await api.getCategoriasAdmin(adminSeccion); setCats(d || []); } catch (e) { toast(e.message, 'error'); }
    setLoading(false); setDirty(false); setSel(new Set());
  };
  useEffect(() => { load(); }, [adminSeccion]);

  const catsVista = busq ? cats.filter(c => c.nombre.toLowerCase().includes(busq.toLowerCase())) : cats;
  const toggleSel = (nombre) => { const s = new Set(sel); s.has(nombre) ? s.delete(nombre) : s.add(nombre); setSel(s); };
  const toggleAll = () => { if (sel.size === catsVista.length) setSel(new Set()); else setSel(new Set(catsVista.map(c => c.nombre))); };

  // Fusionar todas las seleccionadas en una destino
  const fusionarMasa = async () => {
    if (!masaDestino) { toast('Elegí o escribí la categoría destino', 'error'); return; }
    const desde = [...sel].filter(n => n !== masaDestino);
    if (!desde.length) { toast('Seleccioná categorías a fusionar', 'warning'); return; }
    try {
      let total = 0;
      for (const d of desde) { const r = await api.renombrarCategoria(d, masaDestino, adminSeccion); total += r.afectados || 0; }
      toast(`${total} productos movidos a "${masaDestino}" (${desde.length} categorías fusionadas)`);
      setShowMasa(false); setMasaDestino(''); load();
    } catch (e) { toast(e.message, 'error'); }
  };
  // Eliminar seleccionadas (productos van a Sin categoría)
  const eliminarMasa = async () => {
    if (!confirm(`¿Eliminar ${sel.size} categorías? Sus productos pasan a "Sin categoría" (no se borran).`)) return;
    try { for (const n of sel) await api.deleteCategoria(n); toast(`${sel.size} categorías eliminadas`); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const onDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) return;
    const arr = [...cats];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(idx, 0, moved);
    setCats(arr.map((c, i) => ({ ...c, orden: i })));
    setDragIdx(null); setDirty(true);
  };

  const toggleVisible = (nombre) => { setCats(cats.map(c => c.nombre === nombre ? { ...c, visible: !c.visible } : c)); setDirty(true); };

  const saveOrden = async () => {
    try { await api.guardarCategoriasMeta(cats.map((c, i) => ({ nombre: c.nombre, orden: i, visible: c.visible }))); toast('Orden guardado'); setDirty(false); }
    catch (e) { toast(e.message, 'error'); }
  };

  const doRename = async () => {
    if (!renaming.nuevo?.trim()) { toast('Poné un nombre', 'error'); return; }
    try { const r = await api.renombrarCategoria(renaming.nombre, renaming.nuevo.trim(), adminSeccion); toast(`${r.afectados} productos actualizados`); setRenaming(null); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const doMerge = async () => {
    if (!merging.hasta) { toast('Elegí la categoría destino', 'error'); return; }
    try { const r = await api.renombrarCategoria(merging.desde, merging.hasta, adminSeccion); toast(`${r.afectados} productos movidos a ${merging.hasta}`); setMerging(null); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const doDelete = async (nombre) => {
    if (!confirm(`¿Eliminar la categoría "${nombre}"? Los productos pasan a "Sin categoría" (no se borran).`)) return;
    try { const r = await api.deleteCategoria(nombre); toast(`${r.movidos} productos movidos a "${r.destino}"`); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando categorías...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontWeight: 900, fontSize: 22 }}>Categorías ({cats.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCrear(true)}>+ Nueva categoría</button>
          {dirty && <button className="btn btn-outline btn-sm" onClick={saveOrden}>Guardar orden</button>}
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>Arrastrá ⠿ para reordenar cómo se ven en la tienda. Tocá el ojo para mostrar/ocultar. Para arreglar las del import: buscá, seleccioná varias y fusionalas en la correcta.</p>

      <input placeholder="Buscar categoría..." value={busq} onChange={e => setBusq(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />

      {/* Barra seleccionar todo + acciones masa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={catsVista.length > 0 && sel.size === catsVista.length} onChange={toggleAll} />
          Seleccionar {busq ? 'filtradas' : 'todas'}
        </label>
        {sel.size > 0 && <>
          <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>{sel.size} seleccionada{sel.size !== 1 ? 's' : ''}</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowMasa(true)}>Fusionar seleccionadas</button>
          <button className="btn btn-danger btn-sm" onClick={eliminarMasa}>Eliminar seleccionadas</button>
          <button className="btn btn-outline btn-sm" onClick={() => setSel(new Set())}>Limpiar</button>
        </>}
      </div>

      {cats.length === 0 && <p style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>No hay categorías en esta sección.</p>}

      {catsVista.map((c, idx) => (
        <div key={c.nombre} draggable={!busq} onDragStart={() => setDragIdx(idx)} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(idx)}
          className="card" style={{ padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, opacity: c.visible ? 1 : 0.5, border: sel.has(c.nombre) ? '2px solid var(--primary)' : (dragIdx === idx ? '2px dashed var(--primary)' : undefined) }}>
          <input type="checkbox" checked={sel.has(c.nombre)} onChange={() => toggleSel(c.nombre)} />
          {!busq && <span style={{ color: 'var(--text-muted)', fontSize: 18, cursor: 'grab' }}>⠿</span>}
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>{c.nombre}</strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{c.cantidad} producto{c.cantidad !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={() => toggleVisible(c.nombre)} title={c.visible ? 'Ocultar' : 'Mostrar'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>{c.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
          <button className="btn btn-outline btn-sm" onClick={() => setSeoEdit({ nombre: c.nombre, titulo: c.titulo || '', descripcion: c.descripcion || '' })} title="Título y texto de la página de esta categoría (Google)"><Globe size={14} style={{ verticalAlign: '-2px' }} /> Google</button>
          <button className="btn btn-outline btn-sm" onClick={() => setRenaming({ nombre: c.nombre, nuevo: c.nombre })}>Renombrar</button>
          <button className="btn btn-outline btn-sm" onClick={() => setMerging({ desde: c.nombre, hasta: '' })}>Fusionar</button>
          <button className="btn btn-danger btn-sm" onClick={() => doDelete(c.nombre)}><Trash2 size={15} style={{ verticalAlign: '-2px' }} /></button>
        </div>
      ))}

      {/* Modal crear categoría */}
      {seoEdit && (
        <div className="modal-overlay" onClick={() => setSeoEdit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header"><span className="modal-title">Página de "{seoEdit.nombre}" en Google</span><button className="modal-close" onClick={() => setSeoEdit(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Título</label><input value={seoEdit.titulo} onChange={e => setSeoEdit({ ...seoEdit, titulo: e.target.value })} placeholder="Ej: Estaciones de soldado y accesorios" maxLength={200} /></div>
              <div className="form-group"><label className="form-label">Texto de presentación</label><textarea rows={5} value={seoEdit.descripcion} onChange={e => setSeoEdit({ ...seoEdit, descripcion: e.target.value })} placeholder="2 o 3 líneas: qué productos hay, marcas, para qué sirven. Es lo que Google muestra debajo del título." maxLength={3000} /></div>
              <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Se ve en tu web en /categoria/{slugify(seoEdit.nombre)} y ayuda a aparecer cuando buscan esta categoría en Google.</small>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setSeoEdit(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardarSeo}>Guardar</button></div>
          </div>
        </div>
      )}
      {showCrear && (
        <div className="modal-overlay" onClick={() => setShowCrear(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header"><span className="modal-title">Nueva categoría</span><button className="modal-close" onClick={() => setShowCrear(false)}>✕</button></div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Creá una categoría vacía. Después le asignás productos desde Productos → acciones en masa, o al editar un producto.</p>
              <input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} placeholder="Ej: Herramientas" style={{ width: '100%', marginBottom: 12 }} autoFocus onKeyDown={e => e.key === 'Enter' && crearCat()} />
              <button className="btn btn-primary" onClick={crearCat} style={{ width: '100%' }}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal fusionar en masa */}
      {showMasa && (
        <div className="modal-overlay" onClick={() => setShowMasa(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header"><span className="modal-title">Fusionar {sel.size} categorías</span><button className="modal-close" onClick={() => setShowMasa(false)}>✕</button></div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Todos los productos de las {sel.size} categorías seleccionadas pasan a la categoría destino. Escribí una nueva o elegí una existente.</p>
              <input list="cats-destino" value={masaDestino} onChange={e => setMasaDestino(e.target.value)} placeholder="Categoría destino (ej: Herramientas)" style={{ width: '100%', marginBottom: 12 }} autoFocus />
              <datalist id="cats-destino">{cats.map(c => <option key={c.nombre} value={c.nombre} />)}</datalist>
              <button className="btn btn-primary" onClick={fusionarMasa} style={{ width: '100%' }}>Fusionar en "{masaDestino || '...'}"</button>
            </div>
          </div>
        </div>
      )}

      {renaming && (
        <div className="modal-overlay" onClick={() => setRenaming(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header"><span className="modal-title">Renombrar categoría</span><button className="modal-close" onClick={() => setRenaming(null)}>✕</button></div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Se renombra "{renaming.nombre}" en todos sus productos.</p>
              <input value={renaming.nuevo} onChange={e => setRenaming({ ...renaming, nuevo: e.target.value })} placeholder="Nuevo nombre" style={{ width: '100%', marginBottom: 12 }} autoFocus />
              <button className="btn btn-primary" onClick={doRename} style={{ width: '100%' }}>Renombrar</button>
            </div>
          </div>
        </div>
      )}

      {merging && (
        <div className="modal-overlay" onClick={() => setMerging(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header"><span className="modal-title">Fusionar categoría</span><button className="modal-close" onClick={() => setMerging(null)}>✕</button></div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Todos los productos de "{merging.desde}" pasan a la categoría que elijas.</p>
              <select value={merging.hasta} onChange={e => setMerging({ ...merging, hasta: e.target.value })} style={{ width: '100%', marginBottom: 12 }}>
                <option value="">Elegí destino...</option>
                {cats.filter(c => c.nombre !== merging.desde).map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
              </select>
              <button className="btn btn-primary" onClick={doMerge} style={{ width: '100%' }}>Fusionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminProductos() {
  const { adminSeccion, secciones, toast, user } = useContext(Ctx);
  const [productos, setProductos] = useState([]);
  const [reparandoFotos, setReparandoFotos] = useState(false);
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
  const [menuMas, setMenuMas] = useState(false);
  const [catFiltro, setCatFiltro] = useState('');
  const [stockFiltro, setStockFiltro] = useState('todos'); // todos | con | sin | bajo
  const [seleccion, setSeleccion] = useState(new Set());
  const [showMasa, setShowMasa] = useState(false);
  const [masaAccion, setMasaAccion] = useState({ tipo: '', valor: '' });

  const [secFiltro, setSecFiltro] = useState(adminSeccion);

  const load = async () => {
    const secId = secFiltro !== 'all' ? secFiltro : undefined;
    const data = await api.getProductos({ seccion_id: secId, q: busq, categoria: catFiltro, page: pagina, limit: pageSize, incluir_ocultos: 1 });
    setProductos(data.productos || []); setTotal(data.total || 0);
    const cats = await api.getCategorias(secId).catch(() => []);
    setCategorias(cats || []);
    setSeleccion(new Set());
  };
  useEffect(() => { setSecFiltro(adminSeccion); }, [adminSeccion]);
  useEffect(() => { load(); }, [secFiltro, busq, catFiltro, pagina]);

  const inlineUpdate = async (id, field, value) => {
    try { await api.updateProducto(id, { [field]: value }); setProductos(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x)); } catch (e) { toast(e.message, 'error'); }
  };
  // Campo numérico editable en la lista: guarda solo si cambió y marca en verde un instante
  const [flashGuardado, setFlashGuardado] = useState({});
  const campoNum = (p, field, opts = {}) => {
    const actual = Number(p[field]) || 0;
    const fk = `${p.id}_${field}`;
    const bajo = field === 'stock' && p.stock_minimo > 0 && Number(p.stock) <= p.stock_minimo;
    return (
      <input key={`${fk}_${actual}`} type="number" inputMode="decimal" className={`prod-num${bajo ? ' bajo' : ''}${flashGuardado[fk] ? ' guardado' : ''}`} defaultValue={field === 'precio_oferta' && !actual ? '' : actual}
        placeholder={opts.placeholder || ''} title={bajo ? `Stock bajo (mínimo: ${p.stock_minimo})` : ''} aria-label={opts.label || field}
        onFocus={e => e.target.select()}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        onBlur={e => {
          const v = Number(e.target.value) || 0;
          if (v === actual) return;
          inlineUpdate(p.id, field, v).then(() => { setFlashGuardado(f => ({ ...f, [fk]: true })); setTimeout(() => setFlashGuardado(f => { const n = { ...f }; delete n[fk]; return n; }), 900); });
        }} />
    );
  };
  const accionesProd = (p) => (
    <>
      <button className="btn btn-outline btn-sm prod-acc" onClick={() => setExpandVars(expandVars === p.id ? null : p.id)} title="Variantes" aria-label="Variantes"><Ico n="shuffle" s={15} /></button>
      <button className="btn btn-outline btn-sm prod-acc" onClick={async () => { try { await api.duplicarProducto(p.id); toast('Producto duplicado'); load(); } catch (e) { toast(e.message, 'error'); } }} title="Duplicar" aria-label="Duplicar"><Ico n="copy" s={15} /></button>
      <button className="btn btn-outline btn-sm prod-acc" onClick={() => setEditProd(p)} title="Editar" aria-label="Editar"><Ico n="edit" s={15} /></button>
      <button className="btn btn-danger btn-sm prod-acc" onClick={async () => { if (!confirm(`¿Eliminar "${p.nombre || p.modelo}"?`)) return; try { await api.deleteProducto(p.id); toast('Producto eliminado'); load(); } catch (e) { toast(e.message, 'error'); } }} title="Eliminar" aria-label="Eliminar"><Ico n="trash" s={15} /></button>
    </>
  );

  // Filtro de stock en frontend sobre la página cargada
  const productosVista = productos.filter(p => {
    if (stockFiltro === 'con') return (p.stock > 0) || p.permitir_sin_stock || p.es_digital;
    if (stockFiltro === 'sin') return !(p.stock > 0) && !p.permitir_sin_stock && !p.es_digital;
    if (stockFiltro === 'bajo') return p.stock_minimo > 0 && p.stock <= p.stock_minimo;
    return true;
  });

  // Selección múltiple
  const toggleSel = (id) => { const s = new Set(seleccion); s.has(id) ? s.delete(id) : s.add(id); setSeleccion(s); };
  const toggleAll = () => { if (seleccion.size === productosVista.length) setSeleccion(new Set()); else setSeleccion(new Set(productosVista.map(p => p.id))); };

  // Imprime etiquetas de varios productos en una sola hoja
  const printEtiquetasMasa = (ids) => {
    if (!ids.length) { toast('No hay productos seleccionados', 'warning'); return; }
    const conPrecio = window.confirm('¿Incluir el precio en las etiquetas?\n\n(Aceptar = con precio, Cancelar = sin precio)');
    const prods = productos.filter(p => ids.includes(p.id));
    const etiquetas = prods.map(prod => {
      const codigo = prod.codigo_barras || ('P' + String(prod.id).padStart(6, '0'));
      const nombre = prod.nombre || prod.modelo || '';
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(codigo)}&code=Code128&dpi=96&dataseparator=`;
      return `<div style="border:1px solid #000;padding:8px;display:inline-block;margin:5px;text-align:center;page-break-inside:avoid;width:180px;vertical-align:top">
        <div style="font-size:11px;font-weight:bold;margin-bottom:4px;height:28px;overflow:hidden">${escHtml(nombre)}</div>
        <img src="${escHtml(barcodeUrl)}" style="max-width:160px;display:block;margin:0 auto">
        <div data-respaldo="1" style="display:none;font-family:monospace;font-size:16px">*${escHtml(codigo)}*</div>
        <div style="font-size:12px;font-family:monospace;margin-top:2px">${escHtml(codigo)}</div>
        ${conPrecio ? `<div style="font-size:11px;color:#333;margin-top:2px">${fmtARS(prod.precio_base)}</div>` : ''}
      </div>`;
    }).join('');
    const w = window.open('', '', 'width=800,height=600');
    if (!w) { toast('El navegador bloqueó la ventana. Permití los pop-ups para este sitio.', 'error'); return; }
    w.document.write(`<html><head><title>Etiquetas (${prods.length})</title></head>
      <body style="font-family:sans-serif;margin:0;padding:10px">${etiquetas}
      </body></html>`);
    w.document.close();
    imprimirCuandoCargue(w, { espera: 400, maximo: 4000 });
  };

  const aplicarMasa = async () => {
    const ids = [...seleccion];
    if (!ids.length) { toast('No hay productos seleccionados', 'warning'); return; }
    try {
      if (masaAccion.tipo === 'categoria') {
        if (!masaAccion.valor) { toast('Elegí una categoría', 'error'); return; }
        await api.reasignarCategoria(ids, masaAccion.valor);
        toast(`${ids.length} productos → ${masaAccion.valor}`);
      } else if (masaAccion.tipo === 'seccion') {
        if (!masaAccion.valor) { toast('Elegí una sección', 'error'); return; }
        for (const id of ids) await api.updateProducto(id, { seccion_id: Number(masaAccion.valor) });
        toast(`${ids.length} productos movidos de sección`);
      } else if (masaAccion.tipo === 'visible') {
        for (const id of ids) await api.updateProducto(id, { visible: masaAccion.valor === 'true' });
        toast(`${ids.length} productos ${masaAccion.valor === 'true' ? 'activados' : 'ocultados'}`);
      } else if (masaAccion.tipo === 'borrar') {
        if (!confirm(`¿Eliminar ${ids.length} productos? No se puede deshacer.`)) return;
        for (const id of ids) await api.deleteProducto(id);
        toast(`${ids.length} productos eliminados`);
      } else { toast('Elegí una acción', 'warning'); return; }
      setShowMasa(false); setMasaAccion({ tipo: '', valor: '' }); load();
    } catch (e) { toast(e.message, 'error'); }
  };

  // Mueve a Cloudinary las fotos que todavía apuntan a rxz (arregla las rotas de depósito).
  const repararFotosRxz = async () => {
    if (reparandoFotos) return;
    setReparandoFotos(true);
    toast('Reparando fotos de depósito…');
    try {
      let totalMig = 0, vueltas = 0;
      while (vueltas < 300) {
        vueltas++;
        const r = await api.rehostFotosRxz(20);
        if (r.via_bot) {
          toast(r.restantes ? `${r.restantes} productos con fotos del proveedor. Las sube el bot solo después de cada ciclo (o mandale /reparar_fotos por Telegram).` : 'No hay fotos del proveedor pendientes', r.restantes ? 'warning' : 'success');
          break;
        }
        totalMig += r.migradas || 0;
        if ((r.migradas || 0) === 0 || (r.restantes || 0) === 0) {
          if ((r.restantes || 0) === 0 && totalMig > 0) toast(`Listo: ${totalMig} imágenes movidas a Cloudinary`);
          else if ((r.restantes || 0) === 0) toast('No había fotos de rxz para reparar');
          else if (totalMig === 0) toast(`No se pudo mover ninguna (Cloudinary no pudo bajarlas de rxz). Quedan ${r.restantes}.`, 'error');
          else toast(`Movidas ${totalMig}. Quedan ${r.restantes} que fallaron.`, 'warning');
          break;
        }
        toast(`Movidas ${totalMig}… quedan ${r.restantes}`);
      }
      load();
    } catch (e) { toast(e.message, 'error'); }
    setReparandoFotos(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3>Productos ({total})</h3>
        <div className="prod-toolbar">
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Nuevo</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowImport(true)}><Archive size={15} style={{ verticalAlign: '-2px' }} /> Importar</button>
          <div className="mas-wrap">
            <button className="btn btn-outline btn-sm" onClick={() => setMenuMas(v => !v)} aria-expanded={menuMas}>Más <ChevronDown size={14} /></button>
            {menuMas && <div className="mas-backdrop" onClick={() => setMenuMas(false)} />}
            {menuMas && <div className="mas-menu" onClick={() => setMenuMas(false)}>
          <button className="mas-item" onClick={async () => {
            if (!confirm('Generar código de barras a todos los productos de esta sección que no tengan uno. ¿Continuar?')) return;
            try { const r = await api.generarCodigos(adminSeccion); toast(`${r.generados} códigos generados`); load(); } catch (e) { toast(e.message, 'error'); }
          }}><Tag size={15} /> Generar códigos de barras</button>
          <button className="mas-item" onClick={() => setShowPriceAdj(true)}><DollarSign size={15} /> Ajustar precios en masa</button>
          <button className="mas-item" onClick={() => setShowHistory(true)}><History size={15} /> Historial de precios</button>
          {user?.es_owner && <button className="mas-item" onClick={repararFotosRxz} disabled={reparandoFotos} title="Mueve a Cloudinary las fotos que aún apuntan a rxz (arregla las rotas de depósito)"><RefreshCw size={15} /> {reparandoFotos ? 'Reparando fotos…' : 'Reparar fotos del depósito'}</button>}
            </div>}
          </div>
        </div>
      </div>
      <div className="prod-filtros">
        <select value={secFiltro} onChange={e => { setSecFiltro(e.target.value); setPagina(1); }} style={{ width: 200 }}>
          <option value="all">Todas las secciones</option>
          {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <input placeholder="Buscar por nombre o SKU..." value={busq} onChange={e => { setBusq(e.target.value); setPagina(1); }} />
        <select value={catFiltro} onChange={e => { setCatFiltro(e.target.value); setPagina(1); }} style={{ width: 180 }}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={stockFiltro} onChange={e => setStockFiltro(e.target.value)} style={{ width: 150 }}>
          <option value="todos">Todo el stock</option>
          <option value="con">Con stock</option>
          <option value="sin">Sin stock</option>
          <option value="bajo">Stock bajo mínimo</option>
        </select>
      </div>

      {/* Barra de acciones en masa (aparece con selección) */}
      {seleccion.size > 0 && (
        <div style={{ background: 'var(--primary-light)', border: '1.5px solid var(--primary)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13, color: 'var(--primary)' }}>{seleccion.size} seleccionado{seleccion.size !== 1 ? 's' : ''}</strong>
          <button className="btn btn-primary btn-sm" onClick={() => setShowMasa(true)}>Acciones en masa</button>
          <button className="btn btn-outline btn-sm" onClick={() => printEtiquetasMasa([...seleccion])}><Tag size={15} style={{ verticalAlign: '-2px' }} /> Imprimir etiquetas</button>
          <button className="btn btn-outline btn-sm" onClick={() => setSeleccion(new Set())}>Deseleccionar</button>
        </div>
      )}

      {/* Alerta de stock bajo */}
      {(() => {
        const bajos = productos.filter(p => p.stock_minimo > 0 && p.stock <= p.stock_minimo);
        if (!bajos.length) return null;
        return <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ico n="bell" s={16} /> {bajos.length} producto{bajos.length > 1 ? 's' : ''} con stock bajo el mínimo: {bajos.slice(0, 5).map(p => p.nombre || p.modelo).join(', ')}{bajos.length > 5 ? '...' : ''}
        </div>;
      })()}

      {/* Celular: productos en tarjetas (la tabla no entraba y se cortaban precio, stock y botones) */}
      <div className="prod-cards">
        {productosVista.length > 0 && (
          <label className="prod-cards-all"><input type="checkbox" checked={seleccion.size === productosVista.length} onChange={toggleAll} /> Seleccionar todos</label>
        )}
        {productosVista.map(p => {
          const secNombre = secciones.find(s => s.id === p.seccion_id)?.nombre || '';
          return (
            <div key={p.id} className={`prod-card${seleccion.has(p.id) ? ' sel' : ''}${p.visible === false ? ' oculto' : ''}`}>
              <div className="prod-card-top">
                <input type="checkbox" checked={seleccion.has(p.id)} onChange={() => toggleSel(p.id)} aria-label="Seleccionar" />
                {p.imagen ? <img src={imgOpt(p.imagen, 120)} alt="" loading="lazy" className="prod-card-img" /> : <div className="prod-card-img ph"><Package size={18} /></div>}
                <div className="prod-card-info" onClick={() => setEditProd(p)}>
                  <div className="prod-card-name">{p.nombre || p.modelo}{p.es_preventa && <span className="prod-tag">Preventa</span>}{p.pendiente_aprobacion && p.visible === false && <span className="prod-tag prod-tag-pend" title="Nuevo del proveedor: aprobalo desde el bot o activalo acá">Sin aprobar</span>}</div>
                  <div className="prod-card-meta">{[p.categoria, secFiltro === 'all' ? secNombre : '', p.sku && !String(p.sku).startsWith('RXZ-') ? p.sku : ''].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
              <div className="prod-card-fields">
                <label><span>Precio</span>{campoNum(p, 'precio_base', { label: 'Precio' })}</label>
                <label><span>Oferta</span>{campoNum(p, 'precio_oferta', { label: 'Oferta', placeholder: '—' })}</label>
                <label><span>Stock</span>{campoNum(p, 'stock', { label: 'Stock' })}</label>
              </div>
              <div className="prod-card-foot">
                <label className="prod-card-vis"><input type="checkbox" defaultChecked={p.visible !== false} onChange={e => inlineUpdate(p.id, 'visible', e.target.checked)} /> Visible</label>
                <div className="prod-card-acc">{accionesProd(p)}</div>
              </div>
              {expandVars === p.id && <div className="prod-card-vars"><VariantesQuickEdit productoId={p.id} onOpenFull={() => { setExpandVars(null); setEditProd(p); }} /></div>}
            </div>
          );
        })}
      </div>

      {/* Product table (compu) */}
      <div className="prod-table-wrap" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th style={{width:34}}><input type="checkbox" checked={productosVista.length > 0 && seleccion.size === productosVista.length} onChange={toggleAll} /></th><th style={{width:50}}>Img</th><th>Producto</th><th>Categoría</th>{secFiltro === 'all' && <th>Sección</th>}<th style={{width:112}}>Precio</th><th style={{width:112}}>Oferta</th><th style={{width:80}}>Stock</th><th style={{width:50}}><Eye size={14} /></th><th style={{width:150}}>Acc.</th></tr></thead>
          <tbody>
            {productosVista.map(p => {
              const secNombre = secciones.find(s => s.id === p.seccion_id)?.nombre || '';
              const colCount = secFiltro === 'all' ? 10 : 9;
              return (
              <Fragment key={p.id}>
              <tr style={{ opacity: p.visible === false ? 0.5 : 1, background: seleccion.has(p.id) ? 'var(--primary-light)' : undefined }}>
                <td><input type="checkbox" checked={seleccion.has(p.id)} onChange={() => toggleSel(p.id)} /></td>
                <td>{p.imagen ? <img src={imgOpt(p.imagen, 80)} alt="" loading="lazy" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : '—'}</td>
                <td><strong style={{ cursor: 'pointer' }} onClick={() => setEditProd(p)}>{p.nombre || p.modelo}</strong>{p.pendiente_aprobacion && p.visible === false && <span className="prod-tag prod-tag-pend" title="Nuevo del proveedor: aprobalo desde el bot o activalo acá">Sin aprobar</span>}{p.es_preventa && <span style={{ fontSize: 9, background: 'var(--accent)', color: '#fff', padding: '1px 5px', borderRadius: 3, fontWeight: 800, marginLeft: 6, verticalAlign: 'middle' }}>PREVENTA</span>}<br/><small style={{ color: 'var(--text-muted)' }}>{p.sku || ''}</small></td>
                <td>{p.categoria}</td>
                {secFiltro === 'all' && <td><span style={{ fontSize: 11, background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{secNombre}</span></td>}
                <td>{campoNum(p, 'precio_base', { label: 'Precio' })}</td>
                <td>{campoNum(p, 'precio_oferta', { label: 'Oferta', placeholder: '—' })}</td>
                <td>{campoNum(p, 'stock', { label: 'Stock' })}</td>
                <td><input type="checkbox" defaultChecked={p.visible !== false} onChange={e => inlineUpdate(p.id, 'visible', e.target.checked)} /></td>
                <td><div className="prod-acc-row">{accionesProd(p)}</div></td>
              </tr>
              {expandVars === p.id && (
                <tr><td colSpan={colCount} style={{ background: 'var(--bg)', padding: '0 12px' }}>
                  <VariantesQuickEdit productoId={p.id} onOpenFull={() => { setExpandVars(null); setEditProd(p); }} />
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
      {showMasa && (
        <div className="modal-overlay" onClick={() => setShowMasa(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header"><span className="modal-title">Acciones en masa ({seleccion.size})</span><button className="modal-close" onClick={() => setShowMasa(false)}>✕</button></div>
            <div className="modal-body">
              <label className="form-label">¿Qué querés hacer?</label>
              <select value={masaAccion.tipo} onChange={e => setMasaAccion({ tipo: e.target.value, valor: '' })} style={{ width: '100%', marginBottom: 12 }}>
                <option value="">Elegí una acción...</option>
                <option value="categoria">Cambiar categoría</option>
                <option value="seccion">Mover a otra sección</option>
                <option value="visible">Activar / Ocultar</option>
                <option value="borrar">Eliminar</option>
              </select>
              {masaAccion.tipo === 'categoria' && (
                <input list="cats-masa" value={masaAccion.valor} onChange={e => setMasaAccion({ ...masaAccion, valor: e.target.value })} placeholder="Categoría destino (podés escribir una nueva)" style={{ width: '100%', marginBottom: 12 }} />
              )}
              <datalist id="cats-masa">{categorias.map(c => <option key={c} value={c} />)}</datalist>
              {masaAccion.tipo === 'seccion' && (
                <select value={masaAccion.valor} onChange={e => setMasaAccion({ ...masaAccion, valor: e.target.value })} style={{ width: '100%', marginBottom: 12 }}>
                  <option value="">Elegí sección...</option>
                  {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              )}
              {masaAccion.tipo === 'visible' && (
                <select value={masaAccion.valor} onChange={e => setMasaAccion({ ...masaAccion, valor: e.target.value })} style={{ width: '100%', marginBottom: 12 }}>
                  <option value="">Elegí...</option>
                  <option value="true">Activar (mostrar)</option>
                  <option value="false">Ocultar</option>
                </select>
              )}
              {masaAccion.tipo === 'borrar' && <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}><AlertTriangle size={15} style={{ verticalAlign: '-2px' }} /> Se eliminarán {seleccion.size} productos. No se puede deshacer.</p>}
              <button className="btn btn-primary" onClick={aplicarMasa} style={{ width: '100%' }}>Aplicar a {seleccion.size} productos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GALERÍA DE FOTOS (presentacional) ───
// Subir varias, quitar y reordenar (arrastrando o con las flechas). La primera es la principal.
function GaleriaFotos({ items, uploading, onFiles, onRemove, onMove }) {
  const [dragOver, setDragOver] = useState(false);
  const dragIdx = useRef(null);
  const soltarArchivos = (e) => { const fl = e.dataTransfer && e.dataTransfer.files; if (fl && fl.length) onFiles(fl); };
  return (
    <div className={`gal-grid${dragOver ? ' drag' : ''}`}
      onDragOver={e => { e.preventDefault(); if (dragIdx.current == null) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); if (dragIdx.current == null) soltarArchivos(e); }}>
      {items.map((it, idx) => (
        <div key={it.key} className={`gal-item${idx === 0 ? ' principal' : ''}`} draggable
          onDragStart={() => { dragIdx.current = idx; }}
          onDragEnd={() => { dragIdx.current = null; }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); const from = dragIdx.current; dragIdx.current = null; if (from != null) { if (from !== idx) onMove(from, idx); } else soltarArchivos(e); }}>
          <img src={imgOpt(it.url, 240)} alt="" draggable={false} />
          {idx === 0 && <span className="gal-badge">Principal</span>}
          <button type="button" className="gal-del" onClick={() => onRemove(idx)} aria-label="Quitar foto" title="Quitar"><X size={13} /></button>
          <div className="gal-move">
            <button type="button" disabled={idx === 0} onClick={() => onMove(idx, idx - 1)} aria-label="Mover antes"><ChevronLeft size={14} /></button>
            <button type="button" disabled={idx === items.length - 1} onClick={() => onMove(idx, idx + 1)} aria-label="Mover después"><ChevronRight size={14} /></button>
          </div>
        </div>
      ))}
      <label className={`gal-add${uploading ? ' cargando' : ''}`}>
        {uploading ? <RefreshCw size={18} className="spin" /> : <ImagePlus size={20} />}
        <span>{uploading ? 'Subiendo…' : 'Agregar'}</span>
        <input type="file" accept="image/*" multiple disabled={uploading} onChange={e => { onFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
      </label>
    </div>
  );
}

const moverEnLista = (arr, from, to) => { const a = [...arr]; const [m] = a.splice(from, 1); a.splice(to, 0, m); return a; };

// Sube archivos EN SERIE (uno tras otro) para que queden en el orden elegido. Devuelve las URLs subidas.
async function subirFotosEnSerie(fileList, toast) {
  const files = Array.from(fileList || []).filter(f => f && f.type && f.type.startsWith('image/'));
  const urls = [];
  for (const file of files) {
    try { const r = await api.uploadImagen(file); if (r && r.url) urls.push(r.url); }
    catch { toast(`Error al subir ${file.name || 'una imagen'}`, 'error'); }
  }
  return urls;
}

// ─── MULTI IMAGE UPLOAD (producto ya creado: guarda directo en la base) ───
function MultiImageUpload({ productoId, imagenInicial }) {
  const { toast } = useContext(Ctx);
  const [imgs, setImgs] = useState([]);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        let arr = await api.getProductoImagenes(productoId);
        // Si la galería está vacía pero el producto ya tenía una foto principal (sistema viejo), la sembramos para no perderla
        if ((!arr || !arr.length) && imagenInicial) {
          try { await api.addProductoImagen(productoId, imagenInicial, 0); arr = await api.getProductoImagenes(productoId); } catch {}
        }
        setImgs(arr || []);
      } catch {}
    })();
  }, [productoId]);
  const uploadFiles = async (fileList) => {
    if (uploading) return;
    setUploading(true);
    const urls = await subirFotosEnSerie(fileList, toast);
    let orden = imgs.length;
    for (const u of urls) { try { await api.addProductoImagen(productoId, u, orden++); } catch (e) { toast(e.message, 'error'); } }
    try { setImgs(await api.getProductoImagenes(productoId)); } catch {}
    setUploading(false);
  };
  const remove = async (idx) => { const img = imgs[idx]; if (!img) return; try { await api.deleteProductoImagen(img.id); setImgs(imgs.filter(i => i.id !== img.id)); } catch (e) { toast(e.message, 'error'); } };
  const mover = async (from, to) => {
    if (to < 0 || to >= imgs.length) return;
    const arr = moverEnLista(imgs, from, to);
    setImgs(arr);
    try { await api.ordenarProductoImagenes(productoId, arr.map(i => i.id)); } catch { toast('No se pudo guardar el orden', 'error'); }
  };
  return (
    <div>
      <p className="form-hint" style={{ marginBottom: 8 }}>{imgs.length} {imgs.length === 1 ? 'foto' : 'fotos'}. Arrastrá varias juntas. Reordenalas arrastrando o con las flechas; la primera es la principal.</p>
      <GaleriaFotos items={imgs.map(i => ({ key: i.id, url: i.url }))} uploading={uploading} onFiles={uploadFiles} onRemove={remove} onMove={mover} />
    </div>
  );
}

// ─── ATRIBUTOS + VARIANTES COMBINADAS (modelo Empretienda) — controlado por ProductModal ───
function AtributosEditor({ value, onChange }) {
  const usa = !!value.usa_variantes;
  const atributos = value.atributos || [];
  const variantes = value.variantes || [];
  const upd = (patch) => onChange({ ...value, ...patch });
  const vVal = (v) => typeof v === 'string' ? v : (v?.valor || '');
  const vImg = (v) => (v && typeof v === 'object') ? (v.imagen || '') : '';

  const toggleUsa = (on) => {
    if (on && atributos.length === 0) upd({ usa_variantes: true, atributos: [{ nombre: '', valores: [{ valor: '', imagen: '' }] }] });
    else upd({ usa_variantes: on });
  };
  const setAtrNombre = (i, nom) => { const a = atributos.map((x, k) => k === i ? { ...x, nombre: nom } : x); upd({ atributos: a }); };
  const addAtr = () => upd({ atributos: [...atributos, { nombre: '', valores: [{ valor: '', imagen: '' }] }] });
  const removeAtr = (i) => upd({ atributos: atributos.filter((_, k) => k !== i) });
  const setVal = (ai, vi, val) => { const a = atributos.map((x, k) => k === ai ? { ...x, valores: (x.valores || []).map((v, j) => j === vi ? { valor: val, imagen: vImg(v) } : v) } : x); upd({ atributos: a }); };
  const setValImg = (ai, vi, url) => { const a = atributos.map((x, k) => k === ai ? { ...x, valores: (x.valores || []).map((v, j) => j === vi ? { valor: vVal(v), imagen: url } : v) } : x); upd({ atributos: a }); };
  const addVal = (ai) => { const a = atributos.map((x, k) => k === ai ? { ...x, valores: [...(x.valores || []), { valor: '', imagen: '' }] } : x); upd({ atributos: a }); };
  const removeVal = (ai, vi) => { const a = atributos.map((x, k) => k === ai ? { ...x, valores: (x.valores || []).filter((_, j) => j !== vi) } : x); upd({ atributos: a }); };

  const atrsLimpios = () => atributos
    .map(a => { const seen = new Set(); const valores = (a.valores || []).map(v => ({ valor: vVal(v).trim(), imagen: vImg(v) })).filter(x => x.valor && !seen.has(x.valor) && seen.add(x.valor)); return { nombre: (a.nombre || '').trim(), valores }; })
    .filter(a => a.nombre && a.valores.length);
  const keyOf = (atrs, comb) => atrs.map(a => a.nombre + '=' + (comb[a.nombre] || '')).join('|');

  const generar = () => {
    const atrs = atrsLimpios();
    if (!atrs.length) { onChange({ ...value, variantes: [] }); return; }
    let combos = [{}];
    for (const a of atrs) { const next = []; for (const c of combos) for (const v of a.valores) next.push({ ...c, [a.nombre]: v.valor }); combos = next; }
    const prev = {}; for (const v of variantes) prev[keyOf(atrs, v.combinacion || {})] = v;
    const nuevas = combos.map(comb => { const ex = prev[keyOf(atrs, comb)]; return ex ? { ...ex, combinacion: comb } : { combinacion: comb, precio: 0, precio_oferta: 0, stock: 0, moneda: 'ARS' }; });
    onChange({ ...value, variantes: nuevas });
  };
  const setVarField = (i, field, val) => { const vs = variantes.map((x, k) => k === i ? { ...x, [field]: val } : x); upd({ variantes: vs }); };
  const nombresAtr = atrsLimpios().map(a => a.nombre);
  const totalCombos = atrsLimpios().reduce((n, a) => n * a.valores.length, 1);
  const desincronizado = usa && atrsLimpios().length > 0 && variantes.length !== totalCombos;

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={usa} onChange={e => toggleUsa(e.target.checked)} /> Este producto usa variantes (atributos combinados)
      </label>
      {usa && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Cargá los atributos (ej: <b>Método de Pago</b>, <b>Licencia</b>, <b>Color</b>) con sus valores. Tocá el ícono de cámara en un valor para darle una <b>foto</b> (ej: por color: al elegirlo, cambia la imagen en la tienda). Después tocá <b>Generar combinaciones</b> y poné precio/stock a cada fila. Con variantes activas, el <b>precio base y stock del producto se ignoran</b>.</p>
          {atributos.map((a, ai) => (
            <div key={ai} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <input value={a.nombre} onChange={e => setAtrNombre(ai, e.target.value)} placeholder="Nombre del atributo (ej: Método de Pago)" style={{ flex: 1, fontWeight: 600 }} />
                <button type="button" onClick={() => removeAtr(ai)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 15 }} title="Quitar atributo">✕</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {(a.valores || []).map((v, vi) => (
                  <span key={vi} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--bg)', borderRadius: 6, padding: '2px 4px' }}>
                    {vImg(v) ? <img src={vImg(v)} alt="" style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)' }} /> : null}
                    <input value={vVal(v)} onChange={e => setVal(ai, vi, e.target.value)} placeholder="valor" style={{ width: 100, fontSize: 13 }} />
                    <label title="Foto de esta opción" style={{ cursor: 'pointer', fontSize: 14 }}>{vImg(v) ? 'Cambiar foto' : '+ Foto'}<input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; try { const r = await api.uploadImagen(file); setValImg(ai, vi, r.url); } catch (err) {} }} /></label>
                    {vImg(v) && <button type="button" onClick={() => setValImg(ai, vi, '')} title="Quitar foto" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>✕foto</button>}
                    <button type="button" onClick={() => removeVal(ai, vi)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Quitar valor">✕</button>
                  </span>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => addVal(ai)}>+ valor</button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={addAtr}>+ Agregar atributo</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={generar} disabled={!atrsLimpios().length}>Generar combinaciones {totalCombos > 1 ? `(${totalCombos})` : ''}</button>
          </div>
          {desincronizado && <p style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 8 }}><AlertTriangle size={15} style={{ verticalAlign: '-2px' }} /> Cambiaste los atributos. Tocá <b>Generar combinaciones</b> para actualizar la tabla (se conservan los precios ya cargados).</p>}
          {variantes.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead><tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  {nombresAtr.map(n => <th key={n} style={{ padding: '4px 6px' }}>{n}</th>)}
                  <th style={{ padding: '4px 6px' }}>Stock</th><th style={{ padding: '4px 6px' }}>Precio</th><th style={{ padding: '4px 6px' }}>Precio oferta</th><th style={{ padding: '4px 6px' }}>Moneda</th>
                </tr></thead>
                <tbody>
                  {variantes.map((v, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      {nombresAtr.map(n => <td key={n} style={{ padding: '4px 6px', fontWeight: 600 }}>{(v.combinacion || {})[n] || '—'}</td>)}
                      <td style={{ padding: '4px 6px' }}><input type="number" value={v.stock ?? 0} onChange={e => setVarField(i, 'stock', Number(e.target.value))} style={{ width: 70 }} /></td>
                      <td style={{ padding: '4px 6px' }}><input type="number" value={v.precio || ''} onChange={e => setVarField(i, 'precio', Number(e.target.value))} placeholder="0" style={{ width: 90 }} /></td>
                      <td style={{ padding: '4px 6px' }}><input type="number" value={v.precio_oferta || ''} onChange={e => setVarField(i, 'precio_oferta', Number(e.target.value))} placeholder="0" style={{ width: 90 }} /></td>
                      <td style={{ padding: '4px 6px' }}><select value={v.moneda || 'ARS'} onChange={e => setVarField(i, 'moneda', e.target.value)} style={{ width: 80 }}><option value="ARS">ARS $</option><option value="USDT">USDT</option><option value="USD">USD</option></select></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EDICIÓN RÁPIDA DE VARIANTES desde la lista de productos (reusa variantes-full) ───
function VariantesQuickEdit({ productoId, onOpenFull }) {
  const { toast } = useContext(Ctx);
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    api.getVariantesFull(productoId).then(d => setData({
      usa_variantes: !!d.usa_variantes,
      atributos: d.atributos || [],
      variantes: (d.variantes || []).map(v => ({ ...v, combinacion: typeof v.combinacion === 'string' ? (() => { try { return JSON.parse(v.combinacion); } catch { return {}; } })() : (v.combinacion || {}) }))
    })).catch(() => setData({ usa_variantes: false, atributos: [], variantes: [] }));
  }, [productoId]);
  if (!data) return <div style={{ padding: 10, fontSize: 13, color: 'var(--text-muted)' }}>Cargando…</div>;
  const nombresAtr = (data.atributos || []).map(a => a.nombre);
  if (!data.usa_variantes || !data.variantes.length)
    return <div style={{ padding: 10, fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}><span>Este producto no tiene variantes cargadas.</span>{onOpenFull && <button className="btn btn-outline btn-sm" onClick={onOpenFull}>Abrir editor del producto</button>}</div>;
  const setField = (i, fld, val) => { setData(d => ({ ...d, variantes: d.variantes.map((v, k) => k === i ? { ...v, [fld]: val } : v) })); setDirty(true); };
  const guardar = async () => {
    setSaving(true);
    try {
      await api.saveVariantesFull(productoId, {
        usa_variantes: true,
        atributos: (data.atributos || []).map(a => ({ nombre: a.nombre, valores: a.valores || [] })),
        variantes: data.variantes
      });
      toast('Variantes actualizadas'); setDirty(false);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };
  return (
    <div style={{ padding: '10px 4px' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
            {nombresAtr.map(n => <th key={n} style={{ padding: '4px 6px' }}>{n}</th>)}
            <th style={{ padding: '4px 6px' }}>Stock</th><th style={{ padding: '4px 6px' }}>Precio</th><th style={{ padding: '4px 6px' }}>Oferta</th><th style={{ padding: '4px 6px' }}>Moneda</th>
          </tr></thead>
          <tbody>
            {data.variantes.map((v, i) => (
              <tr key={v.id || i} style={{ borderTop: '1px solid var(--border)' }}>
                {nombresAtr.map(n => <td key={n} style={{ padding: '4px 6px', fontWeight: 600 }}>{(v.combinacion || {})[n] || '—'}</td>)}
                <td style={{ padding: '4px 6px' }}><input type="number" value={v.stock ?? 0} onChange={e => setField(i, 'stock', Number(e.target.value))} style={{ width: 70 }} /></td>
                <td style={{ padding: '4px 6px' }}><input type="number" value={v.precio || ''} onChange={e => setField(i, 'precio', Number(e.target.value))} style={{ width: 90 }} /></td>
                <td style={{ padding: '4px 6px' }}><input type="number" value={v.precio_oferta || ''} onChange={e => setField(i, 'precio_oferta', Number(e.target.value))} style={{ width: 90 }} /></td>
                <td style={{ padding: '4px 6px' }}><select value={v.moneda || 'ARS'} onChange={e => setField(i, 'moneda', e.target.value)} style={{ width: 80 }}><option value="ARS">ARS $</option><option value="USDT">USDT</option><option value="USD">USD</option></select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={guardar} disabled={saving || !dirty}>{saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios'}</button>
        {onOpenFull && <button className="btn btn-outline btn-sm" onClick={onOpenFull}>Editar atributos / agregar combinaciones</button>}
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
// Imprime una etiqueta con el código de barras del producto
function printEtiqueta(prod, opts = {}) {
  const conPrecio = opts.conPrecio || false;
  const codigo = prod.codigo_barras || ('P' + String(prod.id).padStart(6, '0'));
  const nombre = escHtml(prod.nombre || prod.modelo || '');
  const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(codigo)}&code=Code128&dpi=96&dataseparator=`;
  const html = `<div style="border:1px solid #000;padding:10px;display:inline-block;margin:6px;text-align:center;page-break-inside:avoid">
      <div style="font-size:13px;font-weight:bold;margin-bottom:6px;max-width:280px">${nombre}</div>
      <img src="${escHtml(barcodeUrl)}" style="max-width:280px;display:block;margin:0 auto">
      <div data-respaldo="1" style="display:none;font-family:monospace;font-size:20px;letter-spacing:2px">*${escHtml(codigo)}*</div>
      <div style="font-size:14px;font-family:monospace;margin-top:4px">${escHtml(codigo)}</div>
      ${conPrecio ? `<div style="font-size:12px;color:#333;margin-top:4px">${fmtARS(prod.precio_base)}</div>` : ''}
    </div>`;
  const w = window.open('', '', 'width=500,height=400');
  if (!w) { window.alert('El navegador bloqueó la ventana de impresión. Permití los pop-ups para este sitio.'); return; }
  w.document.write(`<html><head><title>Etiqueta ${escHtml(codigo)}</title></head>
    <body style="font-family:sans-serif;margin:0;padding:10px">${html}
    </body></html>`);
  w.document.close();
  imprimirCuandoCargue(w, { espera: 300, maximo: 2500 });
}

function ProductModal({ product, onClose }) {
  const { secciones, adminSeccion, toast, listas, preciosFijos, setPreciosFijos } = useContext(Ctx);
  const isEdit = !!product;
  const [createdId, setCreatedId] = useState(null);
  const yaCreado = isEdit || !!createdId;        // ya existe en la base (editar, o recién creado)
  const idActual = product?.id || createdId;
  const [reservadoReal, setReservadoReal] = useState(null);
  useEffect(() => { if (isEdit && product?.es_preventa && product?.id) api.getReservadoReal(product.id).then(r => setReservadoReal(r.reservado)).catch(() => {}); }, [product?.id]);
  // Los números llegan de la base como texto ("67902.00"): se muestran limpios (67902)
  const numsLimpios = (x) => { const o = { ...x }; for (const k of ['precio_base', 'precio_oferta', 'precio_original', 'stock', 'stock_minimo', 'peso', 'alto', 'ancho', 'largo', 'preventa_precio', 'preventa_descuento_pct', 'preventa_cupo']) if (o[k] !== undefined && o[k] !== null && o[k] !== '') o[k] = Number(o[k]); return o; };
  const [f, setF] = useState(product ? numsLimpios(product) : {
    seccion_id: adminSeccion !== 'all' ? Number(adminSeccion) : secciones[0]?.id,
    categoria: '', modelo: '', nombre: '', precio_base: 0, precio_original: 0, stock: 0, stock_minimo: 0,
    imagen: '', descripcion: '', sku: '', codigo_barras: '', tipo: 'fisico', moneda: 'ARS', precio_oferta: 0,
    envio_gratis: false, visible: true, notas: '', compatibilidad: '', marca: '',
    es_preventa: false, preventa_precio: 0, preventa_fecha: '', preventa_mostrar_fecha: false, preventa_descuento_pct: 0, preventa_cupo: 0,
    peso: 0, alto: 0, ancho: 0, largo: 0
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Atributos + variantes combinadas (controlado). combinacion viene como objeto (JSONB)
  const [varData, setVarData] = useState({ usa_variantes: !!product?.usa_variantes, atributos: [], variantes: [] });
  useEffect(() => {
    if (isEdit && product?.id) api.getVariantesFull(product.id)
      .then(d => setVarData({ usa_variantes: !!d.usa_variantes, atributos: d.atributos || [], variantes: (d.variantes || []).map(v => ({ ...v, combinacion: typeof v.combinacion === 'string' ? (() => { try { return JSON.parse(v.combinacion); } catch { return {}; } })() : (v.combinacion || {}) })) }))
      .catch(() => {});
  }, [product?.id]);
  // Precios fijos por lista
  const [fp, setFp] = useState(() => {
    if (!product) return {};
    const o = {}; preciosFijos.filter(x => x.producto_id === product.id).forEach(x => { o[x.lista_precio_id] = x.precio_fijo; }); return o;
  });

  // Fotos elegidas ANTES de crear el producto: se suben a Cloudinary y se guardan en la galería al crear.
  const [fotosNuevas, setFotosNuevas] = useState([]);
  const [urlFoto, setUrlFoto] = useState('');
  const subirNuevas = async (files) => {
    if (uploading) return;
    setUploading(true);
    const urls = await subirFotosEnSerie(files, toast);
    setFotosNuevas(prev => [...prev, ...urls.filter(u => !prev.includes(u))]);
    setUploading(false);
  };
  const agregarUrlFoto = () => {
    const u = urlFoto.trim();
    if (!/^https?:\/\//i.test(u)) { toast('Pegá una URL que empiece con http', 'warning'); return; }
    setFotosNuevas(prev => prev.includes(u) ? prev : [...prev, u]); setUrlFoto('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...f, usa_variantes: !!varData.usa_variantes };
      if (!yaCreado && fotosNuevas.length) payload.imagen = fotosNuevas[0];
      let prodId = idActual;
      if (yaCreado) {
        await api.updateProducto(idActual, payload);
        for (const [listaId, precio] of Object.entries(fp)) {
          await api.setPrecioFijo(idActual, listaId, Number(precio) || 0);
        }
        const pf = await api.getPreciosFijos().catch(() => []);
        setPreciosFijos(Array.isArray(pf) ? pf : []);
      } else {
        const creado = await api.createProducto(payload);
        prodId = creado?.id;
        if (prodId) for (let i = 0; i < fotosNuevas.length; i++) await api.addProductoImagen(prodId, fotosNuevas[i], i).catch(() => {});
      }
      // Guardar atributos + variantes combinadas (aplica al crear y al editar → misma plantilla)
      if (prodId) {
        await api.saveVariantesFull(prodId, {
          usa_variantes: !!varData.usa_variantes,
          atributos: (varData.atributos || []).map(a => { const seen = new Set(); const valores = (a.valores || []).map(v => typeof v === 'string' ? { valor: v.trim(), imagen: '' } : { valor: (v.valor || '').trim(), imagen: v.imagen || '' }).filter(x => x.valor && !seen.has(x.valor) && seen.add(x.valor)); return { nombre: (a.nombre || '').trim(), valores }; }).filter(a => a.nombre && a.valores.length),
          variantes: varData.usa_variantes ? (varData.variantes || []) : []
        }).catch(e => toast('Producto guardado, pero falló guardar variantes: ' + e.message, 'error'));
      }
      if (yaCreado) {
        toast('Producto actualizado');
        onClose();
      } else {
        // Recién creado: NO cerramos, pasamos a modo edición para cargar la galería de fotos
        setCreatedId(prodId);
        setF({ ...f, id: prodId, imagen: payload.imagen || f.imagen });
        toast(fotosNuevas.length ? `Producto creado con ${fotosNuevas.length} ${fotosNuevas.length === 1 ? 'foto' : 'fotos'}` : 'Producto creado. Ya podés sumarle fotos.');
      }
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl pm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">{yaCreado ? 'Editar producto' : 'Nuevo producto'}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body pm-body">
          <div className="pm-grid">
            <div className="pm-col">
              <section className="pm-card">
                <h4 className="pm-title">Datos y precio</h4>
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
                  <div className="form-group"><label className="form-label">Código de barras (para escanear en ventas)</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={f.codigo_barras || ''} onChange={e => setF({ ...f, codigo_barras: e.target.value })} placeholder="Se genera solo al guardar" style={{ flex: 1 }} />
                      {isEdit && f.id && <button type="button" className="btn btn-outline btn-sm" onClick={() => printEtiqueta(f, { conPrecio: window.confirm('¿Incluir el precio en la etiqueta?\n\n(Aceptar = con precio, Cancelar = sin precio)') })}><Tag size={15} style={{ verticalAlign: '-2px' }} /> Imprimir etiqueta</button>}
                    </div>
                    <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Si lo dejás vacío, el sistema le asigna un código único (P + número). Podés imprimir la etiqueta y pegarla al producto.</small>
                  </div>
                  <div className="form-group"><label className="form-label">Marca</label><input value={f.marca || ''} onChange={e => setF({ ...f, marca: e.target.value })} placeholder="Ej: Samsung, Bosch" /></div>
                  <div className="form-group"><label className="form-label">Tipo</label>
                    <select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}><option value="fisico">Físico</option><option value="digital">Digital</option></select></div>
                  <div className="form-group"><label className="form-label">Moneda</label>
                    <select value={f.moneda} onChange={e => setF({ ...f, moneda: e.target.value })}><option value="ARS">ARS</option><option value="USD">USD</option><option value="USDT">USDT</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Precio base *{varData.usa_variantes && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> — lo maneja cada variante</span>}</label><input type="number" disabled={varData.usa_variantes} style={varData.usa_variantes ? { opacity: .5 } : undefined} value={f.precio_base === 0 && f._priceCleared ? '' : f.precio_base} onFocus={e => { if (Number(e.target.value) === 0) { setF({ ...f, precio_base: '', _priceCleared: true }); } }} onChange={e => setF({ ...f, precio_base: e.target.value === '' ? '' : Number(e.target.value), _priceCleared: e.target.value === '' })} onBlur={e => setF({ ...f, precio_base: Number(e.target.value) || 0, _priceCleared: false })} /></div>
                  <div className="form-group"><label className="form-label">Precio oferta</label><input type="number" disabled={varData.usa_variantes} style={varData.usa_variantes ? { opacity: .5 } : undefined} value={f.precio_oferta || ''} onChange={e => setF({ ...f, precio_oferta: e.target.value === '' ? '' : Number(e.target.value) })} onBlur={e => setF({ ...f, precio_oferta: Number(e.target.value) || 0 })} placeholder="0 = sin oferta" /></div>
                  <div className="form-group"><label className="form-label">Precio de costo (lo que te sale)</label><input type="number" value={f.precio_original || ''} onChange={e => setF({ ...f, precio_original: e.target.value === '' ? '' : Number(e.target.value) })} onBlur={e => setF({ ...f, precio_original: Number(e.target.value) || 0 })} placeholder="Para calcular ganancia" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Stock *{varData.usa_variantes && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> — lo maneja cada variante</span>}</label><input type="number" disabled={varData.usa_variantes} style={varData.usa_variantes ? { opacity: .5 } : undefined} value={f.stock} onChange={e => setF({ ...f, stock: Number(e.target.value) })} /></div>
                  <div className="form-group"><label className="form-label">Stock mínimo</label><input type="number" disabled={varData.usa_variantes} style={varData.usa_variantes ? { opacity: .5 } : undefined} value={f.stock_minimo} onChange={e => setF({ ...f, stock_minimo: Number(e.target.value) })} /></div>
                </div>
                {/* Stock options */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '8px 0 12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.permitir_sin_stock || false} onChange={e => setF({ ...f, permitir_sin_stock: e.target.checked })} /> Permitir compra sin stock</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.es_digital || false} onChange={e => setF({ ...f, es_digital: e.target.checked })} /> Es digital (sin envío)</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.envio_gratis || false} onChange={e => setF({ ...f, envio_gratis: e.target.checked })} /> Envío gratis</label>
                </div>
              </section>
              <section className="pm-card">
                <h4 className="pm-title">Descripción</h4>
                <div className="form-group"><label className="form-label">Descripción</label><textarea value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} rows={3} /></div>
                <div className="form-group"><label className="form-label">Notas internas</label><textarea value={f.notas} onChange={e => setF({ ...f, notas: e.target.value })} rows={2} /></div>
                <div className="form-group"><label className="form-label">Compatibilidad</label><input value={f.compatibilidad} onChange={e => setF({ ...f, compatibilidad: e.target.value })} /></div>
              </section>
              <section className="pm-card">
              {/* Atributos + variantes combinadas (mismo editor al crear y al editar) */}
              <AtributosEditor value={varData} onChange={setVarData} />
              </section>
            </div>
            <div className="pm-col">
              <section className="pm-card">
                <h4 className="pm-title">Fotos</h4>
              {/* Antes de crear: se eligen todas las fotos acá; al crear quedan en la galería. */}
              {!yaCreado && (
                <div>
                  <p className="form-hint" style={{ marginBottom: 8 }}>Subí todas las fotos juntas (podés arrastrarlas). La primera es la principal.</p>
                  <GaleriaFotos items={fotosNuevas.map(u => ({ key: u, url: u }))} uploading={uploading} onFiles={subirNuevas}
                    onRemove={idx => setFotosNuevas(fotosNuevas.filter((_, i) => i !== idx))}
                    onMove={(a, b) => { if (b >= 0 && b < fotosNuevas.length) setFotosNuevas(moverEnLista(fotosNuevas, a, b)); }} />
                  <div className="gal-url">
                    <input value={urlFoto} onChange={e => setUrlFoto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarUrlFoto(); } }} placeholder="O pegá la URL de una imagen" />
                    <button type="button" className="btn btn-outline btn-sm" onClick={agregarUrlFoto}>Agregar</button>
                  </div>
                </div>
              )}
              {/* Galería de varias fotos: en edición y también apenas se crea el producto */}
              {yaCreado && <MultiImageUpload productoId={idActual} imagenInicial={product?.imagen || f.imagen} />}
              </section>
              <section className="pm-card">
                <h4 className="pm-title">Publicación</h4>
              <label className="pm-check"><input type="checkbox" checked={f.visible !== false} onChange={e => setF({ ...f, visible: e.target.checked })} /> Visible en la tienda</label>
              </section>
              {f.tipo === 'fisico' && <section className="pm-card">
                <h4 className="pm-title">Envío (peso y medidas)</h4>
              {f.tipo === 'fisico' && (
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Peso (kg)</label><input type="number" value={f.peso || ''} onChange={e => setF({ ...f, peso: Number(e.target.value) })} /></div>
                  <div className="form-group"><label className="form-label">Alto (cm)</label><input type="number" value={f.alto || ''} onChange={e => setF({ ...f, alto: Number(e.target.value) })} /></div>
                  <div className="form-group"><label className="form-label">Ancho (cm)</label><input type="number" value={f.ancho || ''} onChange={e => setF({ ...f, ancho: Number(e.target.value) })} /></div>
                  <div className="form-group"><label className="form-label">Largo (cm)</label><input type="number" value={f.largo || ''} onChange={e => setF({ ...f, largo: Number(e.target.value) })} /></div>
                </div>
              )}
                <small className="form-hint">Se usan para cotizar el envío con el correo. Peso en kilos (100 g = 0,1).</small>
              </section>}
            {/* ── PREVENTA / próximo ingreso ── */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, margin: '12px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={f.es_preventa || false} onChange={e => setF({ ...f, es_preventa: e.target.checked })} /> <Clock size={14} style={{ verticalAlign: '-2px' }} /> Producto en preventa / próximo a ingresar
              </label>
              {f.es_preventa && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>El cliente puede reservar pagando la seña/precio de preventa por adelantado. Si no le ponés precio de preventa, se muestra como próximo ingreso al precio normal.</p>
                  <div className="form-group"><label className="form-label">% de descuento por reservar (0 = sin descuento, precio normal)</label><input type="number" min="0" max="99" value={f.preventa_descuento_pct || ''} onChange={e => setF({ ...f, preventa_descuento_pct: Number(e.target.value) || 0 })} placeholder="Ej: 15" /></div>
                  <div className="form-group"><label className="form-label">Stock de preventa (cuántas unidades van a llegar, 0 = sin límite)</label><input type="number" min="0" value={f.preventa_cupo || ''} onChange={e => setF({ ...f, preventa_cupo: Number(e.target.value) || 0 })} placeholder="Ej: 10" />{f.es_preventa && Number(f.preventa_reservado) > 0 && <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Ya reservaron: {f.preventa_reservado} de {f.preventa_cupo || '∞'}</small>}</div>
                  {Number(f.preventa_descuento_pct) > 0 && Number(f.precio_base) > 0 && (
                    <div style={{ fontSize: 13, background: 'var(--bg-hover, rgba(0,0,0,0.04))', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                      El cliente verá: <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{fmtARS(f.precio_base)}</span> {' '}
                      <b style={{ color: 'var(--success)' }}>{fmtARS(Math.round(Number(f.precio_base) * (1 - Number(f.preventa_descuento_pct) / 100)))}</b> {' '}
                      <span style={{ background: 'var(--danger)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>-{f.preventa_descuento_pct}%</span>
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}><input type="checkbox" checked={f.preventa_mostrar_fecha || false} onChange={e => setF({ ...f, preventa_mostrar_fecha: e.target.checked })} /> Mostrar fecha estimada de ingreso al cliente</label>
                  {f.preventa_mostrar_fecha && (
                    <div className="form-group"><label className="form-label">Fecha estimada de ingreso</label><input type="date" value={f.preventa_fecha ? String(f.preventa_fecha).slice(0, 10) : ''} onChange={e => setF({ ...f, preventa_fecha: e.target.value })} /></div>
                  )}
                  {isEdit && f.es_preventa && (
                    <div style={{ marginTop: 10, padding: 10, background: 'var(--success)', borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: '#fff', marginBottom: 8 }}>Cuando llegue la mercadería, tocá el botón: las unidades pasan al stock físico y se descuentan las {reservadoReal !== null ? reservadoReal : (f.preventa_reservado || 0)} ya reservadas (según los pedidos reales).</p>
                      <button type="button" className="btn btn-sm" style={{ width: '100%', background: '#fff', color: 'var(--success)', fontWeight: 800 }} onClick={async () => {
                        const resv = reservadoReal !== null ? reservadoReal : (f.preventa_reservado || 0);
                        if (!confirm(`¿Recibiste la preventa de "${f.nombre || f.modelo}"?\n\nCupo de preventa: ${f.preventa_cupo || 0}\nYa reservadas (pedidos reales): ${resv}\n\nSe sumarán al stock físico las que sobran (cupo menos reservadas) y se desactivará la preventa.`)) return;
                        try { const r = await api.recibirPreventa(f.id); toast(`Recibido: +${r.sumado_a_stock} al stock físico, ${r.reservas_tomadas} ya reservadas`); onClose(); } catch (e) { toast(e.message, 'error'); }
                      }}><Package size={15} style={{ verticalAlign: '-2px' }} /> Recibí la preventa</button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>{yaCreado && createdId ? 'Cerrar' : 'Cancelar'}</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : (yaCreado ? 'Guardar' : 'Crear producto')}</button>
        </div>
      </div>
    </div>
  );
}

// ─── IMPORT MODAL ───
// Formatos: exportación de Empretienda / Tienda Negocio, o la lista cruda del proveedor (PRODUCTO / MODELO / PRECIO).
// En la lista del proveedor el precio del Excel queda como costo y se le suma el % de ganancia elegido.
const hashCorto = (txt) => { let h = 5381; const t = String(txt); for (let k = 0; k < t.length; k++) h = ((h << 5) + h + t.charCodeAt(k)) >>> 0; return h.toString(36).toUpperCase(); };

const txtCelda = (v) => (v === undefined || v === null) ? '' : String(v).replace(/\s+/g, ' ').trim();

const numCelda = (v) => { if (typeof v === 'number') return v; const t = String(v ?? '').replace(/[^\d.,-]/g, ''); if (!t) return 0; const norm = t.includes(',') && t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, ''); return Number(norm) || 0; };

const redondearA = (v, paso) => paso > 0 ? Math.round(v / paso) * paso : Math.round(v);

function ImportModal({ onClose }) {
  const { secciones, adminSeccion, toast } = useContext(Ctx);
  const [data, setData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [result, setResult] = useState(null);
  const [modo, setModo] = useState('crear_actualizar');
  const [faltantes, setFaltantes] = useState('no_tocar');
  const [importSecId, setImportSecId] = useState(adminSeccion !== 'all' ? Number(adminSeccion) : secciones[0]?.id);
  const clavePct = `gm_import_pct_${importSecId}`;
  const [pct, setPct] = useState('');
  const [paso, setPaso] = useState(() => { try { return Number(localStorage.getItem('gm_import_redondeo')) || 0; } catch { return 0; } });
  useEffect(() => { try { setPct(localStorage.getItem(clavePct) || ''); } catch {} }, [clavePct]);

  const parseFile = async (f) => {
    setResult(null);
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!json.length) { toast('Archivo vacío', 'warning'); return; }
        const keys = Object.keys(json[0]);
        const key = (re) => keys.find(k => re.test(String(k).trim()));
        const pick = (r, re) => { const k = key(re); return k !== undefined ? r[k] : undefined; };
        const kProd = key(/^producto$/i), kModelo = key(/^modelo$/i), kPrecio = key(/^precio$/i);
        const esProveedor = !!(kProd && kModelo && kPrecio) && !key(/^nombre/i);
        const kStock = key(/^stock$/i);
        const parseCat = (raw) => {
          const t = txtCelda(raw);
          if (!t || t.toLowerCase() === 'none' || t === '-') return 'Sin categoría';
          const partes = t.split('>').map(x => x.trim()).filter(Boolean);
          return partes.length ? partes[partes.length - 1] : 'Sin categoría';
        };
        const vistos = new Set();
        const prods = [];
        json.forEach((r, idx) => {
          if (esProveedor) {
            const cat = txtCelda(r[kProd]); const mod = txtCelda(r[kModelo]); const costo = numCelda(r[kPrecio]);
            if (!cat && !mod) return;
            const nombre = [cat, mod].filter(Boolean).join(' ');
            const sku = 'L-' + hashCorto((cat + '|' + mod).toLowerCase());
            if (vistos.has(sku)) return; // fila repetida en el Excel (mismo producto y modelo)
            vistos.add(sku);
            prods.push({ categoria: cat || 'Sin categoría', modelo: mod, nombre, compatibilidad: mod, costo, sku, stock: kStock ? Math.trunc(numCelda(r[kStock])) : null, permitir_sin_stock: kStock ? undefined : true, posicion: idx + 1 });
          } else {
            const nombre = txtCelda(pick(r, /^nombre del producto$|^nombre$|modelo|model/i));
            if (!nombre) return;
            const precio = numCelda(pick(r, /^precio$|price/i));
            const oferta = numCelda(pick(r, /oferta|precio oferta/i));
            prods.push({
              categoria: parseCat(pick(r, /categor|subcategor/i)), modelo: nombre, nombre,
              costo: precio, oferta: oferta < precio ? oferta : 0,
              stock: kStock ? Math.trunc(numCelda(pick(r, /^stock$/i))) : null,
              sku: txtCelda(pick(r, /^sku$|codigo|código/i)),
              descripcion: txtCelda(pick(r, /descrip/i)),
              peso: numCelda(pick(r, /peso|weight|kg/i)), alto: numCelda(pick(r, /alto|height/i)), ancho: numCelda(pick(r, /ancho|width/i)), largo: numCelda(pick(r, /profund|largo|length/i)),
              posicion: idx + 1,
            });
          }
        });
        const cats = [...new Set(prods.map(p => p.categoria))];
        setData({ productos: prods, total: prods.length, conSku: prods.filter(p => p.sku).length, esProveedor, categorias: cats.length, nombreArchivo: f.name });
      } catch (err) { toast('No pude leer el archivo: ' + err.message, 'error'); }
    };
    reader.readAsArrayBuffer(f);
  };

  const pctN = Math.max(0, Number(pct) || 0);
  // Precio final que se carga: costo + % (redondeado). En la lista del proveedor el costo queda guardado para ver la ganancia.
  const preparar = (p) => {
    const venta = redondearA(p.costo * (1 + pctN / 100), paso);
    const conCosto = data && (data.esProveedor || pctN > 0);
    const out = { ...p, seccion_id: importSecId, precio_base: venta, precio_oferta: p.oferta ? redondearA(p.oferta * (1 + pctN / 100), paso) : 0, precio_original: conCosto ? p.costo : 0 };
    delete out.costo; delete out.oferta;
    return out;
  };

  const doUpload = async () => {
    if (!data?.productos?.length || uploading) return;
    if (modo === 'reemplazar' && !confirm(`Se van a BORRAR todos los productos de "${secciones.find(s => s.id === importSecId)?.nombre}" y cargar estos ${data.total}. Los pedidos viejos no se tocan. ¿Seguimos?`)) return;
    const borraFaltantes = faltantes === 'borrar' && modo !== 'reemplazar' && modo !== 'solo_categorias';
    if (borraFaltantes && !confirm(`Los productos de "${secciones.find(s => s.id === importSecId)?.nombre}" que NO están en este Excel se van a BORRAR. Los pedidos viejos no se tocan. ¿Seguimos?`)) return;
    try { localStorage.setItem(clavePct, String(pct)); localStorage.setItem('gm_import_redondeo', String(paso)); } catch {}
    setUploading(true); setResult(null);
    const LOTE = 250; const lista = data.productos.map(preparar);
    const tot = { insertados: 0, actualizados: 0, saltados: 0, errores: 0, primer_error: '', marcados: 0 };
    try {
      for (let k = 0; k < lista.length; k += LOTE) {
        setProgreso({ hecho: k, total: lista.length });
        const modoLote = modo === 'reemplazar' ? (k === 0 ? 'reemplazar' : 'insertar') : modo;
        const r = await api.bulkProductos(lista.slice(k, k + LOTE), { modo: modoLote, seccion_id: importSecId });
        tot.insertados += r.insertados || 0; tot.actualizados += r.actualizados || 0; tot.saltados += r.saltados || 0; tot.errores += r.errores || 0;
        if (!tot.primer_error && r.primer_error) tot.primer_error = r.primer_error;
      }
      if (faltantes !== 'no_tocar' && modo !== 'reemplazar' && modo !== 'solo_categorias') {
        const r = await api.bulkProductos([], { modo: 'marcar_faltantes', seccion_id: importSecId, accion: faltantes, presentes: lista.map(p => ({ sku: p.sku, nombre: p.nombre })) });
        tot.marcados = r.marcados || 0;
      }
      setResult({ ok: true, ...tot });
      setData(null);
    } catch (e) { setResult({ ok: false, error: e.message, ...tot }); }
    setProgreso(null); setUploading(false);
  };

  const muestra = data ? data.productos.slice(0, 6) : [];
  return (
    <div className="modal-overlay" onClick={() => { if (!uploading) onClose(); }}>
      <div className="modal modal-lg imp-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Importar productos (Excel/CSV)</span><button className="modal-close" onClick={onClose} disabled={uploading}>✕</button></div>
        <div className="modal-body">
          <p className="form-hint" style={{ marginBottom: 12 }}>Acepta la exportación de Empretienda o Tienda Negocio, y la lista del proveedor con columnas <b>PRODUCTO, MODELO y PRECIO</b> (la categoría sale de PRODUCTO).</p>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Sección destino</label>
              <select value={importSecId} onChange={e => setImportSecId(Number(e.target.value))} disabled={uploading}>
                {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.requiere_aprobacion ? ' (con aprobación)' : ''}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">¿Qué hacer con los productos?</label>
              <select value={modo} onChange={e => setModo(e.target.value)} disabled={uploading}>
                <option value="crear_actualizar">Crear nuevos y actualizar existentes</option>
                <option value="solo_nuevos">Solo agregar los que faltan</option>
                <option value="solo_categorias">Solo corregir categorías</option>
                <option value="reemplazar">Borrar todo de la sección y cargar de cero</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Productos de la sección que NO están en el Excel</label>
            <select value={faltantes} onChange={e => setFaltantes(e.target.value)} disabled={modo === 'reemplazar' || modo === 'solo_categorias' || uploading}>
              <option value="no_tocar">No tocar (dejarlos como están)</option>
              <option value="sin_stock">Poner sin stock (el proveedor los sacó de la lista)</option>
              <option value="ocultar">Ocultarlos de la tienda</option>
              <option value="borrar">Borrarlos (los pedidos viejos no se tocan)</option>
            </select>
            <small className="form-hint">Los existentes se buscan solo dentro de esta sección, nunca en las otras.</small>
          </div>
          <label className="imp-archivo">
            <Archive size={18} /> <span>{data ? data.nombreArchivo : 'Elegir archivo .xlsx, .xls o .csv'}</span>
            <input type="file" accept=".xlsx,.xls,.csv" disabled={uploading} onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); e.target.value = ''; }} />
          </label>
          {data && (
            <div className="imp-datos">
              <div className="imp-resumen">
                <span><b>{data.total}</b> productos</span>
                <span><b>{data.categorias}</b> categorías</span>
                <span>{data.esProveedor ? 'Lista de proveedor' : 'Exportación de tienda'}</span>
              </div>
              {modo !== 'solo_categorias' && (
                <div className="imp-precio">
                  <div className="form-group"><label className="form-label">{data.esProveedor ? 'Ganancia sobre el precio del Excel (%)' : 'Sumar % al precio del Excel (opcional)'}</label>
                    <input type="number" inputMode="decimal" min="0" value={pct} onChange={e => setPct(e.target.value)} placeholder={data.esProveedor ? 'Ej: 30' : '0'} disabled={uploading} />
                  </div>
                  <div className="form-group"><label className="form-label">Redondear el precio</label>
                    <select value={paso} onChange={e => setPaso(Number(e.target.value))} disabled={uploading}>
                      <option value={0}>Sin redondear</option><option value={10}>A $10</option><option value={50}>A $50</option><option value={100}>A $100</option><option value={500}>A $500</option>
                    </select>
                  </div>
                </div>
              )}
              {(data.esProveedor || pctN > 0) && modo !== 'solo_categorias' && <small className="form-hint">El precio del Excel queda guardado como costo: en el dashboard vas a ver la ganancia real.</small>}
              <div className="imp-tabla">
                <div className="imp-fila imp-cab"><span>Categoría</span><span>Producto</span><span>Excel</span><span>Se carga a</span></div>
                {muestra.map((p, k) => { const x = preparar(p); return (
                  <div className="imp-fila" key={k}><span>{p.categoria}</span><span>{p.nombre}</span><span>{fmtARS(p.costo)}</span><b>{fmtARS(x.precio_base)}</b></div>
                ); })}
                {data.total > muestra.length && <div className="imp-mas">y {data.total - muestra.length} más…</div>}
              </div>
              {data.esProveedor && <small className="form-hint">Como el Excel no trae stock, se pueden comprar siempre. Cada fila queda con un código propio para que la próxima lista actualice los mismos productos.</small>}
              {!data.esProveedor && data.conSku < data.total && <p className="form-hint" style={{ color: 'var(--warning)' }}><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> {data.total - data.conSku} sin SKU: se buscan por nombre dentro de la sección.</p>}
              {data.esProveedor && pct === '' && modo !== 'solo_categorias' && <p className="form-hint" style={{ color: 'var(--warning)' }}>Poné el % de ganancia antes de importar (si querés el precio tal cual, poné 0).</p>}
              <button className="btn btn-primary" onClick={doUpload} disabled={uploading || (data.esProveedor && pct === '' && modo !== 'solo_categorias')} style={{ marginTop: 12, width: '100%' }}>
                {uploading ? `Importando… ${progreso ? `${Math.min(progreso.hecho + 250, progreso.total)} de ${progreso.total}` : ''}` : `Importar ${data.total} productos`}
              </button>
              {uploading && progreso && <div className="imp-barra"><span style={{ width: `${Math.round(progreso.hecho / progreso.total * 100)}%` }} /></div>}
            </div>
          )}
          {result && (
            <div className={`imp-res ${result.ok ? 'ok' : 'mal'}`}>
              {result.ok ? <b>Importación terminada</b> : <b>Se cortó la importación: {result.error}</b>}
              <span>{result.insertados} nuevos · {result.actualizados} actualizados{result.saltados ? ` · ${result.saltados} sin cambios` : ''}{result.marcados ? ` · ${result.marcados} ${faltantes === 'ocultar' ? 'ocultados' : faltantes === 'borrar' ? 'borrados' : 'puestos sin stock'}` : ''}{result.errores ? ` · ${result.errores} con error` : ''}</span>
              {result.primer_error && <small>Primer error: {result.primer_error}</small>}
            </div>
          )}
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
    setItems(prev => { const ex = prev.find(i => i.producto_id === p.id); if (ex) return prev.map(i => i.producto_id === p.id ? { ...i, qty: i.qty + 1 } : i); return [...prev, { producto_id: p.id, categoria: p.categoria, modelo: p.modelo, nombre_producto: p.nombre || p.modelo, imagen: p.imagen || '', qty: 1, precio_unitario: p.precio_base, precio_base: p.precio_base }]; });
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
                <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}><ItemProd id={i.producto_id} nombre={i.nombre_producto} imagen={i.imagen} tam={34} /></span>
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
  const [busqPed, setBusqPed] = useState('');
  const [pagoFiltro, setPagoFiltro] = useState('todos');
  const { secciones } = useContext(Ctx);
  const [secPed, setSecPed] = useState('all');
  const [rangoPed, setRangoPed] = useState('todo'); // todo | hoy | 7 | 30 | mes | custom
  const [desdePed, setDesdePed] = useState(''); const [hastaPed, setHastaPed] = useState('');
  const [avisoPed, setAvisoPed] = useState(null); // { mensaje, telefono } → ¿avisar al cliente?
  const [ocupado, setOcupado] = useState(null); // id del pedido que se está guardando
  const [vista, setVista] = useState(() => { try { return localStorage.getItem('gm_ped_vista') || 'lista'; } catch { return 'lista'; } });
  const cambiarVista = (v) => { setVista(v); try { localStorage.setItem('gm_ped_vista', v); } catch {} };
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
  const pedidosFiltrados = (() => {
    let lista = pedidos;
    if (busqPed) { const q = busqPed.toLowerCase(); lista = lista.filter(p => String(p.id).includes(q) || (p.usuario_nombre || '').toLowerCase().includes(q) || (p.nombre_fantasia || '').toLowerCase().includes(q) || (p.usuario_telefono || '').includes(q)); }
    if (pagoFiltro !== 'todos' && ordTab !== 'presupuestos') lista = lista.filter(p => { let ep = (p.estado_pago && String(p.estado_pago).trim()) ? String(p.estado_pago).trim() : 'impago'; if (ep === 'pendiente') ep = 'impago'; return ep === pagoFiltro; });
    if (secPed !== 'all') lista = lista.filter(p => String(p.seccion_id) === String(secPed));
    if (rangoPed !== 'todo') {
      const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
      let desde = null, hasta = null;
      if (rangoPed === 'hoy') desde = hoy0;
      else if (rangoPed === '7') desde = new Date(hoy0.getTime() - 6 * 86400000);
      else if (rangoPed === '30') desde = new Date(hoy0.getTime() - 29 * 86400000);
      else if (rangoPed === 'mes') desde = new Date(hoy0.getFullYear(), hoy0.getMonth(), 1);
      else if (rangoPed === 'custom') { if (desdePed) desde = new Date(desdePed + 'T00:00:00'); if (hastaPed) hasta = new Date(hastaPed + 'T23:59:59'); }
      lista = lista.filter(p => { const f = new Date(p.created_at); return (!desde || f >= desde) && (!hasta || f <= hasta); });
    }
    return lista;
  })();
  const epDe = (p) => { const ep = (p.estado_pago && String(p.estado_pago).trim() && p.estado_pago !== 'pendiente') ? p.estado_pago : 'impago'; return ep; };
  const resumenPed = pedidosFiltrados.reduce((r, p) => { const t = Number(p.total) || 0; r.total += t; if (epDe(p) === 'pagado') r.cobrado += t; else r.aCobrar += t - (epDe(p) === 'senado' ? Number(p.sena) || 0 : 0); return r; }, { total: 0, cobrado: 0, aCobrar: 0 });

  // Acciones rápidas desde la lista (sin abrir el pedido)
  const cambiarEstadoRapido = async (p, estado) => {
    if (estado === p.estado) return;
    if (estado === 'cancelado' && !confirm(`¿Cancelar el pedido ${numOrden(p)}? El stock vuelve a estar disponible.`)) return;
    setOcupado(p.id);
    try {
      await api.updatePedido(p.id, { estado });
      setPedidos(prev => prev.map(x => x.id === p.id ? { ...x, estado } : x));
      toast(`${numOrden(p)}: ${estado}`);
      const tel = telWaPedido(p); const msg = mensajeEstadoPedido(p, estado);
      if (tel && msg) setAvisoPed({ mensaje: msg, telefono: tel });
      if (estado === 'cancelado') load();
    } catch (e) { toast(e.message, 'error'); }
    setOcupado(null);
  };
  const marcarPagadoRapido = async (p) => {
    if (!confirm(`¿Marcar ${numOrden(p)} como pagado (${fmtARS(p.total)})? Se registra el cobro en la caja.`)) return;
    setOcupado(p.id);
    try {
      await api.updatePedido(p.id, { estado_pago: 'pagado' });
      setPedidos(prev => prev.map(x => x.id === p.id ? { ...x, estado_pago: 'pagado' } : x));
      toast(`${numOrden(p)} marcado como pagado`);
      const tel = telWaPedido(p); if (tel) setAvisoPed({ mensaje: mensajeEstadoPedido(p, 'pagado'), telefono: tel });
    } catch (e) { toast(e.message, 'error'); }
    setOcupado(null);
  };
  const waCliente = (p) => { const tel = telWaPedido(p); if (!tel) { toast('Este pedido no tiene teléfono del cliente', 'error'); return; } window.open(waLink(tel, `Hola ${p.usuario_nombre || ''}, te escribo por tu pedido ${numOrden(p)}.`), '_blank'); };

  const tabs = [{ id: 'pedidos', label: 'Pedidos' }, { id: 'presupuestos', label: 'Presupuestos' }, { id: 'cancelados', label: 'Cancelados' }, { id: 'archivados', label: 'Archivados' }];
  const estados = ['pendiente', 'preparando', 'listo', 'enviado', 'entregado', 'cancelado'];
  const colores = { pendiente: 'var(--warning)', preparando: 'var(--primary)', listo: '#8b5cf6', enviado: '#0ea5e9', entregado: 'var(--success)', cancelado: 'var(--danger)' };

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
          <button className="btn btn-outline btn-sm" onClick={exportExcel}><BarChart3 size={15} style={{ verticalAlign: '-2px' }} /> Exportar Excel</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {tabs.map(t => <button key={t.id} className={`btn btn-sm ${ordTab === t.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => changeTab(t.id)}>{t.label}</button>)}
        {ordTab === 'pedidos' && (
          <div className="vista-toggle" role="group" aria-label="Vista">
            <button type="button" className={vista === 'lista' ? 'on' : ''} onClick={() => cambiarVista('lista')} title="Lista"><LayoutList size={16} /><span>Lista</span></button>
            <button type="button" className={vista === 'tablero' ? 'on' : ''} onClick={() => cambiarVista('tablero')} title="Tablero por estado"><SquareKanban size={16} /><span>Tablero</span></button>
          </div>
        )}
      </div>
      <div className="ped-filtros">
        <input placeholder="Buscar por nº, cliente o teléfono..." value={busqPed} onChange={e => setBusqPed(e.target.value)} className="ped-busq" />
        {adminSeccion === 'all' && secciones.length > 1 && (
          <select value={secPed} onChange={e => setSecPed(e.target.value)} aria-label="Tienda">
            <option value="all">Todas las tiendas</option>
            {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <select value={rangoPed} onChange={e => setRangoPed(e.target.value)} aria-label="Fecha">
          <option value="todo">Cualquier fecha</option>
          <option value="hoy">Hoy</option>
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="mes">Este mes</option>
          <option value="custom">Elegir fechas…</option>
        </select>
        {rangoPed === 'custom' && <>
          <input type="date" value={desdePed} onChange={e => setDesdePed(e.target.value)} aria-label="Desde" />
          <input type="date" value={hastaPed} onChange={e => setHastaPed(e.target.value)} aria-label="Hasta" />
        </>}
        {ordTab !== 'presupuestos' && (
          <select value={pagoFiltro} onChange={e => setPagoFiltro(e.target.value)} aria-label="Estado de pago">
            <option value="todos">Todos los pagos</option>
            <option value="pagado">Pagados</option>
            <option value="impago">Impagos</option>
            <option value="senado">Señados</option>
            <option value="debe">Deben</option>
          </select>
        )}
      </div>
      {pedidosFiltrados.length > 0 && (
        <div className="ped-resumen">
          <span><b>{pedidosFiltrados.length}</b> {ordTab === 'presupuestos' ? 'presupuesto' : 'pedido'}{pedidosFiltrados.length !== 1 ? 's' : ''}</span>
          <span>Total <b>{fmtARS(resumenPed.total)}</b></span>
          {ordTab !== 'presupuestos' && <><span className="ok">Cobrado <b>{fmtARS(resumenPed.cobrado)}</b></span><span className="warn">A cobrar <b>{fmtARS(resumenPed.aCobrar)}</b></span></>}
        </div>
      )}
      {pedidosFiltrados.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No hay resultados</p>}
      {avisoPed && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setAvisoPed(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">¿Avisar al cliente?</span><button className="modal-close" onClick={() => setAvisoPed(null)} aria-label="Cerrar">✕</button></div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Se abre WhatsApp con este mensaje (lo podés editar antes de mandarlo):</p>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: 14, whiteSpace: 'pre-wrap' }}>{avisoPed.mensaje}</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAvisoPed(null)}>No, gracias</button>
              <button className="btn btn-primary" onClick={() => { window.open(waLink(avisoPed.telefono, avisoPed.mensaje), '_blank'); setAvisoPed(null); }}>Sí, abrir WhatsApp</button>
            </div>
          </div>
        </div>
      )}
      {ordTab === 'pedidos' && vista === 'tablero' && pedidosFiltrados.length > 0 && (
        <TableroPedidos pedidos={pedidosFiltrados} colores={colores} ocupado={ocupado} epDe={epDe} onMover={cambiarEstadoRapido} onVer={setViewOrder} />
      )}
      {!(ordTab === 'pedidos' && vista === 'tablero') && pedidosFiltrados.map(p => (
        <div key={p.id} className={`card ped-row${ocupado === p.id ? ' ocupado' : ''}`} style={{ padding: 12, marginBottom: 8, cursor: 'pointer' }} onClick={() => setViewOrder(p)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong>{numOrden(p)}</strong> {p.is_test && <span style={{ background: 'var(--warning)', color: '#000', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}><FlaskConical size={15} style={{ verticalAlign: '-2px' }} /> TEST</span>}
              {p.es_reserva && <span style={{ background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800, marginLeft: 6 }}><Bookmark size={15} style={{ verticalAlign: '-2px' }} /> RESERVA</span>}
              {p.seccion_nombre && <span style={{ background: p.seccion_color || 'var(--primary)', color: '#fff', padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{p.seccion_nombre}</span>}
              {' — '}{p.usuario_nombre || '(sin nombre)'} {p.nombre_fantasia && `(${p.nombre_fantasia})`}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {p.tipo !== 'presupuesto' && (() => { let ep = (p.estado_pago && String(p.estado_pago).trim() && p.estado_pago !== 'pendiente') ? p.estado_pago : 'impago'; return <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: ep === 'pagado' ? 'var(--success)' : ep === 'senado' ? 'var(--accent)' : ep === 'debe' ? 'var(--danger)' : '#999', color: '#fff' }}>{ep}</span>; })()}
              <span style={{ background: colores[p.estado], color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{p.estado}</span>
              <strong>{fmtARS(p.total)}</strong>
              {p.tipo !== 'presupuesto' && p.estado_pago === 'senado' && (Number(p.sena) > 0
                ? <span className="ped-resta">resta {fmtARS(Math.max(0, Number(p.total) - Number(p.sena)))}</span>
                : <span className="ped-resta sin">falta monto de seña</span>)}
            </div>
          </div>
          {/* Acciones rápidas (no abren el pedido) */}
          <div className="ped-acciones" onClick={e => e.stopPropagation()}>
            {p.tipo !== 'presupuesto' && ordTab !== 'archivados' && (
              <select className="ped-estado-sel" value={p.estado} disabled={ocupado === p.id} onChange={e => cambiarEstadoRapido(p, e.target.value)} aria-label="Cambiar estado" style={{ '--ped-c': colores[p.estado] || 'var(--border)' }}>
                {estados.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
              </select>
            )}
            {p.tipo !== 'presupuesto' && epDe(p) !== 'pagado' && p.estado !== 'cancelado' && (
              <button className="btn btn-sm ped-btn-pagado" disabled={ocupado === p.id} onClick={() => marcarPagadoRapido(p)}><CheckCircle size={14} /> Marcar pagado</button>
            )}
            <button className="btn btn-sm btn-outline ped-btn-wa" onClick={() => waCliente(p)} title="Escribirle por WhatsApp" aria-label="Escribirle por WhatsApp"><MessageCircle size={15} /><span className="solo-ancho"> WhatsApp</span></button>
            <button className="btn btn-sm btn-outline" onClick={() => setViewOrder(p)}>Ver detalle</button>
          </div>
        </div>
      ))}
      {pedidos.length === 0 && <div className="empty-state"><h3>No hay {ordTab}</h3></div>}
      {viewOrder && <OrderDetailModal order={viewOrder} onClose={() => { setViewOrder(null); load(); }} />}
      {showPresupuesto && <PresupuestoModal onClose={() => { setShowPresupuesto(false); changeTab('presupuestos'); }} />}
    </div>
  );
}

// ─── Tablero de pedidos por estado (arrastrar entre columnas en compu; botón "Pasar a…" en celu) ───
const TABLERO_COLS = [
  { k: 'pendiente', t: 'Pendientes' }, { k: 'preparando', t: 'Preparando' }, { k: 'listo', t: 'Listos' },
  { k: 'enviado', t: 'Enviados' }, { k: 'entregado', t: 'Entregados' },
];

const fechaCortaPed = (d) => {
  const f = new Date(d); if (isNaN(f)) return '';
  const hoy = new Date(); const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  const hh = f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (f.toDateString() === hoy.toDateString()) return `Hoy ${hh}`;
  if (f.toDateString() === ayer.toDateString()) return `Ayer ${hh}`;
  return f.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
};

function TableroPedidos({ pedidos, colores, ocupado, epDe, onMover, onVer }) {
  const [sobre, setSobre] = useState(null);
  const arrastrando = useRef(null);
  const MAX_ENTREGADOS = 30;
  return (
    <div className="kb">
      {TABLERO_COLS.map((col, ci) => {
        const lista = pedidos.filter(p => p.estado === col.k);
        const suma = lista.reduce((a, p) => a + (Number(p.total) || 0), 0);
        const visibles = col.k === 'entregado' ? lista.slice(0, MAX_ENTREGADOS) : lista;
        const sig = TABLERO_COLS[ci + 1];
        return (
          <section key={col.k} className={`kb-col${sobre === col.k ? ' over' : ''}`} style={{ '--kb-c': colores[col.k] }}
            onDragOver={e => { if (arrastrando.current) { e.preventDefault(); if (sobre !== col.k) setSobre(col.k); } }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setSobre(null); }}
            onDrop={e => { e.preventDefault(); setSobre(null); const p = arrastrando.current; arrastrando.current = null; if (p && p.estado !== col.k) onMover(p, col.k); }}>
            <header className="kb-head">
              <span className="kb-dot" />
              <span className="kb-titulo">{col.t}</span>
              <span className="kb-n">{lista.length}</span>
              {lista.length > 0 && <span className="kb-sum">{fmtARS(suma)}</span>}
            </header>
            <div className="kb-list">
              {visibles.map(p => {
                const ep = epDe(p);
                return (
                  <article key={p.id} className={`kb-card${ocupado === p.id ? ' ocupado' : ''}`} draggable
                    onDragStart={e => { arrastrando.current = p; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(p.id)); } catch {} }}
                    onDragEnd={() => { arrastrando.current = null; setSobre(null); }}
                    onClick={() => onVer(p)}>
                    <div className="kb-card-top"><strong>{numOrden(p)}</strong><span className="kb-total">{fmtARS(p.total)}</span></div>
                    <div className="kb-cli">{p.usuario_nombre || '(sin nombre)'}{p.nombre_fantasia ? ` · ${p.nombre_fantasia}` : ''}</div>
                    <div className="kb-meta">
                      {p.seccion_nombre && <span className="kb-sec" style={{ background: p.seccion_color || 'var(--primary)' }}>{p.seccion_nombre}</span>}
                      <span className={`kb-pago ${ep}`}>{ep}</span>
                      {p.is_test && <span className="kb-pago test">test</span>}
                      <span className="kb-fecha">{fechaCortaPed(p.created_at)}</span>
                    </div>
                    {sig && <button type="button" className="kb-next" disabled={ocupado === p.id} onClick={e => { e.stopPropagation(); onMover(p, sig.k); }}>Pasar a {sig.t.toLowerCase()} <ChevronRight size={13} /></button>}
                  </article>
                );
              })}
              {!lista.length && <div className="kb-vacio">Sin pedidos</div>}
              {lista.length > visibles.length && <div className="kb-vacio">y {lista.length - visibles.length} más (usá la vista Lista)</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function VisorProductoPanel() {
  const { secciones } = useContext(Ctx);
  const [abierto, setAbierto] = useState(null);
  const [prod, setProd] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [i, setI] = useState(0);
  const [err, setErr] = useState('');
  const [editar, setEditar] = useState(null);
  useEffect(() => { const h = (e) => setAbierto(e.detail); window.addEventListener('ver-producto', h); return () => window.removeEventListener('ver-producto', h); }, []);
  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    setProd(null); setErr(''); setI(0); setFotos(abierto.imagen ? [abierto.imagen] : []);
    api.getProducto(abierto.id).then(p => { if (vivo) setProd(p); }).catch(e => { if (vivo) setErr(e && e.status === 404 ? 'Este producto ya no está en el catálogo (se borró). Se muestra lo que quedó guardado en el pedido.' : (e.message || 'No se pudo cargar')); });
    api.getProductoImagenes(abierto.id).then(imgs => { if (vivo && imgs && imgs.length) setFotos(imgs.map(g => g.url)); }).catch(() => {});
    return () => { vivo = false; };
  }, [abierto && abierto.id]);
  useEffect(() => {
    if (!abierto) return;
    const n = Math.max(1, fotos.length);
    const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setAbierto(null); } if (e.key === 'ArrowRight') setI(x => (x + 1) % n); if (e.key === 'ArrowLeft') setI(x => (x - 1 + n) % n); };
    window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true);
  }, [abierto, fotos.length]);
  if (editar) return <div style={{ position: 'relative', zIndex: 450 }}><ProductModal product={editar} onClose={() => setEditar(null)} /></div>;
  if (!abierto) return null;
  const p = prod || {};
  const base = Number(p.precio_base) || 0, oferta = Number(p.precio_oferta) || 0;
  const conOferta = oferta > 0 && oferta < base;
  const sec = (secciones || []).find(x => String(x.id) === String(p.seccion_id));
  const ir = (d) => setI(x => (x + d + fotos.length) % fotos.length);
  return createPortal(
    <div className="vpp-overlay" onClick={() => setAbierto(null)}>
      <div className="vpp" onClick={e => e.stopPropagation()} role="dialog" aria-label={p.nombre || abierto.nombre || 'Producto'}>
        <button type="button" className="vpp-cerrar" onClick={() => setAbierto(null)} aria-label="Cerrar"><X size={18} /></button>
        <div className="vpp-media">
          {fotos.length ? <img src={imgOpt(fotos[i], 900)} alt={p.nombre || abierto.nombre || ''} /> : <div className="tp-noimg"><Package size={56} /></div>}
          {fotos.length > 1 && <>
            <button type="button" className="vr-flecha izq" onClick={() => ir(-1)} aria-label="Foto anterior"><ChevronLeft size={20} /></button>
            <button type="button" className="vr-flecha der" onClick={() => ir(1)} aria-label="Foto siguiente"><ChevronRight size={20} /></button>
            <div className="vr-thumbs">{fotos.slice(0, 8).map((u, k) => <button type="button" key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Foto ${k + 1}`}><img src={imgOpt(u, 120)} alt="" /></button>)}</div>
          </>}
        </div>
        <div className="vpp-info">
          {err && <p className="vpp-err">{err}</p>}
          {!prod && !err && <p className="vpp-cargando">Cargando…</p>}
          <div className="product-cat">{[p.categoria, sec && sec.nombre].filter(Boolean).join(' · ')}</div>
          <h3 className="vpp-titulo">{p.nombre || p.modelo || abierto.nombre}</h3>
          {prod && (
            <div className="vpp-datos">
              <div><span>Precio</span><b>{conOferta ? <><s>{fmtARS(base)}</s> {fmtARS(oferta)}</> : fmtARS(base)}</b></div>
              <div><span>Stock</span><b className={Number(p.stock) <= 0 ? 'mal' : ''}>{p.usa_variantes ? 'por variante' : p.stock}</b></div>
              {Number(p.precio_original) > 0 && <div><span>Costo</span><b>{fmtARS(p.precio_original)}</b></div>}
              {(p.sku || p.codigo_barras) && <div><span>SKU / código</span><b>{p.sku || p.codigo_barras}</b></div>}
              <div><span>En la tienda</span><b>{p.visible === false ? 'Oculto' : 'Visible'}</b></div>
            </div>
          )}
          {p.descripcion && <p className="vpp-desc">{String(p.descripcion).slice(0, 360)}{String(p.descripcion).length > 360 ? '…' : ''}</p>}
          {prod && (
            <div className="vpp-acciones">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditar(prod); setAbierto(null); }}>Editar producto</button>
              <a className="btn btn-outline btn-sm" href={productPath(prod)} target="_blank" rel="noopener noreferrer">Ver en la tienda</a>
            </div>
          )}
        </div>
      </div>
    </div>, document.body);
}

// ─── ORDER DETAIL MODAL (full: edit items, print, clone, WA, assign client) ───
function OrderDetailModal({ order: initOrder, onClose }) {
  const { toast, listas, getPrice, userLista, openWA, config, design } = useContext(Ctx);
  const [o, setO] = useState(initOrder);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [ajuste, setAjuste] = useState(0); // + recargo, - descuento
  const [pagos, setPagos] = useState(initOrder.pagos || []);
  const [historial, setHistorial] = useState([]);
  const [tracking, setTracking] = useState(initOrder.codigo_seguimiento || '');
  const [costoEnvioEd, setCostoEnvioEd] = useState(Number(initOrder.costo_envio) > 0 ? String(Number(initOrder.costo_envio)) : '');
  const cargarHistorial = async () => { try { const h = await api.getHistorialPedido(o.id); setHistorial(h || []); } catch {} };
  useEffect(() => { cargarHistorial(); }, [o.id]);
  const [nuevoPago, setNuevoPago] = useState({ metodo: 'efectivo', cuenta_como: '', ajuste_pct: 0, nota: '' });
  const searchTimer = useRef(null);

  // Parsear datos de envío/facturación (guardados como JSON en el checkout)
  const parseJSON = (str) => { try { return str ? JSON.parse(str) : null; } catch { return null; } };
  const datosEnvio = parseJSON(o.datos_envio);
  const datosFact = parseJSON(o.datos_facturacion);

  // Pagos mixtos: cuenta_como = lo que tacha de la deuda, recibido = plata real
  const totalSaldado = pagos.reduce((s, p) => s + Number(p.cuenta_como || 0), 0);
  const totalRecibido = pagos.reduce((s, p) => s + Number(p.recibido || 0), 0);
  // Total real reconstruido desde los ítems (fuente de verdad). El o.total guardado puede quedar corrupto.
  const totalItems = (items || []).reduce((s, i) => s + Number(i.precio_unitario || i.precio_base || 0) * Number(i.cantidad || i.qty || 1), 0);
  const totalPedido = totalItems > 0 ? (totalItems - Number(o.descuento || 0) + Number(o.costo_envio || 0)) : Number(o.total || 0);
  const saldoPedido = totalPedido - totalSaldado;
  const ajustesMetodo = parseJSON(config.ajustes_metodo) || {};
  const previewRecibido = (() => { const cta = Number(nuevoPago.cuenta_como) || 0; const pct = Number(nuevoPago.ajuste_pct) || 0; return Math.round(cta * (1 + pct / 100)); })();
  const cargarPagos = async () => { try { const p = await api.getPagos(o.id); setPagos(p || []); } catch {} };
  const quitarPago = async (pagoId) => {
    try { const r = await api.deletePago(o.id, pagoId); await cargarPagos(); setO({ ...o, estado_pago: r.estado }); } catch (e) { toast(e.message, 'error'); }
  };
  const onMetodoPago = (metodo) => {
    const def = ajustesMetodo[metodo];
    setNuevoPago({ ...nuevoPago, metodo, ajuste_pct: def !== undefined ? def : 0 });
  };

  // ── PAGO: un solo lugar para cobrar, señar y ver lo que resta ──
  const [guardandoPago, setGuardandoPago] = useState(false);
  const pagoRef = useRef(null);
  const montoRef = useRef(null);
  const senaSinDetalle = !loadingItems && pagos.length === 0 ? (Number(o.sena) || 0) : 0; // pedidos viejos: seña guardada sin pagos cargados
  const marcadoPagado = !loadingItems && pagos.length === 0 && o.estado_pago === 'pagado';
  const pagadoCta = marcadoPagado ? totalPedido : totalSaldado + senaSinDetalle;
  const restaCta = Math.max(0, totalPedido - pagadoCta);
  const pctCta = totalPedido > 0 ? Math.min(100, Math.round((pagadoCta / totalPedido) * 100)) : 0;
  const cantPagos = pagos.length + (senaSinDetalle > 0 ? 1 : 0);
  const epActual = (o.estado_pago && o.estado_pago !== 'pendiente') ? o.estado_pago : 'impago';
  const EP_LABEL = { impago: 'Impago', senado: 'Señado', pagado: 'Pagado', debe: 'Debe' };
  const fechaCorta = (d) => { try { return d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : ''; } catch { return ''; } };
  const textoResumen = (lista = pagos) => {
    const pag = marcadoPagado ? totalPedido : lista.reduce((s, p) => s + Number(p.cuenta_como || 0), 0) + (lista.length ? 0 : senaSinDetalle);
    const resta = Math.max(0, totalPedido - pag);
    const lineas = lista.map(p => `• ${fechaCorta(p.created_at)}: ${fmtARS(p.cuenta_como)}${p.metodo ? ` (${p.metodo})` : ''}`);
    return [
      `Hola ${o.usuario_nombre || ''}! Te paso el resumen de tu pedido ${numOrden(o)}:`, '',
      `Total: ${fmtARS(totalPedido)}`,
      ...(lineas.length ? ['Pagos:', ...lineas] : []),
      `Pagado: ${fmtARS(pag)}`,
      resta > 0.01 ? `Resta abonar: ${fmtARS(resta)}` : 'Pedido pagado completo. ¡Gracias!',
    ].join('\n');
  };
  const enviarResumen = async () => {
    const t = textoResumen(); const d = telPedido();
    if (d) { window.open(waLink(d, t), '_blank'); return; }
    try { await navigator.clipboard.writeText(t); toast('Resumen copiado: el cliente no tiene teléfono cargado'); } catch { toast('El cliente no tiene teléfono cargado', 'error'); }
  };
  // Registra un pago (seña, pago a cuenta o el total). montoForzado = "Cobrar todo"
  const registrarPago = async (montoForzado) => {
    const cuentaComo = Number(montoForzado != null ? montoForzado : nuevoPago.cuenta_como);
    if (!(cuentaComo > 0)) { toast('Poné el monto que paga', 'error'); montoRef.current?.focus(); return; }
    const ajustePct = Number(nuevoPago.ajuste_pct) || 0;
    const recibido = Math.round(cuentaComo * (1 + ajustePct / 100));
    setGuardandoPago(true);
    try {
      // Seña vieja sin detalle: primero la pasamos a la lista de pagos para no perderla
      if (pagos.length === 0 && senaSinDetalle > 0) await api.addPago(o.id, { metodo: 'seña anterior', recibido: senaSinDetalle, cuenta_como: senaSinDetalle, ajuste_pct: 0, nota: 'Seña cargada antes' });
      const r = await api.addPago(o.id, { metodo: nuevoPago.metodo, recibido, cuenta_como: cuentaComo, ajuste_pct: ajustePct, nota: nuevoPago.nota || '' });
      const lista = await api.getPagos(o.id).catch(() => null);
      if (lista) setPagos(lista); else await cargarPagos();
      setO({ ...o, estado_pago: r.estado, sena: r.estado === 'senado' ? r.saldado : 0 });
      const def = ajustesMetodo[nuevoPago.metodo];
      setNuevoPago({ metodo: nuevoPago.metodo, cuenta_como: '', ajuste_pct: def !== undefined ? def : 0, nota: '' });
      cargarHistorial();
      toast(r.estado === 'pagado' ? 'Pago registrado: pedido pagado completo' : 'Pago registrado');
      pedirAviso(textoResumen(lista || pagos));
    } catch (e) { toast(e.message, 'error'); }
    setGuardandoPago(false);
  };
  const cambiarEstadoPagoManual = async (nuevo) => {
    try { await api.updatePedido(o.id, { estado_pago: nuevo }); const full = await api.getPedido(o.id); setO(full); if (Array.isArray(full.pagos)) setPagos(full.pagos); cargarHistorial(); toast(nuevo === 'debe' ? 'Quedó como "Debe"' : 'Estado de pago actualizado'); } catch (e) { toast(e.message, 'error'); }
  };
  const irAPago = () => { try { pagoRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => montoRef.current?.focus(), 350); } catch {} };

  useEffect(() => {
    (async () => {
      setLoadingItems(true);
      const full = await api.getPedido(o.id);
      setItems((full.items || []).map(i => ({ ...i, qty: i.cantidad || 1 })));
      setO(full);
      if (Array.isArray(full.pagos)) setPagos(full.pagos); // los pagos ya cargados (antes no se mostraban al abrir)
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
  const envioPed = Number(o.costo_envio) || 0;
  const editTotal = Math.max(0, editSubtotal + (Number(ajuste) || 0)) + envioPed;
  const itemName = i => i.nombre_producto || (i.categoria && i.modelo ? `${i.categoria} - ${i.modelo}` : i.modelo || 'Producto');

  const saveEdit = async () => {
    setSaving(true);
    try {
      const newItems = items.map(i => ({ producto_id: i.producto_id || i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: itemName(i), cantidad: i.qty, precio_unitario: Number(i.precio_unitario) || 0, precio_base: Number(i.precio_base) || 0, variante_id: i.variante_id || null, variante_combinacion: i.variante_combinacion || '' }));
      await api.updatePedido(o.id, { items: newItems, subtotal: editSubtotal, descuento: ajuste < 0 ? Math.abs(ajuste) : 0, total: editTotal });
      toast('Pedido actualizado'); setEditing(false);
      const full = await api.getPedido(o.id); setO(full); setItems((full.items || []).map(i => ({ ...i, qty: i.cantidad || 1 })));
      // Aviso si quedaron pagos que no coinciden con el nuevo total (evita pagos fantasma)
      const sumPagos = (pagos || []).reduce((s, pg) => s + (Number(pg.cuenta_como) || Number(pg.monto) || 0), 0);
      if (sumPagos > 0.5 && Math.abs(sumPagos - editTotal) > 0.5) {
        toast(`Atención: este pedido tiene pagos por ${fmtARS(sumPagos)} y el nuevo total es ${fmtARS(editTotal)}. Revisá y borrá los pagos que sobren.`, 'error');
      }
      pedirAviso(`Hola ${o.usuario_nombre || ''}, actualizamos tu pedido #${o.id}. Cualquier duda escribinos.`);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const addItem = (p) => {
    const precio = p.precio_base;
    setItems(prev => {
      const ex = prev.find(i => (i.producto_id || i.id) === p.id);
      if (ex) return prev.map(i => (i.producto_id || i.id) === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { producto_id: p.id, id: p.id, categoria: p.categoria, modelo: p.modelo, nombre_producto: p.nombre || p.modelo, imagen: p.imagen || '', qty: 1, precio_unitario: precio, precio_base: p.precio_base }];
    });
    setSearchResults([]); setAddSearch('');
  };

  const [notif, setNotif] = useState(null); // {mensaje, telefono} → cartelito para avisar al cliente
  const telPedido = () => { const t = o.usuario_telefono || (datosEnvio && datosEnvio.contacto && datosEnvio.contacto.telefono) || ''; const d = String(t).replace(/\D/g, ''); return d ? (d.startsWith('54') ? d : '54' + d) : ''; };
  const pedirAviso = (mensaje) => { const d = telPedido(); if (mensaje && d) setNotif({ mensaje, telefono: d }); };
  // Envío "a cotizar": cuando ya sabés cuánto sale, se carga acá y el total del pedido se actualiza
  const envioACotizar = /a cotizar/i.test(o.metodo_envio || '');
  const guardarCostoEnvio = async () => {
    const nuevo = Math.max(0, Number(costoEnvioEd) || 0); const viejo = Number(o.costo_envio) || 0;
    const total = totalItems > 0 ? totalItems - Number(o.descuento || 0) + nuevo : Number(o.total || 0) - viejo + nuevo;
    const metodo = String(o.metodo_envio || '').replace(/\s*\(envío a cotizar\)/i, '');
    try { await api.updatePedido(o.id, { costo_envio: nuevo, total, metodo_envio: metodo }); setO({ ...o, costo_envio: nuevo, total, metodo_envio: metodo }); toast(nuevo > 0 ? `Envío de ${fmtARS(nuevo)} sumado al pedido` : 'Envío sin cargo'); } catch (e) { toast(e.message, 'error'); }
  };
  const guardarTracking = async () => { try { await api.updatePedido(o.id, { codigo_seguimiento: tracking.trim() }); setO({ ...o, codigo_seguimiento: tracking.trim() }); toast('Seguimiento guardado'); } catch (e) { toast(e.message, 'error'); } };
  const enviarTrackingWA = async () => { const cod = tracking.trim(); if (!cod) return; if (cod !== (o.codigo_seguimiento || '')) await guardarTracking(); if (!telPedido()) { toast('Este pedido no tiene teléfono del cliente', 'error'); return; } pedirAviso(`¡Hola ${o.usuario_nombre || ''}! Tu pedido #${o.id} fue despachado 🚚. Código de seguimiento: ${cod}`); };

  const changeEstado = async (estado) => {
    try {
      await api.updatePedido(o.id, { estado });
      setO({ ...o, estado });
      toast('Estado actualizado');
      // Notificación opcional al cliente
      pedirAviso(mensajeEstadoPedido(o, estado, tracking));
    } catch (e) { toast(e.message, 'error'); }
  };

  const cloneOrder = async () => {
    try {
      await api.createPedido({ seccion_id: o.seccion_id, tipo: o.tipo, metodo_pago: o.metodo_pago, notas: `Clonado de #${o.id}`, items: items.map(i => ({ producto_id: i.producto_id || i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: itemName(i), cantidad: i.qty, precio_unitario: i.precio_unitario, precio_base: i.precio_base })), subtotal: editTotal, total: editTotal });
      toast('Pedido duplicado'); onClose();
    } catch (e) { toast(e.message, 'error'); }
  };

  const printOrder = (format = 'A4') => {
    const logo = design.logo_url || config.logo_url || '';
    const biz = config.nombre_tienda || design.nombre_tienda || 'Tienda';
    const isSmall = format !== 'A4';
    // Datos de entrega/facturación del checkout (JSON)
    const _dEnvio = datosEnvio; const _dFact = datosFact;
    let entregaLinea = `${o.tipo_entrega === 'retiro' ? 'Retiro en local' : 'Envío'}${o.direccion ? ` — ${o.direccion}` : ''}`;
    if (_dEnvio?.entrega) {
      if (_dEnvio.entrega.tipo === 'envio') entregaLinea = `Envío a: ${_dEnvio.entrega.calle} ${_dEnvio.entrega.numero}${_dEnvio.entrega.piso ? `, ${_dEnvio.entrega.piso}` : ''}, ${_dEnvio.entrega.localidad} (CP ${_dEnvio.entrega.cp})${_dEnvio.entrega.dni ? ` · DNI ${_dEnvio.entrega.dni}` : ''}`;
      // (se escapa al insertarlo en el remito)
      else entregaLinea = 'Retiro en el local';
    }
    const contactoLinea = _dEnvio?.contacto ? `${_dEnvio.contacto.nombre || ''}${_dEnvio.contacto.telefono ? ` · ${_dEnvio.contacto.telefono}` : ''}` : '';
    const factLinea = _dFact ? `Facturación: ${_dFact.razon_social || ''} · ${_dFact.cuit_dni || ''}${_dFact.condicion_iva ? ` · ${_dFact.condicion_iva.replace(/_/g, ' ')}` : ''}` : '';
    const widths = { A4: '210mm', '50mm': '50mm', '58mm': '58mm', '80mm': '80mm', '100mm': '100mm' };
    const fontSize = isSmall ? '10px' : '13px';
    const pagado = o.estado_pago === 'pagado' || o.pagado;
    const senaMonto = Number(o.sena) || 0;
    const tieneSena = senaMonto > 0 && (o.estado_pago === 'senado' || o.estado_pago === 'debe');
    const restaAbonar = Math.max(0, Number(editTotal) - senaMonto);
    // Desglose de pagos mixtos para el remito
    const listaPagos = pagos || [];
    const totalSald = listaPagos.reduce((s, p) => s + Number(p.cuenta_como || 0), 0);
    const totalRec = listaPagos.reduce((s, p) => s + Number(p.recibido || 0), 0);
    const saldoRem = Math.max(0, Number(editTotal) - totalSald);
    const pagosHTML = listaPagos.length ? `<div style="text-align:right;margin-top:4px;border-top:2px solid #333;padding-top:6px">
      ${listaPagos.map(p => { const dif = Number(p.cuenta_como || 0) - Number(p.recibido || 0); return `<p style="margin:2px 0;font-size:${isSmall ? '10px' : '13px'}">${escHtml(p.metodo)}${Number(p.ajuste_pct) !== 0 ? ` (${Number(p.ajuste_pct) > 0 ? '+' : ''}${p.ajuste_pct}%)` : ''}: $${fmt(p.recibido)}${Math.abs(dif) > 0.01 ? ` <span style="color:#888">(${dif > 0 ? 'desc. $' + fmt(dif) : 'rec. $' + fmt(-dif)})</span>` : ''}</p>`; }).join('')}
      <p style="margin:2px 0;color:#16a34a;font-size:${isSmall ? '11px' : '14px'}">Pagado: $${fmt(totalRec)}</p>
      ${saldoRem > 0.01 ? `<p style="margin:2px 0;font-weight:800;color:#dc2626;font-size:${isSmall ? '13px' : '17px'}">RESTA ABONAR: $${fmt(saldoRem)}</p>` : `<p style="margin:2px 0;font-weight:800;color:#16a34a;font-size:${isSmall ? '12px' : '15px'}">✓ PAGADO</p>`}
    </div>` : '';
    const estadoPagoLabel = o.estado_pago === 'pagado' ? 'PAGADO' : o.estado_pago === 'senado' ? 'SEÑADO' : o.estado_pago === 'debe' ? 'DEBE' : 'IMPAGO';
    const estadoPagoColor = o.estado_pago === 'pagado' ? '#16a34a' : o.estado_pago === 'senado' ? '#d97706' : '#dc2626';
    // URL del pedido para el QR (abre el pedido en el panel)
    const pedidoUrl = `${window.location.origin}/?pedido=${o.id}`;
    const qrSize = isSmall ? 90 : 120;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(pedidoUrl)}`;
    const rows = items.map(i =>
      `<tr><td style="padding:3px 4px;border-bottom:1px solid #eee">${escHtml(itemName(i))}</td><td style="text-align:center;border-bottom:1px solid #eee">${escHtml(i.qty)}</td><td style="text-align:right;border-bottom:1px solid #eee">$${fmt((i.precio_unitario || 0) * i.qty)}</td></tr>`
    ).join('');
    const w = window.open('', '_blank');
    if (!w) { toast('Permití los pop-ups para imprimir', 'error'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Remito #${escHtml(o.id)}</title><style>
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
          ${logo ? `<img src="${escHtml(urlSegura(logo) || '')}" style="max-height:${isSmall ? '34px' : '58px'};margin-bottom:4px">` : ''}
          <h1 class="biz">${escHtml(biz)}</h1>
          <p style="margin:2px 0;color:#555">${o.tipo==='presupuesto'?'Presupuesto P-':'Remito / Pedido #'}${String(o.id).padStart(4,'0')}</p>
        </div>
        <div style="text-align:center">
          <img src="${escHtml(qrUrl)}" width="${qrSize}" height="${qrSize}" style="display:block">
          <span style="font-size:9px;color:#888">Escaneá para abrir</span>
        </div>
      </div>
      <p style="margin:6px 0 2px">${new Date(o.created_at).toLocaleString('es-AR')}</p>
      <p style="margin:2px 0"><strong>${escHtml(o.usuario_nombre || (_dEnvio?.contacto?.nombre) || 'Cliente')}</strong> ${o.nombre_fantasia ? `(${escHtml(o.nombre_fantasia)})` : ''}${o.usuario_telefono ? ` · ${escHtml(o.usuario_telefono)}` : (_dEnvio?.contacto?.telefono ? ` · ${escHtml(_dEnvio.contacto.telefono)}` : '')}</p>
      <p style="margin:2px 0">${escHtml(entregaLinea)}</p>
      ${factLinea ? `<p style="margin:2px 0;font-size:${isSmall ? '10px' : '12px'};color:#333">${escHtml(factLinea)}</p>` : ''}
      <p style="margin:6px 0">
        <span class="badge" style="background:${estadoPagoColor}">${estadoPagoLabel}</span>
        <span style="margin-left:8px">Método: ${escHtml(o.metodo_pago || '-')}</span>
      </p>
      <table><thead><tr><th>Producto</th><th style="text-align:center">Cant</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="text-align:right;font-weight:800;font-size:${isSmall ? '14px' : '19px'};margin-top:10px">TOTAL: $${fmt(editTotal)}</p>
      ${listaPagos.length ? pagosHTML : (tieneSena ? `<div style="text-align:right;margin-top:4px;border-top:2px solid #333;padding-top:6px">
        <p style="margin:2px 0;color:#16a34a;font-size:${isSmall ? '11px' : '14px'}">Pagó (seña): $${fmt(senaMonto)}</p>
        <p style="margin:2px 0;font-weight:800;color:#dc2626;font-size:${isSmall ? '13px' : '17px'}">RESTA ABONAR: $${fmt(restaAbonar)}</p>
      </div>` : '')}
      ${o.notas ? `<p style="color:#666;font-size:${isSmall ? '9px' : '11px'};border-top:1px dashed #ccc;padding-top:6px;white-space:pre-line">Notas: ${escHtml(o.notas)}</p>` : ''}
    </body></html>`);
    w.document.close();
    // Esperar a que carguen las imágenes (logo + QR externo) antes de imprimir (máximo 2,5 s)
    imprimirCuandoCargue(w, { espera: 250, maximo: 2500 });
  };

  const estados = ['pendiente', 'preparando', 'listo', 'enviado', 'entregado', 'cancelado'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      {notif && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={(e) => { e.stopPropagation(); setNotif(null); }}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">¿Avisar al cliente?</span><button className="modal-close" onClick={(e) => { e.stopPropagation(); setNotif(null); }}>✕</button></div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Se le enviaría por WhatsApp:</p>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: 14, whiteSpace: 'pre-wrap' }}>{notif.mensaje}</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); setNotif(null); }}>No, gracias</button>
              <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); window.open(waLink(notif.telefono, notif.mensaje), '_blank'); setNotif(null); }}>Sí, abrir WhatsApp</button>
            </div>
          </div>
        </div>
      )}
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">{numOrden(o)}{o.es_reserva && <span style={{ background: 'var(--accent)', color: '#fff', padding: '2px 10px', borderRadius: 5, fontSize: 11, fontWeight: 800, marginLeft: 10 }}><Bookmark size={15} style={{ verticalAlign: '-2px' }} /> RESERVA / PREVENTA</span>}{o.seccion_nombre && <span style={{ background: o.seccion_color || 'var(--primary)', color: '#fff', padding: '2px 10px', borderRadius: 5, fontSize: 11, fontWeight: 800, marginLeft: 10, textTransform: 'uppercase', letterSpacing: '0.03em', verticalAlign: 'middle' }}>{o.seccion_nombre}</span>}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Client info */}
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            <strong>{o.usuario_nombre}</strong> {o.nombre_fantasia && `(${o.nombre_fantasia})`}
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {o.usuario_telefono && <span><Smartphone size={15} style={{ verticalAlign: '-2px' }} /> {o.usuario_telefono} </span>}
              {o.usuario_email && <span><Mail size={15} style={{ verticalAlign: '-2px' }} /> {o.usuario_email} </span>}
              {o.usuario_direccion && <span><MapPin size={15} style={{ verticalAlign: '-2px' }} /> {o.usuario_direccion}</span>}
            </div>
          </div>

          {/* SEÑA: resumen arriba solo cuando el pedido está señado (pagó una parte) */}
          {!loadingItems && totalPedido > 0 && cantPagos > 0 && restaCta > 0.01 && (
            <div className="cta-ped">
              <div className="cta-ped-nums">
                <div><small>Total</small><strong>{fmtARS(totalPedido)}</strong></div>
                <div><small>Señado</small><strong className="ok">{fmtARS(pagadoCta)}</strong></div>
                <div><small>Resta</small><strong className="debe">{fmtARS(restaCta)}</strong></div>
              </div>
              <div className="cta-ped-barra" title={`${pctCta}% pagado`}><span style={{ width: `${pctCta}%` }} /></div>
              <div className="cta-ped-acciones">
                <span className="cta-ped-det">{cantPagos === 1 ? 'En 1 pago' : `En ${cantPagos} pagos`}</span>
                <button className="btn btn-outline btn-sm" onClick={irAPago}>Ver pagos / cargar otro</button>
                <button className="btn btn-outline btn-sm" onClick={enviarResumen}><MessageCircle size={14} style={{ verticalAlign: '-2px' }} /> Enviar resumen</button>
              </div>
            </div>
          )}

          {/* Estado de ENTREGA */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Entrega:</label>
            <select value={o.estado} onChange={e => changeEstado(e.target.value)} style={{ width: 140 }}>
              {estados.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <div style={{ flexBasis: '100%', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Seguimiento:</label>
              <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Código de seguimiento" style={{ width: 200, padding: '6px 10px', fontSize: 13 }} />
              <button className="btn btn-outline btn-sm" onClick={guardarTracking} disabled={tracking.trim() === (o.codigo_seguimiento || '')}>Guardar</button>
              <button className="btn btn-success btn-sm" onClick={enviarTrackingWA} disabled={!tracking.trim()}>Enviar por WhatsApp</button>
            </div>
            {(o.metodo_envio || Number(o.costo_envio) > 0) && (
              <div className={`ped-envio-costo${envioACotizar ? ' pendiente' : ''}`}>
                <label>Envío{o.metodo_envio ? ` · ${o.metodo_envio}` : ''}:</label>
                <input type="number" inputMode="numeric" value={costoEnvioEd} onChange={e => setCostoEnvioEd(e.target.value)} placeholder={envioACotizar ? 'Cargá lo que cotizaste' : 'Costo del envío'} />
                <button className="btn btn-outline btn-sm" onClick={guardarCostoEnvio} disabled={(Number(costoEnvioEd) || 0) === (Number(o.costo_envio) || 0) && !envioACotizar}>Guardar</button>
                {envioACotizar && <small>Falta cotizar: el total todavía no incluye el envío</small>}
              </div>
            )}
            {/* Assign client */}
            <select value={o.usuario_id || ''} onChange={async e => { try { await api.updatePedido(o.id, { usuario_id: Number(e.target.value) }); toast('Cliente asignado'); const full = await api.getPedido(o.id); setO(full); } catch (err) { toast(err.message, 'error'); } }} style={{ width: 180 }}>
              <option value="">Asignar cliente...</option>
              {allUsers.filter(u => u.rol !== 'admin').map(u => <option key={u.id} value={u.id}>{u.nombre} {u.nombre_fantasia ? `(${u.nombre_fantasia})` : ''}</option>)}
            </select>
          </div>
          {/* Items */}
          <h4>Items {!editing && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)} style={{ marginLeft: 8 }}>Editar</button>}</h4>
          {loadingItems ? <p>Cargando...</p> : (
            <table className="admin-table pedido-items" style={{ marginBottom: 12 }}>
              <thead><tr><th>Producto</th><th style={{width:60}}>Cant</th><th style={{width:80}}>Precio</th><th style={{width:80}}>Subtotal</th>{editing && <th style={{width:40}}></th>}</tr></thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx}>
                    <td><ItemProd id={i.producto_id || i.id} nombre={itemName(i)} imagen={i.imagen} sub={i.variante_combinacion || null} /></td>
                    <td>{editing ? <input type="number" value={i.qty} onChange={e => setItems(items.map((it, j) => j === idx ? { ...it, qty: Number(e.target.value) } : it))} style={{ width: 50 }} /> : i.qty}</td>
                    <td>{editing ? <input type="number" value={i.precio_unitario} onChange={e => setItems(items.map((it, j) => j === idx ? { ...it, precio_unitario: Number(e.target.value) } : it))} style={{ width: 70 }} /> : (Number(i.precio_base) > Number(i.precio_unitario) ? <div><span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 12 }}>{fmtARS(i.precio_base)}</span> <span style={{ fontWeight: 700 }}>{fmtARS(i.precio_unitario)}</span><div style={{ fontSize: 11, color: 'var(--success)' }}>-{Math.round((1 - Number(i.precio_unitario) / Number(i.precio_base)) * 100)}% aplicado</div></div> : fmtARS(i.precio_unitario))}</td>
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
                  {searchResults.map(p => <div key={p.id} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 8, alignItems: 'center' }} onClick={() => addItem(p)}>{p.imagen ? <img src={p.imagen} alt="" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} /> : <span><Package size={15} style={{ verticalAlign: '-2px' }} /></span>}<span style={{ flex: 1 }}>{p.nombre || p.modelo} — {p.categoria}{p.seccion_nombre ? ` · ${p.seccion_nombre}` : ''} — ${fmt(p.precio_base)}</span></div>)}
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
            {!editing && Number(o.descuento) > 0 && <div style={{ fontSize: 12, color: 'var(--success)' }}>Descuento: -{fmtARS(Number(o.descuento))}</div>}
            {envioPed > 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Envío: +{fmtARS(envioPed)}</div> : envioACotizar ? <div style={{ fontSize: 12, color: 'var(--warning, #f59e0b)', fontWeight: 700 }}>Envío: a cotizar</div> : null}
            <div style={{ fontSize: 18, fontWeight: 700 }}>Total: {fmtARS(editing ? editTotal : totalPedido)}</div>
          </div>

          {/* PAGO: un solo lugar — estado, pagos cargados, cargar seña / pago / cobrar todo */}
          <div className="pago-blk" ref={pagoRef}>
            <div className="pago-blk-head">
              <span>Pago</span>
              <span className={`pago-chip ${epActual}`}>{EP_LABEL[epActual] || epActual}</span>
            </div>
            {cantPagos > 0 && (
              <>
                <ol className="cta-ped-lista">
                  {senaSinDetalle > 0 && <li><span>Seña</span><span>sin fecha</span><strong>{fmtARS(senaSinDetalle)}</strong><i /></li>}
                  {pagos.map((p, i) => { const n = i + (senaSinDetalle > 0 ? 1 : 0); const dif = Number(p.cuenta_como || 0) - Number(p.recibido || 0); return (
                    <li key={p.id}>
                      <span>{n === 0 ? (restaCta > 0.01 || cantPagos > 1 ? 'Seña' : 'Pago') : `Pago ${n + 1}`}</span>
                      <span>{fechaCorta(p.created_at)}{p.metodo ? ` · ${p.metodo}` : ''}{Number(p.ajuste_pct) ? ` (${Number(p.ajuste_pct) > 0 ? '+' : ''}${p.ajuste_pct}%)` : ''}{p.nota ? ` · ${p.nota}` : ''}</span>
                      <strong>{fmtARS(p.recibido)}{Math.abs(dif) > 0.01 && <small>salda {fmtARS(p.cuenta_como)}</small>}</strong>
                      <button className="pago-quitar" onClick={() => quitarPago(p.id)} aria-label="Quitar pago" title="Quitar pago"><X size={14} /></button>
                    </li>); })}
                </ol>
                <div className="pago-tot">
                  <span>Pagado <strong className="ok">{fmtARS(pagadoCta)}</strong></span>
                  {restaCta > 0.01 ? <span>Resta <strong className="debe">{fmtARS(restaCta)}</strong></span> : <strong className="ok">Pagado completo</strong>}
                </div>
                <div className="cta-ped-barra"><span style={{ width: `${pctCta}%` }} /></div>
                {Math.abs(totalRecibido - totalSaldado) > 0.01 && <small className="cta-ped-nota">Plata recibida: {fmtARS(totalRecibido)} (con recargos/descuentos).</small>}
              </>
            )}
            {marcadoPagado && <div className="cta-ped-nota">Marcado como pagado sin registrar el cobro. <button className="pago-link" onClick={() => cambiarEstadoPagoManual('impago')}>Volver a impago</button></div>}
            {o.estado_pago === 'debe' && cantPagos === 0 && <div className="cta-ped-nota">Quedó como "Debe" (fiado). <button className="pago-link" onClick={() => cambiarEstadoPagoManual('impago')}>Quitar</button></div>}
            {restaCta > 0.01 && (
              <>
                <div className="pago-form">
                  <select value={nuevoPago.metodo} onChange={e => onMetodoPago(e.target.value)} aria-label="Método de pago">
                    <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="débito">Débito</option><option value="crédito">Crédito</option><option value="mercadopago">MercadoPago</option><option value="otro">Otro</option>
                  </select>
                  <input ref={montoRef} type="number" inputMode="numeric" min="0" placeholder={cantPagos ? 'Monto de hoy' : 'Monto'} value={nuevoPago.cuenta_como} onChange={e => setNuevoPago({ ...nuevoPago, cuenta_como: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') registrarPago(); }} />
                  <input className="pago-ajuste" type="number" value={nuevoPago.ajuste_pct || ''} onChange={e => setNuevoPago({ ...nuevoPago, ajuste_pct: e.target.value })} placeholder="Ajuste %" title="Ajuste %: negativo = descuento, positivo = recargo" />
                  <button className="btn btn-primary btn-sm" onClick={() => registrarPago()} disabled={guardandoPago}><Plus size={14} style={{ verticalAlign: '-2px' }} /> {guardandoPago ? 'Guardando...' : (cantPagos ? 'Sumar pago' : 'Cargar pago')}</button>
                </div>
                {Number(nuevoPago.cuenta_como) > 0 && previewRecibido !== Number(nuevoPago.cuenta_como) && (
                  <div className="cta-ped-nota">Cobrale <strong>{fmtARS(previewRecibido)}</strong> en {nuevoPago.metodo} (salda {fmtARS(Number(nuevoPago.cuenta_como))} del pedido).</div>
                )}
                <div className="cta-ped-acciones">
                  <button className="btn btn-outline btn-sm" onClick={() => registrarPago(Math.round(restaCta * 100) / 100)} disabled={guardandoPago}>Cobrar todo ({fmtARS(restaCta)})</button>
                  {o.estado_pago !== 'debe' && cantPagos === 0 && <button className="btn btn-outline btn-sm" onClick={() => cambiarEstadoPagoManual('debe')}>Dejar como "Debe" (fiado)</button>}
                  {cantPagos > 0 && <button className="btn btn-outline btn-sm" onClick={enviarResumen}><MessageCircle size={14} style={{ verticalAlign: '-2px' }} /> Enviar resumen</button>}
                </div>
                <small className="cta-ped-nota">Si paga una parte, queda como <strong>Señado</strong> y se va descontando con cada pago.</small>
              </>
            )}
            {restaCta <= 0.01 && cantPagos > 0 && <div className="cta-ped-acciones"><button className="btn btn-outline btn-sm" onClick={enviarResumen}><MessageCircle size={14} style={{ verticalAlign: '-2px' }} /> Enviar resumen</button></div>}
          </div>

          {/* HISTORIAL DE CAMBIOS (auditoría: quién cambió el estado y cuándo) */}
          {historial.length > 0 && (
            <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}><History size={15} style={{ verticalAlign: '-2px' }} /> Historial de cambios</div>
              {historial.map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span>{h.detalle}</span>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {h.usuario_nombre} · {new Date(h.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
          {o.notas && <p style={{ fontSize: 13 }}><FileText size={15} style={{ verticalAlign: '-2px' }} /> {o.notas}</p>}
          {o.cupon_codigo && <p style={{ fontSize: 13 }}><Ticket size={15} style={{ verticalAlign: '-2px' }} /> Cupón: {o.cupon_codigo}</p>}

          {/* Datos de entrega y facturación del checkout */}
          {(datosEnvio || datosFact) && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, lineHeight: 1.6 }}>
              {datosEnvio?.contacto && (datosEnvio.contacto.nombre || datosEnvio.contacto.telefono) && (
                <div style={{ marginBottom: datosEnvio?.entrega ? 8 : 0 }}>
                  <strong><User size={15} style={{ verticalAlign: '-2px' }} /> Contacto:</strong> {datosEnvio.contacto.nombre}{datosEnvio.contacto.telefono ? ` · ${datosEnvio.contacto.telefono}` : ''}{datosEnvio.contacto.email ? ` · ${datosEnvio.contacto.email}` : ''}
                </div>
              )}
              {datosEnvio?.entrega && (
                <div style={{ marginBottom: datosFact ? 8 : 0 }}>
                  <strong>{datosEnvio.entrega.tipo === 'envio' ? <><Package size={14} /> Envío a:</> : <><Store size={14} /> Retiro en el local</>}</strong>
                  {datosEnvio.entrega.tipo === 'envio' && (
                    <span> {datosEnvio.entrega.calle} {datosEnvio.entrega.numero}{datosEnvio.entrega.piso ? `, ${datosEnvio.entrega.piso}` : ''}, {datosEnvio.entrega.localidad} (CP {datosEnvio.entrega.cp}){datosEnvio.entrega.dni ? ` · DNI ${datosEnvio.entrega.dni}` : ''}</span>
                  )}
                </div>
              )}
              {datosFact && (
                <div style={{ paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                  <strong><Receipt size={15} style={{ verticalAlign: '-2px' }} /> Facturación:</strong> {datosFact.razon_social} · {datosFact.cuit_dni}
                  {datosFact.condicion_iva && <span> · {datosFact.condicion_iva.replace(/_/g, ' ')}</span>}
                  {datosFact.domicilio_fiscal && <div style={{ color: 'var(--text-muted)' }}>Domicilio fiscal: {datosFact.domicilio_fiscal}</div>}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="btn btn-outline btn-sm" onClick={() => printOrder('A4')}><Ico n="printer" s={15} /> Remito A4</button>
            <select className="btn btn-outline btn-sm" defaultValue="" onChange={e => { if (e.target.value) { printOrder(e.target.value); e.target.value = ''; } }} style={{ cursor: 'pointer' }}>
              <option value=""><Printer size={15} style={{ verticalAlign: '-2px' }} /> Térmica...</option>
              <option value="50mm">Térmica 50mm</option>
              <option value="58mm">Térmica 58mm</option>
              <option value="80mm">Térmica 80mm</option>
              <option value="100mm">Térmica 100mm</option>
            </select>
            <button className="btn btn-outline btn-sm" onClick={cloneOrder}><ClipboardList size={15} style={{ verticalAlign: '-2px' }} /> Duplicar</button>
            {o.tipo === 'presupuesto' && <button className="btn btn-success btn-sm" onClick={async () => {
              try {
                const val = await api.validarConversion(o.id);
                if (val.tiene_cambios) {
                  const msgs = val.cambios.map(c => {
                    if (c.tipo === 'eliminado') return `${c.item}: ${c.detalle}`;
                    if (c.tipo === 'stock') return `${c.item}: ${c.detalle}`;
                    if (c.tipo === 'precio') return `${c.item}: ${c.detalle}`;
                    return c.detalle;
                  }).join('\n');
                  if (!window.confirm(`Hay cambios desde que se creó el presupuesto:\n\n${msgs}\n\n¿Convertir a pedido de todas formas?`)) return;
                }
                await api.updatePedido(o.id, { tipo: 'pedido', estado: 'pendiente' });
                toast('Convertido a pedido'); onClose();
              } catch (e) { toast(e.message, 'error'); }
            }}>✓ Convertir a pedido</button>}
            {o.tipo === 'pedido' && <button className="btn btn-outline btn-sm" onClick={async () => { if (!confirm('¿Volver este pedido a presupuesto? Se devolverá el stock descontado.')) return; try { await api.updatePedido(o.id, { tipo: 'presupuesto', estado: 'pendiente' }); toast('Volvió a presupuesto'); onClose(); } catch (e) { toast(e.message, 'error'); } }}>↩ Volver a presupuesto</button>}
            {(o.usuario_telefono) && <button className="btn btn-outline btn-sm" onClick={() => { const tel = (o.usuario_telefono || '').replace(/\D/g, ''); const num = tel.startsWith('54') ? tel : `54${tel}`; openWA(num, `Hola ${o.usuario_nombre || ''}, respecto a tu pedido #${o.id}:`); }}><Smartphone size={15} style={{ verticalAlign: '-2px' }} /> WhatsApp</button>}
            <button className="btn btn-outline btn-sm" onClick={async () => { try { await api.archivarPedido(o.id); toast('Archivado'); onClose(); } catch (e) { toast(e.message, 'error'); } }}><Archive size={15} style={{ verticalAlign: '-2px' }} /> Archivar</button>
            <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar este pedido?')) return; try { await api.deletePedido(o.id); toast('Eliminado'); onClose(); } catch (e) { toast(e.message, 'error'); } }}><Trash2 size={15} style={{ verticalAlign: '-2px' }} /> Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: Usuarios (full modal: edit, approve with lista, subadmin perms) ───
function AdminUsuarios() {
  const { toast, listas, config, setConfig, design } = useContext(Ctx);
  const [users, setUsers] = useState([]);
  const [busq, setBusq] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [filtroCli, setFiltroCli] = useState('todos');
  const [ordenCli, setOrdenCli] = useState('recientes');
  const aprobReq = config.registro_requiere_aprobacion === 'true';
  const toggleAprob = async () => {
    const nuevo = aprobReq ? 'false' : 'true';
    try { await api.updateConfig({ registro_requiere_aprobacion: nuevo }); setConfig({ ...config, registro_requiere_aprobacion: nuevo }); toast(nuevo === 'true' ? 'Los registros nuevos van a requerir aprobación' : 'Los registros nuevos entran directo (sin aprobación)'); } catch (e) { toast(e.message, 'error'); }
  };

  // Búsqueda con espera (no consulta en cada letra)
  useEffect(() => { const t = setTimeout(() => { api.getUsuarios(busq).then(setUsers).catch(() => {}); }, 300); return () => clearTimeout(t); }, [busq]);
  const refresh = () => api.getUsuarios(busq).then(setUsers);

  const esEquipo = (u) => u.rol === 'admin' || u.rol === 'subadmin';
  const estadoDe = (u) => u.aprobado === false ? 'pendiente' : (u.activo ? 'activo' : 'suspendido');
  const nombreLista = (id) => listas.find(l => l.id === id)?.nombre || '';
  const conteo = {
    todos: users.length,
    compradores: users.filter(u => !esEquipo(u) && u.compras > 0).length,
    sin_compras: users.filter(u => !esEquipo(u) && !(u.compras > 0)).length,
    con_lista: users.filter(u => !esEquipo(u) && u.lista_precio_id).length,
    pendientes: users.filter(u => estadoDe(u) === 'pendiente').length,
    mayoristas: users.filter(u => !esEquipo(u) && u.mayorista).length,
    piden_mayorista: users.filter(u => !esEquipo(u) && !u.mayorista && u.mayorista_solicitado_at).length,
    suspendidos: users.filter(u => estadoDe(u) === 'suspendido').length,
    equipo: users.filter(esEquipo).length,
  };
  const filtros = [['todos', 'Todos'], ['piden_mayorista', 'Piden mayorista'], ['mayoristas', 'Mayoristas'], ['compradores', 'Compraron'], ['sin_compras', 'Sin compras'], ['con_lista', 'Con lista de precio'], ['pendientes', 'Pendientes'], ['suspendidos', 'Suspendidos'], ['equipo', 'Equipo']];
  const siempreVisibles = ['todos', 'piden_mayorista', 'mayoristas'];
  const lista = users.filter(u => {
    if (filtroCli === 'compradores') return !esEquipo(u) && u.compras > 0;
    if (filtroCli === 'sin_compras') return !esEquipo(u) && !(u.compras > 0);
    if (filtroCli === 'con_lista') return !esEquipo(u) && !!u.lista_precio_id;
    if (filtroCli === 'pendientes') return estadoDe(u) === 'pendiente';
    if (filtroCli === 'mayoristas') return !esEquipo(u) && !!u.mayorista;
    if (filtroCli === 'piden_mayorista') return !esEquipo(u) && !u.mayorista && !!u.mayorista_solicitado_at;
    if (filtroCli === 'suspendidos') return estadoDe(u) === 'suspendido';
    if (filtroCli === 'equipo') return esEquipo(u);
    return true;
  }).sort((a, b) => {
    if (ordenCli === 'gastado') return (b.total_gastado || 0) - (a.total_gastado || 0);
    if (ordenCli === 'compras') return (b.compras || 0) - (a.compras || 0);
    if (ordenCli === 'ultima') return new Date(b.ultima_compra || 0) - new Date(a.ultima_compra || 0);
    if (ordenCli === 'nombre') return String(a.nombre || '').localeCompare(String(b.nombre || ''));
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  const haceCuanto = (f) => { if (!f) return ''; const d = Math.floor((Date.now() - new Date(f).getTime()) / 86400000); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d < 30 ? `hace ${d} días` : d < 365 ? `hace ${Math.floor(d / 30)} mes${Math.floor(d / 30) > 1 ? 'es' : ''}` : `hace ${Math.floor(d / 365)} año${Math.floor(d / 365) > 1 ? 's' : ''}`; };

  const exportar = async () => {
    try {
      const XLSX = await import('xlsx');
      const filas = lista.map(u => ({
        Nombre: u.nombre || '', Usuario: u.usuario || '', 'Nombre de fantasía': u.nombre_fantasia || '', Teléfono: u.telefono || '', Email: u.email || '', Dirección: u.direccion || '',
        Rol: u.rol || '', Estado: estadoDe(u), 'Lista de precio': nombreLista(u.lista_precio_id), Revendedor: u.es_revendedor ? 'Sí' : 'No',
        Compras: u.compras || 0, 'Total comprado': Number(u.total_gastado) || 0, 'Total pagado': Number(u.total_pagado) || 0,
        'Última compra': u.ultima_compra ? new Date(u.ultima_compra).toLocaleDateString('es-AR') : '', Alta: u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '',
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Clientes');
      XLSX.writeFile(wb, `clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast(`${filas.length} clientes exportados`);
    } catch (e) { toast('No se pudo exportar: ' + e.message, 'error'); }
  };

  return (
    <div>
      <div className="cli-head">
        <h3>Clientes <span className="cli-count">{users.length}</span></h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-outline btn-sm" onClick={exportar} disabled={!lista.length}><BarChart3 size={15} /> Exportar Excel</button>
          <button className="btn btn-primary btn-sm" onClick={() => setEditUser({ _isNew: true })}>+ Nuevo</button>
        </div>
      </div>
      {conteo.piden_mayorista > 0 && filtroCli !== 'piden_mayorista' && (
        <button type="button" className="cli-aviso-may" onClick={() => setFiltroCli('piden_mayorista')}>
          <Lock size={16} /> <span><b>{conteo.piden_mayorista} {conteo.piden_mayorista === 1 ? 'cliente pide' : 'clientes piden'} acceso mayorista</b> · tocá para ver y autorizar</span>
        </button>
      )}
      <div className="card" style={{ padding: 12, marginBottom: 12, borderLeft: '3px solid var(--primary)' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={aprobReq} onChange={toggleAprob} style={{ marginTop: 3 }} />
          <span><b>Requerir aprobación para registros nuevos</b><br /><small style={{ color: 'var(--text-muted)' }}>Apagado (recomendado): cualquiera que se registre puede comprar al toque. La sección <b>Mayorista</b> sigue con su candado aparte, así que solo esa pide aprobación.</small></span>
        </label>
      </div>
      <div className="cli-tools">
        <input placeholder="Buscar por nombre, usuario, teléfono o email…" value={busq} onChange={e => setBusq(e.target.value)} className="cli-busq" />
        <select value={ordenCli} onChange={e => setOrdenCli(e.target.value)} aria-label="Ordenar">
          <option value="recientes">Más nuevos</option>
          <option value="gastado">Más compraron ($)</option>
          <option value="compras">Más pedidos</option>
          <option value="ultima">Compra más reciente</option>
          <option value="nombre">Nombre A-Z</option>
        </select>
      </div>
      <div className="cat-chips" style={{ marginBottom: 8 }}>
        {filtros.filter(([k]) => siempreVisibles.includes(k) || conteo[k] > 0).map(([k, t]) => <button key={k} className={`cat-chip${filtroCli === k ? ' sel' : ''}${k === 'piden_mayorista' && conteo[k] > 0 ? ' alerta' : ''}`} onClick={() => setFiltroCli(k)}>{t} <span className="chip-n">{conteo[k]}</span></button>)}
      </div>
      {filtroCli === 'piden_mayorista' && conteo.piden_mayorista === 0 && <p className="cli-ayuda">Todavía nadie pidió acceso. Cuando un cliente entra a Mayorista y toca "Solicitar acceso mayorista", aparece acá y lo aprobás con "Autorizar". También podés abrir cualquier cliente y marcar "Cliente mayorista".</p>}
      {lista.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No hay clientes con este filtro</p>}
      {lista.map(u => {
        const est = estadoDe(u);
        return (
          <div key={u.id} className="card cli-row" onClick={() => setEditUser(u)}>
            <div className="cli-main">
              <div className="cli-avatar">{String(u.nombre || u.usuario || '?').trim().charAt(0).toUpperCase()}</div>
              <div className="cli-info">
                <div className="cli-nombre">{u.nombre || u.usuario}{u.nombre_fantasia && <span className="cli-fant"> · {u.nombre_fantasia}</span>}{u.notas_admin && <FileText size={13} style={{ marginLeft: 6, color: 'var(--primary)', verticalAlign: '-2px' }} />}</div>
                <div className="cli-sub">@{u.usuario}{u.telefono ? ` · ${u.telefono}` : ''}{u.email ? ` · ${u.email}` : ''}</div>
                <div className="cli-tags">
                  {est !== 'activo' && <span className={`cli-tag ${est}`}>{est}</span>}
                  {esEquipo(u) && <span className="cli-tag equipo">{u.rol === 'admin' ? 'Admin' : 'Empleado'}</span>}
                  {u.lista_precio_id && nombreLista(u.lista_precio_id) && <span className="cli-tag lista" style={{ '--c': listas.find(l => l.id === u.lista_precio_id)?.color || 'var(--primary)' }}>{nombreLista(u.lista_precio_id)}</span>}
                  {u.es_revendedor && <span className="cli-tag lista">Revendedor {Number(u.descuento_revendedor) > 0 ? `-${Number(u.descuento_revendedor)}%` : ''}</span>}
                  {u.mayorista && <span className="cli-tag may">Mayorista</span>}
                  {!u.mayorista && u.mayorista_solicitado_at && !esEquipo(u) && <button type="button" className="cli-tag pide" onClick={async e => { e.stopPropagation(); try { await api.updateUsuario(u.id, { mayorista: true }); toast(`${u.nombre || u.usuario} ya puede ver la lista mayorista`); refresh(); } catch (er) { toast(er.message, 'error'); } }} title="Autorizar">Pide mayorista · Autorizar</button>}
                </div>
              </div>
            </div>
            {!esEquipo(u) && (
              <div className="cli-stats">
                <div><b>{u.compras || 0}</b><span>pedido{u.compras === 1 ? '' : 's'}</span></div>
                <div><b>{fmtARS(u.total_gastado || 0)}</b><span>comprado</span></div>
                <div><b>{u.ultima_compra ? haceCuanto(u.ultima_compra) : '—'}</b><span>última compra</span></div>
              </div>
            )}
            {u.telefono && <button className="btn btn-sm cli-wa" onClick={(e) => { e.stopPropagation(); const saludo = `Hola ${u.nombre || ''}, te contacto de ${design?.nombre_tienda || config.nombre_tienda || 'la tienda'}.`; const d = String(u.telefono).replace(/\D/g, ''); window.open(waLink(d.startsWith('54') ? d : '54' + d, saludo), '_blank'); }} title="Escribirle por WhatsApp" aria-label="Escribirle por WhatsApp"><MessageCircle size={16} /></button>}
          </div>
        );
      })}
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
    ? { nombre: '', usuario: '', password: '', telefono: '', email: '', direccion: '', rol: 'cliente', lista_precio_id: listas[0]?.id || '', nombre_fantasia: '', notas_admin: '', permisos: '', activo: true, es_revendedor: false, descuento_revendedor: 0, mayorista: false }
    : { nombre: u.nombre || '', usuario: u.usuario || '', password: '', telefono: u.telefono || '', email: u.email || '', direccion: u.direccion || '', rol: u.rol || 'cliente', lista_precio_id: u.lista_precio_id || '', nombre_fantasia: u.nombre_fantasia || '', notas_admin: u.notas_admin || '', permisos: u.permisos || '', activo: u.activo ?? true, es_revendedor: u.es_revendedor || false, descuento_revendedor: u.descuento_revendedor || 0, mayorista: !!u.mayorista }
  );
  const [sv, setSv] = useState(false);
  const [hist, setHist] = useState(null);
  const [showHist, setShowHist] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [cta, setCta] = useState(null);
  const [movForm, setMovForm] = useState({ tipo: 'cargo', monto: '', concepto: '' });
  const loadCta = () => { if (u.id) api.getCuentaCorriente(u.id).then(setCta).catch(() => {}); };
  useEffect(() => { if (showCta && !cta) loadCta(); }, [showCta]);
  const addMov = async () => {
    if (!movForm.monto) { toast('Poné un monto', 'error'); return; }
    try { await api.addMovimientoCuenta(u.id, movForm.tipo, Number(movForm.monto), movForm.concepto); setMovForm({ tipo: 'cargo', monto: '', concepto: '' }); setCta(null); loadCta(); toast('Movimiento registrado'); }
    catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => {
    if (!isNew && u.id && showHist && !hist) api.getHistorialCliente(u.id).then(setHist).catch(() => {});
  }, [showHist]);

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
      await api.aprobarUsuario(u.id, lid); toast('Aprobado');
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
              <button className="btn btn-danger btn-sm" onClick={rechazar} disabled={sv} style={{ marginTop: 8 }}><XCircle size={15} style={{ verticalAlign: '-2px' }} /> Rechazar</button>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={!!f.mayorista} onChange={e => setF({ ...f, mayorista: e.target.checked })} /> Cliente mayorista (ve y compra la lista mayorista){!f.mayorista && u.mayorista_solicitado_at ? <span className="cli-tag pide" style={{ marginLeft: 6 }}>Lo pidió</span> : null}</label>
          </div>
          <div className="form-row" style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={f.es_revendedor} onChange={e => setF({ ...f, es_revendedor: e.target.checked })} /> Es revendedor</label>
            {f.es_revendedor && <div className="form-group"><label className="form-label">Descuento %</label><input type="number" value={f.descuento_revendedor} onChange={e => setF({ ...f, descuento_revendedor: Number(e.target.value) })} style={{ width: 80 }} /></div>}
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas internas (solo admin)</label><textarea value={f.notas_admin} onChange={e => setF({ ...f, notas_admin: e.target.value })} rows={2} placeholder="Ej: Paga a 30 días, viene los viernes..." /></div>
          {!isNew && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}><input type="checkbox" checked={f.activo !== false} onChange={e => setF({ ...f, activo: e.target.checked })} /> {f.activo !== false ? <><CheckCircle size={14} /> Cuenta activa</> : <><XCircle size={14} /> Cuenta suspendida</>}</label>
          )}
        </div>
        {!isNew && showHist && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, margin: '12px 0' }}>
            {!hist ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando historial...</p> : (
              <>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total comprado</div><div style={{ fontWeight: 900, fontSize: 18, color: 'var(--success)' }}>{fmtARS(hist.resumen.totalGastado)}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pedidos</div><div style={{ fontWeight: 900, fontSize: 18 }}>{hist.resumen.cantPedidos}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Presupuestos</div><div style={{ fontWeight: 900, fontSize: 18 }}>{hist.resumen.cantPresup}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Última compra</div><div style={{ fontWeight: 700, fontSize: 14 }}>{hist.resumen.ultimaCompra ? new Date(hist.resumen.ultimaCompra).toLocaleDateString('es-AR') : '—'}</div></div>
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {hist.pedidos.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin movimientos</p> : hist.pedidos.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                      <span>{numOrden(p)} <span style={{ color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</span> {p.seccion_nombre && <span style={{ fontSize: 10, background: p.seccion_color || 'var(--border)', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>{p.seccion_nombre}</span>}</span>
                      <span style={{ fontWeight: 700 }}>{fmtARS(p.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {!isNew && showCta && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, margin: '12px 0' }}>
            {!cta ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando cuenta...</p> : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Saldo actual</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: cta.saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>{cta.saldo > 0 ? `Debe ${fmtARS(cta.saldo)}` : cta.saldo < 0 ? `A favor ${fmtARS(-cta.saldo)}` : 'Al día'}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <select value={movForm.tipo} onChange={e => setMovForm({ ...movForm, tipo: e.target.value })} style={{ width: 110 }}>
                    <option value="cargo">Cargo (debe)</option>
                    <option value="pago">Pago (a favor)</option>
                  </select>
                  <input type="number" placeholder="Monto" value={movForm.monto} onChange={e => setMovForm({ ...movForm, monto: e.target.value })} style={{ width: 100 }} />
                  <input placeholder="Concepto" value={movForm.concepto} onChange={e => setMovForm({ ...movForm, concepto: e.target.value })} style={{ flex: 1, minWidth: 120 }} />
                  <button className="btn btn-primary btn-sm" onClick={addMov}>Agregar</button>
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {cta.movimientos.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin movimientos</p> : cta.movimientos.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                      <span>{new Date(m.created_at).toLocaleDateString('es-AR')} · {m.concepto || (m.tipo === 'cargo' ? 'Cargo' : 'Pago')}{m.pedido_id && <span style={{ fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4, marginLeft: 6 }}>{m.pedido_tipo === 'presupuesto' ? 'P' : '#'}{String(m.pedido_id).padStart(4, '0')}</span>}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <b style={{ color: m.tipo === 'cargo' ? 'var(--danger)' : 'var(--success)' }}>{m.tipo === 'cargo' ? '+' : '-'}{fmtARS(m.monto)}</b>
                        <button onClick={async () => { try { await api.deleteMovimientoCuenta(m.id); setCta(null); loadCta(); } catch (e) { toast(e.message, 'error'); } }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div className="modal-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
          {!isNew && (
            <>
            <button className="btn btn-outline btn-sm" onClick={() => setShowHist(!showHist)}>{showHist ? 'Ocultar historial' : <><BarChart3 size={14} /> Ver historial</>}</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowCta(!showCta)}>{showCta ? 'Ocultar cuenta' : <><CreditCard size={14} /> Cuenta corriente</>}</button>
            </>
          )}
          {!isNew && (
            <button className="btn btn-outline btn-sm" onClick={async () => { if (!window.confirm(`¿Generar una contraseña temporal nueva para ${u.nombre || u.usuario}?`)) return; try { const r = await api.resetPasswordAdmin(u.id); window.prompt('Contraseña temporal (copiala y pasásela al cliente). Después la puede cambiar en Mi cuenta:', r.codigo); if (r.telefono && window.confirm('¿Mandársela por WhatsApp?')) { openWA(`54${r.telefono.replace(/\D/g, '')}`, `Hola ${r.nombre || ''}, tu contraseña temporal es: ${r.codigo} . Podés cambiarla desde Mi cuenta.`); } } catch (e) { toast(e.message, 'error'); } }} style={{ marginRight: 'auto' }}>Resetear contraseña</button>
          )}
          {!isNew && (
            <button className="btn btn-outline btn-sm" onClick={async () => {
              const desactivar = f.activo;
              if (!confirm(desactivar ? `¿Sacarle el acceso a ${u.nombre}? No va a poder entrar, pero se conserva su historial. Podés reactivarlo cuando quieras.` : `¿Reactivar el acceso de ${u.nombre}?`)) return;
              try { await api.suspenderUsuario(u.id, !desactivar); setF({ ...f, activo: !desactivar }); toast(desactivar ? 'Acceso desactivado' : 'Acceso reactivado'); } catch (e) { toast(e.message, 'error'); }
            }}>{f.activo ? <><Ban size={14} /> Sacar acceso</> : <><CheckCircle size={14} /> Dar acceso</>}</button>
          )}
          {!isNew && (
            <button className="btn btn-danger btn-sm" onClick={async () => {
              if (!confirm(`¿ELIMINAR a ${u.nombre} por completo?\n\nATENCIÓN: esto borra el usuario Y todos sus pedidos/historial. No se puede deshacer.\n\nSi solo querés sacarle el acceso, usá "Sacar acceso" en su lugar.`)) return;
              if (!confirm('Última confirmación: se borra todo de este cliente. ¿Seguro?')) return;
              try { await api.deleteUsuario(u.id); toast('Usuario eliminado'); onClose(true); } catch (e) { toast(e.message, 'error'); }
            }}><Trash2 size={15} style={{ verticalAlign: '-2px' }} /> Eliminar</button>
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
              <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar?')) return; try { await api.deleteLista(l.id); toast('Eliminado'); refresh(); } catch (e) { toast(e.message, 'error'); } }}><Ico n="trash" s={15} /></button>
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
function AdminNotifStock() {
  const { toast } = useContext(Ctx);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setNotifs(await api.getNotificacionesStock() || []); } catch (e) { toast(e.message, 'error'); } setLoading(false); };
  useEffect(() => { load(); }, []);
  const avisar = async (id) => { try { await api.avisarNotificacionStock(id); toast('Marcado como avisado'); load(); } catch (e) { toast(e.message, 'error'); } };
  const borrar = async (id) => { try { await api.deleteNotificacionStock(id); load(); } catch (e) { toast(e.message, 'error'); } };

  // Agrupar por producto
  const porProducto = {};
  notifs.forEach(n => { const k = n.producto_id; if (!porProducto[k]) porProducto[k] = { nombre: n.nombre || n.modelo, stock: n.stock, esperando: [] }; porProducto[k].esperando.push(n); });

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Avisos de stock ({notifs.length})</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Clientes que pidieron que les avises cuando vuelva un producto. Cuando repongas stock, contactalos y marcá el aviso.</p>

      {notifs.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No hay avisos pendientes</p> : Object.entries(porProducto).map(([pid, g]) => (
        <div key={pid} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{g.nombre}</strong>
            <span style={{ fontSize: 12, color: g.stock > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>Stock actual: {g.stock ?? 0} {g.stock > 0 && '✓ ¡disponible!'}</span>
          </div>
          {g.esperando.map(n => (
            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--border-light)', fontSize: 13 }}>
              <span>{n.canal === 'whatsapp' ? `${n.telefono}` : n.email} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleDateString('es-AR')}</span></span>
              <div style={{ display: 'flex', gap: 6 }}>
                {n.canal === 'whatsapp' && n.telefono
                  ? <button className="btn btn-success btn-sm" onClick={() => { const t = waIntl(n.telefono); window.open(`https://wa.me/${t}?text=${encodeURIComponent(`¡Hola! El producto ${g.nombre} que esperabas ya está disponible. ¿Lo querés?`)}`, '_blank'); }}>WhatsApp</button>
                  : <a href={`mailto:${n.email}?subject=¡Volvió el stock!&body=Hola, el producto ${g.nombre} que esperabas ya está disponible.`} className="btn btn-success btn-sm" style={{ textDecoration: 'none' }}>Email</a>}
                <button className="btn btn-outline btn-sm" onClick={() => avisar(n.id)}>✓ Avisado</button>
                <button className="btn btn-danger btn-sm" onClick={() => borrar(n.id)}><Trash2 size={15} style={{ verticalAlign: '-2px' }} /></button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AdminCaja() {
  const { toast } = useContext(Ctx);
  const hoy = new Date().toISOString().slice(0, 10);
  const [periodo, setPeriodo] = useState('dia');
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const rangoDe = (per) => {
    const now = new Date(); let d = new Date(now);
    if (per === 'dia') d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (per === 'semana') { const day = now.getDay() || 7; d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1); }
    else if (per === 'mes') d = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (per === 'anio') d = new Date(now.getFullYear(), 0, 1);
    return d.toISOString().slice(0, 10);
  };
  const setPer = (per) => { setPeriodo(per); if (per !== 'custom') { setDesde(rangoDe(per)); setHasta(hoy); } };
  const cargar = async () => {
    setLoading(true);
    try { const r = await api.getCaja(desde ? `${desde}T00:00:00` : '', hasta ? `${hasta}T23:59:59` : ''); setData(r); }
    catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  };
  useEffect(() => { cargar(); }, [desde, hasta]);
  const totalRecibido = Number(data?.total_recibido || 0);
  const descuentos = Number(data?.descuentos || 0);
  const recargos = Number(data?.recargos || 0);
  const totalVendido = Number(data?.total_saldado || 0);
  return (
    <div style={{ maxWidth: 700 }}>
      <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Caja / Arqueo</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Plata real cobrada (online + mostrador). Para cerrar la caja del día.</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {[['dia','Hoy'],['semana','Esta semana'],['mes','Este mes'],['anio','Este año'],['custom','Personalizado']].map(([id,lbl]) => (
          <button key={id} className={`btn btn-sm ${periodo === id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPer(id)}>{lbl}</button>
        ))}
      </div>
      {periodo === 'custom' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Desde</label><input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hasta</label><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
        </div>
      )}
      {loading ? <p>Cargando...</p> : data && (
        <>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total real cobrado (lo que entró)</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--success)' }}>{fmtARS(totalRecibido)}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Cobrado por método (plata real)</div>
            {(!data.porMetodo || !data.porMetodo.length) ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin cobros en este período.</p> : data.porMetodo.map(m => (
              <div key={m.metodo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--border-light)', textTransform: 'capitalize' }}>
                <span>{m.metodo}</span><strong>{fmtARS(m.recibido)}</strong>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Ajustes del período</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
              <span>Descuentos otorgados</span><strong style={{ color: 'var(--success)' }}>-{fmtARS(descuentos)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
              <span>Recargos cobrados</span><strong style={{ color: 'var(--accent)' }}>+{fmtARS(recargos)}</strong>
            </div>
          </div>
          <div style={{ background: 'var(--border-light)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '3px 0' }}>
              <span>Total vendido (deuda saldada)</span><span>{fmtARS(totalVendido)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, padding: '3px 0', borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 8 }}>
              <span>En caja (plata real)</span><span style={{ color: 'var(--success)' }}>{fmtARS(totalRecibido)}</span>
            </div>
            <small style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginTop: 8 }}>La diferencia entre "vendido" y "en caja" son los descuentos que otorgaste. Al contar la plata física, tiene que darte el total "en caja".</small>
          </div>
          {data.usdt && ((data.usdt.total_recibido || 0) > 0 || (data.usdt.porMetodo && data.usdt.porMetodo.length > 0)) && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid #10b981', borderRadius: 12, padding: 16, marginTop: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: '#10b981' }}>Caja USDT (aparte)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, marginBottom: 6 }}><span>Total cobrado</span><strong style={{ color: '#10b981' }}>USDT {fmt(data.usdt.total_recibido || 0)}</strong></div>
              {(data.usdt.porMetodo || []).map(m => (
                <div key={m.metodo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderTop: '1px solid var(--border-light)', textTransform: 'capitalize' }}><span>{m.metodo}</span><strong>USDT {fmt(m.recibido)}</strong></div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AdminReportes() {
  const { adminSeccion, toast } = useContext(Ctx);
  const [rep, setRep] = useState(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setRep(await api.getReportes(desde, hasta, adminSeccion)); } catch (e) { toast(e.message, 'error'); } setLoading(false); };
  useEffect(() => { load(); }, [adminSeccion, desde, hasta]);

  return (
    <div style={{ maxWidth: 1100 }}>
      <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 12 }}>Reportes</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 13 }}>Desde <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ marginLeft: 4 }} /></label>
        <label style={{ fontSize: 13 }}>Hasta <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ marginLeft: 4 }} /></label>
        {(desde || hasta) && <button className="btn btn-outline btn-sm" onClick={() => { setDesde(''); setHasta(''); }}>Limpiar</button>}
      </div>

      {loading ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Cargando...</p> : !rep ? null : (
        <>
          {/* Ganancias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: 18 }}><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Facturado</div><div style={{ fontSize: 26, fontWeight: 900 }}>{fmtARS(rep.ganancias.facturado)}</div></div>
            <div className="card" style={{ padding: 18 }}><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Costo</div><div style={{ fontSize: 26, fontWeight: 900, color: 'var(--danger)' }}>{fmtARS(rep.ganancias.costo)}</div></div>
            <div className="card" style={{ padding: 18, background: 'var(--success)', color: '#fff' }}><div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, opacity: 0.9 }}>Ganancia estimada</div><div style={{ fontSize: 26, fontWeight: 900 }}>{fmtARS(rep.ganancias.ganancia)}</div></div>
          </div>
          {rep.ganancias.costo === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, marginTop: -8 }}><Lightbulb size={15} style={{ verticalAlign: '-2px' }} /> Cargá el "precio de costo" en tus productos para ver la ganancia real.</p>}

          {/* Más vendidos */}
          <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Más vendidos</h4>
          {rep.masVendidos.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Sin ventas en el período</p> : (
            <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
              {rep.masVendidos.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < rep.masVendidos.length - 1 ? '1px solid var(--border-light)' : 'none', fontSize: 13 }}>
                  <span><b style={{ color: 'var(--text-muted)', marginRight: 8 }}>{i + 1}</b>{p.nombre_producto}</span>
                  <span><b>{p.unidades}</b> u. · {fmtARS(p.facturado)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Por sección */}
          <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Ventas y ganancias por tienda</h4>
          <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
            {rep.porSeccion.map((s, i) => (
              <div key={i} style={{ padding: '12px 14px', borderBottom: i < rep.porSeccion.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>{s.seccion || 'Sin tienda'}</span>
                  <span style={{ fontSize: 13 }}>{s.pedidos} pedidos · <b>{fmtARS(s.total)}</b></span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>Facturado: {fmtARS(s.facturado)}</span>
                  <span>Costo: {fmtARS(s.costo)}</span>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>Ganancia: {fmtARS(s.ganancia)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Por mes */}
          <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Ventas por mes</h4>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {rep.porMes.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < rep.porMes.length - 1 ? '1px solid var(--border-light)' : 'none', fontSize: 13 }}>
                <span>{m.mes}</span>
                <span>{m.pedidos} pedidos · <b>{fmtARS(m.total)}</b></span>
              </div>
            ))}
          </div>
          {rep.usdt && ((rep.usdt.facturado || 0) > 0 || (rep.usdt.pedidos || 0) > 0) && (
            <div className="card" style={{ padding: 18, marginTop: 8, marginBottom: 24, borderTop: '3px solid #10b981' }}>
              <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10, color: '#10b981' }}>Ventas en USDT (aparte)</h4>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Facturado</div><div style={{ fontSize: 22, fontWeight: 900 }}>USDT {fmt(rep.usdt.facturado)}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ganancia</div><div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>USDT {fmt(rep.usdt.ganancia)}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Pedidos</div><div style={{ fontSize: 22, fontWeight: 900 }}>{rep.usdt.pedidos}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Unidades</div><div style={{ fontSize: 22, fontWeight: 900 }}>{rep.usdt.unidades}</div></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// "hace 5 min", "hace 2 h", "hace 3 d"
const haceTxt = (d) => { const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000)); return m < 60 ? `hace ${m || 1} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };

// Tipo de cliente del carrito: mayorista / revendedor / minorista (un cliente puede ser mayorista y revendedor)
const tiposCliente = (c) => {
  const t = [];
  if (c.cli_mayorista) t.push('mayorista');
  if (c.cli_revendedor) t.push('revendedor');
  if (!t.length) t.push(c.usuario_id ? 'minorista' : 'sin_cuenta');
  return t;
};

const TIPO_CLI = { mayorista: 'Mayorista', revendedor: 'Revendedor', minorista: 'Minorista', sin_cuenta: 'Sin cuenta' };

const ESTILOS_MSJ = [
  { id: 'cupon', label: 'Cupón por tiempo', desc: 'Descuento que vence en pocas horas' },
  { id: 'reserva', label: 'Te lo reservo', desc: 'Le guardás el carrito por un rato' },
  { id: 'directo', label: 'Cierre directo', desc: 'Le ofrecés pasarle los datos de pago' },
  { id: 'amable', label: 'Consulta amable', desc: 'Le preguntás si tuvo alguna duda' },
];

const PLAZO_TXT = { 1: 'la próxima hora', 2: 'las próximas 2 horas', 3: 'las próximas 3 horas', 6: 'las próximas 6 horas', 12: 'las próximas 12 horas', 24: 'las próximas 24 horas' };

// Arma el mensaje de WhatsApp. {CUPON} y {VENCE} se completan al enviar (el cupón se crea en ese momento).
function armarMensajeCarrito({ estilo, c, tiendas, pct, horas, link, tienda }) {
  const tipos = tiposCliente(c);
  const mayor = tipos.includes('mayorista');
  const nombre = c.usuario_nombre ? ' ' + String(c.usuario_nombre).split(' ')[0] : '';
  const de = tienda ? ` Te escribo de ${tienda}.` : '';
  const items = (c.items || []).map(i => `• ${i.nombre || i.modelo} x${i.qty || i.cantidad || 1}`).join('\n');
  const total = tiendas.length > 1 ? tiendas.map(t => `${t.nombre}: ${fmtARS(t.subtotal)}`).join('\n') + `\nTotal: ${fmtARS(c.total)}` : `Total: ${fmtARS(c.total)}`;
  const que = mayor ? 'tu pedido mayorista' : 'tu carrito';
  const quedo = mayor ? 'Vi que te quedó armado un pedido mayorista sin confirmar' : 'Vi que te quedó el carrito armado';
  const linkTxt = link ? `\n\nTe dejo ${que} listo para finalizar: ${link}` : '';
  const armado = mayor ? ' Cuando lo confirmes arrancamos con el armado.' : '';
  if (estilo === 'cupon') return `Hola${nombre}, ¿cómo estás?${de} ${quedo}:\n${items}\n\n${total}\n\nSi lo cerrás en ${PLAZO_TXT[horas] || `las próximas ${horas} horas`}, tenés un ${pct}% de descuento con este código: {CUPON}\nVale {VENCE} y es solo para vos.${armado}${linkTxt}`;
  if (estilo === 'reserva') return `Hola${nombre}, ¿cómo estás?${de} ${quedo}:\n${items}\n\n${total}\n\nTe lo reservo hasta mañana; después se libera para otros clientes. Si querés asegurarlo, cerralo ahora.${armado}${linkTxt}`;
  if (estilo === 'directo') return `Hola${nombre}, te escribo${tienda ? ` de ${tienda}` : ''} por ${que}:\n${items}\n\n${total}\n\n¿Te lo confirmo y te paso los datos para pagar?${armado}${link ? `\n\nSi preferís, lo cerrás directo desde acá: ${link}` : ''}`;
  return `¡Hola${nombre}!${de} ${quedo}:\n${items}\n\n${total}\n\n¿Te quedó alguna duda? Si querés te ayudo a completar la compra.${link ? `\n\n${mayor ? 'Tu pedido' : 'Tu carrito'}: ${link}` : ''}`;
}

function MensajeCarritoModal({ c, tiendas, onClose, onEnviado }) {
  const { toast, design, config } = useContext(Ctx);
  const tienda = design?.nombre_tienda || config?.nombre_tienda || '';
  const conLink = (c.items || []).some(i => i.producto_id);
  const [estilo, setEstilo] = useState('cupon');
  const [pct, setPct] = useState(3);
  const [horas, setHoras] = useState(1);
  const [incluirLink, setIncluirLink] = useState(conLink);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [linkWa, setLinkWa] = useState('');
  const linkBase = conLink ? `${window.location.origin}/carrito?carrito=${codificarCarrito((c.items || []).filter(i => i.producto_id).map(i => ({ s: i.seccion_id || c.seccion_id, p: i.producto_id, q: i.qty || i.cantidad || 1 })))}` : '';
  useEffect(() => {
    setTexto(armarMensajeCarrito({ estilo, c, tiendas, pct, horas, link: incluirLink && linkBase ? (estilo === 'cupon' ? `${linkBase}&cupon={CUPON}` : linkBase) : '', tienda }));
  }, [estilo, pct, horas, incluirLink]);
  const enviar = async () => {
    const tel = (c.telefono || '').replace(/\D/g, '');
    if (!tel) { toast('Este carrito no tiene teléfono', 'warning'); return; }
    if (estilo === 'cupon' && !(Number(pct) > 0 && Number(pct) <= 50)) { toast('Poné un descuento entre 1% y 50%', 'error'); return; }
    // La ventana se abre ya (si se abre después de esperar al servidor, el celular la bloquea)
    const ventana = window.open('', '_blank');
    setEnviando(true);
    try {
      let msg = texto;
      if (estilo === 'cupon' && /\{CUPON\}/.test(msg)) {
        const r = await api.crearCuponCarrito(c.id, Number(pct), Number(horas));
        const v = new Date(r.vence_at);
        const hora = v.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
        const hoy = v.toDateString() === new Date().toDateString();
        msg = msg.replace(/\{CUPON\}/g, r.codigo).replace(/\{VENCE\}/g, hoy ? `hasta hoy a las ${hora}` : `hasta mañana a las ${hora}`);
      }
      await api.marcarCarritoContactado(c.id).catch(() => {});
      const url = `https://wa.me/${waIntl(tel)}?text=${encodeURIComponent(msg)}`;
      if (ventana) { ventana.location.href = url; onEnviado(); }
      else { setLinkWa(url); }
    } catch (e) { if (ventana) ventana.close(); toast(e.message, 'error'); }
    setEnviando(false);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header"><span className="modal-title">Mensaje para {c.usuario_nombre || c.telefono || 'el cliente'}</span><button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
        <div className="modal-body">
          <div className="ca-estilos" role="radiogroup" aria-label="Estilo del mensaje">
            {ESTILOS_MSJ.map(e => <button key={e.id} type="button" role="radio" aria-checked={estilo === e.id} className={estilo === e.id ? 'on' : ''} onClick={() => setEstilo(e.id)}><b>{e.label}</b><small>{e.desc}</small></button>)}
          </div>
          {estilo === 'cupon' && (
            <div className="ca-cupon-opc">
              <label>Descuento<span><input type="number" min="1" max="50" step="0.5" value={pct} onChange={e => setPct(e.target.value)} /> %</span></label>
              <label>Vence en<select value={horas} onChange={e => setHoras(Number(e.target.value))}>{[1, 2, 3, 6, 12, 24].map(h => <option key={h} value={h}>{h === 1 ? '1 hora' : `${h} horas`}</option>)}</select></label>
              <small>Se crea un código único, de un solo uso y solo para este cliente. Se aplica solo al abrir el link.</small>
            </div>
          )}
          {conLink ? <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '10px 0' }}><input type="checkbox" checked={incluirLink} onChange={e => setIncluirLink(e.target.checked)} /> Incluir link que le carga el carrito listo para pagar</label>
            : <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 0' }}>Este carrito es anterior a la mejora y no tiene el link para retomar la compra.</p>}
          <label className="form-label">Mensaje (lo podés editar)</label>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={11} style={{ width: '100%', fontSize: 13.5, lineHeight: 1.45 }} />
          {estilo === 'cupon' && <small style={{ color: 'var(--text-muted)' }}>{'{CUPON}'} y {'{VENCE}'} se completan solos al enviar.</small>}
          {linkWa && <a className="btn btn-success" style={{ width: '100%', marginTop: 12 }} href={linkWa} target="_blank" rel="noopener noreferrer" onClick={() => onEnviado()}><MessageCircle size={16} /> Abrir WhatsApp</a>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          {!linkWa && <button className="btn btn-success" onClick={enviar} disabled={enviando}><MessageCircle size={16} /> {enviando ? 'Preparando…' : 'Enviar por WhatsApp'}</button>}
        </div>
      </div>
    </div>
  );
}

const ARREP_ESTADOS = { pendiente: 'Pendiente', en_proceso: 'En proceso', resuelta: 'Resuelta', rechazada: 'Rechazada' };

function AdminArrepentimientos() {
  const { toast } = useContext(Ctx);
  const [lista, setLista] = useState(null);
  const [vista, setVista] = useState('abiertas');
  const [notas, setNotas] = useState({});
  const cargar = () => api.getArrepentimientos().then(r => setLista(Array.isArray(r) ? r : [])).catch(e => { toast(e.message, 'error'); setLista([]); });
  useEffect(() => { cargar(); }, []);
  const cambiar = async (a, estado) => { try { await api.updateArrepentimiento(a.id, { estado }); toast('Actualizado'); cargar(); } catch (e) { toast(e.message, 'error'); } };
  const guardarNota = async (a) => { const nota = notas[a.id]; if (nota === undefined || nota === (a.nota_admin || '')) return; try { await api.updateArrepentimiento(a.id, { estado: a.estado, nota_admin: nota }); toast('Nota guardada'); cargar(); } catch (e) { toast(e.message, 'error'); } };
  if (!lista) return <div className="spinner" />;
  const abiertas = lista.filter(a => a.estado === 'pendiente' || a.estado === 'en_proceso');
  const ver = vista === 'abiertas' ? abiertas : lista;
  return (
    <div style={{ maxWidth: 820 }}>
      <h2 style={{ fontWeight: 900, fontSize: 22, margin: '0 0 6px' }}>Arrepentimientos</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>Solicitudes del Botón de arrepentimiento de la tienda. El cliente ya recibió su código por mail; comunicate para coordinar la devolución y el reintegro. Tiene 10 días corridos desde que recibió el producto.</p>
      <div className="ca-filtros" style={{ marginBottom: 12 }}>
        <button className={vista === 'abiertas' ? 'on' : ''} onClick={() => setVista('abiertas')}>Abiertas <span>{abiertas.length}</span></button>
        <button className={vista === 'todas' ? 'on' : ''} onClick={() => setVista('todas')}>Todas <span>{lista.length}</span></button>
      </div>
      {ver.length === 0 && <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>{vista === 'abiertas' ? 'No hay solicitudes abiertas.' : 'Todavía no hay solicitudes.'}</div>}
      {ver.map(a => {
        const tel = waIntl(a.telefono || '');
        return (
          <div key={a.id} className="card arrep-item">
            <div className="arrep-item-top">
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '.03em' }}>{a.codigo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} · {haceTxt(a.created_at)}</div>
              </div>
              <select value={a.estado} onChange={e => cambiar(a, e.target.value)} className={`arrep-estado ${a.estado}`}>
                {Object.entries(ARREP_ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="arrep-datos">
              <div><b>{a.nombre}</b>{a.dni ? ` · DNI ${a.dni}` : ''}</div>
              <div>{a.email}{a.telefono ? ` · ${a.telefono}` : ''}</div>
              {a.pedido && <div>Pedido <b>#{a.pedido}</b>{a.pedido_id ? (a.pedido_total ? ` · ${fmtARS(a.pedido_total)} · ${a.pedido_estado || ''}` : '') : <span style={{ color: 'var(--danger)' }}> · no coincide con sus datos, revisalo</span>}</div>}
              {a.detalle && <div className="arrep-detalle">{a.detalle}</div>}
            </div>
            <textarea className="arrep-nota" rows={2} placeholder="Nota interna (qué se acordó, reintegro, etc.)" value={notas[a.id] ?? a.nota_admin ?? ''} onChange={e => setNotas(n => ({ ...n, [a.id]: e.target.value }))} onBlur={() => guardarNota(a)} />
            <div className="arrep-acciones">
              {tel && <a className="btn btn-success btn-sm" href={`https://wa.me/${tel}?text=${encodeURIComponent(`Hola ${String(a.nombre || '').split(' ')[0]}, te escribimos por tu solicitud de arrepentimiento ${a.codigo}.`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
              {a.email && <a className="btn btn-outline btn-sm" href={`mailto:${a.email}?subject=${encodeURIComponent(`Tu solicitud de arrepentimiento ${a.codigo}`)}`}><Mail size={15} /> Email</a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminCarritosAbandonados() {
  const { toast, secciones } = useContext(Ctx);
  const [vista, setVista] = useState('pendientes');
  const [carritos, setCarritos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [sinContactar, setSinContactar] = useState(false);
  const [busq, setBusq] = useState('');
  const [orden, setOrden] = useState('recientes');
  const [msj, setMsj] = useState(null);
  const load = async (v = vista) => {
    setLoading(true);
    try { const [cs, st] = await Promise.all([api.getCarritosAbandonados(v === 'recuperados' ? 'recuperados' : ''), api.getCarritosStats().catch(() => null)]); setCarritos(cs || []); setStats(st); }
    catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  };
  useEffect(() => { load(vista); }, [vista]);

  // Tiendas del carrito con su subtotal (los carritos viejos no guardaban la tienda de cada producto)
  const tiendasDe = (c) => {
    const its = c.items || [];
    if (!its.some(i => i.seccion_id)) return c.seccion_nombre ? [{ id: c.seccion_id, nombre: c.seccion_nombre, subtotal: Number(c.total) || 0, cant: its.length }] : [];
    const g = new Map();
    for (const i of its) {
      const k = String(i.seccion_id || c.seccion_id || '');
      const sec = (secciones || []).find(x => String(x.id) === k);
      const e = g.get(k) || { id: k, nombre: sec ? sec.nombre : (c.seccion_nombre || 'Tienda'), subtotal: 0, cant: 0 };
      e.subtotal += (Number(i.precio) || 0) * (Number(i.qty || i.cantidad) || 1); e.cant += 1;
      g.set(k, e);
    }
    return [...g.values()];
  };
  const recuperar = async (id) => { try { await api.recuperarCarrito(id); toast('Marcado como recuperado'); load(); } catch (e) { toast(e.message, 'error'); } };
  const borrar = async (id) => { if (!confirm('¿Eliminar este carrito?')) return; try { await api.deleteCarritoAbandonado(id); load(); } catch (e) { toast(e.message, 'error'); } };

  const cuenta = (t) => carritos.filter(c => tiposCliente(c).includes(t)).length;
  const FILTROS = [['todos', 'Todos', carritos.length], ['mayorista', 'Mayoristas', cuenta('mayorista')], ['revendedor', 'Revendedores', cuenta('revendedor')], ['minorista', 'Minoristas', cuenta('minorista') + cuenta('sin_cuenta')]];
  const q = busq.trim().toLowerCase();
  let lista = carritos.filter(c => filtro === 'todos' || (filtro === 'minorista' ? tiposCliente(c).some(t => t === 'minorista' || t === 'sin_cuenta') : tiposCliente(c).includes(filtro)));
  if (sinContactar && vista === 'pendientes') lista = lista.filter(c => !c.contactado_at);
  if (q) lista = lista.filter(c => [c.usuario_nombre, c.usuario_fantasia, c.telefono, c.email, ...(c.items || []).map(i => i.nombre)].some(x => String(x || '').toLowerCase().includes(q)));
  lista = [...lista].sort((a, b) => orden === 'monto' ? (Number(b.total) || 0) - (Number(a.total) || 0) : orden === 'antiguos' ? new Date(a.created_at) - new Date(b.created_at) : 0);
  const enJuego = lista.reduce((a, c) => a + (Number(c.total) || 0), 0);
  const POR = { contacto: 'Lo contactaste', manual: 'Marcado a mano', solo: 'Compró por su cuenta' };

  return (
    <div style={{ maxWidth: 900 }}>
      <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Carritos abandonados</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>Clientes que agregaron productos pero no completaron la compra. Contactalos por WhatsApp para recuperar la venta. Cuando el cliente compra, el carrito pasa solo a Recuperados.</p>
      {stats && (
        <div className="ca-stats">
          <div><small>Dejados · 30 días</small><b>{stats.dejados}</b><span>{fmtARS(stats.monto_dejado)}</span></div>
          <div><small>Recuperados</small><b>{stats.recuperados}</b><span>{fmtARS(stats.monto_recuperado)}</span></div>
          <div><small>Recuperación</small><b>{stats.tasa}%</b><span>{stats.compraron_solos ? `${stats.compraron_solos} compraron solos` : 'de los dejados'}</span></div>
          <div><small>Sin contactar</small><b>{stats.sin_contactar}</b><span>pendientes</span></div>
        </div>
      )}
      <div className="admin-subtabs" style={{ marginBottom: 10 }}>
        <button className={`admin-subtab ${vista === 'pendientes' ? 'active' : ''}`} onClick={() => setVista('pendientes')}>Pendientes</button>
        <button className={`admin-subtab ${vista === 'recuperados' ? 'active' : ''}`} onClick={() => setVista('recuperados')}>Recuperados</button>
      </div>
      <div className="ca-filtros" role="group" aria-label="Tipo de cliente">
        {FILTROS.map(([id, lbl, n]) => <button key={id} className={filtro === id ? 'on' : ''} onClick={() => setFiltro(id)}>{lbl} <span>{n}</span></button>)}
        {vista === 'pendientes' && <button className={sinContactar ? 'on' : ''} onClick={() => setSinContactar(!sinContactar)}>Sin contactar <span>{carritos.filter(c => !c.contactado_at).length}</span></button>}
      </div>
      <div className="ca-tools">
        <label className="ca-buscar"><Search size={16} /><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Buscar</span><input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Buscar cliente, teléfono o producto" /></label>
        <select value={orden} onChange={e => setOrden(e.target.value)} aria-label="Ordenar"><option value="recientes">Más recientes</option><option value="monto">Mayor monto</option><option value="antiguos">Más antiguos</option></select>
      </div>
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div> : <>
      {lista.length > 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>{lista.length} {lista.length === 1 ? 'carrito' : 'carritos'} · <b style={{ color: 'var(--text)' }}>{fmtARS(vista === 'recuperados' ? lista.reduce((a, c) => a + (Number(c.monto_recuperado) || Number(c.total) || 0), 0) : enJuego)}</b> {vista === 'recuperados' ? 'recuperados' : 'en juego'}</p>}
      {lista.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>{carritos.length ? 'No hay carritos con este filtro' : vista === 'recuperados' ? 'Todavía no hay carritos recuperados' : 'No hay carritos abandonados'}</p> : lista.map(c => {
        const tiendas = tiendasDe(c);
        const cuponVivo = c.cupon_codigo && c.cupon_vence && new Date(c.cupon_vence) > new Date();
        return (
          <div key={c.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <strong>{c.usuario_nombre || c.email || c.telefono || 'Anónimo'}</strong>
                  {c.usuario_fantasia && c.usuario_fantasia !== c.usuario_nombre && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.usuario_fantasia}</span>}
                  {tiposCliente(c).map(t => <span key={t} className={`ca-tipo ca-${t}`}>{TIPO_CLI[t]}</span>)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(c.created_at).toLocaleString('es-AR')} · {(c.items || []).length} productos</div>
                {vista === 'pendientes' && (
                  <div className="ca-seguimiento">
                    {c.contactado_at ? <span className="ok"><Check size={12} /> Contactado {haceTxt(c.contactado_at)}{c.contactos > 1 ? ` (${c.contactos} veces)` : ''}</span> : <span>Sin contactar</span>}
                    {cuponVivo && <span className="cup"><Tag size={12} /> Cupón {c.cupon_codigo} · vence en {faltaTxt(c.cupon_vence)}</span>}
                    {c.cupon_codigo && !cuponVivo && <span>Cupón {c.cupon_codigo} vencido</span>}
                  </div>
                )}
                {vista === 'recuperados' && (
                  <div className="ca-seguimiento"><span className={c.recuperado_por === 'solo' ? '' : 'ok'}><Check size={12} /> {POR[c.recuperado_por] || 'Recuperado'}{c.recuperado_at ? ` · ${new Date(c.recuperado_at).toLocaleDateString('es-AR')}` : ''}{Number(c.monto_recuperado) > 0 ? ` · compró ${fmtARS(c.monto_recuperado)}` : ''}{c.pedido_id ? ` · pedido #${String(c.pedido_id).padStart(4, '0')}` : ''}</span></div>
                )}
                {tiendas.length > 0 && <div className="ca-tiendas">{tiendas.map(t => <span key={t.id || t.nombre}><Store size={12} /> {t.nombre}{tiendas.length > 1 ? ` · ${fmtARS(t.subtotal)}` : ''}</span>)}</div>}
                <div className="itp-lista">{(c.items || []).slice(0, 6).map((i, k) => <ItemProd key={k} id={i.producto_id || i.id} nombre={i.nombre || i.modelo} imagen={i.imagen} sub={`x${i.qty || i.cantidad || 1}`} tam={32} />)}{(c.items || []).length > 6 ? <small>y {(c.items || []).length - 6} más…</small> : null}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>{fmtARS(c.total)}</div>
                {vista === 'pendientes' && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-success btn-sm" onClick={() => setMsj(c)}><MessageCircle size={14} /> WhatsApp</button>
                    <button className="btn btn-outline btn-sm" onClick={() => recuperar(c.id)}><Check size={14} /> Recuperado</button>
                    <button className="btn btn-danger btn-sm" onClick={() => borrar(c.id)} aria-label="Eliminar carrito"><Trash2 size={15} style={{ verticalAlign: '-2px' }} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      </>}
      {msj && <MensajeCarritoModal c={msj} tiendas={tiendasDe(msj)} onClose={() => setMsj(null)} onEnviado={() => { setMsj(null); toast('Mensaje listo en WhatsApp'); load(); }} />}
    </div>
  );
}

function AdminCupones() {
  const { secciones, toast } = useContext(Ctx);
  const [cupones, setCupones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ codigo: '', tipo: 'porcentaje', valor: 0, secciones_ids: '', categoria: '', uso_maximo: 0, monto_minimo: 0, metodo_pago: '', fecha_desde: '', fecha_hasta: '', solo_primera_compra: false });
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [selProds, setSelProds] = useState([]);

  useEffect(() => { api.getCupones().then(setCupones); }, []);

  const openEdit = async (c) => {
    setEdit(c);
    setForm({ codigo: c.codigo, tipo: c.tipo, valor: c.valor, secciones_ids: c.secciones_ids || '', categoria: c.categoria || '', uso_maximo: c.uso_maximo || 0, monto_minimo: c.monto_minimo || 0, metodo_pago: c.metodo_pago || '', fecha_desde: c.fecha_desde ? String(c.fecha_desde).slice(0, 10) : '', fecha_hasta: c.fecha_hasta ? String(c.fecha_hasta).slice(0, 10) : '', solo_primera_compra: c.solo_primera_compra || false });
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
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={form.solo_primera_compra} onChange={e => setForm({ ...form, solo_primera_compra: e.target.checked })} /> Solo para la primera compra del cliente</label>
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
                {prodResults.length > 0 && <div style={{ border: '1px solid var(--border)', borderRadius: 4, maxHeight: 150, overflowY: 'auto', marginTop: 4 }}>{prodResults.map(p => <div key={p.id} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)' }} onClick={() => { if (!selProds.find(sp => sp.id === p.id)) setSelProds([...selProds, p]); setProdResults([]); setProdSearch(''); }}><span style={{display:'flex',gap:8,alignItems:'center'}}>{p.imagen ? <img src={p.imagen} alt="" style={{width:28,height:28,objectFit:'cover',borderRadius:4,flexShrink:0}} /> : <span><Package size={15} style={{ verticalAlign: '-2px' }} /></span>}<span>{p.nombre || p.modelo} — {p.categoria}{p.seccion_nombre ? ` · ${p.seccion_nombre}` : ''}</span></span></div>)}</div>}
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
  const [form, setForm] = useState({ nombre: '', tipo: 'porcentaje', valor: 0, secciones_ids: '', categoria: '', productos_ids: '', fecha_desde: '', fecha_hasta: '' });
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [selProds, setSelProds] = useState([]);

  useEffect(() => { api.getPromociones().then(setPromos); }, []);

  const openNew = () => { setEdit(null); setForm({ nombre: '', tipo: 'porcentaje', valor: 0, secciones_ids: '', categoria: '', productos_ids: '', fecha_desde: '', fecha_hasta: '' }); setSelProds([]); setShowForm(true); };
  const openEdit = (p) => { setEdit(p); setForm({ nombre: p.nombre, tipo: p.tipo, valor: p.valor, secciones_ids: p.secciones_ids || '', categoria: p.categoria || '', productos_ids: p.productos_ids || '', fecha_desde: (p.fecha_desde || '').slice(0,10), fecha_hasta: (p.fecha_hasta || '').slice(0,10) }); setSelProds([]); setShowForm(true); };

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
                {prodResults.length > 0 && <div style={{ border: '1px solid var(--border)', borderRadius: 4, maxHeight: 120, overflowY: 'auto', marginTop: 4 }}>{prodResults.map(p => <div key={p.id} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 13 }} onClick={() => { if (!selProds.find(sp => sp.id === p.id)) setSelProds([...selProds, p]); setProdResults([]); setProdSearch(''); }}><span style={{display:'flex',gap:8,alignItems:'center'}}>{p.imagen ? <img src={p.imagen} alt="" style={{width:28,height:28,objectFit:'cover',borderRadius:4,flexShrink:0}} /> : <span><Package size={15} style={{ verticalAlign: '-2px' }} /></span>}<span>{p.nombre || p.modelo} — {p.categoria}{p.seccion_nombre ? ` · ${p.seccion_nombre}` : ''}</span></span></div>)}</div>}
                {selProds.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>{selProds.map(p => <span key={p.id} style={{ background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }} onClick={() => setSelProds(selProds.filter(sp => sp.id !== p.id))}>{p.nombre || p.modelo} ✕</span>)}</div>}
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Desde (opcional)</label><input type="date" value={form.fecha_desde} onChange={e => setForm({ ...form, fecha_desde: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Hasta (opcional)</label><input type="date" value={form.fecha_hasta} onChange={e => setForm({ ...form, fecha_hasta: e.target.value })} /></div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -4 }}>Dejá las fechas vacías para que la promo esté siempre activa. Poné una fecha de fin para una promo puntual.</p>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPopups() {
  const { toast } = useContext(Ctx);
  const vacio = { titulo: '', imagenes: [], url_destino: '', secciones_ids: '', activo: true };
  const [popups, setPopups] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState(vacio);
  const [edit, setEdit] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [urlImg, setUrlImg] = useState('');
  const cargar = () => api.getPopupsAll().then(setPopups).catch(() => {});
  useEffect(() => { cargar(); }, []);
  const abrir = (p) => { setEdit(p || null); setForm(p ? { ...p, imagenes: imagenesPopup(p) } : vacio); setUrlImg(''); setShow(true); };
  const save = async () => {
    if (!form.imagenes.length && !form.titulo.trim()) { toast('Poné al menos un título o una imagen', 'warning'); return; }
    try { const body = { ...form, imagen: form.imagenes[0] || '' }; if (edit) await api.updatePopup(edit.id, body); else await api.createPopup(body); cargar(); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); }
  };
  const subir = async (files) => { if (subiendo) return; setSubiendo(true); const urls = await subirFotosEnSerie(files, toast); setForm(fm => ({ ...fm, imagenes: [...fm.imagenes, ...urls.filter(u => !fm.imagenes.includes(u))].slice(0, 10) })); setSubiendo(false); };
  const agregarUrl = () => { const u = urlImg.trim(); if (!/^https?:\/\//i.test(u)) { toast('Pegá una URL que empiece con http', 'warning'); return; } setForm(fm => ({ ...fm, imagenes: fm.imagenes.includes(u) ? fm.imagenes : [...fm.imagenes, u].slice(0, 10) })); setUrlImg(''); };
  const toggleActivo = async (p) => { try { await api.updatePopup(p.id, { ...p, imagenes: imagenesPopup(p), activo: !p.activo }); cargar(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><h3>Pop-ups promocionales</h3><button className="btn btn-primary btn-sm" onClick={() => abrir(null)}>+ Nuevo</button></div>
      <p className="form-hint" style={{ marginBottom: 12 }}>Se muestra el más nuevo que esté activo, una vez por visita. Si tiene varias imágenes, pasan solas como carrusel.</p>
      {popups.length === 0 && <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Todavía no hay pop-ups.</div>}
      {popups.map(p => { const imgs = imagenesPopup(p); return (
        <div key={p.id} className="card popup-row">
          <div className="popup-row-thumbs">{imgs.slice(0, 3).map((u, k) => <img key={k} src={imgOpt(u, 100)} alt="" />)}{!imgs.length && <span className="popup-row-sin"><Camera size={18} /></span>}</div>
          <div className="popup-row-info"><strong>{p.titulo || 'Sin título'}</strong><span>{imgs.length} {imgs.length === 1 ? 'imagen' : 'imágenes'}{p.url_destino ? ' · con enlace' : ''}</span></div>
          <button type="button" className={`chip-estado ${p.activo ? 'on' : 'off'}`} onClick={() => toggleActivo(p)} title="Activar / desactivar">{p.activo ? 'Activo' : 'Inactivo'}</button>
          <div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => abrir(p)} aria-label="Editar"><Ico n="edit" s={15} /></button><button className="btn btn-danger btn-sm" aria-label="Eliminar" onClick={async () => { if (!confirm('¿Eliminar este pop-up?')) return; await api.deletePopup(p.id); cargar(); }}><Ico n="trash" s={15} /></button></div>
        </div>); })}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal modal-lg" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nuevo'} pop-up</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-group"><label className="form-label">Título</label><input value={form.titulo || ''} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Hot Sale — 20% off en herramientas" /></div>
        <div className="form-group"><label className="form-label">Imágenes (hasta 10)</label>
          <GaleriaFotos items={form.imagenes.map(u => ({ key: u, url: u }))} uploading={subiendo} onFiles={subir}
            onRemove={idx => setForm({ ...form, imagenes: form.imagenes.filter((_, k) => k !== idx) })}
            onMove={(a, b) => { if (b >= 0 && b < form.imagenes.length) setForm({ ...form, imagenes: moverEnLista(form.imagenes, a, b) }); }} />
          <div className="gal-url"><input value={urlImg} onChange={e => setUrlImg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarUrl(); } }} placeholder="O pegá la URL de una imagen" /><button type="button" className="btn btn-outline btn-sm" onClick={agregarUrl}>Agregar</button></div>
          <small className="form-hint">Recomendado: imágenes verticales o cuadradas (1080 × 1350 o 1080 × 1080).</small>
        </div>
        <div className="form-group"><label className="form-label">Enlace del botón (opcional)</label><input value={form.url_destino || ''} onChange={e => setForm({ ...form, url_destino: e.target.value })} placeholder="https://… o /seccion/…" /></div>
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
// ─── ADMIN: Orden de secciones (drag & drop) ───
function AdminOrdenSecciones() {
  const { secciones, setSecciones, toast } = useContext(Ctx);
  const [items, setItems] = useState([]);
  useEffect(() => { setItems([...secciones].sort((a, b) => (a.orden || 0) - (b.orden || 0))); }, [secciones]);
  const saveOrder = async (re) => {
    setSecciones(re);
    for (const s of re) { await api.updateSeccion(s.id, { ...s }).catch(() => {}); }
    toast('Orden guardado');
  };
  const dnd = useDnDReorder(items, setItems, saveOrder);
  const toggleVisible = async (s) => {
    const nv = s.visible === false ? true : false;
    const upd = items.map(x => x.id === s.id ? { ...x, visible: nv } : x);
    setItems(upd); setSecciones(upd);
    await api.updateSeccion(s.id, { ...s, visible: nv }).catch(() => {});
  };
  return (
    <div style={{ maxWidth: 620 }}>
      <h3 style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Orden de las secciones</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Arrastrá para cambiar el orden en que aparecen las secciones (tiendas) en la barra del menú y en la landing. Podés ocultar una sin borrarla.</p>
      {items.map((s, i) => (
        <div key={s.id} draggable onDragStart={() => dnd.start(i)} onDragEnter={() => dnd.enter(i)} onDragEnd={dnd.end} onDragOver={e => e.preventDefault()}
          className="card" style={{ padding: 12, marginBottom: 8, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 12, opacity: s.visible === false ? 0.5 : 1 }}>
          <span style={{ opacity: 0.35, fontSize: 18 }}>⠿</span>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color || 'var(--primary)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>{s.nombre}</strong>
            {s.requiere_aprobacion && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}><Lock size={15} style={{ verticalAlign: '-2px' }} /> con aprobación</span>}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{i + 1}</span>
          <button className="btn btn-outline btn-sm" onClick={() => toggleVisible(s)} title={s.visible === false ? 'Mostrar' : 'Ocultar'}>
            <Ico n={s.visible === false ? 'eye-off' : 'eye'} s={15} />
          </button>
        </div>
      ))}
      {items.length === 0 && <div className="empty-state"><p>No hay secciones todavía.</p></div>}
    </div>
  );
}

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
  const [form, setForm] = useState({ icono: 'star', texto: '', color: 'var(--primary)', secciones_ids: '', visible: true, orden: 0 });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3>Badges de confianza</h3><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ icono: 'star', texto: '', color: 'var(--primary)', secciones_ids: '', visible: true, orden: 0 }); setShow(true); }}>+ Nuevo</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Se muestran debajo de los productos como indicadores de confianza. Arrastrá ⠿ para reordenar, tocá el ojo para activar/desactivar.</p>
      {bgs.map((b, i) => (<div key={b.id} draggable onDragStart={() => dnd.start(i)} onDragEnter={() => dnd.enter(i)} onDragEnd={dnd.end} onDragOver={e => e.preventDefault()} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'grab', opacity: b.visible ? 1 : 0.5 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ opacity: 0.35 }}>⠿</span><RenderIcon value={b.icono} size={16} /><strong>{b.texto}</strong><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({secNames(b.secciones_ids)})</span></div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => toggleVisible(b)} title={b.visible ? 'Ocultar' : 'Mostrar'} style={{ padding: '2px 8px' }}>{b.visible ? <Ico n="eye" s={15} /> : <Ico n="eye-off" s={15} />}</button><button className="btn btn-outline btn-sm" onClick={() => { setEdit(b); setForm(b); setShow(true); }}><Ico n="edit" s={15} /></button><button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar badge?')) return; try { await api.deleteBadge(b.id); toast('Eliminado'); reload(); } catch (e) { toast(e.message, 'error'); } }}><Ico n="trash" s={15} /></button></div></div></div>))}
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
  const [form, setForm] = useState({ nombre: '', descripcion: '', instrucciones: '', icono: 'credit-card', seccion_id: null, activo: true, orden: 0 });
  const [descuentoPct, setDescuentoPct] = useState('');
  const [edit, setEdit] = useState(null);
  const loadMps = () => api.getMetodosPagoAll().then(m => setMps(m.sort((a,b) => (a.orden||0) - (b.orden||0))));
  useEffect(() => { loadMps(); }, []);
  const [usdt, setUsdt] = useState({ wallet: config.usdt_wallet || '', red: config.usdt_red || '', alias: config.usdt_alias || '', instrucciones: config.usdt_instrucciones || '' });
  const saveUsdt = async () => { try { const upd = { usdt_wallet: usdt.wallet || '', usdt_red: usdt.red || '', usdt_alias: usdt.alias || '', usdt_instrucciones: usdt.instrucciones || '' }; await api.updateConfig(upd); setConfig({ ...config, ...upd }); toast('Datos de pago USDT guardados'); } catch (e) { toast(e.message, 'error'); } };
  const descKey = (nombre) => `descuento_${(nombre || '').toLowerCase().replace(/\s+/g, '_')}`;
  const openNew = () => { setEdit(null); setForm({ nombre: '', descripcion: '', instrucciones: '', icono: 'credit-card', seccion_id: null, activo: true, orden: 0 }); setDescuentoPct(''); setShow(true); };
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
      <div className="card" style={{ padding: 14, marginBottom: 16, borderLeft: '3px solid var(--primary)' }}>
        <h4 style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Pago en USDT / dólar</h4>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Estos datos se le muestran al cliente en el checkout cuando el pedido tiene ítems en USDT. Dejalos vacíos si preferís coordinar por WhatsApp.</p>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Red</label><input value={usdt.red} onChange={e => setUsdt({ ...usdt, red: e.target.value })} placeholder="Ej: TRC20 / BEP20" /></div>
          <div className="form-group"><label className="form-label">Alias / Binance ID / email</label><input value={usdt.alias} onChange={e => setUsdt({ ...usdt, alias: e.target.value })} placeholder="Ej: tu@email o ID de Binance" /></div>
        </div>
        <div className="form-group"><label className="form-label">Dirección de wallet</label><input value={usdt.wallet} onChange={e => setUsdt({ ...usdt, wallet: e.target.value })} placeholder="Ej: TXXXXXXXXXXXXXXXXXX" /></div>
        <div className="form-group"><label className="form-label">Instrucciones (opcional)</label><textarea value={usdt.instrucciones} onChange={e => setUsdt({ ...usdt, instrucciones: e.target.value })} rows={2} placeholder="Ej: Enviá el comprobante por WhatsApp después de pagar." /></div>
        <button className="btn btn-primary btn-sm" onClick={saveUsdt}>Guardar datos USDT</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Arrastrá para reordenar.</p>
      {mps.map((m, i) => (<div key={m.id} draggable onDragStart={() => dnd.start(i)} onDragEnter={() => dnd.enter(i)} onDragEnd={dnd.end} onDragOver={e => e.preventDefault()} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'grab' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><span style={{ opacity: 0.35, marginRight: 8 }}>⠿</span><RenderIcon value={m.icono} size={16} /> <strong>{m.nombre}</strong> {m.descripcion && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.descripcion}</span>} {config[descKey(m.nombre)] && parseFloat(config[descKey(m.nombre)]) > 0 && <span style={{ fontSize: 11, background: 'var(--success)', color: '#fff', padding: '1px 7px', borderRadius: 4, fontWeight: 700, marginLeft: 4 }}>−{config[descKey(m.nombre)]}%</span>}</div><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}><Ico n="edit" s={15} /></button><button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteMetodoPago(m.id); loadMps(); }}><Ico n="trash" s={15} /></button></div></div></div>))}
      {show && (<div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="modal-title">{edit ? 'Editar' : 'Nuevo'} método de pago</span><button className="modal-close" onClick={() => setShow(false)}>✕</button></div><div className="modal-body">
        <div className="form-row"><div className="form-group"><IconPicker label="Icono" value={form.icono} onChange={v => setForm({ ...form, icono: v })} /></div><div className="form-group" style={{ flex: 1 }}><label className="form-label">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div></div>
        <div className="form-group"><label className="form-label">Descripción</label><input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Instrucciones (se muestran al elegir este método)</label><textarea value={form.instrucciones} onChange={e => setForm({ ...form, instrucciones: e.target.value })} rows={3} placeholder="Ej: Transferir a CBU 0000...0000 a nombre de..." /></div>
        <div className="form-group"><label className="form-label">Sección (vacío = todas)</label>
          <select value={form.seccion_id || ''} onChange={e => setForm({ ...form, seccion_id: e.target.value ? Number(e.target.value) : null })}><option value="">Todas</option>{secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Descuento (%)</label><input type="number" value={descuentoPct} onChange={e => setDescuentoPct(e.target.value)} placeholder="Ej: 10 (vacío = sin descuento)" /><small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Se muestra en la ficha del producto y se descuenta del total al finalizar la compra con este medio (no aplica a preventas ni a precios en USDT).</small></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.activo !== false} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
      </div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div></div></div>)}

      {/* Ajustes recargo/descuento por defecto al registrar pagos */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px solid var(--border)' }}>
        <h4 style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Recargo / descuento por defecto (%)</h4>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Se precarga al registrar un pago con ese método (lo podés cambiar en cada pago). Positivo = recargo, negativo = descuento.</p>
        {(() => {
          let aj = {}; try { aj = config.ajustes_metodo ? JSON.parse(config.ajustes_metodo) : {}; } catch {}
          const setAj = async (metodo, val) => { const nuevo = { ...aj, [metodo]: Number(val) || 0 }; const newCfg = { ...config, ajustes_metodo: JSON.stringify(nuevo) }; try { await api.updateConfig({ ajustes_metodo: JSON.stringify(nuevo) }); setConfig(newCfg); } catch {} };
          const metodos = ['efectivo', 'transferencia', 'débito', 'crédito', 'mercadopago'];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {metodos.map(m => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 120, fontSize: 13, textTransform: 'capitalize' }}>{m}</span>
                  <input type="number" defaultValue={aj[m] ?? 0} onBlur={e => setAj(m, e.target.value)} style={{ width: 90 }} /> <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>%</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
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
  const [redes, setRedes] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Catálogo de redes disponibles
  const CATALOGO = [
    { tipo: 'instagram', label: 'Instagram', ph: 'https://instagram.com/tucuenta' },
    { tipo: 'facebook', label: 'Facebook', ph: 'https://facebook.com/tupagina' },
    { tipo: 'whatsapp', label: 'WhatsApp', ph: 'https://wa.me/549110000000' },
    { tipo: 'whatsapp_canal', label: 'Canal de WhatsApp', ph: 'https://whatsapp.com/channel/...' },
    { tipo: 'whatsapp_grupo', label: 'Grupo de WhatsApp', ph: 'https://chat.whatsapp.com/...' },
    { tipo: 'tiktok', label: 'TikTok', ph: 'https://tiktok.com/@tucuenta' },
    { tipo: 'youtube', label: 'YouTube', ph: 'https://youtube.com/@tucanal' },
    { tipo: 'telegram', label: 'Telegram', ph: 'https://t.me/tucanal' },
    { tipo: 'twitter', label: 'X (Twitter)', ph: 'https://x.com/tucuenta' },
    { tipo: 'linkedin', label: 'LinkedIn', ph: 'https://linkedin.com/company/...' },
    { tipo: 'threads', label: 'Threads', ph: 'https://threads.net/@tucuenta' },
    { tipo: 'web', label: 'Sitio web', ph: 'https://tusitio.com' },
  ];

  useEffect(() => {
    api.getRedesSociales().then(data => {
      // Deduplicar por tipo (quedarse con la primera de cada tipo que tenga URL, o la primera)
      const porTipo = {};
      (data || []).forEach(r => {
        if (!porTipo[r.tipo] || (r.url && !porTipo[r.tipo].url)) porTipo[r.tipo] = r;
      });
      // Armar lista final desde el catálogo, mezclando lo guardado
      const merged = CATALOGO.map(c => {
        const saved = porTipo[c.tipo];
        return { tipo: c.tipo, url: saved?.url || '', activo: saved?.activo || false };
      });
      setRedes(merged);
      setLoaded(true);
    });
  }, []);

  const setUrl = (tipo, url) => setRedes(prev => prev.map(r => r.tipo === tipo ? { ...r, url } : r));
  const toggle = (tipo) => setRedes(prev => prev.map(r => r.tipo === tipo ? { ...r, activo: !r.activo } : r));

  const guardar = async () => {
    try {
      // Solo guardar las que tienen URL (activas o no), descartar vacías
      const aGuardar = redes.filter(r => r.url && r.url.trim());
      await api.updateRedesSociales(aGuardar);
      setRedesSociales(aGuardar);
      toast('Redes guardadas ✓');
    } catch (e) { toast(e.message, 'error'); }
  };

  if (!loaded) return <div style={{ padding: 20, color: 'var(--text-muted)' }}>Cargando...</div>;

  const activasCount = redes.filter(r => r.activo && r.url).length;

  return (
    <div style={{ maxWidth: 620 }}>
      <h3 style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Redes sociales</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Activá las redes que quieras mostrar y pegá el link de cada una. Aparecen en el pie de página y en tu página de contacto. ({activasCount} activas)</p>
      {CATALOGO.map(c => {
        const r = redes.find(x => x.tipo === c.tipo) || { url: '', activo: false };
        return (
          <div key={c.tipo} className="card" style={{ padding: 12, marginBottom: 8, opacity: r.activo ? 1 : 0.6, transition: 'opacity 0.15s' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 175, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                <input type="checkbox" checked={r.activo} onChange={() => toggle(c.tipo)} />
                <RedIcon tipo={redIconTipo(c.tipo)} s={18} /> {c.label}
              </label>
              <input placeholder={c.ph} value={r.url} onChange={e => setUrl(c.tipo, e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            </div>
          </div>
        );
      })}
      <button className="btn btn-primary" onClick={guardar} style={{ marginTop: 12 }}>Guardar redes</button>
    </div>
  );
}

// ─── ADMIN: Diseño (file upload logo/favicon, working colors, reset) ───
function AdminDiseno() {
  const { toast, design, setDesign } = useContext(Ctx);
  const [des, setDes] = useState({ ...design });
  const [tab, setTab] = useState('temas');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [predev, setPredev] = useState('desktop');
  const iframeRef = useRef(null);

  useEffect(() => { api.getDesign().then(d => { setDes(d); setDirty(false); }); }, []);

  // Aplicar cambios al iframe de preview en vivo (sin guardar)
  const applyToPreview = () => {
    const ifr = iframeRef.current;
    if (!ifr || !ifr.contentDocument) return;
    applyDesignVars(des, ifr.contentDocument.documentElement);
  };
  useEffect(() => { applyToPreview(); }, [des]);

  const set = (patch) => { setDes(prev => ({ ...prev, ...patch })); setDirty(true); };

  const handleFileUpload = async (field, file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const r = await api.uploadBase64(ev.target.result, file.name);
        set({ [field]: r.url });
      };
      reader.readAsDataURL(file);
    } catch (e) { toast('Error al subir', 'error'); }
  };

  // Respaldo del diseño propio: la primera vez que se cambia el estilo, se guarda el anterior como "Predeterminado"
  const respaldo = (() => { try { const r = JSON.parse(des.respaldo_diseno || ''); return r && typeof r === 'object' ? r : null; } catch { return null; } })();
  const original = respaldo || temaDe(design);
  const guardar = async () => {
    setSaving(true);
    try {
      const cambioEstilo = TEMA_KEYS.some(k => (des[k] || '') !== (design[k] || ''));
      const datos = (!des.respaldo_diseno && cambioEstilo) ? { ...des, respaldo_diseno: JSON.stringify(temaDe(design)) } : des;
      await api.updateDesign(datos);
      setDes(datos);
      setDesign(datos);
      applyDesignVars(datos); // aplicar a la app real
      setDirty(false);
      toast('Diseño aplicado ✓ Ahora lo ven tus clientes');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const descartar = () => { setDes({ ...design }); setDirty(false); setTimeout(applyToPreview, 50); };

  const aplicarTema = (t) => {
    set({
      plantilla: t.id, modo_tema: t.mode,
      color_primario: t.p, color_secundario: t.s, color_acento: t.a, fuente: t.font,
      estilo_bordes: t.radius, estilo_sombra: t.shadow, estilo_card: t.card,
      color_fondo: t.bg, color_card: t.bgCard || '', color_texto: t.text || '', color_texto_sec: t.textSec || '',
      color_borde: t.border || '', color_header: t.headerBg || '', color_header_text: t.headerText || '',
      color_marquee: t.marqueeBg || '', color_marquee_text: t.marqueeText || '',
      color_texto_boton: t.onP || '', color_texto_acento: t.onA || '', color_boton_tarjeta: t.btnBg || '', color_boton_tarjeta_texto: t.btnFg || '',
      fondo_fotos: t.imgBg || '', fuente_titulos: t.fontHead || '', mayusculas: t.upper || '', mayusculas_titulos: t.upperHead || '',
    });
    ensureFont(t.font); if (t.fontHead) ensureFont(t.fontHead);
  };
  // Volver al diseño propio (el que había antes de probar plantillas)
  const aplicarOriginal = () => { set({ ...original }); ensureFont(original.fuente); if (original.fuente_titulos) ensureFont(original.fuente_titulos); };
  const esOriginal = TEMA_KEYS.every(k => (des[k] || '') === (original[k] || ''));
  const [verMasTemas, setVerMasTemas] = useState(false);

  const TABS = [
    { id: 'temas', label: 'Temas', icon: 'palette' },
    { id: 'colores', label: 'Colores', icon: 'palette' },
    { id: 'tipografia', label: 'Tipografía', icon: 'file' },
    { id: 'estilos', label: 'Estilos', icon: 'box' },
    { id: 'logo', label: 'Logo y textos', icon: 'image' },
  ];

  const swatch = (color) => <div style={{ width: 18, height: 18, borderRadius: '50%', background: color, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />;

  return (
    <div className="editor-visual">
      {/* Barra superior */}
      <div className="editor-topbar">
        <div>
          <h3 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>Personalizar tienda</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Editá y mirá el resultado en vivo. Cuando te guste, aplicá.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {dirty && <button className="btn btn-outline btn-sm" onClick={descartar}>Descartar</button>}
          <button className="btn btn-primary btn-sm" onClick={guardar} disabled={saving || !dirty}>{saving ? 'Aplicando...' : dirty ? 'Aplicar cambios' : '✓ Aplicado'}</button>
        </div>
      </div>

      <div className="editor-body">
        {/* PANEL IZQUIERDO — controles */}
        <div className="editor-panel">
          <div className="editor-tabs">
            {TABS.map(t => <button key={t.id} className={`editor-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
          </div>

          <div className="editor-controls">
            {/* TEMAS COMPLETOS */}
            {tab === 'temas' && (() => {
              const tarjeta = (t, activo, onClick, extra) => (
                <button key={t.id} type="button" onClick={onClick} className={`tema-card${activo ? ' on' : ''}`}>
                  <span className="tema-muestra" style={{ background: t.bg, borderColor: t.border || 'transparent' }}>
                    <span style={{ background: t.bgCard || t.bg, color: t.text }}>
                      <span className="tema-foto" style={{ background: t.imgBg || t.border || '#ddd' }}></span>
                      <span className="tema-linea" style={{ background: t.text, opacity: 0.85 }}></span>
                      <span className="tema-linea corta" style={{ background: t.textSec || t.text, opacity: 0.6 }}></span>
                      <span className="tema-boton" style={{ background: t.p, color: t.onP || '#fff', borderRadius: (RADIUS_STYLES[t.radius] || {}).btn || 8 }}>Comprar</span>
                    </span>
                  </span>
                  <strong style={{ fontFamily: `'${t.fontHead || t.font}', sans-serif`, textTransform: t.upperHead === 'si' ? 'uppercase' : 'none' }}>{t.name}</strong>
                  <small>{t.desc}</small>
                  {extra}
                  {activo && <span className="tema-activo"><Check size={12} /> En uso</span>}
                </button>
              );
              const orig = { id: 'original', name: 'Predeterminado', desc: respaldo ? 'Tu diseño de antes' : 'Tu diseño actual', p: original.color_primario || '#4A69E2', bg: original.color_fondo || '#F3F3F3', bgCard: original.color_card || original.color_fondo, text: original.color_texto || '#232321', textSec: original.color_texto_sec, border: original.color_borde, imgBg: original.fondo_fotos, onP: original.color_texto_boton, radius: original.estilo_bordes, font: original.fuente || 'Archivo', fontHead: original.fuente_titulos, upperHead: original.mayusculas_titulos };
              return (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Probá una plantilla: cambia colores, letras y estilos de una. Después ajustás todo en las otras pestañas y aplicás. Tu diseño de siempre queda guardado como <b>Predeterminado</b>.</p>
                  <div className="tema-grid">
                    {tarjeta(orig, esOriginal, aplicarOriginal)}
                    {THEME_PRESETS.filter(t => t.nuevo).map(t => tarjeta(t, des.plantilla === t.id && !esOriginal, () => aplicarTema(t)))}
                  </div>
                  <button type="button" className="link-btn" style={{ marginTop: 12, fontSize: 13 }} onClick={() => set({ respaldo_diseno: JSON.stringify(temaDe(des)) })}>Guardar el diseño que estoy viendo como Predeterminado</button>
                  <div style={{ marginTop: 18 }}>
                    <button type="button" className="link-btn" style={{ fontSize: 13, fontWeight: 700 }} onClick={() => setVerMasTemas(!verMasTemas)}>{verMasTemas ? 'Ocultar' : 'Ver'} más temas ({THEME_PRESETS.filter(t => !t.nuevo).length})</button>
                    {verMasTemas && <div className="tema-grid" style={{ marginTop: 10 }}>{THEME_PRESETS.filter(t => !t.nuevo).map(t => tarjeta(t, des.plantilla === t.id && !esOriginal, () => aplicarTema(t)))}</div>}
                  </div>
                </div>
              );
            })()}

            {/* COLORES */}
            {tab === 'colores' && (
              <div>
                <label className="form-label" style={{ marginBottom: 8 }}>Paletas rápidas</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                  {COLOR_PALETTES.map(pal => (
                    <button key={pal.name} onClick={() => set({ color_primario: pal.p, color_secundario: pal.s, color_acento: pal.a })}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 12 }}>
                      <div style={{ display: 'flex', gap: 2 }}>{swatch(pal.p)}{swatch(pal.s)}{swatch(pal.a)}</div>
                      {pal.name}
                    </button>
                  ))}
                </div>
                {[
                  ['g', 'Marca'],
                  ['color_primario', 'Principal (botones, links)', '#4A69E2'],
                  ['color_texto_boton', 'Texto sobre el principal', '#ffffff'],
                  ['color_secundario', 'Secundario', '#232321'],
                  ['color_acento', 'Acento (ofertas, etiquetas)', '#FFA52F'],
                  ['color_texto_acento', 'Texto sobre el acento', '#232321'],
                  ['g', 'Fondos y textos'],
                  ['color_fondo', 'Fondo de la página', '#F3F3F3'],
                  ['color_card', 'Tarjetas y recuadros', '#ffffff'],
                  ['color_texto', 'Texto principal', '#232321'],
                  ['color_texto_sec', 'Texto secundario', '#626262'],
                  ['color_borde', 'Bordes y líneas', '#E7E7E3'],
                  ['g', 'Cabecera y barra de mensajes'],
                  ['color_header', 'Fondo de la cabecera', '#ffffff'],
                  ['color_header_text', 'Texto de la cabecera', '#232321'],
                  ['color_marquee', 'Barra de mensajes', '#232321'],
                  ['color_marquee_text', 'Texto de la barra', '#ffffff'],
                  ['g', 'Productos'],
                  ['color_boton_tarjeta', 'Botón "Agregar" de las tarjetas', '#232321'],
                  ['color_boton_tarjeta_texto', 'Texto del botón "Agregar"', '#ffffff'],
                  ['fondo_fotos', 'Fondo detrás de las fotos', '#F3F3F3'],
                ].map(([k, lbl, def]) => k === 'g' ? <label key={lbl} className="form-label" style={{ margin: '14px 0 8px' }}>{lbl}</label> : (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <input type="color" value={des[k] || def} onChange={e => set({ [k]: e.target.value })} style={{ width: 44, height: 36, padding: 2, borderRadius: 8, cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{lbl}</div>
                      <input value={des[k] || def} onChange={e => set({ [k]: e.target.value })} style={{ fontSize: 12, padding: '4px 8px', width: 120 }} />
                    </div>
                    {des[k] && <button type="button" className="link-btn" onClick={() => set({ [k]: '' })} style={{ fontSize: 12 }} title="Volver al valor automático">Quitar</button>}
                  </div>
                ))}
              </div>
            )}

            {/* TIPOGRAFÍA */}
            {tab === 'tipografia' && (
              <div>
                <label className="form-label" style={{ marginBottom: 8 }}>Fuente de la tienda</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {FONT_OPTIONS.map(f => (
                    <button key={f.id} onClick={() => { ensureFont(f.id); set({ fuente: f.id }); }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, border: des.fuente === f.id || (!des.fuente && f.id === 'Archivo') ? '2px solid var(--primary)' : '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontFamily: `'${f.id}', sans-serif`, fontSize: 17, fontWeight: 700 }}>{f.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.cat}</span>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>Cada fuente se carga de Google Fonts. El preview de la derecha te muestra cómo queda.</p>
                <label className="form-label" style={{ margin: '18px 0 8px' }}>Fuente de los títulos</label>
                <select value={des.fuente_titulos || ''} onChange={e => { if (e.target.value) ensureFont(e.target.value); set({ fuente_titulos: e.target.value }); }} style={{ width: '100%' }}>
                  <option value="">Igual que el texto</option>
                  {FONT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label} · {f.cat}</option>)}
                </select>
                <label className="form-label" style={{ margin: '18px 0 8px' }}>Mayúsculas</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8 }}><input type="checkbox" checked={des.mayusculas !== 'no'} onChange={e => set({ mayusculas: e.target.checked ? '' : 'no' })} /> Botones, menú y etiquetas en MAYÚSCULAS</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" checked={des.mayusculas_titulos === 'si'} onChange={e => set({ mayusculas_titulos: e.target.checked ? 'si' : '' })} /> Títulos en MAYÚSCULAS</label>
              </div>
            )}

            {/* ESTILOS (bordes, sombras, cards) */}
            {tab === 'estilos' && (
              <div>
                <label className="form-label" style={{ marginBottom: 8 }}>Esquinas (bordes redondeados)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                  {Object.entries(RADIUS_STYLES).map(([k, v]) => (
                    <button key={k} onClick={() => set({ estilo_bordes: k })}
                      style={{ padding: 12, borderRadius: v.card, border: (des.estilo_bordes || 'redondeado') === k ? '2px solid var(--primary)' : '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
                      <div style={{ width: '100%', height: 28, background: 'var(--primary-light)', borderRadius: v.card, marginBottom: 6 }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{v.label}</span>
                    </button>
                  ))}
                </div>

                <label className="form-label" style={{ marginBottom: 8 }}>Sombra de las tarjetas</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                  {Object.entries(SHADOW_STYLES).map(([k, v]) => (
                    <button key={k} onClick={() => set({ estilo_sombra: k })}
                      style={{ padding: 12, borderRadius: 10, border: (des.estilo_sombra || 'suave') === k ? '2px solid var(--primary)' : '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
                      <div style={{ width: '100%', height: 28, background: '#fff', borderRadius: 8, marginBottom: 6, boxShadow: v.shadow }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{v.label}</span>
                    </button>
                  ))}
                </div>

                <label className="form-label" style={{ marginBottom: 8 }}>Estilo de las tarjetas de producto</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(CARD_STYLES).map(([k, v]) => (
                    <button key={k} onClick={() => set({ estilo_card: k })}
                      style={{ padding: '10px 14px', borderRadius: 10, border: (des.estilo_card || 'elevado') === k ? '2px solid var(--primary)' : '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LOGO Y TEXTOS */}
            {tab === 'logo' && (
              <div>
                <div className="form-group"><label className="form-label">Nombre de la tienda</label><input value={des.nombre_tienda || ''} onChange={e => set({ nombre_tienda: e.target.value })} /></div>
                <div className="form-group">
                  <label className="form-label">Logo</label>
                  <input type="file" accept="image/*" onChange={e => { if (e.target.files[0]) handleFileUpload('logo_url', e.target.files[0]); }} />
                  {des.logo_url && <img src={des.logo_url} alt="" style={{ height: 40, marginTop: 8 }} />}
                  <input value={des.logo_url || ''} onChange={e => set({ logo_url: e.target.value })} placeholder="O pegá URL" style={{ marginTop: 4, fontSize: 12 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Favicon</label>
                  <input type="file" accept="image/*" onChange={e => { if (e.target.files[0]) handleFileUpload('favicon_url', e.target.files[0]); }} />
                  {des.favicon_url && <img src={des.favicon_url} alt="" style={{ height: 24, marginTop: 8 }} />}
                  <input value={des.favicon_url || ''} onChange={e => set({ favicon_url: e.target.value })} placeholder="O pegá URL" style={{ marginTop: 4, fontSize: 12 }} />
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                  <h4 style={{ marginBottom: 8, fontSize: 14 }}>Textos de la landing</h4>
                  <div className="form-group"><label className="form-label">Título del hero</label><input value={des.hero_titulo || ''} onChange={e => set({ hero_titulo: e.target.value })} placeholder="Tu título principal" /></div>
                  <div className="form-group"><label className="form-label">Subtítulo del hero</label><input value={des.hero_subtitulo || ''} onChange={e => set({ hero_subtitulo: e.target.value })} placeholder="Descripción corta" /></div>
                  <div className="form-group"><label className="form-label">Texto del footer</label><input value={des.footer_texto || ''} onChange={e => set({ footer_texto: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Descripción del footer (opcional)</label><input value={des.footer_desc || ''} onChange={e => set({ footer_desc: e.target.value })} placeholder="Frase corta bajo el nombre" /></div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                  <h4 style={{ marginBottom: 8, fontSize: 14 }}>Página de contacto</h4>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Estos datos arman tu página de contacto (link + QR para compartir/imprimir).</p>
                  <div className="form-group"><label className="form-label">Descripción / rubro</label><input value={des.contacto_desc || ''} onChange={e => set({ contacto_desc: e.target.value })} placeholder="Ej: Todo para el técnico" /></div>
                  <div className="form-group"><label className="form-label">Email de contacto</label><input value={des.email_contacto || ''} onChange={e => set({ email_contacto: e.target.value })} placeholder="hola@mitienda.com" /></div>
                  <div className="form-group"><label className="form-label">Teléfono</label><input value={des.telefono_contacto || ''} onChange={e => set({ telefono_contacto: e.target.value })} placeholder="+54 11 ..." /></div>
                  <div className="form-group"><label className="form-label">Dirección</label><input value={des.direccion || ''} onChange={e => set({ direccion: e.target.value })} placeholder="Calle 123, Ciudad" /></div>
                  <div className="form-group"><label className="form-label">Horario</label><input value={des.horario || ''} onChange={e => set({ horario: e.target.value })} placeholder="Lun a Vie 9-18hs" /></div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                  <h4 style={{ marginBottom: 8, fontSize: 14 }}>WhatsApp flotante</h4>
                  <div className="form-group"><label className="form-label">Número (con código país, sin +)</label><input value={des.whatsapp_numero || ''} onChange={e => set({ whatsapp_numero: e.target.value })} placeholder="5491100000000" /></div>
                  <div className="form-group"><label className="form-label">Mensaje inicial</label><input value={des.whatsapp_mensaje || ''} onChange={e => set({ whatsapp_mensaje: e.target.value })} placeholder="Hola, quiero consultar..." /></div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                  <h4 style={{ marginBottom: 8, fontSize: 14 }}><Shield size={15} style={{ verticalAlign: '-2px' }} /> Tarjetas de confianza</h4>
                  {[1, 2, 3].map(n => (
                    <div key={n} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ width: 150 }}><IconPicker label={`Ícono ${n}`} value={des[`confianza_${n}_icono`] || ''} onChange={v => set({ [`confianza_${n}_icono`]: v })} /></div>
                      <input value={des[`confianza_${n}_titulo`] || ''} onChange={e => set({ [`confianza_${n}_titulo`]: e.target.value })} style={{ flex: 1, minWidth: 110 }} placeholder="Título" />
                      <input value={des[`confianza_${n}_sub`] || ''} onChange={e => set({ [`confianza_${n}_sub`]: e.target.value })} style={{ flex: 1, minWidth: 110 }} placeholder="Subtítulo" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO — preview en vivo */}
        <div className="editor-preview">
          <div className="editor-preview-bar">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vista previa en vivo</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="editor-device-btns">
                <button className={predev === 'desktop' ? 'active' : ''} onClick={() => setPredev('desktop')} title="Escritorio"><Monitor size={16} /></button>
                <button className={predev === 'mobile' ? 'active' : ''} onClick={() => setPredev('mobile')} title="Celular"><Smartphone size={16} /></button>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setPreviewKey(k => k + 1)} title="Recargar preview"><Ico n="refresh-cw" s={14} /></button>
            </div>
          </div>
          <div className={`editor-preview-frame ${predev}`}>
            <iframe
              key={previewKey}
              ref={iframeRef}
              src="/?preview=1"
              title="preview"
              onLoad={applyToPreview}
              style={predev === 'desktop' ? { width: '100%', height: '100%', border: 'none', background: '#fff' } : { border: 'none', background: '#fff' }}
            />
          </div>
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
              <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar contacto?')) return; try { await api.deleteContacto(c.id); toast('Eliminado'); load(); } catch (e) { toast(e.message, 'error'); } }}><Ico n="trash" s={15} /></button>
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
                  <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar lead?')) return; try { await api.deleteLead(l.id); toast('Eliminado'); load(); } catch (e) { toast(e.message, 'error'); } }}><Ico n="trash" s={15} /></button>
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
              <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar barra?')) return; try { await api.deleteBarra(b.id); toast('Eliminado'); load(); refreshPublic(); } catch (e) { toast(e.message, 'error'); } }}><Ico n="trash" s={15} /></button>
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
          <div className="form-group"><label className="form-label">Imagen * <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>(compu: horizontal, ej. 1600 × 500)</span></label>
            <input type="file" accept="image/*" onChange={async e => { const file = e.target.files[0]; if (file) { try { const r = await api.uploadImagen(file); setForm({ ...form, imagen: r.url }); } catch { toast('Error al subir', 'error'); } } }} />
            {form.imagen && <img src={form.imagen} alt="" style={{ maxHeight: 100, marginTop: 8, borderRadius: 8 }} />}
            <input value={form.imagen} onChange={e => setForm({ ...form, imagen: e.target.value })} placeholder="O pegá URL" style={{ marginTop: 4, fontSize: 12 }} />
          </div>
          <div className="form-group"><label className="form-label">Imagen para celular (opcional)</label>
            <small className="form-hint" style={{ marginTop: 0, marginBottom: 6 }}>Recomendado: vertical o cuadrada (ej. 1080 × 1080). Si no cargás una, en el celular se muestra la imagen principal entera.</small>
            <input type="file" accept="image/*" onChange={async e => { const file = e.target.files[0]; if (file) { try { const r = await api.uploadImagen(file); setForm({ ...form, imagen_mobile: r.url }); } catch { toast('Error al subir', 'error'); } } }} />
            {form.imagen_mobile && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><img src={form.imagen_mobile} alt="" style={{ maxHeight: 100, borderRadius: 8 }} /><button type="button" className="link-btn" onClick={() => setForm({ ...form, imagen_mobile: '' })}>Quitar</button></div>}
          </div>
          <div className="form-group"><label className="form-label">URL destino (opcional)</label><input value={form.url_destino} onChange={e => setForm({ ...form, url_destino: e.target.value })} placeholder="https://..." /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
          <button className="btn btn-primary" onClick={save} style={{ width: '100%' }}>Guardar</button>
        </div></div>
      )}
    </div>
  );
}

// ─── ADMIN: Envíos Custom ───
function AdminEnviosCustom() {
  const { secciones, toast, config, setConfig } = useContext(Ctx);
  const [items, setItems] = useState([]); const [show, setShow] = useState(false);
  const [form, setForm] = useState({ seccion_id: null, nombre: '', descripcion: '', precio: 0, tipo: 'a_cotizar', activo: true, gratis_desde: 0, tiempo_estimado: '', icono: 'truck', orden: 0 });
  const [edit, setEdit] = useState(null);
  const [sub, setSub] = useState('metodos');
  const [aclaracion, setAclaracion] = useState('');
  const load = () => api.getEnvioCustomAll().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { setAclaracion(config.aclaracion_envios || ''); }, [config]);
  const save = async () => {
    if (!form.nombre?.trim()) { toast('Nombre obligatorio', 'error'); return; }
    if (form.tipo === 'fijo' && !(Number(form.precio) > 0)) { toast('Poné el costo del envío, o elegí "A cotizar" o "Gratis"', 'error'); return; }
    const datos = { ...form, precio: form.tipo === 'fijo' ? Number(form.precio) || 0 : 0 };
    try { if (edit) await api.updateEnvioCustom(edit.id, datos); else await api.createEnvioCustom(datos); load(); setShow(false); toast('Guardado'); } catch (e) { toast(e.message, 'error'); }
  };
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h4>Métodos de envío custom</h4><button className="btn btn-primary btn-sm" onClick={() => { setEdit(null); setForm({ seccion_id: null, nombre: '', descripcion: '', precio: 0, tipo: 'a_cotizar', activo: true, gratis_desde: 0, tiempo_estimado: '', icono: 'truck', orden: 0 }); setShow(true); }}>+ Nuevo</button></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Aparecen junto a Andreani en el checkout. Ej: Uber Moto CABA, Retiro Local, Didi.</p>
      {items.map(m => (
        <div key={m.id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <RenderIcon value={m.icono} size={20} />
          <div style={{ flex: 1 }}><strong>{m.nombre}</strong> {m.descripcion && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— {m.descripcion}</span>}
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{secciones.find(s => s.id === m.seccion_id)?.nombre || 'Todas'} · {cobroEnvio(m) === 'gratis' ? 'Gratis' : cobroEnvio(m) === 'a_cotizar' ? 'A cotizar' : fmtARS(m.precio)} {m.tiempo_estimado && `· ${m.tiempo_estimado}`}</div>
          </div>
          <span style={{ fontSize: 11, color: m.activo ? 'var(--success)' : 'var(--danger)' }}>{m.activo ? '✓' : '✗'}</span>
          <button className="btn btn-outline btn-sm" onClick={() => { setEdit(m); setForm({ ...m, tipo: cobroEnvio(m) }); setShow(true); }}><Ico n="edit" s={15} /></button>
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
          <div className="form-group"><label className="form-label">¿Cómo se cobra?</label>
            <div className="env-cobro">
              {[['fijo', 'Precio fijo'], ['a_cotizar', 'A cotizar'], ['gratis', 'Gratis']].map(([k, t]) => <button key={k} type="button" className={form.tipo === k ? 'sel' : ''} onClick={() => setForm({ ...form, tipo: k })}>{t}</button>)}
            </div>
            <span className="form-hint">{form.tipo === 'a_cotizar' ? 'El cliente ve "A cotizar" y el costo se lo pasás después por WhatsApp (no se suma al total).' : form.tipo === 'gratis' ? 'Siempre sin cargo para el cliente.' : 'El cliente paga este monto, que se suma al total del pedido.'}</span>
          </div>
          <div className="form-row">
            {form.tipo === 'fijo' && <div className="form-group"><label className="form-label">Costo del envío $</label><input type="number" value={form.precio || ''} onChange={e => setForm({ ...form, precio: Number(e.target.value) })} placeholder="Ej: 6500" /><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Lo que paga el cliente por este envío</span></div>}
            {form.tipo !== 'gratis' && <div className="form-group"><label className="form-label">Envío gratis desde $</label><input type="number" value={form.gratis_desde} onChange={e => setForm({ ...form, gratis_desde: Number(e.target.value) })} placeholder="0 = nunca" /><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Si el pedido supera este monto, el envío es gratis</span></div>}
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
              <label style={{ fontSize: 12 }}>Envío gratis desde $:</label>
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
        <div style={{ background: 'var(--border-light)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
          ℹ️ El nombre, logo, favicon y WhatsApp de la tienda ahora se editan desde <strong>Personalizar tienda</strong> (con vista previa). Acá quedan solo los ajustes internos del negocio.
        </div>
        <div className="form-group"><label className="form-label">Nombre del negocio (interno, para remitos)</label><input value={c.nombre_negocio || ''} onChange={e => setC({ ...c, nombre_negocio: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Email para avisos de venta</label><input type="email" value={c.email_ventas || ''} onChange={e => setC({ ...c, email_ventas: e.target.value })} placeholder="tucorreo@gmail.com" /><small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Te llega un mail cada vez que entra una venta online, con link directo a la orden. En el celular la app de mail te avisa.</small></div>
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

        {/* Dolar blue manual fallback */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <div className="form-group"><label className="form-label">Dólar blue manual (fallback si la API falla)</label><input type="number" value={c.dolar_blue || ''} onChange={e => setC({ ...c, dolar_blue: e.target.value })} placeholder="Se busca automáticamente de dolarapi.com" /></div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={c.checkout_factura !== 'off'} onChange={e => setC({ ...c, checkout_factura: e.target.checked ? 'on' : 'off' })} />
            Ofrecer opción de factura en el checkout
          </label>
          <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Si lo desactivás, el cliente no ve el paso de facturación al comprar. Vos elegís después cuáles pedidos facturar.</small>
        </div>

        <button className="btn btn-primary" onClick={saveAll} style={{ marginTop: 16, width: '100%' }}>Guardar configuración</button>
      </div>

      {/* Section-level config */}
      <SectionStockConfig />

      {/* Mantenimiento */}
      <div className="card" style={{ padding: 16 }}>
        <h4 style={{ marginBottom: 8 }}><Wrench size={15} style={{ verticalAlign: '-2px' }} /> Modo mantenimiento</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><input type="checkbox" checked={m.activo} onChange={e => setM({ ...m, activo: e.target.checked })} /> Activar mantenimiento</label>
        <div className="form-group"><label className="form-label">Mensaje personalizado</label><input value={m.mensaje} onChange={e => setM({ ...m, mensaje: e.target.value })} placeholder="Estamos trabajando en mejoras..." /></div>
        <div className="form-group"><label className="form-label">Fecha de vuelta (countdown)</label><input type="datetime-local" value={m.countdown} onChange={e => setM({ ...m, countdown: e.target.value })} /></div>
        <button className="btn btn-warning" onClick={saveMaint}>{m.activo ? 'Guardar y activar mantenimiento' : 'Guardar (desactivado)'}</button>
      </div>
    </div>
  );
}

export { AdminPanel, PanelPlataforma, ComerciappLanding, CrearTiendaPage, ComerciappLoginPage };
