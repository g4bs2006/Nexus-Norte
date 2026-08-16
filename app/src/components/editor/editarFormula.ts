import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'

/** A fórmula que se pediu para editar, e onde ela mora no documento. */
export interface FormulaEmEdicao {
  latex: string
  bloco: boolean
  /** Posição do nó. É por ela que a substituição encontra o que trocar. */
  posicao: number
}

export type AoEditarFormula = (formula: FormulaEmEdicao) => void

const chave = new PluginKey('editar-formula')

/**
 * Duplo clique numa fórmula reabre o editor visual com ela dentro.
 *
 * Sem isto, mudar um expoente de uma fórmula pronta era apagar tudo e escrever
 * de novo — e a fórmula difícil, que é justamente a que se monta no MathLive,
 * é a mais cara de refazer.
 *
 * Duplo clique, e não clique simples, porque o clique simples já tem dono nos
 * dois casos e tirá-lo seria pior: na fórmula inline ele põe o cursor dentro
 * para editar o LaTeX na linha, e no bloco ele seleciona o nó para apagar ou
 * arrastar.
 *
 * O LaTeX mora em lugar diferente em cada um: no bloco é o atributo `value` e
 * no inline é o texto do nó. É o `plugin-math` que os declara assim, e quem
 * grava a fórmula de volta (`EditorMarkdownRico`) segue a mesma divisão.
 */
export function criarEditarFormula(aoEditar: AoEditarFormula) {
  return $prose(
    () =>
      new Plugin({
        key: chave,
        props: {
          handleDoubleClickOn: (_view, _pos, no, posicaoDoNo) => {
            if (no.type.name === 'math_block') {
              aoEditar({
                latex: String(no.attrs.value ?? ''),
                bloco: true,
                posicao: posicaoDoNo,
              })
              return true
            }

            if (no.type.name === 'math_inline') {
              aoEditar({
                latex: no.textContent,
                bloco: false,
                posicao: posicaoDoNo,
              })
              return true
            }

            return false
          },
        },
      }),
  )
}
