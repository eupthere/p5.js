import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  publicDir: path.resolve(__dirname, '../../lib'),
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        frame: path.resolve(__dirname, 'frame.html'),
        runner: path.resolve(__dirname, 'runner.html'),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
