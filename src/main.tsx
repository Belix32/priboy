import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { seedDemoDataIfNeeded } from './lib/travel/seed'
import { isSupabaseConfigured } from './lib/supabase'
import { ensureFreshClient } from './lib/appVersion'
import App from './App'
import './styles/globals.css'
import { registerServiceWorker } from './lib/pwa'

async function bootstrap() {
  await ensureFreshClient()

  if (!isSupabaseConfigured()) {
    seedDemoDataIfNeeded()
  }

  registerServiceWorker()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
}

void bootstrap()
