import type { Tables } from '@/types/database'

/** Tipos de domínio de Estudos — estreitam as colunas `text` com CHECK. */

export type TipoDocumento =
  'lista' | 'livro' | 'anotacao' | 'ementa' | 'prova_anterior'

export type TipoCalculoMedia = 'ponderada' | 'manual'
export type StatusExcecao = 'cancelado' | 'remarcado'

/**
 * De onde a atividade veio. `'email'` existe desde já para a captura futura
 * de emails não exigir migração — hoje nada grava esse valor.
 */
export type OrigemAtividade = 'manual' | 'email'

/**
 * Situação da entrega. **Derivada na leitura, nunca gravada** — "atrasada"
 * depende da passagem do tempo, e materializar exigiria uma escrita na virada
 * de cada dia (mesma regra do momentum de Projetos, resolução 10.9).
 */
export type StatusAtividade = 'pendente' | 'atrasada' | 'concluida'

export type Materia = Tables<'materias'>

/** Semestre letivo normalizado (14/08). Substitui o texto livre `materias.semestre`. */
export type Semestre = Tables<'semestres'>

export type Documento = Omit<Tables<'documentos'>, 'tipo'> & {
  tipo: TipoDocumento
}

export type Falta = Tables<'faltas'>
export type Avaliacao = Tables<'avaliacoes'>
export type RegistroLista = Tables<'registro_listas'>

/**
 * Entrega com prazo (23/08). Vizinha de `Avaliacao`, e deliberadamente não a
 * mesma coisa: avaliação é evento de **nota**, atividade é evento de
 * **entrega**. `avaliacao_id` é ponteiro opcional — entregar pode criar ou
 * vincular uma avaliação, mas a nota nunca mora aqui, senão a média deixaria
 * de ser território exclusivo de `avaliacoes`.
 */
export type Atividade = Omit<Tables<'atividades'>, 'origem'> & {
  origem: OrigemAtividade
}
export type SessaoEstudo = Tables<'sessoes_estudo'>

/**
 * Sessão de estudo marcada numa data concreta — o "planejado" (chat
 * 2026-08-14), irmã de `TreinoAgendado`. `SessaoEstudo` continua sendo o
 * "executado"; as duas não têm FK entre si, a reconciliação é por
 * matéria + data (mesma ideia de `chaveTreinoData` no calendário).
 */
export type SessaoEstudoPlanejada = Tables<'sessoes_estudo_planejadas'>

/**
 * Nota de estudo — documento vivo, não entrada datada.
 *
 * Entidade própria desde 13/08. Antes era a coluna `materias.notas_estudo`, e
 * anotar significava editar o cadastro da matéria.
 */
export type NotaEstudo = Tables<'notas_estudo'>
export type FluxogramaSemanal = Tables<'fluxograma_semanal'>

/**
 * Entrada de fluxograma que representa uma AULA.
 *
 * A tabela é compartilhada com Treino (resolução 10.6) e o check constraint
 * garante que exatamente uma das FKs esteja preenchida. Este tipo estreita
 * `materia_id` para não-nulo nas consultas já filtradas.
 */
export type FluxogramaAula = Omit<FluxogramaSemanal, 'materia_id'> & {
  materia_id: string
}

export type ConfigCalculoMedia = Omit<
  Tables<'config_calculo_media'>,
  'tipo'
> & {
  tipo: TipoCalculoMedia
}

export type ExcecaoFluxograma = Omit<
  Tables<'excecoes_fluxograma'>,
  'status'
> & {
  status: StatusExcecao
}

export const ROTULOS_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  lista: 'Lista',
  livro: 'Livro',
  anotacao: 'Anotação',
  ementa: 'Ementa',
  prova_anterior: 'Prova anterior',
}
