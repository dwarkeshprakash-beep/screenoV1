import { fileURLToPath } from 'url'
import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [
        path.resolve(currentDir, '..'),
        currentDir,
      ],
    },
  },
  resolve: {
    alias: {
      '@tokens': path.resolve(currentDir, '../tokens.css'),
    },
  },
})
