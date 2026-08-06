
const BASE = import.meta.env.VITE_API_URL || '';
let token = localStorage.getItem('gm_token') || null;
let refreshPromise = null;

async function f(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body instanceof FormData) delete headers['Content-Type'];
  const r = await fetch(`${BASE}${url}`, { ...opts, headers });
  if (r.status === 401 && token && !url.includes('/login') && !url.includes('/refresh-token')) {
    // try refresh once
    if (!refreshPromise) {
      refreshPromise = fetch(`${BASE}/api/refresh-token`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }).then(async rr=>{
        if(rr.ok){ const d=await rr.json(); if(d.token){ token=d.token; localStorage.setItem('gm_token', d.token); } return d.token; }
        throw new Error('refresh failed');
      }).finally(()=>{ refreshPromise=null; });
    }
    try {
      const newToken = await refreshPromise;
      if(newToken){
        headers['Authorization'] = `Bearer ${newToken}`;
        const r2 = await fetch(`${BASE}${url}`, { ...opts, headers });
        if(!r2.ok){ const err=await r2.json().catch(()=>({error:r2.statusText})); throw new Error(err.error||r2.statusText); }
        return r2.json();
      }
    } catch{}
  }
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error || r.statusText);
  }
  return r.json();
}

export function setToken(t) { token = t; if (t) localStorage.setItem('gm_token', t); else localStorage.removeItem('gm_token'); }
export function getToken() { return token; }
export function isLoggedIn() { return !!token; }
export async function logout() { await f('/api/logout', { method: 'POST' }).catch(() => {}); token = null; localStorage.removeItem('gm_token'); }
export async function login(usuario, password, otp_code) { const data = await f('/api/login', { method: 'POST', body: JSON.stringify({ usuario, password, otp_code }) }); if (data.token) { token = data.token; localStorage.setItem('gm_token', data.token); } return data; }
export async function register(datos) { return f('/api/register', { method: 'POST', body: JSON.stringify(datos) }); }
export async function getMe() { return f('/api/me'); }
export async function updateMe(datos) { return f('/api/me', { method: 'PUT', body: JSON.stringify(datos) }); }
export async function forgotPassword(usuario) { return f('/api/forgot-password', { method: 'POST', body: JSON.stringify({ usuario }) }); }
export async function resetPassword(codigo, nueva_password) { return f('/api/reset-password', { method: 'POST', body: JSON.stringify({ codigo, nueva_password }) }); }

// maintenance
export async function getMaintenanceStatus() { return f('/api/maintenance-status'); }
export async function setMaintenanceMode(activo, mensaje, countdown) { return f('/api/maintenance-mode', { method: 'POST', body: JSON.stringify({ activo, mensaje, countdown }) }); }

// config
export async function getConfig() { return f('/api/config'); }
export async function updateConfig(config) { return f('/api/config', { method: 'PUT', body: JSON.stringify(config) }); }

// listas
export async function getListas() { return f('/api/listas'); }
export async function updateListas(listas) { return f('/api/listas', { method: 'PUT', body: JSON.stringify({ listas }) }); }
export async function createLista(lista) { return f('/api/listas', { method: 'POST', body: JSON.stringify(lista) }); }
export async function updateLista(id, lista) { return f(`/api/listas/${id}`, { method: 'PUT', body: JSON.stringify(lista) }); }
export async function deleteLista(id) { return f(`/api/listas/${id}`, { method: 'DELETE' }); }

// secciones
export async function getSecciones() { return f('/api/secciones'); }
export async function getSeccion(id) { return f(`/api/secciones/${id}`); }
export async function updateSeccion(id, datos) { return f(`/api/secciones/${id}`, { method: 'PUT', body: JSON.stringify(datos) }); }
export async function createSeccion(datos) { return f('/api/secciones', { method: 'POST', body: JSON.stringify(datos) }); }
export async function deleteSeccion(id) { return f(`/api/secciones/${id}`, { method: 'DELETE' }); }

// upload
export async function uploadImagen(file) {
  const fd = new FormData(); fd.append('imagen', file);
  const headers = {}; if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${BASE}/api/upload`, { method: 'POST', headers, body: fd });
  if (!r.ok) throw new Error('Error al subir imagen');
  return r.json();
}
export async function uploadBase64(data, filename) { return f('/api/upload-base64', { method: 'POST', body: JSON.stringify({ data, filename }) }); }

// productos
export async function getProductos({ q, categoria, page = 1, limit = 50, seccion_id, marca } = {}) {
  const p = new URLSearchParams(); if (q) p.set('q', q); if (categoria) p.set('categoria', categoria);
  p.set('page', page); p.set('limit', limit); if (seccion_id) p.set('seccion_id', seccion_id); if (marca) p.set('marca', marca);
  return f(`/api/productos?${p}`);
}
export async function getCategorias(seccion_id) { return f(`/api/categorias${seccion_id ? `?seccion_id=${seccion_id}` : ''}`); }
export async function createProducto(producto) { return f('/api/productos', { method: 'POST', body: JSON.stringify(producto) }); }
export async function updateProducto(id, producto) { return f(`/api/productos/${id}`, { method: 'PUT', body: JSON.stringify(producto) }); }
export async function deleteProducto(id) { return f(`/api/productos/${id}`, { method: 'DELETE' }); }
export async function bulkProductos(productos, reemplazar = false) { return f('/api/productos/bulk', { method: 'POST', body: JSON.stringify({ productos, reemplazar }) }); }
export async function deleteCategoria(categoria) { return f(`/api/categorias/${encodeURIComponent(categoria)}`, { method: 'DELETE' }); }
export async function deleteAllProductos() { return f('/api/productos/all', { method: 'DELETE' }); }
export async function buscarProductosAdmin(q) { return f(`/api/productos/buscar?q=${encodeURIComponent(q)}`); }

// imagenes variantes
export async function getProductoImagenes(productoId) { return f(`/api/producto-imagenes/${productoId}`); }
export async function addProductoImagen(productoId, url, orden) { return f('/api/producto-imagenes', { method: 'POST', body: JSON.stringify({ producto_id: productoId, url, orden }) }); }
export async function deleteProductoImagen(id) { return f(`/api/producto-imagenes/${id}`, { method: 'DELETE' }); }
export async function reorderProductoImagenes(items) { return f('/api/producto-imagenes/reorder', { method: 'PUT', body: JSON.stringify({ items }) }); }
export async function getVariantes(productoId) { return f(`/api/variantes/${productoId}`); }
export async function addVariante(data) { return f('/api/variantes', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateVariante(id, data) { return f(`/api/variantes/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function deleteVariante(id) { return f(`/api/variantes/${id}`, { method: 'DELETE' }); }

// precios
export async function ajustarPrecios(porcentaje, categoria = null) { return f('/api/precios/ajustar', { method: 'POST', body: JSON.stringify({ porcentaje, categoria }) }); }
export async function getHistorialPrecios() { return f('/api/historial-precios'); }
export async function getPreciosFijos() { return f('/api/precios-fijos'); }
export async function setPrecioFijo(producto_id, lista_precio_id, precio_fijo) { return f('/api/precios-fijos', { method: 'POST', body: JSON.stringify({ producto_id, lista_precio_id, precio_fijo }) }); }

// usuarios
export async function getUsuarios(q) { return f(`/api/usuarios${q ? `?q=${encodeURIComponent(q)}` : ''}`); }
export async function getPendientesCount() { return f('/api/usuarios/pendientes/count'); }
export async function updateUsuario(id, datos) { return f(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(datos) }); }
export async function aprobarUsuario(id, lista_precio_id) { return f(`/api/usuarios/${id}/aprobar`, { method: 'POST', body: JSON.stringify({ lista_precio_id }) }); }
export async function rechazarUsuario(id) { return f(`/api/usuarios/${id}/rechazar`, { method: 'POST' }); }
export async function suspenderUsuario(id, activo) { return f(`/api/usuarios/${id}/suspender`, { method: 'POST', body: JSON.stringify({ activo }) }); }
export async function resetPasswordAdmin(id) { return f(`/api/usuarios/${id}/reset-password`, { method: 'POST' }); }
export async function deleteUsuario(id) { return f(`/api/usuarios/${id}`, { method: 'DELETE' }); }

// pedidos
export async function getPedidos(params={}) { const p=new URLSearchParams(params); return f(`/api/pedidos?${p}`); }
export async function getPedido(id) { return f(`/api/pedidos/${id}`); }
export async function createPedido(data) { return f('/api/pedidos', { method: 'POST', body: JSON.stringify(data) }); }
export async function createPedidosMulti(pedidos, is_test=false) { return f('/api/pedidos/multi', { method: 'POST', body: JSON.stringify({ pedidos, is_test }) }); }
export async function updatePedido(id, data) { return f(`/api/pedidos/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function archivarPedido(id) { return f(`/api/pedidos/${id}/archivar`, { method: 'POST' }); }
export async function desarchivarPedido(id) { return f(`/api/pedidos/${id}/desarchivar`, { method: 'POST' }); }
export async function deletePedido(id) { return f(`/api/pedidos/${id}`, { method: 'DELETE' }); }
export async function getStats(params={}) { const p=new URLSearchParams(params); return f(`/api/stats?${p}`); }

// cupones promos etc
export async function getCupones() { return f('/api/cupones'); }
export async function validarCupon(codigo, seccion_id, subtotal, metodo_pago, items) { return f('/api/cupones/validar', { method: 'POST', body: JSON.stringify({ codigo, seccion_id, subtotal, metodo_pago, items }) }); }
export async function createCupon(cupon) { return f('/api/cupones', { method: 'POST', body: JSON.stringify(cupon) }); }
export async function updateCupon(id, cupon) { return f(`/api/cupones/${id}`, { method: 'PUT', body: JSON.stringify(cupon) }); }
export async function deleteCupon(id) { return f(`/api/cupones/${id}`, { method: 'DELETE' }); }

export async function getPromociones() { return f('/api/promociones'); }
export async function getPromocionesActivas() { return f('/api/promociones/activas'); }
export async function createPromocion(p) { return f('/api/promociones', { method: 'POST', body: JSON.stringify(p) }); }
export async function updatePromocion(id,p) { return f(`/api/promociones/${id}`, { method: 'PUT', body: JSON.stringify(p) }); }
export async function deletePromocion(id) { return f(`/api/promociones/${id}`, { method: 'DELETE' }); }

export async function getPopups() { return f('/api/popups'); }
export async function getPopupsAll() { return f('/api/popups/all'); }
export async function createPopup(popup) { return f('/api/popups', { method: 'POST', body: JSON.stringify(popup) }); }
export async function updatePopup(id, popup) { return f(`/api/popups/${id}`, { method: 'PUT', body: JSON.stringify(popup) }); }
export async function deletePopup(id) { return f(`/api/popups/${id}`, { method: 'DELETE' }); }

export async function getRedesSociales() { return f('/api/redes-sociales'); }
export async function updateRedesSociales(redes) { return f('/api/redes-sociales', { method: 'PUT', body: JSON.stringify({ redes }) }); }

export async function getMenu() { return f('/api/menu'); }
export async function getMenuAll() { return f('/api/menu/all'); }
export async function createMenuItem(item) { return f('/api/menu', { method: 'POST', body: JSON.stringify(item) }); }
export async function updateMenuItem(id, item) { return f(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify(item) }); }
export async function deleteMenuItem(id) { return f(`/api/menu/${id}`, { method: 'DELETE' }); }

export async function getDesign() { return f('/api/design'); }
export async function updateDesign(config) { return f('/api/design', { method: 'PUT', body: JSON.stringify(config) }); }

export async function getMetodosPago(seccion_id) { return f(`/api/metodos-pago${seccion_id ? `?seccion_id=${seccion_id}` : ''}`); }
export async function getMetodosPagoAll() { return f('/api/metodos-pago/all'); }
export async function createMetodoPago(mp) { return f('/api/metodos-pago', { method: 'POST', body: JSON.stringify(mp) }); }
export async function updateMetodoPago(id, mp) { return f(`/api/metodos-pago/${id}`, { method: 'PUT', body: JSON.stringify(mp) }); }
export async function deleteMetodoPago(id) { return f(`/api/metodos-pago/${id}`, { method: 'DELETE' }); }

export async function getPaginas(seccion_id) { return f(`/api/paginas${seccion_id ? `?seccion_id=${seccion_id}` : ''}`); }
export async function getPagina(id) { return f(`/api/paginas/${id}`); }
export async function createPagina(pagina) { return f('/api/paginas', { method: 'POST', body: JSON.stringify(pagina) }); }
export async function updatePagina(id, pagina) { return f(`/api/paginas/${id}`, { method: 'PUT', body: JSON.stringify(pagina) }); }
export async function deletePagina(id) { return f(`/api/paginas/${id}`, { method: 'DELETE' }); }

export async function getBadges(seccion_id) { return f(`/api/badges${seccion_id ? `?seccion_id=${seccion_id}` : ''}`); }
export async function getBadgesAll() { return f('/api/badges/all'); }
export async function createBadge(badge) { return f('/api/badges', { method: 'POST', body: JSON.stringify(badge) }); }
export async function updateBadge(id, badge) { return f(`/api/badges/${id}`, { method: 'PUT', body: JSON.stringify(badge) }); }
export async function deleteBadge(id) { return f(`/api/badges/${id}`, { method: 'DELETE' }); }

export async function getEnvioConfig(seccion_id) { return f(`/api/envio/config/${seccion_id}`); }
export async function updateEnvioConfig(seccion_id, config) { return f(`/api/envio/config/${seccion_id}`, { method: 'PUT', body: JSON.stringify(config) }); }
export async function cotizarEnvio(seccion_id, codigo_postal) { return f('/api/envio/cotizar', { method: 'POST', body: JSON.stringify({ seccion_id, codigo_postal }) }); }

// custom shipping
export async function getEnvioCustom(seccion_id) { return f(`/api/envio/custom${seccion_id ? `?seccion_id=${seccion_id}` : ''}`); }
export async function getEnvioCustomAll() { return f('/api/envio/custom/all'); }
export async function createEnvioCustom(data) { return f('/api/envio/custom', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateEnvioCustom(id, data) { return f(`/api/envio/custom/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function deleteEnvioCustom(id) { return f(`/api/envio/custom/${id}`, { method: 'DELETE' }); }

export async function busquedaGlobal(q) { return f(`/api/busqueda-global?q=${encodeURIComponent(q)}`); }
export async function getDolarBlue() { return f('/api/dolar-blue'); }

export async function cotizarAndreani(cp_destino, peso, volumen, seccion_id) { return f('/api/andreani/cotizar', { method: 'POST', body: JSON.stringify({ cp_destino, peso, volumen, seccion_id }) }); }
export async function getSucursalesAndreani(cp) { return f(`/api/andreani/sucursales?cp=${cp}`); }
export async function crearOrdenAndreani(datos) { return f('/api/andreani/orden', { method: 'POST', body: JSON.stringify(datos) }); }
export async function getTrackingAndreani(numEnvio) { return f(`/api/andreani/tracking/${numEnvio}`); }
export function getEtiquetaAndreaniUrl(numEnvio) { return `${BASE}/api/andreani/etiqueta/${numEnvio}`; }

export async function getSlider() { return f('/api/slider'); }
export async function getSliderAll() { return f('/api/slider/all'); }
export async function createSlider(data) { return f('/api/slider', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateSlider(id, data) { return f(`/api/slider/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function deleteSlider(id) { return f(`/api/slider/${id}`, { method: 'DELETE' }); }

export async function getFavoritos() { return f('/api/favoritos'); }
export async function addFavorito(productoId) { return f(`/api/favoritos/${productoId}`, { method: 'POST' }); }
export async function removeFavorito(productoId) { return f(`/api/favoritos/${productoId}`, { method: 'DELETE' }); }

export async function refreshToken() { return f('/api/refresh-token', { method: 'POST' }); }
export async function toggleOTP(activo) { return f('/api/me/otp', { method: 'PUT', body: JSON.stringify({ activo }) }); }
export async function notificarStock(productoId, email) { return f('/api/notificar-stock', { method: 'POST', body: JSON.stringify({ producto_id: productoId, email }) }); }
export async function crearCarritoAbandonado(data) { return f('/api/carritos-abandonados', { method: 'POST', body: JSON.stringify(data) }); }
export async function getCarritosAbandonados() { return f('/api/carritos-abandonados'); }

export function trackEvent(eventName, params = {}) { if (typeof window.gtag === 'function') window.gtag('event', eventName, params); }
export function trackPageView(page, title) { trackEvent('page_view', { page_location: page, page_title: title }); }
export function trackProductView(producto) { trackEvent('view_item', { currency: 'ARS', value: producto.precio_base || 0, items: [{ item_id: producto.id, item_name: producto.nombre || producto.modelo, item_category: producto.categoria }] }); }
export function trackAddToCart(producto, qty, precio) { trackEvent('add_to_cart', { currency: 'ARS', value: precio * qty, items: [{ item_id: producto.id, item_name: producto.nombre || producto.modelo, item_category: producto.categoria, quantity: qty, price: precio }] }); }
export function trackPurchase(orderId, total, items) { trackEvent('purchase', { transaction_id: orderId, currency: 'ARS', value: total, items: items.map(i => ({ item_id: i.producto_id, item_name: i.nombre_producto, quantity: i.cantidad, price: i.precio_unitario })) }); }
export function trackSearch(query, resultCount) { trackEvent('search', { search_term: query, results_count: resultCount }); }

// Missing exports
export function trackSectionView(sec) { trackEvent("view_section", { section_name: sec?.nombre }); }
export async function resetPrecios(seccionId) { return f(`/api/precios/reset/${seccionId}`, { method: "POST" }); }

