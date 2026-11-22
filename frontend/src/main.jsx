import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ApiConfigError from './ApiConfigError.jsx'
import { API_CONFIG } from './apiConfig.js'
import { isSuccessSajuPath } from './successSaju/successSajuLogic.js'
import './index.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister())
  })
}

if (API_CONFIG.error) console.error('[설정 오류]', API_CONFIG.error)

// '우리 아이 성공사주' 전용 주소(/success-saju)에서만 새 화면을 연다. 그 밖의 모든 주소는 기존 앱 그대로이며, 새 화면 코드는 이 주소에서만 내려받는다(lazy).
const SuccessSaju = React.lazy(() => import('./successSaju/SuccessSaju.jsx'))
const page = isSuccessSajuPath(window.location.pathname) ? <React.Suspense fallback={null}><SuccessSaju /></React.Suspense> : <App />

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {API_CONFIG.error ? <ApiConfigError message={API_CONFIG.error} /> : page}
  </React.StrictMode>
)
