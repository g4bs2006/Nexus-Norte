import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // `injectManifest` (não `generateSW`) porque o service worker vai
      // ganhar um listener de `push` mais adiante — o modo padrão só
      // pré-cacheia o shell e não deixa escrever handler nenhum.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        // O bundle do FullCalendar/Recharts já é grande sozinho; sem isto o
        // plugin recusa pré-cachear e o build quebra.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: 'Nexus',
        short_name: 'Nexus',
        lang: 'pt-BR',
        description:
          'Financeiro, Estudos, Treino e Projetos — sistema pessoal de um usuário.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Mesmo tom do quadrado do favicon — o app "abre" já na cor certa,
        // sem flash branco antes do CSS carregar.
        background_color: '#191919',
        theme_color: '#191919',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
