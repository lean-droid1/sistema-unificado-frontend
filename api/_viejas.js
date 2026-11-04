// Direcciones viejas de Empretienda → páginas nuevas (redirección permanente 301).
// Empretienda usaba /categoria/producto y /categoria/subcategoria/producto. Esas direcciones ya estaban
// en Google: si no se redirigen, quedan como "noindex" o 404 y se pierde lo que tenían posicionado.
// Lo usa api/render.js solo cuando la ruta no es una página de la web nueva.

const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60).replace(/-+$/, '');
const slugLargo = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'y', 'en', 'a', 'por', 'al', 'un', 'una', 'e', 'o']);

export const tokens = (s) => slugLargo(s).split('-').filter((t) => t && !STOP.has(t));

// ¿Cuánto del slug viejo está en el nombre nuevo? Los números y modelos (a51, g52, 10u) tienen que coincidir exactos.
export function puntaje(viejos, nuevosArr) {
  const nuevos = new Set(nuevosArr);
  if (!viejos.length || !nuevos.size) return { score: 0, cov: 0, dig: 0 };
  let suma = 0, digTot = 0, digOk = 0;
  for (const t of viejos) {
    const conNum = /\d/.test(t);
    if (conNum) digTot++;
    if (nuevos.has(t)) { suma += 1; if (conNum) digOk++; continue; }
    // Palabras cortadas o en plural ("repa" → "reparador", "pin" → "pines"): valen menos
    if (!conNum && t.length >= 3 && nuevosArr.some((n) => !/\d/.test(n) && n.length >= 3 && (n.startsWith(t) || t.startsWith(n)))) suma += 0.8;
  }
  const cov = suma / viejos.length;
  const prec = Math.min(1, suma / nuevos.size);
  return { score: 0.7 * cov + 0.3 * prec, cov, dig: digTot ? digOk / digTot : 1 };
}

// El producto que corresponde al slug viejo, o null si ninguno es claramente el mismo
export function mejorProducto(slugViejo, productos) {
  let viejos = tokens(slugViejo);
  // ".../nombre-envio-deposito": Empretienda le agregaba la tienda al final
  while (viejos.length > 2 && ['envio', 'deposito'].includes(viejos[viejos.length - 1])) viejos = viejos.slice(0, -1);
  if (viejos.length < 2) return null;
  let mejor = null, segundo = 0;
  for (const p of productos) {
    const r = puntaje(viejos, tokens(p.nombre || p.modelo));
    if (r.dig < 0.7) continue;
    if (!mejor || r.score > mejor.r.score) { if (mejor) segundo = Math.max(segundo, mejor.r.score); mejor = { p, r }; }
    else if (r.score > segundo) segundo = r.score;
  }
  if (!mejor) return null;
  const { score, cov } = mejor.r;
  if (cov < 0.7 || score < 0.66) return null;
  if (cov < 0.95 && score - segundo < 0.04) return null; // empate entre dos parecidos: mejor no adivinar
  return mejor.p;
}

// Categoría cuyo nombre está dentro del segmento viejo ("oferta-pines-por-pack-de-10u" → "OFERTA POR PACK DE 10U")
export function mejorCategoria(segmento, cats) {
  const viejos = tokens(segmento);
  if (!viejos.length) return null;
  let mejor = null;
  for (const c of cats || []) {
    const nuevos = tokens(c.titulo || c.slug);
    if (!nuevos.length) continue;
    const exacto = c.slug === segmento || slugify(c.titulo) === segmento;
    const dentro = puntaje(nuevos, viejos).cov;   // cuánto del nombre de la categoría está en el segmento viejo
    const cubre = puntaje(viejos, nuevos).cov;    // cuánto del segmento viejo está en la categoría
    const s = exacto ? 2 : (dentro >= 0.99 && cubre >= 0.5 ? 1 + cubre : 0);
    if (s > 0 && (!mejor || s > mejor.s)) mejor = { c, s };
  }
  return mejor ? mejor.c : null;
}

const productPath = (p) => `/producto/${slugify(p.nombre || p.modelo || 'producto') || 'producto'}-${p.id}`;

/**
 * Destino nuevo para una dirección vieja, o null si no hay que redirigir.
 * datos: { indice: productos [{id,nombre,modelo}], cats: categorias-info, secs: secciones, config }
 */
export function destinoViejo(parts, query, datos) {
  const a = parts[0] || '';
  const { indice = [], cats = [], secs = [], config = {} } = datos || {};
  // Buscador de Empretienda: /search?q=...
  if (a === 'search') return query && query.q ? `/buscar/${encodeURIComponent(String(query.q).slice(0, 80))}` : '/';
  if (a === 'productos' && parts.length === 1) return '/';
  if (a === 'cursos' && parts.length === 1) return /^https:\/\//.test(String(config.academia_url || '')) ? String(config.academia_url).replace(/\/+$/, '') + '/' : '/';
  if (parts.length === 1) {
    if (a === 'envio-deposito') { const s = secs.find((x) => /deposito/.test(slugLargo(x.nombre)) || x.slug === 'dropshipping'); if (s) return '/' + (s.slug || 's-' + s.id); }
    const c = mejorCategoria(a, cats);
    return c ? `/categoria/${c.slug}` : '/';
  }
  // /categoria/producto o /categoria/subcategoria/producto
  const p = mejorProducto(parts[parts.length - 1], indice);
  if (p) return productPath(p);
  // /categoria/subcategoria (o un producto que ya no está): la categoría más parecida
  for (const seg of [parts[parts.length - 1], parts[1], a]) {
    const c = seg && mejorCategoria(seg, cats);
    if (c) return `/categoria/${c.slug}`;
  }
  // Sin un producto claro: el buscador con las palabras del nombre viejo (la persona encuentra lo parecido)
  const palabras = tokens(parts[parts.length - 1]).filter((t) => !['envio', 'deposito'].includes(t)).slice(0, 6).join(' ');
  return palabras ? `/buscar/${encodeURIComponent(palabras)}` : '/';
}
