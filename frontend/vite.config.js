import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Allow Vite to resolve files from the project root (one level up),
// so frontend/src can import tokens.css from the workspace root.
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [
        path.resolve(__dirname, '..'), // workspace root — exposes tokens.css
        path.resolve(__dirname),       // frontend/ itself
      ],
    },
  },
  resolve: {
    alias: {
      '@tokens': path.resolve(__dirname, '../tokens.css'),
    },
  },
})
