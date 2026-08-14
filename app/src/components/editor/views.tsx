import { createRoot, type Root } from 'react-dom/client'
import { $view } from '@milkdown/kit/utils'
import { codeBlockSchema } from '@milkdown/kit/preset/commonmark'
import type { Node } from '@milkdown/kit/prose/model'
import type { NodeView } from '@milkdown/kit/prose/view'
import type { ReactNode } from 'react'
import { desenhoSchema, wikilinkSchema } from './dialeto'

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

/** Desenha o desenho de id conhecido. */
export type RenderizarDesenho = (id: string) => ReactNode

/** O slug já tem nota? Decide o traço do link. */
export type SlugExiste = (slug: string) => boolean

/**
 * Monta React dentro de um elemento do ProseMirror, devolvendo como desmontar.
 *
 * `queueMicrotask` no unmount porque o React recusa desmontar durante um ciclo
 * de render — e o `destroy` da node view é chamado exatamente lá.
 */
function montarReact(elemento: HTMLElement, conteudo: ReactNode): () => void {
  const raiz: Root = createRoot(elemento)
  raiz.render(conteudo)
  return () => queueMicrotask(() => raiz.unmount())
}

/**
 * Cerca de código: render em cima, fonte editável embaixo.
 *
 * A fonte **não** é escondida quando o bloco perde a seleção, embora o Notion
 * esconda. Numa nota de estudo o texto do mermaid é tão consultado quanto o
 * desenho que ele gera — esconder obrigaria a clicar para lembrar o que se
 * escreveu. Fica menor e apagada, não invisível.
 */
export function criarViewCerca(renderizar: RenderizarBloco) {
  return $view(codeBlockSchema.node, () => (node) => {
    const dom = document.createElement('div')
    dom.className = 'bloco-cerca'

    const previa = document.createElement('div')
    previa.className = 'bloco-cerca-previa'

    const pre = document.createElement('pre')
    const code = document.createElement('code')
    pre.append(code)

    dom.append(previa, pre)

    let desmontar: (() => void) | null = null
    let linguagem: string | null = null
    let codigo: string | null = null

    function pintar(atual: Node) {
      const novaLinguagem = (atual.attrs.language as string | undefined) ?? ''
      const novoCodigo = atual.textContent

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

    const view: NodeView = {
      dom,
      contentDOM: code,
      update: (atual) => {
        if (atual.type.name !== 'code_block') return false
        pintar(atual)
        return true
      },
      destroy: () => desmontar?.(),
    }
    return view
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

    dom.className = 'wikilink'
    dom.dataset.wikilink = alvo
    /*
     * Link para nota que ainda não existe fica visivelmente diferente. É a
     * mesma distinção que a leitura faz, e a que dá sentido ao cartão de
     * espiada oferecer criar.
     */
    dom.dataset.pendente = existe(alvo) ? 'nao' : 'sim'
    dom.href = `/notas/${alvo}`
    dom.textContent = (node.attrs.rotulo as string | null) ?? alvo

    const view: NodeView = { dom }
    return view
  })
}

/** Desenho: o mesmo componente que a leitura usa, montado dentro do editor. */
export function criarViewDesenho(renderizar: RenderizarDesenho) {
  return $view(desenhoSchema.node, () => (node) => {
    const dom = document.createElement('figure')
    dom.className = 'bloco-desenho'
    dom.dataset.desenho = node.attrs.id as string

    const desmontar = montarReact(dom, renderizar(node.attrs.id as string))

    const view: NodeView = { dom, destroy: desmontar }
    return view
  })
}
