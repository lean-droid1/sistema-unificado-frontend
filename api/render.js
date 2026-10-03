// Vercel Function — sirve el index.html de la tienda con título, descripción, imagen, canonical y
// datos estructurados (Product) ya puestos para cada producto / sección. Así Google y las redes leen
// la página sin tener que ejecutar el JavaScript. El contenido es el mismo que ve el cliente.
// Se llega acá por el rewrite de vercel.json (todas las rutas de la tienda menos "/" y archivos).
// Si algo falla, la tienda funciona igual: se sirve el index.html sin cambios o se redirige al inicio
// con ?__r=<ruta> (main.jsx restaura la ruta).

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
// Igual que en App.jsx — resumen para Google (meta description): sin viñetas ni rótulos tipo "Detalles del producto", cortado en una palabra
const resumenDesc = (s, max = 160) => {
  let t = stripHtml(s).replace(/[•*>]+/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/^((detalles( del producto)?|descripci[oó]n( del producto)?|especificaciones|caracter[ií]sticas)\s*:?\s*)+/i, '');
  if (t.length <= max) return t;
  const c = t.slice(0, max - 1); const k = c.lastIndexOf(' ');
  return (k > 80 ? c.slice(0, k) : c).replace(/[\s,;:.-]+$/, '') + '…';
};
const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60).replace(/-+$/, '');
const slugPagina = (p) => slugify(p.slug || p.titulo) || String(p.id);
const productPath = (p) => `/producto/${slugify(p.nombre || p.modelo || 'producto') || 'producto'}-${p.id}`;
const parseProdId = (seg) => { const m = String(seg || '').match(/-(\d+)$/); return m ? Number(m[1]) : (Number(seg) || null); };
const RESERVADAS = new Set(['producto', 'info', 'categoria', 'buscar', 'carrito', 'favoritos', 'contacto', 'mi-cuenta', 'panel', 'ingresar', 'registro', 'recuperar', 'preview', 'api', 'og', 'crear-tienda']);
const PRIVADAS = new Set(['buscar', 'carrito', 'favoritos', 'mi-cuenta', 'panel', 'ingresar', 'registro', 'recuperar', 'preview']);

let plantilla = null; // index.html de este deploy (cada deploy tiene sus propias instancias)

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

async function pedir(url, opts = {}, ms = 2500) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ac.signal });
    const data = r.ok ? await r.json().catch(() => null) : null;
    return { status: r.status, data };
  } catch (e) { return { status: 0, data: null }; }
  finally { clearTimeout(t); }
}

async function cargarPlantilla(origin) {
  if (plantilla) return plantilla;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch(`${origin}/index.html`, { signal: ac.signal });
    const html = r.ok ? await r.text() : '';
    if (!html.includes('id="root"')) throw new Error('plantilla inválida');
    plantilla = html;
    return html;
  } finally { clearTimeout(t); }
}

function inyectar(html, m) {
  let h = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]*|twitter:[^"]*|product:[^"]*)"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
  const t = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.desc)}" />`,
    `<meta name="robots" content="${m.noindex ? 'noindex, follow' : 'index, follow'}" />`,
    m.url ? `<link rel="canonical" href="${esc(m.url)}" />` : '',
    `<meta property="og:type" content="${esc(m.type)}" />`,
    `<meta property="og:site_name" content="${esc(m.tienda)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.desc)}" />`,
    m.url ? `<meta property="og:url" content="${esc(m.url)}" />` : '',
    m.image ? `<meta property="og:image" content="${esc(m.image)}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.desc)}" />`,
    m.image ? `<meta name="twitter:image" content="${esc(m.image)}" />` : '',
    m.precio > 0 ? `<meta property="product:price:amount" content="${m.precio}" /><meta property="product:price:currency" content="ARS" />` : '',
    // Datos (no se ejecuta): la CSP no lo bloquea. Mismo id que usa App.jsx, así no se duplica.
    m.ld ? `<script type="application/ld+json" id="ld-json">${JSON.stringify(m.ld).replace(/</g, '\\u003c')}</script>` : '',
  ].filter(Boolean).join('\n');
  h = h.replace(/<\/head>/i, `${t}\n</head>`);
  if (m.cuerpo) h = h.replace(/(<div id="root"><\/div>)/, `$1\n<noscript>${m.cuerpo}</noscript>`);
  return h;
}

export default async function handler(req, res) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const local = /^(localhost|127\.|\d+\.\d+\.\d+\.\d+)/.test(host);
  const proto = String(req.headers['x-forwarded-proto'] || (local ? 'http' : 'https')).split(',')[0].trim();
  const origin = `${proto}://${host}`;
  const q = req.query || {};

  // Ruta original: viene en ?ruta= (rewrite) o, si no, en req.url
  let ruta = typeof q.ruta === 'string' ? q.ruta : '';
  if (!ruta) { try { const u = new URL(req.url, origin); if (!u.pathname.startsWith('/api/')) ruta = u.pathname; } catch (e) {} }
  ruta = '/' + String(ruta).replace(/^\/+/, '');
  const extra = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (k !== 'ruta' && typeof v === 'string') extra.set(k, v);
  const qs = extra.toString();
  const tiendaQ = typeof q.tienda === 'string' ? q.tienda : '';
  const keep = tiendaQ ? `?tienda=${encodeURIComponent(tiendaQ)}` : '';

  let html;
  try { html = await cargarPlantilla(origin); }
  catch (e) {
    res.statusCode = 302;
    res.setHeader('Location', '/?__r=' + encodeURIComponent(ruta + (qs ? '?' + qs : '')));
    res.setHeader('Cache-Control', 'no-store');
    res.end();
    return;
  }

  const enviar = (status, cuerpoHtml, cacheSeg) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${cacheSeg}, stale-while-revalidate=86400`);
    res.end(cuerpoHtml);
  };

  try {
    const apiUrl = (process.env.VITE_API_URL || process.env.API_URL || '').replace(/\/$/, '');
    if (!apiUrl) return enviar(200, html, 60);
    const tenant = resolveTenant(host, tiendaQ);
    const headers = { 'Content-Type': 'application/json' };
    if (tenant) headers['X-Tenant'] = tenant;

    const parts = ruta.split('/').filter(Boolean);
    const a = parts[0] || '';
    const esProducto = a === 'producto' && parts[1];
    const prodId = esProducto ? parseProdId(parts[1]) : null;
    const esSeccion = parts.length === 1 && !RESERVADAS.has(a);
    const esInfo = a === 'info';
    const esCategoria = a === 'categoria' && parts[1];

    const [dRes, cRes, pRes, sRes, iRes, kRes] = await Promise.all([
      pedir(`${apiUrl}/api/design`, { headers }),
      pedir(`${apiUrl}/api/config`, { headers }),
      prodId ? pedir(`${apiUrl}/api/productos/id/${prodId}`, { headers }) : null,
      esSeccion ? pedir(`${apiUrl}/api/secciones`, { headers }) : null,
      esInfo ? pedir(`${apiUrl}/api/paginas`, { headers }) : null,
      (esCategoria || esProducto) ? pedir(`${apiUrl}/api/categorias-info`, { headers }) : null,
    ]);
    const design = dRes.data || {};
    const config = cRes.data || {};
    const tienda = design.nombre_tienda || 'Tienda';
    const m = {
      tienda,
      title: tienda,
      desc: stripHtml(design.descripcion_tienda || config.meta_description) || `${tienda} — comprá online, envíos a todo el país.`,
      image: design.og_image || design.logo_url || '',
      type: 'website',
      url: origin + ruta + keep, // canonical sin utm/fbclid
      noindex: PRIVADAS.has(a),
      precio: 0,
      ld: null,
      cuerpo: '',
    };
    let status = 200;

    if (esProducto) {
      const p = pRes && pRes.data;
      if (p && p.id) {
        const nom = p.nombre || p.modelo || 'Producto';
        m.title = `${nom} | ${tienda}`;
        const dLarga = resumenDesc(p.descripcion, 600);
        m.desc = resumenDesc(p.descripcion) || `${nom} — comprá en ${tienda}.`;
        m.image = p.imagen || m.image;
        m.type = 'product';
        m.url = origin + productPath(p) + keep;
        const precio = Number(p.precio_oferta > 0 ? p.precio_oferta : p.precio_base) || 0;
        m.precio = precio;
        const ld = { '@context': 'https://schema.org', '@type': 'Product', name: nom, description: m.desc };
        if (m.image) ld.image = [m.image];
        if (p.sku) ld.sku = p.sku;
        if (p.marca) ld.brand = { '@type': 'Brand', name: p.marca };
        if (precio > 0) ld.offers = { '@type': 'Offer', price: precio, priceCurrency: 'ARS', availability: (p.stock > 0 || p.permitir_sin_stock || p.es_digital) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: m.url };
        // Ruta Inicio > Categoría > Producto (igual que App.jsx)
        delete ld['@context'];
        const catP = kRes && Array.isArray(kRes.data) ? kRes.data.find(c => c.slug === slugify(p.categoria)) : null;
        const migas = [{ '@type': 'ListItem', position: 1, name: tienda, item: origin + '/' }];
        if (catP) migas.push({ '@type': 'ListItem', position: 2, name: p.categoria, item: `${origin}/categoria/${catP.slug}` });
        migas.push({ '@type': 'ListItem', position: migas.length + 1, name: nom, item: m.url });
        m.ld = { '@context': 'https://schema.org', '@graph': [ld, { '@type': 'BreadcrumbList', itemListElement: migas }] };
        m.cuerpo = `<h1>${esc(nom)}</h1>${dLarga ? `<p>${esc(dLarga)}</p>` : ''}${precio > 0 ? `<p>$ ${esc(precio.toLocaleString('es-AR'))}</p>` : ''}`;
      } else if (pRes && pRes.status === 404) {
        status = 404; m.noindex = true; m.title = `Producto no disponible | ${tienda}`;
      }
    } else if (esSeccion) {
      const secs = sRes && Array.isArray(sRes.data) ? sRes.data : null;
      const sec = secs && secs.find(s => s.slug === a || ('s-' + s.id) === a);
      if (sec) {
        m.title = `${sec.nombre} | ${tienda}`;
        m.desc = `${sec.nombre} — ${tienda}. Envíos a todo el país.`;
        const pag = Number(q.pag) || 1;
        m.url = origin + '/' + (sec.slug || ('s-' + sec.id)) + (() => { const k = new URLSearchParams(); if (tiendaQ) k.set('tienda', tiendaQ); if (pag > 1) k.set('pag', String(pag)); const s = k.toString(); return s ? '?' + s : ''; })();
        m.cuerpo = `<h1>${esc(sec.nombre)}</h1>`;
      } else if (secs) {
        status = 404; m.noindex = true;
      }
    } else if (esInfo) {
      const pags = iRes && Array.isArray(iRes.data) ? iRes.data : null;
      const pg = pags && (parts[1] ? pags.find(x => slugPagina(x) === parts[1]) : pags[0]);
      if (pg) {
        m.title = `${pg.titulo} | ${tienda}`;
        m.desc = resumenDesc(pg.contenido) || pg.titulo;
        m.url = origin + '/info/' + slugPagina(pg) + keep;
        m.cuerpo = `<h1>${esc(pg.titulo)}</h1><p>${esc(resumenDesc(pg.contenido, 3000))}</p>`;
      } else if (pags) {
        status = 404; m.noindex = true;
      }
    } else if (esCategoria) {
      const cats = kRes && Array.isArray(kRes.data) ? kRes.data : null;
      const cat = cats && cats.find(c => c.slug === parts[1]);
      if (cat) {
        const url = origin + '/categoria/' + cat.slug + keep;
        m.title = `${cat.titulo} | ${tienda}`;
        m.desc = resumenDesc(cat.descripcion) || `${cat.titulo}: ${cat.productos} productos en ${tienda}. Envíos a todo el país.`;
        m.url = url;
        // Lista de productos con links (Google sigue estos links y encuentra cada ficha)
        const listas = await Promise.all(cat.nombres.map(n => pedir(`${apiUrl}/api/productos?categoria=${encodeURIComponent(n)}&limit=200`, { headers }).then(r => (r.data && r.data.productos) || [])));
        const prods = listas.flat().slice(0, 300);
        if (prods[0] && prods[0].imagen) m.image = prods[0].imagen;
        m.ld = { '@context': 'https://schema.org', '@graph': [
          { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: tienda, item: origin + '/' }, { '@type': 'ListItem', position: 2, name: cat.titulo, item: url }] },
          { '@type': 'ItemList', itemListElement: prods.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: origin + productPath(p) })) },
        ] };
        m.cuerpo = `<h1>${esc(cat.titulo)}</h1>${cat.descripcion ? `<p>${esc(cat.descripcion)}</p>` : ''}<ul>${prods.map(p => `<li><a href="${esc(productPath(p))}">${esc(p.nombre || p.modelo || 'Producto')}</a></li>`).join('')}</ul>`;
      } else if (cats) {
        status = 404; m.noindex = true;
      }
    } else if (a === 'contacto') {
      m.title = `Contacto | ${tienda}`;
    }

    enviar(status, inyectar(html, m), status === 200 ? 600 : 60);
  } catch (e) {
    enviar(200, html, 60);
  }
}
