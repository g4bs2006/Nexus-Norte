import { createRoot, type Root } from 'react-dom/client'
import { $view } from '@milkdown/kit/utils'
import { codeBlockSchema } from '@milkdown/kit/preset/commonmark'
import type { Node } from '@milkdown/kit/prose/model'
import type { NodeView } from '@milkdown/kit/prose/view'
import type { ReactNode } from 'react'
import { desenhoSchema, wikilinkSchema } from './dialeto'
import { criarCabecalhoCerca } from './cabecalhoCerca'

/**
 * Node views: o editor mostra o que a leitura mostra.
 *
 * Sem elas, abrir a nota para escrever transformava diagrama, gráfico e
 * geometria em cerca de código crua — trocar o diálogo pequeno por uma
 * regressão de leitura não seria progresso.
 *
 * ## Duas regras que dominam este arquivo
 *
 * **Nada aqui sabe o que é `mermaid`, `plot` ou desenho.** O kernel não conhece
 * feature (README — a regra de dependência), então quem decide o que cada
 * linguagem vira entra por parâmetro. É o mesmo desenho de `buscarReferencias`,
 * e tem um ganho extra: a feature passa o MESMO componente que a leitura usa,
 * então não há duas versões da mesma regra para divergir.
 *
 * **Toda view devolve `destroy`.** mermaid, function-plot e jsxgraph montam DOM
 * imperativo e não se desmontam sozinhos. Vazar aqui não dá erro visível —
 * acumula editores mortos e o documento vai ficando lento depois de algumas
 * dezenas de edições, que é o pior tipo de defeito: o que ninguém liga à causa.
 */

/** Decide o que uma cerca vira. `null` = segue sendo código. */
export type RenderizarBloco = (
  linguagem: string,
  codigo: string,
) => ReactNode | null

/**
 * Desenha o desenho de id conhecido.
 *
 * `onRemoverDoTexto` é o que permite excluir: quem apaga a referência é o
 * editor, tirando o nó — a feature sozinha não alcança o documento.
 */
export type RenderizarDesenho = (
  id: string,
  onRemoverDoTexto: () => void,
) => ReactNode

/** O slug já tem nota? Decide o traço do link. */
export type SlugExiste = (slug: string) => boolean

/**
 * Monta React dentro de um elemento do ProseMirror, devolvendo como desmontar.
 *
 * ## Cada montagem ganha o próprio container, e isso não é detalhe
 *
 * A versão anterior chamava `createRoot` sempre no MESMO elemento e adiava o
 * unmount com `queueMicrotask` (para o React não reclamar de desmontar durante
 * um render). A ordem que saía disso destruía a tela:
 *
 *   1. `desmontar()` agenda `rootA.unmount()`
 *   2. `createRoot` cria o rootB no mesmo elemento, com o rootA ainda vivo
 *   3. `rootB.render()` commita o DOM
 *   4. a microtask roda: `rootA.unmount()` limpa o container — apagando o que
 *      o rootB acabou de commitar
 *
 * O rootB ficava com uma árvore apontando para nós soltos, e o commit seguinte
 * do mermaid escrevia no vazio. Com um container por montagem, os dois roots
 * nunca disputam o mesmo elemento, e o adiamento do unmount volta a ser
 * inofensivo.
 */
function montarReact(pai: HTMLElement, conteudo: ReactNode): () => void {
  const alvo = document.createElement('div')
  pai.append(alvo)

  const raiz: Root = createRoot(alvo)
  raiz.render(conteudo)

  return () =>
    queueMicrotask(() => {
      raiz.unmount()
      alvo.remove()
    })
}

/**
 * Cerca de código: cabeçalho em cima, render, fonte editável embaixo.
 *
 * A fonte **não** é escondida quando o bloco perde a seleção, embora o Notion
 * esconda. Numa nota de estudo o texto do mermaid é tão consultado quanto o
 * desenho que ele gera — esconder obrigaria a clicar para lembrar o que se
 * escreveu. Fica menor e apagada, não invisível.
 *
 * O cabeçalho (linguagem, copiar, quebra) é DOM puro de `cabecalhoCerca` — ver
 * lá por que não é React. Quem colore o texto é `realce.ts`, por decoration:
 * nada aqui reescreve o conteúdo do bloco.
 */
export function criarViewCerca(renderizar: RenderizarBloco, editavel: boolean) {
  return $view(codeBlockSchema.node, () => (node, view, getPos) => {
    const dom = document.createElement('div')
    dom.className = 'bloco-cerca'

    const cabecalho = criarCabecalhoCerca({
      editavel,
      lerCodigo: () => codigo ?? '',
      aoAlternarQuebra: (quebrar) => {
        dom.dataset.quebra = quebrar ? 'sim' : 'nao'
      },
      /*
       * Trocar a linguagem é mexer no ATRIBUTO do nó, e não no texto: o
       * serializer lê `language` para escrever o info string da cerca, então
       * `setNodeMarkup` é o que faz ```` ```python ```` aparecer no arquivo.
       *
       * Passa pelo histórico como qualquer edição — Ctrl+Z desfaz a troca, que
       * é o que se espera de algo que muda o Markdown salvo.
       */
      aoTrocarLinguagem: (chave) => {
        const posicao = getPos()
        if (posicao === undefined) return
        const atual = view.state.doc.nodeAt(posicao)
        if (!atual) return
        view.dispatch(
          view.state.tr.setNodeMarkup(posicao, undefined, {
            ...atual.attrs,
            language: chave,
          }),
        )
        view.focus()
      },
    })

    const previa = document.createElement('div')
    previa.className = 'bloco-cerca-previa'
    /*
     * Fora da região editável: sem isto o cursor entra no SVG do diagrama, e o
     * ProseMirror passa a ter que decidir o que fazer com uma seleção dentro de
     * um desenho. `viewMatematica` já fazia isso; aqui faltava.
     */
    previa.contentEditable = 'false'

    const pre = document.createElement('pre')
    const code = document.createElement('code')
    pre.append(code)

    dom.append(cabecalho.elemento, previa, pre)
    dom.dataset.quebra = 'nao'

    let desmontar: (() => void) | null = null
    let linguagem: string | null = null
    let codigo: string | null = null

    function pintar(atual: Node) {
      const novaLinguagem = (atual.attrs.language as string | undefined) ?? ''
      const novoCodigo = atual.textContent

      /*
       * O chip é redesenhado ANTES da guarda: ele mostra o info string cru, que
       * pode mudar sem que o texto mude, e sair pela guarda deixaria o chip
       * dizendo "Texto" num bloco que já é Python.
       */
      cabecalho.atualizar(novaLinguagem)

      /*
       * Só remonta quando o que importa mudou. Sem esta guarda, digitar em
       * QUALQUER lugar do documento recriaria todos os diagramas dele — o
       * ProseMirror chama `update` em cascata.
       */
      if (novaLinguagem === linguagem && novoCodigo === codigo) return
      linguagem = novaLinguagem
      codigo = novoCodigo

      desmontar?.()
      desmontar = null

      const conteudo = renderizar(novaLinguagem, novoCodigo)
      dom.dataset.renderizado = conteudo === null ? 'nao' : 'sim'
      if (conteudo !== null) desmontar = montarReact(previa, conteudo)
    }

    pintar(node)

    const nodeView: NodeView = {
      dom,
      contentDOM: code,
      update: (atual) => {
        if (atual.type.name !== 'code_block') return false
        pintar(atual)
        return true
      },
      /*
       * **Sem isto a página trava.**
       *
       * mermaid, function-plot e jsxgraph escrevem no DOM da prévia; o
       * ProseMirror observa mutações dentro da node view e, sem uma resposta,
       * trata cada uma como edição do documento — re-parseia o nó, chama
       * `update`, a engine desenha de novo, e o laço não fecha. A página fica
       * sem responder.
       *
       * A regra: só mutação DENTRO do `contentDOM` é edição de verdade.
       * Prévia, e até o `data-renderizado` no elemento raiz, são desenho.
       */
      ignoreMutation: (mutacao) => !code.contains(mutacao.target),
      destroy: () => {
        cabecalho.destruir()
        desmontar?.()
      },
    }
    return nodeView
  })
}

/**
 * Wikilink: âncora clicável dentro do texto.
 *
 * Sem React de propósito — é um `<a>`. Um root do React por link faria uma nota
 * com trinta citações montar trinta roots, e o ganho seria zero.
 */
export function criarViewWikilink(existe: SlugExiste) {
  return $view(wikilinkSchema.node, () => (node) => {
    const dom = document.createElement('a')
    const alvo = node.attrs.alvo as string
    const rotuloBruto = node.attrs.rotulo as string | null

    dom.className = 'wikilink'
    dom.dataset.wikilink = alvo
    dom.dataset.pendente = existe(alvo) ? 'nao' : 'sim'
    dom.href = `/notas/${alvo}`

    const tituloFormatado = rotuloBruto ?? formatarSlugParaTitulo(alvo)
    dom.innerHTML = `<span style="font-size: 11px; opacity: 0.7;">🔗</span><span>${tituloFormatado}</span>`

    const view: NodeView = { dom }
    return view
  })
}

function formatarSlugParaTitulo(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Desenho: o mesmo componente que a leitura usa, montado dentro do editor. */
export function criarViewDesenho(renderizar: RenderizarDesenho) {
  return $view(desenhoSchema.node, () => (node, view, getPos) => {
    const dom = document.createElement('figure')
    dom.className = 'bloco-desenho'
    dom.dataset.desenho = node.attrs.id as string

    /*
     * Apaga o NÓ, que é o que tira a referência do Markdown. Sem isto, excluir
     * o desenho deixaria `![[desenho:uuid]]` no texto apontando para o vazio —
     * trocando um desenho por uma mensagem de erro.
     */
    function removerDoTexto() {
      const posicao = getPos()
      if (posicao === undefined) return
      view.dispatch(view.state.tr.delete(posicao, posicao + node.nodeSize))
    }

    const desmontar = montarReact(
      dom,
      renderizar(node.attrs.id as string, removerDoTexto),
    )

    const nodeView: NodeView = {
      dom,
      // Não tem `contentDOM`: tudo aqui dentro é desenho, nada é edição. Sem
      // isto o React montando o SVG faria o ProseMirror re-parsear em laço.
      ignoreMutation: () => true,
      destroy: desmontar,
    }
    return nodeView
  })
}
