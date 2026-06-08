// frontend/src/main.jsx
// React entry point — mounts the app into #root, wraps with BrowserRouter.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/shared/ErrorBoundary.jsx'
import '@tokens'                    // design tokens from project root (alias in vite.config.js)
import './styles/globals.css'        // global resets
import '@livekit/components-styles'  // styles for LiveKit video rooms (human interviews)

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
