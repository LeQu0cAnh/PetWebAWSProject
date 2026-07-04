// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/amplify'   // Khởi tạo Amplify trước tất cả
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
