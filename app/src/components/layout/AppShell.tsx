import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { ThemeToggle } from './ThemeToggle'
import { useTemaEfetivo } from '@/hooks/useTemaEfetivo'

function Carregando() {
  return <p className="text-muted-foreground text-sm">Carregando…</p>
}

export function AppShell() {
  useTemaEfetivo()

  return (
    <div className="bg-background flex h-dvh overflow-hidden">
      {/* Sidebar só em telas médias para cima; no mobile vira barra inferior */}
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Barra superior do mobile: a sidebar (e seu toggle de tema) some ali */}
        <header className="border-border flex h-12 items-center justify-between border-b px-4 md:hidden">
          <span className="text-sm font-medium">Nexus</span>
          {/* Largura fixa: o botão do toggle usa w-full por padrão */}
          <div className="w-9">
            <ThemeToggle colapsada />
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8">
          <Suspense fallback={<Carregando />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
