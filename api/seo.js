// Vercel Function — archivos para buscadores, por dominio (multi-tienda):
//   /robots.txt              → ?tipo=robots  (apunta al sitemap del dominio que lo pide)
//   /googleXXXXXXXX.html     → ?tipo=google  (verificación de Google Search Console; el nombre del
//                               archivo lo carga cada tienda en Panel → Marketing → Analytics / Pixels)

function resolveTenant(host, tienda) {
  if (tienda) return tienda;
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
  const q = req.query || {};

  if (q.tipo === 'robots') {
    const txt = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /panel',
      'Disallow: /mi-cuenta',
      'Disallow: /carrito',
      'Disallow: /favoritos',
      'Disallow: /ingresar',
      'Disallow: /registro',
      'Disallow: /recuperar',
      'Disallow: /preview',
      'Disallow: /buscar',
      '',
      `Sitemap: ${proto}://${host}/sitemap.xml`,
      '',
    ].join('\n');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.end(txt);
    return;
  }

  if (q.tipo === 'google') {
    const f = String(q.f || '').toLowerCase();
    const apiUrl = (process.env.VITE_API_URL || process.env.API_URL || '').replace(/\/$/, '');
    let ok = false;
    if (/^google[a-z0-9]{6,64}\.html$/.test(f) && apiUrl) {
      try {
        const tenant = resolveTenant(host, typeof q.tienda === 'string' ? q.tienda : '');
        const headers = tenant ? { 'X-Tenant': tenant } : {};
        const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 4000);
        const r = await fetch(`${apiUrl}/api/config`, { headers, signal: ac.signal }).finally(() => clearTimeout(t));
        const cfg = r.ok ? await r.json() : {};
        ok = String(cfg.gsc_archivo || '').trim().toLowerCase() === f;
      } catch (e) {}
    }
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    if (!ok) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('Not found'); return; }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`google-site-verification: ${f}`);
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
}
