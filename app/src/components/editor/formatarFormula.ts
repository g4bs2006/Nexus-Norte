import { $inputRule } from '@milkdown/kit/utils'
import { InputRule } from '@milkdown/kit/prose/inputrules'

/**
 * `*` dentro da fórmula vira o ponto de multiplicação.
 *
 * Ninguém escreve `\cdot` à mão no meio de uma conta, e o `*` cru é o que o
 * KaTeX desenha se ninguém traduzir: um asterisco sobrescrito, que não é o
 * sinal de multiplicação de nenhuma notação.
 *
 * A guarda por `math_inline` é o que torna a regra segura: FORA da fórmula o
 * `*` é Markdown — `*itálico*` — e interceptá-lo em qualquer lugar quebraria
 * a ênfase do editor inteiro.
 *
 * O espaço depois de `\cdot` não é estético: sem ele, colado no próximo
 * caractere (`\cdotx`), o KaTeX lê um nome de comando que não existe. O espaço
 * não aparece no desenho — o `\cdot` já traz o próprio espaçamento.
 */
export const multiplicacaoFormula = $inputRule(
  () =>
    new InputRule(/\*$/, (state, _casamento, de, ate) => {
      const { $from } = state.selection
      if ($from.parent.type.name !== 'math_inline') return null
      return state.tr.insertText('\\cdot ', de, ate)
    }),
)
