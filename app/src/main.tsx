import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ConfiguracaoAusente } from '@/components/ConfiguracaoAusente'
import { queryClient } from '@/lib/queryClient'
// Efeito colateral: define pt-BR como locale padrão do date-fns.
// Precisa vir antes de qualquer componente que formate datas.
import '@/lib/locale'
import App from './App'
import './index.css'

/**
 * Registra o service worker (`registerType: 'autoUpdate'` — atualiza sozinho,
 * sem pedir confirmação: é um app de um usuário só, não um app de terceiros
 * onde uma atualização inesperada no meio de uma tarefa incomodaria vários).
 * Fora do `if` de configuração abaixo de propósito: instalável mesmo na tela
 * `ConfiguracaoAusente`, que é onde quem esqueceu o `.env.local` mais precisa
 * ver o problema — não faz sentido condicionar o app shell a isso.
 */
registerSW({ immediate: true })

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root não encontrado no index.html')

/**
 * Checagem de configuração antes de montar o app.
 *
 * Precisa vir ANTES de qualquer import de `lib/supabase`: aquele módulo lança se
 * as variáveis não existem, e o app é lazy-loaded, então o erro estouraria na
 * primeira rota — página em branco com erro só no console. As pages entram por
 * `App`, que é importado aqui, mas o client do Supabase só é tocado dentro
 * delas; curto-circuitar aqui garante que ele nunca seja avaliado sem config.
 */
const AUSENTES = (
  [
    ['VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL],
    [
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ],
  ] as const
)
  .filter(([, valor]) => !valor)
  .map(([nome]) => nome)

const raiz = createRoot(container)

if (AUSENTES.length > 0) {
  raiz.render(
    <StrictMode>
      <ConfiguracaoAusente variaveis={AUSENTES} />
    </StrictMode>,
  )
} else {
  raiz.render(
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
}
