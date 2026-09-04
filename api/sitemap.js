// Vercel Serverless Function — sitemap.xml dinámico (secciones + productos)
// Ubicación: /api/sitemap.js  (raíz del repo, "api" en minúscula, NO dentro de src/)
// Se sirve en /sitemap.xml vía el rewrite de vercel.json.

const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
const xmlEsc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async function handler(req, res) {
  const apiUrl = (process.env.VITE_API_URL || process.env.API_URL || '').replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origin = `https://${host}`;

  // Resolver tenant desde el host (igual que og.js)
  let tenant = '';
  if (host.includes('comerciapp.com.ar')) {
    const parts = host.split('.');
    if (parts.length >= 4 && parts[0] !== 'www') tenant = parts[0];
  } else if (host && host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+/.test(host) && !host.includes('vercel.app')) {
    tenant = host.replace(/:\d+$/, '');
  }
  const headers = {}; if (tenant) headers['X-Tenant'] = tenant;

  const urls = [`${origin}/`];
  try {
    if (apiUrl) {
      const [secs, prodData] = await Promise.all([
        fetch(`${apiUrl}/api/secciones`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/api/productos?limit=5000`, { headers }).then(r => r.json()).catch(() => ({ productos: [] }))
      ]);
      for (const s of (Array.isArray(secs) ? secs : [])) {
        if (s.slug || s.id) urls.push(`${origin}/${s.slug || ('s-' + s.id)}`);
      }
      for (const p of ((prodData && prodData.productos) || [])) {
        if (p.id) urls.push(`${origin}/producto/${slugify(p.nombre || p.modelo || 'producto') || 'producto'}-${p.id}`);
      }
    }
  } catch (e) {}

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${xmlEsc(u)}</loc></url>`).join('\n')}\n</urlset>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.end(xml);
}
