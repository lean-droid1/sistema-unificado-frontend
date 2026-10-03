// Contador propio de visitas: registra cada página que ve un cliente y lo que busca.
// No usa cookies ni datos personales: un id al azar por navegador (visitante) y otro por visita (sesión, 30 min sin actividad).
import { trackEvento } from './api';

const MIN30 = 30 * 60 * 1000;
const id = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 36);
const leer = (st, k) => { try { return st.getItem(k); } catch { return null; } };
const guardar = (st, k, v) => { try { st.setItem(k, v); } catch { /* sin almacenamiento */ } };

function visitante() { let v = leer(localStorage, 'gm_vis'); if (!v) { v = id(); guardar(localStorage, 'gm_vis', v); } return v; }
function sesion() {
  const ahora = Date.now(); let s = leer(localStorage, 'gm_ses'); const ult = Number(leer(localStorage, 'gm_ses_t')) || 0;
  if (!s || ahora - ult > MIN30) { s = id(); guardar(localStorage, 'gm_ses', s); }
  guardar(localStorage, 'gm_ses_t', String(ahora));
  return s;
}
// El equipo (admin/empleados) y el panel no se cuentan
function esEquipo() {
  try { const t = leer(localStorage, 'gm_token'); if (!t) return false; const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return p.rol === 'admin' || p.rol === 'subadmin'; } catch { return false; }
}
const noContar = () => { const p = window.location.pathname; return esEquipo() || p.startsWith('/panel') || p.startsWith('/preview') || /[?&]preview=/.test(window.location.search); };

let ultimoPath = ''; let ultimoT = 0; let referrerInicial = document.referrer || '';
function vista() {
  if (noContar()) return;
  const path = window.location.pathname.slice(0, 300);
  const ahora = Date.now();
  if (path === ultimoPath && ahora - ultimoT < 3000) return; // misma página recargada al toque
  ultimoPath = path; ultimoT = ahora;
  const ref = referrerInicial && !referrerInicial.includes(window.location.host) ? referrerInicial : '';
  const utm = new URLSearchParams(window.location.search).get('utm_source');
  referrerInicial = ''; // el origen se cuenta solo en la primera página de la visita
  trackEvento({ t: 'vista', v: visitante(), s: sesion(), p: path, r: utm || ref });
}
export function trackBusqueda(q, n) {
  if (noContar()) return;
  const term = String(q || '').trim(); if (term.length < 2) return;
  trackEvento({ t: 'busqueda', v: visitante(), s: sesion(), p: window.location.pathname, q: term.slice(0, 120), n: Number(n) || 0 });
}
function ping() { if (!noContar() && document.visibilityState === 'hidden') trackEvento({ t: 'ping', v: visitante(), s: sesion(), p: window.location.pathname }); }

export function iniciarTracker() {
  if (window.__gmTracker) return; window.__gmTracker = true;
  // Se espera medio segundo: si la web cambia la dirección varias veces al cargar, se cuenta solo la página final
  let timer = null; const programar = () => { clearTimeout(timer); timer = setTimeout(vista, 500); };
  const envolver = (fn) => function (...a) { const r = fn.apply(this, a); programar(); return r; };
  history.pushState = envolver(history.pushState);
  history.replaceState = envolver(history.replaceState);
  window.addEventListener('popstate', programar);
  document.addEventListener('visibilitychange', ping);
  programar();
}
