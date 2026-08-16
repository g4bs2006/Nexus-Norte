import { Bold, Code, Highlighter, Italic, Strikethrough } from 'lucide-react'
import type { AncoraSelecao } from './pluginSelecao'
import type { MarcaEscrita } from './comandos'

interface BarraSelecaoProps {
  ancora: AncoraSelecao | null
  onMarcar: (marca: MarcaEscrita) => void
  onDestacar: () => void
}

const BOTOES: readonly {
  marca: MarcaEscrita
  rotulo: string
  icone: typeof Bold
  atalho: string
}[] = [
  { marca: 'negrito', rotulo: 'Negrito', icone: Bold, atalho: 'Ctrl+B' },
  { marca: 'italico', rotulo: 'Itálico', icone: Italic, atalho: 'Ctrl+I' },
  {
    marca: 'riscado',
    rotulo: 'Riscado',
    icone: Strikethrough,
    atalho: 'Ctrl+Shift+X',
  },
  { marca: 'codigo', rotulo: 'Código', icone: Code, atalho: 'Ctrl+E' },
]

/**
 * A barra que aparece sobre o texto selecionado.
 *
 * Formata o que já está escrito — o outro lado do `/`, que insere o que vem a
 * seguir. É a divisão do Notion, e ela existe porque as duas ações respondem a
 * perguntas diferentes: "o que eu quero agora" e "o que fiz com isto".
 *
 * `onMouseDown` com `preventDefault` em todo botão, e não `onClick`: clicar
 * tiraria o foco do editor e a seleção sumiria antes de o comando rodar. É o
 * mesmo cuidado do seletor de referência.
 */
export function BarraSelecao({
  ancora,
  onMarcar,
  onDestacar,
}: BarraSelecaoProps) {
  if (!ancora) return null

  return (
    <div
      role="toolbar"
      aria-label="Formatar seleção"
      className="bg-popover/90 border-border/80 fixed z-50 flex -translate-x-1/2 items-center gap-1 rounded-lg border p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150"
      style={{ left: ancora.esquerda, top: ancora.topo - 48 }}
    >
      {BOTOES.map(({ marca, rotulo, icone: Icone, atalho }) => (
        <button
          key={marca}
          type="button"
          title={`${rotulo} · ${atalho}`}
          aria-label={rotulo}
          className="hover:bg-accent hover:text-accent-foreground text-muted-foreground flex size-8 items-center justify-center rounded-md transition-all duration-150 cursor-pointer"
          onMouseDown={(evento) => {
            evento.preventDefault()
            onMarcar(marca)
          }}
        >
          <Icone className="size-4" />
        </button>
      ))}

      <span className="bg-border/60 mx-1 h-4 w-px" aria-hidden />

      <button
        type="button"
        title="Destacar · marca o que cai na prova"
        aria-label="Destacar"
        className="hover:bg-accent hover:text-accent-foreground text-muted-foreground flex size-8 items-center justify-center rounded-md transition-all duration-150 cursor-pointer"
        onMouseDown={(evento) => {
          evento.preventDefault()
          onDestacar()
        }}
      >
        <Highlighter className="size-4 text-estudos" />
      </button>
    </div>
  )
}
