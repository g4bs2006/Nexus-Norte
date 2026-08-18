import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  rootCtx,
} from '@milkdown/kit/core'
import { toggleMark } from '@milkdown/kit/prose/commands'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { block } from '@milkdown/kit/plugin/block'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { insert } from '@milkdown/kit/utils'
import { katexOptionsCtx, math } from '@milkdown/plugin-math'
import {
  desenhoSchema,
  destaqueSchema,
  dialetoRemark,
  topicoSchema,
  wikilinkSchema,
} from './editor/dialeto'
import { BarraSelecao } from './editor/BarraSelecao'
import {
  criarBarraSelecao,
  type AncoraSelecao,
} from './editor/pluginSelecao'
import { aplicarMarca, type MarcaEscrita } from './editor/comandos'
import { MenuSimbolos, type ItemMenu } from './editor/MenuSimbolos'
import { MenuReferencias } from './editor/MenuReferencias'
import { navegarBuracos } from './editor/buracos'
import { escreverTopico, escreverWikilink } from './editor/gramatica'
import { colarFormula } from './editor/colarFormula'
import { realceCodigo } from './editor/realce'
import { tabNaoEscapa } from './editor/tabNaoEscapa'
import { tipografia } from './editor/tipografia'
import { criarPluginImagens, type EnviarImagem } from './editor/imagens'
import { sairDaFormula } from './editor/sairDaFormula'
import { multiplicacaoFormula } from './editor/formatarFormula'
import {
  criarEditarFormula,
  type AoEditarFormula,
} from './editor/editarFormula'
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
import type { Inserir, InserirFormula } from './EditorMarkdown'

import type { Referencia } from './SeletorReferencia'

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
  inserirFormulaRef: RefObject<InserirFormula | null>
  aoEditarFormula?: AoEditarFormula
  renderizarBloco: RenderizarBloco
  renderizarDesenho: RenderizarDesenho
  simbolos?: FonteItens
  blocos?: FonteItens
  slugExiste?: SlugExiste
  enviarImagem?: EnviarImagem
  buscarReferencias?: (termo: string) => Promise<Referencia[]>
  /**
   * Os tópicos que o `#` oferece, já no formato do menu.
   *
   * Assíncrona porque o vocabulário mora no banco, e não numa constante como o
   * catálogo de símbolos.
   */
  buscarTopicos?: (termo: string) => Promise<ItemMenu[]>
  /**
   * Renderiza sem permitir escrita — é assim que a nota aparece no celular.
   *
   * Antes o celular tinha um renderizador PRÓPRIO (`ConteudoNota`), para não
   * baixar o ProseMirror. Só que ele não renderizava Markdown: era
   * `whitespace-pre-wrap` sobre o texto cru, então lista, título e negrito
   * apareciam literais (`- item`, `## Título`, `**forte**`), e a nota lida não
   * era a nota escrita. Corrigir aquilo exigiria um segundo renderizador de
   * Markdown completo — e um segundo renderizador é a mesma armadilha das duas
   * cópias da gramática do dialeto: cada construção nova (fórmula, desenho,
   * wikilink, tópico, cerca, tabela) passaria a precisar de duas
   * implementações, que divergem em silêncio.
   *
   * (Eram 143 kB antes do realce de sintaxe: `lowlight` mais as 17 gramáticas
   * do catálogo de `linguagens.ts` custam ~32 kB gz. É o preço de o bloco de
   * código ser lido colorido no celular, e não só escrito colorido no desktop.)
   *
   * Montar ESTE editor, travado, custa 175 kB gz uma vez — pré-cacheados pelo
   * service worker — e faz o que se lê ser, por construção, o que se edita. O
   * MathLive (212 kB gz) e o Excalidraw (321 kB gz) continuam fora: são `lazy`
   * à parte e só carregam ao editar fórmula ou desenho.
   *
   * A decisão da spec de 14/08 — "no celular não se edita" — segue de pé, e por
   * isso é `editable: false` e não uma edição mobile: o que ela rejeitava era
   * manter DOIS caminhos de inserção, e travado não há inserção nenhuma.
   */
  somenteLeitura?: boolean
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
  inserirFormulaRef,
  aoEditarFormula,
  renderizarBloco,
  renderizarDesenho,
  simbolos,
  blocos,
  slugExiste,
  enviarImagem,
  buscarReferencias,
  buscarTopicos,
  somenteLeitura = false,
}: EditorRicoProps) {
  /*
   * Lido uma vez, como `inicial`: o Milkdown remonta o editor inteiro a cada
   * mudança de configuração, e alternar isto em uso perderia cursor e histórico.
   * Não há caminho na UI que alterne — o modo vem da largura da tela, e mudar de
   * largura já remonta a página.
   */
  const travado = useRef(somenteLeitura)
  const buscarRef = useRef(buscarReferencias)
  buscarRef.current = buscarReferencias

  const topicosRef = useRef(buscarTopicos)
  topicosRef.current = buscarTopicos

  const existeRef = useRef(slugExiste)
  existeRef.current = slugExiste

  const views = useRef({
    cerca: criarViewCerca(renderizarBloco, !travado.current),
    desenho: criarViewDesenho(renderizarDesenho),
    wikilink: criarViewWikilink((slug) => existeRef.current?.(slug) ?? true),
  })
  const aoMudar = useRef(onChange)
  aoMudar.current = onChange

  const inicial = useRef(value)
  const editorRef = useRef<ReturnType<typeof get> | null>(null)

  const [ancoraBarra, setAncoraBarra] = useState<AncoraSelecao | null>(null)
  const barra = useRef(criarBarraSelecao(setAncoraBarra))

  const pluginImagens = useRef(
    enviarImagem ? criarPluginImagens(enviarImagem) : null,
  )

  const editarFormulaRef = useRef(aoEditarFormula)
  editarFormulaRef.current = aoEditarFormula
  const pluginEditarFormula = useRef(
    criarEditarFormula((formula) => editarFormulaRef.current?.(formula)),
  )

  const gatilhoSimbolos = useGatilho(
    '//',
    simbolos ?? FONTE_VAZIA,
    () => editorRef.current ?? undefined,
  )

  /*
   * `apenasInicioDeLinha` é o que `gatilhoMenu` sempre documentou para o `/` de
   * bloco, e o que ninguém estava passando: sem ele o menu completo abria depois
   * de qualquer espaço, no meio de qualquer frase.
   *
   * `excluir: '//'` resolve a sobreposição com o menu de símbolos. Digitar `//`
   * satisfaz os dois padrões ao mesmo tempo, e até aqui os dois menus não
   * apareciam juntos só porque `filtrarEscrita('/alpha')` devolve lista vazia —
   * correção por coincidência, que a primeira entrada nova do catálogo com uma
   * barra no nome desfaria.
   */
  const gatilhoBlocos = useGatilho(
    '/',
    blocos ?? FONTE_VAZIA,
    () => editorRef.current ?? undefined,
    { apenasInicioDeLinha: true, excluir: '//' },
  )

  const [referenciasEncontradas, setReferenciasEncontradas] = useState<Referencia[]>([])

  const fonteReferencias = useMemo<FonteItens>(
    () => ({
      filtrar: () =>
        referenciasEncontradas.map((ref) => ({
          chave: ref.slug,
          rotulo: ref.titulo,
          amostra: ref.contexto,
          id: ref.slug,
          nome: ref.titulo,
          detalhe: ref.contexto,
          sinonimos: ref.slug,
        })),
      /*
       * `markdown`, e não `inserir`: a menção precisa virar NÓ. Como texto ela
       * era escapada para `\[\[slug]]` ao salvar e sumia de `links_nota` — ver
       * o comentário de `ResultadoEscolha`.
       */
      montar: (item: { chave: string }) => ({
        tipo: 'markdown',
        texto: escreverWikilink(item.chave),
      }),
    }),
    [referenciasEncontradas],
  )

  const gatilhoReferencias = useGatilho(
    '[[',
    fonteReferencias,
    () => editorRef.current ?? undefined,
  )

  const [topicosEncontrados, setTopicosEncontrados] = useState<ItemMenu[]>([])

  /*
   * O kernel não sabe o que é um tópico: recebe itens já prontos de quem
   * pesquisou, e só escreve a marcação. Quem decide o slug e o que fazer com um
   * tópico ainda inexistente é `features/notas/topicos.ts` — mesma divisão de
   * `fonteSimbolos`, onde a chave é a ponte e a regra fica na feature.
   */
  const fonteTopicos = useMemo<FonteItens>(
    () => ({
      filtrar: () => topicosEncontrados,
      montar: (item: { chave: string }) => ({
        tipo: 'markdown',
        texto: escreverTopico(item.chave),
      }),
    }),
    [topicosEncontrados],
  )

  const gatilhoTopicos = useGatilho(
    '#',
    fonteTopicos,
    () => editorRef.current ?? undefined,
    /*
     * `apenasInicioDeLinha` NÃO entra aqui: tópico se marca no meio da frase, e
     * é justamente no começo da linha que `#` é heading. O `ler` do gatilho já
     * exige começo de bloco ou espaço antes, que é a mesma fronteira da
     * `RE_TOPICO` — e o heading é `# ` com espaço, que nunca casa porque o
     * termo teria de começar por espaço.
     */
  )

  useEffect(() => {
    if (!gatilhoTopicos.estado || !topicosRef.current) return
    let cancelado = false
    void topicosRef.current(gatilhoTopicos.estado.termo).then((achados) => {
      if (!cancelado) setTopicosEncontrados(achados ?? [])
    })
    return () => {
      cancelado = true
    }
  }, [gatilhoTopicos.estado?.termo])

  useEffect(() => {
    if (!gatilhoReferencias.estado || !buscarRef.current) return
    let cancelado = false
    void buscarRef.current(gatilhoReferencias.estado.termo).then((achados) => {
      if (!cancelado) setReferenciasEncontradas(achados ?? [])
    })
    return () => {
      cancelado = true
    }
  }, [gatilhoReferencias.estado?.termo])

  const { get } = useEditor((raiz) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, raiz)
        ctx.set(defaultValueCtx, inicial.current)
        ctx.update(editorViewOptionsCtx, (anterior) => ({
          ...anterior,
          /*
           * `editable` é o que trava a escrita no celular. O ProseMirror deixa
           * de aceitar entrada, então o teclado virtual não abre e nenhuma
           * input rule dispara — mas o documento continua sendo o mesmo, com as
           * mesmas node views: a fórmula desenha, o desenho aparece, o wikilink
           * é clicável.
           */
          editable: () => !travado.current,
          attributes: {
            class: 'editor-markdown',
            /* Sem convite a escrever onde não se escreve. */
            ...(placeholder && !travado.current
              ? { 'data-placeholder': placeholder }
              : {}),
            ...(travado.current ? { 'data-somente-leitura': 'sim' } : {}),
          },
        }))
        ctx.get(listenerCtx).markdownUpdated((_, markdown, anterior) => {
          if (markdown !== anterior) aoMudar.current(markdown)
        })
        /*
         * `math_inline` ignora isto (view própria em `viewMatematica.ts`, com
         * `displayMode: false` fixo) — só o `math_block` (`$$...$$`) lê este
         * ctx, e sem ele o KaTeX assume `displayMode: false` por padrão mesmo
         * dentro de um bloco. Resultado sentido em uso: a fórmula de bloco
         * ficava do mesmo tamanho da inline enquanto se editava, e só virava
         * "de bloco" (maior, centralizada) depois de salva — ver `Formula.tsx`,
         * que já passa `displayMode: bloco` na leitura.
         */
        ctx.set(katexOptionsCtx.key, {
          throwOnError: false,
          trust: false,
          displayMode: true,
        })
      })
      /* ---- o que desenha a nota: vale nos dois modos ---------------------- */
      .use(commonmark)
      .use(gfm)
      .use(math)
      .use(listener)
      // O dialeto vem depois dos presets: ele reescreve nós de texto que o
      // commonmark já produziu.
      .use(dialetoRemark)
      .use(wikilinkSchema)
      .use(topicoSchema)
      .use(desenhoSchema)
      .use(views.current.cerca)
      /*
       * Nos DOIS modos: realce é o que a nota mostra, não o que ela aceita
       * escrever. Tirá-lo no celular faria ler e escrever divergirem — a mesma
       * razão que trouxe a leitura para dentro deste editor.
       */
      .use(realceCodigo)
      .use(views.current.wikilink)
      // Depois de `math`: substitui o schema do nó pelo mesmo sem `atom`.
      .use(mathInlineEditavel)
      .use(viewMatematica)
      .use(destaqueSchema)
      .use(views.current.desenho)
      /* ---- o que só serve escrevendo ------------------------------------- */
      /*
       * Travado, estes saem — e não por economia, por correção. A escrita para,
       * mas SELECIONAR e passar o mouse continuam possíveis: sem tirá-los, a
       * barra de formatação apareceria ao selecionar um trecho que não se pode
       * formatar, a alça de arrasto pediria para reordenar o que não se move, e
       * o duplo clique numa fórmula abriria o MathLive — 212 kB baixados para
       * um editor que não pode salvar.
       *
       * As input rules e os atalhos de teclado seriam inertes de qualquer jeito
       * (não há digitação), mas ficam de fora pelo mesmo motivo de clareza: o
       * que não pode agir não é registrado.
       */
      .use(travado.current ? [] : history)
      .use(travado.current ? [] : focoMatematica)
      // Depois do commonmark: na primeira `*` a regra de ênfase não casa
      // (falta o par), então a nossa age antes de existir um `*itálico*`.
      .use(travado.current ? [] : multiplicacaoFormula)
      .use(travado.current ? [] : pluginEditarFormula.current)
      // Antes de navegarBuracos: dentro da fórmula, Enter sai; Tab anda.
      .use(travado.current ? [] : sairDaFormula)
      // Colar LaTeX é escrita: fora do modo travado, como todo o resto daqui.
      .use(travado.current ? [] : colarFormula)
      // Depois dos presets: as regras de tipografia não competem com nenhuma
      // input rule do commonmark, mas a ordem deixa isso explícito.
      .use(travado.current ? [] : tipografia)
      .use(travado.current ? [] : (pluginImagens.current ?? []))
      .use(travado.current ? [] : barra.current)
      .use(travado.current ? [] : gatilhoSimbolos.plugin)
      .use(travado.current ? [] : gatilhoBlocos.plugin)
      .use(travado.current ? [] : gatilhoReferencias.plugin)
      .use(travado.current ? [] : gatilhoTopicos.plugin)
      // Depois do gatilho: o Tab do menu tem precedência sobre o Tab que anda
      // pelos buracos, senão escolher um símbolo pularia para o buraco errado.
      .use(travado.current ? [] : navegarBuracos)
      // POR ÚLTIMO entre os que leem Tab: só segura a tecla quando lista,
      // fórmula e menu já disseram que não a queriam.
      .use(travado.current ? [] : tabNaoEscapa)
      .use(travado.current ? [] : block),
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

  /*
   * Fórmula entra como NÓ, e não como `$…$` para o `insert` genérico.
   *
   * O caminho de texto tinha dois defeitos, os dois medidos:
   *
   * 1. `$$x$$` numa linha só NÃO é bloco para o `remark-math` — ele lê isso
   *    como fórmula inline. Marcar "em linha própria" na caixa do MathLive
   *    devolvia uma fórmula pequena no meio da frase, enquanto a prévia
   *    (`Formula` com `bloco`) mostrava centralizada e grande. Bloco de
   *    verdade em Markdown exige `$$` em linhas próprias.
   * 2. `insert(markdown, true)` serializa o nó para DOM e o parseia de volta
   *    (`@milkdown/utils`), o que faz o KaTeX renderizar no meio do caminho só
   *    para o resultado ser relido. Muita peça para um dado que já se tem.
   *
   * Criar o nó direto pula os dois: é o mesmo que `useGatilho` faz para o
   * `//`, que é justamente o caminho que sempre funcionou. O `bloco` deixa de
   * depender de como o Markdown seria reinterpretado e passa a ser a escolha
   * do tipo do nó, que é o que ele sempre foi.
   */
  useEffect(() => {
    const alvo = inserirFormulaRef
    alvo.current = (latex, bloco, substituirEm) => {
      get()?.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { schema } = view.state
        const tipo = bloco ? schema.nodes.math_block : schema.nodes.math_inline
        if (!tipo) return

        /*
         * O bloco guarda o LaTeX num ATRIBUTO e o inline no texto do nó — é
         * assim que o `plugin-math` os declara, e é o que o serializer de cada
         * um lê na hora de virar Markdown.
         */
        const no = bloco
          ? tipo.create({ value: latex })
          : tipo.create(null, schema.text(latex))

        /*
         * Editando uma fórmula que já existe (duplo clique), o nó velho é
         * trocado pelo novo no lugar. `nodeSize` do ANTIGO, e não do novo:
         * é o pedaço a remover, e ele pode até ter mudado de tipo, se a caixa
         * "em linha própria" foi trocada no meio da edição.
         */
        if (substituirEm !== undefined) {
          const antigo = view.state.doc.nodeAt(substituirEm)
          if (!antigo) return
          view.dispatch(
            view.state.tr
              .replaceWith(substituirEm, substituirEm + antigo.nodeSize, no)
              .scrollIntoView(),
          )
          view.focus()
          return
        }

        view.dispatch(
          view.state.tr.replaceSelectionWith(no, false).scrollIntoView(),
        )
        view.focus()
      })
    }
    return () => {
      alvo.current = null
    }
  }, [get, inserirFormulaRef])

  editorRef.current = get()

  const alca = useAlcaArrasto(editorRef.current ?? undefined)

  function marcar(marca: MarcaEscrita) {
    editorRef.current?.action(aplicarMarca(marca))
  }

  /*
   * O destaque não tem comando do preset — a marca é nossa. Aplicar por
   * `toggleMark` direto é o caminho mais curto e não precisa de um `$command`
   * só para isso.
   */
  function destacar() {
    editorRef.current?.action((ctx) => {
      const visao = ctx.get(editorViewCtx)
      const tipo = visao.state.schema.marks.destaque
      if (!tipo) return
      toggleMark(tipo)(visao.state, visao.dispatch)
      visao.focus()
    })
  }

  /*
   * Travado, só o documento é renderizado.
   *
   * A alça e os menus estariam inertes de qualquer forma — os plugins que os
   * alimentam não foram registrados —, mas a alça é um `div` posicionado que
   * responde ao mouse por conta própria, então ela precisa sair do DOM e não só
   * ficar sem dados.
   */
  if (travado.current) return <Milkdown />

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
      <BarraSelecao
        ancora={ancoraBarra}
        onMarcar={marcar}
        onDestacar={destacar}
      />
      {blocos && (
        <MenuSimbolos
          estado={gatilhoBlocos.estado}
          itens={gatilhoBlocos.itens}
          indice={gatilhoBlocos.indice}
          onEscolher={gatilhoBlocos.escolher}
        />
      )}
      {buscarReferencias && (
        <MenuReferencias
          estado={gatilhoReferencias.estado}
          itens={gatilhoReferencias.itens}
          indice={gatilhoReferencias.indice}
          onEscolher={gatilhoReferencias.escolher}
        />
      )}
      {buscarTopicos && (
        <MenuSimbolos
          estado={gatilhoTopicos.estado}
          itens={gatilhoTopicos.itens}
          indice={gatilhoTopicos.indice}
          onEscolher={gatilhoTopicos.escolher}
        />
      )}
    </>
  )
}
