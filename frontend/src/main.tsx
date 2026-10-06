import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'
import 'ol/ol.css'
import './index.css'

// Clear any ghost intervals lingering from hot-reloads or previous runs
if (typeof window !== 'undefined') {
  for (let i = 1; i < 10000; i++) {
    window.clearInterval(i)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
