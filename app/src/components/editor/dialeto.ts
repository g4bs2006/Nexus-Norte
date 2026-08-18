import { $markSchema, $nodeSchema, $remark } from '@milkdown/kit/utils'
import { findAndReplace } from 'mdast-util-find-and-replace'
import type { Data, PhrasingContent, Root } from 'mdast'
import type { Processor } from 'unified'
/*
 * As regexes vêm de `gramatica.ts`, e não daqui.
 *
 * Elas viviam duplicadas entre este arquivo e `features/notas/markdown.ts`,
 * byte a byte iguais — o que parecia coordenação e era coincidência. Quando o
 * editor passou a emitir `\[\[slug]]` e `\#topico`, só um dos lados soube.
 */
import {
  escreverTopico,
  escreverWikilink,
  RE_ALVO_DESENHO,
  RE_DESTAQUE,
  RE_TOPICO,
  RE_WIKILINK as RE_DIALETO,
} from './gramatica'

/**
 * O dialeto de Markdown do editor: `[[wikilink]]` e `![[desenho:uuid]]`.
 *
 * ## Por que isto existe (e é correção de bug, não enfeite)
 *
 * O remark ESCAPA colchete duplo ao serializar. Medido:
 *
 *     [[series-de-taylor]]   →  \[\[series-de-taylor]]
 *     ![[desenho:uuid]]      →  !\[\[desenho:uuid]]
 *
 * E `extrairLinks` não reconhece o escapado — corretamente, porque `\[` é um
 * escape de Markdown. O efeito prático era que abrir uma nota no editor rico e
 * salvar APAGAVA os links e os desenhos dela: o texto seguia na tela, mas
 * `links_nota` perdia as arestas e a referência do desenho virava texto morto.
 *
 * A cura é parar de tratá-los como texto solto. Viram nós de verdade: o parse
 * os reconhece na entrada, e o serializer os escreve de volta na saída, sem
 * passar pelo escape genérico.
 *
 * Mora no kernel, e não em `features/notas`, pela mesma razão do editor: é a
 * gramática do editor, e o editor serve as reuniões depois. Nada aqui sabe o
 * que é uma nota — só o que é um link.
 */

/**
 * Nó mdast do wikilink. Não é `link` do CommonMark de propósito: `link` tem
 * `url`, e um wikilink aponta para um slug que pode ainda não existir.
 */
interface NoWikilink {
  type: 'wikilink'
  alvo: string
  rotulo: string | null
  data?: Data
}

interface NoDesenho {
  type: 'desenho'
  id: string
  data?: Data
}

interface NoDestaque {
  type: 'destaque'
  children: PhrasingContent[]
  data?: Data
}

/**
 * `#topico` — vocabulário derivado do conteúdo.
 *
 * É nó pelo mesmo motivo que o wikilink é: como texto solto, o remark escapa a
 * cerquilha no início de linha (`\#regra-da-cadeia`, medido) para que ela não
 * seja relida como heading. `extrairTopicos` então não achava mais o tópico, e
 * a marcação sumia de `topicos` — silenciosamente, e só quando a hashtag abria
 * o parágrafo, que é o caso mais comum de todos.
 *
 * Tolerar `\#` no extrator resolveria o sintoma e deixaria `\#` no `.md`
 * exportado, derrubando o argumento (Markdown legível como fonte de verdade)
 * que escolheu o Milkdown, a exportação e a busca.
 */
interface NoTopico {
  type: 'topico'
  slug: string
  data?: Data
}

/*
 * Declara os dois nós para o mdast.
 *
 * Sem isto o TypeScript recusa devolvê-los de `findAndReplace`, que só aceita
 * `PhrasingContent` — e com razão: são nós que o mdast não conhece. A
 * augmentation é como se ensina um tipo novo à árvore, e é o que mantém o
 * resto do arquivo sem `as`.
 */
declare module 'mdast' {
  interface PhrasingContentMap {
    wikilink: NoWikilink
    desenho: NoDesenho
    destaque: NoDestaque
    topico: NoTopico
  }
  interface RootContentMap {
    wikilink: NoWikilink
    desenho: NoDesenho
    destaque: NoDestaque
    topico: NoTopico
  }
}

/**
 * Plugin remark que reconhece o dialeto na entrada e o escreve na saída.
 *
 * `findAndReplace` opera sobre a árvore já parseada, trocando pedaços de nós
 * de texto — não é extensão de micromark. É o suficiente porque a sintaxe não
 * é ambígua, e evita escrever um tokenizador.
 *
 * Os `handlers` de saída são o que desarma o escape: sem eles o remark trataria
 * o nó como desconhecido e cairia no texto genérico, que é onde o `\[` nascia.
 */
export function remarkDialeto(this: Processor): (arvore: Root) => void {
  const dados = this.data() as Record<string, unknown>
  const extensoes = (dados.toMarkdownExtensions ??= []) as unknown[]

  extensoes.push({
    handlers: {
      wikilink: (no: NoWikilink) => escreverWikilink(no.alvo, no.rotulo),
      desenho: (no: NoDesenho) => `![[desenho:${no.id}]]`,
      topico: (no: NoTopico) => escreverTopico(no.slug),
      destaque: (
        no: NoDestaque,
        _pai: unknown,
        estado: { containerPhrasing: (no: NoDestaque, info: unknown) => string },
        info: unknown,
      ) => `==${estado.containerPhrasing(no, info)}==`,
    },
  })

  return (arvore) => {
    findAndReplace(arvore, [
      [
        RE_DESTAQUE,
        (_todo: string, texto: string) => {
          const no: NoDestaque = {
            type: 'destaque',
            children: [{ type: 'text', value: texto }],
          }
          return no
        },
      ],
      [
        RE_DIALETO,
        (_todo: string, bang: string, alvo: string, rotulo?: string) => {
          if (bang === '!') {
            const achado = RE_ALVO_DESENHO.exec(alvo.trim())
            // `![[qualquer-coisa]]` que não seja desenho volta a ser texto.
            if (!achado) return false
            const no: NoDesenho = {
              type: 'desenho',
              id: (achado[1] as string).toLowerCase(),
            }
            return no
          }
          const no: NoWikilink = {
            type: 'wikilink',
            alvo: alvo.trim(),
            rotulo: rotulo ?? null,
          }
          return no
        },
      ],
      [
        RE_TOPICO,
        (_todo: string, marcacao: string) => {
          /*
           * Precisa de ao menos uma letra, senão `#2` numa enumeração viraria
           * vocabulário. Mesma regra de `extrairTopicos`, e agora lendo a mesma
           * regex — é o ponto da gramática única.
           */
          if (!/\p{L}/u.test(marcacao)) return false
          const no: NoTopico = { type: 'topico', slug: marcacao }
          return no
        },
      ],
    ])
  }
}

export const dialetoRemark = $remark('nexusDialeto', () => remarkDialeto)

/**
 * Wikilink como nó atômico inline.
 *
 * `atom: true` porque o miolo não se edita caractere a caractere — trocar o
 * alvo é trocar o link, não digitar dentro dele. É o que impede o cursor de
 * entrar no meio de `series-de-taylor` e quebrar o slug pela metade.
 */
export const wikilinkSchema = $nodeSchema('wikilink', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  attrs: {
    alvo: { default: '' },
    rotulo: { default: null },
  },
  parseDOM: [
    {
      tag: 'a[data-wikilink]',
      getAttrs: (dom) => {
        const elemento = dom as HTMLElement
        return {
          alvo: elemento.dataset.wikilink ?? '',
          rotulo: elemento.dataset.rotulo ?? null,
        }
      },
    },
  ],
  toDOM: (node) => [
    'a',
    {
      'data-wikilink': node.attrs.alvo as string,
      ...(node.attrs.rotulo ? { 'data-rotulo': node.attrs.rotulo as string } : {}),
      href: `/notas/${node.attrs.alvo as string}`,
    },
    (node.attrs.rotulo as string | null) ?? (node.attrs.alvo as string),
  ],
  parseMarkdown: {
    match: ({ type }) => type === 'wikilink',
    runner: (state, node, type) => {
      state.addNode(type, {
        alvo: (node as unknown as NoWikilink).alvo,
        rotulo: (node as unknown as NoWikilink).rotulo,
      })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'wikilink',
    runner: (state, node) => {
      state.addNode('wikilink', undefined, undefined, {
        alvo: node.attrs.alvo as string,
        rotulo: node.attrs.rotulo as string | null,
      })
    },
  },
}))

/**
 * Desenho embutido.
 *
 * Declarado INLINE, e não bloco, embora ocupe a linha inteira na tela. O
 * motivo é onde ele nasce: `findAndReplace` troca pedaços de nó de texto, então
 * o nó aparece dentro de um parágrafo. Um nó de grupo `block` ali seria
 * inválido no schema e o parse quebraria.
 *
 * A aparência de bloco vem do CSS da node view — que é onde ela pertence.
 */
export const desenhoSchema = $nodeSchema('desenho', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  attrs: { id: { default: '' } },
  parseDOM: [
    {
      tag: 'figure[data-desenho]',
      getAttrs: (dom) => ({ id: (dom as HTMLElement).dataset.desenho ?? '' }),
    },
  ],
  toDOM: (node) => ['figure', { 'data-desenho': node.attrs.id as string }],
  parseMarkdown: {
    match: ({ type }) => type === 'desenho',
    runner: (state, node, type) => {
      state.addNode(type, { id: (node as unknown as NoDesenho).id })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'desenho',
    runner: (state, node) => {
      state.addNode('desenho', undefined, undefined, {
        id: node.attrs.id as string,
      })
    },
  },
}))

/**
 * O tópico no editor.
 *
 * `atom: true` pela mesma razão do wikilink: o slug é a identidade, e deixar o
 * cursor entrar no meio dele permitiria quebrar `regra-da-cadeia` ao meio e
 * criar dois tópicos que ninguém quis. Editar um tópico é trocá-lo inteiro.
 */
export const topicoSchema = $nodeSchema('topico', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  attrs: { slug: { default: '' } },
  parseDOM: [
    {
      tag: 'a[data-topico]',
      getAttrs: (dom) => ({ slug: (dom as HTMLElement).dataset.topico ?? '' }),
    },
  ],
  toDOM: (node) => [
    'a',
    {
      'data-topico': node.attrs.slug as string,
      class: 'topico',
      href: `/notas?topico=${node.attrs.slug as string}`,
    },
    escreverTopico(node.attrs.slug as string),
  ],
  parseMarkdown: {
    match: ({ type }) => type === 'topico',
    runner: (state, node, type) => {
      state.addNode(type, { slug: (node as unknown as NoTopico).slug })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'topico',
    runner: (state, node) => {
      state.addNode('topico', undefined, undefined, {
        slug: node.attrs.slug as string,
      })
    },
  },
}))

/**
 * A marca de destaque no editor.
 *
 * Marca, e não nó: destaque envolve texto que continua editável, como negrito
 * — um nó atômico impediria escrever dentro dele.
 */
export const destaqueSchema = $markSchema('destaque', () => ({
  parseDOM: [{ tag: 'mark' }],
  toDOM: () => ['mark', { class: 'destaque' }],
  parseMarkdown: {
    match: (no) => no.type === 'destaque',
    runner: (estado, no, tipo) => {
      estado.openMark(tipo)
      estado.next(no.children)
      estado.closeMark(tipo)
    },
  },
  toMarkdown: {
    match: (marca) => marca.type.name === 'destaque',
    runner: (estado, marca) => {
      estado.withMark(marca, 'destaque')
    },
  },
}))
