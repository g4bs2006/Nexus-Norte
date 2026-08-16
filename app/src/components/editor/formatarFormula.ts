import { $inputRule } from '@milkdown/kit/utils'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import { TextSelection } from '@milkdown/kit/prose/state'

/**
 * `*` e `/` dentro da fórmula viram os operadores de verdade.
 *
 * Pedido em uso: escrever `3*x` deveria mostrar o pontinho de multiplicação
 * (`\cdot`), e `3/4` deveria virar fração de verdade (`\frac{3}{4}`), com o
 * cursor pulando pro denominador — não o caractere cru, que é o que o KaTeX
 * mostra se ninguém traduzir.
 *
 * As duas regras só valem DENTRO de `math_inline` (`$from.parent.type.name`).
 * Fora da fórmula `*` e `/` são texto comum — `*itálico*` é Markdown, e
 * interceptar a barra em qualquer lugar quebraria toda frase com "e/ou".
 */

/**
 * `*` → `\cdot `.
 *
 * O espaço depois não é estético: sem ele, `\cdot` grudado no próximo
 * caractere ("`\cdotx`") vira um nome de comando inválido para o KaTeX. O
 * espaço em si não aparece — o `\cdot` já tem o espaçamento certo embutido.
 */
export const multiplicacaoFormula = $inputRule(
  () =>
    new InputRule(/\*$/, (state, _match, inicio, fim) => {
      const { $from } = state.selection
      if ($from.parent.type.name !== 'math_inline') return null
      return state.tr.insertText('\\cdot ', inicio, fim)
    }),
)

/**
 * `/` → `\frac{numerador}{}`, com o cursor já no denominador.
 *
 * O numerador é o que está imediatamente antes do cursor: um grupo entre
 * parênteses ou chaves fechando bem ali (`(x+1)/` vira `\frac{x+1}{}`,
 * parênteses inclusos), ou a sequência de letras/dígitos/comando LaTeX que
 * termina ali (`3/`, `\pi/`). Sem numerador reconhecível — início da fórmula,
 * depois de espaço, depois de outro operador — a regra não faz nada e a
 * barra fica crua, porque não há o que dividir.
 *
 * É esse recuo, e não um caso especial, o que protege o `//` do menu de
 * símbolos: ele só dispara depois de espaço ou no início (regra própria do
 * gatilho), e é exatamente aí que o numerador vem vazio.
 */
export const fracaoFormula = $inputRule(
  () =>
    new InputRule(/\/$/, (state, _match, _inicio, fim) => {
      const { $from } = state.selection
      if ($from.parent.type.name !== 'math_inline') return null

      const antes = $from.parent.textBetween(0, $from.parentOffset)
      // Segunda barra de "//": é o gatilho de símbolos, não uma fração.
      if (antes.endsWith('/')) return null

      const { numerador, inicioLocal } = capturarNumerador(antes)
      if (numerador === '') return null

      const de = $from.start() + inicioLocal
      const textoNovo = `\\frac{${numerador}}{}`
      const transacao = state.tr.insertText(textoNovo, de, fim)
      // Um `}` antes do fim: dentro do denominador, que nasce vazio.
      transacao.setSelection(
        TextSelection.create(transacao.doc, de + textoNovo.length - 1),
      )
      return transacao
    }),
)

/** Só letra, dígito, ponto ou barra invertida — o que forma um token simples. */
const RE_TOKEN = /[A-Za-z0-9.\\]/

/**
 * Acha onde o numerador começa, olhando para trás a partir do fim de `texto`.
 *
 * Grupo entre parênteses ou chaves: acompanha o balanço até achar o par —
 * `(x+1)` inteiro vira numerador, sem os parênteses. Sem fechamento ali,
 * devolve vazio: texto desbalanceado não é numerador de nada.
 */
function capturarNumerador(texto: string): {
  numerador: string
  inicioLocal: number
} {
  const ultimo = texto[texto.length - 1]

  if (ultimo === ')' || ultimo === '}') {
    const abertura = ultimo === ')' ? '(' : '{'
    let saldo = 0
    for (let i = texto.length - 1; i >= 0; i -= 1) {
      if (texto[i] === ultimo) saldo += 1
      else if (texto[i] === abertura) {
        saldo -= 1
        if (saldo === 0) {
          return {
            numerador: texto.slice(i + 1, texto.length - 1),
            inicioLocal: i,
          }
        }
      }
    }
    return { numerador: '', inicioLocal: texto.length }
  }

  let i = texto.length
  while (i > 0 && RE_TOKEN.test(texto[i - 1] as string)) i -= 1
  return { numerador: texto.slice(i), inicioLocal: i }
}
