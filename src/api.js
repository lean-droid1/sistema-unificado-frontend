// ═══════════════════════════════════════════════════════════
// api.js — Sistema Unificado Multi-Sección v2
// Capa de comunicación frontend ↔ backend
// ═══════════════════════════════════════════════════════════

const BASE = import.meta.env.VITE_API_URL || "";
let token = localStorage.getItem("gm_token") || null;

async function f(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (res.status === 401) { token = null; localStorage.removeItem("gm_token"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    if (data.pendiente) err.pendiente = true;
    throw err;
  }
  return data;
}

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem("gm_token", t);
  else localStorage.removeItem("gm_token");
}

export function getToken() { return token; }

// ══════════════════════════════════════════════════════════
// MANTENIMIENTO
// ══════════════════════════════════════════════════════════

export async function getMaintenanceStatus() {
  return f("/api/maintenance-status");
}

export async function setMaintenanceMode(activo, mensaje, countdown) {
  return f("/api/maintenance-mode", {
    method: "POST",
    body: JSON.stringify({ activo, mensaje, countdown }),
  });
}

// ══════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════

export async function login(usuario, password) {
  const data = await f("/api/login", {
    method: "POST",
    body: JSON.stringify({ usuario, password }),
  });
  if (data.token) {
    token = data.token;
    localStorage.setItem("gm_token", data.token);
  }
  return data;
}

export async function register(datos) {
  return f("/api/register", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function getMe() {
  return f("/api/me");
}

export async function updateMe(datos) {
  return f("/api/me", { method: "PUT", body: JSON.stringify(datos) });
}

export function logout() {
  token = null;
  localStorage.removeItem("gm_token");
}

export function isLoggedIn() {
  return !!token;
}

// ══════════════════════════════════════════════════════════
// CONFIGURACIÓN GLOBAL
// ══════════════════════════════════════════════════════════

export async function getConfig() {
  return f("/api/config");
}

export async function updateConfig(config) {
  return f("/api/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

// ══════════════════════════════════════════════════════════
// LISTAS DE PRECIO
// ══════════════════════════════════════════════════════════

export async function getListas() {
  return f("/api/listas");
}

export async function updateListas(listas) {
  return f("/api/listas", {
    method: "PUT",
    body: JSON.stringify({ listas }),
  });
}

// ══════════════════════════════════════════════════════════
// SECCIONES (NUEVO)
// ══════════════════════════════════════════════════════════

export async function getSecciones() {
  return f("/api/secciones");
}

export async function getSeccion(id) {
  return f(`/api/secciones/${id}`);
}

export async function updateSeccion(id, datos) {
  return f(`/api/secciones/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export async function createSeccion(datos) {
  return f("/api/secciones", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function deleteSeccion(id) {
  return f(`/api/secciones/${id}`, { method: "DELETE" });
}

// ══════════════════════════════════════════════════════════
// PRODUCTOS (con filtro por sección)
// ══════════════════════════════════════════════════════════

export async function getProductos({ q, categoria, page = 1, limit = 50, seccion_id, marca } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (categoria) params.set("categoria", categoria);
  if (seccion_id) params.set("seccion_id", seccion_id);
  if (marca) params.set("marca", marca);
  params.set("page", page);
  params.set("limit", limit);
  return f(`/api/productos?${params}`);
}

export async function getCategorias(seccion_id) {
  const params = seccion_id ? `?seccion_id=${seccion_id}` : "";
  return f(`/api/categorias${params}`);
}

export async function createProducto(producto) {
  return f("/api/productos", { method: "POST", body: JSON.stringify(producto) });
}

export async function updateProducto(id, producto) {
  return f(`/api/productos/${id}`, { method: "PUT", body: JSON.stringify(producto) });
}

export async function deleteProducto(id) {
  return f(`/api/productos/${id}`, { method: "DELETE" });
}

export async function bulkProductos(productos, reemplazar = false) {
  return f("/api/productos/bulk", {
    method: "POST",
    body: JSON.stringify({ productos, reemplazar }),
  });
}

export async function deleteCategoria(categoria) {
  return f(`/api/categorias/${encodeURIComponent(categoria)}`, { method: "DELETE" });
}

export async function deleteAllProductos() {
  return f("/api/productos/all", { method: "DELETE" });
}

export async function ajustarPrecios(porcentaje, categoria = null) {
  return f("/api/precios/ajustar", {
    method: "POST",
    body: JSON.stringify({ porcentaje, categoria }),
  });
}

export async function resetPrecios() {
  return f("/api/precios/reset", { method: "POST" });
}

// ══════════════════════════════════════════════════════════
// PRECIOS FIJOS
// ══════════════════════════════════════════════════════════

export async function getPreciosFijos() {
  return f("/api/precios-fijos");
}

export async function setPrecioFijo(producto_id, lista_precio_id, precio_fijo) {
  return f("/api/precios-fijos", {
    method: "POST",
    body: JSON.stringify({ producto_id, lista_precio_id, precio_fijo }),
  });
}

// ══════════════════════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════════════════════

export async function getUsuarios() {
  return f("/api/usuarios");
}

export async function getUsuariosPendientesCount() {
  return f("/api/usuarios/pendientes/count");
}

export async function updateUsuario(id, datos) {
  return f(`/api/usuarios/${id}`, { method: "PUT", body: JSON.stringify(datos) });
}

export async function aprobarUsuario(id, lista_precio_id) {
  return f(`/api/usuarios/${id}/aprobar`, {
    method: "POST",
    body: JSON.stringify({ lista_precio_id }),
  });
}

export async function rechazarUsuario(id) {
  return f(`/api/usuarios/${id}/rechazar`, { method: "POST" });
}

export async function suspenderUsuario(id, activo) {
  return f(`/api/usuarios/${id}/suspender`, {
    method: "POST",
    body: JSON.stringify({ activo }),
  });
}

export async function deleteUsuario(id) {
  return f(`/api/usuarios/${id}`, { method: "DELETE" });
}

export async function resetPassword(id) {
  return f(`/api/usuarios/${id}/reset-password`, { method: "POST" });
}

// ══════════════════════════════════════════════════════════
// PEDIDOS (con filtro por sección)
// ══════════════════════════════════════════════════════════

export async function getPedidos(params = {}) {
  const qs = new URLSearchParams();
  if (params.all) qs.set("all", "true");
  if (params.archivado) qs.set("archivado", "true");
  if (params.seccion_id) qs.set("seccion_id", params.seccion_id);
  const s = qs.toString();
  return f(`/api/pedidos${s ? "?" + s : ""}`);
}

export async function getPedido(id) {
  return f(`/api/pedidos/${id}`);
}

export async function createPedido(pedido) {
  return f("/api/pedidos", { method: "POST", body: JSON.stringify(pedido) });
}

export async function updatePedido(id, datos) {
  return f(`/api/pedidos/${id}`, { method: "PUT", body: JSON.stringify(datos) });
}

export async function archivarPedido(id) {
  return f(`/api/pedidos/${id}/archivar`, { method: "POST" });
}

export async function desarchivarPedido(id) {
  return f(`/api/pedidos/${id}/desarchivar`, { method: "POST" });
}

export async function deletePedido(id) {
  return f(`/api/pedidos/${id}`, { method: "DELETE" });
}

// ══════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════

export async function getStats(seccion_id) {
  const params = seccion_id ? `?seccion_id=${seccion_id}` : "";
  return f(`/api/stats${params}`);
}

// ══════════════════════════════════════════════════════════
// HISTORIAL DE PRECIOS
// ══════════════════════════════════════════════════════════

export async function getHistorialPrecios() {
  return f("/api/historial-precios");
}

// ══════════════════════════════════════════════════════════
// CUPONES (NUEVO — producto + categoría + multi-sección)
// ══════════════════════════════════════════════════════════

export async function getCupones() {
  return f("/api/cupones");
}

export async function createCupon(cupon) {
  // cupon: { codigo, tipo, valor, compra_minima, uso_maximo,
  //          fecha_inicio, fecha_fin, secciones_ids, categoria,
  //          producto_id, medio_pago }
  return f("/api/cupones", {
    method: "POST",
    body: JSON.stringify(cupon),
  });
}

export async function updateCupon(id, cupon) {
  return f(`/api/cupones/${id}`, {
    method: "PUT",
    body: JSON.stringify(cupon),
  });
}

export async function deleteCupon(id) {
  return f(`/api/cupones/${id}`, { method: "DELETE" });
}

export async function validarCupon(codigo, seccion_id, subtotal, metodo_pago, items) {
  // items: [{ producto_id, categoria, cantidad, precio_unitario }]
  // El backend valida sección, producto, categoría, fechas, usos, mínimo
  return f("/api/cupones/validar", {
    method: "POST",
    body: JSON.stringify({ codigo, seccion_id, subtotal, metodo_pago, items }),
  });
}

// ══════════════════════════════════════════════════════════
// PÁGINAS INFORMATIVAS (NUEVO)
// ══════════════════════════════════════════════════════════

export async function getPaginas(seccion_id) {
  const params = seccion_id ? `?seccion_id=${seccion_id}` : "";
  return f(`/api/paginas${params}`);
}

export async function getPagina(id) {
  return f(`/api/paginas/${id}`);
}

export async function createPagina(pagina) {
  // pagina: { titulo, slug, contenido, seccion_id, orden, visible }
  return f("/api/paginas", {
    method: "POST",
    body: JSON.stringify(pagina),
  });
}

export async function updatePagina(id, pagina) {
  return f(`/api/paginas/${id}`, {
    method: "PUT",
    body: JSON.stringify(pagina),
  });
}

export async function deletePagina(id) {
  return f(`/api/paginas/${id}`, { method: "DELETE" });
}

// ══════════════════════════════════════════════════════════
// BADGES DE CONFIANZA (NUEVO)
// ══════════════════════════════════════════════════════════

export async function getBadges() {
  return f("/api/badges");
}

export async function createBadge(badge) {
  // badge: { icono, texto, orden, visible }
  return f("/api/badges", {
    method: "POST",
    body: JSON.stringify(badge),
  });
}

export async function updateBadge(id, badge) {
  return f(`/api/badges/${id}`, {
    method: "PUT",
    body: JSON.stringify(badge),
  });
}

export async function deleteBadge(id) {
  return f(`/api/badges/${id}`, { method: "DELETE" });
}

// ══════════════════════════════════════════════════════════
// CONFIG ENVÍO POR SECCIÓN (NUEVO)
// ══════════════════════════════════════════════════════════

export async function getEnvioConfig(seccion_id) {
  return f(`/api/envio/config/${seccion_id}`);
}

export async function updateEnvioConfig(seccion_id, config) {
  // config: { direccion_despacho, metodo, costo_fijo, gratis_desde, zonas }
  return f(`/api/envio/config/${seccion_id}`, {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

export async function cotizarEnvio(seccion_id, codigo_postal) {
  return f("/api/envio/cotizar", {
    method: "POST",
    body: JSON.stringify({ seccion_id, codigo_postal }),
  });
}

// ══════════════════════════════════════════════════════════
// BÚSQUEDA GLOBAL (NUEVO — directorio cross-sección)
// ══════════════════════════════════════════════════════════

export async function busquedaGlobal(q) {
  // Devuelve resultados agrupados por sección
  // { resultados: [{ seccion_id, seccion_nombre, productos: [...] }] }
  return f(`/api/busqueda-global?q=${encodeURIComponent(q)}`);
}

// ══════════════════════════════════════════════════════════
// MARCAS (NUEVO — para wizard marca→modelo→pieza)
// ══════════════════════════════════════════════════════════

export async function getMarcas(seccion_id) {
  const params = seccion_id ? `?seccion_id=${seccion_id}` : "";
  return f(`/api/marcas${params}`);
}

export async function getModelos(marca, seccion_id) {
  const params = new URLSearchParams();
  params.set("marca", marca);
  if (seccion_id) params.set("seccion_id", seccion_id);
  return f(`/api/modelos?${params}`);
}
// ═══════════════════════════════════════════════════════════
// PARCHE api.js: Agregar AL FINAL antes del cierre
// Andreani + GA4 tracking + WhatsApp toggle
// ═══════════════════════════════════════════════════════════

// ── ANDREANI ──

export async function cotizarAndreani(cp_destino, peso, volumen, seccion_id) {
  return f("/api/andreani/cotizar", {
    method: "POST",
    body: JSON.stringify({ cp_destino, peso, volumen, seccion_id }),
  });
}

export async function getSucursalesAndreani(cp) {
  return f(`/api/andreani/sucursales?cp=${cp}`);
}

export async function crearOrdenAndreani(datos) {
  return f("/api/andreani/orden", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function getTrackingAndreani(numEnvio) {
  return f(`/api/andreani/tracking/${numEnvio}`);
}

export function getEtiquetaAndreaniUrl(numEnvio) {
  return `${BASE}/api/andreani/etiqueta/${numEnvio}`;
}

// ── GA4 TRACKING ──
// Se inicializa desde index.html con el script de Google
// Estas funciones envían eventos custom

export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

export function trackPageView(page, title) {
  trackEvent("page_view", { page_location: page, page_title: title });
}

export function trackProductView(producto) {
  trackEvent("view_item", {
    currency: "USD",
    value: producto.precio_base || 0,
    items: [{ item_id: producto.id, item_name: producto.modelo, item_category: producto.categoria }],
  });
}

export function trackAddToCart(producto, qty, precio) {
  trackEvent("add_to_cart", {
    currency: "USD",
    value: precio * qty,
    items: [{ item_id: producto.id, item_name: producto.modelo, item_category: producto.categoria, quantity: qty, price: precio }],
  });
}

export function trackPurchase(orderId, total, items) {
  trackEvent("purchase", {
    transaction_id: orderId,
    currency: "USD",
    value: total,
    items: items.map(i => ({ item_id: i.producto_id, item_name: i.nombre_producto || i.modelo, quantity: i.cantidad || i.qty, price: i.precio_unitario })),
  });
}

export function trackSearch(query, resultCount) {
  trackEvent("search", { search_term: query, results_count: resultCount });
}

export function trackSectionView(seccionNombre) {
  trackEvent("section_view", { section_name: seccionNombre });
}
