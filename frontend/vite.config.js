import { fileURLToPath } from 'url'
import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: 'codemirror-view', test: /node_modules[\\/]@codemirror[\\/]view/ },
            { name: 'codemirror-state', test: /node_modules[\\/]@codemirror[\\/]state/ },
            { name: 'codemirror-languages', test: /node_modules[\\/](@codemirror[\\/]lang-|@lezer[\\/])/ },
            { name: 'codemirror-react', test: /node_modules[\\/]@uiw[\\/]react-codemirror/ },
            { name: 'codemirror-core', test: /node_modules[\\/](@codemirror|style-mod|w3c-keyname|crelt)/ },
          ],
        },
      },
    },
  },
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
