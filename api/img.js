// Vercel Serverless Function — proxy de imágenes para el generador de imágenes de redes.
// Ubicación: /api/img.js  (raíz del repo, carpeta "api", NO dentro de src/)
// Trae la foto del producto y la re-sirve desde tu propio dominio con CORS habilitado,
// así el <canvas> no queda "tainted" y la imagen se puede descargar/compartir.

function esHostPrivado(host) {
  const h = (host || '').toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
}

export default async function handler(req, res) {
  const url = req.query.url;
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!url) { res.statusCode = 400; res.end('Falta url'); return; }
  let u;
  try { u = new URL(url); } catch (e) { res.statusCode = 400; res.end('URL inválida'); return; }
  if (u.protocol !== 'https:' || esHostPrivado(u.hostname)) { res.statusCode = 400; res.end('URL no permitida'); return; }
  try {
    const r = await fetch(u.toString(), { redirect: 'follow' });
    if (!r.ok) { res.statusCode = 502; res.end('No se pudo traer la imagen'); return; }
    const ct = r.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) { res.statusCode = 415; res.end('No es una imagen'); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.statusCode = 200;
    res.end(buf);
  } catch (e) { res.statusCode = 500; res.end('Error'); }
}
