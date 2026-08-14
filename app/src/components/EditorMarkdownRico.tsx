import { useEffect, useRef, type RefObject } from 'react'
import {
  Editor,
  defaultValueCtx,
  editorViewOptionsCtx,
  rootCtx,
} from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { insert } from '@milkdown/kit/utils'
import { math } from '@milkdown/plugin-math'
import {
  desenhoSchema,
  dialetoRemark,
  wikilinkSchema,
} from './editor/dialeto'
import {
  criarViewCerca,
  criarViewDesenho,
  viewWikilink,
  type RenderizarBloco,
  type RenderizarDesenho,
} from './editor/views'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import '@milkdown/kit/prose/view/style/prosemirror.css'
import 'katex/dist/katex.min.css'
import './editorMarkdown.css'
import type { Inserir } from './EditorMarkdown'

interface EditorRicoProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  /** Preenchida com o jeito deste editor de inserir Markdown no cursor. */
  inserirRef: RefObject<Inserir | null>
  /**
   * O que cada cerca vira, e como desenhar um desenho.
   *
   * Injetados porque o kernel não conhece nota. A feature passa os MESMOS
   * componentes que a leitura usa, então não há duas versões da mesma regra.
   */
  renderizarBloco: RenderizarBloco
  renderizarDesenho: RenderizarDesenho
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
 * `plugin-math` é a contrapartida disso já valendo: ele monta em cima de
 * `remark-math`, então `$x^2$` vira nó renderizado sem parser próprio — que é
 * exatamente o argumento que escolheu o Milkdown.
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

function Interno({
  value,
  onChange,
  placeholder,
  inserirRef,
  renderizarBloco,
  renderizarDesenho,
}: EditorRicoProps) {
  /*
   * As views entram na configuração do editor, então precisam ser estáveis:
   * recriá-las a cada render remontaria o editor inteiro e apagaria o undo.
   */
  const views = useRef({
    cerca: criarViewCerca(renderizarBloco),
    desenho: criarViewDesenho(renderizarDesenho),
  })
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

  const { get } = useEditor((raiz) =>
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
      .use(math)
      .use(history)
      .use(listener)
      // O dialeto vem depois dos presets: ele reescreve nós de texto que o
      // commonmark já produziu.
      .use(dialetoRemark)
      .use(wikilinkSchema)
      .use(desenhoSchema)
      .use(views.current.cerca)
      .use(viewWikilink)
      .use(views.current.desenho),
  )

  useEffect(() => {
    const alvo = inserirRef
    alvo.current = (markdown, inline) => {
      get()?.action(insert(markdown, inline))
    }
    return () => {
      alvo.current = null
    }
  }, [get, inserirRef])

  return <Milkdown />
}
