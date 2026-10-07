// Vercel Function — catálogo para Google Merchant Center (Google Shopping), formato RSS 2.0 con g:
// Se sirve en /productos-google.xml (rewrite en vercel.json). Merchant Center lo lee una vez por día.
// Incluye solo productos públicos (los de secciones mayoristas no salen), con precio en pesos y foto.
// Los digitales (licencias) van con envío $0; con variantes, el precio es el "desde" en pesos (igual que la web).
import { precioPublico, permiteTienda } from './_precio.js';

const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60).replace(/-+$/, '');
const productPath = (p) => `/producto/${slugify(p.nombre || p.modelo || 'producto') || 'producto'}-${p.id}`;
const xmlEsc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const limpio = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/[•*>]+/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^((detalles( del producto)?|descripci[oó]n( del producto)?|especificaciones|caracter[ií]sticas)\s*:?\s*)+/i, '');
const monto = (n) => `${Number(n).toFixed(2)} ARS`;

function resolveTenant(host, tienda) {
  if (tienda && permiteTienda(host)) return tienda;
  if (host.includes('comerciapp.com.ar')) {
    const parts = host.split('.');
    if (parts.length >= 4 && parts[0] !== 'www') return parts[0];
  } else if (host && !/^localhost(:\d+)?$/.test(host) && !/^\d+\.\d+\.\d+\.\d+/.test(host) && !host.includes('vercel.app')) {
    return host.replace(/:\d+$/, '');
  }
  return '';
}

export default async function handler(req, res) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const local = /^(localhost|127\.|\d+\.\d+\.\d+\.\d+)/.test(host);
  const proto = String(req.headers['x-forwarded-proto'] || (local ? 'http' : 'https')).split(',')[0].trim();
  const origin = `${proto}://${host}`;
  const apiUrl = (process.env.VITE_API_URL || process.env.API_URL || '').replace(/\/$/, '');
  const q = req.query || {};
  const tenant = resolveTenant(host, typeof q.tienda === 'string' ? q.tienda : '');
  const headers = tenant ? { 'X-Tenant': tenant } : {};

  try {
    const [prodData, design, promos] = await Promise.all([
      fetch(`${apiUrl}/api/productos?limit=10000`, { headers }).then(r => r.ok ? r.json() : Promise.reject(new Error('api ' + r.status))),
      fetch(`${apiUrl}/api/design`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${apiUrl}/api/promociones/activas`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]);
    const tienda = design.nombre_tienda || 'Tienda';
    const items = [];
    for (const p of (prodData && prodData.productos) || []) {
      const pp = precioPublico(p, promos);
      const base = Number(pp.original) || 0;
      if (base <= 0 || !p.imagen || !/^https:\/\//.test(p.imagen)) continue; // Google exige precio y foto https
      if (pp.moneda && pp.moneda !== 'ARS') continue; // el feed es en pesos: los productos en USDT/USD no van
      if (/^prueba\b/i.test(String(p.categoria || '')) || /\bprueba\b/i.test(String(p.nombre || '')) && base < 10) continue;
      const titulo = String(p.nombre || p.modelo || '').trim().slice(0, 150);
      if (!titulo) continue;
      const disponible = (Number(p.stock) > 0 || p.permitir_sin_stock || p.usa_variantes || p.es_digital) ? 'in_stock' : 'out_of_stock';
      const desc = limpio(p.descripcion).slice(0, 4900) || `${titulo}. Comprá en ${tienda} con envíos a todo el país.`;
      // Mismo precio que ve el cliente en la web (oferta y promociones activas): si no coincide, Merchant Center rechaza el producto
      const precio = (pp.precio > 0 && pp.precio < base)
        ? `<g:price>${monto(base)}</g:price><g:sale_price>${monto(pp.precio)}</g:sale_price>`
        : `<g:price>${monto(base)}</g:price>`;
      items.push(`<item>
<g:id>${p.id}</g:id>
<title>${xmlEsc(titulo)}</title>
<description>${xmlEsc(desc)}</description>
<link>${xmlEsc(origin + productPath(p))}</link>
<g:image_link>${xmlEsc(p.imagen)}</g:image_link>
<g:availability>${disponible}</g:availability>
${precio}
<g:condition>new</g:condition>
${p.marca && !/^gen[eé]ric/i.test(p.marca) ? `<g:brand>${xmlEsc(p.marca)}</g:brand>` : ''}
<g:identifier_exists>no</g:identifier_exists>
${p.categoria ? `<g:product_type>${xmlEsc(p.categoria)}</g:product_type>` : ''}
${p.es_digital ? '<g:shipping><g:country>AR</g:country><g:price>0.00 ARS</g:price></g:shipping>' : ''}
</item>`);
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${xmlEsc(tienda)}</title>
<link>${xmlEsc(origin)}</link>
<description>${xmlEsc('Catálogo de ' + tienda)}</description>
${items.join('\n')}
</channel>
</rss>`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    res.end(xml);
  } catch (e) {
    // Error temporal: 503 para que Merchant Center reintente y no borre los productos
    res.statusCode = 503;
    res.setHeader('Retry-After', '600');
    res.setHeader('Cache-Control', 'no-store');
    res.end('Catálogo no disponible temporalmente');
  }
}
