import katex from 'katex'
import { $prose, $view } from '@milkdown/kit/utils'
import { mathInlineSchema } from '@milkdown/plugin-math'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import type { NodeView } from '@milkdown/kit/prose/view'

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

  dom.append(previa, fonte)

  function desenhar(latex: string) {
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
    // O KaTeX reescreve a prévia a cada render; sem isto o ProseMirror trataria
    // cada render como edição do documento e entraria em laço.
    ignoreMutation: (mutacao) => previa.contains(mutacao.target),
  }
  return view
})
