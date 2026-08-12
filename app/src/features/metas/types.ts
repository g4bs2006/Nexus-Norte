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

export type PilarMeta = 'financeiro' | 'estudos' | 'treino' | 'projetos' | 'corporal'

/**
 * `id` é `null` para o vínculo com peso corporal: `registro_corporal` não é uma
 * entidade escolhível (categoria, matéria...), é peso ao longo do tempo — não há
 * "qual" registro linkar, só "usar o histórico de peso ou não".
 */
export type PilarLinkMeta = { pilar: PilarMeta; id: string | null } | null

/** No máximo um vínculo de pilar por meta — o primeiro encontrado vence. */
export function pilarDaMeta(meta: Meta): PilarLinkMeta {
  if (meta.categoria_id) return { pilar: 'financeiro', id: meta.categoria_id }
  if (meta.materia_id) return { pilar: 'estudos', id: meta.materia_id }
  if (meta.tipo_treino_id) return { pilar: 'treino', id: meta.tipo_treino_id }
  if (meta.projeto_id) return { pilar: 'projetos', id: meta.projeto_id }
  if (meta.usa_peso_corporal) return { pilar: 'corporal', id: null }
  return null
}

export const CLASSE_COR_PILAR: Record<PilarMeta, string> = {
  financeiro: 'text-financeiro',
  estudos: 'text-estudos',
  treino: 'text-treino',
  projetos: 'text-projetos',
  // Peso corporal não é um pilar próprio no design system — vive dentro de
  // Treino (registro_corporal aparece em SecaoCorporal.tsx), então reaproveita
  // a cor em vez de inventar uma quinta.
  corporal: 'text-treino',
}

/**
 * Mesma paleta de `CLASSE_COR_PILAR`, como cor de preenchimento em vez de
 * texto — usada na listra de identidade do `CardMeta` (mesmo motivo de
 * `MiniCard.tsx`: estado/categoria lê antes do detalhe).
 */
export const CLASSE_BG_PILAR: Record<PilarMeta, string> = {
  financeiro: 'bg-financeiro',
  estudos: 'bg-estudos',
  treino: 'bg-treino',
  projetos: 'bg-projetos',
  corporal: 'bg-treino',
}

export const ROTULOS_PILAR_LINK: Record<PilarMeta, string> = {
  financeiro: 'Financeiro',
  estudos: 'Estudos',
  treino: 'Treino',
  projetos: 'Projetos',
  corporal: 'Peso corporal',
}
