import { useRef } from 'react'
import { Editor, defaultValueCtx, editorViewOptionsCtx, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import '@milkdown/kit/prose/view/style/prosemirror.css'
import './editorMarkdown.css'

interface EditorRicoProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
}

/**
 * Milkdown por trás de `EditorMarkdown`. Só chega aqui no desktop, por `lazy`.
 *
 * **Por que Milkdown e não TipTap** (spec 14/08, seção 4): é um wrapper de
 * ProseMirror cujo alvo de serialização é Markdown, via `remark`. TipTap tem
 * ecossistema maior e documentação melhor, mas serializa JSON — e com os cinco
 * nós customizados que este editor vai ganhar (fórmula, plot, mermaid,
 * desenho), manter parse e serialize dos dois lados seria custo permanente e
 * proporcional. A fonte de verdade ser Markdown é o que decide.
 *
 * É a decisão mais arriscada da stack, e a mais fácil de reverter: as regras de
 * parsing moram em `features/notas/markdown.ts`, que não importa nada daqui.
 */
export default function EditorMarkdownRico(props: EditorRicoProps) {
  return (
    <MilkdownProvider>
      <Interno {...props} />
    </MilkdownProvider>
  )
}

function Interno({ value, onChange, placeholder }: EditorRicoProps) {
  /*
   * `onChange` por ref, e não na dependência do editor.
   *
   * O Milkdown recria o editor inteiro quando a config muda, o que apagaria o
   * histórico de undo e a posição do cursor a cada render do pai. A ref mantém
   * o callback sempre atual sem entrar na identidade da configuração.
   */
  const aoMudar = useRef(onChange)
  aoMudar.current = onChange

  /*
   * `value` também sai da dependência: o editor é NÃO CONTROLADO depois de
   * montar. Empurrar o valor de volta a cada tecla faria o documento ser
   * reconstruído enquanto se digita — cursor no começo, acento quebrado, undo
   * perdido. Quem manda no texto durante a edição é o editor; quem manda no
   * texto entre montagens é a prop.
   */
  const inicial = useRef(value)

  useEditor((raiz) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, raiz)
        ctx.set(defaultValueCtx, inicial.current)
        ctx.update(editorViewOptionsCtx, (anterior) => ({
          ...anterior,
          attributes: {
            class: 'editor-markdown',
            ...(placeholder ? { 'data-placeholder': placeholder } : {}),
          },
        }))
        ctx.get(listenerCtx).markdownUpdated((_, markdown, anterior) => {
          if (markdown !== anterior) aoMudar.current(markdown)
        })
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener),
  )

  return <Milkdown />
}
