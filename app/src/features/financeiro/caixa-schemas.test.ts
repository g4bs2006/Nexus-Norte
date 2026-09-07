import { describe, expect, it } from 'vitest'
import { schemaEventoFinanceiro } from './caixa-schemas'

const evento = { descricao: 'Teste', categoria_id: '123e4567-e89b-42d3-a456-426614174000', data_inicio: '2026-01-01', dia_mes: 1, termino_tipo: 'data', data_fim: '2026-12-31', valor: 100, numero_parcelas: 3, juros_mensal: 0 }

describe('datas de eventos financeiros', () => {
  it.each(['2026-02-30', '2026-13-01', '0000-01-01'])('rejeita início inexistente %s', data_inicio => {
    expect(schemaEventoFinanceiro.safeParse({ ...evento, data_inicio }).success).toBe(false)
  })
  it('rejeita término inexistente', () => {
    expect(schemaEventoFinanceiro.safeParse({ ...evento, data_fim: '2026-02-30' }).success).toBe(false)
  })
  it('aceita dia bissexto real', () => {
    expect(schemaEventoFinanceiro.safeParse({ ...evento, data_inicio: '2028-02-29', data_fim: '2028-03-01' }).success).toBe(true)
  })
})
