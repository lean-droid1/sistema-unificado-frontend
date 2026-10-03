import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { iniciarTracker } from './tracker'

// Fix viewport iOS: en Safari la barra de direcciones "come" el 100vh y corta el contenido
// o deja botones fuera de alcance. Seteamos --app-vh con la altura visible real
// (funciona en TODAS las versiones de iOS, no solo 15.4+).
const setAppVh = () => document.documentElement.style.setProperty('--app-vh', (window.innerHeight * 0.01) + 'px');
setAppVh();
window.addEventListener('resize', setAppVh);
window.addEventListener('orientationchange', setAppVh);

// Si el servidor no pudo armar la página, manda a /?__r=<ruta>: restauramos la ruta antes de arrancar.
try {
  const r = new URLSearchParams(window.location.search).get('__r');
  if (r !== null) window.history.replaceState(null, '', (r.startsWith('/') && !r.startsWith('//')) ? r : '/');
} catch (e) {}

iniciarTracker();

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
