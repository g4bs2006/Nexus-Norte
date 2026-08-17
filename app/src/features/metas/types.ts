import type { Tables } from '@/types/database'

/**
 * Tipos de domínio de Metas (Reestruturado em Agosto/2026).
 */

export type PilarMeta = 'financeiro' | 'estudos' | 'treino' | 'projetos' | 'pessoal'

export interface CategoriaMeta {
  id: string
  nome: string
  cor: string
  ordem: number
  criada_em: string
}

export interface Meta {
  id: string
  titulo: string
  descricao: string | null
  categoria_meta_id: string | null
  pilar: PilarMeta | null
  concluida: boolean
  data_alvo: string | null
  no_check_diario: boolean
  ordem: number
  criada_em: string
  concluida_em: string | null
  // Objeto join de categoria (se carregado)
  categoria?: CategoriaMeta | null
}

export type MetaCheckin = Tables<'metas_checkins'>

export const CLASSE_COR_PILAR: Record<PilarMeta, string> = {
  financeiro: 'text-financeiro',
  estudos: 'text-estudos',
  treino: 'text-treino',
  projetos: 'text-projetos',
  pessoal: 'text-foreground',
}

export const CLASSE_BG_PILAR: Record<PilarMeta, string> = {
  financeiro: 'bg-financeiro',
  estudos: 'bg-estudos',
  treino: 'bg-treino',
  projetos: 'bg-projetos',
  pessoal: 'bg-primary',
}

export const ROTULOS_PILAR: Record<PilarMeta, string> = {
  financeiro: 'Financeiro',
  estudos: 'Estudos',
  treino: 'Treino',
  projetos: 'Projetos',
  pessoal: 'Pessoal',
}
