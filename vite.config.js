import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// El HTML de la app se publica como app.html (no index.html): así "/" también pasa por api/render.js,
// que pone el título, la descripción y la imagen de cada dominio (ComerciApp, Lean-Droid o la tienda de cada cliente)
// para las vistas previas de WhatsApp, Facebook y Google.
const plantillaApp = () => {
  let outDir = 'dist';
  return {
    name: 'plantilla-app',
    apply: 'build',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const a = path.join(outDir, 'index.html');
      if (fs.existsSync(a)) fs.renameSync(a, path.join(outDir, 'app.html'));
    },
  };
};

export default defineConfig({
  plugins: [react(), plantillaApp()],
  server: { port: 5173 }
})
