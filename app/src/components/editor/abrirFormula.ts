import { $inputRule } from '@milkdown/kit/utils'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import { TextSelection } from '@milkdown/kit/prose/state'
import { mathInlineSchema } from '@milkdown/plugin-math'

/**
 * `\` abre uma fórmula em branco.
 *
 * Antes disto só havia dois caminhos até uma fórmula: digitar `$...$` de
 * cabeça (fecha o par você mesmo, sem ajuda) ou abrir o menu `//` e escolher
 * um símbolo do catálogo. Nenhum dos dois é "só comece a escrever" — o pedido
 * em uso foi exatamente isso: `\` já é o caractere com que todo comando LaTeX
 * começa, então ele mesmo virou o gatilho.
 *
 * Digitar `\` sozinho (início da frase ou depois de espaço) troca o próprio
 * `\` por uma fórmula vazia, com o cursor já dentro. Dali em diante é o nó de
 * `viewMatematica` que manda: o render acompanha cada tecla, `//` continua
 * valendo para os símbolos prontos, e `Enter` (`sairDaFormula`) fecha e volta
 * ao texto — nada disso precisou ser reimplementado aqui.
 *
 * A guarda por `math_inline` é o que impede a regra de disparar de novo a
 * cada backslash do PRÓPRIO LaTeX: `\frac`, `\int` e companhia tremem de
 * backslash, e sem a guarda cada um deles abriria uma fórmula nova dentro da
 * fórmula.
 */
const RE_ABRIR_FORMULA = /(?:^|\s)\\$/

export const abrirFormula = $inputRule(
  (ctx) =>
    new InputRule(RE_ABRIR_FORMULA, (state, _match, _inicio, fim) => {
      const { $from } = state.selection

      // Dentro de código, `\` é caractere comum — LaTeX não se escreve ali.
      if ($from.parent.type.spec.code) return null
      // Já dentro de uma fórmula: é o próprio LaTeX se escrevendo.
      if ($from.parent.type.name === 'math_inline') return null

      const tipoNo = mathInlineSchema.type(ctx)
      const no = tipoNo.create(null)

      /*
       * Só o `\` recém-digitado é substituído — a regra casa opcionalmente o
       * espaço antes dele (`(?:^|\s)`), mas apagar esse espaço também
       * colaria a fórmula na palavra anterior.
       */
      const de = fim - 1
      const transacao = state.tr.replaceWith(de, fim, no)
      // +1 entra no conteúdo do nó, que nasce vazio.
      transacao.setSelection(TextSelection.create(transacao.doc, de + 1))
      return transacao
    }),
)
