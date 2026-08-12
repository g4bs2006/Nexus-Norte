import { addDays, subDays } from 'date-fns'
import { inicioSemana, paraISO } from '@/lib/datas'
import type { MetaCheckin } from './types'

/**
 * Cálculos de Metas. Funções puras (mesma convenção de sono/calculos.ts e
 * projetos/calculos.ts).
 */

/**
 * Dias consecutivos com check-in `feito=true`, contando a partir de hoje.
 *
 * Sem check-in hoje, o streak ainda pode estar "vivo" contando a partir de
 * ontem — só quebra quando falta um dia inteiro sem marcar.
 */
export function streakAtual(checkins: MetaCheckin[], hoje: Date): number {
  const feitos = new Set(
    checkins.filter((c) => c.feito).map((c) => c.data),
  )

  let cursor = feitos.has(paraISO(hoje)) ? hoje : subDays(hoje, 1)
  let streak = 0
  while (feitos.has(paraISO(cursor))) {
    streak += 1
    cursor = subDays(cursor, 1)
  }
  return streak
}

/** Quantos check-ins `feito=true` caem na semana (domingo a sábado) de `hoje`. */
export function checkinsNaSemana(checkins: MetaCheckin[], hoje: Date): number {
  const segunda = paraISO(inicioSemana(hoje))
  const domingo = paraISO(addDays(inicioSemana(hoje), 6))
  return checkins.filter(
    (c) => c.feito && c.data >= segunda && c.data <= domingo,
  ).length
}

/**
 * Progresso 0–100 de uma meta numérica. `null` quando falta alvo ou valor —
 * um card sem número não deve fingir 0% de progresso.
 */
export function progressoNumerico(
  valorAtual: number | null,
  valorAlvo: number | null,
): number | null {
  if (valorAtual === null || valorAlvo === null || valorAlvo <= 0) return null
  return Math.min(100, (valorAtual / valorAlvo) * 100)
}
