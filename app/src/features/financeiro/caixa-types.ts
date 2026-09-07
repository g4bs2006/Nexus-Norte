import type { Tables } from '@/types/database'

import type { NaturezaCategoria } from './types'

export type Cartao = Tables<'cartoes'>

export type TerminoEventoFinanceiro = 'indefinido' | 'data' | 'parcelas'

export type EventoFinanceiroPrevisto = Omit<
  Tables<'eventos_financeiros_previstos'>,
  'termino_tipo'
> & {
  termino_tipo: TerminoEventoFinanceiro
}

export type EventoFinanceiroDetalhado = EventoFinanceiroPrevisto & {
  categoria_nome: string
  categoria_natureza: NaturezaCategoria
  categoria_cor: string | null
}

export type SaldoReferenciaConta = Tables<'saldo_referencia_conta'>
