import { useEffect, useRef, useState } from 'react'
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

const ALTURA_MAXIMA = 260

/**
 * A lista que aparece junto do cursor.
 *
 * `position: fixed` sobre as coordenadas que o ProseMirror deu — não é um
 * popover ancorado a um elemento, porque o cursor não é um elemento. Vira para
 * cima quando não cabe embaixo, que é o caso comum ao escrever no fim da tela.
 *
 * Não recebe foco, e é isso que faz o atalho funcionar: o cursor continua no
 * texto, digitar continua filtrando, e o teclado é lido pelo plugin do editor.
 * Um menu que rouba o foco seria um diálogo com outro nome.
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
      aria-label="Símbolos"
      className="bg-popover border-border fixed z-50 w-64 overflow-y-auto rounded-md border p-1 shadow-md"
      style={{
        left: estado.ancora.esquerda,
        maxHeight: ALTURA_MAXIMA,
        ...(paraCima
          ? { bottom: window.innerHeight - estado.ancora.topo + 4 }
          : { top: estado.ancora.base + 4 }),
      }}
    >
      {itens.map((item, posicao) => (
        <li key={item.chave}>
          <button
            type="button"
            role="option"
            aria-selected={posicao === indice}
            data-selecionado={posicao === indice ? 'sim' : 'nao'}
            className="data-[selecionado=sim]:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
            // `onMouseDown` e não `onClick`: clicar tiraria o foco do editor
            // antes de o clique chegar, e a inserção perderia a posição.
            onMouseDown={(evento) => {
              evento.preventDefault()
              onEscolher(item)
            }}
          >
            <span className="text-muted-foreground w-8 shrink-0 text-center">
              {item.amostra}
            </span>
            <span className="truncate">{item.rotulo}</span>
            <span className="text-muted-foreground/60 ml-auto shrink-0 text-[11px]">
              {item.chave}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
