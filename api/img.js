// Vercel Serverless Function — proxy de imágenes para el generador de imágenes de redes.
// Ubicación: /api/img.js  (raíz del repo, carpeta "api", NO dentro de src/)
// Trae la foto del producto y la re-sirve desde tu propio dominio con CORS habilitado,
// así el <canvas> no queda "tainted" y la imagen se puede descargar/compartir.

function esHostPrivado(host) {
  const h = (host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;
  if (/^(0|127|10)\./.test(h) || h === '0.0.0.0' || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h.includes(':')) return true; // IPv6 literal (incluye ::1 y ::ffff:127.0.0.1): no se usan para fotos
  if (/^\d+$/.test(h) || /^0x/i.test(h)) return true; // IP escrita como número entero o en hexa
  return false;
}
// Solo fotos comunes. SVG queda afuera: puede traer código y correría con el dominio de la tienda.
const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export default async function handler(req, res) {
  const url = req.query.url;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  if (!url) { res.statusCode = 400; res.end('Falta url'); return; }
  let u;
  try { u = new URL(url); } catch (e) { res.statusCode = 400; res.end('URL inválida'); return; }
  if (u.protocol !== 'https:' || esHostPrivado(u.hostname)) { res.statusCode = 400; res.end('URL no permitida'); return; }
  try {
    // Seguimos redirecciones a mano para revisar cada destino (que no lleven a una IP interna)
    let actual = u, r = null;
    for (let i = 0; i < 4; i++) {
      r = await fetch(actual.toString(), { redirect: 'manual' });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        const sig = new URL(r.headers.get('location'), actual);
        if (sig.protocol !== 'https:' || esHostPrivado(sig.hostname)) { res.statusCode = 400; res.end('URL no permitida'); return; }
        actual = sig; continue;
      }
      break;
    }
    if (!r || !r.ok) { res.statusCode = 502; res.end('No se pudo traer la imagen'); return; }
    const ct = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!TIPOS_OK.includes(ct)) { res.statusCode = 415; res.end('No es una imagen'); return; }
    const largo = Number(r.headers.get('content-length') || 0);
    if (largo > 8 * 1024 * 1024) { res.statusCode = 413; res.end('Imagen muy grande'); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.statusCode = 200;
    res.end(buf);
  } catch (e) { res.statusCode = 500; res.end('Error'); }
}
