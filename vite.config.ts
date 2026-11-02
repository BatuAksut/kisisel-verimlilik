import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages projeyi /depo-adi/ altında sunar; workflow BASE_PATH'i buna göre verir.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Quest66',
        short_name: 'Quest66',
        description: '66 günlük oyunlaştırılmış alışkanlık macerası',
        lang: 'tr',
        theme_color: '#11181c',
        background_color: '#11181c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        navigateFallback: `${base}index.html`,
        importScripts: ['sw-notifications.js'],
        // İlk ziyarette de sayfa hemen service worker'a bağlansın, yeni sürüm beklemeden devreye girsin.
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'proxy/**/*.test.ts'],
    environment: 'node',
  },
});
