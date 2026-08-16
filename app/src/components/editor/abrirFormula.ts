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
       * INSERE, não substitui — e é onde a primeira versão disto errou.
       *
       * Uma input rule roda ANTES de o caractere digitado entrar no
       * documento (`run()` em `prosemirror-inputrules` monta o texto de
       * comparação concatenando a tecla, justamente porque ela ainda não
       * está lá). Então não há `\` no documento para trocar pelo nó: quem
       * mora em `fim - 1` é o caractere anterior, e substituí-lo apagava uma
       * letra da palavra e ainda largava o cursor fora da fórmula — sem
       * cursor dentro, a decoração `formula-editando` não aplica e o CSS
       * mantém a fonte oculta, que era o "não consigo digitar nada".
       *
       * Devolver a transação já impede o `\` de ser inserido; o espaço que a
       * regra casa antes dele fica onde estava, porque nada é removido.
       */
      const transacao = state.tr.insert(fim, no)
      // +1 entra no conteúdo do nó, que nasce vazio.
      transacao.setSelection(TextSelection.create(transacao.doc, fim + 1))
      return transacao
    }),
)
