import { describe, expect, it } from 'vitest'
import {
  gastoDisponivelGeral,
  gastoDisponivelPlanejado,
  metaEfetiva,
  metaTotalDespesas,
  progressoCategoria,
  rankingGastos,
  saldoProjetadoFimMes,
  statusDiario,
  totaisDoMes,
} from './calculos'
import type { Categoria } from './types'

function categoria(parcial: Partial<Categoria>): Categoria {
  return {
    id: 'id',
    nome: 'Categoria',
    natureza: 'despesa',
    tipo: 'variavel',
    meta_mensal: null,
    meta_tipo: null,
    cor: null,
    subcategoria_pai_id: null,
    total_gasto_mes: 0,
    created_at: '2026-08-01T00:00:00Z',
    ...parcial,
  }
}

describe('metaEfetiva', () => {
  it('devolve o valor absoluto quando meta_tipo é valor', () => {
    expect(metaEfetiva({ meta_mensal: 500, meta_tipo: 'valor' }, 5000)).toBe(500)
  })

  it('resolve percentual da renda contra a receita do mês', () => {
    expect(
      metaEfetiva({ meta_mensal: 10, meta_tipo: 'percentual_renda' }, 5000),
    ).toBe(500)
  })

  it('devolve null quando não há meta', () => {
    expect(metaEfetiva({ meta_mensal: null, meta_tipo: null }, 5000)).toBeNull()
  })

  it('zera a meta percentual quando não houve receita no mês', () => {
    expect(
      metaEfetiva({ meta_mensal: 10, meta_tipo: 'percentual_renda' }, 0),
    ).toBe(0)
  })
})

describe('gastoDisponivelGeral', () => {
  it('distribui o restante da meta pelos dias que sobram', () => {
    expect(gastoDisponivelGeral(1000, 400, 10)).toBe(60)
  })

  it('não devolve valor negativo quando a meta estourou', () => {
    expect(gastoDisponivelGeral(1000, 1500, 10)).toBe(0)
  })

  it('protege contra divisão por zero', () => {
    expect(gastoDisponivelGeral(1000, 0, 0)).toBe(0)
  })

  it('no último dia do mês concentra todo o restante', () => {
    expect(gastoDisponivelGeral(1000, 700, 1)).toBe(300)
  })
})

describe('gastoDisponivelPlanejado', () => {
  const planejamentos = [
    { dia_semana: 1, valor_planejado: 50 },
    { dia_semana: 1, valor_planejado: 30 },
    { dia_semana: 2, valor_planejado: 20 },
  ]

  it('soma apenas o dia pedido', () => {
    expect(gastoDisponivelPlanejado(planejamentos, 1)).toBe(80)
  })

  it('devolve 0 para dia sem planejamento', () => {
    expect(gastoDisponivelPlanejado(planejamentos, 5)).toBe(0)
  })
})

describe('statusDiario', () => {
  it('fica verde quando o gasto respeita o planejado', () => {
    expect(statusDiario(40, 50)).toBe('ok')
  })

  it('fica verde no limite exato', () => {
    expect(statusDiario(50, 50)).toBe('ok')
  })

  it('fica vermelho ao estourar', () => {
    expect(statusDiario(60, 50)).toBe('risco')
  })

  it('trata dia sem planejamento como fora do plano se houve gasto', () => {
    expect(statusDiario(10, 0)).toBe('risco')
    expect(statusDiario(0, 0)).toBe('ok')
  })
})

describe('progressoCategoria', () => {
  it('calcula o percentual consumido', () => {
    expect(progressoCategoria(250, 500)).toBe(50)
  })

  it('permite passar de 100 sem truncar', () => {
    expect(progressoCategoria(600, 500)).toBe(120)
  })

  it('devolve null sem meta comparável', () => {
    expect(progressoCategoria(100, null)).toBeNull()
    expect(progressoCategoria(100, 0)).toBeNull()
  })
})

describe('rankingGastos', () => {
  const entradas = [
    { categoria_id: 'a', nome: 'A', total: 100 },
    { categoria_id: 'b', nome: 'B', total: 300 },
    { categoria_id: 'c', nome: 'C', total: 200 },
  ]

  it('ordena do maior para o menor', () => {
    expect(rankingGastos(entradas).map((e) => e.nome)).toEqual(['B', 'C', 'A'])
  })

  it('respeita o limite', () => {
    expect(rankingGastos(entradas, 2).map((e) => e.nome)).toEqual(['B', 'C'])
  })

  it('não modifica o array recebido', () => {
    const copia = [...entradas]
    rankingGastos(entradas)
    expect(entradas).toEqual(copia)
  })
})

describe('saldoProjetadoFimMes', () => {
  it('extrapola o ritmo de gasto para o mês inteiro', () => {
    // 300 gastos em 10 dias = 30/dia -> 930 em 31 dias; 5000 - 930 = 4070
    expect(
      saldoProjetadoFimMes({
        receitaDoMes: 5000,
        gastoAteAgora: 300,
        diaAtual: 10,
        diasNoMes: 31,
      }),
    ).toBe(4070)
  })

  it('pode projetar saldo negativo', () => {
    expect(
      saldoProjetadoFimMes({
        receitaDoMes: 1000,
        gastoAteAgora: 900,
        diaAtual: 10,
        diasNoMes: 30,
      }),
    ).toBe(-1700)
  })

  it('devolve a receita quando ainda não há dia decorrido', () => {
    expect(
      saldoProjetadoFimMes({
        receitaDoMes: 5000,
        gastoAteAgora: 0,
        diaAtual: 0,
        diasNoMes: 31,
      }),
    ).toBe(5000)
  })
})

describe('totaisDoMes', () => {
  it('separa receita de despesa e calcula o saldo', () => {
    const categorias = [
      categoria({ natureza: 'receita', tipo: null, total_gasto_mes: 5000 }),
      categoria({ natureza: 'despesa', total_gasto_mes: 1200 }),
      categoria({ natureza: 'despesa', total_gasto_mes: 800 }),
    ]

    expect(totaisDoMes(categorias)).toEqual({
      receita: 5000,
      despesa: 2000,
      saldo: 3000,
    })
  })

  it('devolve zeros sem categorias', () => {
    expect(totaisDoMes([])).toEqual({ receita: 0, despesa: 0, saldo: 0 })
  })
})

describe('metaTotalDespesas', () => {
  it('soma metas absolutas e percentuais, ignorando receitas', () => {
    const categorias = [
      categoria({ meta_mensal: 500, meta_tipo: 'valor' }),
      categoria({ meta_mensal: 10, meta_tipo: 'percentual_renda' }), // 10% de 5000
      categoria({ natureza: 'receita', tipo: null, meta_mensal: null }),
      categoria({ meta_mensal: null, meta_tipo: null }), // sem meta, conta 0
    ]

    expect(metaTotalDespesas(categorias, 5000)).toBe(1000)
  })
})
