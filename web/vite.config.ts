import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 5184 = coluna "web" do slot 11 no mapa de portas do ecossistema GWAN.
    port: 5184,
    strictPort: true,
    // Escuta em todas as interfaces, e nao so em 127.0.0.1: sem isso a loja é
    // invisível para celular/notebook na mesma rede local.
    host: true,
  },
});
