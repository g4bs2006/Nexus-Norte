import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/queryClient'
// Efeito colateral: define pt-BR como locale padrão do date-fns.
// Precisa vir antes de qualquer componente que formate datas.
import '@/lib/locale'
import App from './App'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root não encontrado no index.html')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <App />
          <Toaster />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
