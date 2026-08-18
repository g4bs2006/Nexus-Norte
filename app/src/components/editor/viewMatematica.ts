import katex from 'katex'
import { $prose, $view } from '@milkdown/kit/utils'
import { mathInlineSchema } from '@milkdown/plugin-math'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import type { NodeView } from '@milkdown/kit/prose/view'
import type { Node } from '@milkdown/kit/prose/model'
import type { SerializerState } from '@milkdown/kit/transformer'
import { ICONE_COPIAR, ICONE_OK } from './icones'

/**
 * Fórmula que se escreve por dentro, vendo o resultado.
 *
 * ## O caminho até aqui, porque as tentativas anteriores explicam o desenho
 *
 * O `plugin-math` entrega `math_inline` como `atom: true`. Atom, no
 * ProseMirror, quer dizer que o cursor NÃO entra — a fórmula vira uma imagem.
 * Duas consequências, ambas sentidas em uso:
 *
 * 1. inserir pelo `//` deixava o nó selecionado, e nesse estado **qualquer
 *    tecla substitui o nó** — parecia que apagava;
 * 2. um campo `<input>` por fora para contornar isso criava briga de foco com
 *    o editor, e ainda impedia usar `//` DENTRO da fórmula, porque o gatilho
 *    vive no ProseMirror e o `<input>` não.
 *
 * A cura é parar de contornar: o nó deixa de ser atom. O miolo passa a ser
 * texto comum do editor, e com isso tudo que já existe vale lá dentro — o
 * gatilho `//`, o `Tab` entre buracos, o undo, a seleção. Nada disso precisou
 * ser reimplementado.
 *
 * ## O que a view faz, então
 *
 * Só desenha: mostra o KaTeX acima da fonte. Com o cursor dentro, a fonte
 * aparece e o render acompanha o que se digita; com o cursor fora, sobra o
 * render. Quem decide "o cursor está dentro" é a decoração abaixo, porque
 * `:focus-within` não serve — o editor inteiro é um contenteditable só, e o
 * foco do DOM nunca está no `span` da fórmula.
 */

/**
 * O mesmo nó do `plugin-math`, sem `atom`.
 *
 * É a mudança que faz o resto funcionar. `extendSchema` preserva parse,
 * serialize e input rule originais — só o comportamento de seleção muda.
 */
export const mathInlineEditavel = mathInlineSchema.extendSchema(
  (anterior) => (ctx) => ({
    ...anterior(ctx),
    atom: false,
    selectable: false,
    /*
     * Fórmula vazia NÃO vira `$$` no Markdown.
     *
     * O serializer original escreve `addNode('inlineMath', …, textContent)`
     * sem olhar o conteúdo, e para um nó vazio isso produz `$$` — que no
     * reparse não é fórmula nenhuma: medido, `antes $$ depois` volta como um
     * único nó de TEXTO. Ou seja, a fórmula não só se perdia como deixava
     * dois cifrões soltos no meio da frase.
     *
     * O nó não é mais `atom` (é o que esta mesma extensão faz acima), então
     * dá para apagar o miolo de uma fórmula caractere a caractere e parar
     * com ela vazia — basta então esperar o debounce do autosave para gravar
     * o lixo. Emitir nada é a resposta certa também em intenção: uma fórmula
     * sem conteúdo não é conteúdo, e some sozinha na próxima abertura em vez
     * de virar texto que o autor não escreveu.
     *
     * "Sem conteúdo" inclui só chaves: a fórmula em branco do `//` nasce como
     * `{}` (é o buraco onde o cursor pousa — ver `latex.ts`), então abrir uma
     * e desistir deixaria `${}$` gravado. Chave sem nada dentro é grupo vazio
     * em LaTeX: não desenha nada, e portanto não é fórmula.
     */
    toMarkdown: {
      match: (no: Node) => no.type.name === 'math_inline',
      runner: (estado: SerializerState, no: Node) => {
        const latex = no.textContent
        if (latex.replace(/[{}\s]/g, '') === '') return
        estado.addNode('inlineMath', undefined, latex)
      },
    },
  }),
)

const chaveFoco = new PluginKey('formula-em-foco')

/**
 * Marca a fórmula que contém o cursor.
 *
 * Existe porque CSS não alcança essa informação: o editor é um contenteditable
 * único, então `:focus-within` no `span` da fórmula nunca dispara. A decoração
 * é como o ProseMirror expõe "onde está a seleção" para a folha de estilo.
 */
export const focoMatematica = $prose(
  () =>
    new Plugin({
      key: chaveFoco,
      props: {
        decorations: (estado) => {
          const { $from } = estado.selection
          for (let nivel = $from.depth; nivel > 0; nivel -= 1) {
            const no = $from.node(nivel)
            if (no.type.name !== 'math_inline') continue
            const posicao = $from.before(nivel)
            return DecorationSet.create(estado.doc, [
              Decoration.node(posicao, posicao + no.nodeSize, {
                class: 'formula-editando',
              }),
            ])
          }
          return DecorationSet.empty
        },
      },
    }),
)

/*
 * A view aponta para o nó ORIGINAL, e não para o estendido.
 *
 * `extendSchema` na versão de `@milkdown/utils` que o plugin-math carrega
 * devolve um `MilkdownPlugin` sem `.node` — mas isso não importa: o id do nó
 * continua sendo `math_inline`, e é ele que o `$view` precisa. O estendido
 * troca o schema; este aponta para o mesmo nó.
 */
export const viewMatematica = $view(mathInlineSchema.node, () => (node) => {
  const dom = document.createElement('span')
  dom.className = 'formula-viva'

  const previa = document.createElement('span')
  previa.className = 'formula-viva-render'
  previa.contentEditable = 'false'

  const fonte = document.createElement('span')
  fonte.className = 'formula-viva-fonte'

  /*
   * Copiar a fórmula precisa de um BOTÃO, e não do `Ctrl+C` de sempre.
   *
   * O nó é `selectable: false` (ver a extensão acima) — é o que permite escrever
   * dentro dele com o `//` e o `Tab`, e o que custou duas tentativas descobrir.
   * O preço é que não existe "clicar na fórmula e copiar": só arrastar uma
   * seleção de texto por cima, e a prévia do KaTeX é `contentEditable="false"`,
   * então o navegador nem estende a seleção por ali com naturalidade.
   *
   * O botão contorna isso sem desfazer a troca: copia o `$latex$`, que é a
   * mesma forma que o Markdown salvo tem — e que `colarFormula` sabe reconhecer
   * de volta, venha do próprio arquivo ou de fora.
   */
  const copiar = document.createElement('button')
  copiar.type = 'button'
  copiar.className = 'formula-copiar'
  copiar.title = 'Copiar fórmula'
  copiar.setAttribute('aria-label', 'Copiar fórmula')
  copiar.contentEditable = 'false'
  copiar.innerHTML = ICONE_COPIAR
  /* Sem isto o clique move o cursor para fora da fórmula que se quer copiar. */
  copiar.addEventListener('mousedown', (evento) => evento.preventDefault())

  dom.append(previa, fonte, copiar)

  /** O LaTeX de AGORA: `node` é o da montagem e envelhece a cada tecla. */
  let latexAtual = node.textContent
  let voltarIcone: ReturnType<typeof setTimeout> | null = null

  copiar.addEventListener('click', () => {
    void navigator.clipboard.writeText(`$${latexAtual}$`).then(() => {
      copiar.innerHTML = ICONE_OK
      copiar.dataset.copiado = 'sim'
      if (voltarIcone) clearTimeout(voltarIcone)
      voltarIcone = setTimeout(() => {
        copiar.innerHTML = ICONE_COPIAR
        delete copiar.dataset.copiado
      }, 1400)
    })
  })

  function desenhar(latex: string) {
    latexAtual = latex

    /*
     * `throwOnError: false` porque LaTeX pela metade é o estado NORMAL de quem
     * está digitando — `\frac{` existe por um instante em toda fração escrita.
     * Derrubar o editor por isso trocaria um erro local por uma tela branca.
     */
    katex.render(latex || '\\;', previa, {
      throwOnError: false,
      trust: false,
      displayMode: false,
    })
    // Fórmula vazia precisa de alvo: sem largura não há onde clicar de volta.
    dom.dataset.vazia = latex.trim() === '' ? 'sim' : 'nao'
  }

  desenhar(node.textContent)

  const view: NodeView = {
    dom,
    /*
     * O miolo é editado pelo próprio ProseMirror. É o que dispensa `stopEvent`,
     * dispensa gerenciar foco, e faz `//` e `Tab` valerem dentro da fórmula
     * sem uma linha a mais.
     */
    contentDOM: fonte,
    update: (novo) => {
      if (novo.type.name !== 'math_inline') return false
      desenhar(novo.textContent)
      return true
    },
    /*
     * O KaTeX reescreve a prévia a cada render; sem isto o ProseMirror trataria
     * cada render como edição do documento e entraria em laço.
     *
     * A regra é por `contentDOM`, e não por "está na prévia": `data-vazia` muda
     * no elemento RAIZ, que não está dentro da prévia e também não é edição.
     */
    ignoreMutation: (mutacao) => !fonte.contains(mutacao.target),
    /* O timer sobreviveria à fórmula e escreveria num botão já removido. */
    destroy: () => {
      if (voltarIcone) clearTimeout(voltarIcone)
    },
  }
  return view
})
