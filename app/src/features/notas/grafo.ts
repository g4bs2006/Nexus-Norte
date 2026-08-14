import { extrairLinks, extrairTopicos, renomearLinks } from './markdown'
import type { TopicoCitado } from './markdown'

/**
 * Planejamento puro do grafo de notas (spec 14/08, seção 3).
 *
 * `links_nota` e `notas_topicos` são DERIVADOS do conteúdo. Se existir qualquer
 * caminho que grave `conteudo` sem re-derivar, o grafo passa a mentir — e
 * backlink errado é pior que backlink ausente, porque parece correto.
 *
 * Aqui mora o "o que o grafo deve virar"; `api.ts` só executa o plano contra o
 * banco. A divisão é o que torna a regra testável sem rede: o passo que decide
 * é função pura, e o passo que escreve é fino o bastante para se ler de uma vez.
 */

/** Aresta como `links_nota` a guarda, antes de saber a origem. */
export type ArestaPlanejada = {
  destino_slug: string
  /** Nulo quando o slug ainda não tem nota — link quebrado, que é feature. */
  destino_id: string | null
}

/** Nota que precisa ser regravada porque o alvo de um link dela mudou. */
export type ReescritaPlanejada = {
  id: string
  conteudo: string
}

/**
 * Arestas que o conteúdo desta nota produz.
 *
 * É sempre a lista COMPLETA, nunca um delta: quem executa apaga as arestas de
 * origem e insere estas. Link tirado do texto some por consequência, sem
 * ninguém precisar comparar antes e depois.
 *
 * `resolver` mapeia slug → id das notas que existem. O que não está lá vira
 * aresta com `destino_id` nulo, e não erro: é onde a próxima nota nasce.
 */
export function planejarArestas(
  conteudo: string,
  resolver: ReadonlyMap<string, string>,
  slugDaPropria?: string,
): ArestaPlanejada[] {
  const arestas: ArestaPlanejada[] = []

  for (const slug of extrairLinks(conteudo)) {
    // Nota não faz backlink de si mesma: seria ruído garantido no painel.
    if (slug === slugDaPropria) continue
    arestas.push({ destino_slug: slug, destino_id: resolver.get(slug) ?? null })
  }
  return arestas
}

/**
 * Tópicos que o conteúdo desta nota marca.
 *
 * Mesma regra de substituição total das arestas, pelo mesmo motivo: tirar a
 * hashtag do texto tem que tirar o tópico da nota.
 */
export function planejarTopicos(conteudo: string): TopicoCitado[] {
  return extrairTopicos(conteudo)
}

/**
 * O grafo mudaria, se este conteúdo substituísse aquele?
 *
 * É a pergunta que torna o autosave viável. `salvarNota` faz ~6 idas ao
 * servidor: carrega slugs, grava, apaga arestas, insere arestas, apaga
 * tópicos, insere tópicos. A cada 2 segundos de digitação isso é
 * insustentável — e desnecessário, porque digitar dentro de um parágrafo não
 * mexe em aresta nenhuma.
 *
 * Comparar conjuntos é barato: `extrairLinks` e `extrairTopicos` já rodam sem
 * DOM e sem rede. Escrever `[[` muda o conjunto e paga a re-derivação;
 * escrever "bom dia" não.
 *
 * **Ordem não conta.** Mover um link de lugar no texto não muda quem cita
 * quem, e `links_nota` não guarda posição — re-derivar aí seria trabalho para
 * gravar exatamente as mesmas linhas.
 */
export function grafoMudou(antes: string, depois: string): boolean {
  if (antes === depois) return false

  return (
    !mesmoConjunto(extrairLinks(antes), extrairLinks(depois)) ||
    !mesmoConjunto(
      extrairTopicos(antes).map((topico) => topico.slug),
      extrairTopicos(depois).map((topico) => topico.slug),
    )
  )
}

function mesmoConjunto(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const conjunto = new Set(a)
  return b.every((item) => conjunto.has(item))
}

/**
 * Reescrita das notas que citam um slug que mudou (seção 3).
 *
 * O wikilink é persistido por slug — id sobreviveria a renomeação de graça, mas
 * deixaria o `.md` ilegível fora do app, e portabilidade é o que sustenta a
 * escolha de Markdown. O preço é este: renomear propaga.
 *
 * Só volta quem de fato mudou. Nota cujo conteúdo saiu igual não entra no
 * update — carimbaria `atualizada_em` à toa e faria a lista mentir sobre o que
 * foi mexido.
 */
export function planejarPropagacao(
  citantes: readonly { id: string; conteudo: string }[],
  de: string,
  para: string,
): ReescritaPlanejada[] {
  const reescritas: ReescritaPlanejada[] = []

  for (const nota of citantes) {
    const conteudo = renomearLinks(nota.conteudo, de, para)
    if (conteudo !== nota.conteudo) reescritas.push({ id: nota.id, conteudo })
  }
  return reescritas
}
