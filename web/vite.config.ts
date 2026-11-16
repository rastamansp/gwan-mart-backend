import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Origem pública da loja nas meta de prévia do index.html (%VITE_SITE_URL%):
 * og:image e og:url precisam de URL absoluta. Em produção vem do build arg do
 * Dockerfile; sem ela, o default evita o placeholder literal no HTML (o build
 * chega a quebrar com "URI malformed" no href do canonical).
 *
 * Sem `process.env` aqui de propósito: a loja não tem @types/node, e o `tsc -b`
 * da imagem Docker não enxerga o node_modules da raiz como o dev local enxerga.
 */
function siteUrl(mode: string): Plugin {
  const value = (
    loadEnv(mode, '.', 'VITE_').VITE_SITE_URL || 'https://mart.gwan.cloud'
  ).replace(/\/+$/, '');

  return {
    name: 'gwan-mart-site-url',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.split('%VITE_SITE_URL%').join(value),
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), siteUrl(mode)],
  server: {
    // 5184 = coluna "web" do slot 11 no mapa de portas do ecossistema GWAN.
    port: 5184,
    strictPort: true,
    // Escuta em todas as interfaces, e nao so em 127.0.0.1: sem isso a loja é
    // invisível para celular/notebook na mesma rede local.
    host: true,
  },
}));
