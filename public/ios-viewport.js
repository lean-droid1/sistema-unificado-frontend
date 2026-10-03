/* iPhone: Safari hace zoom al tocar un campo de texto y la página queda más ancha que la pantalla.
   Esto lo evita (el zoom con dos dedos sigue andando). Va en un archivo aparte porque la política
   de seguridad (CSP) no permite scripts escritos dentro del HTML. */
(function () {
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!ios) return;
  var m = document.querySelector('meta[name=viewport]');
  if (m) m.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
})();
