import type { Tables } from '@/types/database'

/** Tipos de domínio de Projetos. */

export type StatusProjeto =
  | 'planejamento'
  | 'em_andamento'
  | 'pausado'
  | 'concluido'

export type StatusMarco = 'a_fazer' | 'fazendo' | 'feito'

export type Projeto = Omit<Tables<'projetos'>, 'status'> & {
  status: StatusProjeto
}

export type MarcoProjeto = Omit<Tables<'marcos_projeto'>, 'status'> & {
  status: StatusMarco
}

export type LogProgresso = Tables<'log_progresso'>

export const ROTULOS_STATUS_PROJETO: Record<StatusProjeto, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
}

export const ROTULOS_STATUS_MARCO: Record<StatusMarco, string> = {
  a_fazer: 'A fazer',
  fazendo: 'Fazendo',
  feito: 'Feito',
}
