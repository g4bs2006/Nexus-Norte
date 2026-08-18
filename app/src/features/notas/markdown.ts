/**
 * Camada pura de Markdown das notas (spec 14/08, seção 2).
 *
 * Funções sobre string: sem DOM, sem ProseMirror, sem Supabase — mesmo espírito
 * de `calculos.ts`. É de propósito que ela venha ANTES do editor: as regras de
 * parsing do wikilink, do desenho e da matemática ficam aqui, e trocar o editor
 * rico depois não muda uma linha deste arquivo.
 *
 * O conteúdo da nota é Markdown com quatro construções próprias:
 * `$math$`, cerca ```plot, cerca ```mermaid e `![[desenho:uuid]]`.
 *
 * As regexes do dialeto vêm de `components/editor/gramatica.ts` — a mesma
 * definição que o parser do editor usa. Estavam duplicadas aqui e lá, e foi a
 * divergência entre as cópias que apagou menções e tópicos ao salvar.
 */

import {
  RE_DESENHO,
  RE_TOPICO,
  RE_WIKILINK as RE_LINK,
} from '@/components/editor/gramatica'

/** Tópico marcado no texto, como a tabela `topicos` o guarda. */
export type TopicoCitado = {
  /** Identidade, normalizada por `gerarSlug`. */
  slug: string
  /** Como se lê na tela: `#regra-da-cadeia` vira "regra da cadeia". */
  nome: string
}

/** Alvo de um wikilink e o texto que a nota exibe no lugar dele. */
export type LinkNota = {
  /** Slug do destino, já normalizado por `gerarSlug`. */
  slug: string
  /** Texto após `|`, ou `null` quando o link exibe o próprio alvo. */
  rotulo: string | null
}

/** Wikilink com onde ele começa e termina no conteúdo. Fim é exclusivo. */
export type LinkLocalizado = LinkNota & { inicio: number; fim: number }

/** Pedaço do conteúdo, na ordem em que a leitura o encontra. */
export type Fatia =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'link'; slug: string; rotulo: string | null }
  /** `latex` vem sem os `$`; `bloco` distingue `$$…$$` de `$…$`. */
  | { tipo: 'matematica'; latex: string; bloco: boolean }
  /** Cerca de código. `linguagem` é o info string: 'mermaid', 'plot', ''… */
  | { tipo: 'cerca'; linguagem: string; codigo: string }
  /** `![[desenho:uuid]]`. */
  | { tipo: 'desenho'; id: string }

/**
 * `cerca` é separada de `codigo` porque só ela vira bloco renderizado: crase
 * simples no meio da frase é código inline e continua texto.
 */
type TipoRegiao = 'cerca' | 'codigo' | 'matematica'

type Regiao = {
  inicio: number
  /** Exclusivo. */
  fim: number
  tipo: TipoRegiao
}

/**
 * Acentos do português mapeados para o ASCII correspondente.
 *
 * Tabela explícita em vez de `normalize('NFD')` + regex de diacrítico: o
 * conteúdo tem LaTeX, e `normalize` mexe em caracteres matemáticos que não são
 * acento nenhum. Aqui o que não está na tabela passa intacto.
 */
const ACENTOS: Record<string, string> = {
  á: 'a', à: 'a', ã: 'a', â: 'a', ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', õ: 'o', ô: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n',
}

/** Slug de nota sem título aproveitável. O backfill da migration usa o mesmo. */
const SLUG_PADRAO = 'nota'

/**
 * Slug estável a partir do título: minúsculas, sem acento, tudo que não é
 * `[a-z0-9]` vira hífen.
 *
 * Estável é o requisito central — o slug é a identidade do wikilink, escrita à
 * mão dentro do texto de outras notas, e o mesmo título tem que dar o mesmo
 * slug hoje e em 2031.
 *
 * `existentes` resolve colisão com sufixo numérico (`-2`, `-3`, ...). Slug é
 * único GLOBAL, não por matéria: `[[series-de-taylor]]` não pode depender de
 * onde está escrito para saber para onde aponta.
 */
export function gerarSlug(
  titulo: string,
  existentes: Iterable<string> = [],
): string {
  const raiz = slugificar(titulo) || SLUG_PADRAO

  const tomados = new Set(existentes)
  if (!tomados.has(raiz)) return raiz

  let sufixo = 2
  while (tomados.has(`${raiz}-${sufixo}`)) sufixo += 1
  return `${raiz}-${sufixo}`
}

function slugificar(texto: string): string {
  let saida = ''
  for (const caractere of texto.toLowerCase()) {
    const semAcento = ACENTOS[caractere] ?? caractere
    saida += /[a-z0-9]/.test(semAcento) ? semAcento : '-'
  }
  // Colapsa as sequências de hífen que a troca acima produz e apara as pontas.
  return saida.replace(/-+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Slugs citados por wikilink no conteúdo, sem repetição.
 *
 * O que alimenta `links_nota` — e por isso ignora `[[` dentro de código e de
 * matemática: `\begin{bmatrix}` e um exemplo de sintaxe numa cerca não são
 * arestas do grafo.
 *
 * O alvo é normalizado por `gerarSlug`, então `[[Séries de Taylor]]` e
 * `[[series-de-taylor]]` resolvem para a mesma nota. Escrever o título à mão é
 * o caso comum antes de o autocomplete existir (fase 6).
 */
export function extrairLinks(conteudo: string): string[] {
  const slugs = new Set<string>()
  for (const link of lerLinks(conteudo)) slugs.add(link.slug)
  return [...slugs]
}

/**
 * Wikilinks com a posição que ocupam no texto.
 *
 * Existe para quem precisa REESCREVER ou RENDERIZAR o conteúdo em volta dos
 * links, e não só saber quais são: a renderização da fase 3 fatia o texto por
 * estas posições para transformar `[[slug]]` em link clicável sem precisar de
 * um parser de Markdown inteiro.
 */
export function localizarLinks(conteudo: string): LinkLocalizado[] {
  return lerLinks(conteudo)
}

/**
 * Tópicos marcados no conteúdo por hashtag (`#regra-da-cadeia`), sem repetição.
 *
 * A sintaxe é a do Obsidian, e é a única que atende a exigência do spec de o
 * tópico ser DERIVADO do conteúdo: um seletor à parte faria o vocabulário viver
 * fora do texto, e aí renomear a nota e renomear a marcação seriam dois atos.
 *
 * Não colide com heading: `# Título` tem espaço depois do `#`, e aqui o
 * caractere seguinte é obrigatoriamente parte do tópico. A marcação precisa ter
 * ao menos uma letra, senão `#2` numa enumeração viraria vocabulário.
 *
 * Devolve o par que a tabela `topicos` guarda — o slug é a identidade, e o nome
 * é o que se lê na tela e o que pode ser renomeado depois sem varrer conteúdo.
 */
export function extrairTopicos(conteudo: string): TopicoCitado[] {
  const mascarado = mascarar(conteudo)
  const porSlug = new Map<string, TopicoCitado>()

  for (const achado of mascarado.matchAll(RE_TOPICO)) {
    const marcacao = achado[1]
    if (marcacao === undefined) continue
    if (!/\p{L}/u.test(marcacao)) continue

    const slug = gerarSlug(marcacao)
    if (porSlug.has(slug)) continue
    // `regra-da-cadeia` e `regra_da_cadeia` se leem como "regra da cadeia".
    porSlug.set(slug, { slug, nome: marcacao.replace(/[-_]+/g, ' ').trim() })
  }
  return [...porSlug.values()]
}

/**
 * Ids dos desenhos embutidos (`![[desenho:uuid]]`), sem repetição.
 *
 * Só uuid bem formado entra: a referência vai virar filtro numa coluna `uuid`,
 * e um alvo torto tem que ser texto ignorado, não erro de consulta.
 */
export function extrairReferenciasDesenho(conteudo: string): string[] {
  const mascarado = mascarar(conteudo)
  const ids = new Set<string>()

  for (const achado of mascarado.matchAll(RE_DESENHO)) {
    const uuid = achado[1]
    if (uuid !== undefined) ids.add(uuid.toLowerCase())
  }
  return [...ids]
}

/**
 * Quebra o conteúdo na sequência que a leitura precisa renderizar.
 *
 * Existe para o componente de leitura não virar um parser. Ele só mapeia fatia
 * para elemento; quem sabe o que é link, o que é fórmula e o que é texto é esta
 * camada, que roda sem DOM e tem teste.
 *
 * Não é um renderizador de Markdown — heading, lista e negrito seguem chegando
 * como texto. É a leitura mínima que as construções PRÓPRIAS da nota exigem,
 * porque `$x^2$` exibido cru não serve para nada.
 */
export function fatiar(conteudo: string): Fatia[] {
  const marcos = [
    ...lerLinks(conteudo).map((link) => ({
      inicio: link.inicio,
      fim: link.fim,
      fatia: { tipo: 'link' as const, slug: link.slug, rotulo: link.rotulo },
    })),
    ...mapear(conteudo)
      .filter((regiao) => regiao.tipo === 'matematica')
      .map((regiao) => {
        const bloco = conteudo.startsWith('$$', regiao.inicio)
        const delimitador = bloco ? 2 : 1
        return {
          inicio: regiao.inicio,
          fim: regiao.fim,
          fatia: {
            tipo: 'matematica' as const,
            latex: conteudo.slice(
              regiao.inicio + delimitador,
              regiao.fim - delimitador,
            ),
            bloco,
          },
        }
      }),
    ...mapear(conteudo)
      .filter((regiao) => regiao.tipo === 'cerca')
      .map((regiao) => ({
        inicio: regiao.inicio,
        fim: regiao.fim,
        fatia: lerCercaFatia(conteudo.slice(regiao.inicio, regiao.fim)),
      })),
    ...localizarDesenhos(conteudo).map((desenho) => ({
      inicio: desenho.inicio,
      fim: desenho.fim,
      fatia: { tipo: 'desenho' as const, id: desenho.id },
    })),
  ].sort((a, b) => a.inicio - b.inicio)

  const fatias: Fatia[] = []
  let cursor = 0

  for (const marco of marcos) {
    if (marco.inicio > cursor) {
      fatias.push({ tipo: 'texto', texto: conteudo.slice(cursor, marco.inicio) })
    }
    fatias.push(marco.fatia)
    cursor = marco.fim
  }
  if (cursor < conteudo.length) {
    fatias.push({ tipo: 'texto', texto: conteudo.slice(cursor) })
  }
  return fatias
}

/**
 * Separa o info string do corpo de uma cerca.
 *
 * O info string é o que decide o bloco: ```` ```plot ```` e ```` ```mermaid ````
 * viram gráfico e diagrama, e qualquer outro (ou nenhum) segue sendo código
 * exibido como código.
 */
function lerCercaFatia(texto: string): Fatia {
  const quebra = texto.indexOf('\n')
  if (quebra === -1) return { tipo: 'cerca', linguagem: '', codigo: '' }

  const abertura = texto.slice(0, quebra)
  const linguagem = abertura.replace(/^[ \t]*(`{3,}|~{3,})/, '').trim()

  const corpo = texto.slice(quebra + 1)
  // A última linha é a cerca de fechamento, quando ela existe.
  const fecha = corpo.lastIndexOf('\n')
  const codigo = /^[ \t]*(`{3,}|~{3,})[ \t]*$/.test(corpo.slice(fecha + 1))
    ? corpo.slice(0, fecha === -1 ? 0 : fecha)
    : corpo

  return { tipo: 'cerca', linguagem: linguagem.toLowerCase(), codigo }
}

/** Posição de cada `![[desenho:uuid]]`, para o fatiador. */
function localizarDesenhos(
  conteudo: string,
): { inicio: number; fim: number; id: string }[] {
  const mascarado = mascarar(conteudo)
  const achados: { inicio: number; fim: number; id: string }[] = []

  for (const achado of mascarado.matchAll(RE_DESENHO)) {
    const uuid = achado[1]
    if (uuid === undefined) continue
    achados.push({
      inicio: achado.index,
      fim: achado.index + achado[0].length,
      id: uuid.toLowerCase(),
    })
  }
  return achados
}

/**
 * Conteúdo sem as fórmulas, para o índice de busca (seção 8).
 *
 * `\frac{\partial}{\partial x}` vira uma penca de tokens que degradam a
 * relevância do índice inteiro — o `tsvector` passa a casar por `partial`
 * qualquer nota que tenha uma derivada. Fora dos delimitadores nada muda.
 *
 * Cada região vira um espaço, e não vazio, para as palavras vizinhas não se
 * colarem: `a$x$b` sem isso viraria o token `ab`.
 */
export function removerMatematica(conteudo: string): string {
  const regioes = mapear(conteudo).filter((regiao) => regiao.tipo === 'matematica')
  if (regioes.length === 0) return conteudo

  let saida = ''
  let cursor = 0
  for (const regiao of regioes) {
    saida += conteudo.slice(cursor, regiao.inicio) + ' '
    cursor = regiao.fim
  }
  return saida + conteudo.slice(cursor)
}

/**
 * Reaponta os wikilinks de `de` para `para`, preservando o texto exibido.
 *
 * É o que faz renomear título não quebrar as notas que citam esta (seção 3):
 * o link é persistido por slug, então quem aponta precisa ser reescrito. Links
 * para outros alvos, e tudo dentro de código ou matemática, ficam intactos.
 */
export function renomearLinks(
  conteudo: string,
  de: string,
  para: string,
): string {
  const alvo = gerarSlug(de)
  const novo = gerarSlug(para)
  if (alvo === novo) return conteudo

  const links = lerLinks(conteudo).filter((link) => link.slug === alvo)
  if (links.length === 0) return conteudo

  let saida = ''
  let cursor = 0
  for (const link of links) {
    const texto = link.rotulo === null ? novo : `${novo}|${link.rotulo}`
    saida += conteudo.slice(cursor, link.inicio) + `[[${texto}]]`
    cursor = link.fim
  }
  return saida + conteudo.slice(cursor)
}

// =============================================================================
// Leitura dos wikilinks
// =============================================================================

function lerLinks(conteudo: string): LinkLocalizado[] {
  const mascarado = mascarar(conteudo)
  const links: LinkLocalizado[] = []

  for (const achado of mascarado.matchAll(RE_LINK)) {
    const [texto, exclamacao, alvo, rotulo] = achado
    if (texto === undefined || alvo === undefined) continue
    // `![[...]]` é embed de desenho, não aresta do grafo.
    if (exclamacao === '!') continue
    if (/^desenho:/i.test(alvo.trim())) continue

    const slug = gerarSlug(alvo)
    if (slug === SLUG_PADRAO && slugificar(alvo) === '') continue

    links.push({
      slug,
      rotulo: rotulo === undefined ? null : rotulo,
      inicio: achado.index,
      fim: achado.index + texto.length,
    })
  }
  return links
}

// =============================================================================
// Regiões protegidas
//
// Código e matemática são varridos num passe só, da esquerda para a direita, e
// não por regex empilhada: um `$` dentro de cerca não abre fórmula, e uma crase
// dentro de `$$` não abre código. Quem decide é o delimitador que veio antes.
// =============================================================================

/**
 * Copia o conteúdo trocando código e matemática por espaço, preservando o
 * comprimento — assim o índice de qualquer casamento na cópia vale no original.
 * Quebras de linha ficam, para o texto não virar uma linha só.
 */
function mascarar(conteudo: string): string {
  const regioes = mapear(conteudo)
  if (regioes.length === 0) return conteudo

  // `split('')` e não `[...conteudo]`: o índice tem que ser o mesmo unidade a
  // unidade que o de `matchAll`, que é UTF-16 — iterar por code point
  // desalinharia tudo depois do primeiro emoji.
  const caracteres = conteudo.split('')
  for (const regiao of regioes) {
    for (let i = regiao.inicio; i < regiao.fim; i += 1) {
      if (caracteres[i] !== '\n') caracteres[i] = ' '
    }
  }
  return caracteres.join('')
}

function mapear(conteudo: string): Regiao[] {
  const regioes: Regiao[] = []
  let i = 0

  while (i < conteudo.length) {
    const caractere = conteudo[i]

    // `\$` e `\[` são literais: o escape consome os dois caracteres.
    if (caractere === '\\') {
      i += 2
      continue
    }

    if (caractere === '`' || caractere === '~') {
      const cerca = lerCerca(conteudo, i, caractere)
      if (cerca !== null) {
        regioes.push(cerca)
        i = cerca.fim
        continue
      }
    }

    if (caractere === '`') {
      const codigo = lerCodigoInline(conteudo, i)
      if (codigo !== null) {
        regioes.push(codigo)
        i = codigo.fim
        continue
      }
    }

    if (caractere === '$') {
      const matematica = lerMatematica(conteudo, i)
      if (matematica !== null) {
        regioes.push(matematica)
        i = matematica.fim
        continue
      }
    }

    i += 1
  }
  return regioes
}

/**
 * Bloco cercado (```plot, ```mermaid, ~~~), do início da linha de abertura até
 * o fim da linha de fechamento.
 *
 * Cerca sem fechamento protege até o fim do documento: é o estado normal de um
 * bloco sendo digitado, e tratar o resto como texto faria os links piscarem
 * enquanto se escreve.
 */
function lerCerca(conteudo: string, indice: number, marca: string): Regiao | null {
  if (!inicioDeLinha(conteudo, indice)) return null

  const abertura = contar(conteudo, indice, marca)
  if (abertura < 3) return null

  const fimDaAbertura = conteudo.indexOf('\n', indice)
  if (fimDaAbertura === -1) {
    return { inicio: indice, fim: conteudo.length, tipo: 'cerca' }
  }

  let cursor = fimDaAbertura + 1
  while (cursor < conteudo.length) {
    const fimDaLinha = conteudo.indexOf('\n', cursor)
    const linha = conteudo.slice(
      cursor,
      fimDaLinha === -1 ? conteudo.length : fimDaLinha,
    )
    const recuo = linha.length - linha.trimStart().length
    const fechamento = contar(linha, recuo, marca)
    if (
      recuo <= 3 &&
      fechamento >= abertura &&
      linha.slice(recuo + fechamento).trim() === ''
    ) {
      return {
        inicio: indice,
        fim: fimDaLinha === -1 ? conteudo.length : fimDaLinha,
        tipo: 'cerca',
      }
    }
    if (fimDaLinha === -1) break
    cursor = fimDaLinha + 1
  }
  return { inicio: indice, fim: conteudo.length, tipo: 'cerca' }
}

/** Código inline: mesma quantidade de crases abrindo e fechando, na mesma linha. */
function lerCodigoInline(conteudo: string, indice: number): Regiao | null {
  const crases = contar(conteudo, indice, '`')
  const delimitador = '`'.repeat(crases)

  let cursor = indice + crases
  while (cursor < conteudo.length) {
    const caractere = conteudo[cursor]
    if (caractere === '\n') return null
    if (caractere === '`' && contar(conteudo, cursor, '`') === crases) {
      return { inicio: indice, fim: cursor + delimitador.length, tipo: 'codigo' }
    }
    cursor += 1
  }
  return null
}

/**
 * `$$...$$` (pode atravessar linhas) e `$...$` (não pode).
 *
 * A regra do inline é a do `remark-math`: não vale espaço logo depois da
 * abertura nem logo antes do fechamento, senão "custou R$ 50, sobrou R$ 30"
 * viraria fórmula.
 */
function lerMatematica(conteudo: string, indice: number): Regiao | null {
  const bloco = conteudo.startsWith('$$', indice)
  const delimitador = bloco ? '$$' : '$'

  let cursor = indice + delimitador.length
  while (cursor < conteudo.length) {
    const caractere = conteudo[cursor]
    if (caractere === '\\') {
      cursor += 2
      continue
    }
    if (!bloco && caractere === '\n') return null
    if (conteudo.startsWith(delimitador, cursor)) {
      const corpo = conteudo.slice(indice + delimitador.length, cursor)
      if (corpo === '') return null
      if (!bloco && (/^\s/.test(corpo) || /\s$/.test(corpo))) return null
      return { inicio: indice, fim: cursor + delimitador.length, tipo: 'matematica' }
    }
    cursor += 1
  }
  return null
}

function inicioDeLinha(conteudo: string, indice: number): boolean {
  for (let i = indice - 1; i >= 0; i -= 1) {
    const caractere = conteudo[i]
    if (caractere === '\n') return true
    if (caractere !== ' ' && caractere !== '\t') return false
  }
  return true
}

function contar(texto: string, indice: number, caractere: string): number {
  let total = 0
  while (texto[indice + total] === caractere) total += 1
  return total
}
