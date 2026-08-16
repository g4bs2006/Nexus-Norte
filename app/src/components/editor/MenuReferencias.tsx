import { useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EstadoGatilho } from './gatilhoMenu'
import type { ItemMenu } from './MenuSimbolos'

interface MenuReferenciasProps {
  estado: EstadoGatilho | null
  itens: readonly ItemMenu[]
  indice: number
  onEscolher: (item: ItemMenu) => void
}

const ALTURA_MAXIMA = 280

/**
 * Menu suspenso inline exclusivo para Menções entre Notas (`[[`).
 *
 * Exibe um layout limpo em 2 colunas:
 * - Esquerda: Ícone de documento + Título da nota em destaque.
 * - Direita: Badge da Matéria + Slug em fonte sutil.
 */
export function MenuReferencias({
  estado,
  itens,
  indice,
  onEscolher,
}: MenuReferenciasProps) {
  const lista = useRef<HTMLUListElement>(null)
  const [paraCima, setParaCima] = useState(false)

  useEffect(() => {
    if (!estado) return
    setParaCima(window.innerHeight - estado.ancora.base < ALTURA_MAXIMA)
  }, [estado])

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
      aria-label="Mencionar Nota"
      className="bg-popover/95 border-border fixed z-50 w-80 overflow-y-auto rounded-lg border p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150"
      style={{
        left: estado.ancora.esquerda,
        maxHeight: ALTURA_MAXIMA,
        ...(paraCima
          ? { bottom: window.innerHeight - estado.ancora.topo + 4 }
          : { top: estado.ancora.base + 4 }),
      }}
    >
      <li className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Mencionar nota
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
                'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors',
                ativo
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'hover:bg-accent text-foreground',
              )}
              onMouseDown={(evento) => {
                evento.preventDefault()
                onEscolher(item)
              }}
            >
              <span className="flex items-center gap-2 truncate min-w-0">
                <FileText
                  className={cn(
                    'size-3.5 shrink-0',
                    ativo ? 'text-primary-foreground' : 'text-muted-foreground',
                  )}
                />
                <span className="truncate">{item.rotulo}</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px]',
                    ativo
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {item.amostra}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
