// frontend/src/main.jsx
// React entry point — mounts the app into #root, wraps with BrowserRouter.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import '@tokens'                    // design tokens from project root (alias in vite.config.js)
import './styles/globals.css'        // global resets

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
