import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { ITENS_NAVEGACAO } from '@/lib/pilares'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { useUIStore } from '@/stores/ui'

interface SidebarProps {
  onAbrirBusca: () => void
}

export function Sidebar({ onAbrirBusca }: SidebarProps) {
  const colapsada = useUIStore((estado) => estado.sidebarColapsada)
  const alternar = useUIStore((estado) => estado.alternarSidebar)

  // Atalho invisível não é descoberto: o gatilho fica visível e mostra a tecla.
  // `userAgent` em vez de `platform`, que está deprecado.
  const ehMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

  return (
    <aside
      className={cn(
        // Escondida no mobile: lá a navegação é a BottomNav
        'bg-sidebar border-sidebar-border hidden shrink-0 flex-col border-r transition-[width] duration-200 md:flex',
        colapsada ? 'w-14' : 'w-56',
      )}
    >
      {/* Cabeçalho */}
      <div
        className={cn(
          'flex h-14 items-center gap-2 px-3',
          colapsada && 'justify-center px-0',
        )}
      >
        {!colapsada && (
          <span className="text-sidebar-foreground flex-1 truncate text-sm font-medium">
            Nexus
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={alternar}
          className="text-muted-foreground hover:text-foreground size-7"
          aria-label={colapsada ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {colapsada ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>

      {/* Busca — gatilho visível do Ctrl/⌘ K */}
      <div className={cn('px-2 pb-2', colapsada && 'px-1.5')}>
        <button
          type="button"
          onClick={onAbrirBusca}
          title={colapsada ? 'Buscar' : undefined}
          className={cn(
            'border-sidebar-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors',
            colapsada && 'justify-center px-0',
          )}
        >
          <Search className="size-4 shrink-0" />
          {!colapsada && (
            <>
              <span className="flex-1 text-left">Buscar</span>
              <kbd className="border-sidebar-border bg-sidebar rounded border px-1 py-0.5 font-mono text-[10px] leading-none">
                {ehMac ? '⌘' : 'Ctrl'} K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {ITENS_NAVEGACAO.map(({ id, nome, rota, icone: Icone, classeTexto }) => (
          <NavLink
            key={id}
            to={rota}
            end={rota === '/'}
            title={colapsada ? nome : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                // Item ativo destacado com fundo sutil (plano 1.2)
                isActive &&
                  'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                colapsada && 'justify-center px-0',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icone
                  className={cn('size-4 shrink-0', isActive && classeTexto)}
                />
                {!colapsada && <span className="truncate">{nome}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="border-sidebar-border border-t p-2">
        <ThemeToggle colapsada={colapsada} />
      </div>
    </aside>
  )
}
