import { Suspense, useCallback, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { SkeletonPagina } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import { PaletaComandos } from '@/features/comandos/PaletaComandos'
import { DialogAtalhos } from '@/features/comandos/DialogAtalhos'
import { useAtalhos } from '@/hooks/useAtalhos'
import { useTemaEfetivo } from '@/hooks/useTemaEfetivo'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { ThemeToggle } from './ThemeToggle'

/**
 * A composição de esqueleto que mais se aproxima da rota que está entrando.
 *
 * Antes era `grade` para todas, com a justificativa de que "aqui não se sabe
 * qual rota está entrando". Sabe-se: o pathname já mudou quando o Suspense
 * suspende. E o esqueleto errado custa justamente o que os esqueletos existem
 * para evitar — a promessa deles é que a FORMA imite o conteúdo real para nada
 * saltar quando os dados chegam, e uma grade de seis cards dando lugar a uma
 * página de detalhe salta mais que um espaço vazio teria saltado.
 *
 * A regra é a do próprio roteador: segundo segmento em rota de pilar é detalhe
 * de uma entidade. As exceções são as sub-páginas que são lista, e estão
 * nomeadas — são quatro, e enumerá-las é mais honesto que inferir por formato.
 */
const SUBPAGINAS_LISTA = new Set([
  'financeiro/lancamentos',
  'financeiro/planejamento',
  'calendario/semana',
  'calendario/historico',
  'calendario/blocos',
])

function varianteDaRota(pathname: string): 'financeiro' | 'grade' | 'lista' | 'detalhe' {
  const rota = pathname.replace(/^\/+|\/+$/g, '')

  // A Home é o resumo de tudo: mini-cards de métrica sobre o bloco de checks.
  if (rota === '') return 'financeiro'
  if (SUBPAGINAS_LISTA.has(rota)) return 'lista'

  const [pilar, ...resto] = rota.split('/')
  // `notas` é lista mesmo na raiz; as outras raízes de pilar são grade de cards.
  if (resto.length === 0) return pilar === 'notas' ? 'lista' : 'grade'
  return 'detalhe'
}

/**
 * Fallback do Suspense do code-splitting.
 *
 * `esqueleto-adiado` é o que impede a piscada em navegação para rota já
 * carregada — ver o comentário da utilidade em `index.css`.
 */
function Carregando() {
  const { pathname } = useLocation()
  return (
    <div className="esqueleto-adiado">
      <SkeletonPagina variante={varianteDaRota(pathname)} />
    </div>
  )
}

export function AppShell() {
  useTemaEfetivo()

  const [paletaAberta, setPaletaAberta] = useState(false)
  const [ajudaAberta, setAjudaAberta] = useState(false)

  const abrirPaleta = useCallback(() => setPaletaAberta(true), [])
  const abrirAjuda = useCallback(() => setAjudaAberta(true), [])

  useAtalhos({ abrirPaleta, abrirAjuda })

  return (
    <div className="bg-background flex h-dvh overflow-hidden">
      <Sidebar onAbrirBusca={abrirPaleta} />

      <main className="flex-1 overflow-y-auto">
        {/* Barra superior do mobile: a sidebar (e seu toggle de tema) some ali */}
        <header className="border-border flex h-12 items-center justify-between gap-2 border-b px-4 md:hidden">
          <span className="text-sm font-medium">Nexus</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-9"
              aria-label="Buscar"
              onClick={abrirPaleta}
            >
              <Search className="size-4" />
            </Button>
            {/* Largura fixa: o botão do toggle usa w-full por padrão */}
            <div className="w-9">
              <ThemeToggle colapsada />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8">
          <Suspense fallback={<Carregando />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <BottomNav />

      <PaletaComandos aberta={paletaAberta} onAbertaChange={setPaletaAberta} />
      <DialogAtalhos aberto={ajudaAberta} onAbertoChange={setAjudaAberta} />
    </div>
  )
}
