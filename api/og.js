// Vercel Serverless Function — OG meta tags for social link previews
// Location: /api/og.js  (project root, lowercase "api", NOT inside src/)
// Project is "type": "module" so this uses ESM export default.

const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export default async function handler(req, res) {
  const producto = req.query.producto;
  const tienda = req.query.tienda;

  if (!producto) { res.statusCode = 302; res.setHeader('Location', '/'); res.end(); return; }

  const apiUrl = (process.env.VITE_API_URL || process.env.API_URL || '').replace(/\/$/, '');
  const host = req.headers.host || req.headers['x-forwarded-host'] || '';
  const canonical = `https://${host}/?producto=${encodeURIComponent(producto)}${tienda ? '&tienda=' + encodeURIComponent(tienda) : ''}`;

  if (!apiUrl) {
    res.statusCode = 302; res.setHeader('Location', canonical); res.end(); return;
  }

  // Resolve tenant from hostname
  let tenant = tienda || '';
  if (!tenant) {
    if (host.includes('comerciapp.com.ar')) {
      const parts = host.split('.');
      if (parts.length >= 4 && parts[0] !== 'www') tenant = parts[0];
    } else if (host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+/.test(host) && !host.includes('vercel.app')) {
      tenant = host.replace(/:\d+$/, '');
    }
  }

  const headers = { 'Content-Type': 'application/json' };
  if (tenant) headers['X-Tenant'] = tenant;

  try {
    const [prodRes, designRes] = await Promise.all([
      fetch(`${apiUrl}/api/productos/id/${encodeURIComponent(producto)}`, { headers }),
      fetch(`${apiUrl}/api/design`, { headers })
    ]);

    if (!prodRes.ok) { res.statusCode = 302; res.setHeader('Location', canonical); res.end(); return; }

    const prod = await prodRes.json();
    const design = await designRes.json().catch(() => ({}));

    const title = esc(prod.nombre || prod.modelo || 'Producto');
    const price = Number(prod.precio_oferta > 0 ? prod.precio_oferta : prod.precio_base) || 0;
    const priceStr = price > 0 ? `$${price.toLocaleString('es-AR')}` : 'Consultar precio';
    const image = prod.imagen || '';
    const storeName = esc(design.nombre_tienda || '');
    const desc = esc(`${priceStr}${storeName ? ' — ' + storeName : ''}`);

    const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta property="og:type" content="product">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${esc(image)}">
${price > 0 ? `<meta property="product:price:amount" content="${price}"><meta property="product:price:currency" content="ARS">` : ''}
<title>${title}${storeName ? ' — ' + storeName : ''}</title>
</head><body>
<script>window.location.replace(${JSON.stringify(canonical)});</script>
<p>Redirigiendo… <a href="${esc(canonical)}">Ver producto</a></p>
</body></html>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.end(html);
  } catch (e) {
    res.statusCode = 302; res.setHeader('Location', canonical); res.end();
  }
}
