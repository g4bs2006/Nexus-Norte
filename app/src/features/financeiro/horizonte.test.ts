import { describe, expect, it } from 'vitest'
import { calcularDataCaixa, expandirEventos, projetarHorizonteDiario, menorSaldoAteProximaReceita, statusHorizonte } from './horizonte'
import type { EventoFinanceiroDetalhado } from './caixa-types'

const evento = (patch: Partial<EventoFinanceiroDetalhado> = {}): EventoFinanceiroDetalhado => ({
  id: 'aluguel', descricao: 'Aluguel', categoria_id: 'moradia', categoria_nome: 'Moradia', categoria_cor: null,
  categoria_natureza: 'despesa', data_inicio: '2026-09-01', dia_mes: 5,
  termino_tipo: 'indefinido', data_fim: null, valor: 1350, valor_total: null,
  numero_parcelas: null, juros_mensal: null, created_at: '', ...patch,
})

describe('ciclo do cartão', () => {
  it.each([
    ['2026-09-20', 20, 28, '2026-09-28'],
    ['2026-09-21', 20, 28, '2026-10-28'],
    ['2026-09-28', 28, 5, '2026-10-05'],
    ['2026-12-29', 28, 5, '2027-02-05'],
    ['2027-02-28', 31, 31, '2027-03-31'],
    ['2028-02-29', 29, 31, '2028-02-29'],
  ])('%s fechamento %i vencimento %i', (data, dia_fechamento, dia_vencimento, esperado) => {
    expect(calcularDataCaixa(data, { dia_fechamento, dia_vencimento })).toBe(esperado)
  })
})

describe('eventos únicos', () => {
  it('preserva data e centavo da última parcela', () => {
    const compra = evento({ termino_tipo: 'parcelas', data_inicio: '2026-01-31', dia_mes: 31, valor: null, valor_total: 100, numero_parcelas: 3, juros_mensal: 0 })
    expect(expandirEventos([compra], '2026-01-01', '2026-05-01').map(o => [o.data, o.valor])).toEqual([
      ['2026-01-31', 33.33], ['2026-02-28', 33.33], ['2026-03-31', 33.34],
    ])
  })
  it('respeita término por data', () => {
    expect(expandirEventos([evento({ termino_tipo: 'data', data_fim: '2026-10-04' })], '2026-09-01', '2026-12-01')).toHaveLength(1)
  })
})

const base = {
  hoje: '2026-09-04', dias: 3, saldoReferencia: { data: '2026-09-01', valor: 2000 },
  eventos: [evento()], lancamentos: [], orcamentoMensalVariavel: 0,
  categoriasVariaveis: new Set<string>(), colchaoMinimo: 100, colchaoConfortavel: 500,
}
const pagamento = { id: 'p', data: '2026-09-03', data_caixa: '2026-09-03', valor: 1350, categoria_id: 'moradia', categoria_natureza: 'despesa' as const, evento_id: 'aluguel', competencia_evento: '2026-09-05', cartao_id: null, descricao: 'Aluguel' }

describe('Horizonte de caixa', () => {
  it('pagamento antecipado elimina só sua ocorrência prevista', () => {
    expect(projetarHorizonteDiario({ ...base, lancamentos: [pagamento] }).map(d => d.saldoFinal)).toEqual([650, 650, 650])
  })
  it('parcial mantém o restante, excedente permanece integralmente real', () => {
    expect(projetarHorizonteDiario({ ...base, lancamentos: [{ ...pagamento, valor: 675 }] }).map(d => d.saldoFinal)).toEqual([1325, 650, 650])
    expect(projetarHorizonteDiario({ ...base, lancamentos: [{ ...pagamento, valor: 1400 }] }).map(d => d.saldoFinal)).toEqual([600, 600, 600])
  })
  it('vencido não quitado entra hoje como pendência uma única vez', () => {
    const dias = projetarHorizonteDiario({ ...base, hoje: '2026-09-06' })
    expect(dias.map(d => d.saldoFinal)).toEqual([650, 650, 650])
    expect(dias[0]?.movimentos[0]?.vencido).toBe(true)
  })
  it('agrupa crédito futuro em uma fatura sem duplicar despesa', () => {
    const dias = projetarHorizonteDiario({ ...base, eventos: [], lancamentos: [
      { ...pagamento, evento_id: null, competencia_evento: null, cartao_id: 'nubank', data_caixa: '2026-09-05', valor: 100 },
      { ...pagamento, id: 'p2', evento_id: null, competencia_evento: null, cartao_id: 'nubank', data_caixa: '2026-09-05', valor: 50 },
    ] })
    expect(dias[1]?.saidas).toBe(150)
    expect(dias[1]?.movimentos).toHaveLength(1)
    expect(dias[1]?.movimentos[0]?.itens).toHaveLength(2)
    expect(dias[2]?.saldoFinal).toBe(1850)
  })
  it('uma retirada é aplicada uma vez e não altera entradas', () => {
    const params = { ...base, eventos: [], retiradaHipotetica: { data: '2026-09-05', valor: 100 } }
    const original = structuredClone(params)
    expect(projetarHorizonteDiario(params).map(d => d.saldoFinal)).toEqual([2000, 1900, 1900])
    expect(params).toEqual(original)
  })
  it('orçamento diário usa o tamanho de cada mês e desconta gasto já feito hoje', () => {
    const dias = projetarHorizonteDiario({ ...base, hoje: '2026-09-30', dias: 2, eventos: [], orcamentoMensalVariavel: 930, categoriasVariaveis: new Set(['moradia']), lancamentos: [{ ...pagamento, data: '2026-09-30', data_caixa: '2026-09-30', valor: 11, evento_id: null, competencia_evento: null }] })
    expect(dias.map(d => d.saidas)).toEqual([31, 30])
  })
  it('referência é abertura do dia, ignora caixa anterior e admite dia misto', () => {
    const dias = projetarHorizonteDiario({ ...base, saldoReferencia: { data: '2026-09-04', valor: 500 }, lancamentos: [pagamento], orcamentoMensalVariavel: 300 })
    expect(dias[0]?.saldoInicial).toBe(500)
    expect(dias[1]?.saldoFinal).toBe(480)
  })
  it('mínimo exclui dia da receita e não inventa receita ausente', () => {
    const dias = projetarHorizonteDiario(base)
    expect(menorSaldoAteProximaReceita(dias, '2026-09-06')?.saldoFinal).toBe(650)
    expect(menorSaldoAteProximaReceita(dias, null)).toBeNull()
  })
  it.each([[-1, 'critico'], [0, 'atencao'], [100, 'ok'], [500, 'otimo']])('limite %i', (saldo, status) => {
    expect(statusHorizonte(saldo as number, 100, 500)).toBe(status)
  })
})
