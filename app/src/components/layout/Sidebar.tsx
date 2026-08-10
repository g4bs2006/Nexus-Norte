import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ITENS_NAVEGACAO } from '@/lib/pilares'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'

/**
 * Atraso para recolher ao sair. Recolher no mesmo instante fica nervoso quando o
 * mouse passa em diagonal pela borda; abrir é imediato, porque ali a intenção
 * já é clara.
 */
const ATRASO_RECOLHER_MS = 220

interface SidebarProps {
  onAbrirBusca: () => void
}

export function Sidebar({ onAbrirBusca }: SidebarProps) {
  const [hover, setHover] = useState(false)
  const timerRecolher = useRef<number | undefined>(undefined)

  function agendarRecolher() {
    window.clearTimeout(timerRecolher.current)
    timerRecolher.current = window.setTimeout(
      () => setHover(false),
      ATRASO_RECOLHER_MS,
    )
  }

  function abrirAgora() {
    window.clearTimeout(timerRecolher.current)
    setHover(true)
  }

  useEffect(() => () => window.clearTimeout(timerRecolher.current), [])

  return (
    // Reserva a largura da trilha. O conteúdo nunca é empurrado.
    <div
      className="relative hidden w-14 shrink-0 md:block"
      onMouseEnter={abrirAgora}
      onMouseLeave={agendarRecolher}
      // Teclado nunca passa o mouse: sem isso, quem navega por Tab só veria
      // ícones sem rótulo.
      onFocus={abrirAgora}
      onBlur={(evento) => {
        if (
          !evento.currentTarget.contains(evento.relatedTarget as Node | null)
        ) {
          agendarRecolher()
        }
      }}
    >
      <aside
        className={cn(
          'bg-sidebar border-sidebar-border absolute inset-y-0 left-0 z-30 flex flex-col border-r transition-[width] duration-200',
          hover ? 'w-56 shadow-lg' : 'w-14',
        )}
      >
        {/* Cabeçalho */}
        <div
          className={cn(
            'flex h-14 items-center gap-2 px-3',
            !hover && 'justify-center px-0',
          )}
        >
          {hover && (
            <span className="text-sidebar-foreground truncate text-sm font-medium">
              Nexus
            </span>
          )}
        </div>

        {/* Busca — gatilho visível do Ctrl/⌘ K */}
        <div className={cn('px-2 pb-2', !hover && 'px-1.5')}>
          <button
            type="button"
            onClick={onAbrirBusca}
            title={!hover ? 'Buscar' : undefined}
            className={cn(
              'border-sidebar-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors',
              !hover && 'justify-center px-0',
            )}
          >
            <Search className="size-4 shrink-0" />
            {hover && (
              <>
                <span className="flex-1 text-left">Buscar</span>
                <kbd className="border-sidebar-border bg-sidebar rounded border px-1 py-0.5 font-mono text-[10px] leading-none">
                  <AtalhoBusca />
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex flex-1 flex-col gap-0.5 px-2">
          {ITENS_NAVEGACAO.map(
            ({ id, nome, rota, icone: Icone, classeTexto }) => (
              <NavLink
                key={id}
                to={rota}
                end={rota === '/'}
                title={!hover ? nome : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    // Item ativo destacado com fundo sutil (plano 1.2)
                    isActive &&
                      'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                    !hover && 'justify-center px-0',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icone
                      className={cn('size-4 shrink-0', isActive && classeTexto)}
                    />
                    {hover && <span className="truncate">{nome}</span>}
                  </>
                )}
              </NavLink>
            ),
          )}
        </nav>

        {/* Rodapé */}
        <div className="border-sidebar-border border-t p-2">
          <ThemeToggle colapsada={!hover} />
        </div>
      </aside>
    </div>
  )
}

/**
 * Tecla do atalho conforme a plataforma. `userAgent` em vez de `platform`, que
 * está deprecado.
 */
function AtalhoBusca() {
  const ehMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.userAgent)
  return <>{ehMac ? '⌘' : 'Ctrl'} K</>
}

