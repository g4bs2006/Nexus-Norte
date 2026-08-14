import type { Tables } from '@/types/database'

/** Tipos de Notas — a nota e as tabelas do grafo que saem dela. */

/**
 * Nota de estudo — documento vivo, não entrada datada.
 *
 * Entidade própria desde 13/08; desde 14/08 tem `slug`, que é a identidade do
 * wikilink. Continua ancorada em matéria (`materia_id` não-nulo): a
 * durabilidade vem dos links e dos tópicos, não de desacoplar o dono.
 */
export type Nota = Tables<'notas_estudo'>

export type Topico = Tables<'topicos'>
export type Semestre = Tables<'semestres'>
export type LinkNota = Tables<'links_nota'>
export type Desenho = Tables<'desenhos'>

/**
 * Nota na listagem: acompanha o nome da matéria e os tópicos.
 *
 * O índice global (`/notas`) cruza semestres, e "de onde isso veio" é a
 * pergunta que a matéria responde — sem ela a lista é um monte de títulos sem
 * procedência.
 */
export type NotaListada = Nota & {
  materia_nome: string
  topicos: readonly Topico[]
}

/**
 * Nota encontrada pela busca de conteúdo (seção 8).
 *
 * `trecho` traz o termo entre `<<` e `>>` — é o que responde POR QUE a nota
 * casou, sem obrigar a abrir cada resultado para descobrir.
 */
export type AchadoNota = {
  id: string
  slug: string
  titulo: string
  materia_nome: string
  trecho: string
}

/** Quem aponta para esta nota. É o painel de backlinks (seção 6). */
export type Backlink = {
  id: string
  slug: string
  titulo: string
  materia_nome: string
}

/**
 * Slug citado por esta nota que ainda não tem nota do outro lado.
 *
 * Apresentado como sugestão de nota a criar, nunca como erro: é justamente
 * onde a próxima nota nasce.
 */
export type LinkQuebrado = {
  slug: string
}
