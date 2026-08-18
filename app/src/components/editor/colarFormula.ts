import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'

const chave = new PluginKey('colar-formula')

/**
 * LaTeX colado vira fórmula renderizada, venha de onde vier.
 *
 * ## O que isto resolve
 *
 * Duplicar uma fórmula dentro da nota era impossível na prática. O nó é
 * `selectable: false` (ver `viewMatematica`), então não há como clicar nele e
 * copiar — o botão de copiar da fórmula abriu metade do caminho, e esta é a
 * outra metade. Sem ela o `$\int_0^\infty$` colado ficaria como texto literal,
 * com os cifrões à mostra, até alguém salvar e reabrir a nota.
 *
 * De quebra vale para o que vem de fora: LaTeX de um PDF, do ChatGPT ou de um
 * colega passa a virar fórmula na hora, em vez de exigir abrir o MathLive e
 * redigitar.
 *
 * ## Por que criar o NÓ, e não deixar o Markdown ser reparseado
 *
 * Mesma razão que `useGatilho` documenta para o `//`: texto cru não renderiza.
 * As input rules do `plugin-math` só disparam em digitação real, e colar não é
 * digitação — o `$x^2$` ficaria no texto esperando um round-trip pelo arquivo
 * para virar fórmula. Criar o nó é o que faz o resultado aparecer no ato.
 */

/** O que foi reconhecido no texto colado. */
export interface FormulaColada {
  latex: string
  /** `$$…$$` é fórmula de bloco; `$…$`, inline. */
  bloco: boolean
}

/*
 * O texto colado tem que ser UMA fórmula inteira, e nada além dela.
 *
 * A tentação é varrer o texto atrás de `$…$` em qualquer posição, e ela custa
 * caro: "o curso custa $200 e o livro $35" tem um `$…$` perfeitamente válido no
 * meio, e viraria uma fórmula com "200 e o livro" dentro. Preço em uso alto,
 * ganho baixo — quem cola um parágrafo quer o parágrafo.
 *
 * A regra "é exatamente uma fórmula" cobre os dois casos pedidos sem ambiguidade
 * nenhuma: o botão de copiar da fórmula produz exatamente isso, e quem copia
 * uma equação de fora seleciona a equação, não a frase em volta.
 */
const SO_BLOCO = /^\$\$([\s\S]+?)\$\$$/
const SO_INLINE = /^\$([^$]+?)\$$/

/**
 * O texto colado é uma fórmula? Devolve o LaTeX, ou `null`.
 *
 * Função pura e exportada porque é ela que carrega a decisão — o plugin em
 * volta só aplica. É também o que dá para testar sem um editor de pé.
 */
export function lerFormulaColada(texto: string): FormulaColada | null {
  const limpo = texto.trim()

  const bloco = SO_BLOCO.exec(limpo)
  const latexBloco = bloco?.[1]?.trim()
  if (latexBloco) return { latex: latexBloco, bloco: true }

  const inline = SO_INLINE.exec(limpo)
  const latexInline = inline?.[1]?.trim()
  if (latexInline) return { latex: latexInline, bloco: false }

  return null
}

export const colarFormula = $prose(
  () =>
    new Plugin({
      key: chave,
      props: {
        handlePaste: (view, evento) => {
          const texto = evento.clipboardData?.getData('text/plain') ?? ''
          const formula = lerFormulaColada(texto)
          if (!formula) return false

          const { $from } = view.state.selection

          /*
           * Dentro de código, `$x$` é código. Transformá-lo em fórmula ali
           * seria reescrever o que a pessoa colou — e um bloco de código é o
           * lugar do texto literal por definição.
           */
          if ($from.parent.type.spec.code) return false

          /*
           * Dentro de uma fórmula, o colado é conteúdo dela, não uma segunda
           * fórmula: colar `$\alpha$` no meio de uma integral deve escrever
           * `\alpha` ali, e não aninhar um nó que o schema nem aceita.
           */
          if ($from.parent.type.name === 'math_inline') return false

          const { schema } = view.state
          const tipo = formula.bloco
            ? schema.nodes.math_block
            : schema.nodes.math_inline
          if (!tipo) return false

          /*
           * O bloco guarda o LaTeX num ATRIBUTO e o inline no texto do nó — é
           * assim que o `plugin-math` declara os dois, e é o que cada
           * serializer lê na hora de virar Markdown. Mesma divisão que
           * `EditorMarkdownRico` já faz ao inserir pelo MathLive.
           */
          const no = formula.bloco
            ? tipo.create({ value: formula.latex })
            : tipo.create(null, schema.text(formula.latex))

          view.dispatch(
            view.state.tr.replaceSelectionWith(no, false).scrollIntoView(),
          )
          return true
        },
      },
    }),
)
