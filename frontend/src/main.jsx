import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ApiConfigError from './ApiConfigError.jsx'
import { API_CONFIG } from './apiConfig.js'
import './index.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister())
  })
}

if (API_CONFIG.error) console.error('[설정 오류]', API_CONFIG.error)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {API_CONFIG.error ? <ApiConfigError message={API_CONFIG.error} /> : <App />}
  </React.StrictMode>
)
