import { $inputRule } from '@milkdown/kit/utils'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import type { EditorState } from '@milkdown/kit/prose/state'

/**
 * Substituição tipográfica enquanto se digita: `->` vira `→`.
 *
 * É o que o Notion faz, e é o mecanismo mais barato do ProseMirror — uma
 * expressão que casa no texto recém-digitado e troca por outro texto. Não cria
 * nó, não monta view, não conhece biblioteca nenhuma. Depois dos blocos
 * visuais arquivados, é deliberado escolher o mecanismo mais simples que
 * existe.
 *
 * ## A guarda que domina este arquivo
 *
 * As mesmas sequências aparecem onde substituir seria destruir:
 *
 * - `\lim_{x \to 0}` — dentro de fórmula, `->` virando `→` quebra o LaTeX
 * - `` `x => y` `` — dentro de código inline, é sintaxe
 *
 * O `prosemirror-inputrules` já pula nós com `code: true`, o que cobre a cerca.
 * Mas **não** cobre nenhum dos dois casos acima: `math_inline` não é code, e
 * código inline é uma MARCA sobre texto num parágrafo comum, não um nó. Sem
 * `protegido`, escrever um limite corromperia a fórmula em silêncio.
 */

/** Aqui não se substitui: fórmula, ou texto marcado como código. */
function protegido(estado: EditorState, posicao: number): boolean {
  const resolvida = estado.doc.resolve(posicao)

  for (let nivel = resolvida.depth; nivel > 0; nivel -= 1) {
    const nome = resolvida.node(nivel).type.name
    if (/math/i.test(nome)) return true
  }

  return resolvida
    .marks()
    .some((marca) => /code/i.test(marca.type.name))
}

/**
 * Uma substituição simples de texto, desligada onde não deve valer.
 *
 * Devolver `null` do handler é como o ProseMirror entende "não se aplique
 * aqui" — a regra é ignorada e o que foi digitado segue intacto.
 */
function trocar(padrao: RegExp, por: string) {
  return $inputRule(
    () =>
      new InputRule(padrao, (estado, _casamento, de, ate) => {
        if (protegido(estado, de)) return null
        return estado.tr.insertText(por, de, ate)
      }),
  )
}

/*
 * A ordem abaixo é a ordem de avaliação, e ela importa: o ProseMirror aplica a
 * primeira regra que casa. `<->` vem antes de `<-` porque o segundo casaria no
 * meio do primeiro, deixando o `>` órfão.
 */

/** `<->` → `↔` */
export const setaDupla = trocar(/<->$/, '↔')

/** `->` → `→` */
export const setaDireita = trocar(/->$/, '→')

/** `<-` → `←` */
export const setaEsquerda = trocar(/<-$/, '←')

/** `=>` → `⇒`. Em matemática é implicação, não seta comum. */
export const implica = trocar(/=>$/, '⇒')

/** `...` → `…`, que ocupa uma posição em vez de três. */
export const reticencias = trocar(/\.\.\.$/, '…')

/*
 * **`--` → travessão ficou de fora, de propósito.**
 *
 * O Notion faz, mas o Notion não é Markdown. Aqui `---` é linha horizontal, e
 * uma regra em `--` dispararia no segundo hífen — antes de o terceiro ser
 * digitado —, tornando impossível escrever um divisor à mão. Trocar uma
 * construção de Markdown por um caractere bonito é mau negócio quando Markdown
 * é a fonte de verdade.
 *
 * Quem quiser travessão tem o `/` com "Divisor" para a linha, e o teclado para
 * o `—`.
 */

/** Todas as regras, na ordem de avaliação. */
export const tipografia = [
  setaDupla,
  setaDireita,
  setaEsquerda,
  implica,
  reticencias,
]
