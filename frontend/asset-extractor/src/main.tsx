import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App'
import ScrollToTop from './components/ScrollToTop'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ScrollToTop />
        <App />
        <Toaster position="top-right" toastOptions={{
          duration: 5000,
          style: {
            border: '1px solid #e2e8f0',
            padding: '16px',
            color: '#1a202c',
          },
          success: {
            style: {
              background: '#e6fffa',
              border: '1px solid #38b2ac',
            },
          },
          error: {
            style: {
              background: '#fff5f5',
              border: '1px solid #f56565',
            },
            duration: 6000,
          },
        }} />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
