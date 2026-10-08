import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, Fragment, Component, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import * as api from './api';
import { precioPublico } from '../api/_precio.js';
import { trackBusqueda } from './tracker';
import { ChevronDown, SlidersHorizontal, Check, Store, Search, Undo2, Trash2, ClipboardList, Share2, FlaskConical, Truck, Shield, CreditCard, Clock, Star, Lock, Zap, Package, Heart, ThumbsUp, CheckCircle, Gift, Headphones, Phone, Mail, MapPin, Globe, Award, BadgeCheck, ShoppingCart, Tag, Percent, RefreshCw, Send, Eye, Users, Wrench, Wifi, Battery, Cpu, Monitor, Smartphone, Camera, Bookmark, Bell, MessageCircle, HelpCircle, Info, AlertCircle, AlertTriangle, Archive, BarChart3, DollarSign, FileText, History, Lightbulb, Printer, Receipt, Ticket, User, Wallet, XCircle, EyeOff, Ban, X, ChevronLeft, ChevronRight, ImagePlus, LayoutList, SquareKanban, ArrowLeft, Minus, Plus, Maximize2, Link2 } from 'lucide-react';

// Cloudinary: pide cada imagen al tamaño en que se muestra, en WebP/AVIF y con calidad automática.
// Una foto de 2 MB pasa a pesar ~40 KB en la grilla. Las URLs que no son de Cloudinary quedan igual.
const CLD_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/i;
function imgOpt(url, w) {
  const u = String(url || '');
  const m = u.match(CLD_RE);
  if (!m || !w) return u;
  if (/^[a-z]{1,3}_[^/]*\//i.test(m[2])) return u; // ya trae transformaciones propias
  return `${m[1]}f_auto,q_auto,c_limit,w_${Math.round(w)}/${m[2]}`;
}
const imgSet = (url, w) => (CLD_RE.test(String(url || '')) ? `${imgOpt(url, w)} 1x, ${imgOpt(url, w * 2)} 2x` : undefined);

// ═══════════════════════════════════════════════════════════
// App.jsx — Sistema Unificado v4 (COMPLETO)
// ═══════════════════════════════════════════════════════════

const fmt = n => Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtARS = n => `$${fmt(n)}`;
// Monto de un pedido en su moneda: un pedido en USDT nunca se muestra con "$" (y conserva los centavos)
const fmtPedido = (n, o) => (o && o.moneda === 'USDT') ? `USDT ${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : fmtARS(n);

// Solo deja pasar links http(s), rutas propias, mailto/tel/wa: nunca "javascript:" ni "data:"
const urlSegura = (u) => {
  const v = String(u || '').trim(); if (!v) return '';
  if (/^(https?:\/\/|\/(?!\/)|#|\?|mailto:|tel:)/i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v.replace(/[\u0000-\u0020\u007F]+/g, ''))) return ''; // javascript:, data:, etc.
  if (/^\/\//.test(v)) return 'https:' + v;
  return /^[^/]+\.[a-z]{2,}(\/|$)/i.test(v) ? 'https://' + v : v; // "instagram.com/x" -> https; "categoria" queda relativo
};

// ── Carrito guardado en la cuenta ──
// Se guarda sin los textos largos del producto (descripción, notas): alcanza para mostrarlo y comprar.
const compactarCarrito = (cart) => {
  const out = {};
  for (const [sec, items] of Object.entries(cart || {})) {
    if (!Array.isArray(items)) continue;
    const ok = items.filter(i => i && i.id != null && Number(i.qty) > 0).map(({ descripcion, compatibilidad, notas, imagenes, ...resto }) => resto);
    if (ok.length) out[sec] = ok;
  }
  return out;
};
// Junta el carrito de este dispositivo con el de la cuenta: no se pierde nada (misma línea → la cantidad mayor)
const unirCarritos = (local, cuenta) => {
  const out = {};
  const clave = (i) => `${i.id}|${i.variante_id || 0}`;
  for (const sec of new Set([...Object.keys(local || {}), ...Object.keys(cuenta || {})])) {
    const a = Array.isArray(local?.[sec]) ? local[sec] : [], b = Array.isArray(cuenta?.[sec]) ? cuenta[sec] : [];
    const m = new Map();
    for (const it of b) if (it && it.id != null) m.set(clave(it), it);
    for (const it of a) { if (!it || it.id == null) continue; const prev = m.get(clave(it)); m.set(clave(it), prev ? { ...prev, ...it, qty: Math.max(Number(prev.qty) || 0, Number(it.qty) || 0) } : it); }
    if (m.size) out[sec] = [...m.values()];
  }
  return out;
};
// Un solo carrito por cuenta: se combina "lo que cambió en este dispositivo desde la última vez que coincidió con la cuenta"
// con lo que tiene la cuenta. Lo que no se tocó acá queda como en la cuenta (si se sacó o compró en otro lado, no vuelve);
// lo que se agregó o cambió acá (incluso sin sesión) se suma a la cuenta.
const tresVias = (base, local, cuenta) => {
  const mapa = (c) => { const m = new Map(); for (const [sec, items] of Object.entries(c || {})) if (Array.isArray(items)) for (const it of items) if (it && it.id != null) m.set(`${sec}#${it.id}|${it.variante_id || 0}`, it); return m; };
  const B = mapa(base), L = mapa(local), R = mapa(cuenta);
  const out = {};
  for (const k of new Set([...R.keys(), ...L.keys(), ...B.keys()])) {
    const qb = Number(B.get(k)?.qty) || 0, ql = Number(L.get(k)?.qty) || 0;
    const it = ql !== qb ? L.get(k) : R.get(k);
    if (it && Number(it.qty) > 0) { const sec = k.slice(0, k.indexOf('#')); (out[sec] = out[sec] || []).push(it); }
  }
  return out;
};
// Último carrito que este dispositivo vio igual a la cuenta
const leerBaseCarrito = () => { try { const b = JSON.parse(localStorage.getItem('gm_cart_base') || 'null'); return b && typeof b === 'object' ? b : {}; } catch { return {}; } };
const guardarBaseCarrito = (items) => { try { localStorage.setItem('gm_cart_base', JSON.stringify(compactarCarrito(items))); } catch {} };
// Formatea según moneda de la variante: USDT/USD muestran su prefijo, ARS usa $
const fmtDol = (n) => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 }); // USDT/USD con centavos
const fmtMon = (n, moneda) => moneda === 'USDT' ? `USDT ${fmtDol(n)}` : moneda === 'USD' ? `US$ ${fmtDol(n)}` : `$${fmt(n)}`;
// --- Blindaje de precios/totales (evita totales x100 por data vieja o corrupta) ---
const puItem = (i) => {
  const base = Number(i?.precio_base) || 0;
  const pu = Number(i?.precio_unitario ?? base) || 0;
  if (base > 0 && pu > base * 5) return base;
  return pu > 0 ? pu : base;
};
const envioSano = (costo, sub) => { const c = Math.max(0, Number(costo) || 0); return c <= Math.max(300000, Number(sub) || 0) ? c : 0; };
const descSano = (desc, sub) => Math.min(Math.max(0, Number(desc) || 0), Math.max(0, Number(sub) || 0));
// Un ítem del carrito es en cripto/dólar si su variante quedó marcada así
const esUSDT = (i) => !!i && (i.variante_moneda === 'USDT' || i.variante_moneda === 'USD');
const monedaItem = (i) => (i && i.variante_moneda) || 'ARS';
// ─── PROMOCIONES: helper compartido (se aplica en toda la tienda) ───
// Entre TODAS las promos que aplican (sección/categoría/producto) elige la que MÁS baja el precio.
// Ignora las de envío gratis (no afectan el precio). Solo pesos.
function aplicarPromo(base, product, promos, seccionId, moneda) {
  if ((moneda && moneda !== 'ARS') || !(base > 0) || !product || !promos || !promos.length) return null;
  const secId = seccionId != null ? String(seccionId) : (product.seccion_id != null ? String(product.seccion_id) : '');
  let mejor = null;
  for (const pr of promos) {
    if (pr.tipo !== 'porcentaje' && pr.tipo !== 'monto_fijo') continue;
    const secs = String(pr.secciones_ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (secs.length && !(secId && secs.includes(secId))) continue;
    const prods = String(pr.productos_ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (prods.length && !prods.includes(String(product.id))) continue;
    if (pr.categoria && pr.categoria !== product.categoria) continue;
    let final = base;
    if (pr.tipo === 'porcentaje') final = Math.round(base * (1 - Number(pr.valor) / 100));
    else if (pr.tipo === 'monto_fijo') final = Math.max(0, base - Number(pr.valor));
    if (final < base && (!mejor || final < mejor.final)) mejor = { final, original: base, pct: Math.round((1 - final / base) * 100), nombre: pr.nombre, hasta: pr.fecha_hasta || null };
  }
  return mejor;
}

// ─── SEO: meta tags dinámicos por página ───
// ¿Es el sitio de la plataforma (comerciapp.com.ar sin subdominio, o ?comerciapp=1 para probar)?
function esRaizComerciApp() {
  try {
    if (new URLSearchParams(window.location.search).get('comerciapp') === '1') return true;
    const host = window.location.hostname;
    return host === 'comerciapp.com.ar' || host === 'www.comerciapp.com.ar';
  } catch { return false; }
}
function upsertMeta(selector, attr, key, content) {
  let el = document.head.querySelector(selector);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content || '');
}
function setCanonical(url) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); }
  el.setAttribute('href', url);
}
function setJsonLd(obj) {
  let el = document.getElementById('ld-json');
  if (!obj) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'ld-json'; document.head.appendChild(el); }
  el.textContent = JSON.stringify(obj);
}
const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
// Resumen para Google (meta description): sin viñetas ni rótulos tipo "Detalles del producto", cortado en una palabra
const resumenDesc = (s, max = 160) => {
  let t = stripHtml(s).replace(/[•*>]+/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/^((detalles( del producto)?|descripci[oó]n( del producto)?|especificaciones|caracter[ií]sticas)\s*:?\s*)+/i, '');
  if (t.length <= max) return t;
  const c = t.slice(0, max - 1); const k = c.lastIndexOf(' ');
  return (k > 80 ? c.slice(0, k) : c).replace(/[\s,;:.-]+$/, '') + '…';
};

// ─── ROUTING: URLs reales (SEO + compartir + back-button) ───
const RUTAS_RESERVADAS = new Set(['producto', 'info', 'categoria', 'buscar', 'carrito', 'favoritos', 'contacto', 'arrepentimiento', 'mi-cuenta', 'panel', 'ingresar', 'registro', 'recuperar', 'preview', 'api', 'og', 'crear-tienda']);
const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60).replace(/-+$/, '');
const slugPagina = (p) => slugify(p.slug || p.titulo) || String(p.id); // páginas informativas: /info/<slug>
const productPath = (p) => `/producto/${slugify(p.nombre || p.modelo || 'producto') || 'producto'}-${p.id}`;
const parseProdId = (seg) => { const m = String(seg || '').match(/-(\d+)$/); return m ? Number(m[1]) : (Number(seg) || null); };
// Preserva ?tienda / ?preview (necesarios para probar tenants sin dominio propio)
const keptQuery = () => { const cur = new URLSearchParams(window.location.search); const kept = new URLSearchParams(); for (const k of ['tienda', 'preview']) { const v = cur.get(k); if (v) kept.set(k, v); } return kept; };
function buildPath(page, o = {}) {
  const { sec, prod, search, pag, info, cat } = o;
  let base = '/';
  if (page === 'product' && prod?.id) base = productPath(prod);
  else if (page === 'section' && (sec?.slug || sec?.id)) base = `/${sec.slug || ('s-' + sec.id)}`;
  else if (page === 'search' && search) base = `/buscar/${encodeURIComponent(search)}`;
  else if (page === 'cart') base = '/carrito';
  else if (page === 'favoritos') base = '/favoritos';
  else if (page === 'contacto') base = '/contacto';
  else if (page === 'arrepentimiento') base = '/arrepentimiento';
  else if (page === 'info') base = '/info' + (info ? '/' + info : '');
  else if (page === 'categoria' && cat) base = '/categoria/' + cat;
  else if (page === 'account') base = '/mi-cuenta';
  else if (page === 'admin') base = '/panel';
  else if (page === 'login') base = '/ingresar';
  else if (page === 'register') base = '/registro';
  else if (page === 'forgot') base = '/recuperar';
  const kept = keptQuery();
  if (page === 'section' && pag && pag > 1) kept.set('pag', String(pag));
  const qs = kept.toString();
  return base + (qs ? '?' + qs : '');
}
function parsePath(pathname, search, secciones = []) {
  const parts = String(pathname || '/').split('/').filter(Boolean);
  const sp = new URLSearchParams(search || '');
  if (!parts.length) return { page: 'landing' };
  const a = parts[0];
  if (a === 'producto') return { page: 'product', prodId: parseProdId(parts[1]) };
  if (a === 'buscar') { let q = parts[1] || ''; try { q = decodeURIComponent(q); } catch { /* "%" suelto: se usa tal cual */ } return { page: 'search', search: q }; }
  if (a === 'carrito') return { page: 'cart' };
  if (a === 'favoritos') return { page: 'favoritos' };
  if (a === 'contacto') return { page: 'contacto' };
  if (a === 'arrepentimiento') return { page: 'arrepentimiento' };
  if (a === 'info') return { page: 'info', info: parts[1] || '' };
  if (a === 'categoria' && parts[1]) return { page: 'categoria', cat: parts[1] };
  if (a === 'mi-cuenta') return { page: 'account' };
  if (a === 'panel') return { page: 'admin' };
  if (a === 'ingresar') return { page: 'login' };
  if (a === 'registro') return { page: 'register' };
  if (a === 'recuperar') return { page: 'forgot' };
  if (!RUTAS_RESERVADAS.has(a)) {
    const sec = secciones.find(s => s.slug === a || ('s-' + s.id) === a);
    if (sec) return { page: 'section', sec, pag: Number(sp.get('pag')) || 1 };
  }
  return { page: 'landing' };
}
// Dispara un evento a Google Analytics y Facebook Pixel (si están cargados). gaName y fbName son los nombres estándar de cada plataforma.
const trackEvent = (gaName, fbName, data = {}) => {
  try { if (window.gtag && gaName) window.gtag('event', gaName, data); } catch {}
  try { if (window.fbq && fbName) window.fbq('track', fbName, data); } catch {}
};


const numOrden = (o) => { const id = String(o?.id ?? '').padStart(4, '0'); return (o?.tipo === 'presupuesto') ? `P-${id}` : `#${id}`; };
// Número de WhatsApp en formato internacional. Corrige los números argentinos cargados "a la antigua"
// (con 0, con 15, sin 54 o sin 9): 1522525568 / 011 15 2252-5568 / 54 11 2252-5568 → 5491122525568.
// Los de otros países (o con formato desconocido) quedan como están.
const waIntl = (num) => {
  const orig = String(num || '').replace(/\D/g, '');
  let t = orig;
  if (t.startsWith('00')) { t = t.slice(2); if (!t.startsWith('54')) return t; }
  if (t.startsWith('54')) { t = t.slice(2); if (t.startsWith('9')) t = t.slice(1); }
  t = t.replace(/^0/, '');
  if (t.length === 12) { const la = t.startsWith('11') ? 2 : t.slice(3, 5) === '15' ? 3 : 4; if (t.slice(la, la + 2) === '15') t = t.slice(0, la) + t.slice(la + 2); }
  if (/^15\d{8}$/.test(t)) t = '11' + t.slice(2); // 15 + 8 dígitos: celular de AMBA cargado sin el 11
  return t.length === 10 ? '549' + t : orig.replace(/^00/, '');
};
const waLink = (num, msg) => `https://api.whatsapp.com/send?phone=${waIntl(num)}&text=${encodeURIComponent(msg)}`;
const openWA = (num, msg) => window.open(waLink(num, msg), '_blank');

// ─── SISTEMA DE TEMAS / EDITOR VISUAL ───
// Opciones de fuente (Google Fonts, cargadas dinámicamente)
const FONT_OPTIONS = [
  { id: 'Archivo', label: 'Archivo (por defecto)', cat: 'Sans moderna' },
  { id: 'Inter', label: 'Inter', cat: 'Sans limpia' },
  { id: 'Poppins', label: 'Poppins', cat: 'Sans redondeada' },
  { id: 'Roboto', label: 'Roboto', cat: 'Sans clásica' },
  { id: 'Montserrat', label: 'Montserrat', cat: 'Sans elegante' },
  { id: 'Open Sans', label: 'Open Sans', cat: 'Sans neutra', w: '400;500;600;700;800' },
  { id: 'Lato', label: 'Lato', cat: 'Sans cálida', w: '400;700;900' },
  { id: 'Nunito', label: 'Nunito', cat: 'Sans amable' },
  { id: 'Work Sans', label: 'Work Sans', cat: 'Sans versátil' },
  { id: 'Space Grotesk', label: 'Space Grotesk', cat: 'Tech', w: '400;500;600;700' },
  { id: 'Outfit', label: 'Outfit', cat: 'Geométrica' },
  { id: 'Playfair Display', label: 'Playfair Display', cat: 'Serif lujo' },
  { id: 'Merriweather', label: 'Merriweather', cat: 'Serif legible', w: '400;700;900' },
  { id: 'DM Sans', label: 'DM Sans', cat: 'Sans compacta' },
  { id: 'Hanken Grotesk', label: 'Hanken Grotesk', cat: 'Sans premium' },
  { id: 'Red Hat Display', label: 'Red Hat Display', cat: 'Sans cálida' },
  { id: 'IBM Plex Sans', label: 'IBM Plex Sans', cat: 'Técnica', w: '400;500;600;700' },
  { id: 'Source Sans 3', label: 'Source Sans 3', cat: 'Sans legible' },
  { id: 'Schibsted Grotesk', label: 'Schibsted Grotesk', cat: 'Sans fuerte' },
  { id: 'Oswald', label: 'Oswald', cat: 'Condensada (títulos)', w: '400;500;600;700' },
  { id: 'Barlow Condensed', label: 'Barlow Condensed', cat: 'Condensada (títulos)', w: '500;600;700;800' },
  { id: 'Archivo Narrow', label: 'Archivo Narrow', cat: 'Condensada', w: '400;500;600;700' },
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
    id: 'retail', name: 'Retail premium', desc: 'Oscuro · elegante', mode: 'dark', nuevo: true,
    p: '#8DC63F', s: '#232320', a: '#8DC63F', font: 'Hanken Grotesk',
    radius: 'redondeado', shadow: 'none', card: 'plano',
    bg: '#0E0E0D', bgCard: '#181816', text: '#F4F3EF', textSec: '#A7A59E', border: '#2A2926',
    headerBg: '#0E0E0D', headerText: '#F4F3EF', marqueeBg: '#181816', marqueeText: '#A7A59E',
    onP: '#0E0E0D', btnBg: '#262624', btnFg: '#F4F3EF', imgBg: '#F2F2EF', upper: 'no',
  },
  {
    id: 'herramienta', name: 'Herramienta pro', desc: 'Oscuro · rojo industrial', mode: 'dark', nuevo: true,
    p: '#D7262E', s: '#2B2B2B', a: '#D7262E', font: 'Source Sans 3', fontHead: 'Oswald',
    radius: 'cuadrado', shadow: 'none', card: 'plano',
    bg: '#0E0E0E', bgCard: '#171717', text: '#FFFFFF', textSec: '#A8A8A8', border: '#2B2B2B',
    headerBg: '#0E0E0E', headerText: '#FFFFFF', marqueeBg: '#D7262E', marqueeText: '#FFFFFF',
    onP: '#FFFFFF', onA: '#FFFFFF', btnBg: '#FFFFFF', btnFg: '#0E0E0E', imgBg: '#F1F1EF', upper: 'si', upperHead: 'si',
  },
  {
    id: 'distribuidor', name: 'Distribuidor técnico', desc: 'Oscuro · ámbar técnico', mode: 'dark', nuevo: true,
    p: '#F2A93B', s: '#202023', a: '#F2A93B', font: 'IBM Plex Sans',
    radius: 'cuadrado', shadow: 'none', card: 'borde',
    bg: '#0F0F10', bgCard: '#18181A', text: '#EDEDED', textSec: '#9E9EA3', border: '#2A2A2D',
    headerBg: '#0F0F10', headerText: '#EDEDED', marqueeBg: '#18181A', marqueeText: '#9E9EA3',
    onP: '#0F0F10', btnBg: '#26262A', btnFg: '#EDEDED', imgBg: '#F1F1EF', upper: 'no',
  },
  {
    id: 'cobre', name: 'Cobre', desc: 'Oscuro · cálido', mode: 'dark', nuevo: true,
    p: '#E0915A', s: '#26211D', a: '#E0915A', font: 'Red Hat Display',
    radius: 'extra', shadow: 'none', card: 'plano',
    bg: '#14110F', bgCard: '#1D1916', text: '#F3ECE4', textSec: '#B0A496', border: '#352E28',
    headerBg: '#14110F', headerText: '#F3ECE4', marqueeBg: '#1D1916', marqueeText: '#B0A496',
    onP: '#14110F', btnBg: '#2A241F', btnFg: '#F3ECE4', imgBg: '#F2EEE9', upper: 'no',
  },
  {
    id: 'mostrador', name: 'Mostrador nocturno', desc: 'Oscuro · negro y amarillo', mode: 'dark', nuevo: true,
    p: '#FFD23F', s: '#1A1A1A', a: '#FFD23F', font: 'Schibsted Grotesk',
    radius: 'cuadrado', shadow: 'none', card: 'borde',
    bg: '#0B0B0B', bgCard: '#141414', text: '#FFFFFF', textSec: '#A6A6A6', border: '#2A2A2A',
    headerBg: '#0B0B0B', headerText: '#FFFFFF', marqueeBg: '#FFD23F', marqueeText: '#0B0B0B',
    onP: '#0B0B0B', btnBg: '#FFFFFF', btnFg: '#0B0B0B', imgBg: '#F2F2F2', upper: 'no',
  },
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

// Cargar una Google Font on-demand (idempotente)
const loadedFonts = new Set();
function ensureFont(font) {
  if (!font || font === 'Archivo' || loadedFonts.has(font)) return;
  loadedFonts.add(font);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  const w = (FONT_OPTIONS.find(f => f.id === font) || {}).w || '400;500;600;700;800;900';
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@${w}&display=swap`;
  document.head.appendChild(link);
}
// Bases de modo claro/oscuro. El tema puede pisar cualquiera de estos con sus vars explícitos.
const MODE_BASE = {
  light: { bg: '#F3F3F3', bgCard: '#ffffff', text: '#232321', textSec: '#626262', textMuted: '#959595', border: '#E7E7E3', borderLight: '#F3F3F3' },
  dark: { bg: '#161616', bgCard: '#1f1f1f', text: '#f5f5f5', textSec: '#a3a3a3', textMuted: '#6f6f6f', border: '#2e2e2e', borderLight: '#262626' },
};
// Aplicar TODAS las variables de diseño a un root (document o iframe). Sin root = document.
// Si el tema trae mode, se aplica la base de ese modo primero y luego los overrides.
// Variables que maneja el diseño (se limpian antes de aplicar, para que no queden restos de otra plantilla)
const DESIGN_VARS = ['--bg', '--bg-card', '--text', '--text-secondary', '--text-muted', '--border', '--border-light', '--primary', '--primary-dark', '--primary-light', '--primary-hover', '--warning', '--accent', '--header-bg', '--header-text', '--marquee-bg', '--marquee-text', '--font', '--font-heading', '--radius', '--radius-sm', '--radius-pill', '--shadow', '--shadow-lg', '--card-border', '--tt', '--tt-heading', '--img-bg', '--img-bg-pdp', '--on-primary', '--on-accent', '--card-btn-bg', '--card-btn-fg'];
// Claves del diseño que forman un "estilo" (las que guarda una plantilla y el respaldo del diseño propio)
const TEMA_KEYS = ['plantilla', 'modo_tema', 'color_primario', 'color_secundario', 'color_acento', 'color_fondo', 'color_card', 'color_texto', 'color_texto_sec', 'color_borde', 'color_header', 'color_header_text', 'color_marquee', 'color_marquee_text', 'color_texto_boton', 'color_texto_acento', 'color_boton_tarjeta', 'color_boton_tarjeta_texto', 'fondo_fotos', 'fuente', 'fuente_titulos', 'mayusculas', 'mayusculas_titulos', 'estilo_bordes', 'estilo_sombra', 'estilo_card'];

// Aplicar TODAS las variables de diseño a un root (document o iframe). Sin root = document.
// Si el tema trae mode, se aplica la base de ese modo primero y luego los overrides.
function applyDesignVars(des, rootEl) {
  const root = rootEl || document.documentElement;
  if (!des) return;
  DESIGN_VARS.forEach(v => root.style.removeProperty(v));
  const set = (k, v) => v && root.style.setProperty(k, v);

  // 1) Base de modo (si el tema lo define)
  const preset = THEME_PRESETS.find(t => t.id === des.plantilla);
  const mode = des.modo_tema || (preset && preset.mode) || null;
  if (mode && MODE_BASE[mode]) {
    const b = MODE_BASE[mode];
    set('--bg', b.bg); set('--bg-card', b.bgCard); set('--text', b.text);
    set('--text-secondary', b.textSec); set('--text-muted', b.textMuted);
    set('--border', b.border); set('--border-light', b.borderLight);
    // En la vista previa (iframe) el modo se cambia acá; en la tienda lo maneja el efecto de la app
    if (rootEl) root.classList.toggle('dark', mode === 'dark');
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
  if (des.color_borde && mode === 'dark') set('--border-light', des.color_borde);
  set('--header-bg', des.color_header);
  set('--header-text', des.color_header_text);
  set('--marquee-bg', des.color_marquee);
  set('--marquee-text', des.color_marquee_text);
  // primary-light derivado (para focus rings) — usar primario con baja opacidad
  if (des.color_primario) set('--primary-light', hexToRgba(des.color_primario, 0.14));
  // Texto sobre el color principal (verde o amarillo claros llevan texto oscuro)
  if (des.color_texto_boton) { set('--on-primary', des.color_texto_boton); set('--primary-hover', des.color_primario); }
  set('--on-accent', des.color_texto_acento);
  set('--card-btn-bg', des.color_boton_tarjeta);
  set('--card-btn-fg', des.color_boton_tarjeta_texto);
  // Fondo detrás de las fotos (las del proveedor vienen con fondo blanco)
  if (des.fondo_fotos) { set('--img-bg', des.fondo_fotos); set('--img-bg-pdp', des.fondo_fotos); }

  if (des.fuente) { ensureFont(des.fuente); set('--font', `'${des.fuente}', sans-serif`); }
  if (des.fuente_titulos) { ensureFont(des.fuente_titulos); set('--font-heading', `'${des.fuente_titulos}', sans-serif`); }
  if (des.mayusculas === 'no') set('--tt', 'none');
  if (des.mayusculas_titulos === 'si') set('--tt-heading', 'uppercase');
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

// Emojis viejos guardados en la base (íconos de envíos, pagos, badges) → ícono profesional equivalente
const EMOJI_ICON = { '🚚': 'truck', '🚛': 'truck', '📦': 'package', '💳': 'credit-card', '💵': 'credit-card', '💰': 'credit-card', '🏦': 'credit-card', '⭐': 'star', '🔒': 'lock', '⚡': 'zap', '❤️': 'heart', '👍': 'thumbs-up', '✅': 'check-circle', '🎁': 'gift', '📞': 'phone', '📧': 'mail', '✉️': 'mail', '📍': 'map-pin', '🌎': 'globe', '🏆': 'award', '🛒': 'shopping-cart', '🏷️': 'tag', '🔧': 'wrench', '📱': 'smartphone', '🔔': 'bell', '💬': 'message-circle', 'ℹ️': 'info', '🛵': 'truck', '🏍️': 'truck', '🏪': 'map-pin', '🛡️': 'shield', '⏰': 'clock', '🕐': 'clock' };

// Render an icon: lucide name → SVG, URL → img, else → emoji
function RenderIcon({ value, size = 20, color }) {
  if (!value) return null;
  if (value.startsWith('http') || value.startsWith('/') || value.startsWith('data:')) return <img src={value} alt="" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 4 }} />;
  const LucideIcon = ICON_MAP[value] || ICON_MAP[EMOJI_ICON[String(value).trim()]];
  if (LucideIcon) return <LucideIcon size={size} color={color || 'currentColor'} />;
  // Emoji sin equivalente: ícono genérico (nada de emojis en la tienda)
  if (/\p{Extended_Pictographic}/u.test(value)) return <Package size={size} color={color || 'currentColor'} />;
  return <span style={{ fontSize: size * 0.9 }}>{value}</span>;
}


// ─── ANDREANI CALCULATOR (product detail) ───

// ¿La pantalla cumple esta media query? (ej: '(max-width: 768px)' = celular). Se actualiza al girar/redimensionar.
function useMediaQuery(q) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false);
  const [ok, setOk] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(q); const on = () => setOk(m.matches);
    on(); m.addEventListener ? m.addEventListener('change', on) : m.addListener(on);
    return () => { m.removeEventListener ? m.removeEventListener('change', on) : m.removeListener(on); };
  }, [q]);
  return ok;
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
// ─── ERROR BOUNDARY: muestra el error en pantalla en vez de dejar todo negro ───
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { try { console.error('ErrorBoundary', err, info); } catch (e) {} }
  render() {
    if (this.state.err) {
      const msg = String(this.state.err && (this.state.err.stack || this.state.err.message || this.state.err));
      return (
        <div style={{ padding: 20, margin: 20, border: '2px solid #e11d48', borderRadius: 12, background: '#fff', color: '#111', maxWidth: 820 }}>
          <h2 style={{ color: '#e11d48', marginBottom: 8, fontSize: 20 }}><AlertTriangle size={15} style={{ verticalAlign: '-2px' }} /> Se rompió esta pantalla</h2>
          <p style={{ fontSize: 13, marginBottom: 8 }}>Sacale una captura a esto y pasámelo:</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f5f5f5', padding: 10, borderRadius: 8, overflow: 'auto', maxHeight: 320 }}>{msg}</pre>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => this.setState({ err: null })} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer' }}>Reintentar</button>
            <button onClick={() => { try { window.location.href = window.location.origin; } catch (e) {} }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer' }}>Volver al inicio</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// El panel de administración y la web de ComerciApp se bajan aparte, recién cuando hacen falta:
// así el cliente de la tienda descarga mucho menos código.
const cargarPanel = () => import('./Panel.jsx')
  .then(m => { try { sessionStorage.removeItem('gm_recarga_panel'); } catch {} return m; })
  .catch(err => {
    // Hubo una actualización y el archivo viejo ya no existe: recargar una vez para traer la versión nueva
    try { if (!sessionStorage.getItem('gm_recarga_panel')) { sessionStorage.setItem('gm_recarga_panel', '1'); window.location.reload(); return new Promise(() => {}); } } catch {}
    throw err;
  });
const lazyPanel = (nombre) => lazy(() => cargarPanel().then(m => ({ default: m[nombre] })));
const AdminPanel = lazyPanel('AdminPanel');
const PanelPlataforma = lazyPanel('PanelPlataforma');
const ComerciappLanding = lazyPanel('ComerciappLanding');
const CrearTiendaPage = lazyPanel('CrearTiendaPage');
const ComerciappLoginPage = lazyPanel('ComerciappLoginPage');
const CargandoPanel = () => <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>;

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('preview') === '1') return 'landing';
      if (params.get('contacto') === '1') return 'contacto';
      // Link compartido de producto o búsqueda: NO restaurar la página guardada
      // (si el usuario estaba en 'admin', el link igual debe abrir el producto).
      if (params.get('producto') || params.get('buscar')) return 'landing';
      // Ruta real (path): resolver páginas estáticas al toque; producto/búsqueda/sección se cargan en el init async
      const r = parsePath(window.location.pathname, window.location.search, []);
      if (['cart', 'favoritos', 'contacto', 'arrepentimiento', 'info', 'categoria', 'account', 'admin', 'login', 'register', 'forgot'].includes(r.page)) return r.page;
      if (r.page === 'product' || r.page === 'search') return 'landing';
    }
    // Búsqueda/producto/sección dependen de la URL: sin ella se abría una búsqueda vacía al entrar al inicio
    const sv = localStorage.getItem('gm_page'); if (!sv || ['login','register','forgot','maintenance','search','product','section','info','categoria'].includes(sv)) return 'landing'; return sv;
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
    // Vista de una tienda desde la plataforma (?tienda=): no se cargan sus scripts de terceros (ahí vive la sesión del dueño)
    if (api.esVistaPrestada()) return;
    const gaRaw = (config.ga_id || '').trim();
    const gaId = /^[A-Z]{1,3}-[A-Z0-9-]{4,30}$/i.test(gaRaw) ? gaRaw : '';
    const pixelId = (config.fb_pixel_id || '').trim().replace(/[^0-9]/g, '');
    const clarityId = (config.clarity_id || '').trim().replace(/[^a-z0-9]/gi, '');
    // Microsoft Clarity (grabaciones de sesión y mapas de calor)
    if (clarityId && !window.__clarityLoaded) {
      window.__clarityLoaded = true;
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      const sc = document.createElement('script'); sc.async = true; sc.src = `https://www.clarity.ms/tag/${clarityId}`; document.head.appendChild(sc);
    }
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
  }, [config.ga_id, config.fb_pixel_id, config.clarity_id]);
  const [seccionActual, setSeccionActual] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_seccion') || 'null'); } catch { return null; } });
  const [catSlug, setCatSlug] = useState(() => { try { const r = parsePath(window.location.pathname, '', []); return r.page === 'categoria' ? r.cat : ''; } catch { return ''; } });
  const [infoSlug, setInfoSlug] = useState(() => { try { const r = parsePath(window.location.pathname, '', []); return r.page === 'info' ? r.info : ''; } catch { return ''; } });
  const [selectedProduct, setSelectedProduct] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_product') || 'null'); } catch { return null; } });
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('gm_cart') || '{}'); } catch { return {}; } });
  const [notifyProduct, setNotifyProduct] = useState(null);
  const [promosGlobal, setPromosGlobal] = useState([]);
  useEffect(() => { api.getPromocionesActivas().then(pr => setPromosGlobal(Array.isArray(pr) ? pr : [])).catch(() => {}); }, []);
  const [menuItems, setMenuItems] = useState([]);
  const [redesSociales, setRedesSociales] = useState([]);
  const [badges, setBadges] = useState([]);
  const [barras, setBarras] = useState([]);
  const [listas, setListas] = useState([]);
  const [preciosFijos, setPreciosFijos] = useState([]);

  const [adminTab, setAdminTab] = useState(() => { try { return localStorage.getItem('gm_admin_tab') || 'dashboard'; } catch (e) { return 'dashboard'; } });
  const [adminSeccion, setAdminSeccion] = useState('all');
  // Recordar la última pestaña del panel al recargar
  useEffect(() => { try { localStorage.setItem('gm_admin_tab', adminTab); } catch (e) {} }, [adminTab]);

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
  const designKey = TEMA_KEYS.map(k => design[k] || '').join('|');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', effectiveDark);
    localStorage.setItem('gm_dark', dark);
    applyDesignVars(design);
  }, [effectiveDark, dark, designKey]);

  // Save cart
  useEffect(() => { try { localStorage.setItem('gm_cart', JSON.stringify(cart)); } catch {} }, [cart]);

  // Registrar carrito abandonado a nivel app: si hay usuario logueado e items, tras 30s sin comprar
  const abandonoTimer = useRef(null);
  useEffect(() => {
    if (abandonoTimer.current) clearTimeout(abandonoTimer.current);
    const items = Object.entries(cart).flatMap(([secId, its]) => Array.isArray(its) ? its.filter(i => i.qty > 0).map(i => ({ ...i, seccion_id: Number(secId) })) : []);
    if (!user || !items.length) return;
    abandonoTimer.current = setTimeout(() => {
      const total = items.reduce((s, i) => s + puItem(i) * i.qty, 0);
      api.guardarCarritoAbandonado({
        usuario_id: user.id, email: user.email || '', telefono: user.telefono || user.whatsapp || '',
        items: items.map(i => ({ nombre: i.nombre || i.modelo, qty: i.qty, precio: puItem(i), producto_id: i.id, seccion_id: i.seccion_id, imagen: i.imagen || '' })),
        total, seccion_id: items[0]?.seccion_id || null
      }).catch(() => {});
    }, 30000); // 30s con items en el carrito sin cerrar compra
    return () => { if (abandonoTimer.current) clearTimeout(abandonoTimer.current); };
  }, [cart, user]);

  // Auto-limpieza: solo datos rotos (sin producto o cantidad 0). El carrito NUNCA se vacía solo: una tienda que hoy no
  // aparece (ej. mayorista sin sesión) o un producto sin precio quedan guardados; lo decide el cliente.
  useEffect(() => {
    setCart(prev => {
      let changed = false; const next = {};
      for (const [k, items] of Object.entries(prev || {})) {
        if (!Array.isArray(items)) { changed = true; continue; }
        const clean = items.filter(i => i && i.id != null && i.qty > 0);
        next[k] = clean; if (clean.length !== items.length) changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  // Carrito guardado en la cuenta: un solo carrito por cuenta, igual en todos los dispositivos.
  //  · al abrir la web o volver a la pestaña con la sesión abierta → se trae el de la cuenta
  //  · lo agregado sin sesión (o cambios de este dispositivo que no llegaron a guardarse) → se suma al ingresar
  //  · si otro dispositivo guardó justo antes, se combinan los cambios de los dos (sin duplicar)
  const cartSync = useRef({ uid: null, listo: false, timer: null, version: 0 });
  const cartRef = useRef(cart); cartRef.current = cart;
  const leerCuenta = (uid) => api.getCarritoGuardado().then(r => {
    if (cartSync.current.uid !== uid) return;
    const cuenta = (r && r.items && typeof r.items === 'object' && !Array.isArray(r.items)) ? r.items : {};
    const v = Number(r && r.version) || 0;
    if (cartSync.current.listo && v === cartSync.current.version) return; // nada nuevo en la cuenta
    cartSync.current.version = v;
    const base = leerBaseCarrito();
    setCart(prev => tresVias(base, prev, cuenta));
    guardarBaseCarrito(cuenta);
    cartSync.current.listo = true;
  });
  const guardarCuenta = (uid, snap) => api.guardarCarrito(compactarCarrito(snap), cartSync.current.version).then(r => {
    if (cartSync.current.uid !== uid) return;
    cartSync.current.version = Number(r && r.version) || cartSync.current.version;
    guardarBaseCarrito(snap);
  }).catch(e => {
    // Otro dispositivo guardó justo antes: se combinan los cambios de los dos y se vuelve a guardar
    if (e && e.status === 409 && e.data && cartSync.current.uid === uid) {
      cartSync.current.version = Number(e.data.version) || 0;
      const cuenta = (e.data.items && typeof e.data.items === 'object' && !Array.isArray(e.data.items)) ? e.data.items : {};
      const base = leerBaseCarrito();
      setCart(prev => tresVias(base, prev, cuenta));
      guardarBaseCarrito(cuenta);
    }
  });
  useEffect(() => {
    const uid = user?.id || null;
    cartSync.current.uid = uid; cartSync.current.listo = false; cartSync.current.version = 0; clearTimeout(cartSync.current.timer); cartSync.current.timer = null;
    if (!uid) return;
    let vivo = true;
    const traer = (n) => leerCuenta(uid).catch(() => { if (vivo && n < 4) setTimeout(() => traer(n + 1), 4000 * n); }); // sin leer la cuenta no se guarda nada (así no se pisa)
    traer(1);
    // Al volver a esta pestaña o app: puede haber cambios hechos en otro dispositivo
    const alVolver = () => { if (document.visibilityState === 'visible' && cartSync.current.listo && !cartSync.current.timer) leerCuenta(uid).catch(() => {}); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { vivo = false; document.removeEventListener('visibilitychange', alVolver); };
  }, [user?.id]);
  useEffect(() => {
    const uid = user?.id;
    if (!uid || !cartSync.current.listo) return;
    clearTimeout(cartSync.current.timer);
    const snap = cart;
    let base = null; try { base = localStorage.getItem('gm_cart_base'); } catch {}
    if (base === JSON.stringify(compactarCarrito(snap))) return; // igual a lo que ya tiene la cuenta: no hace falta guardar
    cartSync.current.timer = setTimeout(() => { cartSync.current.timer = null; guardarCuenta(uid, snap); }, 1200);
  }, [cart, user?.id]);
  // Sesión: se renueva sola al entrar y cada tanto mientras la web esté abierta
  useEffect(() => {
    if (!user?.id) return;
    api.renovarSesion();
    const t = setInterval(() => api.renovarSesion(), 6 * 3600 * 1000);
    const alVolver = () => { if (document.visibilityState === 'visible') api.renovarSesion(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, [user?.id]);

  // FIX #4: persistir ruta + seccion
  useEffect(() => { localStorage.setItem('gm_page', page); }, [page]);
  useEffect(() => { localStorage.setItem('gm_seccion', JSON.stringify(seccionActual)); }, [seccionActual]);
  useEffect(() => { localStorage.setItem('gm_product', JSON.stringify(selectedProduct)); }, [selectedProduct]);

  // Init - runs once
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    // Seguro: si algo tarda mucho, mostrar la web igual (los datos que falten llegan después)
    const seguro = setTimeout(() => setLoading(false), 12000);
    (async () => {
      try {
        const [secs, cfg, des, menu, redes, lsts, pf, plan] = await Promise.all([
          api.getSecciones().catch(() => []), api.getConfig().catch(() => ({})), api.getDesign().catch(() => ({})),
          api.getMenu().catch(() => []), api.getRedesSociales().catch(() => []),
          api.getListas().catch(() => []), api.getPreciosFijos().catch(() => []),
          api.getMiPlan().catch(() => ({ plan: 'full', estado: 'activo', features: null }))
        ]);
        setSecciones(Array.isArray(secs) ? secs : []); setConfig(cfg && typeof cfg === 'object' ? cfg : {}); setDesign(des);
        if (plan) setMiPlan(plan);
        applyDesignVars(des);
        setMenuItems(menu); setRedesSociales(redes);
        setListas(Array.isArray(lsts) ? lsts : []); setPreciosFijos(Array.isArray(pf) ? pf : []);
        api.getBadges().then(setBadges).catch(() => {});
        api.getBarras().then(b => setBarras(Array.isArray(b) ? b : [])).catch(() => {});
        if (api.getToken()) {
          try { const me = await api.getMe(); setUser(me); }
          catch (e) {
            if (e && e.status === 401) api.logout();
            else {
              // Falla de conexión u ocupado: la sesión se mantiene y se reintenta sola
              console.warn('No se pudo verificar la sesión (se reintenta):', e && e.message);
              const reintentar = (n) => setTimeout(() => { api.getMe().then(setUser).catch(err => { if (err && err.status === 401) api.logout(); else if (n < 3) reintentar(n + 1); }); }, 2500 * n);
              reintentar(1);
            }
          }
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
        // Carrito compartido: ?carrito=BASE64 precarga el carrito y lleva al cart (y ?cupon=X deja el cupón listo)
        const carritoParam = new URLSearchParams(window.location.search).get('carrito');
        const cuponParam = new URLSearchParams(window.location.search).get('cupon');
        if (cuponParam && /^[A-Za-z0-9_-]{3,40}$/.test(cuponParam)) { try { localStorage.setItem('gm_cupon_pend', cuponParam.toUpperCase()); } catch {} }
        if (carritoParam) {
          try {
            let payload;
            // Restaurar base64url -> base64 (y + que algun cliente dejo como espacio), con padding
            const _b64 = carritoParam.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
            const _padded = _b64 + '='.repeat((4 - (_b64.length % 4)) % 4);
            try { payload = JSON.parse(decodeURIComponent(atob(_padded))); }
            catch { payload = JSON.parse(atob(_padded)); } // fallback sin encodeURIComponent
            const r = await cargarItemsCompartidos(payload, secs);
            const logueado = !!api.getToken();
            if (r.faltan.length && !logueado) {
              // Productos de tiendas con acceso (ej. mayorista): quedan guardados y se cargan al ingresar con la cuenta
              try { localStorage.setItem('gm_carrito_pend', JSON.stringify(r.faltan)); } catch {}
            }
            if (r.n) {
              setCart(prev => unirCarritos(prev, r.cart)); setPage('cart'); // se suma a lo que ya tenía (no lo reemplaza)
              toast(r.faltan.length ? `Carrito cargado. ${r.faltan.length === 1 ? 'Un producto es' : `${r.faltan.length} productos son`} de la lista mayorista: ${logueado ? 'pedí acceso mayorista para verlos' : 'ingresá con tu cuenta para verlos'}.` : 'Carrito cargado — revisá y continuá la compra', r.faltan.length ? 'warning' : 'success');
            } else if (r.faltan.length) {
              toast(logueado ? 'Este carrito es de la lista mayorista y tu cuenta todavía no tiene acceso.' : 'Este carrito es de la lista mayorista: ingresá con tu cuenta y se carga solo.', 'warning');
              if (!logueado) setPage('login');
            } else {
              toast('El carrito compartido no tiene productos disponibles', 'error');
            }
            window.history.replaceState({}, '', window.location.pathname);
          } catch (e) { toast('No se pudo cargar el carrito compartido', 'error'); }
        } else if (cuponParam) {
          try { window.history.replaceState({}, '', window.location.pathname); } catch {}
        }
        // Búsqueda compartida: ?buscar=TERM abre la página de resultados
        const buscarParam = new URLSearchParams(window.location.search).get('buscar');
        if (buscarParam && buscarParam.length >= 2 && !pedidoParam && !carritoParam) {
          setGlobalSearch(buscarParam);
          doGlobalSearch(buscarParam);
          setPage('search');
        }
        // Producto compartido: ?producto=ID abre el detalle directo
        const productoParam = new URLSearchParams(window.location.search).get('producto');
        if (productoParam && !pedidoParam && !carritoParam) {
          try {
            const prod = await api.getProducto(Number(productoParam));
            if (prod) {
              const sec = secs.find(s => s.id === prod.seccion_id);
              setSelectedProduct(prod);
              if (sec) setSeccionActual(sec);
              setPage('product');
            }
          } catch {}
        }
        // Ruta real (path): /producto/slug-ID, /{seccion}, /buscar/term
        if (!productoParam && !buscarParam && !pedidoParam && !carritoParam) {
          const r = parsePath(window.location.pathname, window.location.search, secs);
          if (r.page === 'product' && r.prodId) {
            try { const prod = await api.getProducto(r.prodId); if (prod) { setSelectedProduct(prod); const sec = secs.find(s => s.id === prod.seccion_id); if (sec) setSeccionActual(sec); setPage('product'); } else setPage('landing'); } catch { setPage('landing'); }
          } else if (r.page === 'section') {
            setSeccionActual(r.sec); setPage('section');
          } else if (r.page === 'search' && r.search) {
            setGlobalSearch(r.search); doGlobalSearch(r.search); setPage('search');
          }
        }
        const maint = await api.getMaintenanceStatus();
        if (maint.activo) {
          const me = api.getToken() ? await api.getMe().catch(() => null) : null;
          const esAdmin = me && ['admin','subadmin'].includes(me.rol);
          if (!esAdmin) setEnMantenimiento(true); // bloquea a TODO no-admin; el login del admin va DENTRO del bloque
        }
      } catch (e) { console.error('Init error:', e); }
      clearTimeout(seguro);
      setLoading(false);
    })();
  }, []);

  // Sincroniza login/logout entre pestañas: si el token cambia en otra pestaña, recarga esta para reflejarlo
  useEffect(() => {
    // Una renovación de sesión del mismo usuario no recarga (perdería lo que se está escribiendo): solo ingreso, salida o cambio de cuenta
    const idDe = (t) => { try { return JSON.parse(atob(String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id; } catch { return null; } };
    const onStorage = (e) => {
      if (e.key !== 'gm_token') return;
      if (e.oldValue && e.newValue && idDe(e.oldValue) != null && idDe(e.oldValue) === idDe(e.newValue)) { api.adoptarToken(e.newValue); return; }
      window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Nav helper
  const nav = useCallback((p, secId) => {
    // Guardar el scroll de la entrada actual (para restaurarlo al volver)
    try { window.history.replaceState({ ...(window.history.state || {}), scrollY: window.scrollY }, ''); } catch (e) {}
    let sec = seccionActual, prod = selectedProduct;
    if (p === 'product' && secId && typeof secId === 'object') {
      prod = secId; setSelectedProduct(secId);
      sec = seccionActual || secciones.find(s => s.id === secId.seccion_id) || null;
      if (sec) setSeccionActual(sec);
      setPage('product');
    } else if (p === 'section' && secId) {
      sec = secciones.find(s => s.id === Number(secId) || s.slug === secId) || null;
      setSeccionActual(sec); setPage('section');
    } else if (p === 'info') {
      setInfoSlug(secId || ''); setPage('info');
    } else if (p === 'categoria') {
      setCatSlug(secId || ''); setPage('categoria');
    } else {
      setPage(p);
    }
    try {
      const url = buildPath(p, { sec: (p === 'section' ? sec : seccionActual), prod: (p === 'product' ? prod : selectedProduct), search: globalSearch, info: (p === 'info' ? (secId || '') : infoSlug), cat: (p === 'categoria' ? (secId || '') : catSlug) });
      if ((window.location.pathname + window.location.search) !== url) window.history.pushState({ scrollY: 0 }, '', url);
    } catch (e) {}
    setMobileMenu(false); window.scrollTo(0, 0);
    // Después de pintar la página nueva, volver a subir (si no, a veces arrancaba un poco bajada, debajo de la cabecera)
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, 0)));
  }, [secciones, seccionActual, page, selectedProduct, globalSearch, infoSlug, catSlug]);
  // Carrito compartido con productos de tiendas con acceso (ej. mayorista): al ingresar con la cuenta se suman solos
  useEffect(() => {
    if (!user || !secciones.length) return;
    let pend; try { pend = JSON.parse(localStorage.getItem('gm_carrito_pend') || 'null'); } catch { pend = null; }
    if (!Array.isArray(pend) || !pend.length) return;
    try { localStorage.removeItem('gm_carrito_pend'); } catch {}
    cargarItemsCompartidos(pend, secciones).then(r => {
      if (!r.n) { toast('Tu cuenta todavía no tiene acceso a la lista mayorista de ese carrito. Pedí el acceso y volvé a abrir el link.', 'warning'); return; }
      setCart(prev => {
        const next = { ...prev };
        for (const [sid, its] of Object.entries(r.cart)) {
          const cur = Array.isArray(next[sid]) ? [...next[sid]] : [];
          for (const it of its) { const k = cur.findIndex(x => String(x.id) === String(it.id)); if (k >= 0) cur[k] = { ...cur[k], qty: Math.max(cur[k].qty || 0, it.qty) }; else cur.push(it); }
          next[sid] = cur;
        }
        return next;
      });
      nav('cart');
      toast(r.faltan.length ? `Se sumaron ${r.n} productos. ${r.faltan.length} no están disponibles para tu cuenta.` : 'Listo, se cargó el carrito que te compartieron', r.faltan.length ? 'warning' : 'success');
    }).catch(() => {});
  }, [user?.id, secciones.length]);
  // Refs para leer estado actual dentro del listener de popstate (que se registra una sola vez)
  const seccionesRef = useRef([]); seccionesRef.current = secciones;
  const selectedProductRef = useRef(null); selectedProductRef.current = selectedProduct;

  // Botón atrás/adelante del navegador: resuelve la URL a estado (sin salir del sitio)
  useEffect(() => {
    try { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'; } catch (e) {}
    const onPop = (e) => {
      const r = parsePath(window.location.pathname, window.location.search, seccionesRef.current);
      if (r.page === 'product') {
        if (r.prodId && selectedProductRef.current?.id === r.prodId) { setPage('product'); }
        else if (r.prodId) { api.getProducto(r.prodId).then(prod => { if (prod) { setSelectedProduct(prod); const sec = seccionesRef.current.find(s => s.id === prod.seccion_id); if (sec) setSeccionActual(sec); setPage('product'); } else setPage('landing'); }).catch(() => setPage('landing')); }
        else setPage('landing');
      } else if (r.page === 'section') {
        setSeccionActual(r.sec); setPage('section');
      } else if (r.page === 'search') {
        setSelectedProduct(null); setGlobalResults(null); setGlobalSearch(r.search); setPage('search');
      } else {
        if (r.page === 'info') setInfoSlug(r.info || '');
        if (r.page === 'categoria') setCatSlug(r.cat || '');
        setSelectedProduct(null); setPage(r.page || 'landing');
      }
      const y = (e.state && e.state.scrollY) || 0;
      let n = 0; const restore = () => { window.scrollTo(0, y); if (Math.abs(window.scrollY - y) > 3 && ++n < 40) setTimeout(restore, 50); };
      setTimeout(restore, 40);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Sincroniza la URL con el estado (URLs reales para SEO/compartir).
  // Las secciones manejan su propio ?pag aparte (ver SectionPage), por eso no las tocamos acá.
  useEffect(() => {
    if (loading) return;
    if (page === 'section') return; // SectionPage escribe su URL con paginación
    try {
      const url = buildPath(page, { sec: seccionActual, prod: selectedProduct, search: globalSearch, info: infoSlug, cat: catSlug });
      if ((window.location.pathname + window.location.search) !== url) window.history.replaceState({ ...(window.history.state || {}) }, '', url);
    } catch (e) {}
  }, [page, selectedProduct?.id, globalSearch, loading, infoSlug, catSlug]);

  // SEO: título, descripción, OG/Twitter, canonical y datos estructurados por página
  useEffect(() => {
    if (loading || typeof document === 'undefined') return;
    // Sitio de ComerciApp: su propia marca (antes mostraba la de la tienda principal)
    if (esRaizComerciApp() && (!user || user.es_owner)) {
      const t = page === 'crear-tienda' ? 'Creá tu tienda gratis | ComerciApp' : 'ComerciApp — Tu tienda online y tu sistema de ventas';
      const d = 'Tienda online, pedidos, punto de venta y control de stock en un solo lugar. Sin comisiones por venta. 15 días gratis, sin tarjeta.';
      const o = window.location.origin;
      document.title = t;
      upsertMeta('meta[name="description"]', 'name', 'description', d);
      upsertMeta('meta[property="og:title"]', 'property', 'og:title', t);
      upsertMeta('meta[property="og:description"]', 'property', 'og:description', d);
      upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
      upsertMeta('meta[property="og:url"]', 'property', 'og:url', o + '/');
      upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'ComerciApp');
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', o + '/og-comerciapp.jpg');
      upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
      upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', t);
      upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', d);
      upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', o + '/og-comerciapp.jpg');
      setCanonical(o + '/');
      setJsonLd(null);
      return;
    }
    if (page === 'categoria' || page === 'info') return; // esas páginas ponen su propio título al cargar
    const tienda = design.nombre_tienda || 'Tienda';
    const origin = window.location.origin;
    // canonical sin utm/fbclid: solo tienda (tiendas sin dominio) y página de la sección
    const url = origin + window.location.pathname + (() => { const k = keptQuery(); k.delete('preview'); const pg = new URLSearchParams(window.location.search).get('pag'); if (page === 'section' && pg && pg !== '1') k.set('pag', pg); const q = k.toString(); return q ? '?' + q : ''; })();
    let title = tienda;
    let desc = stripHtml(design.descripcion_tienda || config.meta_description) || `${tienda} — comprá online, envíos a todo el país.`;
    let image = design.og_image || design.logo_url || '';
    let type = 'website';
    let ld = null;
    if (page === 'product' && selectedProduct) {
      const p = selectedProduct;
      const nom = p.nombre || p.modelo || 'Producto';
      title = `${nom} | ${tienda}`;
      desc = resumenDesc(p.descripcion) || `${nom} — comprá en ${tienda}.`;
      image = p.imagen || image;
      type = 'product';
      // Mismo precio público que el servidor (render.js) y el feed de Google: oferta, promociones y preventa
      const pp = precioPublico(p, promosGlobal);
      const precio = (pp.moneda && pp.moneda !== 'ARS') ? 0 : (Number(pp.precio) || 0);
      // Sin precio en pesos no se declara como producto: Google marca error si un producto no tiene precio
      const prod = precio > 0 ? { '@type': 'Product', name: nom, description: desc } : null;
      if (prod) {
        if (image) prod.image = [image];
        if (p.sku) prod.sku = p.sku;
        if (p.marca) prod.brand = { '@type': 'Brand', name: p.marca };
        prod.offers = { '@type': 'Offer', price: precio, priceCurrency: 'ARS', availability: (p.stock > 0 || p.permitir_sin_stock || p.es_digital || p.usa_variantes) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url };
      }
      // Ruta Inicio > Categoría > Producto (Google la muestra en el resultado)
      const secP = secciones.find(s => String(s.id) === String(p.seccion_id));
      const migas = [{ '@type': 'ListItem', position: 1, name: tienda, item: origin + '/' }];
      if (p.categoria && slugify(p.categoria) && !secP?.requiere_aprobacion) migas.push({ '@type': 'ListItem', position: 2, name: p.categoria, item: `${origin}/categoria/${slugify(p.categoria)}` });
      migas.push({ '@type': 'ListItem', position: migas.length + 1, name: nom, item: url });
      ld = { '@context': 'https://schema.org', '@graph': [...(prod ? [prod] : []), { '@type': 'BreadcrumbList', itemListElement: migas }] };
    } else if (page === 'landing') {
      // Datos del negocio para Google (nombre, logo, contacto, dirección y redes)
      const negocio = { '@type': 'Store', '@id': origin + '/#negocio', name: tienda, url: origin + '/' };
      if (design.logo_url) { negocio.logo = design.logo_url; negocio.image = design.logo_url; }
      const tel = waIntl(design.whatsapp_numero); if (tel) negocio.telephone = '+' + tel;
      if (design.email_contacto) negocio.email = design.email_contacto;
      if (design.direccion) negocio.address = { '@type': 'PostalAddress', streetAddress: design.direccion, addressCountry: 'AR' };
      const redes = (redesSociales || []).filter(r => r.activo && /^https?:\/\//.test(r.url || '')).map(r => r.url); if (redes.length) negocio.sameAs = redes;
      ld = { '@context': 'https://schema.org', '@graph': [negocio, { '@type': 'WebSite', '@id': origin + '/#web', url: origin + '/', name: tienda, publisher: { '@id': origin + '/#negocio' } }] };
    } else if (page === 'section' && seccionActual) {
      title = `${seccionActual.nombre} | ${tienda}`;
      desc = `${seccionActual.nombre} — ${tienda}. Envíos a todo el país.`;
    } else if (page === 'search' && globalSearch) {
      title = `${globalSearch} | ${tienda}`;
      desc = `Resultados para "${globalSearch}" en ${tienda}.`;
    }
    document.title = title;
    upsertMeta('meta[name="description"]', 'name', 'description', desc);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', tienda);
    if (image) upsertMeta('meta[property="og:image"]', 'property', 'og:image', image);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
    if (image) upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
    setCanonical(url);
    setJsonLd(ld);
  }, [page, selectedProduct?.id, seccionActual?.id, globalSearch, design, config, loading, redesSociales, secciones, promosGlobal, user?.id, user?.es_owner]);

  // Favoritos (uno solo para toda la tienda: el corazón queda igual en todas las tarjetas)
  const [favIds, setFavIds] = useState(() => new Set());
  useEffect(() => { if (!user) { setFavIds(new Set()); return; } api.getFavoritos().then(fs => setFavIds(new Set((fs || []).map(f => f.producto_id)))).catch(() => {}); }, [user?.id]);
  const toggleFav = async (pid) => {
    if (!user) { toast('Ingresá a tu cuenta para guardar favoritos'); nav('login'); return; }
    const tenia = favIds.has(pid);
    setFavIds(prev => { const n = new Set(prev); if (tenia) n.delete(pid); else n.add(pid); return n; });
    try { if (tenia) await api.removeFavorito(pid); else await api.addFavorito(pid); }
    catch { setFavIds(prev => { const n = new Set(prev); if (tenia) n.add(pid); else n.delete(pid); return n; }); toast('No se pudo actualizar favoritos', 'error'); }
  };
  const [vistaRapida, setVistaRapida] = useState(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [avisoCarrito, setAvisoCarrito] = useState(null);

  // Cart helpers
  const cartForSection = (secId) => cart[secId] || [];
  const cartCount = secciones.reduce((s, sec) => {
    const items = Array.isArray(cart[sec.id]) ? cart[sec.id] : [];
    return s + items.reduce((sum, i) => sum + (i.qty > 0 ? i.qty : 0), 0);
  }, 0);
  const addToCart = (secId, product, qty = 1, precio, variante, opts = {}) => {
    // Producto con variantes: no se puede agregar sin elegir la combinación (evita items en $0)
    if (product?.usa_variantes && !variante) { toast('Elegí las opciones del producto primero', 'error'); nav('product', product); return; }
    // Priorizar la sección REAL del producto para que mínimos/envío/badges apliquen bien
    const realSec = product?.seccion_id ? String(product.seccion_id) : secId;
    const varLabel = variante ? (variante._label || (variante.combinacion && Object.keys(variante.combinacion).length ? Object.values(variante.combinacion).join(' / ') : `${variante.nombre ? variante.nombre + ': ' : ''}${variante.valor || ''}`.trim())) : '';
    const varMoneda = variante ? (variante.moneda || 'ARS') : 'ARS';
    setCart(prev => {
      const items = [...(prev[realSec] || [])];
      // Un mismo producto con distinta variante son líneas separadas del carrito
      const existing = items.find(i => i.id === product.id && (i.variante_id || null) === (variante?.id || null));
      const secS = secciones.find(x => String(x.id) === String(realSec));
      const sinTope = !!(variante || product.es_digital || product._preventa || product.es_preventa || product.permitir_sin_stock || secS?.ignorar_stock || secS?.permitir_sin_stock);
      const stockMax = sinTope ? Infinity : Number(product.stock ?? Infinity);
      if (existing) {
        const nuevaQty = existing.qty + qty;
        let q = nuevaQty;
        if (!sinTope && nuevaQty > stockMax) { q = Math.max(1, stockMax); toast(stockMax > 0 ? `Solo hay ${stockMax} en stock` : 'Sin stock disponible', 'warning'); }
        const idx = items.indexOf(existing);
        items[idx] = { ...existing, qty: q };
      }
      else {
        const qtyInicial = (!sinTope && qty > stockMax) ? Math.max(1, stockMax) : qty;
        items.push({ ...product, seccion_id: realSec, qty: qtyInicial, precio_unitario: precio || product.precio_base, variante_id: variante?.id || null, variante_label: varLabel, variante_moneda: varMoneda });
      }
      return { ...prev, [realSec]: items };
    });
    if (!opts.silencioso) setAvisoCarrito({ n: Date.now(), secId: realSec, nombre: (product.nombre || product.modelo || '') + (varLabel ? ` · ${varLabel}` : ''), imagen: (variante && variante.imagen) || product.imagen || '' });
    trackEvent('add_to_cart', 'AddToCart', { value: (precio || product.precio_base) * qty, currency: 'ARS', content_name: product.nombre || product.modelo });
  };
  const removeFromCart = (secId, productId, varId = null) => {
    setCart(prev => ({ ...prev, [secId]: (prev[secId] || []).filter(i => !(i.id === productId && (i.variante_id || null) === varId)) }));
  };
  const updateCartQty = (secId, productId, qty, varId = null) => {
    if (qty <= 0) return removeFromCart(secId, productId, varId);
    setCart(prev => ({ ...prev, [secId]: (prev[secId] || []).map(i => {
      if (!(i.id === productId && (i.variante_id || null) === varId)) return i;
      // Tope de stock: no dejar pasar del disponible (salvo variante/digital/preventa/sin-stock permitido)
      const secS = secciones.find(x => String(x.id) === String(secId));
      const sinTope = !!(i.variante_id || i.es_digital || i._preventa || i.es_preventa || i.permitir_sin_stock || secS?.ignorar_stock || secS?.permitir_sin_stock);
      const stockMax = sinTope ? Infinity : Number(i.stock ?? Infinity);
      if (!sinTope && qty > stockMax) {
        toast(stockMax > 0 ? `Solo hay ${stockMax} en stock` : 'Sin stock disponible', 'warning');
        return { ...i, qty: Math.max(1, stockMax) };
      }
      return { ...i, qty };
    }) }));
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
  const handleLogout = async () => {
    // Antes de salir se guarda en la cuenta lo último que cambió en el carrito
    const uid = user?.id;
    if (uid && cartSync.current.listo && cartSync.current.timer) { clearTimeout(cartSync.current.timer); cartSync.current.timer = null; await guardarCuenta(uid, cartRef.current); }
    api.logout(); setUser(null); nav('landing'); toast('Sesión cerrada');
  };

  // Price helper
  const getPrice = (base, lista, pid) => {
    if (!lista) return Number(base) || 0;
    const pfMap = {};
    preciosFijos.forEach(pf => { pfMap[`${pf.producto_id}_${pf.lista_precio_id}`] = pf.precio_fijo; });
    const k = `${pid}_${lista.id}`;
    if (pfMap[k] != null && pfMap[k] > 0) return Number(pfMap[k]);
    const mult = (Number(lista.multiplicador) > 0 && Number(lista.multiplicador) <= 10) ? Number(lista.multiplicador) : 1;
    return Math.round((Number(base) || 0) * mult * 100) / 100;
  };
  const userLista = useMemo(() => user?.lista_precio_id ? listas.find(l => l.id === user.lista_precio_id) : null, [user, listas]);
  // Al iniciar/cerrar sesión, traer los precios fijos de la lista del cliente (cada uno ve solo los suyos)
  const pfUserRef = useRef(undefined);
  useEffect(() => { if (pfUserRef.current === undefined) { pfUserRef.current = user?.id || null; return; } if (pfUserRef.current === (user?.id || null)) return; pfUserRef.current = user?.id || null; api.getPreciosFijos().then(pf => setPreciosFijos(Array.isArray(pf) ? pf : [])).catch(() => setPreciosFijos([])); }, [user?.id]);
  // ─── Precio que ve el cliente (MISMAS reglas que el servidor en checkout.js → lo que ve es lo que paga) ───
  const pfLookup = useMemo(() => { const m = {}; preciosFijos.forEach(pf => { m[`${pf.producto_id}_${pf.lista_precio_id}`] = Number(pf.precio_fijo); }); return m; }, [preciosFijos]);
  // 1) lista de precios del cliente (precio fijo o multiplicador)
  const precioLista = (p) => {
    const base = Number(p?.precio_base) || 0;
    if (!userLista) return base;
    const fijo = pfLookup[`${p?.producto_id ?? p?.id}_${userLista.id}`];
    if (fijo > 0) return fijo;
    const m = Number(userLista.multiplicador);
    return Math.round(base * (m > 0 && m <= 10 ? m : 1) * 100) / 100;
  };
  // 2) + oferta del producto si es menor
  const precioEfectivo = (p) => { const pl = precioLista(p); const of = Number(p?.precio_oferta) || 0; return of > 0 && of < pl ? of : pl; };
  // 3) descuento de revendedor (solo tienda dropshipping) o la mejor promo. Misma forma que aplicarPromo().
  const ajusteCliente = (precio, p, promosList, secId, moneda = 'ARS', esVariante = false) => {
    const sid = p?.seccion_id ?? secId;
    const realSec = secciones.find(x => String(x.id) === String(sid));
    const d = Number(user?.descuento_revendedor) || 0;
    if (!esVariante && (!moneda || moneda === 'ARS') && realSec?.slug === 'dropshipping' && user?.es_revendedor && d > 0 && precio > 0) {
      return { final: Math.round(precio * (1 - d / 100)), original: precio, pct: Math.round(d), nombre: 'Precio revendedor', esRevendedor: true };
    }
    return aplicarPromo(precio, p, promosList, secId ?? p?.seccion_id, moneda);
  };
  // Precio final de una tarjeta de producto (sin variantes)
  const precioFinalCliente = (p, promosList, secId) => { const e = precioEfectivo(p); const a = ajusteCliente(e, p, promosList, secId); return a ? a.final : e; };

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
    seccionActual, setSeccionActual, selectedProduct, setSelectedProduct, infoSlug, catSlug, cart, setCart, menuItems, setMenuItems,
    redesSociales, setRedesSociales, badges, setBadges, barras, setBarras, listas, setListas,
    preciosFijos, setPreciosFijos, miPlan, setMiPlan, adminTab, setAdminTab, adminSeccion, setAdminSeccion,
    cartForSection, cartCount, addToCart, removeFromCart, updateCartQty, clearCart,
    favIds, toggleFav, vistaRapida, setVistaRapida, carritoAbierto, setCarritoAbierto, avisoCarrito, setAvisoCarrito,
    handleLogin, handleLogout, getPrice, userLista, isAdmin, nav, fmt, fmtARS, openWA,
    precioLista, precioEfectivo, ajusteCliente, precioFinalCliente,
    testMode, setTestMode: (v) => { setTestMode(v); localStorage.setItem('gm_test', v); },
    globalSearch, setGlobalSearch, globalResults, setGlobalResults, doGlobalSearch,
    notifyProduct, setNotifyProduct, promos: promosGlobal
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(var(--app-vh, 1vh) * 100)' }}><div className="spinner" /></div>;
  // Modo mantenimiento: si está activo y NO sos admin, se bloquea TODA la tienda (no se puede escapar navegando).
  // Se renderiza ANTES del Ctx.Provider, así que usa una versión autocontenida (sin useContext).
  if (enMantenimiento) return <MaintenanceBlock effectiveDark={effectiveDark} config={config} design={design} />;

  // Route
  const tiendaSuspendida = ['suspendido', 'vencido'].includes(miPlan?.estado) && !user?.es_owner;
  const renderPage = () => {
    if (tiendaSuspendida && !(['login', 'forgot'].includes(page) || (page === 'admin' && isAdmin))) return <TiendaNoDisponible />;
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
      case 'categoria': return <CategoriaPage />;
      case 'contacto': return <ContactoPage />;
      case 'arrepentimiento': return <ArrepentimientoPage />;
      case 'favoritos': return user ? <FavoritosPage /> : <LoginPage />;
      case 'search': return <SearchResultsPage />;
      case 'maintenance': return <MaintenancePage />;
      default: return <Landing />;
    }
  };

  return (
    <Ctx.Provider value={ctx}>
      {showComerciappSite ? (
        <div className={`app${effectiveDark ? ' dark' : ''}`}>
          <ErrorBoundary key={page}><Suspense fallback={<CargandoPanel />}>{esOwner
            ? <PanelPlataforma onLogout={handleLogout} />
            : page === 'crear-tienda'
              ? <CrearTiendaPage onListo={() => nav('login')} onVolver={() => nav('landing')} />
              : (page === 'login' || page === 'forgot')
                ? <ComerciappLoginPage forgot={page === 'forgot'} onVolver={() => nav('landing')} onForgot={() => nav('forgot')} onLogin={() => nav('login')} />
                : <ComerciappLanding onLogin={() => nav('login')} onRegister={() => nav('crear-tienda')} />}</Suspense></ErrorBoundary>
          <ToastContainer />
        </div>
      ) : (
      <div className={`app${effectiveDark ? ' dark' : ''}`}>
        <Header />
        {page !== 'admin' && <><MiniCarrito /><AvisoCarrito /></>}
        {vistaRapida && <VistaRapida producto={vistaRapida} onClose={() => setVistaRapida(null)} />}
        <main className="main-content"><ErrorBoundary key={page}><Suspense fallback={<CargandoPanel />}>{renderPage()}</Suspense></ErrorBoundary></main>
        {/* En el panel no van el pie de la tienda ni el WhatsApp de clientes (tapaban botones) */}
        {page !== 'admin' && <Footer />}
        {page !== 'admin' && <WhatsAppFloat />}
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
  const { globalSearch, setGlobalSearch, doGlobalSearch, globalResults, setGlobalResults, nav, secciones, getPrice, userLista, precioFinalCliente, promos, page, selectedProduct, seccionActual } = useContext(Ctx);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  // Al cambiar de página, el desplegable se cierra (antes quedaba abierto tapando la página nueva)
  useEffect(() => { setOpen(false); }, [page, selectedProduct?.id, seccionActual?.id]);

  // cerrar dropdown al click fuera
  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // debounce
  useEffect(() => {
    if (globalSearch.length < 2) { setGlobalResults(null); return; }
    const t = setTimeout(() => { doGlobalSearch(globalSearch); if (document.activeElement === inputRef.current) setOpen(true); }, 350);
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
      <input ref={inputRef} className="header-search-input" placeholder="Buscar repuestos, herramientas…" aria-label="Buscar productos" value={globalSearch}
        onChange={e => setGlobalSearch(e.target.value)}
        onFocus={() => { if (flat.length) setOpen(true); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doGlobalSearch(); setOpen(false); nav('search'); } if (e.key === 'Escape') setOpen(false); }} />
      {globalSearch && <button className="header-search-clear" onClick={() => { setGlobalSearch(''); setGlobalResults(null); setOpen(false); }}>✕</button>}

      {open && globalSearch.length >= 2 && (
        <div className="search-dropdown">
          {flat.length === 0 ? (
            <div className="search-dd-empty">Sin resultados para "{globalSearch}"</div>
          ) : (
            <>
              {flat.map(p => (
                <button key={`${p.secId}-${p.id}`} className="search-dd-item" onClick={() => goProduct(p)}>
                  {p.imagen ? <img src={imgOpt(p.imagen, 96)} alt="" /> : <div className="search-dd-noimg"><Ico n="cart" s={18} /></div>}
                  <div className="search-dd-info">
                    <div className="search-dd-name">{p.nombre || p.modelo}</div>
                    <div className="search-dd-sec">{p.secNombre}</div>
                  </div>
                  {(() => { const _pr = precioFinalCliente(p, promos, p.secId); return _pr > 0 ? <div className="search-dd-price">{fmtARS(_pr)}</div> : null; })()}
                </button>
              ))}
              <button className="search-dd-all" onClick={() => { doGlobalSearch(); setOpen(false); nav('search'); }}>Ver todos los resultados →</button>
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
  const { user, nav, page, dark, setDark, cartCount, isAdmin, handleLogout, design, menuItems, testMode, setTestMode, badges, barras, secciones, globalSearch, setGlobalSearch, doGlobalSearch, seccionActual, setCarritoAbierto } = useContext(Ctx);
  // El ícono del carrito salta cada vez que se suma un producto
  const cartPrev = useRef(cartCount); const [cartSalta, setCartSalta] = useState(false);
  useEffect(() => { if (cartCount > cartPrev.current) { setCartSalta(false); requestAnimationFrame(() => setCartSalta(true)); const t = setTimeout(() => setCartSalta(false), 650); cartPrev.current = cartCount; return () => clearTimeout(t); } cartPrev.current = cartCount; }, [cartCount]);
  const [mobMenu, setMobMenu] = useState(false);
  const showSearch = !['admin','login','register','forgot','maintenance'].includes(page);
  const barrasTop = (barras || []).filter(b => b.activo && b.posicion === 'top');
  const barrasSearch = (barras || []).filter(b => b.activo && b.posicion === 'search');
  // Menú de tiendas: avisar con un difuminado cuando hay más para deslizar
  const secnavRef = useRef(null);
  const [secnavFade, setSecnavFade] = useState({ izq: false, der: false });
  const medirSecnav = () => { const el = secnavRef.current; if (!el) return; setSecnavFade({ izq: el.scrollLeft > 4, der: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }); };
  useEffect(() => { medirSecnav(); window.addEventListener('resize', medirSecnav); return () => window.removeEventListener('resize', medirSecnav); }, [secciones.length, showSearch]);

  return (
    <>
    {showSearch && barrasTop.length > 0 && (
      <div className="header-topbars">
        {barrasTop.map(b => <TextBar key={b.id} barra={b} />)}
      </div>
    )}
    <header className="header">

      {/* ROW 1: logo + buscador + actions */}
      <div className="header-inner">
        <button className="header-logo" onClick={() => nav('landing')}>
          {design.logo_url ? <img src={imgOpt(design.logo_url, 400)} alt={design.nombre_tienda || 'Inicio'} className="header-logo-img" /> : <span style={{ background: 'var(--primary)', color: 'var(--on-primary, #fff)', padding: '8px 15px', borderRadius: 10, fontSize: 19, fontWeight: 900, letterSpacing: '-0.04em' }}>K</span>}
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
          <button className={`icon-btn cart-btn${cartSalta ? ' salta' : ''}`} onClick={() => { if (page === 'cart') return; setCarritoAbierto(true); }} style={{ position: 'relative' }} aria-label={`Carrito${cartCount ? `, ${cartCount} productos` : ''}`}>
            <Ico n="cart" /> {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          {user ? (
            <>
              {isAdmin && <button className="btn btn-sm btn-primary desktop-only" onClick={() => nav('admin')}>PANEL</button>}
              <button className="btn btn-sm btn-outline desktop-only" onClick={() => nav('account')}>MI CUENTA</button>
              <button className="btn btn-sm btn-outline desktop-only" onClick={handleLogout}>SALIR</button>
            </>
          ) : (
            <button className="btn btn-sm btn-warning desktop-only" onClick={() => nav('login')} style={{ background: 'var(--accent)', color: 'var(--on-accent)', borderColor: 'var(--accent)', fontWeight: 800 }}>INGRESAR</button>
          )}
          <button className="hamburger mobile-only" onClick={() => setMobMenu(!mobMenu)}><Ico n="menu" s={20} /></button>
        </div>
      </div>

      {/* BARRA BAJO EL BUSCADOR (solo compu; en celular va unida arriba) */}
      {showSearch && barrasSearch.length > 0 && <div className="desktop-block">{barrasSearch.map(b => <TextBar key={b.id} barra={b} />)}</div>}

      {/* NAV SECCIONES (fijo, scrolleable en mobile) */}
      {showSearch && secciones.length > 0 && (
        <div className={`secnav-wrap${secnavFade.izq ? ' fade-izq' : ''}${secnavFade.der ? ' fade-der' : ''}`}>
        <nav className="header-secnav" ref={secnavRef} onScroll={medirSecnav}>
          <button className={`secnav-item${page === 'landing' ? ' active' : ''}`} onClick={() => nav('landing')}>Inicio</button>
          {secciones.map(s => (
            <button key={s.id} className={`secnav-item${(page === 'section' || page === 'product') && seccionActual?.id === s.id ? ' active' : ''}`} onClick={() => nav('section', s.id)} style={{ '--sec-color': s.color || 'var(--primary)' }}>
              {s.nombre}{s.requiere_aprobacion && !(user && (user.mayorista || isAdmin)) ? <Lock size={12} style={{ marginLeft: 4, verticalAlign: '-1px' }} /> : null}
            </button>
          ))}
        </nav>
        </div>
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
          {menuItems.map(m => <a key={m.id} href={urlSegura(m.url) || '#'} style={{ color: 'var(--text)', fontWeight: 600, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em' }} onClick={() => setMobMenu(false)}>{m.titulo}</a>)}
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
    {/* Celular: la segunda barra va debajo del menú de tiendas y se va al bajar (no ocupa lugar fijo) */}
    {showSearch && barrasSearch.length > 0 && <div className="mobile-block header-afterbars">{barrasSearch.map(b => <TextBar key={b.id} barra={b} />)}</div>}
    </>
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
  const [catsFooter, setCatsFooter] = useState([]);
  useEffect(() => { api.getCategoriasInfo().then(c => setCatsFooter((c || []).slice(0, 8))).catch(() => {}); }, []);
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
          {/* Categorías */}
          {catsFooter.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Categorías</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {catsFooter.map(c => <a key={c.slug} href={`/categoria/${c.slug}`} onClick={e => { e.preventDefault(); nav('categoria', c.slug); }} style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{c.titulo}</a>)}
              </div>
            </div>
          )}
          {/* Info / páginas */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Información</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {infoPags.map(p => <a key={p.id} href={`/info/${slugPagina(p)}`} onClick={e => { e.preventDefault(); nav('info', slugPagina(p)); }} style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{p.titulo}</a>)}
              {/* Obligatorio (Res. 424/2020): el texto tiene que ser "Botón de arrepentimiento" */}
              <a href="/arrepentimiento" onClick={e => { e.preventDefault(); nav('arrepentimiento'); }} className="link-arrepentimiento" style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>Botón de arrepentimiento</a>
            </div>
          </div>
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
          <div className={`footer-contacto${design.direccion ? ' con-mapa' : ''}`} style={{ display: 'grid', gap: 20, alignItems: 'center', paddingTop: 24, marginTop: 4, borderTop: '1px solid var(--border)', marginBottom: 8 }}>
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
            {activas.map(r => <a key={r.id || r.tipo} href={urlSegura(r.url) || undefined} target="_blank" rel="noopener" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}><RedIcon tipo={redIconTipo(r.tipo)} s={16} /> <span>{RED_LABELS[r.tipo] || r.tipo.replace(/_/g, ' ')}</span></a>)}
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
            <button className={`btn ${canal === 'whatsapp' ? 'btn-success' : 'btn-outline'}`} onClick={() => setCanal('whatsapp')} style={{ flex: 1 }}><Smartphone size={15} style={{ verticalAlign: '-2px' }} /> WhatsApp</button>
            <button className={`btn ${canal === 'email' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCanal('email')} style={{ flex: 1 }}><Mail size={15} style={{ verticalAlign: '-2px' }} /> Email</button>
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
  const wa = waIntl(config?.whatsapp || design?.whatsapp_numero || '');
  const wrap = { minHeight: 'calc(var(--app-vh, 1vh) * 100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', background: 'var(--bg, #111)' };
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
      <div style={{ fontSize: 52, marginBottom: 8 }}><Wrench size={44} style={{ verticalAlign: '-2px' }} /></div>
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
  const wa = waIntl(config?.whatsapp || design?.whatsapp_numero || '');
  return (
    <div style={{ minHeight: 'calc(var(--app-vh, 1vh) * 100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', background: 'var(--bg)' }}>
      {logo ? <img src={logo} alt={nombre} style={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 16, marginBottom: 16 }} /> : null}
      <div style={{ fontSize: 52, marginBottom: 8 }}><Wrench size={44} style={{ verticalAlign: '-2px' }} /></div>
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
              <a key={r.id} href={urlSegura(r.url) || undefined} target="_blank" rel="noopener" className="btn btn-outline" style={{ justifyContent: 'center', gap: 8 }}>
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

// ─── PÁGINA DE CATEGORÍA (/categoria/<slug>): para que Google encuentre "microscopios", "estaciones de soldado"... ───
function CategoriaPage() {
  const { nav, catSlug, design } = useContext(Ctx);
  const [cats, setCats] = useState(null);
  const [prods, setProds] = useState(null);
  const cat = cats ? cats.find(c => c.slug === catSlug) : null;
  useEffect(() => { api.getCategoriasInfo().then(setCats).catch(() => setCats([])); }, []);
  useEffect(() => {
    if (!cat) return;
    setProds(null);
    Promise.all(cat.nombres.map(n => api.getProductos({ categoria: n, limit: 300 }).then(r => (r && r.productos) || []).catch(() => [])))
      .then(ls => {
        const todos = ls.flat();
        // primero los que tienen stock, después por nombre
        const conStock = (p) => (Number(p.stock) > 0 || p.permitir_sin_stock || p.es_digital) ? 0 : 1;
        todos.sort((a, b) => conStock(a) - conStock(b) || String(a.nombre || '').localeCompare(String(b.nombre || '')));
        setProds(todos);
      });
  }, [cat?.slug]);
  // Título, descripción y datos para Google
  useEffect(() => {
    if (!cat) return;
    const tienda = design.nombre_tienda || 'Tienda';
    const url = window.location.origin + '/categoria/' + cat.slug;
    document.title = `${cat.titulo} | ${tienda}`;
    const desc = resumenDesc(cat.descripcion) || `${cat.titulo}: ${cat.productos} productos en ${tienda}. Envíos a todo el país.`;
    upsertMeta('meta[name="description"]', 'name', 'description', desc);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', document.title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setCanonical(url);
    setJsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: tienda, item: window.location.origin + '/' },
      { '@type': 'ListItem', position: 2, name: cat.titulo, item: url },
    ] });
  }, [cat?.slug, cat?.titulo, design.nombre_tienda]);

  if (cats && !cat) return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 16px' }}>
      <div className="empty-state"><h3>No encontramos esa categoría</h3><button className="btn btn-primary" onClick={() => nav('landing')}>Ir al inicio</button></div>
    </div>
  );
  const otras = (cats || []).filter(c => c.slug !== catSlug).slice(0, 12);
  return (
    <div className="cat-page" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
      <nav className="cat-migas" aria-label="Ruta">
        <a href="/" onClick={e => { e.preventDefault(); nav('landing'); }}>Inicio</a><span>/</span><span>{cat ? cat.titulo : ''}</span>
      </nav>
      <h1 className="cat-h1">{cat ? cat.titulo : ''}</h1>
      {cat?.descripcion && <p className="cat-intro">{cat.descripcion}</p>}
      {!prods ? <div className="spinner" /> : prods.length === 0 ? (
        <div className="empty-state"><h3>Sin productos por ahora</h3></div>
      ) : (
        <>
          <p className="cat-cant">{prods.length} producto{prods.length !== 1 ? 's' : ''}</p>
          <div className="product-grid">{prods.map(p => <TarjetaProducto key={p.id} p={p} secId={p.seccion_id} />)}</div>
        </>
      )}
      {otras.length > 0 && (
        <div className="cat-otras">
          <h2>Otras categorías</h2>
          <div>{otras.map(c => <a key={c.slug} href={`/categoria/${c.slug}`} onClick={e => { e.preventDefault(); nav('categoria', c.slug); }}>{c.titulo}</a>)}</div>
        </div>
      )}
    </div>
  );
}

function InfoPage() {
  const { nav, infoSlug, design } = useContext(Ctx);
  const [paginas, setPaginas] = useState([]);
  useEffect(() => { api.getPaginas().then(p => setPaginas(Array.isArray(p) ? p : [])).catch(() => {}); }, []);
  // La página activa sale de la URL (/info/<slug>); sin slug, la primera
  const active = paginas.find(p => slugPagina(p) === infoSlug) || (infoSlug ? null : paginas[0]) || null;
  const setActive = (p) => nav('info', slugPagina(p));
  // Título y descripción para Google de esta página
  useEffect(() => {
    if (!active) return;
    const tienda = design.nombre_tienda || 'Tienda';
    document.title = `${active.titulo} | ${tienda}`;
    upsertMeta('meta[name="description"]', 'name', 'description', resumenDesc(active.contenido) || active.titulo);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', document.title);
    setCanonical(window.location.origin + '/info/' + slugPagina(active));
    setJsonLd(null);
  }, [active?.id]);
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
// TARJETA DE PRODUCTO — una sola para toda la tienda (inicio, tiendas, búsqueda, favoritos, relacionados)
// Precio con las mismas reglas que el carrito: lista del cliente → oferta → promo / revendedor.
// ═══════════════════════════════════════════════════════════
function precioTarjeta(p, ctx, secId) {
  const { precioLista, precioEfectivo, ajusteCliente, promos } = ctx;
  const lista = precioLista(p);
  const efectivo = precioEfectivo(p);
  const a = ajusteCliente(efectivo, p, promos, p.seccion_id || secId, p.moneda || 'ARS');
  const final = a ? a.final : efectivo;
  const original = Math.max(lista, a ? a.original : 0);
  const hay = !p.es_preventa && final > 0 && original > final;
  return { final, original: hay ? original : null, pct: hay ? Math.round((1 - final / original) * 100) : 0, ahorro: hay ? original - final : 0, promo: a && !a.esRevendedor ? a.nombre : '', hasta: a?.hasta || null, esRevendedor: !!a?.esRevendedor };
}
// "desde" de un producto con variantes en la tarjeta, con la promo aplicada (igual que la ficha y lo que lee Google)
function desdeTarjeta(p, ctx, secId) {
  const base = Number(p.precio_desde) || 0;
  if (!(base > 0)) return 0;
  const a = ctx.ajusteCliente(base, p, ctx.promos, p.seccion_id || secId, p.moneda_desde || 'ARS', true);
  return a ? a.final : base;
}
// Milisegundos que faltan para que termine una promo (solo si termina dentro de 7 días)
const finPromoMs = (hasta, dias = 7) => {
  if (!hasta) return null;
  const [y, m, d] = String(hasta).slice(0, 10).split('-').map(Number);
  if (!y) return null;
  const ms = new Date(y, m - 1, d, 23, 59, 59) - Date.now();
  return ms > 0 && ms <= dias * 86400000 ? ms : null;
};
const textoRestante = (ms) => { const h = Math.floor(ms / 3600000); if (h >= 48) return `Termina en ${Math.floor(h / 24)} días`; if (h >= 1) return `Termina en ${h} h`; return `Termina en ${Math.max(1, Math.floor(ms / 60000))} min`; };
// Cuenta regresiva en vivo (ficha y vista rápida)
function CuentaRegresiva({ hasta, prefijo = 'La promo termina en' }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = finPromoMs(hasta, 30); if (!ms) return null;
  void ahora;
  const tot = Math.floor(ms / 1000); const d = Math.floor(tot / 86400); const h = Math.floor((tot % 86400) / 3600); const mi = Math.floor((tot % 3600) / 60); const se = tot % 60;
  const dd = (n) => String(n).padStart(2, '0');
  return <div className="cuenta-regresiva"><Clock size={14} /> {prefijo} <b>{d > 0 ? `${d}d ` : ''}{dd(h)}:{dd(mi)}:{dd(se)}</b></div>;
}
// La foto "vuela" al carrito al agregar (se saltea si el usuario pidió menos movimiento)
function volarAlCarrito(imgEl) {
  try {
    if (!imgEl || !imgEl.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const destino = document.querySelector('.cart-btn'); if (!destino) return;
    const a = imgEl.getBoundingClientRect(); const b = destino.getBoundingClientRect();
    if (!a.width || b.bottom < 0 || b.top > window.innerHeight) return;
    const c = imgEl.cloneNode(); c.removeAttribute('srcset'); c.removeAttribute('class');
    Object.assign(c.style, { position: 'fixed', left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', zIndex: 9999, pointerEvents: 'none', borderRadius: '14px', objectFit: 'cover', boxShadow: '0 10px 30px rgba(0,0,0,.35)' });
    document.body.appendChild(c);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2); const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const an = c.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 40}px) scale(.45)`, opacity: .9, offset: .55 }, { transform: `translate(${dx}px, ${dy}px) scale(.06)`, opacity: .3 }], { duration: 700, easing: 'cubic-bezier(.45,0,.55,1)' });
    an.onfinish = () => c.remove();
  } catch {}
}
// Carrusel horizontal: flechas en compu, arrastre con el mouse, deslizar en celu y bordes que indican que hay más.
function Carrusel({ children, className = '' }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const movido = useRef(false);
  const [pos, setPos] = useState({ ini: true, fin: true });
  const medir = useCallback(() => {
    const el = ref.current; if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPos({ ini: el.scrollLeft <= 4, fin: el.scrollLeft >= max - 4 });
  }, []);
  const cant = Array.isArray(children) ? children.length : 1;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    let ro = null; try { ro = new ResizeObserver(medir); ro.observe(el); } catch {}
    return () => { el.removeEventListener('scroll', medir); if (ro) ro.disconnect(); };
  }, [medir, cant]);
  const mover = (dir) => { const el = ref.current; if (el) el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 200), behavior: 'smooth' }); };
  const abajo = (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag.current = { x: e.clientX, sl: ref.current.scrollLeft }; movido.current = false; };
  const mueve = (e) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x;
    if (!movido.current && Math.abs(dx) > 6) { movido.current = true; ref.current.classList.add('arrastrando'); }
    if (movido.current) ref.current.scrollLeft = d.sl - dx;
  };
  const suelta = () => { if (!drag.current) return; drag.current = null; ref.current?.classList.remove('arrastrando'); };
  return (
    <div className={`carrusel${pos.ini ? ' al-inicio' : ''}${pos.fin ? ' al-final' : ''}`}>
      <button type="button" className="carrusel-flecha izq" onClick={() => mover(-1)} aria-label="Ver anteriores" tabIndex={pos.ini ? -1 : 0}><ChevronLeft size={22} /></button>
      <div ref={ref} className={`carousel-track ${className}`.trim()}
        onPointerDown={abajo} onPointerMove={mueve} onPointerUp={suelta} onPointerLeave={suelta}
        onClickCapture={e => { if (movido.current) { e.stopPropagation(); e.preventDefault(); movido.current = false; } }}
        onDragStart={e => e.preventDefault()}>
        {children}
      </div>
      <button type="button" className="carrusel-flecha der" onClick={() => mover(1)} aria-label="Ver más" tabIndex={pos.fin ? -1 : 0}><ChevronRight size={22} /></button>
    </div>
  );
}

function TarjetaProducto({ p, secId, usd }) {
  const ctx = useContext(Ctx);
  const { nav, addToCart, updateCartQty, cart, config, setNotifyProduct, favIds, toggleFav, setVistaRapida } = ctx;
  const imgRef = useRef(null);
  const sid = p.seccion_id || secId;
  const pr = precioTarjeta(p, ctx, sid);
  const stock = Number(p.stock) || 0;
  const sinStock = stock <= 0;
  const secT = (ctx.secciones || []).find(x => String(x.id) === String(sid));
  const puedeComprar = !sinStock || p.permitir_sin_stock || p.es_digital || p.usa_variantes || secT?.ignorar_stock || secT?.permitir_sin_stock;
  const agotado = sinStock && !puedeComprar && !p.es_preventa;
  const umbral = Number(config?.[`envio_gratis_desde_${sid}`]) || 0;
  const envioGratis = !p.es_digital && (p.envio_gratis || (umbral > 0 && pr.final >= umbral));
  const esNuevo = p.created_at && (Date.now() - new Date(p.created_at).getTime()) < 15 * 86400000;
  const linea = (!p.usa_variantes && !p.es_preventa) ? ((cart && cart[sid]) || []).find(i => i.id === p.id && !i.variante_id && !i._preventa) : null;
  const fmtP = (v) => (p.moneda && p.moneda !== 'ARS') ? fmtMon(v, p.moneda) : fmtARS(v);
  const ver = () => { window.__secId = sid; nav('product', { ...p, seccion_id: sid }); };
  const agregar = (e) => { e.stopPropagation(); volarAlCarrito(imgRef.current); addToCart(sid, p, 1, pr.final); };
  const restante = finPromoMs(pr.hasta);
  const ultimas = !sinStock && stock <= 3 && !p.permitir_sin_stock && !p.es_digital && !p.usa_variantes;
  const pctPv = Number(p.preventa_descuento_pct) || 0;
  const reserva = pctPv > 0 ? Math.round(Number(p.precio_base) * (1 - pctPv / 100)) : Number(p.precio_base);
  const cupoPv = Number(p.preventa_cupo) || 0; const reservadoPv = Number(p.preventa_reservado) || 0;
  const reservar = (e) => {
    e.stopPropagation();
    const fechaTxt = p.preventa_mostrar_fecha && p.preventa_fecha ? `\n\nFecha aproximada de ingreso: ${new Date(p.preventa_fecha).toLocaleDateString('es-AR')} (es estimada, puede variar).` : '\n\nEs un producto con demora: te avisamos apenas ingrese.';
    if (!confirm(`Estás RESERVANDO un producto en preventa.${fechaTxt}\n\nNo es un producto disponible para entrega inmediata. ¿Querés reservarlo igual?`)) return;
    addToCart(sid, { ...p, _preventa: true, _precioReserva: reserva }, 1, reserva);
  };
  const esFav = favIds && favIds.has(p.id);
  return (
    <div className={`product-card tp${agotado ? ' sin-stock' : ''}${p.imagen2 ? ' con-2da' : ''}`}>
      <div className="product-img-wrap tp-media" onClick={ver}>
        {p.imagen ? <>
          <img ref={imgRef} src={imgOpt(p.imagen, 400)} srcSet={imgSet(p.imagen, 400)} alt={p.nombre || p.modelo || ''} className="product-img tp-img" loading="lazy" decoding="async" />
          {p.imagen2 && <img src={imgOpt(p.imagen2, 400)} srcSet={imgSet(p.imagen2, 400)} alt="" aria-hidden="true" className="product-img tp-img2" loading="lazy" decoding="async" />}
        </> : <div className="tp-noimg"><Package size={40} /></div>}
        <div className="product-badges">
          {pr.pct > 0 && <span className="pbadge pbadge-discount">{pr.pct}% OFF</span>}
          {p.es_preventa && <span className="pbadge pbadge-preventa">Preventa</span>}
          {envioGratis && <span className="pbadge pbadge-envio"><Truck size={10} strokeWidth={2.5} /> Gratis</span>}
          {esNuevo && !pr.pct && !p.es_preventa && <span className="pbadge pbadge-nuevo">Nuevo</span>}
        </div>
        {agotado && <div className="sin-stock-overlay">SIN STOCK</div>}
        <button type="button" className="tp-quick" onClick={e => { e.stopPropagation(); setVistaRapida({ ...p, seccion_id: sid }); }} aria-label="Vista rápida"><Eye size={15} /><span>Vista rápida</span></button>
      </div>
      <button type="button" className={`card-fav${esFav ? ' active' : ''}`} onClick={e => { e.stopPropagation(); toggleFav(p.id); }} aria-label={esFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}><Ico n="heart" s={16} fill={esFav} /></button>
      <div className="product-info tp-info">
        <div className="product-cat">{p.categoria || ''}</div>
        <div className="product-name tp-name" onClick={ver}>{p.nombre || p.modelo}</div>
        <div className="tp-precio">
          {p.es_preventa ? (pctPv > 0
            ? <><span className="price-old">{fmtP(p.precio_base)}</span><span className="price-new con-desc">{fmtP(reserva)}</span></>
            : <span className="price-new">{fmtP(reserva)}</span>)
          : p.usa_variantes && Number(p.precio_desde) > 0 ? <span className="price-new"><small>desde </small>{fmtMon(desdeTarjeta(p, ctx, sid), p.moneda_desde || 'ARS')}</span>
          : pr.final > 0 ? <>{pr.original && <span className="price-old">{fmtP(pr.original)}</span>}<span className={`price-new${pr.original ? ' con-desc' : ''}`}>{fmtP(pr.final)}</span></>
          : <span className="tp-consultar">Consultar precio</span>}
        </div>
        {(pr.ahorro > 0 || restante || ultimas || (usd && pr.final > 0) || (p.es_preventa && p.preventa_mostrar_fecha && p.preventa_fecha)) && (
          <div className="tp-extra">
            {pr.ahorro > 0 && <span className="tp-ahorro">{pr.esRevendedor ? 'Revendedor · ' : ''}Ahorrás {fmtP(pr.ahorro)}</span>}
            {restante && <span className="tp-reloj"><Clock size={11} /> {textoRestante(restante)}</span>}
            {ultimas && <span className="tp-ultimas">{stock === 1 ? 'Última unidad' : `Últimas ${stock} unidades`}</span>}
            {p.es_preventa && p.preventa_mostrar_fecha && p.preventa_fecha && <span className="tp-reloj">Llega {new Date(p.preventa_fecha).toLocaleDateString('es-AR')}</span>}
            {usd && pr.final > 0 && <span className="tp-usd">{fmtUSD(pr.final / usd)}</span>}
          </div>
        )}
        <div className="tp-accion">
          {p.es_preventa ? (cupoPv > 0 && reservadoPv >= cupoPv
            ? <button type="button" className="btn product-add-btn tp-btn" disabled>Preventa agotada</button>
            : <button type="button" className="btn product-add-btn tp-btn tp-btn-reserva" onClick={reservar}>Reservar</button>)
          : agotado ? <button type="button" className="btn btn-outline tp-btn tp-btn-aviso" onClick={e => { e.stopPropagation(); setNotifyProduct(p); }}><Bell size={14} /> Avisame</button>
          : p.usa_variantes ? <button type="button" className="btn product-add-btn tp-btn" onClick={e => { e.stopPropagation(); ver(); }}>Ver opciones</button>
          : linea ? (
            <div className="tp-stepper" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => updateCartQty(sid, p.id, linea.qty - 1)} aria-label={linea.qty === 1 ? 'Quitar del carrito' : 'Uno menos'}>{linea.qty === 1 ? <Trash2 size={15} /> : <Minus size={16} />}</button>
              <span aria-live="polite"><b>{linea.qty}</b><small> en carrito</small></span>
              <button type="button" onClick={() => updateCartQty(sid, p.id, linea.qty + 1)} aria-label="Uno más"><Plus size={16} /></button>
            </div>
          ) : <button type="button" className="btn product-add-btn tp-btn" onClick={agregar}>Agregar <ShoppingCart size={14} /></button>}
        </div>
      </div>
    </div>
  );
}

// ─── Vista rápida: ver fotos, precio y agregar sin salir de la lista ───
function VistaRapida({ producto, onClose }) {
  const ctx = useContext(Ctx);
  const { nav, addToCart, config, setNotifyProduct } = ctx;
  const [p, setP] = useState(producto);
  const [fotos, setFotos] = useState(producto.imagen ? [producto.imagen] : []);
  const [i, setI] = useState(0);
  const [qty, setQty] = useState(1);
  const toque = useRef(null);
  const imgRef = useRef(null);
  useEffect(() => {
    let vivo = true;
    api.getProducto(producto.id).then(full => { if (vivo && full) setP(x => ({ ...x, ...full, seccion_id: x.seccion_id || full.seccion_id, imagen2: x.imagen2 })); }).catch(() => {});
    api.getProductoImagenes(producto.id).then(imgs => { if (vivo && imgs && imgs.length) setFotos(imgs.map(g => g.url)); }).catch(() => {});
    return () => { vivo = false; };
  }, [producto.id]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI(x => (x + 1) % Math.max(1, fotos.length)); if (e.key === 'ArrowLeft') setI(x => (x - 1 + Math.max(1, fotos.length)) % Math.max(1, fotos.length)); };
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [fotos.length]);
  const sid = p.seccion_id;
  const pr = precioTarjeta(p, ctx, sid);
  const stock = Number(p.stock) || 0;
  const secV = (ctx.secciones || []).find(x => String(x.id) === String(sid));
  const sinTopeV = !!(p.permitir_sin_stock || p.es_digital || p.es_preventa || p.usa_variantes || secV?.ignorar_stock || secV?.permitir_sin_stock);
  const tope = sinTopeV ? Infinity : stock;
  const agotado = stock <= 0 && !sinTopeV;
  const umbral = Number(config?.[`envio_gratis_desde_${sid}`]) || 0;
  const envioGratis = !p.es_digital && (p.envio_gratis || (umbral > 0 && pr.final >= umbral));
  const fmtP = (v) => (p.moneda && p.moneda !== 'ARS') ? fmtMon(v, p.moneda) : fmtARS(v);
  const verFicha = () => { onClose(); window.__secId = sid; nav('product', p); };
  const agregar = () => { volarAlCarrito(imgRef.current); addToCart(sid, p, qty, pr.final); onClose(); };
  const ir = (d) => setI(x => (x + d + fotos.length) % fotos.length);
  return createPortal(
    <div className="vr-overlay" onClick={onClose}>
      <div className="vr" onClick={e => e.stopPropagation()} role="dialog" aria-label={p.nombre || 'Vista rápida'}>
        <button type="button" className="vr-cerrar" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <div className="vr-media" onTouchStart={e => { toque.current = e.touches[0].clientX; }} onTouchEnd={e => { if (toque.current == null || fotos.length < 2) return; const dx = e.changedTouches[0].clientX - toque.current; toque.current = null; if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1); }}>
          {fotos.length ? <img ref={imgRef} src={imgOpt(fotos[i], 700)} srcSet={imgSet(fotos[i], 700)} alt={p.nombre || ''} /> : <div className="tp-noimg"><Package size={56} /></div>}
          {pr.pct > 0 && <span className="pbadge pbadge-discount vr-badge">{pr.pct}% OFF</span>}
          {fotos.length > 1 && <>
            <button type="button" className="vr-flecha izq" onClick={() => ir(-1)} aria-label="Foto anterior"><ChevronLeft size={20} /></button>
            <button type="button" className="vr-flecha der" onClick={() => ir(1)} aria-label="Foto siguiente"><ChevronRight size={20} /></button>
            <div className="vr-thumbs">{fotos.slice(0, 8).map((u, k) => <button type="button" key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Foto ${k + 1}`}><img src={imgOpt(u, 120)} alt="" /></button>)}</div>
          </>}
        </div>
        <div className="vr-info">
          <div className="product-cat">{p.categoria}</div>
          <h3 className="vr-titulo">{p.nombre || p.modelo}</h3>
          {p.usa_variantes ? <div className="vr-precio"><span className="price-new">{Number(p.precio_desde) > 0 ? <><small>desde </small>{fmtMon(desdeTarjeta(p, ctx, sid), p.moneda_desde || 'ARS')}</> : 'Varias opciones'}</span></div>
            : pr.final > 0 ? <div className="vr-precio">{pr.original && <span className="price-old">{fmtP(pr.original)}</span>}<span className={`price-new${pr.original ? ' con-desc' : ''}`}>{fmtP(pr.final)}</span></div>
            : <div className="vr-precio"><span className="tp-consultar">Consultar precio</span></div>}
          {pr.ahorro > 0 && <div className="vr-ahorro">Ahorrás {fmtP(pr.ahorro)}{pr.promo ? ` · ${pr.promo}` : ''}</div>}
          {pr.hasta && <CuentaRegresiva hasta={pr.hasta} />}
          <div className="vr-chips">
            {envioGratis && <span><Truck size={13} /> Envío gratis</span>}
            {!agotado && !p.usa_variantes && !p.es_digital && !p.permitir_sin_stock && (stock <= 3 ? <span className="warn">{stock === 1 ? 'Última unidad' : `Últimas ${stock} unidades`}</span> : <span className="ok"><Check size={13} /> En stock</span>)}
            {p.es_digital && <span>Producto digital</span>}
          </div>
          {p.descripcion && <p className="vr-desc">{String(p.descripcion).slice(0, 320)}{String(p.descripcion).length > 320 ? '…' : ''}</p>}
          <div className="vr-acciones">
            {p.usa_variantes || p.es_preventa ? <button type="button" className="btn btn-primary vr-btn" onClick={verFicha}>{p.es_preventa ? 'Ver preventa' : 'Elegir opciones'}</button>
              : agotado ? <button type="button" className="btn btn-outline vr-btn" onClick={() => { onClose(); setNotifyProduct(p); }}><Bell size={15} /> Avisame cuando llegue</button>
              : <>
                <div className="vr-qty">
                  <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Uno menos"><Minus size={16} /></button>
                  <span>{qty}</span>
                  <button type="button" onClick={() => setQty(q => q + 1 > tope ? q : q + 1)} disabled={qty >= tope} aria-label="Uno más"><Plus size={16} /></button>
                </div>
                <button type="button" className="btn btn-primary vr-btn" onClick={agregar}><ShoppingCart size={16} /> Agregar{pr.final > 0 ? ` · ${fmtP(pr.final * qty)}` : ''}</button>
              </>}
          </div>
          <button type="button" className="link-btn vr-ficha" onClick={verFicha}>Ver ficha completa <ChevronRight size={14} /></button>
        </div>
      </div>
    </div>, document.body);
}

// ─── Visor de fotos a pantalla completa (ficha del producto) ───
function VisorFotos({ fotos, inicio = 0, titulo, onClose }) {
  const [i, setI] = useState(inicio);
  const toque = useRef(null);
  const ir = (d) => setI(x => (x + d + fotos.length) % fotos.length);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') ir(1); if (e.key === 'ArrowLeft') ir(-1); };
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [fotos.length]);
  return createPortal(
    <div className="vf" role="dialog" aria-label={titulo || 'Fotos'} onClick={onClose}>
      <div className="vf-top" onClick={e => e.stopPropagation()}>
        <span>{i + 1} / {fotos.length}</span>
        <button type="button" onClick={onClose} aria-label="Cerrar"><X size={22} /></button>
      </div>
      <div className="vf-stage" onClick={e => e.stopPropagation()}
        onTouchStart={e => { toque.current = e.touches[0].clientX; }}
        onTouchEnd={e => { if (toque.current == null || fotos.length < 2) return; const dx = e.changedTouches[0].clientX - toque.current; toque.current = null; if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1); }}>
        <img key={i} src={imgOpt(fotos[i], 1600)} alt={titulo || ''} />
        {fotos.length > 1 && <>
          <button type="button" className="vf-flecha izq" onClick={() => ir(-1)} aria-label="Anterior"><ChevronLeft size={26} /></button>
          <button type="button" className="vf-flecha der" onClick={() => ir(1)} aria-label="Siguiente"><ChevronRight size={26} /></button>
        </>}
      </div>
      {fotos.length > 1 && <div className="vf-thumbs" onClick={e => e.stopPropagation()}>{fotos.map((u, k) => <button type="button" key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)}><img src={imgOpt(u, 120)} alt="" /></button>)}</div>}
    </div>, document.body);
}

// ─── Carrito: aviso al agregar + mini-carrito lateral con envío gratis por tienda ───
function progresoEnvioGratis(items, umbral) {
  const sub = (items || []).filter(i => !i.variante_moneda || i.variante_moneda === 'ARS').reduce((a, i) => a + puItem(i) * (Number(i.qty) || 0), 0);
  if (!(umbral > 0)) return { sub, umbral: 0 };
  return { sub, umbral, falta: Math.max(0, umbral - sub), pct: Math.min(100, Math.round(sub / umbral * 100)) };
}
function BarraEnvioGratis({ items, secId, nombreTienda }) {
  const { config } = useContext(Ctx);
  const umbral = Number(config?.[`envio_gratis_desde_${secId}`]) || 0;
  const g = progresoEnvioGratis(items, umbral);
  if (!g.umbral) return null;
  return (
    <div className={`eg${g.falta === 0 ? ' listo' : ''}`}>
      <div className="eg-txt">{g.falta === 0 ? <><Truck size={14} /> Tenés <b>envío gratis</b>{nombreTienda ? ` en ${nombreTienda}` : ''}</> : <><Truck size={14} /> Te faltan <b>{fmtARS(g.falta)}</b> para envío gratis{nombreTienda ? ` en ${nombreTienda}` : ''}</>}</div>
      <div className="eg-barra"><span style={{ width: `${g.pct}%` }} /></div>
    </div>
  );
}
function AvisoCarrito() {
  const { avisoCarrito, setAvisoCarrito, carritoAbierto, setCarritoAbierto, vistaRapida, cart, secciones } = useContext(Ctx);
  const [pausa, setPausa] = useState(false);
  useEffect(() => { if (!avisoCarrito || pausa) return; const t = setTimeout(() => setAvisoCarrito(null), 4500); return () => clearTimeout(t); }, [avisoCarrito, pausa]);
  useEffect(() => { if (carritoAbierto || vistaRapida) setAvisoCarrito(null); }, [carritoAbierto, vistaRapida]);
  if (!avisoCarrito || carritoAbierto) return null;
  const sec = secciones.find(s => String(s.id) === String(avisoCarrito.secId));
  return createPortal(
    <div key={avisoCarrito.n} className="aviso-carrito" role="status" onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}>
      <div className="ac-fila">
        {avisoCarrito.imagen ? <img src={imgOpt(avisoCarrito.imagen, 120)} alt="" /> : <span className="ac-ph"><Package size={18} /></span>}
        <div className="ac-txt"><b><Check size={14} /> Agregado al carrito</b><span>{avisoCarrito.nombre}</span></div>
        <button type="button" className="ac-x" onClick={() => setAvisoCarrito(null)} aria-label="Cerrar"><X size={16} /></button>
      </div>
      <BarraEnvioGratis items={cart[avisoCarrito.secId] || []} secId={avisoCarrito.secId} nombreTienda={sec?.nombre} />
      <button type="button" className="btn btn-primary ac-btn" onClick={() => { setAvisoCarrito(null); setCarritoAbierto(true); }}>Ver carrito</button>
    </div>, document.body);
}
function MiniCarrito() {
  const { carritoAbierto, setCarritoAbierto, cart, secciones, updateCartQty, removeFromCart, nav, cartCount } = useContext(Ctx);
  useEffect(() => {
    if (!carritoAbierto) return;
    const k = (e) => { if (e.key === 'Escape') setCarritoAbierto(false); };
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [carritoAbierto]);
  if (!carritoAbierto) return null;
  const grupos = secciones.map(s => ({ s, items: (Array.isArray(cart[s.id]) ? cart[s.id] : []).filter(i => i.qty > 0) })).filter(g => g.items.length);
  const total = grupos.reduce((a, g) => a + g.items.reduce((b, i) => b + (!i.variante_moneda || i.variante_moneda === 'ARS' ? puItem(i) * i.qty : 0), 0), 0);
  const cerrar = () => setCarritoAbierto(false);
  return createPortal(
    <div className="mc-overlay" onClick={cerrar}>
      <aside className="mc" onClick={e => e.stopPropagation()} role="dialog" aria-label="Tu carrito">
        <header className="mc-head"><h3>Tu carrito{cartCount > 0 ? <span> · {cartCount} producto{cartCount !== 1 ? 's' : ''}</span> : null}</h3><button type="button" className="dd-icono" onClick={cerrar} aria-label="Cerrar"><X size={18} /></button></header>
        <div className="mc-body">
          {!grupos.length && <div className="mc-vacio"><ShoppingCart size={34} /><p>Tu carrito está vacío</p><button type="button" className="btn btn-primary" onClick={() => { cerrar(); nav('landing'); }}>Ver productos</button></div>}
          {grupos.map(({ s, items }) => (
            <section key={s.id} className="mc-tienda">
              <div className="mc-tienda-head"><Store size={15} /> {s.nombre}</div>
              <BarraEnvioGratis items={items} secId={s.id} />
              {items.map(i => {
                const mon = i.variante_moneda && i.variante_moneda !== 'ARS' ? i.variante_moneda : 'ARS';
                return (
                  <div key={`${i.id}_${i.variante_id || 0}`} className="mc-item">
                    {i.imagen ? <img src={imgOpt(i.imagen, 120)} alt="" /> : <span className="mc-ph"><Package size={18} /></span>}
                    <div className="mc-item-info">
                      <div className="mc-nombre">{i.nombre || i.modelo}</div>
                      {i.variante_label && <div className="mc-var">{i.variante_label}</div>}
                      {i._preventa && <div className="mc-var">Reserva</div>}
                      <div className="mc-precio">{fmtMon(puItem(i) * i.qty, mon)}{i.qty > 1 && <small> · {fmtMon(puItem(i), mon)} c/u</small>}</div>
                    </div>
                    <div className="mc-qty">
                      <button type="button" onClick={() => updateCartQty(s.id, i.id, i.qty - 1, i.variante_id || null)} aria-label={i.qty === 1 ? 'Quitar' : 'Uno menos'}>{i.qty === 1 ? <Trash2 size={14} /> : <Minus size={14} />}</button>
                      <span>{i.qty}</span>
                      <button type="button" onClick={() => updateCartQty(s.id, i.id, i.qty + 1, i.variante_id || null)} aria-label="Uno más"><Plus size={14} /></button>
                    </div>
                    <button type="button" className="mc-quitar" onClick={() => removeFromCart(s.id, i.id, i.variante_id || null)} aria-label="Quitar del carrito"><X size={14} /></button>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        {grupos.length > 0 && (
          <footer className="mc-pie">
            <div className="mc-total"><span>Total estimado</span><b>{fmtARS(total)}</b></div>
            <p className="mc-nota">El envío y los descuentos finales se calculan en el carrito.</p>
            <button type="button" className="btn btn-primary mc-ir" onClick={() => { cerrar(); nav('cart'); }}>Ir al carrito</button>
            <button type="button" className="link-btn mc-seguir" onClick={cerrar}>Seguir comprando</button>
          </footer>
        )}
      </aside>
    </div>, document.body);
}

function Landing() {
  const { secciones, badges, nav, toast, design, config, addToCart, user, getPrice, userLista, globalSearch, setGlobalSearch, globalResults, setGlobalResults, doGlobalSearch, setNotifyProduct, promos, precioLista, precioEfectivo, ajusteCliente } = useContext(Ctx);
  const [showPopup, setShowPopup] = useState(null);
  const [secProds, setSecProds] = useState({});
  const [sliders, setSliders] = useState([]);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [favIds, setFavIds] = useState(new Set());
  const [novedades, setNovedades] = useState([]);

  const [ofertasSrv, setOfertasSrv] = useState([]);
  useEffect(() => {
    api.getNovedades('all', 10).then(setNovedades).catch(() => {});
    api.getOfertas(16).then(o => setOfertasSrv(Array.isArray(o) ? o : [])).catch(() => {});
  }, []);

  useEffect(() => {
    // Pop-up: una sola vez por visita (no reaparece cada vez que vuelve al inicio)
    api.getPopups().then(p => {
      if (!p.length) return;
      const clave = `popup_visto_${p[0].id}`;
      try { if (sessionStorage.getItem(clave)) return; sessionStorage.setItem(clave, '1'); } catch {}
      setShowPopup(p[0]);
    }).catch(() => {});
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

  return (
    <div className="landing">
      {/* Popup */}
      {showPopup && <PopupPromo popup={showPopup} onClose={() => setShowPopup(null)} />}

      {/* ── SLIDER BANNERS ── estilo demo con overlay de texto */}
      {sliders.length > 0 && (
        <div className="landing-block landing-hero" style={{ maxWidth: 1600, margin: '16px auto 0', padding: '0 20px' }}>
          <div className="hero-slider">
            {sliders.map((s, i) => (
              <div key={s.id} className="hero-slide" style={{ display: i === sliderIdx ? 'block' : 'none', cursor: s.url_destino ? 'pointer' : 'default' }}
                onClick={() => { const u = urlSegura(s.url_destino); if (u) window.open(u, '_blank', 'noopener'); }}>
                {/* En celular usa la imagen para celular si la cargaron (si no, muestra la misma entera, sin cortarla) */}
                <picture>
                  {s.imagen_mobile && <source media="(max-width: 768px)" srcSet={imgOpt(s.imagen_mobile, 900)} />}
                  <img src={imgOpt(s.imagen, 1600)} alt={s.titulo || ''} className="hero-slide-img" />
                </picture>
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
        <div className="landing-block landing-titulo">
          {design.hero_titulo && <h1>{design.hero_titulo}</h1>}
          {design.hero_subtitulo && <p>{design.hero_subtitulo}</p>}
        </div>
      )}
      {/* Search bar is now in Header */}
      <div className="landing-block landing-confianza" style={{ maxWidth: 1600, margin: '0 auto', padding: '16px 20px 0' }}>
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
                  {r.productos.map(p => <TarjetaProducto key={p.id} p={p} secId={r.seccion.id} />)}
                </div>
              </div>
            ))
          )}
          <button onClick={() => setGlobalResults(null)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: 13, marginTop: 8 }}>✕ Cerrar resultados</button>
        </div>
      )}

      {/* ── OFERTAS ── carrusel con el mayor descuento primero (oferta del producto o promo activa) */}
      {!globalResults && ofertasSrv.length > 0 && (() => {
        const ctxP = { precioLista, precioEfectivo, ajusteCliente, promos };
        const lista = ofertasSrv.map(p => ({ p, pr: precioTarjeta(p, ctxP, p.seccion_id) })).filter(x => x.pr.pct > 0);
        if (!lista.length) return null;
        const maxPct = Math.max(...lista.map(x => x.pr.pct));
        const finCercano = lista.map(x => finPromoMs(x.pr.hasta)).filter(Boolean).sort((a, b) => a - b)[0];
        return (
          <div className="landing-block ofertas-block" style={{ maxWidth: 1600, margin: '24px auto 0', padding: '0 20px' }}>
            <div className="ofertas-head">
              <span className="ofertas-pill">OFERTAS</span>
              <span className="ofertas-sub">Hasta <b>{maxPct}% OFF</b></span>
              {finCercano && <span className="ofertas-reloj"><Clock size={13} /> {textoRestante(finCercano)}</span>}
            </div>
            <Carrusel>
              {lista.slice(0, 16).map(({ p }) => <div className="carousel-item" key={`of-${p.id}`}><TarjetaProducto p={p} secId={p.seccion_id} /></div>)}
            </Carrusel>
          </div>
        );
      })()}

      {/* ── NOVEDADES ── carrusel horizontal */}
      {!globalResults && novedades.length > 0 && (
        <div className="landing-block" style={{ maxWidth: 1600, margin: '24px auto 0', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'var(--primary)', color: 'var(--on-primary, #fff)', padding: '2px 12px', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 800 }}>NOVEDADES</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>Lo último que sumamos</span>
            </h2>
          </div>
          <Carrusel>
            {novedades.slice(0, 12).map(p => <div className="carousel-item" key={`nov-${p.id}`}><TarjetaProducto p={p} secId={p.seccion_id} /></div>)}
          </Carrusel>
        </div>
      )}

      {/* ── PRODUCTS PER SECTION ── carruseles horizontales */}
      {!globalResults && secciones.filter(s => !s.requiere_aprobacion).map(s => {
        const prods = secProds[s.id] || [];
        if (!prods.length) return null;
        return (
          <div key={s.id} className="landing-block" style={{ maxWidth: 1600, margin: '0 auto', padding: '28px 20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{s.nombre}</h2>
              <button onClick={() => nav('section', s.id)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Ver todos →
              </button>
            </div>
            <Carrusel>
              {prods.slice(0, 12).map(p => <div className="carousel-item" key={p.id}><TarjetaProducto p={p} secId={s.id} /></div>)}
            </Carrusel>
          </div>
        );
      })}

      {/* ── BANNER PUBLICITARIO ── al pie del catálogo (config.banner_texto) */}
      {config.banner_texto && (
        <div style={{ maxWidth: 1600, margin: '32px auto 0', padding: '0 20px' }}>
          <div style={{ background: 'var(--primary)', color: 'var(--on-primary, #fff)', borderRadius: 14, padding: '18px 24px', textAlign: 'center', fontWeight: 700, fontSize: 15, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
            <span>{config.banner_texto}</span>
            {config.banner_whatsapp && <a href={`https://wa.me/${waIntl(config.banner_whatsapp)}`} target="_blank" rel="noopener" style={{ background: '#fff', color: 'var(--primary)', padding: '8px 16px', borderRadius: 8, fontWeight: 800, textDecoration: 'none', fontSize: 13 }}>WhatsApp</a>}
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

// GSAP (animación al scrollear de las tarjetas .kicks-card) se baja solo si hay tarjetas para animar
let _gsapCarga = null;
const cargarGsap = () => _gsapCarga || (_gsapCarga = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, st]) => {
  const gsap = g.default || g.gsap; const { ScrollTrigger } = st; gsap.registerPlugin(ScrollTrigger); return { gsap, ScrollTrigger };
}));
function ScrollTriggerInit({ deps = 0 }) {
  // FIX #16: re-corre cuando cargan productos (async) y refresca ScrollTrigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!document.querySelector('.kicks-card')) return;
      cargarGsap().then(({ gsap, ScrollTrigger }) => {
        gsap.utils.toArray('.kicks-card').forEach(card => {
          if (card._gsapInit) return; card._gsapInit = true;
          gsap.fromTo(card, { scale: 0.82 }, {
            scale: 1, ease: 'none',
            scrollTrigger: { trigger: card, start: 'top bottom', end: 'top center', scrub: 1 }
          });
        });
        ScrollTrigger.refresh();
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [deps]);
  useEffect(() => () => { if (_gsapCarga) _gsapCarga.then(({ ScrollTrigger }) => ScrollTrigger.getAll().forEach(t => t.kill())).catch(() => {}); }, []);
  return null;
}

// ═══════════════════════════════════════════════════════════
// SECTION PAGE (with back button!)
// ═══════════════════════════════════════════════════════════
function SectionPage() {
  const { seccionActual: sec, user, nav, toast, addToCart, listas, config, getPrice, userLista, setSelectedProduct, precioEfectivo, ajusteCliente } = useContext(Ctx);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catFiltro, setCatFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaInput, setBusquedaInput] = useState('');
  // Espera a que el cliente termine de escribir (antes pedía al servidor en cada letra)
  useEffect(() => { const t = setTimeout(() => { if (busquedaInput !== busqueda) { setBusqueda(busquedaInput); setPagina(1); } }, 350); return () => clearTimeout(t); }, [busquedaInput]);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const esCel = useMediaQuery('(max-width: 768px)');
  const [stockFiltro, setStockFiltro] = useState('todos'); // todos | con | sin
  const [marcaFiltro, setMarcaFiltro] = useState('');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [orden, setOrden] = useState('relevancia'); // relevancia | precio_asc | precio_desc | nombre
  const [pagina, setPagina] = useState(() => Number(new URLSearchParams(window.location.search).get('pag')) || 1);
  // En celular se muestran 24 y se van cargando más al bajar (se recuerda al volver atrás)
  const [porPagina, setPorPagina] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
      const g = Number(sessionStorage.getItem(`gm_ver_${window.location.pathname}`)); return g > 0 ? g : 24;
    }
    return 50;
  });
  const [cargandoMas, setCargandoMas] = useState(false);
  const cargaSeq = useRef(0);
  useEffect(() => { if (esCel && typeof porPagina === 'number') { try { sessionStorage.setItem(`gm_ver_${window.location.pathname}`, String(porPagina)); } catch {} } }, [porPagina, esCel]);
  const finListaRef = useRef(null);
  // Al cambiar de sección, tomar la página desde la URL (1 si no hay ?pag)
  useEffect(() => { setPagina(Number(new URLSearchParams(window.location.search).get('pag')) || 1); }, [sec?.id]);
  // En celular no hay páginas: siempre desde la primera (los demás se cargan al bajar)
  useEffect(() => { if (esCel && pagina !== 1) setPagina(1); }, [esCel]);
  // Mantener el número de página en la URL (?pag=N) para que el botón "atrás" vuelva a la misma página
  useEffect(() => {
    if (!sec || (!sec.slug && !sec.id)) return;
    const base = `/${sec.slug || ('s-' + sec.id)}`;
    const cur = new URLSearchParams(window.location.search);
    const kept = new URLSearchParams();
    for (const k of ['tienda', 'preview']) { const v = cur.get(k); if (v) kept.set(k, v); }
    if (pagina > 1) kept.set('pag', String(pagina));
    const qs = kept.toString();
    const url = base + (qs ? '?' + qs : '');
    if ((window.location.pathname + window.location.search) !== url) { try { window.history.replaceState({ ...(window.history.state || {}) }, '', url); } catch (e) {} }
  }, [pagina, sec?.id]);
  const [total, setTotal] = useState(0);
  const [promos, setPromos] = useState([]);
  const [secBadges, setSecBadges] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [dolarBlue, setDolarBlue] = useState(null);
  const [vistaMay, setVistaMay] = useState(() => { try { return localStorage.getItem('gm_may_vista') || 'lista'; } catch { return 'lista'; } });
  const cambiarVistaMay = (v) => { setVistaMay(v); try { localStorage.setItem('gm_may_vista', v); } catch {} };

  const esMayorista = sec?.slug === 'mayorista';
  const esDropshipping = sec?.slug === 'dropshipping';

  const loadData = async () => {
    if (!sec) return;
    const seq = ++cargaSeq.current;
    try {
      const [prodData, cats, promoData, bdg, mp] = await Promise.all([
        api.getProductos({ seccion_id: sec.id, categoria: catFiltro, q: busqueda, page: pagina, limit: porPagina === 'todos' ? 100000 : porPagina }),
        api.getCategorias(sec.id),
        api.getPromocionesActivas(sec.id).catch(() => []),
        api.getBadges(sec.id).catch(() => []),
        api.getMetodosPago(sec.id).catch(() => [])
      ]);
      if (seq !== cargaSeq.current) return; // llegó tarde: ya se pidió otra página/filtro
      setProductos(prodData.productos || []); setTotal(prodData.total || 0); setCargandoMas(false);
      setCategorias(cats || []); setPromos(promoData || []); setSecBadges(bdg || []);
      setMetodosPago(mp || []);
      if (esMayorista || mostrarUsdSec(config, sec)) {
        api.getDolarBlue().then(d => { if (d.venta) setDolarBlue(d.venta); }).catch(() => {});
      }
    } catch (e) { console.error(e); if (seq === cargaSeq.current) setCargandoMas(false); }
  };

  useEffect(() => {
    if (!sec) return;
    api.trackSectionView(sec.nombre);
    loadData();
  }, [sec?.id, catFiltro, busqueda, pagina, porPagina]);
  const hayMas = esCel && typeof porPagina === 'number' && total > productos.length;
  const cargarMas = () => { if (cargandoMas || !hayMas) return; setCargandoMas(true); setPagina(1); setPorPagina(n => (typeof n === 'number' ? n : 24) + 24); };
  useEffect(() => {
    if (!hayMas || !finListaRef.current || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) cargarMas(); }, { rootMargin: '600px 0px' });
    io.observe(finListaRef.current);
    return () => io.disconnect();
  }, [hayMas, productos.length, cargandoMas]);


  if (!sec) return <Landing />;

  // Price with promos
  // Mismas reglas que el carrito y el servidor: lista del cliente, oferta, revendedor o promo
  const getPrecio = (p) => {
    const precio = precioEfectivo(p);
    const a = ajusteCliente(precio, p, promos, p.seccion_id || sec?.id, 'ARS');
    if (a && a.esRevendedor) return { original: a.original, final: a.final, descuento: a.pct, esRevendedor: true };
    if (a) return { original: a.original, final: a.final, descuento: a.pct, promo: a.nombre };
    const base = Number(p.precio_base) || 0;
    if (!p.es_preventa && base > precio && precio > 0) return { original: base, final: precio, descuento: Math.round((1 - precio / base) * 100) };
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

  // Tiendas con aprobación (mayorista): solo clientes autorizados. Por defecto se ven como lista por categorías.
  const restringida = !!sec.requiere_aprobacion;
  const accesoMay = !!user && (user.rol === 'admin' || user.rol === 'subadmin' || !!user.mayorista);
  if (restringida && !accesoMay) return <MayoristaBloqueado sec={sec} />;
  if (restringida && vistaMay === 'lista') return <ListaMayorista sec={sec} onVista={cambiarVistaMay} />;

  return (
    <div className="sec-page">
      <ScrollTriggerInit deps={productos.length} />
      {/* Título de la tienda */}
      <div className="sec-head">
        <button className="link-btn sec-back" onClick={() => nav('landing')}>← Inicio</button>
        <div className="sec-head-row">
          <div style={{ minWidth: 0 }}>
            <h1 className="sec-title">{sec.nombre}</h1>
            {sec.descripcion && <p className="sec-desc">{sec.descripcion}</p>}
          </div>
          <div className="sec-head-actions">
            {restringida && <VistaMayToggle vista={vistaMay} onVista={cambiarVistaMay} />}
            {esMayorista && dolarBlue && <div className="sec-dolar"><DollarSign size={14} /> Blue ${fmt(dolarBlue)}</div>}
            <button className="icon-btn sec-share" title="Compartir esta tienda" aria-label="Compartir esta tienda" onClick={async () => {
              const slug = sec.slug || ('s-' + sec.id);
              const t = new URLSearchParams(window.location.search).get('tienda');
              const ogUrl = `${window.location.origin}/api/og?seccion=${encodeURIComponent(slug)}${t ? '&tienda=' + encodeURIComponent(t) : ''}`;
              const cleanUrl = `${window.location.origin}/${slug}${t ? '?tienda=' + encodeURIComponent(t) : ''}`;
              if (navigator.share) { try { await navigator.share({ title: sec.nombre, text: sec.nombre, url: ogUrl }); } catch (e) {} return; }
              try { await navigator.clipboard.writeText(cleanUrl); toast('Link copiado'); } catch (e) { toast(cleanUrl); }
            }}><Share2 size={17} /></button>
          </div>
        </div>
      </div>

      <AvisoSeccion sec={sec} />

      {/* Buscador + botón de filtros */}
      <div className="sec-tools">
        <label className="sec-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input placeholder={`Buscar en ${sec.nombre}`} value={busquedaInput} onChange={e => setBusquedaInput(e.target.value)} aria-label="Buscar en esta tienda" />
          {busquedaInput && <button className="sec-search-clear" onClick={() => setBusquedaInput('')} aria-label="Borrar búsqueda">✕</button>}
        </label>
        <button className={`btn btn-outline sec-filtros-btn${(stockFiltro !== 'todos' || precioMin || precioMax || orden !== 'relevancia' || marcaFiltro) ? ' activo' : ''}`} onClick={() => setFiltrosAbiertos(true)}>
          <SlidersHorizontal size={16} /> <span>Filtros</span>
          {(() => { const n = (stockFiltro !== 'todos') + (!!precioMin || !!precioMax) + (orden !== 'relevancia') + (!!marcaFiltro); return n > 0 ? <span className="sec-filtros-n">{n}</span> : null; })()}
        </button>
      </div>

      {/* Categorías como botones deslizables */}
      {categorias.length > 0 && (
        <div className="cat-chips" role="tablist" aria-label="Categorías">
          <button className={`cat-chip${!catFiltro ? ' sel' : ''}`} onClick={() => { setCatFiltro(''); setPagina(1); }}>Todo</button>
          {categorias.map(c => <button key={c} className={`cat-chip${catFiltro === c ? ' sel' : ''}`} onClick={() => { setCatFiltro(c); setPagina(1); }}>{c}</button>)}
        </div>
      )}

      <div className="sec-meta">
        <span>{esCel ? total : productosFiltrados.length} producto{(esCel ? total : productosFiltrados.length) !== 1 ? 's' : ''}{catFiltro ? ` en ${catFiltro}` : ''}</span>
        {hayFiltrosActivos && <button className="link-btn" onClick={() => { setStockFiltro('todos'); setPrecioMin(''); setPrecioMax(''); setOrden('relevancia'); setCatFiltro(''); setMarcaFiltro(''); setPagina(1); }}>Limpiar filtros</button>}
        {!esCel && (
          <div className="sec-ver">
            <span>Ver:</span>
            {[50, 100, 'todos'].map(n => <button key={n} className={porPagina === n ? 'sel' : ''} onClick={() => { setPorPagina(n); setPagina(1); }}>{n === 'todos' ? 'Todos' : n}</button>)}
          </div>
        )}
      </div>

      {/* Panel de filtros (desde abajo en celular, lateral en compu) */}
      {filtrosAbiertos && (
        <div className="sheet-overlay" onClick={() => setFiltrosAbiertos(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="Filtros">
            <div className="sheet-handle" />
            <div className="sheet-head"><h3>Filtros</h3><button className="modal-close" onClick={() => setFiltrosAbiertos(false)} aria-label="Cerrar">✕</button></div>
            <div className="sheet-body">
              <label className="sheet-label">Ordenar por</label>
              <div className="sheet-opts">
                {[['relevancia', 'Relevancia'], ['precio_asc', 'Menor precio'], ['precio_desc', 'Mayor precio'], ['nombre', 'Nombre A-Z']].map(([v, t]) => <button key={v} className={`cat-chip${orden === v ? ' sel' : ''}`} onClick={() => setOrden(v)}>{t}</button>)}
              </div>
              <label className="sheet-label">Stock</label>
              <div className="sheet-opts">
                {[['todos', 'Todos'], ['con', 'Con stock'], ['sin', 'Sin stock']].map(([v, t]) => <button key={v} className={`cat-chip${stockFiltro === v ? ' sel' : ''}`} onClick={() => setStockFiltro(v)}>{t}</button>)}
              </div>
              <label className="sheet-label">Precio</label>
              <div className="sheet-precio">
                <input type="number" inputMode="numeric" placeholder="Mínimo" value={precioMin} onChange={e => setPrecioMin(e.target.value)} />
                <span>–</span>
                <input type="number" inputMode="numeric" placeholder="Máximo" value={precioMax} onChange={e => setPrecioMax(e.target.value)} />
              </div>
              {marcasDisponibles.length > 0 && <>
                <label className="sheet-label">Marca</label>
                <select value={marcaFiltro} onChange={e => setMarcaFiltro(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Todas las marcas</option>
                  {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </>}
            </div>
            <div className="sheet-foot">
              <button className="btn btn-outline" onClick={() => { setStockFiltro('todos'); setPrecioMin(''); setPrecioMax(''); setOrden('relevancia'); setMarcaFiltro(''); }}>Limpiar</button>
              <button className="btn btn-primary" onClick={() => setFiltrosAbiertos(false)}>Ver {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}</button>
            </div>
          </div>
        </div>
      )}

      {/* Products grid */}
      <div className="product-grid">
        {productosFiltrados.map(p => <TarjetaProducto key={p.id} p={p} secId={sec.id} usd={(esMayorista || mostrarUsdSec(config, sec)) && dolarBlue ? dolarBlue : null} />)}
      </div>
      {productos.length === 0 && <div className="empty-state"><h3>No hay productos</h3></div>}

      {/* Celular: se cargan más productos al llegar al final */}
      {hayMas && (
        <div ref={finListaRef} className="cargar-mas">
          <button className="btn btn-outline" onClick={cargarMas} disabled={cargandoMas}>{cargandoMas ? 'Cargando…' : `Ver más productos (${total - productos.length})`}</button>
        </div>
      )}
      {/* Pagination (compu) */}
      {!esCel && porPagina !== 'todos' && total > porPagina && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          {pagina > 1 && <button className="btn btn-outline btn-sm" onClick={() => setPagina(pagina - 1)}>← Anterior</button>}
          <span style={{ padding: '6px 12px' }}>Pág {pagina} / {Math.ceil(total / porPagina)}</span>
          {pagina < Math.ceil(total / porPagina) && <button className="btn btn-outline btn-sm" onClick={() => setPagina(pagina + 1)}>Siguiente →</button>}
        </div>
      )}
    </div>
  );
}

// ─── MAYORISTA ───
// Colores para separar categorías en la lista (se repiten en orden, nunca dos seguidas iguales)
const COLORES_CAT = ['#4A69E2', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#14B8A6', '#A855F7', '#EAB308'];
const normTxt = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function VistaMayToggle({ vista, onVista }) {
  return (
    <div className="vista-toggle" role="group" aria-label="Vista">
      <button type="button" className={vista === 'lista' ? 'on' : ''} onClick={() => onVista('lista')} title="Lista por categorías"><LayoutList size={16} /><span>Lista</span></button>
      <button type="button" className={vista === 'fotos' ? 'on' : ''} onClick={() => onVista('fotos')} title="Con fotos"><ImagePlus size={16} /><span>Fotos</span></button>
    </div>
  );
}
function MayoristaBloqueado({ sec }) {
  const { user, setUser, nav, toast, config, design } = useContext(Ctx);
  const [enviado, setEnviado] = useState(!!(user && user.mayorista_solicitado_at));
  const rechazado = !!(user && !user.mayorista && user.mayorista_rechazado_at && !user.mayorista_solicitado_at);
  const [enviando, setEnviando] = useState(false);
  const wa = waIntl(config?.whatsapp || design?.whatsapp_numero || '');
  const pedir = async () => {
    setEnviando(true);
    try { await api.solicitarMayorista(); setEnviado(true); setUser({ ...user, mayorista_solicitado_at: new Date().toISOString() }); toast('Pedido enviado. Avisanos por WhatsApp así te escribimos cuando esté aprobado.'); }
    catch (e) { toast(e.message, 'error'); if (/revisado/i.test(e.message || '')) setUser({ ...user, mayorista_rechazado_at: new Date().toISOString() }); }
    setEnviando(false);
  };
  return (
    <div className="may-lock">
      <div className="may-lock-card">
        <span className="may-lock-ico"><Lock size={26} /></span>
        <h1>{sec.nombre}</h1>
        <p>{sec.descripcion ? `${sec.descripcion}. ` : ''}Esta lista de precios es solo para clientes mayoristas autorizados.</p>
        <AvisoSeccion sec={sec} compacto />
        {!user ? (
          <>
            <div className="may-lock-acciones">
              <button className="btn btn-primary" onClick={() => nav('login')}>Ingresar</button>
              <button className="btn btn-outline" onClick={() => nav('register')}>Crear cuenta</button>
            </div>
            <small>Después de ingresar, pedí el acceso desde esta misma página.</small>
          </>
        ) : rechazado ? (
          <div className="may-lock-no"><Info size={18} /> Tu pedido de acceso mayorista no fue aprobado. Igual podés comprar en la tienda, y si querés consultanos por WhatsApp.</div>
        ) : enviado ? (
          <>
            <div className="may-lock-ok"><CheckCircle size={18} /> Ya pediste el acceso. Te avisamos cuando esté aprobado.</div>
            {/* El cliente nos escribe desde su WhatsApp: así queda su número real para avisarle la aprobación */}
            {wa && <>
              <a className="btn btn-success may-lock-wa" href={waLink(wa, `Hola, soy ${user.nombre || user.usuario} (usuario: ${user.usuario}). Solicité acceso a la lista ${sec.nombre} y espero la aprobación.`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Avisar por WhatsApp</a>
              <small>Mandanos el aviso desde tu WhatsApp: así te escribimos ahí cuando esté aprobado.</small>
            </>}
          </>
        ) : (
          <button className="btn btn-primary" onClick={pedir} disabled={enviando}>{enviando ? 'Enviando…' : 'Solicitar acceso mayorista'}</button>
        )}
        {wa && !(user && enviado) && <a className="btn btn-outline may-lock-wa" href={waLink(wa, `Hola, quiero acceso a la lista ${sec.nombre}${user ? ` (mi usuario es ${user.usuario})` : ''}.`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> Consultar por WhatsApp</a>}
        <button className="link-btn" onClick={() => nav('landing')}>← Volver al inicio</button>
      </div>
    </div>
  );
}
// Aviso destacado de una tienda (condiciones de compra: armado, retiro, faltantes…). Se carga en Panel → Tiendas → Editar.
function avisoLineas(sec) { return String(sec?.aviso || '').split('\n').map(l => l.replace(/^[\s•\-*]+/, '').trim()).filter(Boolean); }
function AvisoSeccion({ sec, compacto, conNombre }) {
  const lineas = avisoLineas(sec);
  if (!lineas.length) return null;
  const titulo = String(sec.aviso_titulo || '').trim() || 'Importante';
  return (
    <div className={`aviso-sec${compacto ? ' compacto' : ''}`} role="note">
      <div className="aviso-sec-t"><AlertTriangle size={compacto ? 16 : 19} /><span>{conNombre ? `${sec.nombre} · ` : ''}{titulo}</span></div>
      <ul>{lineas.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
}
// Lista de pedido mayorista: como el Excel, agrupada por categoría (cada una con su color), con cantidad por fila
function ListaMayorista({ sec, onVista }) {
  const ctx = useContext(Ctx);
  const { cart, addToCart, updateCartQty, config, nav, toast } = ctx;
  const [prods, setProds] = useState(null);
  const [q, setQ] = useState('');
  const [soloPedido, setSoloPedido] = useState(false);
  useEffect(() => {
    let vivo = true; setProds(null);
    api.getProductos({ seccion_id: sec.id, limit: 5000, orden: 'lista' }).then(d => { if (vivo) setProds(d.productos || []); }).catch(() => { if (vivo) setProds([]); });
    return () => { vivo = false; };
  }, [sec.id]);
  // Altura del encabezado del sitio: los títulos de cada categoría quedan fijos justo debajo al bajar
  useEffect(() => {
    const medir = () => { const h = document.querySelector('.header'); document.documentElement.style.setProperty('--header-h', `${h ? h.getBoundingClientRect().height : 0}px`); };
    medir(); window.addEventListener('resize', medir); return () => window.removeEventListener('resize', medir);
  }, []);
  const clave = String(sec.id);
  const lineas = (cart && (cart[clave] || cart[sec.id])) || [];
  const verUsd = mostrarUsdSec(config, sec);
  const minUsdCfg = config?.[`compra_minima_moneda_${sec.id}`] === 'USD';
  const cotz = useCotizacionUsd(verUsd || minUsdCfg);
  const cv = cotz ? cotz.valor : 0;
  const secSinLimite = !!(sec.permitir_sin_stock || sec.ignorar_stock);
  const qtyDe = (id) => { const l = lineas.find(i => i.id === id && !i.variante_id); return l ? l.qty : 0; };
  const ordenCats = useMemo(() => { const o = {}; let n = 0; for (const p of (prods || [])) { const c = p.categoria || 'Sin categoría'; if (o[c] === undefined) o[c] = n++; } return o; }, [prods]);
  const colorDe = (c) => COLORES_CAT[(ordenCats[c] || 0) % COLORES_CAT.length];
  const toks = normTxt(q).split(/\s+/).filter(Boolean);
  const grupos = useMemo(() => {
    const out = []; const idx = {};
    for (const p of (prods || [])) {
      if (soloPedido && !qtyDe(p.id)) continue;
      if (toks.length) { const t = normTxt(`${p.nombre} ${p.modelo} ${p.categoria} ${p.compatibilidad}`); if (!toks.every(x => t.includes(x))) continue; }
      const c = p.categoria || 'Sin categoría';
      if (idx[c] === undefined) { idx[c] = out.length; out.push({ cat: c, items: [] }); }
      out[idx[c]].items.push(p);
    }
    // "Sin categoría" siempre al final
    out.sort((a, b) => (a.cat === 'Sin categoría') - (b.cat === 'Sin categoría'));
    return out;
  }, [prods, q, soloPedido, lineas]);
  const precioDe = (p) => precioTarjeta(p, ctx, sec.id);
  const nombreFila = (p) => { const n = String(p.nombre || ''); const c = String(p.categoria || ''); return (c && n.toLowerCase().startsWith(c.toLowerCase()) && p.modelo) ? p.modelo : (n || p.modelo); };
  const puedeComprar = (p) => (Number(p.stock) > 0) || p.permitir_sin_stock || p.es_digital || secSinLimite;
  const fijar = (p, valor) => {
    const n = Math.max(0, Math.floor(Number(valor) || 0)); const actual = qtyDe(p.id);
    if (n === actual) return;
    if (!actual) { if (n > 0) addToCart(clave, (secSinLimite && !p.permitir_sin_stock) ? { ...p, permitir_sin_stock: true } : p, n, precioDe(p).final, null, { silencioso: true }); }
    else updateCartQty(String(p.seccion_id || clave), p.id, n);
  };
  const unidades = lineas.reduce((a, i) => a + (i.qty || 0), 0);
  const subtotal = lineas.reduce((a, i) => a + (i.qty || 0) * (Number(i.precio_unitario) || 0), 0);
  const mn = minimoSec(config, sec.id, cv);
  const minimo = mn.ars;
  const falta = Math.max(0, minimo - subtotal);
  const irA = (k) => { const el = document.getElementById(`lm-cat-${k}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const descargar = async () => {
    try {
      const XLSX = await import('xlsx');
      const filas = (prods || []).map(p => ({ Categoría: p.categoria || '', Producto: nombreFila(p), Precio: precioDe(p).final, Pedido: qtyDe(p.id) || '', Total: qtyDe(p.id) ? qtyDe(p.id) * precioDe(p).final : '' }));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Lista');
      XLSX.writeFile(wb, `${sec.nombre || 'lista'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { toast('No se pudo descargar: ' + e.message, 'error'); }
  };
  const totalProds = grupos.reduce((a, g) => a + g.items.length, 0);
  return (
    <div className="sec-page lm">
      <div className="sec-head">
        <button className="link-btn sec-back" onClick={() => nav('landing')}>← Inicio</button>
        <div className="sec-head-row">
          <div style={{ minWidth: 0 }}>
            <h1 className="sec-title">{sec.nombre}</h1>
            <p className="sec-desc">{sec.descripcion || 'Lista mayorista'} · escribí la cantidad al lado de cada producto</p>
          </div>
          <div className="sec-head-actions">
            <VistaMayToggle vista="lista" onVista={onVista} />
            <button className="icon-btn" onClick={descargar} title="Descargar la lista en Excel" aria-label="Descargar la lista en Excel"><FileText size={17} /></button>
          </div>
        </div>
      </div>
      <AvisoSeccion sec={sec} />
      <div className="lm-tools">
        <label className="sec-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input placeholder="Buscar modelo o repuesto (ej: g84, a32, pin)" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar en la lista" />
          {q && <button className="sec-search-clear" onClick={() => setQ('')} aria-label="Borrar búsqueda">✕</button>}
        </label>
        <button type="button" className={`cat-chip${soloPedido ? ' sel' : ''}`} onClick={() => setSoloPedido(v => !v)} disabled={!unidades && !soloPedido}>Mi pedido{unidades ? ` (${lineas.length})` : ''}</button>
      </div>
      {prods && prods.length > 0 && !q && !soloPedido && (
        <div className="lm-indice" role="navigation" aria-label="Categorías">
          {grupos.map((g, k) => <button key={g.cat} type="button" style={{ '--c': colorDe(g.cat) }} onClick={() => irA(k)}><i />{g.cat}<small>{g.items.length}</small></button>)}
        </div>
      )}
      {!prods && <div className="lm-vacio">Cargando lista…</div>}
      {prods && !totalProds && <div className="lm-vacio">{q ? `No hay nada con "${q}".` : soloPedido ? 'Todavía no agregaste productos.' : 'La lista está vacía.'}</div>}
      <div className="lm-grupos">
        {grupos.map((g, k) => {
          const enPedido = g.items.reduce((a, p) => a + (qtyDe(p.id) ? 1 : 0), 0);
          return (
            <section key={g.cat} id={`lm-cat-${k}`} className="lm-grupo" style={{ '--c': colorDe(g.cat) }}>
              <header className="lm-cat"><span className="lm-cat-nombre">{g.cat}</span><span className="lm-cat-n">{g.items.length}{enPedido ? ` · ${enPedido} en tu pedido` : ''}</span></header>
              {g.items.map(p => {
                const pr = precioDe(p); const n = qtyDe(p.id); const ok = puedeComprar(p);
                return (
                  <div key={p.id} className={`lm-fila${n ? ' con' : ''}${ok ? '' : ' agotado'}`}>
                    <div className="lm-nombre">
                      {p.imagen ? <button type="button" className="lm-foto" onClick={() => ctx.setVistaRapida({ ...p, seccion_id: p.seccion_id || sec.id })} aria-label="Ver foto"><img src={imgOpt(p.imagen, 80)} alt="" loading="lazy" /></button> : null}
                      <span>{nombreFila(p)}</span>
                    </div>
                    <div className="lm-precio">{pr.original ? <s>{fmtARS(pr.original)}</s> : null}{pr.final > 0 ? fmtARS(pr.final) : 'Consultar'}{verUsd && cv > 0 && pr.final > 0 ? <small className="lm-usd">{fmtUSD(pr.final / cv)}</small> : null}</div>
                    {ok ? (
                      <div className="lm-qty">
                        <button type="button" onClick={() => fijar(p, n - 1)} disabled={!n} aria-label="Uno menos"><Minus size={14} /></button>
                        <input key={n} type="number" inputMode="numeric" min="0" defaultValue={n || ''} placeholder="0" aria-label={`Cantidad de ${nombreFila(p)}`}
                          onFocus={e => e.target.select()} onBlur={e => fijar(p, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                        <button type="button" onClick={() => fijar(p, n + 1)} aria-label="Uno más"><Plus size={14} /></button>
                      </div>
                    ) : <div className="lm-sin">Sin stock</div>}
                    <div className="lm-sub">{n ? fmtARS(n * pr.final) : ''}</div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
      <div className={`lm-barra${unidades ? ' con' : ''}`}>
        <div className="lm-barra-info">
          {unidades ? <><b>{fmtARS(subtotal)}</b>{verUsd && cv > 0 ? <span className="lm-usd-total">{fmtUSD(subtotal / cv)}</span> : null}<span>{lineas.length} producto{lineas.length !== 1 ? 's' : ''} · {unidades} u.</span></> : <span>Escribí la cantidad en cada producto que quieras pedir</span>}
          {mn.base > 0 && (
            <div className="lm-min">
              {minimo > 0 && <div className="lm-min-barra"><span style={{ width: `${Math.min(100, Math.round(subtotal / minimo * 100))}%` }} /></div>}
              <small>{minimo <= 0 ? `Compra mínima ${fmtUSD(mn.base)}`
                : falta > 0 ? (mn.usd ? `Te faltan ${fmtARS(falta)} para la compra mínima de ${fmtUSD(mn.base)} (hoy ${fmtARS(minimo)})` : `Te faltan ${fmtARS(falta)} para la compra mínima de ${fmtARS(minimo)}`)
                : 'Llegaste a la compra mínima'}{mn.soloEnvio && falta > 0 ? ' · para envío' : ''}</small>
            </div>
          )}
        </div>
        <button type="button" className="btn btn-primary" disabled={!unidades} onClick={() => nav('cart')}>Ver pedido</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CART PAGE
// ═══════════════════════════════════════════════════════════
// Checkout profesional por pasos: contacto, entrega, facturación (opcional), pago, resumen
// ═══════════════════════════════════════════════════════════
// ─── CARRITO + CHECKOUT ───
// Los precios, el envío de cada tienda, el cupón y los totales los calcula el
// SERVIDOR (/api/carrito/cotizar). Lo que se ve acá es exactamente lo que se cobra.
// ═══════════════════════════════════════════════════════════

// Clave estable de una línea del carrito (producto + variante)
const lineKey = (pid, vid) => `${pid}_${vid || 0}`;

// Calculador de envío por código postal (página de producto): usa la misma cotización que el carrito
function EnvioCalculadorProducto({ producto, varianteId, qty }) {
  const { config } = useContext(Ctx);
  const [cp, setCp] = useState(() => { try { return localStorage.getItem('gm_cp') || ''; } catch { return ''; } });
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const calcular = async (cpVal = cp) => {
    const limpio = String(cpVal || '').replace(/\D/g, '');
    if (limpio.length < 4) { setErr('Ingresá un código postal válido'); return; }
    setLoading(true); setErr('');
    try {
      try { localStorage.setItem('gm_cp', limpio); } catch {}
      const r = await api.cotizarCarrito({ entrega: { tipo: 'envio', cp: limpio }, secciones: [{ seccion_id: producto.seccion_id, items: [{ producto_id: producto.id, variante_id: varianteId || null, cantidad: qty || 1 }] }] });
      setRes(r.secciones && r.secciones[0] ? r.secciones[0] : null);
      if (r.avisos && r.avisos.length && (!r.secciones || !r.secciones.length)) setErr(r.avisos[0].mensaje);
    } catch (e) { setErr(e.message || 'No pudimos calcular el envío'); }
    setLoading(false);
  };
  if (producto?.es_digital) return null;
  const env = res?.envio;
  return (
    <div className="envio-calc">
      <div className="envio-calc-title"><Truck size={18} /> Calculá el costo de envío</div>
      {config?.aclaracion_envios && <div className="envio-calc-note"><Info size={14} /> {config.aclaracion_envios}</div>}
      <div className="envio-calc-row">
        <input value={cp} onChange={e => setCp(e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 8))} placeholder="Tu código postal" inputMode="numeric" onKeyDown={e => e.key === 'Enter' && calcular()} aria-label="Código postal" />
        <button className="btn btn-dark" onClick={() => calcular()} disabled={loading}>{loading ? 'Calculando…' : 'Calcular'}</button>
      </div>
      {err && <div className="envio-calc-err">{err}</div>}
      {env && (
        <div className="envio-opts">
          {env.gratis_seccion && <div className="envio-free-banner"><CheckCircle size={16} /> Este producto tiene envío gratis</div>}
          {env.opciones.length === 0 && <div className="envio-calc-muted">El envío se coordina por WhatsApp después de la compra.</div>}
          {env.opciones.map(o => (
            <div key={o.id} className="envio-opt static">
              <span className="envio-opt-ico"><RenderIcon value={o.icono || 'truck'} size={18} /></span>
              <span className="envio-opt-info"><b>{o.nombre}</b>{(o.tiempo_estimado || o.descripcion) && <small>{[o.tiempo_estimado, o.descripcion].filter(Boolean).join(' · ')}</small>}</span>
              <span className="envio-opt-precio">{o.a_cotizar ? <span className="envio-cotizar-tag">A cotizar</span> : o.costo > 0 ? fmtARS(o.costo) : <span className="envio-gratis-tag">Gratis{o.costo_original > 0 && <s>{fmtARS(o.costo_original)}</s>}</span>}</span>
            </div>
          ))}
          {!env.gratis_seccion && env.falta_para_gratis > 0 && <div className="envio-calc-muted">Sumando {fmtARS(env.falta_para_gratis)} más en esta tienda, el envío es gratis.</div>}
        </div>
      )}
    </div>
  );
}

function CheckoutModal({ user, cot: cotCarrito, entregaTipo, cp, metodos, config, testMode, onConfirm, onClose, recotizar }) {
  const { toast, secciones } = useContext(Ctx);
  const secsAviso = (cotCarrito.secciones || []).map(cs => (secciones || []).find(x => String(x.id) === String(cs.seccion_id))).filter(x => x && avisoLineas(x).length);
  const [aceptaAviso, setAceptaAviso] = useState(false);
  const [paso, setPaso] = useState(1);
  const [saving, setSaving] = useState(false);
  const [contacto, setContacto] = useState({ nombre: user?.nombre || '', telefono: user?.telefono || '', email: user?.email || '' });
  const [entrega, setEntrega] = useState({ calle: '', numero: '', piso: '', localidad: '', dni: '' });
  const [facturacion, setFacturacion] = useState({
    necesita: false, tipo: 'consumidor_final', razon_social: user?.nombre_fantasia || user?.nombre || '',
    cuit_dni: '', condicion_iva: 'consumidor_final', domicilio_fiscal: '',
  });
  const [metodoPago, setMetodoPago] = useState(metodos && metodos[0] ? (metodos[0].nombre || metodos[0]) : 'Transferencia');
  const [notas, setNotas] = useState('');
  // Con el medio de pago elegido se vuelve a cotizar en el servidor (ej. descuento por transferencia)
  const [cotPago, setCotPago] = useState(null);
  const [recotizando, setRecotizando] = useState(false);
  useEffect(() => {
    if (!recotizar) return undefined;
    let vivo = true;
    setCotPago(null); setRecotizando(true);
    recotizar(metodoPago).then(r => { if (vivo && r && Array.isArray(r.secciones)) setCotPago(r); }).catch(() => {}).finally(() => { if (vivo) setRecotizando(false); });
    return () => { vivo = false; };
  }, [metodoPago]);
  const cot = cotPago || cotCarrito;
  const pctPago = (nombre) => { const v = parseFloat(String(config[`descuento_${String(nombre || '').toLowerCase().replace(/\s+/g, '_')}`] || '').trim()); return v > 0 ? Math.min(v, 100) : 0; };
  const esEnvio = entregaTipo === 'envio' && cot.secciones.some(s => s.requiere_envio);
  const totales = cot.totales || {};

  const facturaActiva = config.checkout_factura !== 'off';
  const pasos = facturaActiva ? ['Contacto', 'Entrega', 'Facturación', 'Pago', 'Resumen'] : ['Contacto', 'Entrega', 'Pago', 'Resumen'];
  const pasoActual = pasos[paso - 1];
  const totalPasos = pasos.length;

  const validarPaso = () => {
    if (pasoActual === 'Contacto') {
      if (!contacto.nombre.trim() || contacto.nombre.trim().length < 3) { toast('Poné tu nombre completo', 'error'); return false; }
      if ((contacto.telefono || '').replace(/\D/g, '').length < 8) { toast('Poné un teléfono válido, con característica (ej: 11 2345 6789)', 'error'); return false; }
      if (contacto.email && contacto.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contacto.email.trim())) { toast('El email no es válido', 'error'); return false; }
    }
    if (pasoActual === 'Entrega' && esEnvio) {
      if (!entrega.calle.trim() || !entrega.numero.trim() || !entrega.localidad.trim()) { toast('Completá la dirección de envío (calle, número y localidad)', 'error'); return false; }
      if ((entrega.dni + '').replace(/\D/g, '').length < 7) { toast('Poné el DNI de quien recibe (lo pide el correo)', 'error'); return false; }
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
    try { await onConfirm({ contacto, entrega: { ...entrega, tipo: entregaTipo, cp }, facturacion: facturaActiva ? facturacion : { necesita: false }, metodoPago, notas }); }
    catch { /* el error ya se mostró */ }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
      <div className="modal checkout-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Finalizar compra</span>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="checkout-steps">
          {pasos.map((p, idx) => (
            <div key={p} className={`checkout-step${paso === idx + 1 ? ' activo' : ''}${paso > idx + 1 ? ' hecho' : ''}`}>
              <div className="checkout-step-bar" />
              {paso > idx + 1 && <Check size={11} strokeWidth={3} />} {p}
            </div>
          ))}
        </div>

        <div className="modal-body checkout-body">
          {pasoActual === 'Contacto' && (
            <div>
              <h4 className="checkout-h"><Phone size={16} /> Datos de contacto</h4>
              <p className="checkout-sub">Ya cargamos tus datos. Podés ajustarlos si querés.</p>
              <div className="form-group"><label className="form-label">Nombre *</label><input value={contacto.nombre} onChange={e => setContacto({ ...contacto, nombre: e.target.value })} autoComplete="name" /></div>
              <div className="form-group"><label className="form-label">Teléfono *</label><input value={contacto.telefono} onChange={e => setContacto({ ...contacto, telefono: e.target.value })} placeholder="Ej: 11 2345 6789" inputMode="tel" autoComplete="tel" /></div>
              <div className="form-group"><label className="form-label">Email</label><input value={contacto.email} onChange={e => setContacto({ ...contacto, email: e.target.value })} inputMode="email" autoComplete="email" /></div>
            </div>
          )}

          {pasoActual === 'Entrega' && (
            <div>
              <div className="checkout-entrega-tipo">
                <span>{esEnvio ? <><Truck size={16} /> Envío a domicilio · CP {cp}</> : <><Store size={16} /> Retiro en el local</>}</span>
                <button className="link-btn" onClick={onClose}>Cambiar en el carrito</button>
              </div>
              {!esEnvio ? (
                <p className="checkout-nota">Coordinás el retiro después de confirmar el pedido. Te contactamos por los datos que dejaste.</p>
              ) : (
                <div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}><label className="form-label">Calle *</label><input value={entrega.calle} onChange={e => setEntrega({ ...entrega, calle: e.target.value })} autoComplete="address-line1" /></div>
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Número *</label><input value={entrega.numero} onChange={e => setEntrega({ ...entrega, numero: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Piso/Depto</label><input value={entrega.piso} onChange={e => setEntrega({ ...entrega, piso: e.target.value })} /></div>
                    <div className="form-group" style={{ flex: 2 }}><label className="form-label">Localidad *</label><input value={entrega.localidad} onChange={e => setEntrega({ ...entrega, localidad: e.target.value })} autoComplete="address-level2" /></div>
                  </div>
                  <div className="form-group"><label className="form-label">DNI de quien recibe *</label><input value={entrega.dni} onChange={e => setEntrega({ ...entrega, dni: e.target.value })} placeholder="Sin puntos" inputMode="numeric" style={{ maxWidth: 200 }} /><small className="form-hint">El correo lo pide para entregar el paquete.</small></div>
                  <div className="checkout-envios">
                    {cot.secciones.filter(s => s.requiere_envio).map(s => (
                      <div key={s.seccion_id} className="checkout-envio-row"><span>{s.nombre}: {s.envio.elegido ? s.envio.elegido.nombre : 'a coordinar'}</span><b>{s.envio.costo > 0 ? fmtARS(s.envio.costo) : (s.envio.elegido ? (s.envio.a_cotizar ? 'A cotizar' : 'Gratis') : '—')}</b></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {pasoActual === 'Facturación' && (
            <div>
              <h4 className="checkout-h"><Bookmark size={16} /> Facturación</h4>
              <label className="check-line"><input type="checkbox" checked={facturacion.necesita} onChange={e => setFacturacion({ ...facturacion, necesita: e.target.checked })} /> Necesito factura</label>
              {!facturacion.necesita ? (
                <p className="checkout-nota">Si no necesitás factura, seguí al siguiente paso. Recibís tu comprobante de pedido igual.</p>
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

          {pasoActual === 'Pago' && (
            <div>
              <h4 className="checkout-h"><CreditCard size={16} /> Método de pago</h4>
              {metodos && metodos.length > 0 ? (
                <div className="pago-opts">
                  {metodos.map((m, idx) => {
                    const nombre = m.nombre || m;
                    return (
                      <label key={idx} className={`pago-opt${metodoPago === nombre ? ' sel' : ''}`}>
                        <input type="radio" checked={metodoPago === nombre} onChange={() => setMetodoPago(nombre)} />
                        <span className="pago-opt-ico"><RenderIcon value={m.icono} size={18} /></span>
                        <div>
                          <div className="pago-opt-nombre">{nombre}{pctPago(nombre) > 0 && <span className="pago-opt-off">−{pctPago(nombre)}%</span>}</div>
                          {(m.descripcion || m.instrucciones) && <div className="pago-opt-desc">{m.descripcion || m.instrucciones}</div>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={{ width: '100%' }}>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              )}
              <div className="form-group" style={{ marginTop: 16 }}><label className="form-label">Notas (opcional)</label><textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Alguna aclaración para tu pedido" /></div>
            </div>
          )}

          {pasoActual === 'Resumen' && (
            <div>
              <h4 className="checkout-h"><CheckCircle size={16} /> Revisá tu pedido</h4>
              <div className="resumen-box">
                {cot.secciones.map(s => (
                  <div key={s.seccion_id} className="resumen-sec">
                    {cot.secciones.length > 1 && <div className="resumen-sec-nombre">{s.nombre}</div>}
                    {s.items.map(i => (
                      <div key={lineKey(i.producto_id, i.variante_id)} className="resumen-linea">
                        <span>{i.cantidad}× {i.nombre_producto}{i.variante_label ? ` (${i.variante_label})` : ''}</span>
                        <span>{fmtMon(i.precio_unitario * i.cantidad, i.moneda)}</span>
                      </div>
                    ))}
                    {esEnvio && s.requiere_envio && <div className="resumen-linea muted"><span>Envío{s.envio.elegido ? ` · ${s.envio.elegido.nombre}` : ' · a coordinar'}</span><span>{s.envio.costo > 0 ? fmtARS(s.envio.costo) : (s.envio.elegido ? (s.envio.a_cotizar ? 'A cotizar' : 'Gratis') : '—')}</span></div>}
                    {s.descuento > 0 && <div className="resumen-linea ok"><span>Cupón {s.cupon}</span><span>-{fmtARS(s.descuento)}</span></div>}
                    {s.descuento_pago > 0 && <div className="resumen-linea ok"><span>Descuento pagando con {s.metodo_pago} ({s.descuento_pago_pct}%)</span><span>-{fmtARS(s.descuento_pago)}</span></div>}
                  </div>
                ))}
                {!(totales.total_usdt > 0 && !(totales.total > 0)) && <div className="resumen-total"><span>{totales.total_usdt > 0 ? 'Total en pesos' : 'Total'}</span><span>{fmtARS(totales.total)}</span></div>}
                {esEnvio && totales.envio_a_cotizar && <div className="resumen-nota"><Info size={14} /> El envío no está incluido: te lo cotizamos por WhatsApp según el peso y el destino.</div>}
                {totales.total_usdt > 0 && <div className="resumen-total usdt"><span>Total en USDT</span><span>{fmtMon(totales.total_usdt, 'USDT')}</span></div>}
              </div>
              {totales.total_usdt > 0 && (
                <div className="usdt-box">
                  <div className="usdt-box-t">Pago en USDT: {fmtMon(totales.total_usdt, 'USDT')}</div>
                  {totales.total > 0 && <div className="usdt-box-i">Lo que es en USDT sale en un pedido aparte, vinculado al de pesos. Son dos pagos separados.</div>}
                  {config.usdt_red && <div><strong>Red:</strong> {config.usdt_red}</div>}
                  {config.usdt_wallet && <div style={{ wordBreak: 'break-all' }}><strong>Wallet:</strong> {config.usdt_wallet}</div>}
                  {config.usdt_alias && <div><strong>Alias / Binance:</strong> {config.usdt_alias}</div>}
                  {config.usdt_instrucciones && <div className="usdt-box-i">{config.usdt_instrucciones}</div>}
                  {!config.usdt_wallet && !config.usdt_alias && <div className="usdt-box-i">Coordinamos el pago en USDT por WhatsApp al confirmar.</div>}
                </div>
              )}
              <div className="resumen-datos">
                <div><strong>Contacto:</strong> {contacto.nombre} · {contacto.telefono}</div>
                <div><strong>Entrega:</strong> {esEnvio ? `Envío a ${entrega.calle} ${entrega.numero}${entrega.piso ? ` (${entrega.piso})` : ''}, ${entrega.localidad} (CP ${cp})${entrega.dni ? ` · DNI ${entrega.dni}` : ''}` : 'Retiro en el local'}</div>
                <div><strong>Pago:</strong> {metodoPago}</div>
                {facturacion.necesita && <div><strong>Factura:</strong> {facturacion.razon_social} · {facturacion.cuit_dni}</div>}
              </div>
              {secsAviso.length > 0 && (
                <div className="aviso-ck">
                  {secsAviso.map(x => <AvisoSeccion key={x.id} sec={x} compacto conNombre={secsAviso.length > 1} />)}
                  <label className="aviso-ck-l"><input type="checkbox" checked={aceptaAviso} onChange={e => setAceptaAviso(e.target.checked)} /> <span>Leí y acepto estas condiciones</span></label>
                </div>
              )}
              {testMode && <p className="checkout-test"><FlaskConical size={14} /> Modo prueba: el pedido se marca como test.</p>}
            </div>
          )}
        </div>

        <div className="modal-footer checkout-footer">
          {paso > 1 ? <button className="btn btn-outline" onClick={anterior}>← Atrás</button> : <span />}
          {paso < totalPasos
            ? <button className="btn btn-primary" onClick={siguiente}>Siguiente →</button>
            : <button className="btn btn-primary" onClick={() => { if (secsAviso.length && !aceptaAviso) { toast('Marcá que leíste las condiciones del pedido', 'warning'); return; } confirmar(); }} disabled={saving || recotizando} style={{ minWidth: 170 }}>{saving ? 'Creando pedido…' : (testMode ? 'Confirmar (prueba)' : 'Confirmar pedido')}</button>}
        </div>
      </div>
    </div>
  );
}

// Pantalla de éxito post-checkout: número de pedido grande + botón para enviar el pedido por WhatsApp
// GTIN/EAN válido (8, 12, 13 o 14 dígitos con dígito verificador GS1)
const gtinValido = (g) => {
  const x = String(g || '');
  if (!/^\d+$/.test(x) || ![8, 12, 13, 14].includes(x.length)) return false;
  const d = x.split('').map(Number); const ver = d.pop();
  const suma = d.reverse().reduce((a, n, i) => a + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (suma % 10)) % 10 === ver;
};
// Fecha (AAAA-MM-DD) sumando días hábiles desde hoy
const fechaHabiles = (n) => {
  const d = new Date(); let k = 0;
  while (k < n) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) k++; }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// Reseñas de Clientes en Google: después de comprar, Google ofrece al cliente una encuesta (le llega por mail después de la entrega)
function useEncuestaGoogle(exito, config) {
  const hecho = useRef(false);
  useEffect(() => {
    const mid = String(config?.google_merchant_id || '').replace(/\D/g, '');
    if (hecho.current || !mid || !exito?.email || exito.test || !(exito.nums || []).length) return;
    hecho.current = true;
    const dias = exito.mayorista ? 7 : exito.entrega === 'retiro' ? 2 : 5;
    const datos = {
      merchant_id: Number(mid), order_id: exito.nums.join('-'), email: exito.email,
      delivery_country: 'AR', estimated_delivery_date: fechaHabiles(dias),
      ...(exito.gtins && exito.gtins.length ? { products: exito.gtins.map(g => ({ gtin: g })) } : {}),
    };
    window.renderOptIn = () => { try { window.gapi.load('surveyoptin', () => window.gapi.surveyoptin.render(datos)); } catch {} };
    if (window.gapi && window.gapi.load) { window.renderOptIn(); return; }
    if (!document.getElementById('gcr-platform')) {
      const sc = document.createElement('script'); sc.id = 'gcr-platform'; sc.async = true; sc.defer = true;
      sc.src = 'https://apis.google.com/js/platform.js?onload=renderOptIn';
      document.body.appendChild(sc);
    }
  }, []);
}

function PedidoExitoModal({ exito, config, onClose }) {
  useEncuestaGoogle(exito, config);
  const nums = exito.nums || [];
  const numStr = nums.map(n => `#${String(n).padStart(4, '0')}`).join(', ');
  const wa = waIntl(config?.whatsapp_flotante || config?.whatsapp || config?.whatsapp_numero || '');
  const nombre = exito.contacto?.nombre || '';
  const totalTxt = `${fmtARS(exito.total)}${exito.total_usdt > 0 ? ` + ${fmtMon(exito.total_usdt, 'USDT')}` : ''}`;
  // Compra con parte en pesos y parte en USDT: son pedidos separados, cada uno con su total y su moneda
  const peds = exito.pedidos || [];
  const mixta = peds.some(p => p.moneda === 'USDT') && peds.some(p => p.moneda !== 'USDT');
  const detalleMixto = peds.map(p => `#${String(p.id).padStart(4, '0')} (${p.moneda === 'USDT' ? 'en USDT' : 'en pesos'}): ${fmtPedido(p.total, p)}`).join(' y ');
  const msg = mixta
    ? `¡Hola! Soy ${nombre}. Acabo de hacer una compra con los pedidos ${detalleMixto}. Quiero coordinar el pago y la entrega.`
    : `¡Hola! Soy ${nombre}. Acabo de hacer el pedido ${numStr} por ${totalTxt}. Quiero coordinar el pago y la entrega.`;
  const waUrl = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}` : '';
  return (
    <div className="modal-overlay" style={{ zIndex: 3500 }}>
      <div className="modal" style={{ maxWidth: 420, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}><CheckCircle size={58} color="var(--success, #16a34a)" strokeWidth={2.5} style={{ display: 'inline-block' }} /></div>
          <h2 style={{ fontSize: 23, fontWeight: 900, margin: '0 0 4px' }}>¡Pedido confirmado!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px' }}>Anotá tu número de pedido</p>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{nums.length > 1 ? 'Pedidos' : 'Pedido'}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--primary)' }}>{numStr}</div>
            {mixta ? (
              <div className="exito-mixto">
                {peds.map(p => <div key={p.id}><span>Pedido #{String(p.id).padStart(4, '0')} · {p.moneda === 'USDT' ? 'en USDT' : 'en pesos'}</span><strong>{fmtPedido(p.total, p)}</strong></div>)}
                <small>Son dos pagos separados: uno en pesos y otro en USDT.</small>
              </div>
            ) : <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>Total: {totalTxt}</div>}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>Enviános el pedido por WhatsApp y coordinamos el pago y la entrega al toque.</p>
          {waUrl ? <a className="btn btn-success" href={waUrl} target="_blank" rel="noopener noreferrer" style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 800, marginBottom: 10, display: 'block' }}>Enviar pedido por WhatsApp</a> : null}
          <button className="btn btn-outline" onClick={onClose} style={{ width: '100%', padding: 12 }}>Volver a la tienda</button>
        </div>
      </div>
    </div>
  );
}

function CartPage() {
  const { secciones, user, nav, toast, cart, setCart, removeFromCart, updateCartQty, clearCart, testMode, config } = useContext(Ctx);
  // Cupón que llegó por link (?cupon=X): queda cargado solo
  const cuponPend = useMemo(() => { try { return localStorage.getItem('gm_cupon_pend') || ''; } catch { return ''; } }, []);
  const [cuponInput, setCuponInput] = useState(cuponPend);
  const [cupon, setCupon] = useState(cuponPend);
  const [, setTick] = useState(0); // refresca la cuenta regresiva del cupón
  const [metodos, setMetodos] = useState([]);
  const [entregaTipo, setEntregaTipo] = useState(() => localStorage.getItem('gm_entrega_tipo') || 'envio');
  const [cp, setCp] = useState(() => localStorage.getItem('gm_cp') || '');
  const [cpInput, setCpInput] = useState(() => localStorage.getItem('gm_cp') || '');
  const [envioSel, setEnvioSel] = useState({}); // { seccion_id: id de la opción de envío }
  const [cot, setCot] = useState(null);
  useEffect(() => { if (!cot?.cupon?.vence_at) return; const t = setInterval(() => setTick(x => x + 1), 30000); return () => clearInterval(t); }, [cot?.cupon?.vence_at]);
  const [cotizando, setCotizando] = useState(false);
  const [cotError, setCotError] = useState('');
  const [avisos, setAvisos] = useState([]);
  const [showMixPopup, setShowMixPopup] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [exito, setExito] = useState(null);
  const reqSeq = useRef(0);
  useEffect(() => { localStorage.setItem('gm_entrega_tipo', entregaTipo); }, [entregaTipo]);

  const _validSecIds = new Set(secciones.map(x => String(x.id)));
  const allItems = Object.entries(cart).flatMap(([secId, items]) =>
    _validSecIds.has(String(secId)) && Array.isArray(items) ? items.map(i => ({ ...i, seccion_id: Number(secId) })) : []
  ).filter(i => i.qty > 0);
  const seccionesConItems = secciones.filter(s => allItems.some(i => i.seccion_id === s.id));
  const cotUsdHook = useCotizacionUsd(seccionesConItems.some(x => mostrarUsdSec(config, x)));
  const itemsKey = JSON.stringify(allItems.map(i => [i.seccion_id, i.id, i.variante_id || 0, i.qty]));
  const envioKey = JSON.stringify(envioSel);

  // Cotizar en el servidor cada vez que cambia algo del carrito
  useEffect(() => {
    if (!allItems.length) { setCot(null); return; }
    const seq = ++reqSeq.current;
    setCotizando(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.cotizarCarrito({
          entrega: { tipo: entregaTipo, cp }, cupon,
          secciones: seccionesConItems.map(sec => ({
            seccion_id: sec.id, envio_id: envioSel[sec.id] || null,
            items: allItems.filter(i => i.seccion_id === sec.id).map(i => ({ producto_id: i.id, variante_id: i.variante_id || null, cantidad: i.qty })),
          })),
        });
        if (seq !== reqSeq.current) return;
        setCot(r); setCotError('');
        if (cupon && r.cupon && !r.cupon.ok) {
          const esPend = cupon === cuponPend;
          // Sin sesión, el cupón personal queda guardado hasta que ingrese
          if (esPend && !user && /sesi[oó]n/i.test(r.cupon.error || '')) toast(r.cupon.error || 'Iniciá sesión para usar tu cupón', 'warning');
          else { toast(r.cupon.error || 'Cupón no válido', 'error'); if (esPend) { try { localStorage.removeItem('gm_cupon_pend'); } catch {} } }
          setCupon('');
        }
        // El servidor avisa productos que ya no están o sin stock: corregir el carrito y avisar el motivo.
        // Excepción: lo mayorista con la sesión cerrada NO se saca (vuelve a estar disponible al ingresar).
        const avisosCorregir = (r.avisos || []).filter(a => !(a.tipo === 'requiere_acceso' && !user));
        if (avisosCorregir.length) {
          setAvisos(prev => Array.from(new Set([...prev, ...avisosCorregir.map(a => a.mensaje)])));
          setCart(prev => {
            const n = { ...prev };
            for (const k of Object.keys(n)) {
              if (!Array.isArray(n[k])) continue;
              n[k] = n[k].flatMap(it => {
                const a = avisosCorregir.find(x => x.producto_id === it.id && (x.variante_id || null) === (it.variante_id || null));
                if (!a) return [it];
                if (a.tipo === 'stock' && a.disponible > 0) return [{ ...it, qty: a.disponible }];
                return [];
              });
            }
            return n;
          });
        }
        // Elegir solo la opción de envío cuando hay una sola; limpiar elecciones que ya no existen
        setEnvioSel(prev => {
          let cambio = false; const n = { ...prev };
          for (const s of r.secciones || []) {
            const ops = s.envio?.opciones || [];
            if (n[s.seccion_id] && !ops.some(o => o.id === n[s.seccion_id])) { delete n[s.seccion_id]; cambio = true; }
            if (!n[s.seccion_id] && ops.length === 1 && entregaTipo === 'envio' && cp) { n[s.seccion_id] = ops[0].id; cambio = true; }
          }
          return cambio ? n : prev;
        });
      } catch (e) {
        if (seq === reqSeq.current) setCotError(e.message || 'No pudimos calcular el carrito');
      } finally {
        if (seq === reqSeq.current) setCotizando(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [itemsKey, entregaTipo, cp, cupon, envioKey, user?.id]);

  // Pop-up de carrito mixto: una vez por pedido (mientras el carrito tenga 2+ tiendas)
  useEffect(() => {
    if (seccionesConItems.length > 1 && !window.__mixPopupShown) { setShowMixPopup(true); window.__mixPopupShown = true; }
    if (seccionesConItems.length <= 1) window.__mixPopupShown = false;
  }, [seccionesConItems.length]);

  useEffect(() => {
    if (seccionesConItems.length > 0) api.getMetodosPago(seccionesConItems[0].id).then(setMetodos).catch(() => {});
  }, [seccionesConItems.length]);

  if (!allItems.length) {
    return (
      <div className="cart-empty">
        {/* Al confirmar, el carrito queda vacío: la pantalla de éxito tiene que mostrarse igual */}
        {exito && <PedidoExitoModal exito={exito} config={config} onClose={() => { setExito(null); nav('landing'); }} />}
        <div className="cart-empty-ico"><ShoppingCart size={40} /></div>
        <h3>Tu carrito está vacío</h3>
        <p>Cuando agregues productos los vas a ver acá.</p>
        <button onClick={() => nav('landing')} className="btn btn-primary">Ver productos</button>
      </div>
    );
  }

  // Productos mayoristas con la sesión cerrada: quedan guardados en el carrito (marcados) hasta que ingrese
  const sinSesion = new Map();
  if (!user) for (const a of (cot?.avisos || [])) if (a.tipo === 'requiere_acceso') sinSesion.set(lineKey(a.producto_id, a.variante_id), a);
  const faltaIngresar = sinSesion.size > 0;
  const srvSec = (secId) => cot?.secciones?.find(s => String(s.seccion_id) === String(secId));
  const srvItem = (secId, it) => srvSec(secId)?.items.find(x => x.producto_id === it.id && (x.variante_id || null) === (it.variante_id || null));
  const totales = cot?.totales || { subtotal: 0, envio: 0, descuento: 0, total: 0, total_usdt: 0 };
  const necesitaCp = entregaTipo === 'envio' && (cot?.secciones || []).some(s => s.requiere_envio && s.envio.opciones.length > 0) && !cp;
  const errores = cot?.errores || [];
  const puedeSeguir = !!cot && !cotizando && !cotError && !errores.length && !necesitaCp;
  const ahorro = (cot?.secciones || []).reduce((a, s) => a + s.items.filter(i => i.moneda === 'ARS').reduce((b, i) => b + Math.max(0, i.precio_base - i.precio_unitario) * i.cantidad, 0), 0);

  const aplicarCp = () => {
    const limpio = cpInput.replace(/\D/g, '');
    if (limpio.length < 4) { toast('Ingresá un código postal válido', 'error'); return; }
    setCp(limpio); try { localStorage.setItem('gm_cp', limpio); } catch {}
  };

  const guardarPresupuesto = async () => {
    if (!user) { toast('Necesitás iniciar sesión para guardar un presupuesto', 'warning'); nav('login'); return; }
    try {
      for (const sec of seccionesConItems) {
        const items = allItems.filter(i => i.seccion_id === sec.id).map(i => ({ producto_id: i.id, variante_id: i.variante_id || null, cantidad: i.qty }));
        if (items.length) await api.createPedido({ seccion_id: sec.id, tipo: 'presupuesto', items });
      }
      seccionesConItems.forEach(sec => clearCart(sec.id));
      toast('¡Presupuesto guardado! Te avisamos cuando lo revisemos.');
      nav('account');
    } catch (e) { toast(e.message, 'error'); }
  };

  // Compartir carrito: link que precarga el carrito + texto con el detalle
  const compartirCarrito = () => {
    const payload = allItems.map(i => ({ s: i.seccion_id, p: i.id, q: i.qty }));
    const encoded = codificarCarrito(payload);
    const link = `${window.location.origin}${window.location.pathname}?carrito=${encoded}`;
    let txt = `*Carrito armado para vos*\n\n`;
    for (const s of cot?.secciones || []) {
      txt += `*${s.nombre}*\n`;
      s.items.forEach(i => { txt += `• ${i.nombre_producto}${i.variante_label ? ` (${i.variante_label})` : ''} x${i.cantidad} — ${fmtMon(i.precio_unitario * i.cantidad, i.moneda)}\n`; });
      txt += '\n';
    }
    txt += `*Total: ${fmtARS(totales.total)}*${totales.total_usdt > 0 ? ` + ${fmtMon(totales.total_usdt, 'USDT')}` : ''}\n\nAbrí este link para continuar la compra:\n${link}`;
    // Productos de tiendas con aprobación (mayorista): quien abra el link los ve solo si su cuenta tiene acceso
    const restr = allItems.filter(i => secciones.find(x => String(x.id) === String(i.seccion_id))?.requiere_aprobacion).length;
    const aviso = () => { if (restr) toast(`${restr === allItems.length ? 'Este carrito es' : `${restr} de los productos son`} de la lista mayorista: quien abra el link tiene que ingresar con una cuenta mayorista aprobada para verlos.`, 'warning'); };
    if (navigator.share) navigator.share({ title: 'Carrito', text: txt }).then(aviso).catch(() => {});
    else navigator.clipboard.writeText(txt).then(() => { toast('Detalle del carrito copiado'); aviso(); }).catch(() => toast('No se pudo copiar', 'error'));
  };

  const abrirCheckout = () => {
    if (!user) { toast('Necesitás iniciar sesión para comprar', 'warning'); nav('login'); return; }
    if (!puedeSeguir) return;
    trackEvent('begin_checkout', 'InitiateCheckout', { value: totales.total, currency: 'ARS', num_items: allItems.length });
    setShowCheckout(true);
  };

  const checkout = async (dc) => {
    const datosEnvioJSON = JSON.stringify({ contacto: dc.contacto || {}, entrega: dc.entrega || {} });
    const datosFactJSON = dc.facturacion && dc.facturacion.necesita ? JSON.stringify(dc.facturacion) : '';
    const pedidos = seccionesConItems.map(sec => ({
      seccion_id: sec.id, envio_id: envioSel[sec.id] || null, metodo_pago: dc.metodoPago, notas: dc.notas || '',
      datos_envio: datosEnvioJSON, datos_facturacion: datosFactJSON,
      items: allItems.filter(i => i.seccion_id === sec.id).map(i => ({ producto_id: i.id, variante_id: i.variante_id || null, cantidad: i.qty, nombre_producto: i.nombre || i.modelo })),
    })).filter(p => p.items.length);
    try {
      const r = await api.createPedidosMulti(pedidos, testMode, { entrega: { tipo: entregaTipo, cp }, cupon });
      const tot = r?.totales || totales;
      trackEvent('purchase', 'Purchase', { value: tot.total, currency: 'ARS', num_items: allItems.length });
      seccionesConItems.forEach(sec => clearCart(sec.id));
      try { localStorage.removeItem('gm_cupon_pend'); } catch {}
      setShowCheckout(false);
      setExito({ nums: (r?.pedidos || []).map(p => p.id).filter(Boolean), pedidos: (r?.pedidos || []).filter(p => p && p.id).map(p => ({ id: p.id, moneda: p.moneda, total: p.total })), total: tot.total, total_usdt: tot.total_usdt, contacto: dc.contacto || {},
        // Para la encuesta de Reseñas de Clientes en Google
        email: (dc.contacto && dc.contacto.email) || user?.email || '', entrega: entregaTipo, test: !!testMode,
        mayorista: seccionesConItems.some(sec => sec.requiere_aprobacion),
        gtins: Array.from(new Set(allItems.map(i => String(i.codigo_barras || '').trim()).filter(gtinValido))) });
    } catch (e) { toast(e.message, 'error'); throw e; }
  };

  return (
    <div className="cart-page">
      <button onClick={() => nav('landing')} className="link-btn back-link">← Seguir comprando</button>
      <h2 className="cart-title"><ShoppingCart size={24} /> Carrito</h2>
      {testMode && <div className="test-pill"><FlaskConical size={13} /> MODO PRUEBA — los pedidos se marcan como test</div>}
      {exito && <PedidoExitoModal exito={exito} config={config} onClose={() => { setExito(null); nav('landing'); }} />}
      {showCheckout && cot && (
        <CheckoutModal user={user} cot={cot} entregaTipo={entregaTipo} cp={cp} metodos={metodos} config={config} testMode={testMode}
          onConfirm={checkout} onClose={() => setShowCheckout(false)}
          recotizar={(metodo) => api.cotizarCarrito({
            entrega: { tipo: entregaTipo, cp }, cupon, metodo_pago: metodo,
            secciones: seccionesConItems.map(sec => ({
              seccion_id: sec.id, envio_id: envioSel[sec.id] || null, metodo_pago: metodo,
              items: allItems.filter(i => i.seccion_id === sec.id).map(i => ({ producto_id: i.id, variante_id: i.variante_id || null, cantidad: i.qty })),
            })),
          })} />
      )}

      {showMixPopup && (
        <div className="modal-overlay" onClick={() => setShowMixPopup(false)} style={{ zIndex: 3000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ padding: '28px 24px' }}>
              <div className="mix-ico"><Store size={30} /></div>
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 12 }}>Tenés productos de {seccionesConItems.length} tiendas</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                Cada tienda se despacha por <strong>separado</strong> desde su propio depósito y tiene su <strong>propio envío</strong>. Vas a ver un solo total, pero recibís <strong>un pedido por cada tienda</strong>.
              </p>
              <button className="btn btn-primary" onClick={() => setShowMixPopup(false)} style={{ width: '100%' }}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {faltaIngresar && (
        <div className="cart-aviso">
          <div className="cart-aviso-t"><Lock size={15} /> Tenés productos de la lista mayorista guardados</div>
          <div className="cart-aviso-l">Ingresá con tu cuenta mayorista para ver sus precios y comprarlos. Siguen en tu carrito.</div>
          <button onClick={() => nav('login')} className="btn btn-primary btn-sm" style={{ marginTop: 6 }}>Ingresar</button>
        </div>
      )}
      {avisos.length > 0 && (
        <div className="cart-aviso">
          <div className="cart-aviso-t"><AlertCircle size={15} /> El carrito se actualizó</div>
          {avisos.map((a, i) => <div key={i} className="cart-aviso-l">• {a}</div>)}
          <button onClick={() => setAvisos([])} className="link-btn">Entendido</button>
        </div>
      )}

      {seccionesConItems.map(s => <AvisoSeccion key={s.id} sec={s} conNombre={seccionesConItems.length > 1} />)}

      {/* ¿Cómo lo recibís? */}
      <div className="entrega-switch" role="tablist">
        <button role="tab" aria-selected={entregaTipo === 'retiro'} className={entregaTipo === 'retiro' ? 'sel' : ''} onClick={() => setEntregaTipo('retiro')}><Store size={16} /> Retiro en el local</button>
        <button role="tab" aria-selected={entregaTipo === 'envio'} className={entregaTipo === 'envio' ? 'sel' : ''} onClick={() => setEntregaTipo('envio')}><Truck size={16} /> Envío a domicilio</button>
      </div>
      {entregaTipo === 'envio' && (
        <div className="cp-box">
          <label htmlFor="cart-cp"><MapPin size={15} /> ¿Dónde lo recibís?</label>
          <div className="cp-row">
            <input id="cart-cp" value={cpInput} onChange={e => setCpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))} placeholder="Código postal" inputMode="numeric" onKeyDown={e => e.key === 'Enter' && aplicarCp()} />
            <button className="btn btn-dark" onClick={aplicarCp}>{cp && cpInput === cp ? 'Listo' : 'Calcular'}</button>
          </div>
          {!cp && <small>Con tu código postal calculamos el envío de cada tienda.</small>}
        </div>
      )}

      {seccionesConItems.map(sec => {
        const secItems = allItems.filter(i => i.seccion_id === sec.id);
        const s = srvSec(sec.id);
        const secSubtotal = s ? s.subtotal : 0;
        const gratisDesde = s ? s.envio.umbral : (Number(config[`envio_gratis_desde_${sec.id}`]) || 0);
        const compraMinima = s ? s.compra_minima : (Number(config[`compra_minima_${sec.id}`]) || 0);
        const aplicaRetiro = config[`min_aplica_retiro_${sec.id}`] === 'true';
        const minEnvio = (entregaTipo === 'envio' || aplicaRetiro) ? compraMinima : 0;
        const gratis = entregaTipo === 'envio' ? gratisDesde : 0;
        const tope = Math.max(minEnvio, gratis) || 1;
        const pct = Math.min(100, (secSubtotal / tope) * 100);
        const llegoMin = minEnvio <= 0 || secSubtotal >= minEnvio;
        const llegoGratis = !!s?.envio.gratis_seccion || (gratis > 0 && secSubtotal >= gratis);
        return (
          <section key={sec.id} className="cart-sec">
            <h3 className="cart-sec-t">{sec.nombre} <span>{secItems.length} {secItems.length === 1 ? 'producto' : 'productos'}</span></h3>

            {(minEnvio > 0 || gratis > 0) && s && (
              <div className="meta-bar">
                <div className="meta-track"><div className={`meta-fill${llegoGratis ? ' ok' : ''}`} style={{ width: `${pct}%` }} />
                  {minEnvio > 0 && minEnvio < tope && <div className={`meta-hito${llegoMin ? ' ok' : ''}`} style={{ left: `${(minEnvio / tope) * 100}%` }}><span>{entregaTipo === 'envio' ? 'Envío' : 'Mínimo'}</span></div>}
                  {gratis > 0 && <div className={`meta-hito gratis${llegoGratis ? ' ok' : ''}`} style={{ left: `${Math.min(100, (gratis / tope) * 100)}%` }}><span>Gratis</span></div>}
                </div>
                <div className={`meta-msg${!llegoMin ? ' warn' : llegoGratis ? ' ok' : ''}`}>
                  {!llegoMin ? <>Te faltan <b>{fmtARS(minEnvio - secSubtotal)}</b> para {entregaTipo === 'envio' && !aplicaRetiro ? 'habilitar el envío' : 'la compra mínima'}{s && s.compra_minima_usd ? ` de ${fmtUSD(s.compra_minima_usd)}` : ''}</>
                    : llegoGratis ? <><CheckCircle size={14} /> ¡Tenés <b>envío gratis</b> en esta tienda!</>
                    : gratis > 0 ? <>Te faltan <b>{fmtARS(gratis - secSubtotal)}</b> para tener <b>envío gratis</b></>
                    : <><Check size={14} /> Mínimo alcanzado</>}
                </div>
              </div>
            )}

            {secItems.map(i => {
              const si = srvItem(sec.id, i);
              const pu = si ? si.precio_unitario : puItem(i);
              const mon = si ? si.moneda : monedaItem(i);
              const base = si ? si.precio_base : Number(i.precio_base) || 0;
              const nd = sinSesion.get(lineKey(i.id, i.variante_id));
              return (
                <div key={lineKey(i.id, i.variante_id)} className={`cart-line${nd ? ' no-disp' : ''}`}>
                  {i.imagen ? <img src={imgOpt(i.imagen, 160)} alt="" className="cart-line-img" /> : <div className="cart-line-img ph"><Smartphone size={20} /></div>}
                  <div className="cart-line-info">
                    <div className="cart-line-name">{i.nombre || i.modelo}</div>
                    {i.variante_label && <div className="cart-line-var">{i.variante_label}</div>}
                    {nd ? <div className="cart-line-nd"><AlertCircle size={13} /> Ingresá con tu cuenta mayorista para comprarlo</div>
                      : <div className="cart-line-pu">{mon === 'ARS' && base > pu ? <><s>{fmtARS(base)}</s> <b>{fmtARS(pu)}</b></> : fmtMon(pu, mon)} c/u</div>}
                  </div>
                  <div className="qty-ctl">
                    <button onClick={() => updateCartQty(sec.id, i.id, i.qty - 1, i.variante_id)} aria-label="Restar uno">−</button>
                    <input type="number" min="1" value={i.qty} onChange={e => { const v = parseInt(e.target.value) || 1; updateCartQty(sec.id, i.id, Math.max(1, v), i.variante_id); }} aria-label="Cantidad" />
                    <button onClick={() => updateCartQty(sec.id, i.id, i.qty + 1, i.variante_id)} aria-label="Sumar uno">+</button>
                  </div>
                  <span className="cart-line-total">{nd ? '—' : si ? fmtMon(pu * i.qty, mon) : '…'}</span>
                  <button onClick={() => removeFromCart(sec.id, i.id, i.variante_id)} className="cart-line-del" aria-label="Quitar del carrito"><Trash2 size={15} /></button>
                </div>
              );
            })}

            {/* Envío de esta tienda */}
            {s && s.requiere_envio && entregaTipo === 'envio' && (
              <div className="envio-opts">
                {!cp && s.envio.opciones.length > 0 ? <div className="envio-calc-muted">Ingresá tu código postal arriba para ver las opciones de envío.</div>
                  : s.envio.a_coordinar ? <div className="envio-calc-muted"><Info size={14} /> El envío de esta tienda se coordina por WhatsApp después de la compra.</div>
                  : s.envio.opciones.map(o => (
                    <label key={o.id} className={`envio-opt${envioSel[sec.id] === o.id ? ' sel' : ''}`}>
                      <input type="radio" name={`envio-${sec.id}`} checked={envioSel[sec.id] === o.id} onChange={() => setEnvioSel(prev => ({ ...prev, [sec.id]: o.id }))} />
                      <span className="envio-opt-ico"><RenderIcon value={o.icono || 'truck'} size={18} /></span>
                      <span className="envio-opt-info"><b>{o.nombre}</b>{(o.tiempo_estimado || o.descripcion) && <small>{[o.tiempo_estimado, o.descripcion].filter(Boolean).join(' · ')}</small>}</span>
                      <span className="envio-opt-precio">{o.a_cotizar ? <span className="envio-cotizar-tag">A cotizar</span> : o.costo > 0 ? fmtARS(o.costo) : <span className="envio-gratis-tag">Gratis{o.costo_original > 0 && <s>{fmtARS(o.costo_original)}</s>}</span>}</span>
                    </label>
                  ))}
              </div>
            )}
            {s && entregaTipo === 'retiro' && s.requiere_envio && <div className="envio-calc-muted"><Store size={14} /> Retirás en el local. Te avisamos cuando esté listo.</div>}

            <div className="cart-sec-sub">
              <span>Total {sec.nombre}{s && s.envio.costo > 0 ? ' (con envío)' : s && entregaTipo === 'envio' && s.envio.a_cotizar ? ' (+ envío a cotizar)' : ''}</span>
              <span>{s ? fmtARS(s.total) : '…'}</span>
            </div>
            {(() => { const cv = (cot && cot.usd && cot.usd.valor) || (cotUsdHook && cotUsdHook.valor) || 0; return s && cv > 0 && mostrarUsdSec(config, sec) ? <div className="cart-sec-sub cart-usd"><span>En dólares <small>(dólar a ${fmt(cv)})</small></span><span>{fmtUSD(s.total / cv)}</span></div> : null; })()}
            {s && s.subtotal_usdt > 0 && <div className="cart-sec-sub"><span>Subtotal USDT {sec.nombre}</span><span>{fmtMon(s.subtotal_usdt, 'USDT')}</span></div>}
          </section>
        );
      })}

      {/* Cupón */}
      <div className="cupon-box">
        {cupon && cot?.cupon?.ok ? (
          <div className="cupon-ok"><Tag size={15} /> Cupón <b>{cot.cupon.codigo}</b> aplicado <button className="link-btn" onClick={() => { setCupon(''); setCuponInput(''); try { localStorage.removeItem('gm_cupon_pend'); } catch {} }}>Quitar</button>
            {cot.cupon.vence_at && <span className="cupon-vence"><Clock size={13} /><span>{faltaTxt(cot.cupon.vence_at) ? <>Vence en <b>{faltaTxt(cot.cupon.vence_at)}</b>: cerrá la compra antes</> : 'El cupón venció'}</span></span>}
          </div>
        ) : (
          <div className="cupon-row">
            <input placeholder="Código de cupón" value={cuponInput} onChange={e => setCuponInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && cuponInput.trim() && setCupon(cuponInput.trim())} />
            <button className="btn btn-outline" onClick={() => cuponInput.trim() && setCupon(cuponInput.trim())}>Aplicar</button>
          </div>
        )}
      </div>

      <div className="cart-totales">
        {cot && cot.secciones.length > 1 && cot.secciones.map(s => (
          <div key={s.seccion_id} className="cart-tot-l muted"><span>{s.nombre}</span><span>{fmtARS(s.total)}</span></div>
        ))}
        <div className="cart-tot-l"><span>Productos</span><span>{fmtARS(totales.subtotal)}</span></div>
        {ahorro > 0 && <div className="cart-tot-l ok small"><span>Ya incluye {fmtARS(ahorro)} de descuentos</span><span /></div>}
        {entregaTipo === 'envio' && <div className="cart-tot-l"><span>Envío</span><span>{totales.envio > 0 ? fmtARS(totales.envio) : (cp ? 'Gratis / a coordinar' : 'Ingresá tu CP')}</span></div>}
        {totales.descuento > 0 && <div className="cart-tot-l ok"><span>Cupón</span><span>-{fmtARS(totales.descuento)}</span></div>}
        <div className="cart-tot-sep" />
        <div className="cart-tot-total"><span>Total</span><span>{cotizando && !cot ? '…' : fmtARS(totales.total)}</span></div>
        {totales.total_usdt > 0 && <div className="cart-tot-total usdt"><span>Total USDT</span><span>{fmtMon(totales.total_usdt, 'USDT')}</span></div>}
        {totales.total_usdt > 0 && <p className="cart-tot-nota">Los productos en USDT van en un pedido aparte y se pagan aparte (los datos aparecen en el checkout).</p>}
      </div>

      {(cotError || errores.length > 0 || necesitaCp) && (
        <div className="cart-errores">
          {cotError && <div><AlertCircle size={14} /> {cotError}</div>}
          {necesitaCp && <div><MapPin size={14} /> Ingresá tu código postal para calcular el envío.</div>}
          {!necesitaCp && errores.map((e, i) => <div key={i}><AlertCircle size={14} /> {e.mensaje}</div>)}
        </div>
      )}

      <button onClick={abrirCheckout} disabled={!puedeSeguir} className="btn btn-primary cart-cta">
        {cotizando ? 'Calculando…' : !puedeSeguir ? <><Lock size={15} /> Completá lo que falta</> : (testMode ? 'Continuar (prueba) →' : 'Continuar al checkout →')}
      </button>

      <div className="cart-sec-actions">
        <button onClick={guardarPresupuesto} className="btn btn-outline"><ClipboardList size={15} /> Guardar como presupuesto</button>
        <button onClick={compartirCarrito} className="btn btn-outline"><Share2 size={15} /> Compartir carrito</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── GENERADOR DE IMAGEN PARA REDES (Instagram/Facebook) ───
function _wrapText(ctx, text, maxW, maxLines) {
  const words = String(text || '').split(/\s+/);
  const lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; if (lines.length >= maxLines) break; }
    else cur = test;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines) { let last = lines[maxLines - 1]; while (ctx.measureText(last + '…').width > maxW && last.length) last = last.slice(0, -1); if (words.join(' ') !== lines.join(' ')) lines[maxLines - 1] = last + '…'; }
  return lines;
}
function _roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// Estilos de la imagen para redes
const REDES_ESTILOS = {
  oferta: { label: 'Oferta', fondo: ['#ffd400', '#ff9f00'], card: '#ffffff', texto: '#141414', sub: 'rgba(20,20,20,0.72)', tag: '#e3172d', tagTexto: '#ffffff', chip: '#141414', chipTexto: '#ffd400', sello: '#e3172d', pie: '#141414', pieTexto: '#ffffff', marca: '#b4121f' },
  oscuro: { label: 'Oscuro', fondo: ['#16161b', '#060608'], card: '#ffffff', texto: '#ffffff', sub: 'rgba(255,255,255,0.68)', tag: null, tagTexto: '#ffffff', chip: 'rgba(255,255,255,0.12)', chipTexto: '#ffffff', sello: '#e3172d', pie: null, pieTexto: '#ffffff', marca: null },
  claro: { label: 'Claro', fondo: ['#f4f5f8', '#e9ebf1'], card: '#ffffff', texto: '#121318', sub: 'rgba(18,19,24,0.62)', tag: '#121318', tagTexto: '#ffffff', chip: null, chipTexto: '#ffffff', sello: '#e3172d', pie: '#121318', pieTexto: '#ffffff', marca: null },
};
function _imgContain(ctx, img, x, y, w, h) {
  if (!img || !img.width) return;
  const r = Math.min(w / img.width, h / img.height);
  const dw = img.width * r, dh = img.height * r;
  try { ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); } catch (e) {}
}
function _pill(ctx, text, x, y, h, bg, fg, font, padX) {
  ctx.font = font; const tw = ctx.measureText(text).width; const w = tw + padX * 2;
  ctx.fillStyle = bg; _roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, x + padX, y + h / 2 + 1); ctx.textBaseline = 'alphabetic';
  return w;
}
// Saca el fondo claro y parejo de una foto (típico de las fotos de proveedor) y recorta al producto.
// Devuelve un canvas con fondo transparente, o null si la foto no tiene un fondo así (o no se puede leer).
function _quitarFondo(img, tol = 42) {
  try {
    if (!img || !img.width) return null;
    const sc = Math.min(1, 1100 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h), px = d.data;
    // Color del fondo: mediana del borde
    const R = [], G = [], B = []; let transp = 0, tot = 0;
    const tomar = (i) => { const k = i * 4; tot++; if (px[k + 3] < 20) { transp++; return; } R.push(px[k]); G.push(px[k + 1]); B.push(px[k + 2]); };
    for (let i = 0; i < w; i += 2) { tomar(i); tomar((h - 1) * w + i); }
    for (let j = 0; j < h; j += 2) { tomar(j * w); tomar(j * w + w - 1); }
    if (transp / tot > 0.6) return c; // ya viene sin fondo (PNG)
    const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1] || 0; };
    const bg = [med(R), med(G), med(B)];
    if (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2] < 185) return null; // fondo oscuro o de color: no se toca
    const t2 = tol * tol;
    const d2 = (k) => { const a = px[k] - bg[0], b = px[k + 1] - bg[1], e = px[k + 2] - bg[2]; return a * a + b * b + e * e; };
    let parejos = 0, cuenta = 0;
    for (let i = 0; i < w; i += 3) { cuenta += 2; if (d2(i * 4) < t2) parejos++; if (d2(((h - 1) * w + i) * 4) < t2) parejos++; }
    if (parejos / cuenta < 0.55) return null; // el borde no es un fondo parejo
    // Relleno desde los bordes (solo se borra el fondo conectado al borde: lo blanco del producto queda)
    const N = w * h, fondo = new Uint8Array(N), pila = new Int32Array(N); let sp = 0;
    const empujar = (i) => { if (!fondo[i] && d2(i * 4) < t2) { fondo[i] = 1; pila[sp++] = i; } };
    for (let i = 0; i < w; i++) { empujar(i); empujar((h - 1) * w + i); }
    for (let j = 0; j < h; j++) { empujar(j * w); empujar(j * w + w - 1); }
    while (sp) {
      const i = pila[--sp], cx = i % w;
      if (cx > 0) empujar(i - 1); if (cx < w - 1) empujar(i + 1);
      if (i >= w) empujar(i - w); if (i < N - w) empujar(i + w);
    }
    // Borde suave (sin serrucho) y recorte al producto
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let i = 0; i < N; i++) {
      const k = i * 4;
      if (fondo[i]) { px[k + 3] = 0; continue; }
      const cx = i % w, cy = (i / w) | 0;
      const vecino = (cx > 0 && fondo[i - 1]) || (cx < w - 1 && fondo[i + 1]) || (cy > 0 && fondo[i - w]) || (cy < h - 1 && fondo[i + w]);
      if (vecino) { const dd = Math.sqrt(d2(k)); if (dd < tol * 2) px[k + 3] = Math.round(px[k + 3] * Math.max(0.15, (dd - tol) / tol)); }
      if (px[k + 3] > 24) { if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy; }
    }
    if (x1 < 0 || (x1 - x0) * (y1 - y0) < N * 0.02) return null; // casi no quedó nada: mejor no tocar
    x.putImageData(d, 0, 0);
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  } catch (e) { return null; } // foto sin permiso de lectura (CORS)
}
// Versión del diseño de la imagen para redes (se muestra en el modal). Para volver a una versión, restaurar
// drawRedesImagen/ImagenRedesModal desde su commit: v1 5c79a39 · v2 fa5b303 · v3 11d1940
const REDES_VERSION = 3;
// Achica una imagen (al estirarla después queda suave, sin detalle): para el logo de fondo
function _suave(img, ancho = 300) {
  try {
    if (!img || !img.width) return null;
    const sc = Math.min(1, ancho / img.width);
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } catch (e) { return img; }
}
// ¿Alguna parte visible del producto (alfa) queda debajo de alguno de los rectángulos?
function _tapa(alfa, iw, ih, c, rects) {
  const sx = iw / c.dw, sy = ih / c.dh;
  for (const r of rects) {
    const x0 = Math.max(0, Math.floor((r.x - c.dx) * sx)), x1 = Math.min(iw, Math.ceil((r.x + r.w - c.dx) * sx));
    const y0 = Math.max(0, Math.floor((r.y - c.dy) * sy)), y1 = Math.min(ih, Math.ceil((r.y + r.h - c.dy) * sy));
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) if (alfa[(y * iw + x) * 4 + 3] > 40) return true;
  }
  return false;
}
function drawRedesImagen(canvas, o) {
  const { formato, estilo = 'oferta', imgEl, imgSF, logoEl, logoSF, logoMA, logoFondo, nombre, marca, precioStr, precioViejo, descuento, ahorroStr, chips = [], titular, storeName, dominio, whatsapp } = o;
  let primary = '#4A69E2';
  try { const c = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(); if (c) primary = c; } catch (e) {}
  const E = { ...REDES_ESTILOS[estilo] || REDES_ESTILOS.oferta };
  if (!E.tag) E.tag = primary; if (!E.chip) E.chip = primary; if (!E.pie) E.pie = primary; if (!E.marca) E.marca = estilo === 'oscuro' ? '#8fa6ff' : primary;
  const story = formato === 'story';
  const W = 1080, H = story ? 1920 : 1080, P = 56;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const F = (peso, px) => `${peso} ${px}px Archivo, "Helvetica Neue", Arial, sans-serif`;
  // Fondo
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, E.fondo[0]); g.addColorStop(1, E.fondo[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (estilo === 'oscuro') { const rg = ctx.createRadialGradient(W * 0.5, H * 0.3, 40, W * 0.5, H * 0.3, W * 0.9); rg.addColorStop(0, 'rgba(120,140,255,0.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
  // Historias: Instagram tapa ~180 px arriba (perfil) y abajo (responder): ahí no va nada importante
  const safeTop = story ? 180 : 0, safeBot = story ? 180 : 0;
  // Barra de arriba (se dibuja al final, encima de todo): logo (o nombre de la tienda) + texto destacado
  const topY = story ? safeTop : 34, topH = story ? 92 : 74, headBot = topY + topH;
  const logoTop = logoSF || logoEl;
  let logoRect = null, titRect = null;
  const th = story ? 72 : 60, tf = F(900, story ? 36 : 30);
  if (logoTop && logoTop.width) logoRect = { x: P, y: topY, w: Math.min(300, topH * (logoTop.width / logoTop.height) + 28), h: topH };
  else if (storeName) { ctx.font = F(900, 30); logoRect = { x: P, y: topY + (topH - 64) / 2, w: ctx.measureText(storeName.toUpperCase()).width + 52, h: 64 }; }
  if (titular) { ctx.font = tf; const tw = ctx.measureText(titular.toUpperCase()).width + 56; titRect = { x: W - P - tw, y: topY + (topH - th) / 2, w: tw, h: th }; }
  // Se arma de abajo hacia arriba: pie → precio → (beneficios) → nombre → marca + beneficios; la foto ocupa lo que queda
  const pieH = story ? 150 : 80, pieY = H - safeBot - pieH;
  const tagH = story ? 124 : 92, tagY = pieY - (story ? 32 : 20) - tagH;
  const chipH = story ? 54 : 42, cf = F(800, story ? 26 : 21), cpad = story ? 22 : 18;
  ctx.font = cf;
  const chipsW = chips.reduce((a, c) => a + ctx.measureText(c).width + cpad * 2, 0) + Math.max(0, chips.length - 1) * 12;
  const marcaSize = story ? 30 : 24, marcaTxt = marca ? String(marca).toUpperCase() : '';
  ctx.font = F(900, marcaSize); const marcaW = marcaTxt ? ctx.measureText(marcaTxt).width : 0;
  // Los beneficios van en la misma fila que la marca si entran (ahorra una fila y la foto queda más grande)
  const chipsEnFila = chips.length > 0 && marcaW + (marcaTxt ? 32 : 0) + chipsW <= W - P * 2;
  let base = tagY - (story ? 26 : 16), chipsY = null, chipsX = P;
  if (chips.length && !chipsEnFila) { chipsY = base - chipH; base = chipsY - (story ? 24 : 14); }
  const nameSize = story ? 50 : 38, lineH = story ? 58 : 45;
  ctx.font = F(800, nameSize);
  const lineas = _wrapText(ctx, nombre, W - P * 2, story ? 3 : 2);
  const lastBase = base - 6, firstBase = lastBase - (lineas.length - 1) * lineH;
  let textoTop = firstBase - nameSize - (story ? 22 : 14), marcaBase = null;
  if (marcaTxt || chipsEnFila) {
    const filaH = chipsEnFila ? chipH : marcaSize, filaTop = firstBase - nameSize - (story ? 16 : 10) - filaH;
    if (marcaTxt) marcaBase = filaTop + filaH / 2 + marcaSize * 0.36;
    if (chipsEnFila) { chipsY = filaTop; chipsX = marcaTxt ? W - P - chipsW : P; }
    textoTop = filaTop - (story ? 22 : 14);
  }
  // Zona de la foto
  const zonaTop = headBot + (story ? 14 : 10), zonaBot = textoTop;
  // Logo de fondo: grande, suave y casi transparente, detrás del producto
  const marcaAgua = logoFondo ? (logoMA || logoSF || logoEl) : null;
  if (marcaAgua && marcaAgua.width) {
    ctx.save(); ctx.globalAlpha = estilo === 'oscuro' ? 0.075 : 0.06; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    _imgContain(ctx, marcaAgua, P / 2, zonaTop, W - P, zonaBot - zonaTop); ctx.restore();
  }
  let selloY;
  if (imgSF && imgSF.width) {
    // Producto sin fondo: lo más grande posible, apoyado sobre una sombra
    const M = story ? 30 : 26, aw = W - M * 2, piso = story ? 26 : 20;
    const encaje = (top) => { const ah = zonaBot - piso - top; const r = Math.min(aw / imgSF.width, ah / imgSF.height); const dw = imgSF.width * r, dh = imgSF.height * r; return { dx: M + (aw - dw) / 2, dy: top + (ah - dh) / 2, dw, dh, alto: dh >= ah - 1 }; };
    let pos = encaje(zonaTop);
    if (pos.alto) {
      // Si la forma lo permite, sube entre el logo y el texto destacado sin taparlos
      let alfa = null;
      try { alfa = imgSF.getContext ? imgSF.getContext('2d').getImageData(0, 0, imgSF.width, imgSF.height).data : null; } catch (e) {}
      const tapas = [logoRect, titRect].filter(Boolean).map(r => ({ x: r.x - 14, y: r.y - 14, w: r.w + 28, h: r.h + 28 }));
      if (alfa) for (let top = topY - (story ? 0 : 8); top < zonaTop; top += 12) { const c = encaje(top); if (!_tapa(alfa, imgSF.width, imgSF.height, c, tapas)) { pos = c; break; } }
    }
    const { dx, dy, dw, dh } = pos;
    ctx.save(); ctx.translate(dx + dw / 2, dy + dh + 6); ctx.scale(1, 0.16);
    const rx = Math.max(60, dw * 0.46); const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    sg.addColorStop(0, estilo === 'oscuro' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.30)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.shadowColor = estilo === 'oscuro' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.22)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 18;
    try { ctx.drawImage(imgSF, dx, dy, dw, dh); } catch (e) {}
    ctx.restore();
    selloY = zonaTop + (story ? 10 : 6);
  } else {
    // Foto con su fondo: en una tarjeta blanca
    const cardY = zonaTop + (story ? 20 : 10), cardX = P, cardW = W - P * 2, cardH = Math.max(story ? 420 : 300, zonaBot - cardY);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    ctx.fillStyle = E.card; _roundRect(ctx, cardX, cardY, cardW, cardH, 40); ctx.fill(); ctx.restore();
    ctx.save(); _roundRect(ctx, cardX, cardY, cardW, cardH, 40); ctx.clip();
    _imgContain(ctx, imgEl, cardX + 30, cardY + 30, cardW - 60, cardH - 60); ctx.restore();
    selloY = cardY + 22;
  }
  // Sello de descuento (arriba a la derecha de la foto)
  if (descuento >= 5) {
    const r = story ? 108 : 84, cx = W - P - r + 6, cy = selloY + r;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.18);
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = E.sello; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
    ctx.font = F(900, story ? 66 : 52); ctx.fillText(`-${descuento}%`, 0, story ? 12 : 10);
    ctx.font = F(900, story ? 29 : 23); ctx.fillText('OFF', 0, story ? 50 : 40);
    ctx.restore(); ctx.textAlign = 'left';
  }
  // Barra de arriba (encima de la foto)
  if (logoRect && logoTop && logoTop.width) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff'; _roundRect(ctx, logoRect.x, logoRect.y, logoRect.w, logoRect.h, 18); ctx.fill(); ctx.restore();
    _imgContain(ctx, logoTop, logoRect.x + 10, logoRect.y + 8, logoRect.w - 20, logoRect.h - 16);
  } else if (logoRect) {
    _pill(ctx, storeName.toUpperCase(), logoRect.x, logoRect.y, logoRect.h, '#ffffff', '#141414', F(900, 30), 26);
  }
  if (titRect) _pill(ctx, titular.toUpperCase(), titRect.x, titRect.y, titRect.h, estilo === 'oferta' ? '#141414' : E.sello, estilo === 'oferta' ? '#ffd400' : '#ffffff', tf, 28);
  // Pie: cómo comprar
  ctx.fillStyle = E.pie;
  if (story) { _roundRect(ctx, P, pieY, W - P * 2, pieH, 32); ctx.fill(); } else ctx.fillRect(0, pieY, W, pieH);
  ctx.fillStyle = E.pieTexto;
  if (story) {
    ctx.textAlign = 'center';
    ctx.font = F(900, 38); ctx.fillText('TOCÁ EL LINK PARA COMPRAR', W / 2, pieY + 62);
    ctx.font = F(600, 29); ctx.globalAlpha = 0.85; ctx.fillText([whatsapp ? `WhatsApp ${whatsapp}` : '', dominio].filter(Boolean).join('  ·  '), W / 2, pieY + 108); ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  } else {
    ctx.font = F(800, 29); ctx.textBaseline = 'middle';
    if (whatsapp) ctx.fillText(`Pedilo por WhatsApp ${whatsapp}`, P, pieY + pieH / 2);
    ctx.textAlign = whatsapp ? 'right' : 'left'; ctx.font = F(600, 27); ctx.globalAlpha = 0.85;
    ctx.fillText(dominio || '', whatsapp ? W - P : P, pieY + pieH / 2); ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  // Marca y nombre
  if (marcaTxt && marcaBase) { ctx.fillStyle = E.marca; ctx.font = F(900, marcaSize); ctx.fillText(marcaTxt, P, marcaBase); }
  ctx.fillStyle = E.texto; ctx.font = F(800, nameSize);
  lineas.forEach((ln, k) => ctx.fillText(ln, P, firstBase + k * lineH));
  // Beneficios
  if (chips.length && chipsY != null) {
    let x = chipsX;
    for (const c of chips) {
      ctx.font = cf; const w = ctx.measureText(c).width + cpad * 2;
      if (x + w > W - P + 1) break;
      const urg = c.startsWith('¡');
      _pill(ctx, c, x, chipsY, chipH, urg ? E.sello : E.chip, urg ? '#ffffff' : E.chipTexto, cf, cpad);
      x += w + 12;
    }
  }
  // Etiqueta de precio
  ctx.font = F(900, story ? 90 : 70); const pw = ctx.measureText(precioStr).width + (story ? 68 : 52);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
  ctx.fillStyle = E.tag; _roundRect(ctx, P, tagY, pw, tagH, 24); ctx.fill(); ctx.restore();
  ctx.fillStyle = E.tagTexto; ctx.textBaseline = 'middle'; ctx.fillText(precioStr, P + (story ? 34 : 26), tagY + tagH / 2 + 4); ctx.textBaseline = 'alphabetic';
  if (precioViejo) {
    const ox = P + pw + 28; ctx.fillStyle = E.sub; ctx.font = F(700, story ? 38 : 30);
    const oy = tagY + (ahorroStr ? tagH * 0.42 : tagH * 0.62);
    ctx.fillText(precioViejo, ox, oy);
    const ow = ctx.measureText(precioViejo).width; ctx.strokeStyle = E.sub; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox - 2, oy - (story ? 12 : 10)); ctx.lineTo(ox + ow + 2, oy - (story ? 12 : 10)); ctx.stroke();
    if (ahorroStr) { ctx.fillStyle = estilo === 'oferta' ? '#b4121f' : '#22c55e'; ctx.font = F(800, story ? 31 : 25); ctx.fillText(`Ahorrás ${ahorroStr}`, ox, oy + (story ? 46 : 36)); }
  }
}
function ImagenRedesModal({ producto, precioStr, precioViejo, descuento = 0, ahorroStr = '', envioGratis, stockBajo = 0, storeName, dominio, whatsapp = '', logoUrl = '', imageUrl, url, onClose }) {
  const { toast } = useContext(Ctx);
  const canvasRef = useRef(null);
  const [formato, setFormato] = useState('feed');
  const [estilo, setEstilo] = useState(() => { try { return localStorage.getItem('gm_redes_estilo') || 'oferta'; } catch { return 'oferta'; } });
  const [titular, setTitular] = useState(descuento >= 5 ? 'Oferta' : '');
  const [conEnvio, setConEnvio] = useState(true);
  const [conWa, setConWa] = useState(!!whatsapp);
  const [imgEl, setImgEl] = useState(null);
  const [logoEl, setLogoEl] = useState(null);
  const [tainted, setTainted] = useState(false);
  const [sinFondo, setSinFondo] = useState(true);
  const [logoFondo, setLogoFondo] = useState(true);
  const imgSF = useMemo(() => _quitarFondo(imgEl), [imgEl]);
  const logoSF = useMemo(() => _quitarFondo(logoEl, 48), [logoEl]);
  const logoMA = useMemo(() => _suave(logoSF || logoEl), [logoSF, logoEl]);
  useEffect(() => { try { localStorage.setItem('gm_redes_estilo', estilo); } catch {} }, [estilo]);
  // Fotos por el proxy propio (evita el bloqueo CORS al descargar)
  const cargar = (u, ok, marcarTaint) => {
    if (!u) { ok(null); return; }
    const src = /^https?:\/\//i.test(u) ? ('/api/img?url=' + encodeURIComponent(u)) : u;
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => ok(im);
    im.onerror = () => { const im2 = new Image(); im2.onload = () => { ok(im2); if (marcarTaint) setTainted(true); }; im2.onerror = () => ok(null); im2.src = u; };
    im.src = src;
  };
  useEffect(() => { setTainted(false); cargar(imageUrl, setImgEl, true); }, [imageUrl]);
  useEffect(() => { cargar(logoUrl, setLogoEl, false); }, [logoUrl]);
  const chips = [];
  if (envioGratis) chips.push('ENVÍO GRATIS'); else if (conEnvio) chips.push('ENVÍOS A TODO EL PAÍS');
  if (stockBajo > 0) chips.push(stockBajo === 1 ? '¡ÚLTIMA UNIDAD!' : `¡ÚLTIMAS ${stockBajo} UNIDADES!`);
  useEffect(() => {
    const draw = () => { if (canvasRef.current) drawRedesImagen(canvasRef.current, { formato, estilo, imgEl, imgSF: sinFondo ? imgSF : null, logoEl, logoSF, logoMA, logoFondo, nombre: producto.nombre || producto.modelo || '', marca: producto.marca && !/^gen[eé]ric/i.test(producto.marca) ? producto.marca : '', precioStr, precioViejo, descuento, ahorroStr, chips, titular: titular.trim(), storeName, dominio, whatsapp: conWa ? whatsapp : '' }); };
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw).catch(() => {});
  }, [formato, estilo, imgEl, imgSF, logoEl, logoSF, logoMA, sinFondo, logoFondo, precioStr, envioGratis, titular, conEnvio, conWa]);
  const nombreArchivo = `${(producto.nombre || 'producto').replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}-${formato}.png`;
  const descargar = () => {
    try {
      const u = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a'); a.href = u; a.download = nombreArchivo; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { toast('Esta foto no permite descargarse por permisos del servidor de imágenes. Probá con otro producto.', 'error'); }
  };
  const compartir = async () => {
    try {
      const blob = await new Promise((res, rej) => { try { canvasRef.current.toBlob(b => b ? res(b) : rej(new Error('no blob')), 'image/png'); } catch (e) { rej(e); } });
      const file = new File([blob], nombreArchivo, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: producto.nombre || 'Producto', text: `${producto.nombre || ''} — ${precioStr}${url ? '\n' + url : ''}`, url: url || undefined });
      } else { descargar(); }
    } catch (e) { if (e && e.name === 'AbortError') return; descargar(); }
  };
  const puedeCompartir = typeof navigator !== 'undefined' && navigator.canShare;
  const SUGERIDOS = ['Oferta', 'Nuevo ingreso', 'Llegó', 'Oferta de la semana', 'Últimas unidades'];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal redes-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Imagen para redes <span className="redes-ver">Diseño v{REDES_VERSION}</span></span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="redes-fila">
            <div className="redes-seg" role="group" aria-label="Formato">
              <button className={formato === 'feed' ? 'on' : ''} onClick={() => setFormato('feed')}>Post</button>
              <button className={formato === 'story' ? 'on' : ''} onClick={() => setFormato('story')}>Historia</button>
            </div>
            <div className="redes-seg" role="group" aria-label="Estilo">
              {Object.entries(REDES_ESTILOS).map(([k, v]) => <button key={k} className={estilo === k ? 'on' : ''} onClick={() => setEstilo(k)}>{v.label}</button>)}
            </div>
          </div>
          <div className="redes-prev"><canvas ref={canvasRef} className={formato === 'story' ? 'story' : ''} /></div>
          {tainted && <p className="redes-aviso">Vista previa lista. Si la descarga falla, es por permisos del servidor de fotos.</p>}
          <div className="redes-opc">
            <label className="form-label">Texto destacado (opcional)</label>
            <input value={titular} maxLength={26} onChange={e => setTitular(e.target.value)} placeholder="Ej: Nuevo ingreso" />
            <div className="redes-sug">{SUGERIDOS.map(t => <button key={t} className={titular === t ? 'on' : ''} onClick={() => setTitular(titular === t ? '' : t)}>{t}</button>)}</div>
            <div className="redes-checks">
              {imgSF && <label><input type="checkbox" checked={sinFondo} onChange={e => setSinFondo(e.target.checked)} /> Quitar fondo del producto</label>}
              {logoEl && <label><input type="checkbox" checked={logoFondo} onChange={e => setLogoFondo(e.target.checked)} /> Logo de fondo</label>}
              {!envioGratis && <label><input type="checkbox" checked={conEnvio} onChange={e => setConEnvio(e.target.checked)} /> Envíos a todo el país</label>}
              {whatsapp && <label><input type="checkbox" checked={conWa} onChange={e => setConWa(e.target.checked)} /> Mostrar WhatsApp</label>}
            </div>
          </div>
          {url && <p className="redes-ayuda">Para historias de Instagram: subí la imagen y agregá el <b>sticker de link</b> con el enlace del producto (botón "Copiar link").</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
          {url && <button className="btn btn-outline" onClick={async () => { try { await navigator.clipboard.writeText(url); toast('Link copiado'); } catch (e) { toast(url); } }}>Copiar link</button>}
          {puedeCompartir && <button className="btn btn-primary" onClick={compartir}>Compartir</button>}
          <button className={`btn ${puedeCompartir ? 'btn-outline' : 'btn-primary'}`} onClick={descargar}>Descargar</button>
        </div>
      </div>
    </div>
  );
}

// PRODUCT DETAIL PAGE
// ═══════════════════════════════════════════════════════════
function ProductDetailPage() {
  const { selectedProduct: p, seccionActual: navSec, secciones, nav, toast, addToCart, config, user, design, precioLista, precioEfectivo, ajusteCliente, precioFinalCliente } = useContext(Ctx);
  // Sección REAL del producto (no la de navegación) — evita mostrar Local cuando el producto es de Deposito
  const sec = (p?.seccion_id && secciones.find(s => String(s.id) === String(p.seccion_id))) || navSec;
  const [prodBadges, setProdBadges] = useState([]);
  useEffect(() => { if (sec?.id) api.getBadges(sec.id).then(setProdBadges).catch(() => {}); }, [sec?.id]);
  const [qty, setQty] = useState(1);
  const [qtyTxt, setQtyTxt] = useState(null); // lo que se está escribiendo en la cantidad
  const [metodosPago, setMetodosPago] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [promos, setPromos] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [atributos, setAtributos] = useState([]);
  const [selOpts, setSelOpts] = useState({});
  const [usaVariantes, setUsaVariantes] = useState(false);
  const [mainImg, setMainImg] = useState('');
  const [visor, setVisor] = useState(null); // índice de la foto abierta a pantalla completa
  const [zoom, setZoom] = useState(null);   // { x, y } en % mientras el mouse está sobre la foto
  const toquePdp = useRef(null);
  const zoomOk = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [showRedes, setShowRedes] = useState(false);
  const [relacionados, setRelacionados] = useState([]);
  useEffect(() => { if (p?.id) api.getRelacionados(p.id).then(setRelacionados).catch(() => setRelacionados([])); }, [p?.id]);
  useEffect(() => { if (p?.id) trackEvent('view_item', 'ViewContent', { content_name: p.nombre || p.modelo, value: Number(p.precioFinal || p.precio_base) || 0, currency: 'ARS' }); }, [p?.id]);
  const [isFav, setIsFav] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [showNotify, setShowNotify] = useState(false);
  const [notifyCanal, setNotifyCanal] = useState('whatsapp');
  const [notifyTel, setNotifyTel] = useState('');
  // Barra fija de compra (celular): aparece cuando el botón "Agregar" quedó fuera de la pantalla
  const esCelPdp = useMediaQuery('(max-width: 768px)');
  const [buyEl, setBuyEl] = useState(null);
  const [verBarra, setVerBarra] = useState(false);
  useEffect(() => {
    if (!buyEl || !('IntersectionObserver' in window)) { setVerBarra(false); return; }
    const io = new IntersectionObserver(([e]) => setVerBarra(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(buyEl);
    return () => io.disconnect();
  }, [buyEl]);
  const barraActiva = esCelPdp && verBarra && !!buyEl;
  // Avisa al resto de la página (botón de WhatsApp) que hay barra abajo, para no taparla
  useEffect(() => { document.body.classList.toggle('con-barra-compra', barraActiva); return () => document.body.classList.remove('con-barra-compra'); }, [barraActiva]);
  useEffect(() => { document.body.classList.add('pagina-producto'); return () => document.body.classList.remove('pagina-producto'); }, []);

  useEffect(() => {
    if (!p) return;
    setMainImg(p.imagen || '');
    if (sec) api.getMetodosPago(sec.id).then(setMetodosPago).catch(() => {});
    api.getProductoImagenes(p.id).then(imgs => { setGallery(imgs); if (!p.imagen && imgs && imgs.length) setMainImg(imgs[0].url); }).catch(() => {});
    api.getVariantesFull(p.id).then(d => {
      setUsaVariantes(!!d.usa_variantes && (d.atributos || []).length > 0);
      setAtributos(d.atributos || []);
      setVariantes((d.variantes || []).map(v => ({ ...v, combinacion: typeof v.combinacion === 'string' ? (() => { try { return JSON.parse(v.combinacion); } catch { return {}; } })() : (v.combinacion || {}) })));
      setSelOpts({});
    }).catch(() => { setUsaVariantes(false); setAtributos([]); setVariantes([]); });
    if (user) api.getFavoritos().then(favs => setIsFav(favs.some(f => f.producto_id === p.id))).catch(() => {});
    api.getPromocionesActivas(p.seccion_id || sec?.id).then(pr => setPromos(pr || [])).catch(() => setPromos([]));
  }, [p?.id, sec?.id]);

  if (!p) return <Landing />;

  const precioBase = precioEfectivo(p); // lista del cliente + oferta (igual que el servidor)
  // Precio real de una variante (usa oferta si es válida)
  const varPrecio = (v) => { const of = Number(v?.precio_oferta) || 0; const pr = Number(v?.precio) || 0; return (of > 0 && of < pr) ? of : pr; };
  const tieneVariantes = usaVariantes && variantes.length > 0;
  const fullSel = tieneVariantes && atributos.length > 0 && atributos.every(a => selOpts[a.nombre]);
  const matched = fullSel ? variantes.find(v => atributos.every(a => (v.combinacion || {})[a.nombre] === selOpts[a.nombre])) : null;
  // "desde": la variante EN PESOS más barata (igual que el listado y lo que lee Google); si no hay ninguna en pesos, la más barata en otra moneda
  const varConPrecio = variantes.filter(v => varPrecio(v) > 0);
  const varEnPesos = varConPrecio.filter(v => (v.moneda || 'ARS') === 'ARS');
  const varCandidatas = varEnPesos.length ? varEnPesos : (varConPrecio.length ? varConPrecio : variantes);
  const varMin = varCandidatas.length ? varCandidatas.reduce((m, v) => varPrecio(v) < varPrecio(m) ? v : m, varCandidatas[0]) : null;
  const precioSinPromo = matched ? varPrecio(matched) : (tieneVariantes && varMin ? varPrecio(varMin) : precioBase);
  const monedaFinal = matched ? (matched.moneda || 'ARS') : (tieneVariantes && varMin ? (varMin.moneda || 'ARS') : (p.moneda && p.moneda !== 'ARS' ? p.moneda : 'ARS'));
  // Si venimos del listado con el precio ya calculado (promo/oferta/revendedor aplicados), lo respetamos tal cual
  // y NO volvemos a aplicar la promo (evita el doble descuento al abrir el producto).
  // El precio siempre se recalcula acá (antes se usaba el que traía el listado y podía no coincidir con el carrito)
  const usarNav = false;
  const promoInfoProd = ajusteCliente(precioSinPromo, p, promos, p.seccion_id || sec?.id, monedaFinal, tieneVariantes);
  let precioFinal = usarNav ? Number(p.precioFinal) : (promoInfoProd ? promoInfoProd.final : precioSinPromo);
  const hayPromo = usarNav ? (Number(p.precioOriginal) > 0 && Number(p.precioOriginal) > precioFinal) : !!promoInfoProd;
  // Precio tachado: el más alto entre la lista del cliente y el precio antes de la promo (igual que en las tarjetas)
  const anclaSinVar = !tieneVariantes ? Math.max(precioLista(p), precioSinPromo) : 0;
  const precioOriginal = !tieneVariantes ? (anclaSinVar > precioFinal ? anclaSinVar : null) : (hayPromo ? precioSinPromo : null);
  const sinStock = !tieneVariantes && (!p.stock || p.stock <= 0) && !p.permitir_sin_stock && !p.es_digital && !sec?.ignorar_stock && !sec?.permitir_sin_stock;
  // Tope de cantidad: el mismo criterio que el servidor (las variantes, preventas, digitales y tiendas que ignoran stock no tienen)
  const topeQty = (tieneVariantes || p.permitir_sin_stock || p.es_digital || p.es_preventa || sec?.ignorar_stock || sec?.permitir_sin_stock) ? Infinity : Number(p.stock || 0);
  const agregarPdp = () => {
    if (tieneVariantes && !matched) { toast(fullSel ? 'Esa combinación no está disponible' : 'Elegí todas las opciones primero', 'error'); if (barraActiva) window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const label = atributos.map(a => selOpts[a.nombre]).join(' / ');
    addToCart(sec?.id || p.seccion_id, p, qty, precioFinal, matched ? { ...matched, _label: label } : null);
  };
  const umbralGratis = Number(config['envio_gratis_desde_' + (p.seccion_id || sec?.id)]) || 0;
  const envioGratisProd = !p.excluir_envio_gratis && (!!p.envio_gratis || (umbralGratis > 0 && precioFinal >= umbralGratis));
  const precioViejoStr = precioOriginal ? fmtARS(precioOriginal) : (matched && Number(matched.precio_oferta) > 0 && Number(matched.precio_oferta) < Number(matched.precio) ? fmtMon(matched.precio, monedaFinal) : '');
  const allImages = gallery.length ? gallery.map(g => g.url) : [p.imagen].filter(Boolean);
  // Foto de la opción elegida (ej: color) — si tiene, se muestra como imagen principal
  const varImg = (() => {
    for (const a of atributos) { const sel = selOpts[a.nombre]; if (!sel) continue; const v = (a.valores || []).find(x => (typeof x === 'string' ? x : (x?.valor || '')) === sel); const img = (v && typeof v === 'object') ? (v.imagen || '') : ''; if (img) return img; }
    return '';
  })();
  useEffect(() => { if (varImg) setMainImg(varImg); }, [varImg]);

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
    window.open(`https://wa.me/${waIntl(waNum)}?text=${encodeURIComponent(txt)}`, '_blank');
  };

  // URL compartible del producto
  const shareUrl = (() => {
    const keep = new URLSearchParams();
    const t = new URLSearchParams(window.location.search).get('tienda');
    if (t) keep.set('tienda', t);
    keep.set('producto', String(p.id));
    return window.location.origin + window.location.pathname + '?' + keep.toString();
  })();
  // URL con OG meta tags para previews en redes sociales (Vercel serverless function)
  const shareUrlOG = (() => {
    const keep = new URLSearchParams();
    const t = new URLSearchParams(window.location.search).get('tienda');
    if (t) keep.set('tienda', t);
    keep.set('producto', String(p.id));
    return window.location.origin + '/api/og?' + keep.toString();
  })();
  const shareName = p.nombre || p.modelo || 'Producto';
  const shareText = `${shareName} — ${fmtARS(precioFinal)}`;
  const [linkCopied, setLinkCopied] = useState(false);

  return (
    <div className="pdp">
      <button className="pdp-back" onClick={() => { if (window.history.length > 1) window.history.back(); else nav('section', sec?.id); }}>← Volver</button>

      <div className="pdp-crumbs">
        <span onClick={() => nav('landing')}>Inicio</span> / <span onClick={() => nav('section', sec?.id)}>{sec?.nombre}</span> {p.categoria && <> / {p.categoria}</>} / <span className="pdp-crumb-current">{p.nombre || p.modelo}</span>
      </div>

      <div className="pdp-grid">
        {/* Image gallery */}
        <div className="pdp-gallery">
          <div className="pdp-main-img">
            {p.envio_gratis && <span className="pdp-free-badge">ENVÍO GRATIS</span>}
            <button className={`card-fav pdp-fav${isFav ? ' active' : ''}`} onClick={toggleFav}><Ico n="heart" s={18} fill={isFav} /></button>
            {mainImg ? (
              <div className={`pdp-zoom${zoom ? ' activo' : ''}`}
                onMouseMove={zoomOk ? (e => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }) : undefined}
                onMouseLeave={() => setZoom(null)}
                onClick={() => setVisor(Math.max(0, allImages.indexOf(mainImg)))}
                onTouchStart={e => { toquePdp.current = e.touches[0].clientX; }}
                onTouchEnd={e => { if (toquePdp.current == null || allImages.length < 2) return; const dx = e.changedTouches[0].clientX - toquePdp.current; toquePdp.current = null; if (Math.abs(dx) > 40) { const k = Math.max(0, allImages.indexOf(mainImg)); setMainImg(allImages[(k + (dx < 0 ? 1 : -1) + allImages.length) % allImages.length]); } }}
                role="button" aria-label="Ver fotos en pantalla completa">
                <img src={imgOpt(mainImg, 900)} srcSet={imgSet(mainImg, 900)} alt={p.nombre || ''} style={zoom ? { transform: 'scale(2.1)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
              </div>
            ) : <div className="pdp-noimg"><Ico n="cart" s={64} /></div>}
            {mainImg && <button type="button" className="pdp-ampliar" onClick={() => setVisor(Math.max(0, allImages.indexOf(mainImg)))} aria-label="Ampliar"><Maximize2 size={16} /></button>}
            {allImages.length > 1 && <div className="pdp-contador">{Math.max(0, allImages.indexOf(mainImg)) + 1} / {allImages.length}</div>}
            {precioOriginal && !p.es_preventa && precioFinal > 0 && precioOriginal > precioFinal && <span className="pdp-off">{Math.round((1 - precioFinal / precioOriginal) * 100)}% OFF</span>}
          </div>
          {visor !== null && allImages.length > 0 && <VisorFotos fotos={allImages} inicio={visor} titulo={p.nombre || p.modelo} onClose={() => setVisor(null)} />}
          {allImages.length > 1 && (
            <div className="pdp-thumbs">
              {allImages.map((img, i) => (
                <img key={i} src={imgOpt(img, 140)} alt="" loading="lazy" onClick={() => setMainImg(img)} className={mainImg === img ? 'active' : ''} />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pdp-info">
          {p.categoria && slugify(p.categoria) && !sec?.requiere_aprobacion
            ? <a className="pdp-cat" href={`/categoria/${slugify(p.categoria)}`} onClick={e => { e.preventDefault(); nav('categoria', slugify(p.categoria)); }}>{p.categoria}</a>
            : <div className="pdp-cat">{p.categoria}</div>}
          <h1 className="pdp-title">{p.nombre || p.modelo}</h1>

          {!p.es_preventa && <div className="pdp-price">
            {tieneVariantes && !matched ? (
              <span className="pdp-price-new">desde {fmtMon(precioFinal, monedaFinal)}</span>
            ) : matched && Number(matched.precio_oferta) > 0 && Number(matched.precio_oferta) < Number(matched.precio) ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span className="pdp-price-old">{fmtMon(matched.precio, monedaFinal)}</span>
                <span className="pdp-price-new">{fmtMon(precioFinal, monedaFinal)}</span>
              </div>
            ) : precioOriginal && !tieneVariantes ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span className="pdp-price-old">{fmtARS(precioOriginal)}</span>
                <span className="pdp-price-new">{fmtARS(precioFinal)}</span>
              </div>
            ) : (
              <span className="pdp-price-new">{fmtMon(precioFinal, monedaFinal)}</span>
            )}
            {precioOriginal && !tieneVariantes && precioOriginal > precioFinal && (
              <div className="pdp-ahorro">Ahorrás <b>{fmtARS(precioOriginal - precioFinal)}</b>{promoInfoProd && promoInfoProd.nombre && !promoInfoProd.esRevendedor ? <span> · {promoInfoProd.nombre}</span> : null}</div>
            )}
            {promoInfoProd && promoInfoProd.hasta && <CuentaRegresiva hasta={promoInfoProd.hasta} />}
          </div>}

          {!p.es_preventa && preciosMetodo.length > 0 && (
            <div className="pdp-payments">
              {preciosMetodo.map(pm => (
                <div key={pm.nombre} className="pdp-payment-row">
                  <RenderIcon value={pm.icono} size={16} /><strong>{fmtARS(pm.precio)}</strong>
                  <span className="pdp-payment-desc">con {pm.nombre} −{pm.descuento}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Variantes: un selector por atributo (estilo Empretienda/ML) */}
          {tieneVariantes && (
            <div style={{ marginBottom: 18 }}>
              {atributos.map(a => (
                <div key={a.nombre} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{a.nombre}</div>
                  <select value={selOpts[a.nombre] || ''} onChange={e => setSelOpts(s => ({ ...s, [a.nombre]: e.target.value }))} style={{ width: '100%', maxWidth: 340, padding: '10px 12px', borderRadius: 10, fontWeight: 600 }}>
                    <option value="">Elegí una opción</option>
                    {(a.valores || []).map(val => { const vv = typeof val === 'string' ? val : (val?.valor || ''); return <option key={vv} value={vv}>{vv}</option>; })}
                  </select>
                </div>
              ))}
              {fullSel && !matched && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>Esa combinación no está disponible.</p>}
            </div>
          )}

          {p.descripcion && <p className="pdp-desc">{String(p.descripcion).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()}</p>}
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
                  : <button className="btn" style={{ width: '100%', background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff', fontWeight: 800 }} onClick={() => { const fechaTxt = p.preventa_mostrar_fecha && p.preventa_fecha ? `\n\nFecha aproximada de ingreso: ${new Date(p.preventa_fecha).toLocaleDateString('es-AR')} (es estimada, puede variar).` : '\n\nEs un producto con demora: te avisamos apenas ingrese.'; if (!confirm(`Estás RESERVANDO un producto en preventa.${fechaTxt}\n\nNo es un producto disponible para entrega inmediata. ¿Querés reservarlo igual?`)) return; addToCart(sec?.id, { ...p, _preventa: true, _precioReserva: precioReserva }, qty, precioReserva); }}>RESERVAR{pct > 0 ? ` a ${fmtARS(precioReserva)}` : ''}</button>}
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
                <button className="btn btn-outline" onClick={() => setShowNotify(true)} style={{ width: '100%' }}><Bell size={15} style={{ verticalAlign: '-2px' }} /> Avisame cuando llegue</button>
              )}
            </div>
          ) : (
            <div className="pdp-buy" ref={setBuyEl}>
              <div className="pdp-qty">
                <button onClick={() => { setQtyTxt(null); setQty(Math.max(1, qty - 1)); }}>−</button>
                <input type="number" min="1" value={qtyTxt ?? qty} onChange={e => {
                  const txt = e.target.value; setQtyTxt(txt);
                  const n = parseInt(txt, 10); if (!(n >= 1)) return; // vacío mientras escribe: se valida al salir
                  if (n > topeQty) { toast(topeQty > 0 ? `Solo hay ${topeQty} en stock` : 'Sin stock', 'warning'); setQty(Math.max(1, topeQty)); setQtyTxt(null); }
                  else setQty(n);
                }} onBlur={() => setQtyTxt(null)} style={{ width: 54, textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 800, fontSize: 16, padding: '12px 4px' }} />
                <button onClick={() => {
                  if (qty + 1 > topeQty) { toast(topeQty > 0 ? `Solo hay ${topeQty} en stock` : 'Sin stock', 'warning'); return; }
                  setQtyTxt(null); setQty(qty + 1);
                }}>+</button>
              </div>
              <button className="btn pdp-add" disabled={tieneVariantes && !matched} style={tieneVariantes && !matched ? { opacity: 0.55, cursor: 'not-allowed' } : undefined} onClick={agregarPdp}>
                {tieneVariantes && !matched ? (fullSel ? 'NO DISPONIBLE' : 'ELEGÍ LAS OPCIONES') : <>AGREGAR<span className="solo-ancho"> AL CARRITO</span></>}
              </button>
            </div>
          )}

          {waNum && <button className="pdp-wa" onClick={shareWA}><Ico n="message" s={16} /> Consultar por WhatsApp</button>}
          <AvisoSeccion sec={sec} compacto />

          {/* Compartir producto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Compartir:</span>
            <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrlOG)}`, '_blank')} title="WhatsApp" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#25d366', padding: 4, borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}><RedIcon tipo="whatsapp" s={20} /></button>
            <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrlOG)}`, '_blank', 'width=600,height=400')} title="Facebook" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877f2', padding: 4, borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}><RedIcon tipo="facebook" s={20} /></button>
            <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrlOG)}&text=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=400')} title="X (Twitter)" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 4, borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}><RedIcon tipo="twitter" s={20} /></button>
            <button onClick={() => { navigator.clipboard.writeText(shareUrl).then(() => { setLinkCopied(true); toast('Link copiado'); setTimeout(() => setLinkCopied(false), 2000); }).catch(() => toast('No se pudo copiar', 'error')); }} title="Copiar link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: linkCopied ? 'var(--success, #22c55e)' : 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}><Ico n="copy" s={18} /></button>
            {typeof navigator !== 'undefined' && navigator.share && <button onClick={() => navigator.share({ title: shareName, text: shareText, url: shareUrl }).catch(() => {})} title="Compartir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}><Ico n="link" s={18} /></button>}
            <button onClick={() => setShowRedes(true)} title="Crear imagen para Instagram, TikTok, Facebook y Stories" style={{ background: 'var(--primary)', color: 'var(--on-primary, #fff)', border: 'none', cursor: 'pointer', padding: '7px 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>Crear imagen para redes</button>
          </div>
          {showRedes && (() => {
            const viejoNum = precioOriginal ? Number(precioOriginal) : (matched && Number(matched.precio_oferta) > 0 && Number(matched.precio_oferta) < Number(matched.precio) ? Number(matched.precio) : 0);
            const desc = viejoNum > precioFinal && precioFinal > 0 ? Math.round((1 - precioFinal / viejoNum) * 100) : 0;
            const st = Number(p.stock) || 0;
            const tel = waIntl(design.whatsapp_numero);
            const local = tel.startsWith('549') ? tel.slice(3) : tel;
            const waTxt = !local ? '' : local.startsWith('11') && local.length === 10 ? `11 ${local.slice(2, 6)}-${local.slice(6)}` : local;
            return <ImagenRedesModal producto={p} precioStr={fmtMon(precioFinal, monedaFinal)} precioViejo={precioViejoStr} descuento={desc} ahorroStr={desc >= 5 && monedaFinal === 'ARS' ? fmtARS(viejoNum - precioFinal) : ''} envioGratis={envioGratisProd} stockBajo={!tieneVariantes && !p.permitir_sin_stock && st > 0 && st <= 3 ? st : 0} storeName={design.nombre_tienda || ''} dominio={typeof window !== 'undefined' ? window.location.host.replace(/^www\./, '') : ''} whatsapp={waTxt} logoUrl={design.logo_url || ''} imageUrl={mainImg || allImages[0] || p.imagen} url={shareUrl} onClose={() => setShowRedes(false)} />;
          })()}

          {p.sku && !p.sku.startsWith('RXZ-') && <p className="pdp-sku">SKU: {p.sku}</p>}
          {p.notas && <div className="pdp-note"><FileText size={15} style={{ verticalAlign: '-2px' }} /> {p.notas}</div>}

          {/* Carteles de confianza */}
          {prodBadges.length > 0 && (
            <div className="pdp-badges">
              {prodBadges.map(b => (
                <div key={b.id} className="pdp-badge"><RenderIcon value={b.icono} size={16} /><span>{b.texto}</span></div>
              ))}
            </div>
          )}
          {/* Calculador de envío por código postal (misma cotización que el carrito) */}
          <EnvioCalculadorProducto producto={{ ...p, seccion_id: p.seccion_id || sec?.id }} varianteId={matched?.id} qty={qty} />
        </div>
      </div>

      {relacionados.length > 0 && (
        <div style={{ maxWidth: 1600, margin: '32px auto 0', padding: '0 20px' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>También te puede interesar</h3>
          <Carrusel className="relacionados-track">
            {relacionados.map(rp => <div className="carousel-item" key={rp.id}><TarjetaProducto p={rp} secId={rp.seccion_id} /></div>)}
          </Carrusel>
        </div>
      )}
      {/* Va directo al <body> para que quede fija abajo aunque la página tenga animaciones */}
      {barraActiva && createPortal(
        <div className="buy-bar" role="region" aria-label="Comprar">
          <div className="buy-bar-info">
            <div className="buy-bar-name">{p.nombre || p.modelo}</div>
            <div className="buy-bar-price">{tieneVariantes && !matched ? `desde ${fmtMon(precioFinal, monedaFinal)}` : fmtMon(precioFinal * (qty || 1), monedaFinal)}{qty > 1 ? <small> · {qty} u.</small> : null}</div>
          </div>
          <button className="btn btn-primary buy-bar-btn" onClick={agregarPdp}>{tieneVariantes && !matched ? 'Elegir opciones' : <><ShoppingCart size={16} /> Agregar</>}</button>
        </div>, document.body
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
    if (!form.nombre.trim() || !form.usuario.trim() || !form.password) { toast('Completá nombre, usuario y contraseña', 'error'); return; }
    if ((form.telefono || '').replace(/\D/g, '').length < 8) { toast('Poné un teléfono válido, con característica (ej: 11 2345 6789)', 'error'); return; }
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { toast('Poné un email válido', 'error'); return; }
    try { const r = await api.register(form); toast(r && r.aprobado ? '¡Cuenta creada! Ya podés ingresar.' : 'Registro enviado. Esperá la aprobación del admin.'); nav('login'); } catch (e) { toast(e.message, 'error'); }
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
        <div className="form-group"><label className="form-label">TELÉFONO / WHATSAPP *</label><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">EMAIL *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">NOMBRE DE FANTASÍA</label><input value={form.nombre_fantasia} onChange={e => setForm({ ...form, nombre_fantasia: e.target.value })} placeholder="Opcional" /></div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 12, background: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={submit}>CREAR CUENTA</button>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>¿Ya tenés cuenta? <a href="#" onClick={e => { e.preventDefault(); nav('login'); }} style={{ color: 'var(--primary)', fontWeight: 700 }}>Iniciá sesión</a></p>
      </div>
    </div>
  );
}

// ═══ FORGOT PASSWORD PAGE ═══
function ForgotPasswordPage() {
  const { nav, toast, config } = useContext(Ctx);
  const [step, setStep] = useState(1);
  const [usuario, setUsuario] = useState('');
  const [codigo, setCodigo] = useState('');
  const [newPass, setNewPass] = useState('');
  const [enviando, setEnviando] = useState(false);
  const wa = waIntl(config?.whatsapp_flotante || config?.whatsapp || config?.whatsapp_numero || '');

  const requestCode = async () => {
    if (!usuario.trim()) { toast('Escribí tu usuario o email', 'error'); return; }
    setEnviando(true);
    try { await api.forgotPassword(usuario.trim()); setStep(2); }
    catch (e) { toast(e.message, 'error'); }
    setEnviando(false);
  };
  const resetPass = async () => {
    try { await api.resetPassword(codigo.trim(), newPass); toast('Contraseña cambiada. Ya podés ingresar.'); nav('login'); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div style={{ maxWidth: 420, margin: '48px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: 32, borderRadius: 20 }}>
        <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>Recuperar contraseña</h2>
        {step === 1 ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Te mandamos un código al email de tu cuenta.</p>
            <div className="form-group"><label className="form-label">Usuario o email</label><input value={usuario} onChange={e => setUsuario(e.target.value)} onKeyDown={e => e.key === 'Enter' && requestCode()} autoComplete="username" /></div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={requestCode} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar código'}</button>
          </>
        ) : (
          <>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: 12, borderRadius: 10, marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}>
              Si los datos coinciden con una cuenta con email, te llegó un código. Revisá también la carpeta de spam. Vence en 1 hora.
            </div>
            <div className="form-group"><label className="form-label">Código</label><input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="Código del email" autoComplete="one-time-code" /></div>
            <div className="form-group"><label className="form-label">Nueva contraseña</label><input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="8+ caracteres, una mayúscula y un número" autoComplete="new-password" /></div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={resetPass}>Cambiar contraseña</button>
            <button className="link-btn" style={{ width: '100%', marginTop: 10 }} onClick={() => setStep(1)}>No me llegó, volver a pedir</button>
          </>
        )}
        {wa && <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5, color: 'var(--text-muted)' }}>¿No tenés email en tu cuenta? <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola, necesito recuperar el acceso a mi cuenta.')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>Escribinos por WhatsApp</a></p>}
        <p style={{ textAlign: 'center', marginTop: 12 }}><a href="#" onClick={e => { e.preventDefault(); nav('login'); }} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>← Volver al login</a></p>
      </div>
    </div>
  );
}

function AccountPanel() {
  const { user, setUser, toast, nav, handleLogout, userLista, config } = useContext(Ctx);
  const [f, setF] = useState({ nombre: user?.nombre || '', telefono: user?.telefono || '', email: user?.email || '', direccion: user?.direccion || '', nombre_fantasia: user?.nombre_fantasia || '', password: '', password_actual: '' });
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
      const data = { ...f }; if (!data.password) { delete data.password; delete data.password_actual; }
      const updated = await api.updateMe(data);
      setUser(updated); setF(prev => ({ ...prev, password: '', password_actual: '' })); toast('Datos actualizados');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const estadoColor = { pendiente: 'var(--accent)', preparando: 'var(--primary)', listo: 'var(--success)', enviado: '#0ea5e9', entregado: '#666', cancelado: 'var(--danger)' };

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
        {[{ id: 'datos', label: 'Datos' }, { id: 'pedidos', label: 'Mis pedidos' }, { id: 'presupuestos', label: 'Presupuestos' }].map(t => (
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
          {f.password && <div className="form-group"><label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>CONTRASEÑA ACTUAL</label><input type="password" value={f.password_actual} onChange={e => setF({ ...f, password_actual: e.target.value })} placeholder="Para confirmar el cambio" autoComplete="current-password" /><small style={{ color: 'var(--text-muted)', fontSize: 11 }}>La nueva necesita 8+ caracteres, una mayúscula y un número.</small></div>}
          <button onClick={save} disabled={saving} style={{ width: '100%', marginTop: 16, padding: 14, background: 'var(--primary)', color: 'var(--on-primary, #fff)', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer' }}>{saving ? 'Guardando...' : 'GUARDAR CAMBIOS'}</button>
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
                {o.pedido_vinculado && o.vinculado_moneda && <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Link2 size={12} /> Va con el #{String(o.pedido_vinculado).padStart(4, '0')} en {o.vinculado_moneda === 'USDT' ? 'USDT' : 'pesos'}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{fmtPedido(o.total, o)}</div>
                {Number(o.sena) > 0 && (o.estado_pago === 'senado' || o.estado_pago === 'debe') && <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 700 }}>Resta {fmtPedido(Math.max(0, Number(o.total) - Number(o.sena || 0)), o)}</div>}
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
                <div style={{ fontWeight: 800, fontSize: 14 }}>{fmtPedido(o.total, o)}</div>
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
                  <ItemProd id={it.producto_id} nombre={it.nombre_producto} imagen={it.imagen} sub={`x${it.cantidad}`} tam={36} />
                  <span style={{ fontWeight: 700 }}>{fmtPedido(it.precio_unitario * it.cantidad, viewDetail)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontWeight: 900, fontSize: 18 }}>
                <span>Total{viewDetail.moneda === 'USDT' ? ' en USDT' : ''}</span><span>{fmtPedido(viewDetail.total, viewDetail)}</span>
              </div>
              {Number(viewDetail.sena) > 0 && (viewDetail.estado_pago === 'senado' || viewDetail.estado_pago === 'debe') && (
                <div style={{ marginTop: 10, background: 'var(--border-light)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--success)', marginBottom: 4 }}><span>Seña pagada</span><span style={{ fontWeight: 700 }}>{fmtPedido(viewDetail.sena, viewDetail)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, color: 'var(--danger)' }}><span>Resta abonar</span><span>{fmtPedido(Math.max(0, Number(viewDetail.total) - Number(viewDetail.sena || 0)), viewDetail)}</span></div>
                </div>
              )}
              {viewDetail.estado_pago === 'pagado' && <div style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: 'var(--success)', fontWeight: 700, background: 'var(--border-light)', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Check size={15} /> Pagado completo</div>}
              {viewDetail.pedido_vinculado && viewDetail.vinculado_moneda && (
                <button type="button" className="cuenta-vinc" onClick={() => loadDetail(viewDetail.pedido_vinculado)}>
                  <Link2 size={16} />
                  <span>Esta compra tiene otra parte <strong>en {viewDetail.vinculado_moneda === 'USDT' ? 'USDT' : 'pesos'}</strong>: pedido #{String(viewDetail.pedido_vinculado).padStart(4, '0')} por {fmtPedido(viewDetail.vinculado_total, { moneda: viewDetail.vinculado_moneda })}. Se paga por separado.</span>
                  <ChevronRight size={16} />
                </button>
              )}
              {viewDetail.notas && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', background: 'var(--border-light)', padding: 10, borderRadius: 8 }}><FileText size={15} style={{ verticalAlign: '-2px' }} /> {viewDetail.notas}</div>}
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
function TiendaNoDisponible() {
  const { design } = useContext(Ctx);
  return (
    <div style={{ maxWidth: 480, margin: '64px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: 36, textAlign: 'center' }}>
        <div style={{ marginBottom: 12, color: 'var(--text-muted)' }}><Store size={44} /></div>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 10px' }}>{design?.nombre_tienda ? `${design.nombre_tienda} no está disponible` : 'Esta tienda no está disponible'}</h2>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Por el momento no está tomando pedidos. Volvé a intentar más tarde.</p>
      </div>
    </div>
  );
}

function CuentaBloqueada({ estado }) {
  const { handleLogout, config, miPlan } = useContext(Ctx);
  // WhatsApp de ComerciApp para reactivar (antes usaba el de la propia tienda suspendida)
  const wa = waIntl(miPlan?.soporte_whatsapp || config?.whatsapp || '');
  const esVencido = estado === 'vencido';
  const msg = encodeURIComponent('Hola, quiero reactivar mi tienda en ComerciApp.');
  return (
    <div style={{ maxWidth: 480, margin: '48px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: 36, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>{esVencido ? <Clock size={44} /> : <Lock size={44} />}</div>
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


// Precio en dólares y compra mínima en USD: helpers compartidos
const fmtUSD = (v) => 'USD ' + Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mostrarUsdSec = (config, sec) => { const v = config?.[`mostrar_usd_${sec?.id}`]; return v === undefined || v === null || v === '' ? !!sec?.requiere_aprobacion : v === 'true'; };
const minimoSec = (config, secId, cot) => {
  const base = Number(config?.[`compra_minima_${secId}`]) || 0;
  const usd = config?.[`compra_minima_moneda_${secId}`] === 'USD';
  return { base, usd, ars: usd ? (cot > 0 ? Math.round(base * cot) : 0) : base, soloEnvio: config?.[`min_aplica_retiro_${secId}`] !== 'true' };
};
function useCotizacionUsd(activo = true) {
  const [cot, setCot] = useState(null);
  useEffect(() => { if (!activo) return; let vivo = true; api.getDolarBlue().then(d => { if (vivo && d && Number(d.venta) > 0) setCot({ valor: Number(d.venta), fuente: d.fuente }); }).catch(() => {}); return () => { vivo = false; }; }, [activo]);
  return cot;
}


// ─── VARIANTES EDITOR (FIX #7: edicion inline + reutilizar opciones) ───
function VariantesEditor({ productoId }) {
  const { toast } = useContext(Ctx);
  const [vars, setVars] = useState([]);
  const [form, setForm] = useState({ nombre: '', valor: '', stock: 0, precio: 0 });
  useEffect(() => { api.getVariantes(productoId).then(setVars).catch(() => {}); }, [productoId]);
  const setLocal = (id, field, value) => setVars(vars.map(x => x.id === id ? { ...x, [field]: value } : x));
  const add = async () => {
    if (!form.nombre) return;
    try { const r = await api.addVariante({ producto_id: productoId, ...form }); setVars([...vars, r]); setForm({ nombre: form.nombre, valor: '', stock: 0, precio: 0 }); } catch (e) { toast(e.message, 'error'); }
  };
  const saveVar = async (v) => {
    try { await api.updateVariante(v.id, { nombre: v.nombre, valor: v.valor, stock: Number(v.stock) || 0, precio: Number(v.precio) || 0, precio_extra: Number(v.precio_extra) || 0 }); } catch (e) { toast(e.message, 'error'); }
  };
  const remove = async (id) => { try { await api.deleteVariante(id); setVars(vars.filter(v => v.id !== id)); } catch (e) { toast(e.message, 'error'); } };
  const nombresUsados = [...new Set(vars.map(v => v.nombre).filter(Boolean))];
  const valoresUsados = [...new Set(vars.map(v => v.valor).filter(Boolean))];
  const dlId = `varnames-${productoId}`;
  const dlVal = `varvalues-${productoId}`;
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <h4 style={{ marginBottom: 4, fontSize: 14 }}>Variantes (opcional)</h4>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>El precio es el <b>precio final</b> de cada variante (lo que paga el cliente). Si el producto usa variantes, se debe elegir una para poder comprar. <b>Tip:</b> al cargar varias, podés reusar los valores ya escritos (aparecen como sugerencia).</p>
      <datalist id={dlId}>{nombresUsados.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id={dlVal}>{valoresUsados.map(n => <option key={n} value={n} />)}</datalist>
      {vars.map(v => (
        <div key={v.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
          <input value={v.nombre} list={dlId} onChange={e => setLocal(v.id, 'nombre', e.target.value)} onBlur={() => saveVar(v)} placeholder="Nombre" style={{ flex: '1 1 100px', minWidth: 90, fontSize: 13 }} />
          <input value={v.valor} list={dlVal} onChange={e => setLocal(v.id, 'valor', e.target.value)} onBlur={() => saveVar(v)} placeholder="Valor" style={{ flex: '1 1 100px', minWidth: 90, fontSize: 13 }} />
          <input type="number" value={v.stock} onChange={e => setLocal(v.id, 'stock', e.target.value)} onBlur={() => saveVar(v)} placeholder="Stock" style={{ flex: '0 1 80px', minWidth: 70, fontSize: 13 }} />
          <input type="number" value={v.precio || ''} onChange={e => setLocal(v.id, 'precio', e.target.value)} onBlur={() => saveVar(v)} placeholder="Precio $" title="Precio final de esta variante" style={{ flex: '0 1 90px', minWidth: 80, fontSize: 13 }} />
          <button onClick={() => remove(v.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        <input placeholder="Nombre (ej: Moneda)" list={dlId} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={{ flex: '1 1 110px', minWidth: 90 }} />
        <input placeholder="Valor (ej: USDT 3 meses)" list={dlVal} value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} style={{ flex: '1 1 110px', minWidth: 90 }} />
        <input type="number" placeholder="Stock" value={form.stock || ''} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} style={{ flex: '0 1 80px', minWidth: 70 }} />
        <input type="number" placeholder="Precio $" title="Precio final de esta variante" value={form.precio || ''} onChange={e => setForm({ ...form, precio: Number(e.target.value) })} style={{ flex: '0 1 90px', minWidth: 80 }} />
        <button className="btn btn-primary btn-sm" onClick={add}>+ Agregar</button>
      </div>
    </div>
  );
}


// ─── Productos en listas del panel: foto + nombre que abre una ficha con fotos para identificarlo ───
const abrirProductoPanel = (id, extra = {}) => { if (id) window.dispatchEvent(new CustomEvent('ver-producto', { detail: { id, ...extra } })); };
function ItemProd({ id, nombre, imagen, sub, tam = 40 }) {
  const { page } = useContext(Ctx);
  const link = !!id && page === 'admin';
  const abrir = (e) => { e.stopPropagation(); abrirProductoPanel(id, { nombre, imagen }); };
  const thumb = imagen
    ? <img src={imgOpt(imagen, tam * 2)} alt="" className="itp-img" style={{ width: tam, height: tam }} loading="lazy" />
    : <span className="itp-img ph" style={{ width: tam, height: tam }}><Package size={Math.round(tam * 0.45)} /></span>;
  return (
    <span className="itp">
      {link ? <button type="button" className="itp-thumb" onClick={abrir} aria-label={`Ver ${nombre || 'producto'}`} title="Ver producto">{thumb}</button> : thumb}
      <span className="itp-txt">
        {link ? <button type="button" className="itp-nombre link" onClick={abrir} title="Ver producto">{nombre}</button> : <span className="itp-nombre">{nombre}</span>}
        {sub ? <small>{sub}</small> : null}
      </span>
    </span>
  );
}


// Carga los productos de un carrito compartido. Los que no se pueden ver (tienda con acceso, sin sesión) vuelven en `faltan`.
async function cargarItemsCompartidos(payload, secs) {
  const cart = {}, faltan = []; let n = 0;
  for (const it of (Array.isArray(payload) ? payload : []).slice(0, 100)) {
    const pid = parseInt(it && it.p, 10);
    if (!(pid > 0)) continue; // el link solo puede traer ids de producto
    it.q = Math.min(999, Math.max(1, parseInt(it.q, 10) || 1));
    const prod = await api.getProducto(pid).catch(() => null);
    const secId = String((prod && prod.seccion_id) || it.s || '');
    if (!prod || (secs && secId && !secs.some(x => String(x.id) === secId))) { faltan.push(it); continue; }
    if (!cart[secId]) cart[secId] = [];
    cart[secId].push({ ...prod, seccion_id: secId, qty: Number(it.q) || 1, precio_unitario: prod.precio_base });
    n++;
  }
  return { cart, faltan, n };
}
// Carrito → link que lo precarga en la tienda (?carrito=…). Mismo formato que "Compartir carrito".
const codificarCarrito = (arr) => btoa(encodeURIComponent(JSON.stringify(arr))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const faltaTxt = (d) => { const m = Math.round((new Date(d).getTime() - Date.now()) / 60000); return m <= 0 ? '' : m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${Math.round(m / 1440)} d`; };


// ═══════════════════════════════════════════════════════════
// BOTÓN DE ARREPENTIMIENTO (Ley 24.240 art. 34 / Res. 424/2020)
// ═══════════════════════════════════════════════════════════
function ArrepentimientoPage() {
  const { user, nav, design, config, toast } = useContext(Ctx);
  const tienda = design.nombre_tienda || config.nombre_negocio || 'la tienda';
  const [f, setF] = useState(() => {
    let pedido = '';
    try { pedido = sessionStorage.getItem('gm_arrep_pedido') || new URLSearchParams(window.location.search).get('pedido') || ''; sessionStorage.removeItem('gm_arrep_pedido'); } catch {}
    return { nombre: user?.nombre || '', email: user?.email || '', telefono: user?.telefono || '', dni: '', pedido: String(pedido).replace(/\D/g, ''), detalle: '' };
  });
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(null);
  const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }));
  const enviar = async (e) => {
    e.preventDefault();
    if (f.nombre.trim().length < 2) { toast('Escribí tu nombre y apellido', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) { toast('Escribí un email válido: ahí te mandamos el código', 'error'); return; }
    setEnviando(true);
    try { const r = await api.enviarArrepentimiento(f); setListo({ ...r, email: f.email.trim() }); window.scrollTo(0, 0); }
    catch (err) { toast(err.message, 'error'); }
    setEnviando(false);
  };
  if (listo) return (
    <div className="arrep">
      <div className="card arrep-card" style={{ textAlign: 'center' }}>
        <CheckCircle size={46} color="var(--success, #16a34a)" style={{ display: 'inline-block' }} />
        <h1 className="arrep-titulo" style={{ justifyContent: 'center' }}>Recibimos tu solicitud</h1>
        <p className="arrep-txt">Este es tu código de identificación de la revocación. Guardalo: lo vas a necesitar para seguir el trámite.</p>
        <div className="arrep-codigo">{listo.codigo}</div>
        <p className="arrep-txt">Fecha: {listo.fecha}. También te lo mandamos a <b>{listo.email}</b>. Nos vamos a comunicar con vos para coordinar la devolución y el reintegro.</p>
        <button className="btn btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => nav('landing')}>Volver a la tienda</button>
      </div>
    </div>
  );
  return (
    <div className="arrep">
      <div className="card arrep-card">
        <h1 className="arrep-titulo"><Undo2 size={22} /> Botón de arrepentimiento</h1>
        <p className="arrep-txt">Si compraste en {tienda}, tenés <b>10 días corridos</b> desde que recibiste el producto (o desde la compra, lo que ocurra último) para revocarla, sin dar explicaciones. No hace falta tener cuenta. Los gastos de devolución corren por cuenta de la tienda.</p>
        <p className="arrep-txt">Completá el formulario y te damos al instante un código de identificación de tu solicitud.</p>
        <form onSubmit={enviar}>
          <div className="form-group"><label className="form-label">Nombre y apellido *</label><input value={f.nombre} onChange={set('nombre')} autoComplete="name" required /></div>
          <div className="form-group"><label className="form-label">Email *</label><input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></div>
          <div className="arrep-fila">
            <div className="form-group"><label className="form-label">Teléfono</label><input value={f.telefono} onChange={set('telefono')} inputMode="tel" autoComplete="tel" /></div>
            <div className="form-group"><label className="form-label">DNI</label><input value={f.dni} onChange={set('dni')} inputMode="numeric" /></div>
          </div>
          <div className="form-group"><label className="form-label">Número de pedido</label><input value={f.pedido} onChange={set('pedido')} inputMode="numeric" placeholder="Ej: 6021" /><small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Está en el mail de la compra. Si no lo tenés, dejalo vacío y contanos qué compraste abajo.</small></div>
          <div className="form-group"><label className="form-label">Comentario (opcional)</label><textarea value={f.detalle} onChange={set('detalle')} rows={3} style={{ width: '100%' }} placeholder="Qué producto querés devolver" /></div>
          <button className="btn btn-primary" type="submit" disabled={enviando} style={{ width: '100%', padding: 14, fontWeight: 800 }}>{enviando ? 'Enviando…' : 'Enviar solicitud de arrepentimiento'}</button>
        </form>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>Ley 24.240 de Defensa del Consumidor (art. 34) y Resolución 424/2020 de la Secretaría de Comercio Interior.</p>
      </div>
    </div>
  );
}


// ─── ADMIN: Popups ───
const imagenesPopup = (p) => { const arr = Array.isArray(p && p.imagenes) ? p.imagenes.filter(Boolean) : []; return arr.length ? arr : (p && p.imagen ? [p.imagen] : []); };


// Pop-up de la tienda: carrusel si tiene varias imágenes (pasa solo cada 4 s, con flechas y puntos).
function PopupPromo({ popup, onClose }) {
  const imgs = imagenesPopup(popup);
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const toque = useRef(null);
  useEffect(() => { if (imgs.length < 2 || pausa) return; const t = setInterval(() => setI(x => (x + 1) % imgs.length), 4000); return () => clearInterval(t); }, [imgs.length, pausa]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const ir = (d) => { setPausa(true); setI(x => (x + d + imgs.length) % imgs.length); };
  const destino = urlSegura(popup.url_destino);
  const abrirDestino = () => { if (!destino) return; if (/^https?:\/\//i.test(destino) && !destino.includes(window.location.host)) window.open(destino, '_blank', 'noopener'); else window.location.href = destino; };
  return (
    <div className="modal-overlay popup-overlay" onClick={onClose}>
      <div className={`popup-promo${imgs.length ? '' : ' solo-texto'}`} onClick={e => e.stopPropagation()} role="dialog" aria-label={popup.titulo || 'Promoción'}>
        <button type="button" className="popup-cerrar" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        {imgs.length > 0 && (
          <div className="popup-media" onTouchStart={e => { toque.current = e.touches[0].clientX; }} onTouchEnd={e => { if (toque.current == null || imgs.length < 2) return; const dx = e.changedTouches[0].clientX - toque.current; toque.current = null; if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1); }}>
            {imgs.map((u, k) => <img key={k} src={imgOpt(u, 900)} alt={popup.titulo || ''} className={k === i ? 'activa' : ''} onClick={abrirDestino} style={{ cursor: destino ? 'pointer' : 'default' }} />)}
            {imgs.length > 1 && <>
              <button type="button" className="popup-flecha izq" onClick={() => ir(-1)} aria-label="Anterior"><ChevronLeft size={20} /></button>
              <button type="button" className="popup-flecha der" onClick={() => ir(1)} aria-label="Siguiente"><ChevronRight size={20} /></button>
              <div className="popup-puntos">{imgs.map((_, k) => <button key={k} type="button" className={k === i ? 'on' : ''} onClick={() => { setPausa(true); setI(k); }} aria-label={`Imagen ${k + 1}`} />)}</div>
            </>}
          </div>
        )}
        {(popup.titulo || destino) && (
          <div className="popup-pie">
            {popup.titulo && <h3>{popup.titulo}</h3>}
            {destino && <button type="button" className="btn btn-primary" onClick={abrirDestino}>Ver más</button>}
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// FAVORITOS PAGE
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// SEARCH RESULTS PAGE
// ═══════════════════════════════════════════════════════════
function SearchResultsPage() {
  const { globalSearch, setGlobalSearch, globalResults, doGlobalSearch, nav, toast, addToCart, getPrice, userLista, config, user, secciones, promos, precioLista, precioEfectivo, ajusteCliente } = useContext(Ctx);
  const [favIds, setFavIds] = useState(new Set());
  useEffect(() => { if (user) api.getFavoritos().then(fs => setFavIds(new Set(fs.map(f => f.producto_id)))).catch(() => {}); }, [user]);
  const toggleFav = async (pid) => { try { if (favIds.has(pid)) { await api.removeFavorito(pid); setFavIds(prev => { const n = new Set(prev); n.delete(pid); return n; }); toast('Quitado de favoritos'); } else { await api.addFavorito(pid); setFavIds(prev => new Set(prev).add(pid)); toast('Agregado a favoritos'); } } catch {} };

  // Trigger search on mount if we have a term but no results yet
  useEffect(() => { if (globalSearch.length >= 2 && !globalResults) doGlobalSearch(); }, []);

  const total = globalResults?.total || 0;
  // Contador propio: anotar lo que buscan y cuántos resultados encontraron (una vez por búsqueda)
  const busqContada = useRef('');
  useEffect(() => { if (globalResults && globalSearch.length >= 2 && busqContada.current !== globalSearch) { busqContada.current = globalSearch; trackBusqueda(globalSearch, total); } }, [globalResults, globalSearch, total]);
  const resultados = globalResults?.resultados || [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => nav('landing')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', marginBottom: 16 }}>← Volver</button>
      <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Resultados para "{globalSearch}"</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{total} producto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>

      {total === 0 && globalSearch.length >= 2 && (
        <div className="empty-state"><h3>No encontramos productos</h3><p>Probá con otro término o revisá la ortografía.</p></div>
      )}

      {resultados.map(r => {
        const sec = r.seccion;
        return (
          <div key={sec.id} style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)', marginBottom: 12, cursor: 'pointer' }} onClick={() => nav('section', sec.id)}>{sec.nombre} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({r.productos.length})</span></h3>
            <div className="product-grid">
              {r.productos.map(p => <TarjetaProducto key={p.id} p={p} secId={sec.id} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FavoritosPage() {
  const { nav, favIds } = useContext(Ctx);
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getFavoritos().then(f => { setFavs(f || []); setLoading(false); }).catch(() => setLoading(false)); }, []);
  // Al tocar el corazón en una tarjeta se saca de la lista al instante
  const lista = favs.filter(f => favIds.has(f.producto_id) && f.visible !== false).map(f => ({ ...f, id: f.producto_id, created_at: f.creado }));
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <button className="link-btn" onClick={() => nav('landing')} style={{ marginBottom: 12 }}>← Volver</button>
      <h2 style={{ fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Heart size={18} /> Mis favoritos ({lista.length})</h2>
      {loading ? <div className="spinner" /> : lista.length === 0 ? (
        <div className="empty-state"><h3>No tenés favoritos todavía</h3><p>Tocá el corazón en los productos para guardarlos acá.</p></div>
      ) : (
        <div className="product-grid">
          {lista.map(p => <TarjetaProducto key={p.id} p={p} secId={p.seccion_id} />)}
        </div>
      )}
    </div>
  );
}



// Compartido con el panel (src/Panel.jsx)
export { AvisoSeccion, CARD_STYLES, Ctx, FONT_OPTIONS, ICON_MAP, Ico, ItemProd, RADIUS_STYLES, RedIcon, RenderIcon, SHADOW_STYLES, TEMA_KEYS, THEME_PRESETS, TextBar, applyDesignVars, codificarCarrito, ensureFont, faltaTxt, fmt, fmtARS, fmtPedido, fmtUSD, imagenesPopup, imgOpt, mostrarUsdSec, numOrden, productPath, redIconTipo, slugify, urlSegura, useCotizacionUsd, waIntl, waLink };
