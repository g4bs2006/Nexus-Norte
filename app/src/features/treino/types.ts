import type { Tables } from '@/types/database'

/** Tipos de domínio de Treino. */

export type Treino = Tables<'treinos'>
export type ExercicioTreino = Tables<'exercicios_treino'>
export type ExecucaoTreino = Tables<'execucoes_treino'>
export type ExecucaoExercicio = Tables<'execucoes_exercicio'>
export type PersonalRecord = Tables<'personal_records'>
export type RegistroCorporal = Tables<'registro_corporal'>
export type RegistroLesao = Tables<'registro_lesoes'>

/** Exercício canônico da biblioteca (resolução 10.18). */
export type ExercicioBase = Tables<'biblioteca_exercicios'>

export type TipoTreino = Tables<'tipos_treino'>

/**
 * Exercício dentro de um treino, com nome e grupo resolvidos pela biblioteca.
 *
 * `exercicios_treino` guarda apenas os ALVOS (séries, reps, carga, descanso) e o
 * vínculo com o exercício base — nome e grupo muscular vivem só na biblioteca
 * (resolução 10.18). Este tipo é o resultado do join, e é o que a UI consome.
 */
export interface ExercicioComBase extends ExercicioTreino {
  nome: string
  grupo_muscular: string | null
}

/** Treino com o nome do tipo resolvido. */
export interface TreinoComTipo extends Treino {
  tipo_nome: string | null
}

/** PR com o nome do exercício base resolvido. */
export interface PersonalRecordComNome extends PersonalRecord {
  exercicio_nome: string
}

/** Exercício da biblioteca com a contagem de treinos que o usam. */
export interface ExercicioBaseComUso extends ExercicioBase {
  /** Quantos `exercicios_treino` apontam para este. Bloqueia a exclusão. */
  usos: number
}

/** Tipo de treino com a contagem de treinos que o usam. */
export interface TipoTreinoComUso extends TipoTreino {
  usos: number
}

/**
 * Entrada de fluxograma que representa um TREINO.
 *
 * A tabela é compartilhada com Estudos (resolução 10.6); este tipo estreita
 * `treino_id` para não-nulo nas consultas já filtradas.
 */
export type FluxogramaTreino = Omit<
  Tables<'fluxograma_semanal'>,
  'treino_id'
> & {
  treino_id: string
}

/**
 * Série executada com os dados do exercício, como vem do join usado pelas
 * análises de volume e progressão.
 */
export interface SerieExecutada {
  id: string
  /**
   * Id da sessão. É o que permite agrupar as séries por treino realizado — sem
   * ele, duas sessões no mesmo dia (não há unique em `treino_id, data`) viravam
   * uma massa indistinguível.
   */
  execucao_treino_id: string
  /** Id em `exercicios_treino` — a série aconteceu num treino específico. */
  exercicio_id: string
  /** Id na biblioteca — é por aqui que progressão e PR se agrupam. */
  exercicio_base_id: string
  carga_real: number
  reps_reais: number
  rpe: number | null
  /** Data da execução do treino a que a série pertence. */
  data: string
  treino_id: string
  /** Instante da primeira série gravada — início efetivo da sessão. */
  execucao_criada_em: string
  /** Nulo enquanto a sessão está em andamento (resolução 10.21). */
  execucao_finalizada_em: string | null
  grupo_muscular: string | null
  exercicio_nome: string
}

/**
 * A sessão em andamento, com o que já foi gravado.
 *
 * É o que o app carrega ao reabrir para retomar o treino de onde parou — as
 * séries vêm cruas porque o diálogo só precisa casar cada uma com sua linha.
 */
export interface ExecucaoAberta {
  id: string
  treino_id: string
  data: string
  created_at: string
  series: readonly {
    id: string
    exercicio_id: string
    carga_real: number
    reps_reais: number
    rpe: number | null
  }[]
}
