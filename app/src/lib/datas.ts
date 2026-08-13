import {
  endOfMonth,
  format,
  getDate,
  getDaysInMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'

/**
 * Helpers de data compartilhados entre pilares.
 *
 * Convenção: datas trafegam como `YYYY-MM-DD` (tipo `date` do Postgres) e são
 * parseadas com `parseISO`, nunca com `new Date(string)` — este último
 * interpreta `YYYY-MM-DD` como UTC e desloca o dia em fusos negativos como o
 * do Brasil.
 */

/** Formato usado pelas colunas `date` do Postgres. */
export const FORMATO_DATA = 'yyyy-MM-dd'

export function paraISO(data: Date): string {
  return format(data, FORMATO_DATA)
}

export function deISO(data: string): Date {
  return parseISO(data)
}

/** Primeiro dia do mês de `data`, em ISO. Chave usada nas views mensais. */
export function mesDeISO(data: Date): string {
  return paraISO(startOfMonth(data))
}

/**
 * Dias que ainda restam no mês, contando o dia atual.
 * Nunca retorna 0 — no último dia do mês, resta 1 (o próprio dia).
 */
export function diasRestantesNoMes(data: Date): number {
  return getDaysInMonth(data) - getDate(data) + 1
}

/**
 * Domingo da semana de `data` — a semana do sistema inteiro.
 *
 * `weekStartsOn` fica explícito de propósito, apesar de `lib/locale.ts` já
 * definir o mesmo default: o comentário de lá registra que um default
 * implícito já desalinhou o cálculo antes. A redundância é o para-raios.
 */
export function inicioSemana(data: Date): Date {
  return startOfWeek(data, { weekStartsOn: 0 })
}

/**
 * Os N meses terminando no mês de `data`, do mais antigo para o mais recente.
 * Usado pelo gráfico de tendência de 6 meses (plano 2.3).
 */
export function ultimosMeses(data: Date, quantidade: number): string[] {
  const meses: string[] = []
  for (let i = quantidade - 1; i >= 0; i -= 1) {
    meses.push(mesDeISO(subMonths(data, i)))
  }
  return meses
}

export function limitesDoMes(data: Date): { inicio: string; fim: string } {
  return { inicio: paraISO(startOfMonth(data)), fim: paraISO(endOfMonth(data)) }
}

const FORMATADOR_MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatarMoeda(valor: number): string {
  return FORMATADOR_MOEDA.format(valor)
}

/**
 * Duração em minutos como a gente fala: `210` → `3h30`; `60` → `1h`; `45` →
 * `45min`; `0` → `—`.
 *
 * Vivia em `features/calendario/carga.ts` como `formatarCarga`, e de lá era
 * importada por `features/fluxograma` — criando um ciclo entre as duas
 * features por causa de sete linhas de formatação. Formatar duração não é
 * domínio de calendário nenhum: é o mesmo tipo de regra que `formatarMoeda`
 * logo acima, e mora no mesmo lugar.
 */
export function formatarDuracao(minutos: number): string {
  if (minutos <= 0) return '—'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

const FORMATADOR_MES = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: '2-digit',
})

/** 'ago/26' — rótulo compacto para eixos de gráfico. */
export function rotuloMes(mesISO: string): string {
  return FORMATADOR_MES.format(deISO(mesISO)).replace('.', '')
}
