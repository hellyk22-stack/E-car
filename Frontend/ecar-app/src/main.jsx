import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const rootElement = document.getElementById('root')

const renderFatalError = (error) => {
  if (!rootElement) return

  const title = error?.name || 'Application Error'
  const message = error?.message || 'Unknown startup error'
  const stack = error?.stack || ''

  rootElement.innerHTML = `
    <div style="min-height:100vh;background:#020617;color:#e2e8f0;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:960px;margin:0 auto;border:1px solid rgba(248,113,113,0.25);background:rgba(127,29,29,0.2);border-radius:24px;padding:24px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#fca5a5;">Startup Error</p>
        <h1 style="margin:0 0 12px;font-size:32px;line-height:1.1;color:white;">The app failed before it could render.</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:rgba(226,232,240,0.82);">
          Refresh once after saving. If this stays visible, share the error details below and we can fix the exact failure quickly.
        </p>
        <div style="margin-bottom:12px;font-size:16px;font-weight:700;color:#fecaca;">${title}: ${message}</div>
        <pre style="margin:0;overflow:auto;white-space:pre-wrap;border-radius:16px;background:rgba(15,23,42,0.88);padding:16px;font-size:13px;line-height:1.6;color:#fda4af;">${stack}</pre>
      </div>
    </div>
  `
}

window.addEventListener('error', (event) => {
  if (event.error) {
    console.error('Unhandled startup error', event.error)
    renderFatalError(event.error)
  }
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error
    ? event.reason
    : new Error(typeof event.reason === 'string' ? event.reason : 'Unhandled promise rejection')

  console.error('Unhandled promise rejection', reason)
  renderFatalError(reason)
})

try {
  ReactDOM.createRoot(rootElement).render(
    <App />
  )
} catch (error) {
  console.error('Fatal render bootstrap error', error)
  renderFatalError(error)
}
