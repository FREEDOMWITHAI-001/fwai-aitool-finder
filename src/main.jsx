import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './App.css'

// Apply saved theme immediately to prevent flash
document.documentElement.setAttribute('data-theme', localStorage.getItem('aitf_theme') || 'dark');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
