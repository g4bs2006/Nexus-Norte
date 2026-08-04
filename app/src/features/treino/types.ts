import type { Tables } from '@/types/database'

/** Tipos de domínio de Treino. */

export type Treino = Tables<'treinos'>
export type ExercicioTreino = Tables<'exercicios_treino'>
export type ExecucaoTreino = Tables<'execucoes_treino'>
export type ExecucaoExercicio = Tables<'execucoes_exercicio'>
export type PersonalRecord = Tables<'personal_records'>
export type RegistroCorporal = Tables<'registro_corporal'>
export type RegistroLesao = Tables<'registro_lesoes'>

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
  exercicio_id: string
  carga_real: number
  reps_reais: number
  rpe: number | null
  /** Data da execução do treino a que a série pertence. */
  data: string
  grupo_muscular: string | null
  exercicio_nome: string
}
