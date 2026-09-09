import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LocaleProvider } from './i18n'
import App from './App'
import { FogBackground } from './shell/FogBackground'
import './styles/index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FogBackground />
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LocaleProvider>
    </QueryClientProvider>
  </StrictMode>,
)
