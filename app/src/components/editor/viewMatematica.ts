import katex from 'katex'
import { $view } from '@milkdown/kit/utils'
import { mathInlineSchema } from '@milkdown/plugin-math'
import { TextSelection } from '@milkdown/kit/prose/state'
import type { NodeView } from '@milkdown/kit/prose/view'

/**
 * Fórmula renderizada **enquanto se escreve**, e editável depois de
 * renderizada.
 *
 * ## O problema que isto resolve
 *
 * O `plugin-math` já converte `$x^2$` em nó renderizado quando se digita o `$`
 * final — mas o nó nasce `atom: true`. Atom, no ProseMirror, significa que o
 * cursor não entra: a fórmula vira uma imagem que não se corrige.
 *
 * Na prática isso deixava duas saídas ruins: ou o `//` inseria texto cru, que
 * nunca renderiza, ou inseria o nó e você não conseguia preencher os `{}`.
 *
 * ## Como funciona
 *
 * A view tem dois estados sobre o mesmo nó:
 *
 * - **parada** — o KaTeX renderizado, que é o que se lê
 * - **em edição** — um campo com o LaTeX cru, que é o que se corrige
 *
 * Clicar entra em edição; `Escape`, `Enter` ou sair fecham. O render acompanha
 * o que se digita, então a fórmula se monta na frente de quem escreve — que é
 * o pedido original.
 *
 * `stopEvent` é o que faz o campo funcionar: sem ele o ProseMirror captura as
 * teclas e nada é digitado dentro da fórmula.
 */
export const viewMatematica = $view(
  mathInlineSchema.node,
  () => (node, view, getPos) => {
    const dom = document.createElement('span')
    dom.className = 'formula-viva'

    const renderizado = document.createElement('span')
    renderizado.className = 'formula-viva-render'

    const campo = document.createElement('input')
    campo.className = 'formula-viva-fonte'
    campo.spellcheck = false

    dom.append(renderizado, campo)

    let latex = node.textContent
    let editando = false
    /*
     * O nó ATUAL, não o da criação da view.
     *
     * `node` é capturado uma vez; depois de qualquer edição o tamanho dele fica
     * desatualizado, e usar `node.nodeSize` para calcular o intervalo da
     * substituição apagaria o pedaço errado do documento.
     */
    let atual = node

    function desenhar() {
      /*
       * `throwOnError: false` porque LaTeX pela metade é o estado NORMAL de
       * quem está digitando. Derrubar o editor por causa de `\frac{` seria
       * trocar um erro visível e local por uma tela em branco.
       */
      katex.render(latex || '\\;', renderizado, {
        throwOnError: false,
        trust: false,
        displayMode: false,
      })
      // Fórmula vazia não some: sem alvo não há como clicar para editar.
      dom.dataset.vazia = latex.trim() === '' ? 'sim' : 'nao'
    }

    function abrir() {
      if (editando) return
      editando = true
      dom.dataset.editando = 'sim'
      campo.value = latex
      campo.focus()
      /*
       * O cursor vai para o primeiro buraco `{}`, quando há. É o que faz
       * `//int` seguir direto para o limite inferior em vez de parar no fim de
       * `\int_{}^{}` — sem isso, o atalho insere e abandona.
       */
      const buraco = latex.indexOf('{}')
      if (buraco === -1) campo.setSelectionRange(latex.length, latex.length)
      else campo.setSelectionRange(buraco + 1, buraco + 1)
    }

    function fechar(moverCursor: boolean) {
      if (!editando) return
      editando = false
      dom.dataset.editando = 'nao'

      const posicao = getPos()
      if (posicao === undefined) return

      const transacao = view.state.tr.replaceWith(
        posicao + 1,
        posicao + atual.nodeSize - 1,
        latex === '' ? [] : view.state.schema.text(latex),
      )
      if (moverCursor) {
        /*
         * O cursor vai para depois da fórmula, e o tamanho é calculado sobre o
         * documento JÁ alterado — o texto novo pode ter comprimento diferente
         * do antigo.
         */
        const depois = transacao.doc.resolve(posicao).nodeAfter
        transacao.setSelection(
          TextSelection.create(
            transacao.doc,
            posicao + (depois?.nodeSize ?? atual.nodeSize),
          ),
        )
      }
      view.dispatch(transacao)
      if (moverCursor) view.focus()
    }

    campo.addEventListener('input', () => {
      latex = campo.value
      desenhar()
    })

    campo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' || evento.key === 'Enter') {
        evento.preventDefault()
        fechar(true)
      }
      /*
       * `Tab` anda pelos buracos DENTRO da fórmula, como no texto comum. É a
       * mesma promessa do gatilho `//`, e ela precisa valer aqui também —
       * senão preencher `\int_{}^{}` volta a ser trabalho de mouse.
       */
      if (evento.key === 'Tab') {
        const cursor = campo.selectionStart ?? 0
        const proximo = latex.indexOf('{}', cursor)
        if (proximo !== -1) {
          evento.preventDefault()
          campo.setSelectionRange(proximo + 1, proximo + 1)
        }
      }
    })

    campo.addEventListener('blur', () => fechar(false))
    renderizado.addEventListener('mousedown', (evento) => {
      evento.preventDefault()
      abrir()
    })

    desenhar()

    const nodeView: NodeView = {
      dom,
      update: (novo) => {
        if (novo.type.name !== 'math_inline') return false
        // Enquanto se digita no campo, quem manda é o campo: aceitar o texto do
        // documento aqui apagaria o que está sendo escrito.
        atual = novo
        if (editando) return true
        latex = novo.textContent
        desenhar()
        return true
      },
      selectNode: abrir,
      deselectNode: () => fechar(false),
      // Enquanto edita, as teclas são do campo, não do editor.
      stopEvent: () => editando,
      // O KaTeX reescreve o DOM inteiro a cada render; sem isto o ProseMirror
      // trataria cada render como edição do documento.
      ignoreMutation: () => true,
      destroy: () => fechar(false),
    }
    return nodeView
  },
)
