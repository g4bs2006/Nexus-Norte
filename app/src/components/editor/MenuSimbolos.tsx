import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { EstadoGatilho } from './gatilhoMenu'

/** O que a lista precisa saber de cada item, sem conhecer LaTeX. */
export interface ItemMenu {
  chave: string
  rotulo: string
  amostra: string
}

interface MenuSimbolosProps {
  estado: EstadoGatilho | null
  itens: readonly ItemMenu[]
  indice: number
  onEscolher: (item: ItemMenu) => void
}

const ALTURA_MAXIMA = 280

/**
 * A lista que aparece junto do cursor (Notion / Raycast style).
 */
export function MenuSimbolos({
  estado,
  itens,
  indice,
  onEscolher,
}: MenuSimbolosProps) {
  const lista = useRef<HTMLUListElement>(null)
  const [paraCima, setParaCima] = useState(false)

  useEffect(() => {
    if (!estado) return
    setParaCima(window.innerHeight - estado.ancora.base < ALTURA_MAXIMA)
  }, [estado])

  /* Mantém o selecionado visível quando se anda com as setas. */
  useEffect(() => {
    lista.current
      ?.querySelector('[data-selecionado="sim"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [indice])

  if (!estado || itens.length === 0) return null

  return (
    <ul
      ref={lista}
      role="listbox"
      aria-label="Símbolos e Comandos"
      className="bg-popover/95 border-border/80 fixed z-50 w-72 overflow-y-auto rounded-xl border p-1.5 shadow-2xl backdrop-blur-xl no-scrollbar animate-in fade-in-50 zoom-in-95 duration-150"
      style={{
        left: estado.ancora.esquerda,
        maxHeight: ALTURA_MAXIMA,
        ...(paraCima
          ? { bottom: window.innerHeight - estado.ancora.topo + 4 }
          : { top: estado.ancora.base + 4 }),
      }}
    >
      <li className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Comandos e Blocos
      </li>
      {itens.map((item, posicao) => {
        const ativo = posicao === indice
        return (
          <li key={item.chave}>
            <button
              type="button"
              role="option"
              aria-selected={ativo}
              data-selecionado={ativo ? 'sim' : 'nao'}
              className={cn(
                'group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer',
                ativo
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'hover:bg-accent text-foreground',
              )}
              onMouseDown={(evento) => {
                evento.preventDefault()
                onEscolher(item)
              }}
            >
              <span className="flex items-center gap-2.5 truncate min-w-0">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-mono transition-colors',
                    ativo
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted/80 text-muted-foreground',
                  )}
                >
                  {item.amostra}
                </span>
                <span className="truncate">{item.rotulo}</span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors',
                  ativo
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted/80 text-muted-foreground/70',
                )}
              >
                /{item.chave}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
