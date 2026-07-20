import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor')) return 'monaco-editor'
          if (id.includes('monaco-vim'))    return 'monaco-vim'
        },
      },
    },
  },
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
      {
        entry: 'electron/js-worker.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: { external: ['esbuild'] },
          },
        },
      },
    ]),
    renderer(),
  ],
})
