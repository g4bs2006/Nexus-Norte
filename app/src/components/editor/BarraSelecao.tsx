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
      className="bg-popover border-border fixed z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-md border p-1 shadow-md"
      style={{ left: ancora.esquerda, top: ancora.topo - 44 }}
    >
      {BOTOES.map(({ marca, rotulo, icone: Icone, atalho }) => (
        <button
          key={marca}
          type="button"
          title={`${rotulo} · ${atalho}`}
          aria-label={rotulo}
          className="hover:bg-accent flex size-7 items-center justify-center rounded-sm"
          onMouseDown={(evento) => {
            evento.preventDefault()
            onMarcar(marca)
          }}
        >
          <Icone className="size-3.5" />
        </button>
      ))}

      <span className="bg-border mx-0.5 h-4 w-px" aria-hidden />

      {/*
        Destaque, e não paleta de cor. Markdown não tem cor, e gravá-la exigiria
        <span style>, que faria o `.md` exportado deixar de ser Markdown —
        derrubando o argumento que sustenta o editor inteiro. `==assim==` é
        extensão que o Obsidian entende e sobrevive à exportação.
      */}
      <button
        type="button"
        title="Destacar · marca o que cai na prova"
        aria-label="Destacar"
        className="hover:bg-accent flex size-7 items-center justify-center rounded-sm"
        onMouseDown={(evento) => {
          evento.preventDefault()
          onDestacar()
        }}
      >
        <Highlighter className="size-3.5" />
      </button>
    </div>
  )
}
