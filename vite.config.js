import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: { external: ['esbuild'] },
          },
        },
        onstart({ startup }) {
          startup(['--no-sandbox', '.'])
        },
      },
      {
        entry: 'electron/preload.js',
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
        onstart({ reload }) {
          reload()
        },
      },
    ]),
    renderer(),
  ],
})
