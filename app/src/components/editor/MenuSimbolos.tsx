import { useEffect, useRef, useState } from 'react'
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Pencil,
  Pilcrow,
  Quote,
  Sigma,
  Table,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EstadoGatilho } from './gatilhoMenu'

/** O que a lista precisa saber de cada item. */
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

/** Mapeamento visual de ícones e atalhos em sintaxe Markdown estilo Notion. */
const ICONES_MENU: Record<
  string,
  { icone: LucideIcon; sintaxe: string }
> = {
  titulo1: { icone: Heading1, sintaxe: '#' },
  titulo2: { icone: Heading2, sintaxe: '##' },
  titulo3: { icone: Heading3, sintaxe: '###' },
  lista: { icone: List, sintaxe: '-' },
  numerada: { icone: ListOrdered, sintaxe: '1.' },
  citacao: { icone: Quote, sintaxe: '>' },
  texto: { icone: Pilcrow, sintaxe: '¶' },
  divisor: { icone: Minus, sintaxe: '---' },
  tabela: { icone: Table, sintaxe: '▦' },
  codigo: { icone: Code2, sintaxe: '```' },
  formula: { icone: Sigma, sintaxe: '$$' },
  desenho: { icone: Pencil, sintaxe: '![[' },
}

const ALTURA_MAXIMA = 320

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
    <div
      aria-label="Menu de Comandos"
      className="bg-popover/95 border-border/80 fixed z-50 w-72 overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col"
      style={{
        left: estado.ancora.esquerda,
        maxHeight: ALTURA_MAXIMA,
        ...(paraCima
          ? { bottom: window.innerHeight - estado.ancora.topo + 4 }
          : { top: estado.ancora.base + 4 }),
      }}
    >
      <ul
        ref={lista}
        role="listbox"
        aria-label="Símbolos e Comandos"
        className="overflow-y-auto p-1.5 no-scrollbar space-y-0.5 max-h-64"
      >
        <li className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Comandos e Blocos
        </li>
        {itens.map((item, posicao) => {
          const ativo = posicao === indice
          const meta = ICONES_MENU[item.chave]
          const Icone = meta?.icone

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
                    ? 'bg-accent/90 text-foreground font-medium shadow-xs'
                    : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground',
                )}
                onMouseDown={(evento) => {
                  evento.preventDefault()
                  onEscolher(item)
                }}
              >
                <span className="flex items-center gap-2.5 truncate min-w-0">
                  {Icone ? (
                    <Icone
                      className={cn(
                        'size-4 shrink-0 transition-colors',
                        ativo ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                  ) : (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-mono bg-muted/80 text-muted-foreground">
                      {item.amostra}
                    </span>
                  )}
                  <span className="truncate text-foreground font-normal">
                    {item.rotulo}
                  </span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors',
                    ativo
                      ? 'bg-primary/20 text-primary font-semibold'
                      : 'bg-muted/60 text-muted-foreground/70',
                  )}
                >
                  {meta?.sintaxe ?? `/${item.chave}`}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Rodapé Fixo Estilo Notion / Raycast */}
      <div className="border-t border-border/60 bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1">
          Navegar <kbd className="font-mono bg-background/80 px-1 rounded border border-border/40">↑↓</kbd>
        </span>
        <span className="flex items-center gap-1">
          Selecionar <kbd className="font-mono bg-background/80 px-1 rounded border border-border/40">↵</kbd>
        </span>
      </div>
    </div>
  )
}
