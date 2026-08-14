import { useEffect, useRef, type RefObject } from 'react'
import {
  Editor,
  defaultValueCtx,
  editorViewOptionsCtx,
  rootCtx,
} from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { block } from '@milkdown/kit/plugin/block'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { insert } from '@milkdown/kit/utils'
import { math } from '@milkdown/plugin-math'
import {
  desenhoSchema,
  dialetoRemark,
  wikilinkSchema,
} from './editor/dialeto'
import { MenuSimbolos } from './editor/MenuSimbolos'
import { navegarBuracos } from './editor/buracos'
import { sairDaFormula } from './editor/sairDaFormula'
import {
  focoMatematica,
  mathInlineEditavel,
  viewMatematica,
} from './editor/viewMatematica'
import { useAlcaArrasto } from './editor/useAlcaArrasto'
import { useGatilho, type FonteItens } from './editor/useGatilho'
import {
  criarViewCerca,
  criarViewDesenho,
  criarViewWikilink,
  type RenderizarBloco,
  type RenderizarDesenho,
  type SlugExiste,
} from './editor/views'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import '@milkdown/kit/prose/view/style/prosemirror.css'
import 'katex/dist/katex.min.css'
import './editorMarkdown.css'
import type { Inserir } from './EditorMarkdown'

/** Catálogo vazio, para o hook existir mesmo sem símbolos injetados. */
const FONTE_VAZIA: FonteItens = {
  filtrar: () => [],
  montar: () => ({ tipo: 'acao' }),
}

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
  /**
   * O catálogo do gatilho `//`.
   *
   * Injetado como todo o resto: o kernel não sabe o que é uma integral. Sem
   * ele o gatilho some, e escrever LaTeX à mão continua funcionando.
   */
  simbolos?: FonteItens
  /** Catálogo do gatilho `/`, de bloco. */
  blocos?: FonteItens
  /** O slug já tem nota? Decide o traço do wikilink. */
  slugExiste?: SlugExiste
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
  simbolos,
  blocos,
  slugExiste,
}: EditorRicoProps) {
  /*
   * As views entram na configuração do editor, então precisam ser estáveis:
   * recriá-las a cada render remontaria o editor inteiro e apagaria o undo.
   */
  /*
   * `slugExiste` por ref: a lista de notas muda enquanto se escreve, e trocar
   * a view por causa disso remontaria o editor. A view lê o valor atual.
   */
  const existeRef = useRef(slugExiste)
  existeRef.current = slugExiste

  const views = useRef({
    cerca: criarViewCerca(renderizarBloco),
    desenho: criarViewDesenho(renderizarDesenho),
    wikilink: criarViewWikilink((slug) => existeRef.current?.(slug) ?? true),
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

  /*
   * O gatilho precisa do editor para inserir, e o editor precisa do plugin do
   * gatilho para existir. A ref quebra o ciclo: o hook recebe um getter que só
   * é chamado depois, quando alguém escolhe um símbolo.
   */
  const editorRef = useRef<ReturnType<typeof get> | null>(null)

  const gatilhoSimbolos = useGatilho(
    '//',
    simbolos ?? FONTE_VAZIA,
    () => editorRef.current ?? undefined,
  )

  /*
   * `apenasInicioDeLinha` no `/`: um diagrama não entra no meio de uma frase, e
   * sem isso escrever "e/ou" abriria o menu.
   */
  const gatilhoBlocos = useGatilho(
    '/',
    blocos ?? FONTE_VAZIA,
    () => editorRef.current ?? undefined,
    { apenasInicioDeLinha: true },
  )

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
      .use(views.current.wikilink)
      // Depois de `math`: substitui o schema do nó pelo mesmo sem `atom`.
      .use(mathInlineEditavel)
      .use(viewMatematica)
      .use(focoMatematica)
      // Antes de navegarBuracos: dentro da fórmula, Enter sai; Tab anda.
      .use(sairDaFormula)
      .use(views.current.desenho)
      .use(gatilhoSimbolos.plugin)
      .use(gatilhoBlocos.plugin)
      // Depois do gatilho: o Tab do menu tem precedência sobre o Tab que anda
      // pelos buracos, senão escolher um símbolo pularia para o buraco errado.
      .use(navegarBuracos)
      .use(block),
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

  editorRef.current = get()

  const alca = useAlcaArrasto(() => editorRef.current ?? undefined)

  return (
    <>
      {/*
        A alça vive fora do editor e é posicionada sobre o bloco sob o mouse.
        `aria-hidden` porque reordenar por teclado não passa por aqui — quem
        usa teclado move o texto, não a alça.
      */}
      <div ref={alca} className="alca-bloco" aria-hidden>
        <span />
      </div>
      <Milkdown />
      {simbolos && (
        <MenuSimbolos
          estado={gatilhoSimbolos.estado}
          itens={gatilhoSimbolos.itens}
          indice={gatilhoSimbolos.indice}
          onEscolher={gatilhoSimbolos.escolher}
        />
      )}
      {blocos && (
        <MenuSimbolos
          estado={gatilhoBlocos.estado}
          itens={gatilhoBlocos.itens}
          indice={gatilhoBlocos.indice}
          onEscolher={gatilhoBlocos.escolher}
        />
      )}
    </>
  )
}
