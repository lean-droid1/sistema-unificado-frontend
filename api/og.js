// Vercel Serverless Function — OG meta tags para previews en redes (producto + sección)
// Ubicación: /api/og.js  (raíz del repo, "api" en minúscula, NO dentro de src/)
// El proyecto es "type": "module" → export default ESM.

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function resolveTenant(host, tienda) {
  if (tienda) return tienda;
  if (host.includes('comerciapp.com.ar')) {
    const parts = host.split('.');
    if (parts.length >= 4 && parts[0] !== 'www') return parts[0];
  } else if (host && host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+/.test(host) && !host.includes('vercel.app')) {
    return host.replace(/:\d+$/, '');
  }
  return '';
}

function render(res, { title, desc, image, canonical, type, price, storeName }) {
  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta property="og:type" content="${type || 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="${esc(storeName)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
${price > 0 ? `<meta property="product:price:amount" content="${price}"><meta property="product:price:currency" content="ARS">` : ''}
<title>${esc(title)}${storeName ? ' — ' + esc(storeName) : ''}</title>
</head><body>
<script>window.location.replace(${JSON.stringify(canonical)});</script>
<p>Redirigiendo… <a href="${esc(canonical)}">Ver</a></p>
</body></html>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  res.end(html);
}

export default async function handler(req, res) {
  const producto = req.query.producto;
  const seccion = req.query.seccion;
  const tienda = req.query.tienda;
  const apiUrl = (process.env.VITE_API_URL || process.env.API_URL || '').replace(/\/$/, '');
  const host = req.headers.host || req.headers['x-forwarded-host'] || '';
  const tenant = resolveTenant(host, tienda);
  const headers = { 'Content-Type': 'application/json' };
  if (tenant) headers['X-Tenant'] = tenant;
  const qTienda = tienda ? '&tienda=' + encodeURIComponent(tienda) : '';

  // ── PRODUCTO ──
  if (producto) {
    const canonical = `https://${host}/?producto=${encodeURIComponent(producto)}${qTienda}`;
    if (!apiUrl) { res.statusCode = 302; res.setHeader('Location', canonical); res.end(); return; }
    try {
      const [prodRes, designRes, configRes] = await Promise.all([
        fetch(`${apiUrl}/api/productos/id/${encodeURIComponent(producto)}`, { headers }),
        fetch(`${apiUrl}/api/design`, { headers }),
        fetch(`${apiUrl}/api/config`, { headers })
      ]);
      if (!prodRes.ok) { res.statusCode = 302; res.setHeader('Location', canonical); res.end(); return; }
      const prod = await prodRes.json();
      const design = await designRes.json().catch(() => ({}));
      const config = await configRes.json().catch(() => ({}));
      const price = Number(prod.precio_oferta > 0 ? prod.precio_oferta : prod.precio_base) || 0;
      const priceStr = price > 0 ? `$${price.toLocaleString('es-AR')}` : 'Consultar precio';
      const storeName = design.nombre_tienda || '';
      const umbral = Number(config['envio_gratis_desde_' + prod.seccion_id]) || 0;
      const envioGratis = !prod.excluir_envio_gratis && (!!prod.envio_gratis || (umbral > 0 && price >= umbral));
      const partes = [priceStr];
      if (envioGratis) partes.push('🚚 Envío gratis');
      if (storeName) partes.push(storeName);
      render(res, { title: prod.nombre || prod.modelo || 'Producto', desc: partes.join(' · '), image: prod.imagen || design.og_image || design.logo_url || '', canonical, type: 'product', price, storeName });
    } catch (e) { res.statusCode = 302; res.setHeader('Location', canonical); res.end(); }
    return;
  }

  // ── SECCIÓN ──
  if (seccion) {
    const canonical = `https://${host}/${encodeURIComponent(seccion)}${tienda ? '?tienda=' + encodeURIComponent(tienda) : ''}`;
    if (!apiUrl) { res.statusCode = 302; res.setHeader('Location', canonical); res.end(); return; }
    try {
      const [secsRes, designRes] = await Promise.all([
        fetch(`${apiUrl}/api/secciones`, { headers }),
        fetch(`${apiUrl}/api/design`, { headers })
      ]);
      const secs = await secsRes.json().catch(() => []);
      const design = await designRes.json().catch(() => ({}));
      const sec = (Array.isArray(secs) ? secs : []).find(s => s.slug === seccion || ('s-' + s.id) === seccion);
      if (!sec) { res.statusCode = 302; res.setHeader('Location', canonical); res.end(); return; }
      const storeName = design.nombre_tienda || '';
      render(res, { title: sec.nombre || 'Catálogo', desc: sec.descripcion ? String(sec.descripcion) : `Mirá ${sec.nombre}${storeName ? ' en ' + storeName : ''}. Envíos a todo el país.`, image: sec.imagen || design.og_image || design.logo_url || '', canonical, type: 'website', price: 0, storeName });
    } catch (e) { res.statusCode = 302; res.setHeader('Location', canonical); res.end(); }
    return;
  }

  res.statusCode = 302; res.setHeader('Location', '/'); res.end();
}
