import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, Fragment } from 'react';
import { createPortal } from 'react-dom';
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
// Dispara un evento a Google Analytics y Facebook Pixel (si están cargados). gaName y fbName son los nombres estándar de cada plataforma.
const trackEvent = (gaName, fbName, data = {}) => {
  try { if (window.gtag && gaName) window.gtag('event', gaName, data); } catch {}
  try { if (window.fbq && fbName) window.fbq('track', fbName, data); } catch {}
};
// Nº de orden con prefijo según tipo: presupuesto → P-0001, pedido → #0001. El id interno no cambia.
const numOrden = (o) => { const id = String(o?.id ?? '').padStart(4, '0'); return (o?.tipo === 'presupuesto') ? `P-${id}` : `#${id}`; };
const waLink = (num, msg) => `https://api.whatsapp.com/send?phone=${String(num).replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`;
const openWA = (num, msg) => window.open(waLink(num, msg), '_blank');

// ─── SISTEMA DE TEMAS / EDITOR VISUAL ───
// Opciones de fuente (Google Fonts, cargadas dinámicamente)
const FONT_OPTIONS = [
  { id: 'Archivo', label: 'Archivo (por defecto)', cat: 'Sans moderna' },
  { id: 'Inter', label: 'Inter', cat: 'Sans limpia' },
  { id: 'Poppins', label: 'Poppins', cat: 'Sans redondeada' },
  { id: 'Roboto', label: 'Roboto', cat: 'Sans clásica' },
  { id: 'Montserrat', label: 'Montserrat', cat: 'Sans elegante' },
  { id: 'Open Sans', label: 'Open Sans', cat: 'Sans neutra' },
  { id: 'Lato', label: 'Lato', cat: 'Sans cálida' },
  { id: 'Nunito', label: 'Nunito', cat: 'Sans amable' },
  { id: 'Work Sans', label: 'Work Sans', cat: 'Sans versátil' },
  { id: 'Space Grotesk', label: 'Space Grotesk', cat: 'Tech' },
  { id: 'Outfit', label: 'Outfit', cat: 'Geométrica' },
  { id: 'Playfair Display', label: 'Playfair Display', cat: 'Serif lujo' },
  { id: 'Merriweather', label: 'Merriweather', cat: 'Serif legible' },
  { id: 'DM Sans', label: 'DM Sans', cat: 'Sans compacta' },
];
// Estilos de esquina (radio) para cards, botones e inputs
const RADIUS_STYLES = {
  cuadrado: { card: '4px', btn: '6px', pill: '6px', label: 'Cuadrado' },
  suave: { card: '12px', btn: '10px', pill: '999px', label: 'Suave' },
  redondeado: { card: '20px', btn: '14px', pill: '999px', label: 'Redondeado' },
  extra: { card: '28px', btn: '20px', pill: '999px', label: 'Muy redondeado' },
};
// Estilo de sombra de las cards
const SHADOW_STYLES = {
  none: { shadow: 'none', lg: 'none', label: 'Sin sombra' },
  suave: { shadow: '0 2px 8px rgba(0,0,0,0.05)', lg: '0 8px 24px rgba(0,0,0,0.08)', label: 'Suave' },
  media: { shadow: '0 4px 14px rgba(0,0,0,0.10)', lg: '0 12px 32px rgba(0,0,0,0.14)', label: 'Media' },
  fuerte: { shadow: '0 8px 24px rgba(0,0,0,0.16)', lg: '0 20px 48px rgba(0,0,0,0.22)', label: 'Fuerte' },
};
// Estilo visual de las cards de producto
const CARD_STYLES = {
  elevado: { border: 'none', label: 'Elevado (con sombra)' },
  borde: { border: '1.5px solid var(--border)', label: 'Con borde' },
  plano: { border: 'none', label: 'Plano (sin sombra ni borde)' },
};
// Temas prediseñados COMPLETOS. Cada uno define modo (claro/oscuro) y set completo de colores.
// mode: 'light' | 'dark' decide la base de fondos/textos. Los vars explícitos pisan la base.
const THEME_PRESETS = [
  {
    id: 'kicks', name: 'Kicks', desc: 'Moderno · claro', mode: 'light',
    p: '#4A69E2', s: '#232321', a: '#FFA52F', font: 'Archivo',
    radius: 'redondeado', shadow: 'suave', card: 'elevado',
    bg: '#F3F3F3', bgCard: '#ffffff', text: '#232321', textSec: '#626262', border: '#E7E7E3',
    headerBg: '#ffffff', marqueeBg: '#232321',
  },
  {
    id: 'minimal', name: 'Minimal', desc: 'Editorial · B&N', mode: 'light',
    p: '#000000', s: '#000000', a: '#000000', font: 'Inter',
    radius: 'cuadrado', shadow: 'none', card: 'borde',
    bg: '#ffffff', bgCard: '#ffffff', text: '#111111', textSec: '#666666', border: '#e5e5e5',
    headerBg: '#ffffff', marqueeBg: '#111111',
  },
  {
    id: 'tech', name: 'Tech', desc: 'Electrónica · claro', mode: 'light',
    p: '#0284c7', s: '#0c4a6e', a: '#06b6d4', font: 'Space Grotesk',
    radius: 'suave', shadow: 'media', card: 'elevado',
    bg: '#eef4f8', bgCard: '#ffffff', text: '#0f172a', textSec: '#475569', border: '#d5e3ee',
    headerBg: '#0c4a6e', headerText: '#ffffff', marqueeBg: '#06b6d4',
  },
  {
    id: 'boutique', name: 'Boutique', desc: 'Elegante · serif', mode: 'light',
    p: '#9d174d', s: '#4a044e', a: '#c99a3f', font: 'Playfair Display',
    radius: 'suave', shadow: 'suave', card: 'elevado',
    bg: '#fbf7f4', bgCard: '#ffffff', text: '#3d1f2b', textSec: '#7c5866', border: '#ecdcd6',
    headerBg: '#ffffff', marqueeBg: '#4a044e',
  },
  {
    id: 'dark', name: 'Dark Pro', desc: 'Oscuro premium', mode: 'dark',
    p: '#a78bfa', s: '#c4b5fd', a: '#f472b6', font: 'Outfit',
    radius: 'redondeado', shadow: 'fuerte', card: 'elevado',
    bg: '#0f0f14', bgCard: '#1a1a24', text: '#f5f5f7', textSec: '#a1a1aa', border: '#2a2a38',
    headerBg: '#15151f', marqueeBg: '#a78bfa', marqueeText: '#0f0f14',
  },
  {
    id: 'fresh', name: 'Fresh', desc: 'Colorido · claro', mode: 'light',
    p: '#059669', s: '#065f46', a: '#f59e0b', font: 'Nunito',
    radius: 'extra', shadow: 'media', card: 'elevado',
    bg: '#f0fdf4', bgCard: '#ffffff', text: '#14532d', textSec: '#4d7c5f', border: '#c9ecd5',
    headerBg: '#059669', headerText: '#ffffff', marqueeBg: '#f59e0b', marqueeText: '#3d2800',
  },
  {
    id: 'sunset', name: 'Sunset', desc: 'Cálido vibrante', mode: 'light',
    p: '#ea580c', s: '#9a3412', a: '#facc15', font: 'Poppins',
    radius: 'redondeado', shadow: 'media', card: 'elevado',
    bg: '#fff7ed', bgCard: '#ffffff', text: '#431407', textSec: '#9a6a4a', border: '#fde3cd',
    headerBg: '#9a3412', headerText: '#ffffff', marqueeBg: '#facc15', marqueeText: '#431407',
  },
  {
    id: 'midnight', name: 'Midnight', desc: 'Oscuro azulado', mode: 'dark',
    p: '#38bdf8', s: '#7dd3fc', a: '#34d399', font: 'DM Sans',
    radius: 'suave', shadow: 'fuerte', card: 'elevado',
    bg: '#0b1120', bgCard: '#141d2e', text: '#e2e8f0', textSec: '#94a3b8', border: '#243045',
    headerBg: '#0f1729', marqueeBg: '#38bdf8', marqueeText: '#0b1120',
  },
  {
    id: 'candy', name: 'Candy', desc: 'Rosa juvenil', mode: 'light',
    p: '#db2777', s: '#9d174d', a: '#a855f7', font: 'Nunito',
    radius: 'extra', shadow: 'media', card: 'elevado',
    bg: '#fdf2f8', bgCard: '#ffffff', text: '#500724', textSec: '#a15579', border: '#fbd5e8',
    headerBg: '#db2777', headerText: '#ffffff', marqueeBg: '#a855f7', marqueeText: '#ffffff',
  },
  {
    id: 'forest', name: 'Forest', desc: 'Verde natural', mode: 'light',
    p: '#15803d', s: '#14532d', a: '#ca8a04', font: 'Merriweather',
    radius: 'cuadrado', shadow: 'suave', card: 'borde',
    bg: '#f7faf5', bgCard: '#ffffff', text: '#1a2e17', textSec: '#5a6b52', border: '#dbe7d3',
    headerBg: '#14532d', headerText: '#ffffff', marqueeBg: '#ca8a04', marqueeText: '#1a2e17',
  },
  {
    id: 'mono', name: 'Mono Dark', desc: 'Negro minimal', mode: 'dark',
    p: '#ffffff', s: '#d4d4d8', a: '#fbbf24', font: 'Space Grotesk',
    radius: 'cuadrado', shadow: 'none', card: 'borde',
    bg: '#0a0a0a', bgCard: '#171717', text: '#fafafa', textSec: '#a3a3a3', border: '#333333',
    headerBg: '#0a0a0a', marqueeBg: '#fbbf24', marqueeText: '#0a0a0a',
  },
  {
    id: 'ocean', name: 'Ocean', desc: 'Turquesa fresco', mode: 'light',
    p: '#0891b2', s: '#155e75', a: '#f97316', font: 'Work Sans',
    radius: 'redondeado', shadow: 'media', card: 'elevado',
    bg: '#ecfeff', bgCard: '#ffffff', text: '#083344', textSec: '#3d6b7a', border: '#c5eef5',
    headerBg: '#155e75', headerText: '#ffffff', marqueeBg: '#f97316', marqueeText: '#ffffff',
  },
];
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
// Cargar una Google Font on-demand (idempotente)
const loadedFonts = new Set();
function ensureFont(font) {
  if (!font || font === 'Archivo' || loadedFonts.has(font)) return;
  loadedFonts.add(font);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}
// Bases de modo claro/oscuro. El tema puede pisar cualquiera de estos con sus vars explícitos.
const MODE_BASE = {
  light: { bg: '#F3F3F3', bgCard: '#ffffff', text: '#232321', textSec: '#626262', textMuted: '#959595', border: '#E7E7E3', borderLight: '#F3F3F3' },
  dark: { bg: '#161616', bgCard: '#1f1f1f', text: '#f5f5f5', textSec: '#a3a3a3', textMuted: '#6f6f6f', border: '#2e2e2e', borderLight: '#262626' },
};
// Aplicar TODAS las variables de diseño a un root (document o iframe). Sin root = document.
// Si el tema trae mode, se aplica la base de ese modo primero y luego los overrides.
function applyDesignVars(des, rootEl) {
  const root = rootEl || document.documentElement;
  if (!des) return;
  const set = (k, v) => v && root.style.setProperty(k, v);

  // 1) Base de modo (si el tema lo define)
  const preset = THEME_PRESETS.find(t => t.id === des.plantilla);
  const mode = des.modo_tema || (preset && preset.mode) || null;
  if (mode && MODE_BASE[mode]) {
    const b = MODE_BASE[mode];
    set('--bg', b.bg); set('--bg-card', b.bgCard); set('--text', b.text);
    set('--text-secondary', b.textSec); set('--text-muted', b.textMuted);
    set('--border', b.border); set('--border-light', b.borderLight);
    // toggle clase dark en el root para reglas que dependen de .dark
    if (root === document.documentElement) { /* el toggle real lo maneja el modo usuario */ }
  }

  // 2) Overrides explícitos del tema/diseño
  set('--primary', des.color_primario);
  set('--primary-dark', des.color_secundario);
  if (des.color_acento) { set('--warning', des.color_acento); set('--accent', des.color_acento); }
  set('--bg', des.color_fondo);
  set('--bg-card', des.color_card);
  set('--text', des.color_texto);
  set('--text-secondary', des.color_texto_sec);
  set('--border', des.color_borde);
  set('--header-bg', des.color_header);
  set('--header-text', des.color_header_text);
  set('--marquee-bg', des.color_marquee);
  set('--marquee-text', des.color_marquee_text);
  // primary-light derivado (para focus rings) — usar primario con baja opacidad
  if (des.color_primario) set('--primary-light', hexToRgba(des.color_primario, 0.14));

  if (des.fuente) { ensureFont(des.fuente); set('--font', `'${des.fuente}', sans-serif`); }
  const rad = RADIUS_STYLES[des.estilo_bordes];
  if (rad) { set('--radius', rad.card); set('--radius-sm', rad.btn); set('--radius-pill', rad.pill); }
  const sh = SHADOW_STYLES[des.estilo_sombra];
  if (sh) { set('--shadow', sh.shadow); set('--shadow-lg', sh.lg); }
  const cd = CARD_STYLES[des.estilo_card];
  if (cd) set('--card-border', cd.border);
}
// hex → rgba string
function hexToRgba(hex, alpha) {
  if (!hex || hex[0] !== '#') return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}


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
  const [page, setPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('preview') === '1') return 'landing';
      if (params.get('contacto') === '1') return 'contacto';
    }
    const sv = localStorage.getItem('gm_page'); if (!sv || ['login','register','forgot','maintenance'].includes(sv)) return 'landing'; return sv;
  });
  const [loading, setLoading] = useState(true);
  const [enMantenimiento, setEnMantenimiento] = useState(false); // true = bloquear la tienda a visitantes (no admin)
  const [dark, setDark] = useState(() => localStorage.getItem('gm_dark') === 'true');
  const [testMode, setTestMode] = useState(() => localStorage.getItem('gm_test') === 'true');
  const [mobileMenu, setMobileMenu] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  const [secciones, setSecciones] = useState([]);
  const [config, setConfig] = useState({});
  const [design, setDesign] = useState({});
  const [miPlan, setMiPlan] = useState({ plan: 'full', estado: 'activo', features: null });

  // Update browser title + favicon when design changes
  useEffect(() => {
    if (design.nombre_tienda) document.title = design.nombre_tienda;
    if (design.favicon_url) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = design.favicon_url;
    }
  }, [design.nombre_tienda, design.favicon_url]);
  // Inyectar Google Analytics (GA4) y Facebook Pixel según config del negocio
  useEffect(() => {
    const gaId = (config.ga_id || '').trim();
    const pixelId = (config.fb_pixel_id || '').trim();
    // Google Analytics 4
    if (gaId && !window.__gaLoaded) {
      window.__gaLoaded = true;
      const s = document.createElement('script');
      s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', gaId);
    }
    // Facebook Pixel
    if (pixelId && !window.__fbLoaded) {
      window.__fbLoaded = true;
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', pixelId);
      window.fbq('track', 'PageView');
    }
  }, [config.ga_id, config.fb_pixel_id]);
  const [seccionActual, setSeccionActual] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_seccion') || 'null'); } catch { return null; } });
  const [selectedProduct, setSelectedProduct] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_product') || 'null'); } catch { return null; } });
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_cart') || '{}'); } catch { return {}; } });
  const [notifyProduct, setNotifyProduct] = useState(null);
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

  // Dark mode — el tema puede forzar el modo. Si design tiene modo_tema/plantilla con modo,
  // ese manda sobre el toggle del usuario. Si no, vale el toggle manual.
  const themeMode = design.modo_tema || (THEME_PRESETS.find(t => t.id === design.plantilla)?.mode) || null;
  const effectiveDark = themeMode ? (themeMode === 'dark') : dark;
  // clave estable de las variables de diseño relevantes (evita re-correr el efecto en cada render)
  const designKey = [design.plantilla, design.modo_tema, design.color_primario, design.color_secundario, design.color_acento, design.color_fondo, design.color_card, design.color_texto, design.color_header, design.color_marquee, design.fuente, design.estilo_bordes, design.estilo_sombra, design.estilo_card].join('|');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', effectiveDark);
    localStorage.setItem('gm_dark', dark);
    applyDesignVars(design);
  }, [effectiveDark, dark, designKey]);

  // Save cart
  useEffect(() => { localStorage.setItem('gm_cart', JSON.stringify(cart)); }, [cart]);

  // Registrar carrito abandonado a nivel app: si hay usuario logueado e items, tras 30s sin comprar
  const abandonoTimer = useRef(null);
  useEffect(() => {
    if (abandonoTimer.current) clearTimeout(abandonoTimer.current);
    const items = Object.entries(cart).flatMap(([secId, its]) => Array.isArray(its) ? its.filter(i => i.qty > 0).map(i => ({ ...i, seccion_id: Number(secId) })) : []);
    if (!user || !items.length) return;
    abandonoTimer.current = setTimeout(() => {
      const total = items.reduce((s, i) => s + (Number(i.precio_unitario || i.precio_base) || 0) * i.qty, 0);
      api.guardarCarritoAbandonado({
        usuario_id: user.id, email: user.email || '', telefono: user.telefono || user.whatsapp || '',
        items: items.map(i => ({ nombre: i.nombre || i.modelo, qty: i.qty, precio: i.precio_unitario || i.precio_base })),
        total, seccion_id: items[0]?.seccion_id || null
      }).catch(() => {});
    }, 30000); // 30s con items en el carrito sin cerrar compra
    return () => { if (abandonoTimer.current) clearTimeout(abandonoTimer.current); };
  }, [cart, user]);

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
        const [secs, cfg, des, menu, redes, lsts, pf, plan] = await Promise.all([
          api.getSecciones(), api.getConfig(), api.getDesign().catch(() => ({})),
          api.getMenu().catch(() => []), api.getRedesSociales().catch(() => []),
          api.getListas().catch(() => []), api.getPreciosFijos().catch(() => []),
          api.getMiPlan().catch(() => ({ plan: 'full', estado: 'activo', features: null }))
        ]);
        setSecciones(secs); setConfig(cfg); setDesign(des);
        if (plan) setMiPlan(plan);
        applyDesignVars(des);
        setMenuItems(menu); setRedesSociales(redes);
        setListas(Array.isArray(lsts) ? lsts : []); setPreciosFijos(Array.isArray(pf) ? pf : []);
        api.getBadges().then(setBadges).catch(() => {});
        api.getBarras().then(b => setBarras(Array.isArray(b) ? b : [])).catch(() => {});
        if (api.getToken()) {
          try { const me = await api.getMe(); setUser(me); }
          catch { api.logout(); }
        }
        // QR del remito: ?pedido=X abre el pedido SOLO si sos admin/subadmin (seguridad)
        const pedidoParam = new URLSearchParams(window.location.search).get('pedido');
        if (pedidoParam) {
          const me = api.getToken() ? await api.getMe().catch(() => null) : null;
          if (me && ['admin','subadmin'].includes(me.rol)) {
            setUser(me); setAdminTab('pedidos'); setPage('admin');
            setTimeout(() => { window.__openPedido = Number(pedidoParam); window.dispatchEvent(new Event('open-pedido')); }, 800);
          } else {
            // No es admin: no exponemos el panel. Limpiamos el parámetro y vamos a inicio.
            try { window.history.replaceState({}, '', window.location.pathname); } catch {}
            setPage('landing');
          }
        }
        // Carrito compartido: ?carrito=BASE64 precarga el carrito y lleva al cart
        const carritoParam = new URLSearchParams(window.location.search).get('carrito');
        if (carritoParam) {
          try {
            let payload;
            try { payload = JSON.parse(decodeURIComponent(atob(carritoParam))); }
            catch { payload = JSON.parse(atob(carritoParam)); } // fallback sin encodeURIComponent
            const nuevoCart = {};
            for (const it of (payload || [])) {
              const prod = await api.getProducto(it.p).catch(() => null);
              if (!prod) continue;
              const secId = String(it.s || prod.seccion_id);
              if (!nuevoCart[secId]) nuevoCart[secId] = [];
              nuevoCart[secId].push({ ...prod, seccion_id: secId, qty: Number(it.q) || 1, precio_unitario: prod.precio_base });
            }
            if (Object.keys(nuevoCart).length) {
              localStorage.setItem('gm_cart', JSON.stringify(nuevoCart));
              setCart(nuevoCart); setPage('cart');
              toast('Carrito cargado — revisá y continuá la compra');
            } else {
              toast('El carrito compartido no tiene productos disponibles', 'error');
            }
            window.history.replaceState({}, '', window.location.pathname);
          } catch (e) { toast('No se pudo cargar el carrito compartido', 'error'); }
        }
        const maint = await api.getMaintenanceStatus();
        if (maint.activo) {
          const me = api.getToken() ? await api.getMe().catch(() => null) : null;
          const esAdmin = me && ['admin','subadmin'].includes(me.rol);
          if (!esAdmin) setEnMantenimiento(true); // bloquea a TODO no-admin; el login del admin va DENTRO del bloque
        }
      } catch (e) { console.error('Init error:', e); }
      setLoading(false);
    })();
  }, []);

  // Sincroniza login/logout entre pestañas: si el token cambia en otra pestaña, recarga esta para reflejarlo
  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'gm_token') window.location.reload(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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
    trackEvent('add_to_cart', 'AddToCart', { value: (precio || product.precio_base) * qty, currency: 'ARS', content_name: product.nombre || product.modelo });
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

  // ¿Estamos en la raíz de ComerciApp (el sitio del servicio, no una tienda)?
  // Es la raíz si: host = comerciapp.com.ar (sin subdominio) o ?comerciapp=1 (para probar sin dominio).
  const esComerciappRoot = (() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('comerciapp') === '1') return true;
      const host = window.location.hostname;
      const parts = host.split('.');
      // comerciapp.com.ar exacto o www.comerciapp.com.ar = raíz (4+ partes con subdominio ≠ www = tienda)
      if (host === 'comerciapp.com.ar' || host === 'www.comerciapp.com.ar') return true;
      return false;
    } catch { return false; }
  })();
  // Sitio ComerciApp en la raíz: sin sesión = landing/login/registro; con sesión de DUEÑO = panel de plataforma.
  const esOwner = !!user?.es_owner;
  const showComerciappSite = esComerciappRoot && (!user || esOwner);

  // Context value
  const ctx = {
    user, setUser, page, setPage: nav, loading, dark, setDark, toast,
    secciones, setSecciones, config, setConfig, design, setDesign,
    seccionActual, setSeccionActual, selectedProduct, setSelectedProduct, cart, setCart, menuItems, setMenuItems,
    redesSociales, setRedesSociales, badges, setBadges, barras, setBarras, listas, setListas,
    preciosFijos, setPreciosFijos, miPlan, setMiPlan, adminTab, setAdminTab, adminSeccion, setAdminSeccion,
    cartForSection, cartCount, addToCart, removeFromCart, updateCartQty, clearCart,
    handleLogin, handleLogout, getPrice, userLista, isAdmin, nav, fmt, fmtARS, openWA,
    testMode, setTestMode: (v) => { setTestMode(v); localStorage.setItem('gm_test', v); },
    globalSearch, setGlobalSearch, globalResults, setGlobalResults, doGlobalSearch,
    notifyProduct, setNotifyProduct
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>;
  // Modo mantenimiento: si está activo y NO sos admin, se bloquea TODA la tienda (no se puede escapar navegando).
  // Se renderiza ANTES del Ctx.Provider, así que usa una versión autocontenida (sin useContext).
  if (enMantenimiento) return <MaintenanceBlock effectiveDark={effectiveDark} config={config} design={design} />;

  // Route
  const renderPage = () => {
    switch (page) {
      case 'section': return seccionActual ? <SectionPage /> : <Landing />;
      case 'product': return selectedProduct ? <ProductDetailPage /> : <Landing />;
      case 'cart': return <CartPage />;
      case 'login': return <LoginPage />;
      case 'register': return <RegisterPage />;
      case 'admin': return isAdmin ? (['suspendido','vencido'].includes(miPlan?.estado) && !user?.es_owner ? <CuentaBloqueada estado={miPlan.estado} /> : <AdminPanel />) : <Landing />;
      case 'account': return user ? <AccountPanel /> : <LoginPage />;
      case 'forgot': return <ForgotPasswordPage />;
      case 'info': return <InfoPage />;
      case 'contacto': return <ContactoPage />;
      case 'favoritos': return user ? <FavoritosPage /> : <LoginPage />;
      case 'maintenance': return <MaintenancePage />;
      default: return <Landing />;
    }
  };

  return (
    <Ctx.Provider value={ctx}>
      {showComerciappSite ? (
        <div className={`app${effectiveDark ? ' dark' : ''}`}>
          {esOwner
            ? <PanelPlataforma onLogout={handleLogout} />
            : page === 'crear-tienda'
              ? <CrearTiendaPage onListo={() => nav('login')} onVolver={() => nav('landing')} />
              : (page === 'login' || page === 'forgot')
                ? <ComerciappLoginPage forgot={page === 'forgot'} onVolver={() => nav('landing')} onForgot={() => nav('forgot')} onLogin={() => nav('login')} />
                : <ComerciappLanding onLogin={() => nav('login')} onRegister={() => nav('crear-tienda')} />}
          <ToastContainer />
        </div>
      ) : (
      <div className={`app${effectiveDark ? ' dark' : ''}`}>
        <Header />
        <main className="main-content">{renderPage()}</main>
        <Footer />
        <WhatsAppFloat />
        <ToastContainer />
        <NotifyStockModal />
      </div>
      )}
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
  if (n === 'copy') return <svg {...p} fill="none"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
  return null;
}

// Íconos de marca profesionales para redes sociales (SVG, sin emojis)
function RedIcon({ tipo, s = 18 }) {
  const paths = {
    instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
    facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
    tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
    whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
    youtube: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.872.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    telegram: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
    twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    threads: 'M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.334-3.082.884-.76 2.13-1.207 3.6-1.293a13.087 13.087 0 013.257.18c-.1-.598-.302-1.05-.605-1.35-.417-.412-1.062-.622-1.918-.622h-.052c-.686 0-1.615.19-2.207 1.072l-1.833-1.235c.79-1.174 2.032-1.822 3.6-1.822h.078c1.44.01 2.573.44 3.363 1.278.727.77 1.14 1.87 1.235 3.28.05.024.098.05.146.076 1.32.68 2.28 1.716 2.78 3.006.7 1.83.63 4.44-1.66 6.7-1.87 1.83-4.16 2.66-7.34 2.68zm1.09-11.15c-.24 0-.485.007-.732.02-1.85.104-3.001.958-2.94 2.078.062 1.174 1.354 1.72 2.598 1.652 1.14-.062 2.634-.508 2.884-3.476a10.8 10.8 0 00-1.81-.274z',
    web: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm7.79 8.16h-3.406a15.94 15.94 0 00-1.398-4.088A8.03 8.03 0 0119.79 8.16zM12 2.04c.86 1.35 1.53 2.85 1.96 4.44h-3.92c.43-1.59 1.1-3.09 1.96-4.44zM2.21 15.84h3.406a15.94 15.94 0 001.398 4.088A8.03 8.03 0 012.21 15.84zm0-7.68h3.406a15.94 15.94 0 011.398-4.088A8.03 8.03 0 002.21 8.16zm3.79 7.68h3.92c-.43 1.59-1.1 3.09-1.96 4.44-.86-1.35-1.53-2.85-1.96-4.44zm0-7.68c.43-1.59 1.1-3.09 1.96-4.44.86 1.35 1.53 2.85 1.96 4.44H6zm11.79 7.68a8.03 8.03 0 01-2.804 4.088 15.94 15.94 0 001.398-4.088h3.406zm-5.79 4.44c-.86-1.35-1.53-2.85-1.96-4.44h3.92c-.43 1.59-1.1 3.09-1.96 4.44zm2.79-6.48h-5.58c-.11-.72-.17-1.45-.17-2.16s.06-1.44.17-2.16h5.58c.11.72.17 1.45.17 2.16s-.06 1.44-.17 2.16z',
  };
  const p = paths[tipo];
  if (!p) return <Ico n="link" s={s} />;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d={p} /></svg>;
}
// Etiquetas legibles de redes (compartidas)
const RED_LABELS = {
  instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', whatsapp_canal: 'Canal de WhatsApp',
  whatsapp_grupo: 'Grupo de WhatsApp', tiktok: 'TikTok', youtube: 'YouTube', telegram: 'Telegram',
  twitter: 'X (Twitter)', linkedin: 'LinkedIn', threads: 'Threads', web: 'Sitio web',
};
// Los canales/grupos de WhatsApp usan el ícono de WhatsApp
function redIconTipo(tipo) { return (tipo === 'whatsapp_canal' || tipo === 'whatsapp_grupo') ? 'whatsapp' : tipo; }

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
          {!design.modo_tema && !THEME_PRESETS.find(t => t.id === design.plantilla) && <button className="icon-btn desktop-only" onClick={() => setDark(!dark)} title="Modo oscuro">{dark ? <Ico n="sun" /> : <Ico n="moon" />}</button>}
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
          {!design.modo_tema && !THEME_PRESETS.find(t => t.id === design.plantilla) && <button style={{ color: 'var(--text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setDark(!dark)}>{dark ? <Ico n="sun" s={18} /> : <Ico n="moon" s={18} />} {dark ? 'Modo claro' : 'Modo oscuro'}</button>}
          {user && <button style={{ color: 'var(--text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { setMobMenu(false); nav('favoritos'); }}><span style={{ color: 'var(--danger)', display: 'inline-flex' }}><Ico n="heart" s={18} fill /></span> Favoritos</button>}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          {menuItems.map(m => <a key={m.id} href={m.url || '#'} style={{ color: 'var(--text)', fontWeight: 600, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em' }} onClick={() => setMobMenu(false)}>{m.titulo}</a>)}
          <a href="#" style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }} onClick={e => { e.preventDefault(); setMobMenu(false); nav('contacto'); }}>Contacto</a>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          {user ? (
            <>
              {isAdmin && <button style={{ color: 'var(--primary)', fontWeight: 700 }} onClick={() => { setMobMenu(false); nav('admin'); }}>Panel admin</button>}
              {isAdmin && <button style={{ color: testMode ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: 700 }} onClick={() => setTestMode(!testMode)}>{testMode ? 'Modo prueba: ON' : 'Modo prueba: OFF'}</button>}
              <button style={{ color: 'var(--text)' }} onClick={() => { setMobMenu(false); nav('account'); }}>Mi cuenta</button>
              <button style={{ color: 'var(--text)' }} onClick={() => { setMobMenu(false); handleLogout(); }}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 4 }} onClick={() => { setMobMenu(false); nav('login'); }}>Ingresar</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setMobMenu(false); nav('register'); }}>Registrarse</button>
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
  const { design, redesSociales, nav, secciones, miPlan } = useContext(Ctx);
  const activas = redesSociales.filter(r => r.activo && r.url);
  const [infoPags, setInfoPags] = useState([]);
  useEffect(() => { api.getPaginas().then(setInfoPags).catch(() => {}); }, []);
  return (
    <footer className="footer" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', padding: '40px 24px 28px', marginTop: 40 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Grid de columnas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 28, marginBottom: 28 }}>
          {/* Marca */}
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: 10 }}>
              {design.nombre_tienda || 'MI TIENDA'}
            </div>
            {design.footer_desc && <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{design.footer_desc}</p>}
          </div>
          {/* Navegación */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Tienda</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="#" onClick={e => { e.preventDefault(); nav('landing'); }} style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>Inicio</a>
              {secciones.filter(s => s.visible !== false).slice(0, 4).map(s => (
                <a key={s.id} href="#" onClick={e => { e.preventDefault(); nav('section', s.id); }} style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{s.nombre}</a>
              ))}
            </div>
          </div>
          {/* Info / páginas */}
          {infoPags.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Información</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {infoPags.map(p => <a key={p.id} href="#" onClick={e => { e.preventDefault(); nav('info'); }} style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{p.titulo}</a>)}
              </div>
            </div>
          )}
          {/* Contacto */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Contacto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="#" onClick={e => { e.preventDefault(); nav('contacto'); }} style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 700 }}>Ver toda mi info →</a>
              {design.whatsapp_numero && <a href={waLink(design.whatsapp_numero, design.whatsapp_mensaje || 'Hola!')} target="_blank" rel="noopener" style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>WhatsApp</a>}
              {design.email_contacto && <a href={`mailto:${design.email_contacto}`} style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{design.email_contacto}</a>}
            </div>
          </div>
        </div>
        {/* Ubicación + horarios + mini mapa */}
        {(design.direccion || design.horario) && (
          <div style={{ display: 'grid', gridTemplateColumns: design.direccion ? 'minmax(200px, 1fr) minmax(180px, 300px)' : '1fr', gap: 20, alignItems: 'center', paddingTop: 24, marginTop: 4, borderTop: '1px solid var(--border)', marginBottom: 8 }}>
            <div>
              {design.direccion && (
                <div style={{ marginBottom: design.horario ? 14 : 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Dónde estamos</div>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(design.direccion)}`} target="_blank" rel="noopener" style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{design.direccion}</a>
                </div>
              )}
              {design.horario && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Horarios</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, whiteSpace: 'pre-line' }}>{design.horario}</div>
                </div>
              )}
            </div>
            {design.direccion && (
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <iframe
                  title="mapa-footer"
                  width="100%"
                  height="150"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(design.direccion)}&output=embed`}
                />
              </div>
            )}
          </div>
        )}
        {/* Redes */}
        {activas.length > 0 && (
          <div className="footer-social" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px 18px', marginBottom: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            {activas.map(r => <a key={r.id || r.tipo} href={r.url} target="_blank" rel="noopener" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}><RedIcon tipo={redIconTipo(r.tipo)} s={16} /> <span>{RED_LABELS[r.tipo] || r.tipo.replace(/_/g, ' ')}</span></a>)}
          </div>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{design.footer_texto || `© ${new Date().getFullYear()} ${design.nombre_tienda || ''} — Todos los derechos reservados`}</p>
        {!miPlan?.features?.ocultar_marca && (
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <a href="https://comerciapp.com.ar" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 999 }}>
              Hecho con <strong style={{ color: 'var(--text-secondary)' }}>ComerciApp</strong>
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════
// WHATSAPP CONTACT WIDGET (multi-agente + captura de leads)
// ═══════════════════════════════════════════════════════════
function NotifyStockModal() {
  const { notifyProduct, setNotifyProduct, toast } = useContext(Ctx);
  const [canal, setCanal] = useState('whatsapp');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  useEffect(() => { if (notifyProduct) { setCanal('whatsapp'); setTel(''); setEmail(''); } }, [notifyProduct]);
  if (!notifyProduct) return null;
  const p = notifyProduct;
  const enviar = async () => {
    if (canal === 'whatsapp') { const t = tel.replace(/\D/g, ''); if (t.length < 10) { toast('Escribí tu WhatsApp con código de área (10 dígitos, ej: 1123456789)', 'error'); return; } try { await api.notificarStock(p.id, { telefono: t, canal: 'whatsapp' }); toast('¡Listo! Te avisamos por WhatsApp'); setNotifyProduct(null); } catch (err) { toast(err.message, 'error'); } }
    else { if (!email.includes('@')) { toast('Escribí un email válido', 'error'); return; } try { await api.notificarStock(p.id, { email, canal: 'email' }); toast('¡Listo! Te avisamos por email'); setNotifyProduct(null); } catch (err) { toast(err.message, 'error'); } }
  };
  return (
    <div className="modal-overlay" onClick={() => setNotifyProduct(null)}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-header"><span className="modal-title">Avisame cuando llegue</span><button className="modal-close" onClick={() => setNotifyProduct(null)}>✕</button></div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Te avisamos apenas vuelva <b>{p.nombre || p.modelo}</b>. ¿Cómo preferís que te contactemos?</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className={`btn ${canal === 'whatsapp' ? 'btn-success' : 'btn-outline'}`} onClick={() => setCanal('whatsapp')} style={{ flex: 1 }}>📱 WhatsApp</button>
            <button className={`btn ${canal === 'email' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCanal('email')} style={{ flex: 1 }}>✉️ Email</button>
          </div>
          {canal === 'whatsapp'
            ? <input placeholder="Tu WhatsApp (ej: 11 2345 6789)" value={tel} onChange={e => setTel(e.target.value)} style={{ width: '100%', marginBottom: 12 }} autoFocus />
            : <input placeholder="Tu email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', marginBottom: 12 }} autoFocus />}
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={enviar}>Confirmar aviso</button>
        </div>
      </div>
    </div>
  );
}

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
// Pantalla de mantenimiento AUTOCONTENIDA (no usa useContext — se renderiza fuera del Ctx.Provider).
// Incluye un mini-login de admin integrado: así el candado NUNCA se suelta y el admin entra desde acá mismo.
function MaintenanceBlock({ effectiveDark, config, design }) {
  const [maint, setMaint] = useState({ mensaje: '' });
  const [showLogin, setShowLogin] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.getMaintenanceStatus().then(setMaint).catch(() => {}); }, []);
  const logo = design?.logo_url || config?.logo || '';
  const nombre = design?.nombre_tienda || config?.nombre_negocio || '';
  const wa = (config?.whatsapp || design?.whatsapp_numero || '').replace(/[^0-9]/g, '');
  const wrap = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', background: 'var(--bg, #111)' };
  const inp = { width: '100%', padding: 12, fontSize: 15, marginBottom: 10, borderRadius: 10, border: '1px solid var(--border, #444)', background: 'var(--card-bg, #1a1a1a)', color: 'var(--text, #fff)' };

  const doLogin = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await api.login(usuario, password, otpCode || undefined);
      if (r && r.requires_otp) { setOtpStep(true); setBusy(false); return; }
      window.location.reload(); // login OK → recarga; si es admin el init lo deja pasar, si no sigue bloqueado
    } catch (e) { setErr(e.message || 'No se pudo ingresar'); setBusy(false); }
  };

  if (showLogin) {
    return (
      <div className={`app${effectiveDark ? ' dark' : ''}`} style={wrap}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          {logo ? <img src={logo} alt={nombre} style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 14, marginBottom: 14 }} /> : null}
          <h2 style={{ fontSize: 21, fontWeight: 900, margin: '0 0 6px' }}>{otpStep ? 'Verificación' : 'Acceso administrador'}</h2>
          <p style={{ color: 'var(--text-secondary, #999)', fontSize: 13, margin: '0 0 18px' }}>{otpStep ? 'Ingresá el código que te llegó por email' : 'Ingresá con tu usuario de administrador'}</p>
          {otpStep
            ? <input value={otpCode} onChange={e => setOtpCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="123456" maxLength={6} autoFocus style={{ ...inp, textAlign: 'center', fontSize: 22, letterSpacing: '0.3em' }} />
            : <>
                <input value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Usuario" autoFocus style={inp} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="Contraseña" style={inp} />
              </>}
          {err ? <p style={{ color: '#e74c3c', fontSize: 13, margin: '0 0 10px' }}>{err}</p> : null}
          <button className="btn btn-primary" disabled={busy} onClick={doLogin} style={{ width: '100%', padding: 13, marginBottom: 10 }}>{busy ? '...' : (otpStep ? 'Verificar' : 'Ingresar')}</button>
          <button onClick={() => { setShowLogin(false); setOtpStep(false); setErr(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #999)', cursor: 'pointer', fontSize: 13 }}>← Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app${effectiveDark ? ' dark' : ''}`} style={wrap}>
      {logo ? <img src={logo} alt={nombre} style={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 16, marginBottom: 16 }} /> : null}
      <div style={{ fontSize: 52, marginBottom: 8 }}>🔧</div>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 10px' }}>Estamos en mantenimiento</h1>
      <p style={{ color: 'var(--text-secondary, #999)', fontSize: 16, maxWidth: 460, lineHeight: 1.5, margin: '0 0 24px' }}>{maint.mensaje || 'Estamos trabajando en mejoras. Volvemos en un rato.'}</p>
      {wa ? <a className="btn btn-primary" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" style={{ marginBottom: 10 }}>Escribinos por WhatsApp</a> : null}
      <button className="btn btn-outline btn-sm" style={{ marginTop: 6, opacity: 0.6 }} onClick={() => setShowLogin(true)}>Acceso administrador</button>
    </div>
  );
}

function MaintenancePage() {
  const { nav, config, design } = useContext(Ctx);
  const [maint, setMaint] = useState({ mensaje: '' });
  useEffect(() => { api.getMaintenanceStatus().then(setMaint).catch(() => {}); }, []);
  const logo = design?.logo_url || config?.logo || '';
  const nombre = design?.nombre_tienda || config?.nombre_negocio || '';
  const wa = (config?.whatsapp || design?.whatsapp_numero || '').replace(/[^0-9]/g, '');
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', background: 'var(--bg)' }}>
      {logo ? <img src={logo} alt={nombre} style={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 16, marginBottom: 16 }} /> : null}
      <div style={{ fontSize: 52, marginBottom: 8 }}>🔧</div>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 10px' }}>Estamos en mantenimiento</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 460, lineHeight: 1.5, margin: '0 0 24px' }}>{maint.mensaje || 'Estamos trabajando en mejoras. Volvemos en un rato.'}</p>
      {wa ? <a className="btn btn-primary" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" style={{ marginBottom: 10 }}>Escribinos por WhatsApp</a> : null}
      <button className="btn btn-outline btn-sm" style={{ marginTop: 6, opacity: 0.6 }} onClick={() => nav('login')}>Acceso administrador</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INFO PAGE (renders paginas_info content)
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// PÁGINA DE CONTACTO — toda la info + compartir + QR
// ═══════════════════════════════════════════════════════════
function ContactoPage() {
  const { nav, design, redesSociales, secciones, config, toast } = useContext(Ctx);
  const activas = redesSociales.filter(r => r.activo && r.url);
  const urlContacto = typeof window !== 'undefined' ? `${window.location.origin}/?contacto=1` : '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(urlContacto)}`;
  const nombre = design.nombre_tienda || config.nombre_negocio || 'Mi tienda';

  const compartir = async () => {
    const texto = `📍 ${nombre}\n${design.contacto_desc || ''}\n${urlContacto}`;
    if (navigator.share) {
      try { await navigator.share({ title: nombre, text: texto, url: urlContacto }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(urlContacto); toast('Link copiado ✓'); } catch {}
    }
  };
  const copiarLink = async () => { try { await navigator.clipboard.writeText(urlContacto); toast('Link copiado ✓'); } catch {} };

  const redLabels = {
    instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', whatsapp_canal: 'Canal de WhatsApp',
    whatsapp_grupo: 'Grupo de WhatsApp', tiktok: 'TikTok', youtube: 'YouTube', telegram: 'Telegram',
    twitter: 'X (Twitter)', linkedin: 'LinkedIn', threads: 'Threads', web: 'Sitio web',
  };

  // Íconos SVG limpios para los datos de contacto (sin emojis)
  const ic = {
    whatsapp: <RedIcon tipo="whatsapp" s={20} />,
    mail: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
    phone: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    map: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>,
    clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  };
  const items = [];
  if (design.whatsapp_numero) items.push({ icon: ic.whatsapp, label: 'WhatsApp', value: design.whatsapp_numero, href: waLink(design.whatsapp_numero, design.whatsapp_mensaje || 'Hola!') });
  if (design.email_contacto) items.push({ icon: ic.mail, label: 'Email', value: design.email_contacto, href: `mailto:${design.email_contacto}` });
  if (design.telefono_contacto) items.push({ icon: ic.phone, label: 'Teléfono', value: design.telefono_contacto, href: `tel:${design.telefono_contacto}` });
  if (design.direccion) items.push({ icon: ic.map, label: 'Dirección', value: design.direccion, href: `https://maps.google.com/?q=${encodeURIComponent(design.direccion)}` });
  if (design.horario) items.push({ icon: ic.clock, label: 'Horario', value: design.horario, href: null });

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
      <button onClick={() => nav('landing')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', marginBottom: 16 }}>← VOLVER</button>

      <div className="card" style={{ padding: 32, borderRadius: 20, textAlign: 'center', marginBottom: 20 }}>
        {design.logo_url && <img src={design.logo_url} alt="" style={{ height: 72, borderRadius: 16, marginBottom: 16 }} />}
        <h1 style={{ fontWeight: 900, fontSize: 26, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{nombre}</h1>
        {design.contacto_desc && <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 4 }}>{design.contacto_desc}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={compartir}>Compartir mi info</button>
          <button className="btn btn-outline" onClick={copiarLink}>Copiar link</button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="card" style={{ padding: 8, borderRadius: 16, marginBottom: 20 }}>
          {items.map((it, i) => {
            const inner = (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <span style={{ display: 'inline-flex', color: 'var(--primary)' }}>{it.icon}</span>
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>{it.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word' }}>{it.value}</div>
                </div>
                {it.href && <span style={{ color: 'var(--primary)', fontSize: 18 }}>→</span>}
              </div>
            );
            return it.href
              ? <a key={i} href={it.href} target="_blank" rel="noopener" style={{ display: 'block', textDecoration: 'none' }}>{inner}</a>
              : <div key={i}>{inner}</div>;
          })}
        </div>
      )}

      {design.direccion && (
        <div className="card" style={{ padding: 0, borderRadius: 16, marginBottom: 20, overflow: 'hidden' }}>
          <iframe
            title="mapa"
            width="100%"
            height="220"
            style={{ border: 0, display: 'block' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(design.direccion)}&output=embed`}
          />
        </div>
      )}

      {activas.length > 0 && (
        <div className="card" style={{ padding: 20, borderRadius: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, textAlign: 'center' }}>Seguime en redes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {activas.map(r => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener" className="btn btn-outline" style={{ justifyContent: 'center', gap: 8 }}>
                <RedIcon tipo={redIconTipo(r.tipo)} s={16} /> {redLabels[r.tipo] || r.tipo.replace('_', ' ')}
              </a>
            ))}
          </div>
        </div>
      )}

      {secciones.filter(s => s.visible !== false).length > 0 && (
        <div className="card" style={{ padding: 20, borderRadius: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, textAlign: 'center' }}>Nuestras tiendas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {secciones.filter(s => s.visible !== false).map(s => (
              <button key={s.id} className="btn btn-outline" onClick={() => nav('section', s.id)} style={{ justifyContent: 'space-between' }}>
                <span>{s.nombre}</span><span>→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24, borderRadius: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Código QR de mi tienda</div>
        <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, borderRadius: 12, background: '#fff', padding: 8 }} />
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>Escaneá o imprimí este QR. Lleva directo a toda tu info de contacto.</p>
        <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => window.open(qrUrl, '_blank')}>Descargar QR</button>
      </div>
    </div>
  );
}

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
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
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showPass ? '🙈' : '👁'}</button>
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
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setSaving(true);
    try {
      const r = await api.registrarTienda(form);
      setOk(r);
    } catch (e) { setError(e.message || 'No se pudo crear la tienda'); setSaving(false); }
  };

  if (ok) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
        <div className="card" style={{ maxWidth: 460, padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
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
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" style={{ width: '100%' }} />
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)' }}>
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
        <div style={{ display: 'inline-block', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 999, marginBottom: 20 }}>15 días gratis · sin tarjeta</div>
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

function Landing() {
  const { secciones, badges, nav, toast, design, config, addToCart, user, getPrice, userLista, globalSearch, setGlobalSearch, globalResults, setGlobalResults, doGlobalSearch, setNotifyProduct } = useContext(Ctx);
  const [showPopup, setShowPopup] = useState(null);
  const [secProds, setSecProds] = useState({});
  const [sliders, setSliders] = useState([]);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [favIds, setFavIds] = useState(new Set());
  const [novedades, setNovedades] = useState([]);

  useEffect(() => {
    api.getNovedades('all', 10).then(setNovedades).catch(() => {});
  }, []);

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
    const umbralGratis = Number(config?.[`envio_gratis_desde_${secId}`]) || 0;
    const precioRefGratis = tieneOferta ? Number(p.precio_oferta) : Number(precio);
    const envioGratisCard = p.envio_gratis || (umbralGratis > 0 && precioRefGratis >= umbralGratis);
    const [notifyEmail, setNotifyEmail] = useState('');
    const [showNotify, setShowNotify] = useState(false);
    const [notifyCanal, setNotifyCanal] = useState('whatsapp');
    const [notifyTel, setNotifyTel] = useState('');
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
          {envioGratisCard && <span className="pbadge pbadge-shipping" style={{ position: 'absolute', top: 10 + (tieneOferta ? 30 : 0), left: 10, background: '#dc2626', color: '#fff' }}>ENVÍO GRATIS</span>}
          {sinStock && !puedeComprar && <span style={{ position: 'absolute', top: 10 + (tieneOferta ? 30 : 0) + (envioGratisCard ? 30 : 0), left: 10, background: 'var(--text-muted)', color: '#fff', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 10, fontWeight: 700 }}>Sin stock</span>}
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
          {p.es_preventa ? (() => {
            const pct = Number(p.preventa_descuento_pct) || 0;
            const precioReserva = pct > 0 ? Math.round(Number(p.precio_base) * (1 - pct / 100)) : Number(p.precio_base);
            return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 800, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>Preventa</span>
                {p.preventa_mostrar_fecha && p.preventa_fecha && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Llega {new Date(p.preventa_fecha).toLocaleDateString('es-AR')}</span>}
              </div>
              {pct > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 13 }}>{fmtARS(p.precio_base)}</span>
                  <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--success)' }}>{fmtARS(precioReserva)}</span>
                  <span style={{ background: 'var(--danger)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>-{pct}%</span>
                </div>
              )}
              {(() => {
                const cupo = Number(p.preventa_cupo) || 0;
                const reservado = Number(p.preventa_reservado) || 0;
                const agotada = cupo > 0 && reservado >= cupo;
                if (agotada) return <button className="btn btn-outline btn-sm" disabled style={{ width: '100%', opacity: 0.6 }}>Preventa agotada</button>;
                return <>
                  {cupo > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Quedan {cupo - reservado} de {cupo} en preventa</div>}
                  {addToCart && <button className="btn product-add-btn" onClick={(e) => { e.stopPropagation(); const fechaTxt = p.preventa_mostrar_fecha && p.preventa_fecha ? `\n\nFecha aproximada de ingreso: ${new Date(p.preventa_fecha).toLocaleDateString('es-AR')} (es estimada, puede variar).` : '\n\nEs un producto con demora: te avisamos apenas ingrese.'; if (!confirm(`Estás RESERVANDO un producto en preventa.${fechaTxt}\n\nNo es un producto disponible para entrega inmediata. ¿Querés reservarlo igual?`)) return; addToCart(secId, { ...p, _preventa: true, _precioReserva: precioReserva }, 1, precioReserva); toast('Reserva agregada al carrito'); }} style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}>RESERVAR {pct > 0 ? `a ${fmtARS(precioReserva)}` : ''}</button>}
                </>;
              })()}
            </div>
            );
          })()
          : sinStock && !puedeComprar ? (
            <div>
              <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setNotifyProduct(p); }} style={{ width: '100%' }}>
                🔔 Avisame cuando llegue
              </button>
            </div>
          ) : addToCart && (
            <button className="btn product-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(secId, p, 1); toast('Agregado al carrito'); }}>
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
        <div style={{ maxWidth: 1600, margin: '16px auto 0', padding: '0 20px' }}>
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
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '28px 20px 4px', textAlign: 'center' }}>
          {design.hero_titulo && <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>{design.hero_titulo}</h1>}
          {design.hero_subtitulo && <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>{design.hero_subtitulo}</p>}
        </div>
      )}
      {/* Search bar is now in Header */}
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '16px 20px 0' }}>
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
        <div style={{ maxWidth: 1600, margin: '20px auto', padding: '0 20px' }}>
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

      {/* ── OFERTAS DESTACADAS ── carrusel horizontal */}
      {!globalResults && (() => {
        const ofertas = [];
        for (const s of secciones) {
          for (const p of (secProds[s.id] || [])) {
            if (p.precio_oferta && p.precio_oferta > 0 && p.precio_oferta < p.precio_base) ofertas.push({ ...p, _secId: s.id });
          }
        }
        if (ofertas.length === 0) return null;
        return (
          <div style={{ maxWidth: 1600, margin: '24px auto 0', padding: '0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: 'var(--danger)', color: '#fff', padding: '2px 12px', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 800 }}>OFERTAS</span>
              </h2>
            </div>
            <div className="carousel-track">
              {ofertas.slice(0, 12).map(p => <div className="carousel-item" key={`of-${p.id}`}><ProductCard p={p} secId={p._secId} /></div>)}
            </div>
          </div>
        );
      })()}

      {/* ── NOVEDADES ── carrusel horizontal */}
      {!globalResults && novedades.length > 0 && (
        <div style={{ maxWidth: 1600, margin: '24px auto 0', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'var(--primary)', color: '#fff', padding: '2px 12px', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 800 }}>NOVEDADES</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>Lo último que sumamos</span>
            </h2>
          </div>
          <div className="carousel-track">
            {novedades.slice(0, 12).map(p => <div className="carousel-item" key={`nov-${p.id}`}><ProductCard p={p} secId={p.seccion_id} /></div>)}
          </div>
        </div>
      )}

      {/* ── PRODUCTS PER SECTION ── carruseles horizontales */}
      {!globalResults && secciones.map(s => {
        const prods = secProds[s.id] || [];
        if (!prods.length) return null;
        return (
          <div key={s.id} style={{ maxWidth: 1600, margin: '0 auto', padding: '28px 20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{s.nombre}</h2>
              <button onClick={() => nav('section', s.id)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Ver todos →
              </button>
            </div>
            <div className="carousel-track">
              {prods.slice(0, 12).map(p => <div className="carousel-item" key={p.id}><ProductCard p={p} secId={s.id} /></div>)}
            </div>
          </div>
        );
      })}

      {/* ── BANNER PUBLICITARIO ── al pie del catálogo (config.banner_texto) */}
      {config.banner_texto && (
        <div style={{ maxWidth: 1600, margin: '32px auto 0', padding: '0 20px' }}>
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
  const [stockFiltro, setStockFiltro] = useState('todos'); // todos | con | sin
  const [marcaFiltro, setMarcaFiltro] = useState('');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [orden, setOrden] = useState('relevancia'); // relevancia | precio_asc | precio_desc | nombre
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

  // Aplicar filtros de stock, rango de precio y orden (sobre lo que ya vino filtrado por cat/búsqueda)
  const productosFiltrados = (() => {
    let lista = [...productos];
    if (stockFiltro === 'con') lista = lista.filter(p => (p.stock > 0) || p.permitir_sin_stock || p.es_digital);
    else if (stockFiltro === 'sin') lista = lista.filter(p => !(p.stock > 0) && !p.permitir_sin_stock && !p.es_digital);
    if (marcaFiltro) lista = lista.filter(p => (p.marca || '') === marcaFiltro);
    const min = Number(precioMin) || 0;
    const max = Number(precioMax) || Infinity;
    if (min > 0 || max < Infinity) lista = lista.filter(p => { const pr = getPrecio(p).final; return pr >= min && pr <= max; });
    if (orden === 'precio_asc') lista.sort((a, b) => getPrecio(a).final - getPrecio(b).final);
    else if (orden === 'precio_desc') lista.sort((a, b) => getPrecio(b).final - getPrecio(a).final);
    else if (orden === 'nombre') lista.sort((a, b) => (a.nombre || a.modelo || '').localeCompare(b.nombre || b.modelo || ''));
    return lista;
  })();
  const marcasDisponibles = [...new Set(productos.map(p => p.marca).filter(Boolean))].sort();
  const hayFiltrosActivos = stockFiltro !== 'todos' || precioMin || precioMax || orden !== 'relevancia' || catFiltro || marcaFiltro;

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
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input placeholder="¿Qué buscás?" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} style={{ flex: 1, minWidth: 200, borderRadius: 12, padding: '12px 16px', border: '2px solid #E7E7E3', fontSize: 14, fontWeight: 500 }} />
        <select value={catFiltro} onChange={e => { setCatFiltro(e.target.value); setPagina(1); }} style={{ borderRadius: 12, padding: '12px 16px', border: '2px solid var(--border)', fontWeight: 600, fontSize: 13, minWidth: 180, background: 'var(--bg-card)' }}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Filtros avanzados: stock, precio, orden */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <select value={stockFiltro} onChange={e => setStockFiltro(e.target.value)} style={{ borderRadius: 10, padding: '9px 12px', border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 12.5, background: 'var(--bg-card)', width: 'auto' }}>
          <option value="todos">Todo el stock</option>
          <option value="con">Solo con stock</option>
          <option value="sin">Solo sin stock</option>
        </select>
        {marcasDisponibles.length > 0 && (
          <select value={marcaFiltro} onChange={e => setMarcaFiltro(e.target.value)} style={{ borderRadius: 10, padding: '9px 12px', border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 12.5, background: 'var(--bg-card)', width: 'auto' }}>
            <option value="">Todas las marcas</option>
            {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1.5px solid var(--border)', borderRadius: 10, padding: '2px 8px', background: 'var(--bg-card)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>$</span>
          <input type="number" placeholder="mín" value={precioMin} onChange={e => setPrecioMin(e.target.value)} style={{ width: 70, border: 'none', padding: '7px 2px', fontSize: 12.5, background: 'transparent' }} />
          <span style={{ color: 'var(--text-muted)' }}>–</span>
          <input type="number" placeholder="máx" value={precioMax} onChange={e => setPrecioMax(e.target.value)} style={{ width: 70, border: 'none', padding: '7px 2px', fontSize: 12.5, background: 'transparent' }} />
        </div>
        <select value={orden} onChange={e => setOrden(e.target.value)} style={{ borderRadius: 10, padding: '9px 12px', border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 12.5, background: 'var(--bg-card)', width: 'auto' }}>
          <option value="relevancia">Ordenar por</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="nombre">Nombre A-Z</option>
        </select>
        {hayFiltrosActivos && <button onClick={() => { setStockFiltro('todos'); setPrecioMin(''); setPrecioMax(''); setOrden('relevancia'); setCatFiltro(''); setMarcaFiltro(''); setPagina(1); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Limpiar filtros</button>}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}</span>
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
        {productosFiltrados.map(p => {
          const precio = getPrecio(p);
          const sinStock = !p.stock || p.stock <= 0;
          const umbralG = Number(config?.[`envio_gratis_desde_${p.seccion_id}`]) || 0;
          const envioGratis = p.envio_gratis || (umbralG > 0 && precio.final >= umbralG);
          return (
            <div key={p.id} className={`product-card ${sinStock ? 'sin-stock' : ''}`}>
              <div className="product-img-wrap" style={{ cursor: 'pointer' }} onClick={() => { setSelectedProduct({ ...p, precioFinal: precio.final, precioOriginal: precio.original, descuentoPct: precio.descuento }); nav('product'); }}>
                {p.imagen ? <img src={p.imagen} alt="" className="product-img" /> : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 48 }}>📦</div>}
                {/* Badges */}
                <div className="product-badges">
                  {envioGratis && <span className="pbadge pbadge-shipping" style={{ background: '#dc2626', color: '#fff' }}>ENVÍO GRATIS</span>}
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
                  <button className="btn product-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(sec.id, p, 1, precio.final); }}>
                    AGREGAR <Ico n="cart" s={14} />
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
// Checkout profesional por pasos: contacto, entrega, facturación (opcional), pago, resumen
function CheckoutModal({ user, secciones, seccionesConItems, allItems, envio, metodos, config, cupon, descuento, testMode, onConfirm, onClose }) {
  const { toast } = useContext(Ctx);
  const [paso, setPaso] = useState(1);
  const [saving, setSaving] = useState(false);

  // Datos precargados del usuario (editables)
  const [contacto, setContacto] = useState({
    nombre: user?.nombre || '', telefono: user?.telefono || '', email: user?.email || '',
  });
  const [entrega, setEntrega] = useState({
    tipo: 'retiro', // 'retiro' | 'envio'
    calle: '', numero: '', piso: '', localidad: '', cp: '',
  });
  const [facturacion, setFacturacion] = useState({
    necesita: false, tipo: 'consumidor_final', razon_social: user?.nombre_fantasia || user?.nombre || '',
    cuit_dni: '', condicion_iva: 'consumidor_final', domicilio_fiscal: '',
  });
  const [metodoPago, setMetodoPago] = useState(metodos && metodos[0] ? (metodos[0].nombre || metodos[0]) : 'transferencia');
  const [notas, setNotas] = useState('');

  // Totales
  const subtotalTodo = allItems.reduce((s, i) => s + (i.precio_unitario || i.precio_base) * i.qty, 0);
  const envioTotal = seccionesConItems.reduce((s, sec) => s + (envio[sec.id]?.costo || 0), 0);
  const totalFinal = subtotalTodo - (seccionesConItems.length === 1 ? descuento : 0) + (entrega.tipo === 'envio' ? envioTotal : 0);

  // El paso de facturación es opcional según config del panel (checkout_factura !== 'off')
  const facturaActiva = config.checkout_factura !== 'off';
  const pasos = facturaActiva ? ['Contacto', 'Entrega', 'Facturación', 'Pago', 'Resumen'] : ['Contacto', 'Entrega', 'Pago', 'Resumen'];
  const pasoActual = pasos[paso - 1]; // nombre del paso actual
  const totalPasos = pasos.length;

  const validarPaso = () => {
    if (pasoActual === 'Contacto') {
      if (!contacto.nombre.trim()) { toast('Poné el nombre', 'error'); return false; }
      if (!contacto.telefono.trim()) { toast('Poné un teléfono de contacto', 'error'); return false; }
    }
    if (pasoActual === 'Entrega' && entrega.tipo === 'envio') {
      if (!entrega.calle.trim() || !entrega.numero.trim() || !entrega.localidad.trim() || !entrega.cp.trim()) {
        toast('Completá la dirección de envío (calle, número, localidad y código postal)', 'error'); return false;
      }
    }
    if (pasoActual === 'Facturación' && facturacion.necesita) {
      if (!facturacion.cuit_dni.trim()) { toast('Poné el CUIT o DNI para la factura', 'error'); return false; }
      if (!facturacion.razon_social.trim()) { toast('Poné la razón social o nombre para la factura', 'error'); return false; }
    }
    return true;
  };

  const siguiente = () => { if (validarPaso()) setPaso(p => Math.min(totalPasos, p + 1)); };
  const anterior = () => setPaso(p => Math.max(1, p - 1));

  const confirmar = async () => {
    setSaving(true);
    await onConfirm({ contacto, entrega, facturacion: facturaActiva ? facturacion : { necesita: false }, metodoPago, notas });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
      <div className="modal" style={{ maxWidth: 540, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Finalizar compra</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Barra de pasos */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {pasos.map((p, idx) => (
            <div key={p} style={{ flex: 1, minWidth: 60, textAlign: 'center', fontSize: 11, fontWeight: paso === idx + 1 ? 800 : 500, color: paso === idx + 1 ? 'var(--primary)' : (paso > idx + 1 ? 'var(--success)' : 'var(--text-muted)') }}>
              <div style={{ height: 3, borderRadius: 2, background: paso >= idx + 1 ? (paso > idx + 1 ? 'var(--success)' : 'var(--primary)') : 'var(--border)', marginBottom: 4 }}></div>
              {paso > idx + 1 ? '✓ ' : ''}{p}
            </div>
          ))}
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* PASO 1: Contacto */}
          {pasoActual === 'Contacto' && (
            <div>
              <h4 style={{ marginBottom: 12, fontSize: 15 }}>📇 Datos de contacto</h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Ya cargamos tus datos. Podés ajustarlos si querés.</p>
              <div className="form-group"><label className="form-label">Nombre *</label><input value={contacto.nombre} onChange={e => setContacto({ ...contacto, nombre: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Teléfono *</label><input value={contacto.telefono} onChange={e => setContacto({ ...contacto, telefono: e.target.value })} placeholder="Ej: 11 2345 6789" /></div>
              <div className="form-group"><label className="form-label">Email</label><input value={contacto.email} onChange={e => setContacto({ ...contacto, email: e.target.value })} /></div>
            </div>
          )}

          {/* PASO 2: Entrega */}
          {pasoActual === 'Entrega' && (
            <div>
              <h4 style={{ marginBottom: 12, fontSize: 15 }}>🚚 ¿Cómo lo recibís?</h4>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={() => setEntrega({ ...entrega, tipo: 'retiro' })} style={{ flex: 1, minWidth: 140, padding: 12, borderRadius: 10, border: `2px solid ${entrega.tipo === 'retiro' ? 'var(--primary)' : 'var(--border)'}`, background: entrega.tipo === 'retiro' ? 'var(--primary-light)' : 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>🏪 Retiro en el local</button>
                <button onClick={() => setEntrega({ ...entrega, tipo: 'envio' })} style={{ flex: 1, minWidth: 140, padding: 12, borderRadius: 10, border: `2px solid ${entrega.tipo === 'envio' ? 'var(--primary)' : 'var(--border)'}`, background: entrega.tipo === 'envio' ? 'var(--primary-light)' : 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>📦 Envío a domicilio</button>
              </div>
              {entrega.tipo === 'retiro' ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12, background: 'var(--bg-card)', borderRadius: 10 }}>Coordinás el retiro después de confirmar el pedido. Te contactamos por los datos que dejaste.</p>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div className="form-group" style={{ flex: 2 }}><label className="form-label">Calle *</label><input value={entrega.calle} onChange={e => setEntrega({ ...entrega, calle: e.target.value })} /></div>
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Número *</label><input value={entrega.numero} onChange={e => setEntrega({ ...entrega, numero: e.target.value })} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Piso/Depto</label><input value={entrega.piso} onChange={e => setEntrega({ ...entrega, piso: e.target.value })} /></div>
                    <div className="form-group" style={{ flex: 2 }}><label className="form-label">Localidad *</label><input value={entrega.localidad} onChange={e => setEntrega({ ...entrega, localidad: e.target.value })} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Código postal *</label><input value={entrega.cp} onChange={e => setEntrega({ ...entrega, cp: e.target.value })} style={{ maxWidth: 160 }} /></div>
                  {envioTotal > 0 && <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>Costo de envío estimado: {fmtARS(envioTotal)}</p>}
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Facturación (opcional) */}
          {pasoActual === 'Facturación' && (
            <div>
              <h4 style={{ marginBottom: 12, fontSize: 15 }}>🧾 Facturación</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={facturacion.necesita} onChange={e => setFacturacion({ ...facturacion, necesita: e.target.checked })} />
                Necesito factura
              </label>
              {!facturacion.necesita ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12, background: 'var(--bg-card)', borderRadius: 10 }}>Si no necesitás factura, seguí al siguiente paso. Recibís tu comprobante de pedido igual.</p>
              ) : (
                <div>
                  <div className="form-group"><label className="form-label">Razón social / Nombre *</label><input value={facturacion.razon_social} onChange={e => setFacturacion({ ...facturacion, razon_social: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">CUIT / DNI *</label><input value={facturacion.cuit_dni} onChange={e => setFacturacion({ ...facturacion, cuit_dni: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Condición frente al IVA</label>
                    <select value={facturacion.condicion_iva} onChange={e => setFacturacion({ ...facturacion, condicion_iva: e.target.value })}>
                      <option value="consumidor_final">Consumidor final</option>
                      <option value="monotributo">Monotributo</option>
                      <option value="responsable_inscripto">Responsable inscripto</option>
                      <option value="exento">Exento</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Domicilio fiscal</label><input value={facturacion.domicilio_fiscal} onChange={e => setFacturacion({ ...facturacion, domicilio_fiscal: e.target.value })} /></div>
                </div>
              )}
            </div>
          )}

          {/* PASO 4: Pago */}
          {pasoActual === 'Pago' && (
            <div>
              <h4 style={{ marginBottom: 12, fontSize: 15 }}>💳 Método de pago</h4>
              {metodos && metodos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {metodos.map((m, idx) => {
                    const nombre = m.nombre || m;
                    return (
                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, border: `2px solid ${metodoPago === nombre ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer' }}>
                        <input type="radio" checked={metodoPago === nombre} onChange={() => setMetodoPago(nombre)} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{nombre}</div>
                          {m.datos && <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{m.datos}</div>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={{ width: '100%' }}>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              )}
              <div className="form-group" style={{ marginTop: 16 }}><label className="form-label">Notas (opcional)</label><textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Alguna aclaración para tu pedido" /></div>
            </div>
          )}

          {/* PASO 5: Resumen */}
          {pasoActual === 'Resumen' && (
            <div>
              <h4 style={{ marginBottom: 12, fontSize: 15 }}>✅ Revisá tu pedido</h4>
              <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                {allItems.map((i, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{i.qty}× {i.nombre || i.modelo}</span>
                    <span style={{ fontWeight: 600 }}>{fmtARS((i.precio_unitario || i.precio_base) * i.qty)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{fmtARS(subtotalTodo)}</span></div>
                  {seccionesConItems.length === 1 && descuento > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}><span>Descuento</span><span>-{fmtARS(descuento)}</span></div>}
                  {entrega.tipo === 'envio' && envioTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Envío</span><span>{fmtARS(envioTotal)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16, marginTop: 6 }}><span>Total</span><span>{fmtARS(totalFinal)}</span></div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div><strong>Contacto:</strong> {contacto.nombre} · {contacto.telefono}</div>
                <div><strong>Entrega:</strong> {entrega.tipo === 'retiro' ? 'Retiro en el local' : `Envío a ${entrega.calle} ${entrega.numero}${entrega.piso ? ` (${entrega.piso})` : ''}, ${entrega.localidad} (CP ${entrega.cp})`}</div>
                <div><strong>Pago:</strong> {metodoPago}</div>
                {facturacion.necesita && <div><strong>Factura:</strong> {facturacion.razon_social} · {facturacion.cuit_dni}</div>}
              </div>
              {testMode && <p style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--warning-text, #b45309)' }}>🧪 Modo prueba: el pedido se marca como test.</p>}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          {paso > 1 ? <button className="btn btn-outline" onClick={anterior}>← Atrás</button> : <span></span>}
          {paso < totalPasos
            ? <button className="btn btn-primary" onClick={siguiente}>Siguiente →</button>
            : <button className="btn btn-primary" onClick={confirmar} disabled={saving} style={{ minWidth: 160 }}>{saving ? 'Creando...' : (testMode ? '🧪 Confirmar (prueba)' : 'Confirmar pedido')}</button>}
        </div>
      </div>
    </div>
  );
}

// Pantalla de éxito post-checkout: número de pedido grande + botón para enviar el pedido por WhatsApp
function PedidoExitoModal({ exito, config, onClose }) {
  const nums = exito.nums || [];
  const numStr = nums.map(n => `#${String(n).padStart(4, '0')}`).join(', ');
  const wa = (config?.whatsapp || config?.whatsapp_numero || '').replace(/[^0-9]/g, '');
  const nombre = exito.contacto?.nombre || '';
  const msg = `¡Hola! Soy ${nombre}. Acabo de hacer el pedido ${numStr} por ${fmtARS(exito.total)}. Quiero coordinar el pago y la entrega.`;
  const waUrl = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}` : '';
  return (
    <div className="modal-overlay" style={{ zIndex: 3500 }}>
      <div className="modal" style={{ maxWidth: 420, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 58, marginBottom: 8 }}>✅</div>
          <h2 style={{ fontSize: 23, fontWeight: 900, margin: '0 0 4px' }}>¡Pedido confirmado!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px' }}>Anotá tu número de pedido</p>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{nums.length > 1 ? 'Pedidos' : 'Pedido'}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--primary)' }}>{numStr}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>Total: {fmtARS(exito.total)}</div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>Enviános el pedido por WhatsApp y coordinamos el pago y la entrega al toque.</p>
          {waUrl ? <a className="btn btn-success" href={waUrl} target="_blank" rel="noopener noreferrer" style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 800, marginBottom: 10, display: 'block' }}>📱 Enviar pedido por WhatsApp</a> : null}
          <button className="btn btn-outline" onClick={onClose} style={{ width: '100%', padding: 12 }}>Volver a la tienda</button>
        </div>
      </div>
    </div>
  );
}

function CartPage() {
  const { secciones, user, nav, toast, cart, setCart, removeFromCart, updateCartQty, clearCart, testMode, config } = useContext(Ctx);
  const [cupon, setCupon] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState('');
  const [metodos, setMetodos] = useState([]);
  const [notas, setNotas] = useState('');
  const [envio, setEnvio] = useState({});
  const [showMixPopup, setShowMixPopup] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [exito, setExito] = useState(null); // datos del pedido confirmado para la pantalla de éxito
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
            // Reserva de preventa: respetar el precio de reserva, no tocar stock ni precio
            if (it._preventa) {
              const precioReserva = Number(it._precioReserva || it.precio_unitario);
              nuevoCart[secId].push({ ...it, ...prod, _preventa: true, _precioReserva: precioReserva, seccion_id: secId, qty: it.qty, precio_unitario: precioReserva });
              continue;
            }
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

  // (el registro de carrito abandonado ahora se hace a nivel App)


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
          items: secItems.map(i => ({ producto_id: i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: i.nombre || i.modelo, cantidad: i.qty, precio_unitario: i.precio_unitario || i.precio_base, precio_base: i.precio_base, _preventa: i._preventa || false }))
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

  // Abre el modal de checkout (valida mínimos antes)
  const abrirCheckout = () => {
    if (!user) { toast('Necesitás iniciar sesión', 'warning'); nav('login'); return; }
    const bajoMin = seccionesConItems.find(sec => {
      const ss = allItems.filter(i => i.seccion_id === sec.id).reduce((a, i) => a + (i.precio_unitario || i.precio_base) * i.qty, 0);
      const min = Number(config[`compra_minima_${sec.id}`]) || 0;
      return min > 0 && ss < min;
    });
    if (bajoMin) { toast(`No llegás al mínimo de compra en ${bajoMin.nombre}`, 'warning'); return; }
    const totalCarrito = allItems.reduce((s, i) => s + (i.precio_unitario || i.precio_base) * i.qty, 0);
    trackEvent('begin_checkout', 'InitiateCheckout', { value: totalCarrito, currency: 'ARS', num_items: allItems.length });
    setShowCheckout(true);
  };

  // Crea el pedido con los datos del checkout (datosCheckout viene del modal)
  const checkout = async (datosCheckout) => {
    const dc = datosCheckout || {};
    const datosEnvioJSON = JSON.stringify({
      contacto: dc.contacto || {},
      entrega: dc.entrega || {},
    });
    const datosFactJSON = dc.facturacion && dc.facturacion.necesita ? JSON.stringify(dc.facturacion) : '';
    const pedidos = seccionesConItems.map(sec => {
      const secItems = allItems.filter(i => i.seccion_id === sec.id);
      const secSubtotal = secItems.reduce((s, i) => s + (i.precio_unitario || i.precio_base) * i.qty, 0);
      const secEnvio = envio[sec.id];
      const tieneReserva = secItems.some(i => i._preventa);
      return {
        seccion_id: sec.id, metodo_pago: dc.metodoPago || metodoPago,
        notas: tieneReserva ? `${dc.notas || notas} [RESERVA/PREVENTA — requiere seña]`.trim() : (dc.notas || notas), cupon_codigo: cupon,
        subtotal: secSubtotal, descuento: seccionesConItems.length === 1 ? descuento : 0,
        total: secSubtotal - (seccionesConItems.length === 1 ? descuento : 0) + (secEnvio?.costo || 0),
        costo_envio: secEnvio?.costo || 0, metodo_envio: secEnvio?.nombre || '', cp_destino: dc.entrega?.cp || '',
        estado_pago: tieneReserva ? 'senado' : 'impago',
        datos_envio: datosEnvioJSON, datos_facturacion: datosFactJSON,
        items: secItems.map(i => ({ producto_id: i.id, categoria: i.categoria, modelo: i.modelo, nombre_producto: i.nombre || i.modelo, cantidad: i.qty, precio_unitario: i.precio_unitario || i.precio_base, precio_base: i.precio_base, _preventa: i._preventa || false }))
      };
    }).filter(pp => pp.items.length);
    try {
      const r = await api.createPedidosMulti(pedidos, testMode);
      // Analytics: compra realizada
      const totalCompra = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
      trackEvent('purchase', 'Purchase', { value: totalCompra, currency: 'ARS', num_items: allItems.length });
      seccionesConItems.forEach(sec => clearCart(sec.id));
      setShowCheckout(false);
      const nums = (r?.pedidos || []).map(p => p.id).filter(Boolean);
      setExito({ nums, total: totalCompra, contacto: (datosCheckout && datosCheckout.contacto) || {} });
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 700, margin: '0 auto' }}>
      <button onClick={() => nav('landing')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', marginBottom: 12 }}>← Volver</button>
      <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 4 }}>🛒 Carrito</h2>
      {testMode && <div style={{ background: 'var(--warning)', color: '#000', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 800, display: 'inline-block', marginBottom: 12 }}>🧪 MODO PRUEBA — los pedidos se marcan como test</div>}
      {exito && <PedidoExitoModal exito={exito} config={config} onClose={() => { setExito(null); nav('landing'); }} />}
      {showCheckout && (
        <CheckoutModal
          user={user}
          secciones={secciones}
          seccionesConItems={seccionesConItems}
          allItems={allItems}
          envio={envio}
          metodos={metodos}
          config={config}
          cupon={cupon}
          descuento={descuento}
          testMode={testMode}
          onConfirm={checkout}
          onClose={() => setShowCheckout(false)}
        />
      )}

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
        <button onClick={async () => { try { const r = await api.validarCupon(cupon, seccionesConItems[0]?.id, subtotal, metodoPago, allItems, user?.id); setDescuento(r.descuento); toast(`Cupón: -${fmtARS(r.descuento)}`); } catch (e) { toast(e.message, 'error'); } }}
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

      <button onClick={abrirCheckout} disabled={algunaBajoMin} style={{ width: '100%', marginTop: 16, padding: 14, background: algunaBajoMin ? 'var(--border)' : 'var(--primary)', color: algunaBajoMin ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: algunaBajoMin ? 'not-allowed' : 'pointer' }}>
        {algunaBajoMin ? '🔒 No llegás a la compra mínima' : (testMode ? '🧪 CONTINUAR (PRUEBA)' : 'CONTINUAR AL CHECKOUT →')}
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
  const [relacionados, setRelacionados] = useState([]);
  useEffect(() => { if (p?.id) api.getRelacionados(p.id).then(setRelacionados).catch(() => setRelacionados([])); }, [p?.id]);
  useEffect(() => { if (p?.id) trackEvent('view_item', 'ViewContent', { content_name: p.nombre || p.modelo, value: Number(p.precioFinal || p.precio_base) || 0, currency: 'ARS' }); }, [p?.id]);
  const [isFav, setIsFav] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [showNotify, setShowNotify] = useState(false);
  const [notifyCanal, setNotifyCanal] = useState('whatsapp');
  const [notifyTel, setNotifyTel] = useState('');

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

          {p.es_preventa ? (() => {
            const pct = Number(p.preventa_descuento_pct) || 0;
            const precioReserva = pct > 0 ? Math.round(Number(p.precio_base) * (1 - pct / 100)) : Number(p.precio_base);
            const cupo = Number(p.preventa_cupo) || 0;
            const reservado = Number(p.preventa_reservado) || 0;
            const agotada = cupo > 0 && reservado >= cupo;
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, background: 'var(--accent)', color: '#fff', padding: '3px 12px', borderRadius: 5, textTransform: 'uppercase' }}>Preventa</span>
                  {p.preventa_mostrar_fecha && p.preventa_fecha && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Llega el {new Date(p.preventa_fecha).toLocaleDateString('es-AR')}</span>}
                </div>
                {pct > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 18 }}>{fmtARS(p.precio_base)}</span>
                    <span style={{ fontWeight: 900, fontSize: 26, color: 'var(--success)' }}>{fmtARS(precioReserva)}</span>
                    <span style={{ background: 'var(--danger)', color: '#fff', padding: '2px 8px', borderRadius: 5, fontSize: 13, fontWeight: 800 }}>-{pct}%</span>
                  </div>
                )}
                {cupo > 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Quedan {Math.max(0, cupo - reservado)} de {cupo} unidades en preventa</p>}
                {agotada
                  ? <button className="btn btn-outline" disabled style={{ width: '100%', opacity: 0.6 }}>Preventa agotada</button>
                  : <button className="btn" style={{ width: '100%', background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff', fontWeight: 800 }} onClick={() => { const fechaTxt = p.preventa_mostrar_fecha && p.preventa_fecha ? `\n\nFecha aproximada de ingreso: ${new Date(p.preventa_fecha).toLocaleDateString('es-AR')} (es estimada, puede variar).` : '\n\nEs un producto con demora: te avisamos apenas ingrese.'; if (!confirm(`Estás RESERVANDO un producto en preventa.${fechaTxt}\n\nNo es un producto disponible para entrega inmediata. ¿Querés reservarlo igual?`)) return; addToCart(sec?.id, { ...p, _preventa: true, _precioReserva: precioReserva }, qty, precioReserva); toast('Reserva agregada al carrito'); }}>RESERVAR{pct > 0 ? ` a ${fmtARS(precioReserva)}` : ''}</button>}
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Reservás pagando por adelantado. Te avisamos cuando llegue.</p>
              </div>
            );
          })() : sinStock ? (
            <div>
              <div className="pdp-nostock">SIN STOCK</div>
              {showNotify ? (
                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <button className={`btn btn-sm ${notifyCanal === 'whatsapp' ? 'btn-success' : 'btn-outline'}`} onClick={() => setNotifyCanal('whatsapp')} style={{ flex: 1 }}>WhatsApp</button>
                    <button className={`btn btn-sm ${notifyCanal === 'email' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setNotifyCanal('email')} style={{ flex: 1 }}>Email</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {notifyCanal === 'whatsapp'
                      ? <input placeholder="Tu WhatsApp" value={notifyTel} onChange={e => setNotifyTel(e.target.value)} style={{ flex: 1 }} />
                      : <input placeholder="Tu email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} style={{ flex: 1 }} />}
                    <button className="btn btn-primary" onClick={async () => {
                      if (notifyCanal === 'whatsapp') { const tel = notifyTel.replace(/\D/g, ''); if (tel.length < 10) { toast('Escribí tu WhatsApp con código de área (10 dígitos)', 'error'); return; } try { await api.notificarStock(p.id, { telefono: tel, canal: 'whatsapp' }); toast('¡Listo! Te avisamos por WhatsApp'); setShowNotify(false); } catch (err) { toast(err.message, 'error'); } }
                      else { if (!notifyEmail.includes('@')) { toast('Poné un email válido', 'error'); return; } try { await api.notificarStock(p.id, { email: notifyEmail, canal: 'email' }); toast('Te avisamos por email'); setShowNotify(false); } catch (err) { toast(err.message, 'error'); } }
                    }}>Avisar</button>
                  </div>
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

      {relacionados.length > 0 && (
        <div style={{ maxWidth: 1600, margin: '32px auto 0', padding: '0 20px' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>También te puede interesar</h3>
          <div className="product-grid">
            {relacionados.map(rp => (
              <div key={rp.id} className="card" style={{ padding: 12, cursor: 'pointer' }} onClick={() => { window.__secId = rp.seccion_id; nav('product', rp); }}>
                {rp.imagen ? <img src={rp.imagen} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} /> : <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--bg)', borderRadius: 8, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ico n="cart" s={28} /></div>}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rp.nombre || rp.modelo}</div>
                <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{fmtARS(rp.precio_oferta > 0 ? rp.precio_oferta : rp.precio_base)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
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
                <div style={{ fontWeight: 700, fontSize: 13 }}>{numOrden(o)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString('es-AR')} • {o.seccion_nombre}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{fmtARS(o.total)}</div>
                {Number(o.sena) > 0 && (o.estado_pago === 'senado' || o.estado_pago === 'debe') && <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 700 }}>Resta {fmtARS(Math.max(0, Number(o.total) - Number(o.sena || 0)))}</div>}
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
                <div style={{ fontWeight: 700, fontSize: 13 }}>{numOrden(o)}</div>
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
            <div className="modal-header"><span className="modal-title">{numOrden(viewDetail)}</span><button className="modal-close" onClick={() => setViewDetail(null)}>✕</button></div>
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
              {Number(viewDetail.sena) > 0 && (viewDetail.estado_pago === 'senado' || viewDetail.estado_pago === 'debe') && (
                <div style={{ marginTop: 10, background: 'var(--border-light)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--success)', marginBottom: 4 }}><span>Seña pagada</span><span style={{ fontWeight: 700 }}>{fmtARS(viewDetail.sena)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, color: 'var(--danger)' }}><span>Resta abonar</span><span>{fmtARS(Math.max(0, Number(viewDetail.total) - Number(viewDetail.sena || 0)))}</span></div>
                </div>
              )}
              {viewDetail.estado_pago === 'pagado' && <div style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: 'var(--success)', fontWeight: 700, background: 'var(--border-light)', padding: 8, borderRadius: 8 }}>✓ Pagado completo</div>}
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
function CuentaBloqueada({ estado }) {
  const { handleLogout, config } = useContext(Ctx);
  const wa = (config?.whatsapp || '').replace(/[^0-9]/g, '');
  const esVencido = estado === 'vencido';
  const msg = encodeURIComponent('Hola, quiero reactivar mi tienda en ComerciApp.');
  return (
    <div style={{ maxWidth: 480, margin: '48px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: 36, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>{esVencido ? '⏰' : '🔒'}</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 10px' }}>{esVencido ? 'Tu prueba terminó' : 'Tu cuenta está suspendida'}</h2>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '0 0 22px', lineHeight: 1.5 }}>
          {esVencido
            ? 'Se terminó tu período de prueba gratuito. Para seguir usando tu tienda y no perder tus datos, activá un plan.'
            : 'Tu tienda está suspendida temporalmente. Regularizá tu suscripción para volver a activarla.'}
          <br /><br />Tus datos están guardados y seguros.
        </p>
        {wa
          ? <a className="btn btn-primary" style={{ width: '100%', marginBottom: 10 }} href={`https://wa.me/${wa}?text=${msg}`} target="_blank" rel="noopener noreferrer">Activar mi plan por WhatsApp</a>
          : <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 10 }}>Contactá al administrador para reactivar tu cuenta.</div>}
        <button className="btn btn-outline" style={{ width: '100%' }} onClick={handleLogout}>Cerrar sesión</button>
      </div>
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
    pedidos: 'pedidos', presupuestos: 'pedidos', reglas_compra: 'pedidos',
    venta_manual: 'pedidos', ordenes_compra: 'pedidos', caja: 'stats',
    cupones: 'config', promociones: 'config', carritos: 'stats', reportes: 'stats',
    leads: 'stats', analytics: 'config',
    productos: 'productos', categorias: 'productos', listas: 'listas', notif_stock: 'productos',
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
          <button className="btn btn-primary btn-sm" onClick={() => { try { const u = new URL(window.location.href); u.searchParams.set('comerciapp', '1'); window.location.href = u.pathname + '?' + u.searchParams.toString(); } catch { window.location.href = '/?comerciapp=1'; } }} style={{ marginBottom: 12, width: '100%' }}>🌐 Panel de webs</button>
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
        {adminTab === 'reportes' && <AdminReportes />}
        {adminTab === 'caja' && <AdminCaja />}
        {adminTab === 'metodos_pago' && <AdminMetodosPago />}
        {adminTab === 'envios' && <AdminEnviosCustom />}
        {adminTab === 'diseno' && <AdminDisenoHub />}
        {adminTab === 'general' && <AdminGeneralHub />}
        {adminTab === 'owner_tenants' && user?.es_owner && <AdminOwner />}
        {adminTab === 'analytics' && <AdminAnalytics />}
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
function AdminAnalytics() {
  const { config, setConfig, toast } = useContext(Ctx);
  const [gaId, setGaId] = useState(config.ga_id || '');
  const [pixelId, setPixelId] = useState(config.fb_pixel_id || '');
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    setSaving(true);
    try {
      await api.updateConfig({ ga_id: gaId.trim(), fb_pixel_id: pixelId.trim() });
      setConfig({ ...config, ga_id: gaId.trim(), fb_pixel_id: pixelId.trim() });
      toast('Guardado. Recargá la página para que empiece a medir.');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Marketing y estadísticas</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Conectá tu tienda con Google Analytics y Facebook (Meta) para medir visitas, ventas y hacer publicidad. Pegá los IDs y guardá.</p>

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
                ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Todavía no registraste pagos. Entrá a una tienda y tocá "💰 Pagos" para registrar el primero.</div>
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
                    <button onClick={() => borrar(p.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>🗑</button>
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
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
          <button className="btn btn-outline" onClick={() => setShowCobros(true)}>💰 Cobros</button>
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
                      {t.id === 1 && <span style={{ fontSize: 11, background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>Vos</span>}
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
                    {t.id !== 1 && <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setPagoTenant(t)}>💰 Pagos</button>}
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
        <strong style={{ fontSize: 16 }}>📸 Venta con escáner{cliente ? ` · ${cliente.nombre}` : ''}</strong>
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
            <div><strong>Cliente:</strong> ${creds.nombre}</div>
            <div style="background:#f0f0f0;padding:8px;border-radius:6px;margin-top:8px">
              <div><strong>Usuario:</strong> ${creds.usuario}</div>
              <div><strong>Contraseña:</strong> ${creds.password}</div>
            </div>
          </div>
          <p style="color:#777;font-size:12px;margin-top:16px">Podés cambiar tu contraseña desde tu perfil cuando ingreses.</p>
          <p style="color:#999;font-size:11px;margin-top:8px">${window.location.origin}</p>
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
      </body></html>`);
    w.document.close();
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
            <span style={{ fontSize: 14 }}>👤 Cliente: <strong>{cliente.nombre}</strong></span>
            <button className="btn btn-outline btn-sm" onClick={() => setCliente(null)}>Quitar</button>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="👤 Asignar a un cliente (opcional): buscá por nombre..." value={busqCliente} onChange={e => buscarCliente(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
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
            <button className="btn btn-primary btn-sm" onClick={() => imprimirCredenciales(credsNuevoCliente)}>🖨️ Imprimir ficha</button>
            <button className="btn btn-outline btn-sm" onClick={() => setCredsNuevoCliente(null)}>Cerrar</button>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input placeholder="🔍 Buscar producto por nombre o SKU..." value={busq} onChange={e => buscar(e.target.value)} style={{ width: '100%' }} />
        {resultados.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, maxHeight: 260, overflowY: 'auto', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            {resultados.map(p => (
              <div key={p.id} onClick={() => agregar(p)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
                {p.imagen ? <img src={p.imagen} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} /> : <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--border-light)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>}
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
          placeholder="📷 Escaneá con pistola acá (o escribí el código y Enter)"
          value={scanBuffer}
          onChange={e => setScanBuffer(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarPorCodigo(scanBuffer); setScanBuffer(''); } }}
          style={{ flex: 1, minWidth: 220, borderColor: 'var(--accent)' }}
        />
        <button className="btn btn-primary btn-sm" onClick={() => setScanCam(true)}>📸 Escanear con cámara (modo venta rápida)</button>
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
                <td>{i.nombre || i.modelo}</td>
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
                  <span>{it.nombre_producto} <span style={{ color: 'var(--text-muted)' }}>x{it.cantidad}</span></span>
                  <span style={{ fontWeight: 700 }}>{fmtARS(it.costo_unitario * it.cantidad)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontWeight: 900, fontSize: 18 }}><span>Total</span><span>{fmtARS(ver.total)}</span></div>
              {ver.notas && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>📝 {ver.notas}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {!ver.recibida && <button className="btn btn-success" onClick={() => recibir(ver.id)} style={{ flex: 1 }}>✓ Marcar recibida (sumar stock)</button>}
                <button className="btn btn-danger" onClick={() => borrar(ver.id)}>🗑</button>
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
            <input placeholder="🔍 Buscar producto..." value={busq} onChange={e => buscar(e.target.value)} style={{ width: '100%' }} />
            {resultados.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto', zIndex: 10 }}>
                {resultados.map(p => <div key={p.id} onClick={() => agregar(p)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 8, alignItems: 'center' }}>{p.imagen ? <img src={p.imagen} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} /> : <span style={{ fontSize: 16 }}>📦</span>}<span style={{ flex: 1 }}>{p.nombre || p.modelo}{p.seccion_nombre && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> · {p.seccion_nombre}</span>}</span></div>)}
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
  const { adminSeccion, setAdminTab } = useContext(Ctx);
  const [stats, setStats] = useState({});
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [stockBajo, setStockBajo] = useState([]);

  const loadStats = async () => {
    try { const s = await api.getStats(adminSeccion, desde, hasta); setStats(s); } catch {}
  };
  useEffect(() => { loadStats(); }, [adminSeccion, desde, hasta]);
  useEffect(() => { api.getStockBajo().then(setStockBajo).catch(() => {}); }, []);

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

      {stockBajo.length > 0 && (
        <div style={{ background: 'var(--warning-light, rgba(245,180,60,0.1))', border: '1.5px solid var(--warning, #e8a13a)', borderRadius: 16, padding: 18, marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <strong style={{ fontSize: 15 }}>⚠️ {stockBajo.length} producto{stockBajo.length !== 1 ? 's' : ''} con stock bajo</strong>
            <button className="btn btn-outline btn-sm" onClick={() => setAdminTab('productos')}>Ver en productos</button>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {stockBajo.slice(0, 15).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                <span>{p.nombre || p.modelo} {p.seccion_nombre && <span style={{ fontSize: 10, background: 'var(--border)', padding: '1px 6px', borderRadius: 4 }}>{p.seccion_nombre}</span>}</span>
                <span style={{ fontWeight: 700, color: p.stock <= 0 ? 'var(--danger)' : 'var(--accent)' }}>{p.stock} / min {p.stock_minimo}</span>
              </div>
            ))}
            {stockBajo.length > 15 && <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 6 }}>y {stockBajo.length - 15} más...</div>}
          </div>
        </div>
      )}
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
          <button onClick={() => toggleVisible(c.nombre)} title={c.visible ? 'Ocultar' : 'Mostrar'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>{c.visible ? '👁️' : '🚫'}</button>
          <button className="btn btn-outline btn-sm" onClick={() => setRenaming({ nombre: c.nombre, nuevo: c.nombre })}>Renombrar</button>
          <button className="btn btn-outline btn-sm" onClick={() => setMerging({ desde: c.nombre, hasta: '' })}>Fusionar</button>
          <button className="btn btn-danger btn-sm" onClick={() => doDelete(c.nombre)}>🗑</button>
        </div>
      ))}

      {/* Modal crear categoría */}
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
  const [catFiltro, setCatFiltro] = useState('');
  const [stockFiltro, setStockFiltro] = useState('todos'); // todos | con | sin | bajo
  const [seleccion, setSeleccion] = useState(new Set());
  const [showMasa, setShowMasa] = useState(false);
  const [masaAccion, setMasaAccion] = useState({ tipo: '', valor: '' });

  const [secFiltro, setSecFiltro] = useState(adminSeccion);

  const load = async () => {
    const secId = secFiltro !== 'all' ? secFiltro : undefined;
    const data = await api.getProductos({ seccion_id: secId, q: busq, categoria: catFiltro, page: pagina, limit: pageSize });
    setProductos(data.productos || []); setTotal(data.total || 0);
    const cats = await api.getCategorias(secId).catch(() => []);
    setCategorias(cats || []);
    setSeleccion(new Set());
  };
  useEffect(() => { setSecFiltro(adminSeccion); }, [adminSeccion]);
  useEffect(() => { load(); }, [secFiltro, busq, catFiltro, pagina]);

  const inlineUpdate = async (id, field, value) => {
    try { await api.updateProducto(id, { [field]: value }); } catch (e) { toast(e.message, 'error'); }
  };

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
        <div style="font-size:11px;font-weight:bold;margin-bottom:4px;height:28px;overflow:hidden">${nombre}</div>
        <img src="${barcodeUrl}" style="max-width:160px;display:block;margin:0 auto" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <div style="display:none;font-family:monospace;font-size:16px">*${codigo}*</div>
        <div style="font-size:12px;font-family:monospace;margin-top:2px">${codigo}</div>
        ${conPrecio ? `<div style="font-size:11px;color:#333;margin-top:2px">${fmtARS(prod.precio_base)}</div>` : ''}
      </div>`;
    }).join('');
    const w = window.open('', '', 'width=800,height=600');
    if (!w) { toast('El navegador bloqueó la ventana. Permití los pop-ups para este sitio.', 'error'); return; }
    w.document.write(`<html><head><title>Etiquetas (${prods.length})</title></head>
      <body style="font-family:sans-serif;margin:0;padding:10px">${etiquetas}
        <script>window.onload=function(){var imgs=Array.prototype.slice.call(document.images);var pend=imgs.filter(function(i){return !i.complete});if(pend.length===0){setTimeout(function(){window.print()},400);return}var d=0;function fin(){d++;if(d>=pend.length)setTimeout(function(){window.print()},300)}pend.forEach(function(i){i.addEventListener('load',fin);i.addEventListener('error',fin)});setTimeout(function(){window.print()},4000)}<\/script>
      </body></html>`);
    w.document.close();
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3>Productos ({total})</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Nuevo</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowImport(true)}>📥 Importar</button>
          <button className="btn btn-outline btn-sm" onClick={async () => {
            if (!confirm('Generar código de barras a todos los productos de esta sección que no tengan uno. ¿Continuar?')) return;
            try { const r = await api.generarCodigos(adminSeccion); toast(`${r.generados} códigos generados`); load(); } catch (e) { toast(e.message, 'error'); }
          }}>🏷️ Generar códigos</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowPriceAdj(true)}>💲 Ajustar precios</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowHistory(true)}>📜 Historial</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={secFiltro} onChange={e => { setSecFiltro(e.target.value); setPagina(1); }} style={{ width: 200 }}>
          <option value="all">📦 Todas las secciones</option>
          {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <input placeholder="Buscar por nombre o SKU..." value={busq} onChange={e => { setBusq(e.target.value); setPagina(1); }} style={{ flex: 1, minWidth: 160 }} />
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
          <button className="btn btn-outline btn-sm" onClick={() => printEtiquetasMasa([...seleccion])}>🏷️ Imprimir etiquetas</button>
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

      {/* Product table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th style={{width:34}}><input type="checkbox" checked={productosVista.length > 0 && seleccion.size === productosVista.length} onChange={toggleAll} /></th><th style={{width:50}}>Img</th><th>Producto</th><th>Categoría</th>{secFiltro === 'all' && <th>Sección</th>}<th style={{width:90}}>Precio</th><th style={{width:90}}>Oferta</th><th style={{width:70}}>Stock</th><th style={{width:50}}>👁</th><th style={{width:110}}>Acc.</th></tr></thead>
          <tbody>
            {productosVista.map(p => {
              const secNombre = secciones.find(s => s.id === p.seccion_id)?.nombre || '';
              const colCount = secFiltro === 'all' ? 10 : 9;
              return (
              <Fragment key={p.id}>
              <tr style={{ opacity: p.visible === false ? 0.5 : 1, background: seleccion.has(p.id) ? 'var(--primary-light)' : undefined }}>
                <td><input type="checkbox" checked={seleccion.has(p.id)} onChange={() => toggleSel(p.id)} /></td>
                <td>{p.imagen ? <img src={p.imagen} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : '—'}</td>
                <td><strong style={{ cursor: 'pointer' }} onClick={() => setEditProd(p)}>{p.nombre || p.modelo}</strong>{p.es_preventa && <span style={{ fontSize: 9, background: 'var(--accent)', color: '#fff', padding: '1px 5px', borderRadius: 3, fontWeight: 800, marginLeft: 6, verticalAlign: 'middle' }}>PREVENTA</span>}<br/><small style={{ color: 'var(--text-muted)' }}>{p.sku || ''}</small></td>
                <td>{p.categoria}</td>
                {secFiltro === 'all' && <td><span style={{ fontSize: 11, background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{secNombre}</span></td>}
                <td><input type="number" defaultValue={p.precio_base} onBlur={e => inlineUpdate(p.id, 'precio_base', Number(e.target.value))} style={{ width: 80 }} /></td>
                <td><input type="number" defaultValue={p.precio_oferta || ''} onBlur={e => inlineUpdate(p.id, 'precio_oferta', Number(e.target.value))} style={{ width: 80 }} /></td>
                <td><input type="number" defaultValue={p.stock} onBlur={e => inlineUpdate(p.id, 'stock', Number(e.target.value))} style={{ width: 60, ...(p.stock_minimo > 0 && p.stock <= p.stock_minimo ? { borderColor: 'var(--danger)', color: 'var(--danger)', fontWeight: 700 } : {}) }} title={p.stock_minimo > 0 && p.stock <= p.stock_minimo ? `Stock bajo (mínimo: ${p.stock_minimo})` : ''} /></td>
                <td><input type="checkbox" defaultChecked={p.visible !== false} onChange={e => inlineUpdate(p.id, 'visible', e.target.checked)} /></td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => setExpandVars(expandVars === p.id ? null : p.id)} style={{ padding: '2px 6px' }} title="Variantes"><Ico n="shuffle" s={15} /></button>
                  <button className="btn btn-outline btn-sm" onClick={async () => { try { await api.duplicarProducto(p.id); toast('Producto duplicado'); load(); } catch (e) { toast(e.message, 'error'); } }} style={{ padding: '2px 6px', marginLeft: 4 }} title="Duplicar"><Ico n="copy" s={15} /></button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditProd(p)} style={{ padding: '2px 6px', marginLeft: 4 }}><Ico n="edit" s={15} /></button>
                  <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm('¿Eliminar?')) return; try { await api.deleteProducto(p.id); toast('Producto eliminado'); load(); } catch (e) { toast(e.message, 'error'); } }} style={{ padding: '2px 6px', marginLeft: 4 }}><Ico n="trash" s={15} /></button>
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
              {masaAccion.tipo === 'borrar' && <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}>⚠️ Se eliminarán {seleccion.size} productos. No se puede deshacer.</p>}
              <button className="btn btn-primary" onClick={aplicarMasa} style={{ width: '100%' }}>Aplicar a {seleccion.size} productos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MULTI IMAGE UPLOAD ───
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
  // Sube varios archivos EN SERIE (uno tras otro) para que no se pisen y queden en orden.
  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(f => f && f.type && f.type.startsWith('image/'));
    if (!files.length) return;
    setUploading(true);
    let orden = imgs.length;
    for (const file of files) {
      try {
        const r = await api.uploadImagen(file);
        await api.addProductoImagen(productoId, r.url, orden);
        orden++;
      } catch { toast(`Error al subir ${file.name || 'una imagen'}`, 'error'); }
    }
    try { const updated = await api.getProductoImagenes(productoId); setImgs(updated); } catch {}
    setUploading(false);
  };

  // Imprime una etiqueta con el código de barras del producto
  const printEtiqueta = (prod, opts = {}) => {
    const conPrecio = opts.conPrecio || false;
    const codigo = prod.codigo_barras || ('P' + String(prod.id).padStart(6, '0'));
    const nombre = prod.nombre || prod.modelo || '';
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(codigo)}&code=Code128&dpi=96&dataseparator=`;
    const html = `<div style="border:1px solid #000;padding:10px;display:inline-block;margin:6px;text-align:center;page-break-inside:avoid">
        <div style="font-size:13px;font-weight:bold;margin-bottom:6px;max-width:280px">${nombre}</div>
        <img src="${barcodeUrl}" style="max-width:280px;display:block;margin:0 auto" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <div style="display:none;font-family:monospace;font-size:20px;letter-spacing:2px">*${codigo}*</div>
        <div style="font-size:14px;font-family:monospace;margin-top:4px">${codigo}</div>
        ${conPrecio ? `<div style="font-size:12px;color:#333;margin-top:4px">${fmtARS(prod.precio_base)}</div>` : ''}
      </div>`;
    const w = window.open('', '', 'width=500,height=400');
    if (!w) { toast('El navegador bloqueó la ventana de impresión. Permití los pop-ups para este sitio.', 'error'); return; }
    w.document.write(`<html><head><title>Etiqueta ${codigo}</title></head>
      <body style="font-family:sans-serif;margin:0;padding:10px">${html}
        <script>window.onload=function(){var imgs=Array.prototype.slice.call(document.images);var pend=imgs.filter(function(i){return !i.complete});if(pend.length===0){setTimeout(function(){window.print()},300);return}var d=0;function fin(){d++;if(d>=pend.length)setTimeout(function(){window.print()},200)}pend.forEach(function(i){i.addEventListener('load',fin);i.addEventListener('error',fin)});setTimeout(function(){window.print()},2500)}<\/script>
      </body></html>`);
    w.document.close();
  };
  const remove = async (id) => { try { await api.deleteProductoImagen(id); setImgs(imgs.filter(i => i.id !== id)); } catch (e) { toast(e.message, 'error'); } };
  // Reordenar: mover una imagen a la izquierda o derecha y persistir el nuevo orden
  const mover = async (idx, dir) => {
    const nuevo = idx + dir;
    if (nuevo < 0 || nuevo >= imgs.length) return;
    const arr = [...imgs];
    [arr[idx], arr[nuevo]] = [arr[nuevo], arr[idx]];
    setImgs(arr);
    try { await api.ordenarProductoImagenes(productoId, arr.map(i => i.id)); } catch (e) { toast('No se pudo guardar el orden', 'error'); }
  };
  const [dragOver, setDragOver] = useState(false);
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <h4 style={{ marginBottom: 8, fontSize: 14 }}>📸 Galería de imágenes ({imgs.length})</h4>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Arrastrá varias imágenes a la zona de abajo. Podés reordenarlas con ← → y eliminar con ✕. La primera es la principal.</p>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, padding: 8, borderRadius: 10, border: dragOver ? '2px dashed var(--primary)' : '2px dashed transparent', background: dragOver ? 'var(--bg-secondary)' : 'transparent', transition: 'all .15s' }}
      >
        {imgs.map((img, idx) => (
          <div key={img.id} style={{ position: 'relative', width: 80 }}>
            <img src={img.url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: idx === 0 ? '2px solid var(--primary)' : '1px solid var(--border)' }} />
            {idx === 0 && <span style={{ position: 'absolute', top: 2, left: 2, background: 'var(--primary)', color: '#fff', fontSize: 9, padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>Principal</span>}
            <button onClick={() => remove(img.id)} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer' }}>✕</button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 2 }}>
              <button onClick={() => mover(idx, -1)} disabled={idx === 0} style={{ border: 'none', background: 'var(--bg-secondary)', borderRadius: 4, cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 12, padding: '0 6px' }}>←</button>
              <button onClick={() => mover(idx, 1)} disabled={idx === imgs.length - 1} style={{ border: 'none', background: 'var(--bg-secondary)', borderRadius: 4, cursor: idx === imgs.length - 1 ? 'default' : 'pointer', opacity: idx === imgs.length - 1 ? 0.3 : 1, fontSize: 12, padding: '0 6px' }}>→</button>
            </div>
          </div>
        ))}
        <label style={{ width: 80, height: 80, border: '2px dashed var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 24, color: 'var(--text-muted)' }}>
          {uploading ? '...' : '+'}
          <input type="file" accept="image/*" multiple onChange={e => { uploadFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
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
  const remove = async (id) => { try { await api.deleteVariante(id); setVars(vars.filter(v => v.id !== id)); } catch (e) { toast(e.message, 'error'); } };
  const nombresUsados = [...new Set(vars.map(v => v.nombre).filter(Boolean))];
  const dlId = `varnames-${productoId}`;
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <h4 style={{ marginBottom: 8, fontSize: 14 }}>🔀 Variantes (opcional)</h4>
      <datalist id={dlId}>{nombresUsados.map(n => <option key={n} value={n} />)}</datalist>
      {vars.map(v => (
        <div key={v.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
          <input value={v.nombre} list={dlId} onChange={e => setLocal(v.id, 'nombre', e.target.value)} onBlur={() => saveVar(v)} placeholder="Nombre" style={{ flex: '1 1 100px', minWidth: 90, fontSize: 13 }} />
          <input value={v.valor} onChange={e => setLocal(v.id, 'valor', e.target.value)} onBlur={() => saveVar(v)} placeholder="Valor" style={{ flex: '1 1 100px', minWidth: 90, fontSize: 13 }} />
          <input type="number" value={v.stock} onChange={e => setLocal(v.id, 'stock', e.target.value)} onBlur={() => saveVar(v)} placeholder="Stock" style={{ flex: '0 1 80px', minWidth: 70, fontSize: 13 }} />
          <input type="number" value={v.precio_extra} onChange={e => setLocal(v.id, 'precio_extra', e.target.value)} onBlur={() => saveVar(v)} placeholder="+$" style={{ flex: '0 1 80px', minWidth: 70, fontSize: 13 }} />
          <button onClick={() => remove(v.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        <input placeholder="Nombre (ej: Color)" list={dlId} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={{ flex: '1 1 110px', minWidth: 90 }} />
        <input placeholder="Valor (ej: Rojo)" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} style={{ flex: '1 1 110px', minWidth: 90 }} />
        <input type="number" placeholder="Stock" value={form.stock || ''} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} style={{ flex: '0 1 80px', minWidth: 70 }} />
        <input type="number" placeholder="+$" value={form.precio_extra || ''} onChange={e => setForm({ ...form, precio_extra: Number(e.target.value) })} style={{ flex: '0 1 80px', minWidth: 70 }} />
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
  const [reservadoReal, setReservadoReal] = useState(null);
  useEffect(() => { if (isEdit && product?.es_preventa && product?.id) api.getReservadoReal(product.id).then(r => setReservadoReal(r.reservado)).catch(() => {}); }, [product?.id]);
  const [f, setF] = useState(product || {
    seccion_id: adminSeccion !== 'all' ? Number(adminSeccion) : secciones[0]?.id,
    categoria: '', modelo: '', nombre: '', precio_base: 0, precio_original: 0, stock: 0, stock_minimo: 0,
    imagen: '', descripcion: '', sku: '', codigo_barras: '', tipo: 'fisico', moneda: 'ARS', precio_oferta: 0,
    envio_gratis: false, visible: true, notas: '', compatibilidad: '', marca: '',
    es_preventa: false, preventa_precio: 0, preventa_fecha: '', preventa_mostrar_fecha: false, preventa_descuento_pct: 0, preventa_cupo: 0,
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
            <div className="form-group"><label className="form-label">Código de barras (para escanear en ventas)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={f.codigo_barras || ''} onChange={e => setF({ ...f, codigo_barras: e.target.value })} placeholder="Se genera solo al guardar" style={{ flex: 1 }} />
                {isEdit && f.id && <button type="button" className="btn btn-outline btn-sm" onClick={() => printEtiqueta(f, { conPrecio: window.confirm('¿Incluir el precio en la etiqueta?\n\n(Aceptar = con precio, Cancelar = sin precio)') })}>🏷️ Imprimir etiqueta</button>}
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
            <div className="form-group"><label className="form-label">Precio base *</label><input type="number" value={f.precio_base === 0 && f._priceCleared ? '' : f.precio_base} onFocus={e => { if (Number(e.target.value) === 0) { setF({ ...f, precio_base: '', _priceCleared: true }); } }} onChange={e => setF({ ...f, precio_base: e.target.value === '' ? '' : Number(e.target.value), _priceCleared: e.target.value === '' })} onBlur={e => setF({ ...f, precio_base: Number(e.target.value) || 0, _priceCleared: false })} /></div>
            <div className="form-group"><label className="form-label">Precio oferta</label><input type="number" value={f.precio_oferta || ''} onChange={e => setF({ ...f, precio_oferta: e.target.value === '' ? '' : Number(e.target.value) })} onBlur={e => setF({ ...f, precio_oferta: Number(e.target.value) || 0 })} placeholder="0 = sin oferta" /></div>
            <div className="form-group"><label className="form-label">Precio de costo (lo que te sale)</label><input type="number" value={f.precio_original || ''} onChange={e => setF({ ...f, precio_original: e.target.value === '' ? '' : Number(e.target.value) })} onBlur={e => setF({ ...f, precio_original: Number(e.target.value) || 0 })} placeholder="Para calcular ganancia" /></div>
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
          {/* Imagen principal: SOLO al crear un producto nuevo. En edición manda la galería de abajo. */}
          {!isEdit && (
          <div className="form-group">
            <label className="form-label">Imagen principal</label>
            <div className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleImageUpload(file); }}>
              {uploading ? <span>Subiendo...</span> : f.imagen ? <img src={f.imagen} alt="" style={{ maxHeight: 100 }} /> : <span>Arrastrá una imagen o hacé clic</span>}
              <input type="file" accept="image/*" onChange={e => { const file = e.target.files[0]; if (file) handleImageUpload(file); }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </div>
            {f.imagen && <input value={f.imagen} onChange={e => setF({ ...f, imagen: e.target.value })} placeholder="O pegá URL de imagen" style={{ marginTop: 8 }} />}
          </div>
          )}
          {/* Multi-image gallery (only on edit) */}
          {isEdit && <MultiImageUpload productoId={product.id} imagenInicial={product.imagen} />}
          {/* Variantes (only on edit) */}
          {isEdit && <VariantesEditor productoId={product.id} />}
          <div className="form-group"><label className="form-label">Descripción</label><textarea value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} rows={3} /></div>
          <div className="form-group"><label className="form-label">Notas internas</label><textarea value={f.notas} onChange={e => setF({ ...f, notas: e.target.value })} rows={2} /></div>
          <div className="form-group"><label className="form-label">Compatibilidad</label><input value={f.compatibilidad} onChange={e => setF({ ...f, compatibilidad: e.target.value })} /></div>
          <div className="form-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={f.envio_gratis} onChange={e => setF({ ...f, envio_gratis: e.target.checked })} /> Envío gratis</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={f.visible !== false} onChange={e => setF({ ...f, visible: e.target.checked })} /> Visible</label>
          </div>

          {/* ── PREVENTA / próximo ingreso ── */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, margin: '12px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={f.es_preventa || false} onChange={e => setF({ ...f, es_preventa: e.target.checked })} /> 🔜 Producto en preventa / próximo a ingresar
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
                    }}>📦 Recibí la preventa</button>
                  </div>
                )}
              </div>
            )}
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
      // Categoría: toma la SUBCATEGORÍA (última parte después de > o /), Opción B
      const parseCat = (raw) => {
        const s = (raw ?? '').toString().trim();
        if (!s || s.toLowerCase() === 'none' || s === '-') return 'Sin categoría';
        // Separa por > (jerarquía Empretienda/Tienda Negocio). Usa la última parte no vacía.
        const partes = s.split('>').map(x => x.trim()).filter(Boolean);
        return partes.length ? partes[partes.length - 1] : 'Sin categoría';
      };
      const prods = json.map(r => {
        const nombre = pick(r, /^nombre del producto$|^nombre$|modelo|model/i) || '';
        const precio = Number(String(pick(r, /^precio$|price/i) ?? '').toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const oferta = Number(String(pick(r, /oferta|precio oferta/i) ?? '').toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const stock = Number(pick(r, /^stock$/i)) || 0;
        return {
          seccion_id: importSecId,
          categoria: parseCat(pick(r, /categor|subcategor/i)),
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
              <option value="crear_actualizar">Crear nuevos y actualizar existentes (por SKU o nombre)</option>
              <option value="solo_nuevos">Solo agregar los que faltan (no toca existentes)</option>
              <option value="solo_categorias">Solo corregir categorías (por nombre, no toca nada más)</option>
              <option value="reemplazar">Borrar todo de la sección y cargar de cero</option>
            </select>
            {modo === 'solo_categorias' && <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Busca cada producto por SKU o nombre y le corrige solo la categoría. Ideal para arreglar categorías mal importadas sin duplicar nada.</small>}
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
  const [busqPed, setBusqPed] = useState('');
  const [pagoFiltro, setPagoFiltro] = useState('todos');
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
    return lista;
  })();

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
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input placeholder="Buscar por nº, cliente o teléfono..." value={busqPed} onChange={e => setBusqPed(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        {ordTab !== 'presupuestos' && (
          <select value={pagoFiltro} onChange={e => setPagoFiltro(e.target.value)} style={{ width: 150 }}>
            <option value="todos">Todos los pagos</option>
            <option value="pagado">Pagados</option>
            <option value="impago">Impagos</option>
            <option value="senado">Señados</option>
            <option value="debe">Deben</option>
          </select>
        )}
      </div>
      {pedidosFiltrados.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No hay resultados</p>}
      {pedidosFiltrados.map(p => (
        <div key={p.id} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'pointer' }} onClick={() => setViewOrder(p)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong>{numOrden(p)}</strong> {p.is_test && <span style={{ background: 'var(--warning)', color: '#000', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>🧪 TEST</span>}
              {p.es_reserva && <span style={{ background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800, marginLeft: 6 }}>🔖 RESERVA</span>}
              {p.seccion_nombre && <span style={{ background: p.seccion_color || 'var(--primary)', color: '#fff', padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{p.seccion_nombre}</span>}
              {' — '}{p.usuario_nombre || '(sin nombre)'} {p.nombre_fantasia && `(${p.nombre_fantasia})`}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {p.tipo !== 'presupuesto' && (() => { let ep = (p.estado_pago && String(p.estado_pago).trim() && p.estado_pago !== 'pendiente') ? p.estado_pago : 'impago'; return <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: ep === 'pagado' ? 'var(--success)' : ep === 'senado' ? 'var(--accent)' : ep === 'debe' ? 'var(--danger)' : '#999', color: '#fff' }}>{ep}</span>; })()}
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
  const [nuevoPago, setNuevoPago] = useState({ metodo: 'efectivo', cuenta_como: '', ajuste_pct: 0, nota: '' });
  const searchTimer = useRef(null);

  // Parsear datos de envío/facturación (guardados como JSON en el checkout)
  const parseJSON = (str) => { try { return str ? JSON.parse(str) : null; } catch { return null; } };
  const datosEnvio = parseJSON(o.datos_envio);
  const datosFact = parseJSON(o.datos_facturacion);

  // Pagos mixtos: cuenta_como = lo que tacha de la deuda, recibido = plata real
  const totalSaldado = pagos.reduce((s, p) => s + Number(p.cuenta_como || 0), 0);
  const totalRecibido = pagos.reduce((s, p) => s + Number(p.recibido || 0), 0);
  const saldoPedido = Number(o.total || 0) - totalSaldado;
  const ajustesMetodo = parseJSON(config.ajustes_metodo) || {};
  const previewRecibido = (() => { const cta = Number(nuevoPago.cuenta_como) || 0; const pct = Number(nuevoPago.ajuste_pct) || 0; return Math.round(cta * (1 + pct / 100)); })();
  const cargarPagos = async () => { try { const p = await api.getPagos(o.id); setPagos(p || []); } catch {} };
  const agregarPago = async () => {
    const cuentaComo = Number(nuevoPago.cuenta_como);
    if (!(cuentaComo > 0)) { toast('Poné cuánto salda este pago', 'error'); return; }
    const ajustePct = Number(nuevoPago.ajuste_pct) || 0;
    const recibido = Math.round(cuentaComo * (1 + ajustePct / 100));
    try {
      const r = await api.addPago(o.id, { metodo: nuevoPago.metodo, recibido, cuenta_como: cuentaComo, ajuste_pct: ajustePct, nota: nuevoPago.nota });
      await cargarPagos();
      setO({ ...o, estado_pago: r.estado });
      setNuevoPago({ metodo: 'efectivo', cuenta_como: '', ajuste_pct: 0, nota: '' });
      toast('Pago registrado');
    } catch (e) { toast(e.message, 'error'); }
  };
  const quitarPago = async (pagoId) => {
    try { const r = await api.deletePago(o.id, pagoId); await cargarPagos(); setO({ ...o, estado_pago: r.estado }); } catch (e) { toast(e.message, 'error'); }
  };
  const onMetodoPago = (metodo) => {
    const def = ajustesMetodo[metodo];
    setNuevoPago({ ...nuevoPago, metodo, ajuste_pct: def !== undefined ? def : 0 });
  };

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
    const logo = design.logo_url || config.logo_url || '';
    const biz = config.nombre_tienda || design.nombre_tienda || 'Tienda';
    const isSmall = format !== 'A4';
    // Datos de entrega/facturación del checkout (JSON)
    const _dEnvio = datosEnvio; const _dFact = datosFact;
    let entregaLinea = `${o.tipo_entrega === 'retiro' ? 'Retiro en local' : 'Envío'}${o.direccion ? ` — ${o.direccion}` : ''}`;
    if (_dEnvio?.entrega) {
      if (_dEnvio.entrega.tipo === 'envio') entregaLinea = `Envío a: ${_dEnvio.entrega.calle} ${_dEnvio.entrega.numero}${_dEnvio.entrega.piso ? `, ${_dEnvio.entrega.piso}` : ''}, ${_dEnvio.entrega.localidad} (CP ${_dEnvio.entrega.cp})`;
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
      ${listaPagos.map(p => { const dif = Number(p.cuenta_como || 0) - Number(p.recibido || 0); return `<p style="margin:2px 0;font-size:${isSmall ? '10px' : '13px'}">${p.metodo}${Number(p.ajuste_pct) !== 0 ? ` (${Number(p.ajuste_pct) > 0 ? '+' : ''}${p.ajuste_pct}%)` : ''}: $${fmt(p.recibido)}${Math.abs(dif) > 0.01 ? ` <span style="color:#888">(${dif > 0 ? 'desc. $' + fmt(dif) : 'rec. $' + fmt(-dif)})</span>` : ''}</p>`; }).join('')}
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
          <p style="margin:2px 0;color:#555">${o.tipo==='presupuesto'?'Presupuesto P-':'Remito / Pedido #'}${String(o.id).padStart(4,'0')}</p>
        </div>
        <div style="text-align:center">
          <img src="${qrUrl}" width="${qrSize}" height="${qrSize}" style="display:block" onerror="this.style.display='none';this.nextElementSibling.textContent='';">
          <span style="font-size:9px;color:#888">Escaneá para abrir</span>
        </div>
      </div>
      <p style="margin:6px 0 2px">${new Date(o.created_at).toLocaleString('es-AR')}</p>
      <p style="margin:2px 0"><strong>${o.usuario_nombre || (_dEnvio?.contacto?.nombre) || 'Cliente'}</strong> ${o.nombre_fantasia ? `(${o.nombre_fantasia})` : ''}${o.usuario_telefono ? ` · ${o.usuario_telefono}` : (_dEnvio?.contacto?.telefono ? ` · ${_dEnvio.contacto.telefono}` : '')}</p>
      <p style="margin:2px 0">${entregaLinea}</p>
      ${factLinea ? `<p style="margin:2px 0;font-size:${isSmall ? '10px' : '12px'};color:#333">${factLinea}</p>` : ''}
      <p style="margin:6px 0">
        <span class="badge" style="background:${estadoPagoColor}">${estadoPagoLabel}</span>
        <span style="margin-left:8px">Método: ${o.metodo_pago || '-'}</span>
      </p>
      <table><thead><tr><th>Producto</th><th style="text-align:center">Cant</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="text-align:right;font-weight:800;font-size:${isSmall ? '14px' : '19px'};margin-top:10px">TOTAL: $${fmt(editTotal)}</p>
      ${listaPagos.length ? pagosHTML : (tieneSena ? `<div style="text-align:right;margin-top:4px;border-top:2px solid #333;padding-top:6px">
        <p style="margin:2px 0;color:#16a34a;font-size:${isSmall ? '11px' : '14px'}">Pagó (seña): $${fmt(senaMonto)}</p>
        <p style="margin:2px 0;font-weight:800;color:#dc2626;font-size:${isSmall ? '13px' : '17px'}">RESTA ABONAR: $${fmt(restaAbonar)}</p>
      </div>` : '')}
      ${o.notas ? `<p style="color:#666;font-size:${isSmall ? '9px' : '11px'};border-top:1px dashed #ccc;padding-top:6px">Notas: ${o.notas}</p>` : ''}
    </body></html>`);
    w.document.close();
    // Esperar a que carguen las imágenes (logo + QR externo) antes de imprimir
    w.onload = () => {
      const imgs = Array.from(w.document.images || []);
      const pending = imgs.filter(img => !img.complete);
      if (pending.length === 0) { setTimeout(() => w.print(), 250); return; }
      let done = 0;
      const finish = () => { done++; if (done >= pending.length) setTimeout(() => w.print(), 200); };
      pending.forEach(img => { img.addEventListener('load', finish); img.addEventListener('error', finish); });
      // Fallback: imprimir igual tras 2.5s aunque alguna imagen no cargue
      setTimeout(() => w.print(), 2500);
    };
  };

  const estados = ['pendiente', 'preparando', 'listo', 'entregado', 'cancelado'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">{numOrden(o)}{o.es_reserva && <span style={{ background: 'var(--accent)', color: '#fff', padding: '2px 10px', borderRadius: 5, fontSize: 11, fontWeight: 800, marginLeft: 10 }}>🔖 RESERVA / PREVENTA</span>}{o.seccion_nombre && <span style={{ background: o.seccion_color || 'var(--primary)', color: '#fff', padding: '2px 10px', borderRadius: 5, fontSize: 11, fontWeight: 800, marginLeft: 10, textTransform: 'uppercase', letterSpacing: '0.03em', verticalAlign: 'middle' }}>{o.seccion_nombre}</span>}</span><button className="modal-close" onClick={onClose}>✕</button></div>
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

          {/* Estado de ENTREGA */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Entrega:</label>
            <select value={o.estado} onChange={e => changeEstado(e.target.value)} style={{ width: 140 }}>
              {estados.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            {/* Assign client */}
            <select value={o.usuario_id || ''} onChange={async e => { try { await api.updatePedido(o.id, { usuario_id: Number(e.target.value) }); toast('Cliente asignado'); const full = await api.getPedido(o.id); setO(full); } catch (err) { toast(err.message, 'error'); } }} style={{ width: 180 }}>
              <option value="">Asignar cliente...</option>
              {allUsers.filter(u => u.rol !== 'admin').map(u => <option key={u.id} value={u.id}>{u.nombre} {u.nombre_fantasia ? `(${u.nombre_fantasia})` : ''}</option>)}
            </select>
          </div>
          {/* Estado de PAGO (se calcula solo de los pagos cargados abajo) */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Pago:</label>
            {pagos.length > 0 ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {saldoPedido > 0.01 ? `saldado ${fmtARS(totalSaldado)} · falta ${fmtARS(saldoPedido)}` : `pagado completo`}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 6, background: o.estado_pago === 'pagado' ? 'var(--success)' : o.estado_pago === 'senado' ? 'var(--accent)' : o.estado_pago === 'debe' ? 'var(--danger)' : '#999', color: '#fff' }}>{o.estado_pago || 'impago'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(se calcula de los pagos ↓)</span>
              </>
            ) : (
              <>
                <select value={(o.estado_pago && o.estado_pago !== 'pendiente') ? o.estado_pago : 'impago'} onChange={async e => { try { await api.updatePedido(o.id, { estado_pago: e.target.value }); const full = await api.getPedido(o.id); setO(full); toast('Estado de pago actualizado'); } catch (err) { toast(err.message, 'error'); } }} style={{ width: 130 }}>
                  <option value="impago">Impago</option>
                  <option value="senado">Señado</option>
                  <option value="pagado">Pagado</option>
                  <option value="debe">Debe</option>
                </select>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 6, background: o.estado_pago === 'pagado' ? 'var(--success)' : o.estado_pago === 'senado' ? 'var(--accent)' : o.estado_pago === 'debe' ? 'var(--danger)' : '#999', color: '#fff' }}>{o.estado_pago || 'impago'}</span>
              </>
            )}
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
                  {searchResults.map(p => <div key={p.id} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 8, alignItems: 'center' }} onClick={() => addItem(p)}>{p.imagen ? <img src={p.imagen} alt="" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} /> : <span>📦</span>}<span style={{ flex: 1 }}>{p.nombre || p.modelo} — {p.categoria}{p.seccion_nombre ? ` · ${p.seccion_nombre}` : ''} — ${fmt(p.precio_base)}</span></div>)}
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

          {/* PAGOS MIXTOS */}
          <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>💰 Pagos</div>
            {pagos.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Sin pagos registrados todavía.</p>
            ) : (
              <div style={{ marginBottom: 8 }}>
                {pagos.map(p => { const dif = Number(p.cuenta_como || 0) - Number(p.recibido || 0); return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ textTransform: 'capitalize' }}>{p.metodo}{Number(p.ajuste_pct) !== 0 ? <span style={{ color: Number(p.ajuste_pct) < 0 ? 'var(--success)' : 'var(--accent)' }}> ({Number(p.ajuste_pct) > 0 ? '+' : ''}{p.ajuste_pct}%)</span> : ''}{p.nota ? <span style={{ color: 'var(--text-muted)' }}> · {p.nota}</span> : ''}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right' }}>
                      <span><strong>{fmtARS(p.recibido)}</strong>{Math.abs(dif) > 0.01 && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>salda {fmtARS(p.cuenta_como)}{dif > 0 ? ` (desc. ${fmtARS(dif)})` : ` (rec. ${fmtARS(-dif)})`}</span>}</span>
                      <button onClick={() => quitarPago(p.id)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </span>
                  </div>); })}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
              <span>Recibido (plata real)</span><strong style={{ color: 'var(--success)' }}>{fmtARS(totalRecibido)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 2 }}>
              <span>Saldado de la deuda</span><span>{fmtARS(totalSaldado)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 900, marginTop: 2 }}>
              <span>{saldoPedido > 0.01 ? 'Falta saldar' : '✓ Pagado completo'}</span>
              {saldoPedido > 0.01 && <span style={{ color: 'var(--danger)' }}>{fmtARS(saldoPedido)}</span>}
            </div>
            {/* Agregar pago */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 110 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Método</label>
                <select value={nuevoPago.metodo} onChange={e => onMetodoPago(e.target.value)} style={{ width: '100%' }}>
                  <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="débito">Débito</option><option value="crédito">Crédito</option><option value="mercadopago">MercadoPago</option><option value="otro">Otro</option>
                </select>
              </div>
              <div style={{ width: 110 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Salda de la deuda</label>
                <input type="number" value={nuevoPago.cuenta_como} onChange={e => setNuevoPago({ ...nuevoPago, cuenta_como: e.target.value })} placeholder="0" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 72 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ajuste %</label>
                <input type="number" value={nuevoPago.ajuste_pct} onChange={e => setNuevoPago({ ...nuevoPago, ajuste_pct: e.target.value })} placeholder="0" style={{ width: '100%' }} title="+ recargo, - descuento" />
              </div>
              <button className="btn btn-primary btn-sm" onClick={agregarPago}>+ Agregar</button>
            </div>
            {Number(nuevoPago.cuenta_como) > 0 && (
              <div style={{ marginTop: 6, fontSize: 13, background: 'var(--border-light)', padding: '6px 10px', borderRadius: 6 }}>
                Cobrale <strong>{fmtARS(previewRecibido)}</strong> en {nuevoPago.metodo} → salda {fmtARS(Number(nuevoPago.cuenta_como))} de la deuda
                {previewRecibido !== Number(nuevoPago.cuenta_como) && <span style={{ color: 'var(--text-muted)' }}> ({previewRecibido < Number(nuevoPago.cuenta_como) ? `descuento ${fmtARS(Number(nuevoPago.cuenta_como) - previewRecibido)}` : `recargo ${fmtARS(previewRecibido - Number(nuevoPago.cuenta_como))}`})</span>}
              </div>
            )}
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setNuevoPago({ ...nuevoPago, cuenta_como: String(Math.max(0, saldoPedido)) })}>Saldar lo que falta ({fmtARS(Math.max(0, saldoPedido))})</button>
            </div>
            <small style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginTop: 6 }}>Poné cuánto SALDA este pago de la deuda y el % (negativo = descuento, positivo = recargo). El sistema te dice cuánto cobrarle.</small>
          </div>
          {o.notas && <p style={{ fontSize: 13 }}>📝 {o.notas}</p>}
          {o.cupon_codigo && <p style={{ fontSize: 13 }}>🎟️ Cupón: {o.cupon_codigo}</p>}

          {/* Datos de entrega y facturación del checkout */}
          {(datosEnvio || datosFact) && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, lineHeight: 1.6 }}>
              {datosEnvio?.contacto && (datosEnvio.contacto.nombre || datosEnvio.contacto.telefono) && (
                <div style={{ marginBottom: datosEnvio?.entrega ? 8 : 0 }}>
                  <strong>📇 Contacto:</strong> {datosEnvio.contacto.nombre}{datosEnvio.contacto.telefono ? ` · ${datosEnvio.contacto.telefono}` : ''}{datosEnvio.contacto.email ? ` · ${datosEnvio.contacto.email}` : ''}
                </div>
              )}
              {datosEnvio?.entrega && (
                <div style={{ marginBottom: datosFact ? 8 : 0 }}>
                  <strong>{datosEnvio.entrega.tipo === 'envio' ? '📦 Envío a:' : '🏪 Retiro en el local'}</strong>
                  {datosEnvio.entrega.tipo === 'envio' && (
                    <span> {datosEnvio.entrega.calle} {datosEnvio.entrega.numero}{datosEnvio.entrega.piso ? `, ${datosEnvio.entrega.piso}` : ''}, {datosEnvio.entrega.localidad} (CP {datosEnvio.entrega.cp})</span>
                  )}
                </div>
              )}
              {datosFact && (
                <div style={{ paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                  <strong>🧾 Facturación:</strong> {datosFact.razon_social} · {datosFact.cuit_dni}
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
              <option value="">🖨️ Térmica...</option>
              <option value="50mm">Térmica 50mm</option>
              <option value="58mm">Térmica 58mm</option>
              <option value="80mm">Térmica 80mm</option>
              <option value="100mm">Térmica 100mm</option>
            </select>
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
            <button className="btn btn-outline btn-sm" onClick={() => setShowHist(!showHist)}>{showHist ? 'Ocultar historial' : '📊 Ver historial'}</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowCta(!showCta)}>{showCta ? 'Ocultar cuenta' : '💳 Cuenta corriente'}</button>
            </>
          )}
          {!isNew && (
            <button className="btn btn-outline btn-sm" onClick={async () => { const r = await api.resetPassword(u.id); toast('Contraseña reseteada a 1234'); if (r.telefono) { openWA(`54${r.telefono.replace(/\D/g, '')}`, `Hola ${r.nombre}, tu contraseña fue reseteada. Tu nueva contraseña es: 1234`); } }} style={{ marginRight: 'auto' }}>🔑 Reset pass</button>
          )}
          {!isNew && (
            <button className="btn btn-outline btn-sm" onClick={async () => {
              const desactivar = f.activo;
              if (!confirm(desactivar ? `¿Sacarle el acceso a ${u.nombre}? No va a poder entrar, pero se conserva su historial. Podés reactivarlo cuando quieras.` : `¿Reactivar el acceso de ${u.nombre}?`)) return;
              try { await api.suspenderUsuario(u.id, !desactivar); setF({ ...f, activo: !desactivar }); toast(desactivar ? 'Acceso desactivado' : 'Acceso reactivado'); } catch (e) { toast(e.message, 'error'); }
            }}>{f.activo ? '🚫 Sacar acceso' : '✅ Dar acceso'}</button>
          )}
          {!isNew && (
            <button className="btn btn-danger btn-sm" onClick={async () => {
              if (!confirm(`¿ELIMINAR a ${u.nombre} por completo?\n\n⚠️ Esto borra el usuario Y todos sus pedidos/historial. No se puede deshacer.\n\nSi solo querés sacarle el acceso, usá "Sacar acceso" en su lugar.`)) return;
              if (!confirm('Última confirmación: se borra todo de este cliente. ¿Seguro?')) return;
              try { await api.deleteUsuario(u.id); toast('Usuario eliminado'); onClose(true); } catch (e) { toast(e.message, 'error'); }
            }}>🗑️ Eliminar</button>
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
              <span>{n.canal === 'whatsapp' ? `📱 ${n.telefono}` : n.email} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleDateString('es-AR')}</span></span>
              <div style={{ display: 'flex', gap: 6 }}>
                {n.canal === 'whatsapp' && n.telefono
                  ? <button className="btn btn-success btn-sm" onClick={() => { let t = n.telefono.replace(/\D/g, ''); if (t.startsWith('0')) t = t.slice(1); if (!t.startsWith('54')) t = '549' + t; window.open(`https://wa.me/${t}?text=${encodeURIComponent(`¡Hola! El producto ${g.nombre} que esperabas ya está disponible. ¿Lo querés?`)}`, '_blank'); }}>WhatsApp</button>
                  : <a href={`mailto:${n.email}?subject=¡Volvió el stock!&body=Hola, el producto ${g.nombre} que esperabas ya está disponible.`} className="btn btn-success btn-sm" style={{ textDecoration: 'none' }}>Email</a>}
                <button className="btn btn-outline btn-sm" onClick={() => avisar(n.id)}>✓ Avisado</button>
                <button className="btn btn-danger btn-sm" onClick={() => borrar(n.id)}>🗑</button>
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
          {rep.ganancias.costo === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, marginTop: -8 }}>💡 Cargá el "precio de costo" en tus productos para ver la ganancia real.</p>}

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
        </>
      )}
    </div>
  );
}

function AdminCarritosAbandonados() {
  const { toast } = useContext(Ctx);
  const [carritos, setCarritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setCarritos(await api.getCarritosAbandonados() || []); } catch (e) { toast(e.message, 'error'); } setLoading(false); };
  useEffect(() => { load(); }, []);

  const contactar = (c) => {
    const tel = (c.telefono || '').replace(/\D/g, '');
    if (!tel) { toast('Este carrito no tiene teléfono', 'warning'); return; }
    const items = (c.items || []).map(i => `• ${i.nombre || i.modelo} x${i.qty || i.cantidad || 1}`).join('\n');
    const msg = `¡Hola${c.usuario_nombre ? ' ' + c.usuario_nombre : ''}! Vimos que dejaste productos en tu carrito:\n${items}\n\n¿Querés que te ayudemos a completar la compra?`;
    window.open(`https://wa.me/54${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  const recuperar = async (id) => { try { await api.recuperarCarrito(id); toast('Marcado como recuperado'); load(); } catch (e) { toast(e.message, 'error'); } };
  const borrar = async (id) => { if (!confirm('¿Eliminar este carrito?')) return; try { await api.deleteCarritoAbandonado(id); load(); } catch (e) { toast(e.message, 'error'); } };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <h3 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Carritos abandonados ({carritos.length})</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Clientes que agregaron productos pero no completaron la compra. Contactalos por WhatsApp para recuperar la venta.</p>

      {carritos.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No hay carritos abandonados 🎉</p> : carritos.map(c => (
        <div key={c.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong>{c.usuario_nombre || c.email || c.telefono || 'Anónimo'}</strong>
              {c.seccion_nombre && <span style={{ fontSize: 10, background: 'var(--border)', padding: '1px 8px', borderRadius: 4, marginLeft: 8 }}>{c.seccion_nombre}</span>}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(c.created_at).toLocaleString('es-AR')} · {(c.items || []).length} productos</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{(c.items || []).slice(0, 4).map(i => (i.nombre || i.modelo) + ` x${i.qty || i.cantidad || 1}`).join(', ')}{(c.items || []).length > 4 ? '...' : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>{fmtARS(c.total)}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-success btn-sm" onClick={() => contactar(c)}>WhatsApp</button>
                <button className="btn btn-outline btn-sm" onClick={() => recuperar(c.id)}>✓ Recuperado</button>
                <button className="btn btn-danger btn-sm" onClick={() => borrar(c.id)}>🗑</button>
              </div>
            </div>
          </div>
        </div>
      ))}
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
                {prodResults.length > 0 && <div style={{ border: '1px solid var(--border)', borderRadius: 4, maxHeight: 150, overflowY: 'auto', marginTop: 4 }}>{prodResults.map(p => <div key={p.id} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)' }} onClick={() => { if (!selProds.find(sp => sp.id === p.id)) setSelProds([...selProds, p]); setProdResults([]); setProdSearch(''); }}><span style={{display:'flex',gap:8,alignItems:'center'}}>{p.imagen ? <img src={p.imagen} alt="" style={{width:28,height:28,objectFit:'cover',borderRadius:4,flexShrink:0}} /> : <span>📦</span>}<span>{p.nombre || p.modelo} — {p.categoria}{p.seccion_nombre ? ` · ${p.seccion_nombre}` : ''}</span></span></div>)}</div>}
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
                {prodResults.length > 0 && <div style={{ border: '1px solid var(--border)', borderRadius: 4, maxHeight: 120, overflowY: 'auto', marginTop: 4 }}>{prodResults.map(p => <div key={p.id} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 13 }} onClick={() => { if (!selProds.find(sp => sp.id === p.id)) setSelProds([...selProds, p]); setProdResults([]); setProdSearch(''); }}><span style={{display:'flex',gap:8,alignItems:'center'}}>{p.imagen ? <img src={p.imagen} alt="" style={{width:28,height:28,objectFit:'cover',borderRadius:4,flexShrink:0}} /> : <span>📦</span>}<span>{p.nombre || p.modelo} — {p.categoria}{p.seccion_nombre ? ` · ${p.seccion_nombre}` : ''}</span></span></div>)}</div>}
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
            {s.requiere_aprobacion && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>🔒 con aprobación</span>}
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

  const guardar = async () => {
    setSaving(true);
    try {
      await api.updateDesign(des);
      setDesign(des);
      applyDesignVars(des); // aplicar a la app real
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
    });
    ensureFont(t.font);
  };

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
            {tab === 'temas' && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Elegí un tema completo para arrancar. Cambia colores, fuente y estilos de una. Después ajustás lo que quieras.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {THEME_PRESETS.map(t => (
                    <div key={t.id} onClick={() => aplicarTema(t)}
                      style={{ padding: 12, cursor: 'pointer', borderRadius: 12, border: des.plantilla === t.id ? '2px solid var(--primary)' : '1px solid var(--border)', background: 'var(--bg-card)' }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                        {swatch(t.p)}{swatch(t.s)}{swatch(t.a)}
                      </div>
                      <strong style={{ fontSize: 13, fontFamily: `'${t.font}', sans-serif` }}>{t.name}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</div>
                      {des.plantilla === t.id && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4, fontWeight: 700 }}>✓ Activo</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                <label className="form-label" style={{ marginBottom: 8 }}>Colores individuales</label>
                {[
                  ['color_primario', 'Primario (botones, links)', '#4A69E2'],
                  ['color_secundario', 'Secundario (títulos oscuros)', '#232321'],
                  ['color_acento', 'Acento (badges, ofertas)', '#FFA52F'],
                  ['color_fondo', 'Fondo de la página', '#F3F3F3'],
                  ['color_texto', 'Texto principal', '#232321'],
                ].map(([k, lbl, def]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <input type="color" value={des[k] || def} onChange={e => set({ [k]: e.target.value })} style={{ width: 44, height: 36, padding: 2, borderRadius: 8, cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{lbl}</div>
                      <input value={des[k] || def} onChange={e => set({ [k]: e.target.value })} style={{ fontSize: 12, padding: '4px 8px', width: 120 }} />
                    </div>
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
                  <h4 style={{ marginBottom: 8, fontSize: 14 }}>🛡️ Tarjetas de confianza</h4>
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
                <button className={predev === 'desktop' ? 'active' : ''} onClick={() => setPredev('desktop')} title="Escritorio">🖥️</button>
                <button className={predev === 'mobile' ? 'active' : ''} onClick={() => setPredev('mobile')} title="Celular">📱</button>
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
        <div style={{ background: 'var(--border-light)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
          ℹ️ El nombre, logo, favicon y WhatsApp de la tienda ahora se editan desde <strong>Personalizar tienda</strong> (con vista previa). Acá quedan solo los ajustes internos del negocio.
        </div>
        <div className="form-group"><label className="form-label">Nombre del negocio (interno, para remitos)</label><input value={c.nombre_negocio || ''} onChange={e => setC({ ...c, nombre_negocio: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">📧 Email para avisos de venta</label><input type="email" value={c.email_ventas || ''} onChange={e => setC({ ...c, email_ventas: e.target.value })} placeholder="tucorreo@gmail.com" /><small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Te llega un mail cada vez que entra una venta online, con link directo a la orden. En el celular la app de mail te avisa.</small></div>
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
        <h4 style={{ marginBottom: 8 }}>🔧 Modo mantenimiento</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><input type="checkbox" checked={m.activo} onChange={e => setM({ ...m, activo: e.target.checked })} /> Activar mantenimiento</label>
        <div className="form-group"><label className="form-label">Mensaje personalizado</label><input value={m.mensaje} onChange={e => setM({ ...m, mensaje: e.target.value })} placeholder="Estamos trabajando en mejoras..." /></div>
        <div className="form-group"><label className="form-label">Fecha de vuelta (countdown)</label><input type="datetime-local" value={m.countdown} onChange={e => setM({ ...m, countdown: e.target.value })} /></div>
        <button className="btn btn-warning" onClick={saveMaint}>{m.activo ? 'Guardar y activar mantenimiento' : 'Guardar (desactivado)'}</button>
      </div>
    </div>
  );
}
