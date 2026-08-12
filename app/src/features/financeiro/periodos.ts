import {
  addDays,
  endOfMonth,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { inicioSemana, paraISO } from '@/lib/datas'

/**
 * Períodos prontos para a lista de lançamentos (resolução 10.23).
 *
 * Existem porque digitar duas datas para responder "o que gastei esta semana" é
 * fricção pura — a pergunta frequente merece um clique. O intervalo livre continua
 * disponível para o resto.
 *
 * Funções puras: `hoje` entra como parâmetro (plano, seção 9).
 */

export interface Periodo {
  de: string
  ate: string
}

export type PresetPeriodo =
  'hoje' | 'semana' | 'mes' | 'mes-passado' | 'ultimos-30' | 'livre'

export const PRESETS: readonly { valor: PresetPeriodo; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'semana', rotulo: 'Esta semana' },
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'mes-passado', rotulo: 'Mês passado' },
  { valor: 'ultimos-30', rotulo: 'Últimos 30 dias' },
  { valor: 'livre', rotulo: 'Período livre' },
]

/**
 * Intervalo de um preset.
 *
 * `livre` devolve o mês corrente como ponto de partida: abrir com os campos
 * vazios mostraria uma lista vazia, que parece "não tenho lançamentos" em vez de
 * "escolha um período".
 */
export function intervaloDoPreset(preset: PresetPeriodo, hoje: Date): Periodo {
  const hojeISO = paraISO(hoje)

  switch (preset) {
    case 'hoje':
      return { de: hojeISO, ate: hojeISO }
    case 'semana': {
      const inicio = inicioSemana(hoje)
      return { de: paraISO(inicio), ate: paraISO(addDays(inicio, 6)) }
    }
    case 'mes-passado': {
      const mes = subMonths(hoje, 1)
      return { de: paraISO(startOfMonth(mes)), ate: paraISO(endOfMonth(mes)) }
    }
    case 'ultimos-30':
      return { de: paraISO(addDays(hoje, -29)), ate: hojeISO }
    case 'mes':
    case 'livre':
      return {
        de: paraISO(startOfMonth(hoje)),
        ate: paraISO(endOfMonth(hoje)),
      }
  }
}
