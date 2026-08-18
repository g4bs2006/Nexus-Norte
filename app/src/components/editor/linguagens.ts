import { createLowlight } from 'lowlight'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import latex from 'highlight.js/lib/languages/latex'
import matlab from 'highlight.js/lib/languages/matlab'
import python from 'highlight.js/lib/languages/python'
import r from 'highlight.js/lib/languages/r'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

/**
 * As linguagens que a cerca de código oferece, e o realce delas.
 *
 * **Isto é conhecimento de EDITOR, não de nota** — mesma divisão de
 * `catalogoEscrita`: uma cerca ```` ```python ```` é Markdown, serve a qualquer
 * texto, e não sabe o que é um estudo.
 *
 * ## Por que uma lista curada, e não as ~200 do highlight.js
 *
 * Cada gramática registrada entra no bundle. Registrar tudo custaria centenas de
 * kB para que quarenta linguagens nunca fossem escolhidas numa nota de estudo, e
 * ainda daria uma lista longa demais para achar "Python" sem digitar.
 *
 * A lista curada e o registro são o MESMO array: não há como oferecer uma
 * linguagem que não realça, nem carregar uma gramática que ninguém escolhe.
 *
 * ## Linguagem de fora continua válida
 *
 * `resolver` devolve `null` para o que não está aqui, e `null` significa "mostre
 * como código, sem cor" — nunca "apague". Uma nota que chegue com
 * ```` ```elixir ```` guarda `elixir` no info string ao salvar, igual a como
 * entrou. É a mesma regra do `renderizarBloco`, e é o que faz o catálogo poder
 * crescer sem migração: acrescentar Elixir aqui passa a colorir o que já estava
 * escrito.
 */

/** Uma linguagem do seletor. */
export interface Linguagem {
  /** O info string gravado no Markdown — `python` em ```` ```python ````. */
  chave: string
  rotulo: string
  /**
   * Outros nomes que o mesmo realce atende.
   *
   * Existem para o que vem de FORA: colar de um blog um bloco ```` ```py ````
   * deve colorir, e não cair no caso "linguagem desconhecida". O que a UI grava
   * é sempre a `chave` — os apelidos só entram na leitura.
   */
  apelidos?: readonly string[]
}

/**
 * A ordem é de frequência numa nota de estudo, não alfabética.
 *
 * "Texto" vem primeiro porque é o estado em que a cerca nasce e o caminho de
 * volta quando se escolheu errado. O resto desce por uso esperado — Python e
 * SQL antes de MATLAB e LaTeX.
 */
export const LINGUAGENS: readonly Linguagem[] = [
  { chave: '', rotulo: 'Texto', apelidos: ['text', 'plaintext', 'txt'] },
  { chave: 'python', rotulo: 'Python', apelidos: ['py'] },
  { chave: 'javascript', rotulo: 'JavaScript', apelidos: ['js', 'jsx', 'node'] },
  { chave: 'typescript', rotulo: 'TypeScript', apelidos: ['ts', 'tsx'] },
  { chave: 'sql', rotulo: 'SQL', apelidos: ['postgres', 'postgresql', 'mysql'] },
  { chave: 'bash', rotulo: 'Shell', apelidos: ['sh', 'shell', 'zsh', 'console'] },
  { chave: 'json', rotulo: 'JSON' },
  { chave: 'yaml', rotulo: 'YAML', apelidos: ['yml'] },
  { chave: 'html', rotulo: 'HTML', apelidos: ['xml', 'svg', 'xhtml'] },
  { chave: 'css', rotulo: 'CSS' },
  { chave: 'java', rotulo: 'Java' },
  { chave: 'c', rotulo: 'C', apelidos: ['h'] },
  { chave: 'cpp', rotulo: 'C++', apelidos: ['c++', 'cc', 'hpp'] },
  { chave: 'rust', rotulo: 'Rust', apelidos: ['rs'] },
  { chave: 'go', rotulo: 'Go', apelidos: ['golang'] },
  { chave: 'r', rotulo: 'R' },
  { chave: 'matlab', rotulo: 'MATLAB', apelidos: ['octave'] },
  { chave: 'latex', rotulo: 'LaTeX', apelidos: ['tex'] },
]

/**
 * O `lowlight` com só as gramáticas do catálogo.
 *
 * Instância própria, e não a `common` do pacote: a `common` registra ~35
 * linguagens de uma vez, o que anula o motivo de ter uma lista curada.
 */
const lowlight = createLowlight({
  bash,
  c,
  cpp,
  css,
  go,
  java,
  javascript,
  json,
  latex,
  matlab,
  python,
  r,
  rust,
  sql,
  typescript,
  xml,
  yaml,
})

/**
 * A chave do catálogo → o nome registrado no lowlight.
 *
 * Só existe porque `html` é `xml` no highlight.js. Deixar `html` como chave é
 * decisão de UI: ninguém procura "XML" para escrever uma página.
 */
const NOME_NO_LOWLIGHT: Record<string, string> = { html: 'xml' }

/** Todo nome aceito → a linguagem canônica. Montado uma vez. */
const PORNOME = new Map<string, Linguagem>()
for (const lingua of LINGUAGENS) {
  if (lingua.chave !== '') PORNOME.set(lingua.chave, lingua)
  for (const apelido of lingua.apelidos ?? []) PORNOME.set(apelido, lingua)
}

/**
 * O info string da cerca → a linguagem do catálogo, ou `null`.
 *
 * `null` para desconhecida E para texto puro: os dois querem a mesma coisa do
 * realce, que é nenhum. Quem precisa distinguir (o chip do cabeçalho, que
 * mostra `elixir` em vez de "Texto") olha o info string cru.
 */
export function resolver(info: string): Linguagem | null {
  const nome = info.trim().toLowerCase()
  if (nome === '') return null
  return PORNOME.get(nome) ?? null
}

/**
 * O rótulo a mostrar no chip para um info string qualquer.
 *
 * Linguagem de fora aparece com o próprio nome, e não como "Texto": o bloco
 * ```` ```elixir ```` de uma nota antiga precisa se anunciar, senão a única
 * pista de que ali há um info string seria abrir o Markdown.
 */
export function rotularInfo(info: string): string {
  const nome = info.trim()
  if (nome === '') return 'Texto'
  return resolver(nome)?.rotulo ?? nome
}

/**
 * Filtra o seletor por chave, rótulo e apelido.
 *
 * Exato antes de prefixo antes de texto, e o exato não é preciosismo: `java` é
 * prefixo de `javascript`, que vem antes no catálogo — sem esta ordem, digitar
 * o nome INTEIRO de uma linguagem devolvia outra no topo, e `Enter` escolhia a
 * errada.
 */
export function filtrarLinguagens(termo: string): Linguagem[] {
  const busca = termo.trim().toLowerCase()
  if (busca === '') return [...LINGUAGENS]

  const exatas: Linguagem[] = []
  const porPrefixo: Linguagem[] = []
  const porTexto: Linguagem[] = []

  for (const lingua of LINGUAGENS) {
    const nomes = [lingua.chave, ...(lingua.apelidos ?? [])]
    if (nomes.includes(busca) || lingua.rotulo.toLowerCase() === busca) {
      exatas.push(lingua)
      continue
    }
    if (nomes.some((nome) => nome !== '' && nome.startsWith(busca))) {
      porPrefixo.push(lingua)
      continue
    }
    if (lingua.rotulo.toLowerCase().includes(busca)) porTexto.push(lingua)
  }

  return [...exatas, ...porPrefixo, ...porTexto]
}

/** Um trecho colorido, em deslocamentos DENTRO do código. */
export interface Token {
  inicio: number
  fim: number
  /** A classe do highlight.js — `hljs-keyword`, `hljs-string`… */
  classe: string
}

/**
 * O código dividido nos trechos que recebem cor.
 *
 * Devolve deslocamentos, e não HTML, porque quem consome é o ProseMirror: o
 * texto continua sendo texto DELE, e a cor entra como `Decoration.inline` por
 * cima. É a diferença entre realçar e reescrever — undo, seleção, colar e o
 * dialeto seguem funcionando porque nada aqui toca no documento.
 *
 * Lista vazia para linguagem desconhecida ou texto puro: sem cor é resposta,
 * não falha.
 */
export function realcar(codigo: string, info: string): Token[] {
  const lingua = resolver(info)
  if (!lingua) return []

  const nome = NOME_NO_LOWLIGHT[lingua.chave] ?? lingua.chave
  if (!lowlight.registered(nome)) return []

  /*
   * `highlight` do lowlight devolve uma árvore hast — `<span class="hljs-…">`
   * aninhados sobre nós de texto. O que interessa aqui é o percurso em ordem:
   * cada nó de texto avança o cursor, e cada `span` empilha a classe que vale
   * para o que estiver dentro dele.
   */
  const tokens: Token[] = []
  let cursor = 0

  interface NoHast {
    type: string
    value?: string
    tagName?: string
    properties?: { className?: unknown }
    children?: NoHast[]
  }

  function andar(nos: readonly NoHast[], classe: string | null) {
    for (const no of nos) {
      if (no.type === 'text') {
        const tamanho = (no.value ?? '').length
        if (classe !== null && tamanho > 0) {
          tokens.push({ inicio: cursor, fim: cursor + tamanho, classe })
        }
        cursor += tamanho
        continue
      }

      /*
       * Aninhamento vence do lado de DENTRO: numa string com interpolação, o
       * `hljs-subst` de dentro é mais específico que o `hljs-string` de fora, e
       * é ele que deve pintar aquele pedaço. Como só o nó de texto emite token,
       * a classe que chega lá é sempre a do span mais interno — de graça.
       */
      const classes = no.properties?.className
      const propria = Array.isArray(classes)
        ? classes.filter((item): item is string => typeof item === 'string').join(' ')
        : null

      andar(no.children ?? [], propria !== null && propria !== '' ? propria : classe)
    }
  }

  const arvore = lowlight.highlight(nome, codigo) as unknown as NoHast
  andar(arvore.children ?? [], null)

  return tokens
}
