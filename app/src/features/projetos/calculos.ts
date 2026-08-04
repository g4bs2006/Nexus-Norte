import { differenceInCalendarDays } from 'date-fns'
import { DIAS_MOMENTUM_BAIXO } from '@/lib/constants'
import { deISO } from '@/lib/datas'
import type { LogProgresso, MarcoProjeto } from './types'

/**
 * Cálculos de Projetos (plano, seção 5.2).
 *
 * Ambas as métricas são calculadas na leitura (resolução 10.9) — em especial o
 * momentum, que muda com o tempo sem nenhuma escrita acontecer.
 */

/**
 * Percentual de marcos concluídos (plano 5.2).
 * Retorna `null` quando o projeto ainda não tem marcos — 0% daria a impressão
 * falsa de um projeto parado, quando na verdade ele não foi decomposto.
 */
export function percentualConcluido(
  marcos: readonly Pick<MarcoProjeto, 'status'>[],
): number | null {
  if (marcos.length === 0) return null
  const feitos = marcos.filter((marco) => marco.status === 'feito').length
  return (feitos / marcos.length) * 100
}

/**
 * Dias desde o último log de progresso (plano 5.2).
 * Retorna `null` quando nunca houve log — diferente de "faz muito tempo".
 */
export function diasDesdeUltimaAtualizacao(
  logs: readonly Pick<LogProgresso, 'data'>[],
  hoje: Date,
): number | null {
  let maisRecente: string | null = null
  for (const log of logs) {
    if (maisRecente === null || log.data > maisRecente) maisRecente = log.data
  }
  if (maisRecente === null) return null
  return Math.max(differenceInCalendarDays(hoje, deISO(maisRecente)), 0)
}

/**
 * Momentum baixo: o card esfria visualmente após X dias sem log (plano 5.3).
 *
 * Projeto sem nenhum log conta como momentum baixo — nunca recebeu atenção, o
 * que é exatamente o que o indicador deve destacar. Projetos concluídos ficam
 * fora: não se espera mais movimento neles.
 */
export function momentumBaixo(
  diasSemAtualizacao: number | null,
  limite: number = DIAS_MOMENTUM_BAIXO,
): boolean {
  if (diasSemAtualizacao === null) return true
  return diasSemAtualizacao >= limite
}
