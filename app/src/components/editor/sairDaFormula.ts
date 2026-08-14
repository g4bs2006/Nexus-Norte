import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey, TextSelection } from '@milkdown/kit/prose/state'

const chave = new PluginKey('sair-da-formula')

/**
 * `Enter` termina a fórmula e devolve o cursor ao texto.
 *
 * É o fecho do fluxo pedido em uso: `//int` abre a integral, escreve-se o que
 * for — inclusive outro símbolo pelo `//` —, e `Enter` conclui.
 *
 * Sem isto, `Enter` dentro da fórmula quebraria o parágrafo no meio dela, o
 * que é sempre errado: fórmula não tem duas linhas, e o nó não sobreviveria à
 * divisão.
 *
 * `Escape` faz o mesmo, para quem tem o reflexo de sair com ele.
 */
export const sairDaFormula = $prose(
  () =>
    new Plugin({
      key: chave,
      props: {
        handleKeyDown: (view, evento) => {
          if (evento.key !== 'Enter' && evento.key !== 'Escape') return false

          const { $from } = view.state.selection

          // Sobe até achar a fórmula que contém o cursor, se houver.
          for (let nivel = $from.depth; nivel > 0; nivel -= 1) {
            const no = $from.node(nivel)
            if (no.type.name !== 'math_inline') continue

            const fim = $from.before(nivel) + no.nodeSize
            evento.preventDefault()
            view.dispatch(
              view.state.tr.setSelection(
                // Logo depois do nó: continua-se a frase de onde ela parou.
                TextSelection.create(view.state.doc, fim),
              ),
            )
            return true
          }

          return false
        },
      },
    }),
)
