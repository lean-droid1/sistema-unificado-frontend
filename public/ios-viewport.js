/* iPhone: Safari hace zoom al tocar un campo de texto y la página queda más ancha que la pantalla.
   Esto lo evita (el zoom con dos dedos sigue andando). Va en un archivo aparte porque la política
   de seguridad (CSP) no permite scripts escritos dentro del HTML. */
(function () {
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!ios) return;
  var m = document.querySelector('meta[name=viewport]');
  if (m) m.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
})();

/* Si justo hubo una actualización y el JavaScript principal de la web no carga (página en blanco),
   se abre el inicio (que siempre está actualizado) y se vuelve a la misma página. Como mucho una vez
   por minuto, y solo por el JavaScript propio (no por fuentes ni estilos, que pueden bloquearse). */
(function () {
  window.addEventListener('error', function (e) {
    var el = e && e.target;
    if (!el || el.tagName !== 'SCRIPT') return;
    var url = el.src || '';
    if (url.indexOf(location.host + '/assets/') === -1) return;
    if (/[?&]__r=/.test(location.search) || location.pathname === '/') return;
    try {
      var t = Number(sessionStorage.getItem('gm_recarga') || 0);
      if (Date.now() - t < 60000) return;
      sessionStorage.setItem('gm_recarga', String(Date.now()));
    } catch (x) { return; }
    location.replace('/?__r=' + encodeURIComponent(location.pathname + location.search));
  }, true);
})();
