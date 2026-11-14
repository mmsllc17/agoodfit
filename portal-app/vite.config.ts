import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds into ../portal so GitHub Pages serves it at /agoodfit/portal/.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: '../portal', emptyOutDir: true },
});
