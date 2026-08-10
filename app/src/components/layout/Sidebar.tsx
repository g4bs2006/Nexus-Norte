import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { ITENS_NAVEGACAO } from '@/lib/pilares'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { useUIStore } from '@/stores/ui'

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
  const fixada = !useUIStore((estado) => estado.sidebarColapsada)
  const alternar = useUIStore((estado) => estado.alternarSidebar)

  const [hover, setHover] = useState(false)
  const timerRecolher = useRef<number | undefined>(undefined)

  /**
   * Aberta = fixada pelo usuário OU sob o ponteiro/foco.
   *
   * O botão deixou de ser "colapsar" e passou a ser um PIN: recolhida, ela é uma
   * trilha que se abre ao aproximar; fixada, fica aberta e o hover não interfere.
   * Sem isso, quem fixou a sidebar veria ela fechar sozinha — o hover brigaria
   * com a preferência explícita.
   */
  const aberta = fixada || hover

  /** Sobrepõe o conteúdo em vez de empurrá-lo: abrir por hover não deve
   *  reposicionar a página inteira sob o cursor. */
  const sobrepondo = !fixada && hover

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
    // Reserva a largura da trilha. Quando sobrepõe, o conteúdo não se move.
    <div
      className={cn(
        'relative hidden shrink-0 transition-[width] duration-200 md:block',
        fixada ? 'w-56' : 'w-14',
      )}
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
          aberta ? 'w-56' : 'w-14',
          sobrepondo && 'shadow-lg',
        )}
      >
        {/* Cabeçalho */}
        <div
          className={cn(
            'flex h-14 items-center gap-2 px-3',
            !aberta && 'justify-center px-0',
          )}
        >
          {aberta && (
            <span className="text-sidebar-foreground flex-1 truncate text-sm font-medium">
              Nexus
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              alternar()
              // Ao desafixar, limpar o hover imediatamente — senão o mouse ainda
              // sobre a sidebar mantém ela aberta enquanto o conteúdo já se ajustou.
              if (fixada) setHover(false)
            }}
            className="text-muted-foreground hover:text-foreground size-7"
            aria-label={fixada ? 'Soltar sidebar' : 'Fixar sidebar aberta'}
            aria-pressed={fixada}
            title={fixada ? 'Soltar' : 'Fixar aberta'}
          >
            {fixada ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
          </Button>
        </div>

        {/* Busca — gatilho visível do Ctrl/⌘ K */}
        <div className={cn('px-2 pb-2', !aberta && 'px-1.5')}>
          <button
            type="button"
            onClick={onAbrirBusca}
            title={!aberta ? 'Buscar' : undefined}
            className={cn(
              'border-sidebar-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors',
              !aberta && 'justify-center px-0',
            )}
          >
            <Search className="size-4 shrink-0" />
            {aberta && (
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
                title={!aberta ? nome : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    // Item ativo destacado com fundo sutil (plano 1.2)
                    isActive &&
                      'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                    !aberta && 'justify-center px-0',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icone
                      className={cn('size-4 shrink-0', isActive && classeTexto)}
                    />
                    {aberta && <span className="truncate">{nome}</span>}
                  </>
                )}
              </NavLink>
            ),
          )}
        </nav>

        {/* Rodapé */}
        <div className="border-sidebar-border border-t p-2">
          <ThemeToggle colapsada={!aberta} />
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
