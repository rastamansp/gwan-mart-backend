import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 5184 = coluna "web" do slot 11 no mapa de portas do ecossistema GWAN.
    port: 5184,
    strictPort: true,
  },
});
