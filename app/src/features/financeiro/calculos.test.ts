import { describe, expect, it } from 'vitest'
import {
  agruparPorDia,
  composicaoGastos,
  gastoDisponivelGeral,
  gastoDisponivelPlanejado,
  metaEfetiva,
  metaTotalDespesas,
  progressoCategoria,
  rankingGastos,
  saldoProjetadoFimMes,
  statusDiario,
  tendenciaMensal,
  totaisDoMes,
  totaisDoPeriodo,
} from './calculos'
import type { Categoria, NaturezaCategoria } from './types'

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
    expect(metaEfetiva({ meta_mensal: 500, meta_tipo: 'valor' }, 5000)).toBe(
      500,
    )
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

describe('totaisDoPeriodo', () => {
  const lanc = (
    id: string,
    valor: number,
    natureza: string,
    data = '2026-08-05',
  ) => ({ id, valor, data, categoria_natureza: natureza })

  it('separa entrada de saída pela natureza da categoria', () => {
    const totais = totaisDoPeriodo([
      lanc('1', 4200, 'receita'),
      lanc('2', 182.4, 'despesa'),
      lanc('3', 24.9, 'despesa'),
    ])

    expect(totais.entradas).toBeCloseTo(4200)
    expect(totais.saidas).toBeCloseTo(207.3)
    expect(totais.saldo).toBeCloseTo(3992.7)
    expect(totais.quantidade).toBe(3)
  })

  it('devolve saldo negativo quando saiu mais do que entrou', () => {
    const totais = totaisDoPeriodo([lanc('1', 500, 'despesa')])
    expect(totais.saldo).toBe(-500)
  })

  it('zera tudo sem lançamentos', () => {
    expect(totaisDoPeriodo([])).toEqual({
      entradas: 0,
      saidas: 0,
      saldo: 0,
      quantidade: 0,
    })
  })
})

describe('composicaoGastos', () => {
  const cat = (
    nome: string,
    total: number,
    cor: string | null = null,
    natureza: NaturezaCategoria = 'despesa',
  ) => ({
    id: nome,
    nome,
    total_gasto_mes: total,
    cor,
    natureza,
  })

  it('ordena do maior para o menor e calcula o percentual do total', () => {
    const resultado = composicaoGastos([
      cat('Mercado', 400, '#ff0000'),
      cat('Transporte', 100),
      cat('Lazer', 500, '#00ff00'),
    ])

    expect(resultado.map((e) => e.nome)).toEqual([
      'Lazer',
      'Mercado',
      'Transporte',
    ])
    expect(resultado[0]).toMatchObject({
      nome: 'Lazer',
      total: 500,
      cor: '#00ff00',
      percentual: 50,
    })
    expect(resultado[2]?.percentual).toBeCloseTo(10)
  })

  it('exclui categoria de receita mesmo com total_gasto_mes preenchido', () => {
    const resultado = composicaoGastos([
      cat('Mercado', 200),
      cat('Salário', 5000, null, 'receita'),
    ])
    expect(resultado.map((e) => e.nome)).toEqual(['Mercado'])
    expect(resultado[0]?.percentual).toBe(100)
  })

  it('exclui categoria sem gasto no mês', () => {
    const resultado = composicaoGastos([cat('Mercado', 200), cat('Lazer', 0)])
    expect(resultado.map((e) => e.nome)).toEqual(['Mercado'])
    expect(resultado[0]?.percentual).toBe(100)
  })

  it('respeita o limite', () => {
    const resultado = composicaoGastos(
      [cat('A', 300), cat('B', 200), cat('C', 100)],
      2,
    )
    expect(resultado).toHaveLength(2)
  })

  it('devolve vazio sem categoria com gasto', () => {
    expect(composicaoGastos([cat('Mercado', 0)])).toEqual([])
  })
})

describe('tendenciaMensal', () => {
  const resumo = [
    { categoria_id: 'salario', mes: '2026-07-01', total: 5000 },
    { categoria_id: 'mercado', mes: '2026-07-01', total: 800 },
    { categoria_id: 'lazer', mes: '2026-07-01', total: 200 },
    { categoria_id: 'salario', mes: '2026-08-01', total: 5200 },
    { categoria_id: 'mercado', mes: '2026-08-01', total: 900 },
  ]
  const idsReceita = new Set(['salario'])

  it('soma gasto (por ids) e receita por mês, e calcula o saldo', () => {
    const idsGasto = new Set(['mercado', 'lazer'])
    const pontos = tendenciaMensal(
      resumo,
      ['2026-07-01', '2026-08-01'],
      idsGasto,
      idsReceita,
    )

    expect(pontos).toEqual([
      { mes: '2026-07-01', gasto: 1000, receita: 5000, saldo: 4000 },
      { mes: '2026-08-01', gasto: 900, receita: 5200, saldo: 4300 },
    ])
  })

  it('filtra o gasto por uma única categoria sem afetar a receita', () => {
    const pontos = tendenciaMensal(
      resumo,
      ['2026-07-01', '2026-08-01'],
      new Set(['lazer']),
      idsReceita,
    )

    expect(pontos).toEqual([
      { mes: '2026-07-01', gasto: 200, receita: 5000, saldo: 4800 },
      { mes: '2026-08-01', gasto: 0, receita: 5200, saldo: 5200 },
    ])
  })

  it('devolve zeros para mês sem dado nenhum, sem inventar o mês', () => {
    const pontos = tendenciaMensal(
      [],
      ['2026-07-01'],
      new Set(['x']),
      new Set(['y']),
    )
    expect(pontos).toEqual([
      { mes: '2026-07-01', gasto: 0, receita: 0, saldo: 0 },
    ])
  })

  it('saldo fica negativo quando o gasto passa a receita', () => {
    const pontos = tendenciaMensal(
      [
        { categoria_id: 'salario', mes: '2026-08-01', total: 1000 },
        { categoria_id: 'mercado', mes: '2026-08-01', total: 1500 },
      ],
      ['2026-08-01'],
      new Set(['mercado']),
      new Set(['salario']),
    )
    expect(pontos[0]?.saldo).toBe(-500)
  })
})

describe('agruparPorDia', () => {
  const lanc = (id: string, data: string, valor: number, natureza: string) => ({
    id,
    data,
    valor,
    categoria_natureza: natureza,
  })

  it('agrupa por data, do mais recente para o mais antigo', () => {
    const dias = agruparPorDia([
      lanc('1', '2026-08-03', 100, 'despesa'),
      lanc('2', '2026-08-05', 50, 'despesa'),
      lanc('3', '2026-08-05', 30, 'despesa'),
    ])

    expect(dias.map((d) => d.data)).toEqual(['2026-08-05', '2026-08-03'])
    expect(dias[0]?.lancamentos).toHaveLength(2)
    expect(dias[1]?.lancamentos).toHaveLength(1)
  })

  it('calcula o saldo do dia misturando entrada e saída', () => {
    const dias = agruparPorDia([
      lanc('1', '2026-08-05', 4200, 'receita'),
      lanc('2', '2026-08-05', 200, 'despesa'),
    ])

    expect(dias[0]?.saldo).toBeCloseTo(4000)
  })

  it('não inventa dias vazios entre as datas', () => {
    const dias = agruparPorDia([
      lanc('1', '2026-08-01', 10, 'despesa'),
      lanc('2', '2026-08-31', 10, 'despesa'),
    ])

    expect(dias).toHaveLength(2)
  })

  it('devolve vazio sem lançamentos', () => {
    expect(agruparPorDia([])).toEqual([])
  })
})
