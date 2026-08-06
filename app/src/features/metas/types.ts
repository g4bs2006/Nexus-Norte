import type { Tables } from '@/types/database'

/** Tipos de domínio de Metas (spec: 2026-08-05-metas-design.md). */

export type TipoMeta = 'numerica' | 'marco' | 'habito' | 'livre'
export type FrequenciaPeriodo = 'semana'

export type Meta = Omit<Tables<'metas'>, 'tipo' | 'frequencia_periodo'> & {
  tipo: TipoMeta
  frequencia_periodo: FrequenciaPeriodo | null
}

export type MetaCheckin = Tables<'metas_checkins'>

export const ROTULOS_TIPO_META: Record<TipoMeta, string> = {
  numerica: 'Numérica',
  marco: 'Marco',
  habito: 'Hábito',
  livre: 'Livre',
}

export type PilarMeta = 'financeiro' | 'estudos' | 'treino' | 'projetos'

export type PilarLinkMeta = { pilar: PilarMeta; id: string } | null

/** No máximo uma FK de pilar é preenchida por meta — a primeira encontrada vence. */
export function pilarDaMeta(meta: Meta): PilarLinkMeta {
  if (meta.categoria_id) return { pilar: 'financeiro', id: meta.categoria_id }
  if (meta.materia_id) return { pilar: 'estudos', id: meta.materia_id }
  if (meta.tipo_treino_id) return { pilar: 'treino', id: meta.tipo_treino_id }
  if (meta.projeto_id) return { pilar: 'projetos', id: meta.projeto_id }
  return null
}

export const CLASSE_COR_PILAR: Record<PilarMeta, string> = {
  financeiro: 'text-financeiro',
  estudos: 'text-estudos',
  treino: 'text-treino',
  projetos: 'text-projetos',
}
