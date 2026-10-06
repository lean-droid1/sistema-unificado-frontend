// Precio público (visitante sin cuenta), con las mismas reglas que la tienda y el checkout:
// preventa con su %, oferta del producto si es menor y la mejor promoción activa (solo precios en pesos).
// Lo usan render.js, og.js y feed.js para que Google y las redes muestren el mismo precio que la web.
// (Archivo con "_" adelante: Vercel no lo publica como función.)
const num = (n) => Number(n) || 0;

function mejorPromo(base, p, promos) {
  if (!(base > 0) || !Array.isArray(promos) || !promos.length) return null;
  const secId = p.seccion_id != null ? String(p.seccion_id) : '';
  let mejor = null;
  for (const pr of promos) {
    if (pr.tipo !== 'porcentaje' && pr.tipo !== 'monto_fijo') continue;
    const secs = String(pr.secciones_ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (secs.length && !(secId && secs.includes(secId))) continue;
    const prods = String(pr.productos_ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (prods.length && !prods.includes(String(p.id))) continue;
    if (pr.categoria && pr.categoria !== p.categoria) continue;
    const val = Math.max(0, num(pr.valor));
    const final = pr.tipo === 'porcentaje' ? Math.max(0, Math.round(base * (1 - Math.min(val, 100) / 100))) : Math.max(0, base - val);
    if (final < base && (!mejor || final < mejor)) mejor = final;
  }
  return mejor;
}

export function precioPublico(p, promos) {
  if (!p) return { precio: 0, original: 0 };
  // Con variantes la web muestra "desde" la más barata: se usa ese precio si viene (listado) y es en pesos; si no, no hay precio único
  if (p.usa_variantes) {
    const desde = num(p.precio_desde);
    if (!(desde > 0) || (p.moneda_desde && p.moneda_desde !== 'ARS')) return { precio: 0, original: 0, moneda: 'ARS' };
    const pr = mejorPromo(desde, p, promos);
    return { precio: pr != null ? pr : desde, original: desde, moneda: 'ARS' };
  }
  const base = num(p.precio_base);
  if (!(base > 0)) return { precio: 0, original: 0 };
  if (p.es_preventa) {
    const pct = num(p.preventa_descuento_pct);
    return { precio: pct > 0 ? Math.round(base * (1 - pct / 100)) : base, original: base, moneda: p.moneda && p.moneda !== 'ARS' ? p.moneda : 'ARS' };
  }
  let precio = base;
  const of = num(p.precio_oferta);
  if (of > 0 && of < precio) precio = of;
  const moneda = p.moneda && p.moneda !== 'ARS' ? p.moneda : 'ARS';
  if (moneda === 'ARS') { const pr = mejorPromo(precio, p, promos); if (pr != null) precio = pr; }
  return { precio, original: base, moneda };
}

// ?tienda= solo vale en pruebas (localhost, previews de Vercel).
// En la web de una tienda se ignora: nadie puede mostrar otra tienda con tu dominio.
export function permiteTienda(host) {
  const h = String(host || '').replace(/:\d+$/, '').toLowerCase();
  return h === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.endsWith('.vercel.app');
}
