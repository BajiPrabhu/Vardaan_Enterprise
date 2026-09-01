import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  // GitHub Pages needs the repository path.
  // Local development must stay at "/".
  base: command === 'build' ? '/Vardaan_Enterprise/' : '/',

  plugins: [
    react(),
    tailwindcss(),
  ],

  build: {
    outDir: 'dist',
  },
}))