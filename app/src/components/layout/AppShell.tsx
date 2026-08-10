import { Suspense, useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
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
 * Fallback do Suspense do code-splitting. Genérico de propósito: aqui não se
 * sabe qual rota está entrando, então usa a composição mais neutra. Cada page
 * tem o seu próprio esqueleto para o carregamento dos dados.
 */
function Carregando() {
  return <SkeletonPagina variante="grade" />
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
