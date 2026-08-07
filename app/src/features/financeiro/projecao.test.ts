import { describe, expect, it } from 'vitest'
import {
  calcularParcelas,
  categoriasElegiveisParaMediaVariavel,
  mediaVariavelPorCategoria,
  mesesComHistorico,
  projetarFluxoCaixa,
  type CompromissoDetalhado,
  type ParceladaDetalhada,
} from './projecao'

function compromisso(
  parcial: Partial<CompromissoDetalhado>,
): CompromissoDetalhado {
  return {
    id: 'c1',
    descricao: 'Salário',
    categoria_id: 'cat-receita',
    categoria_natureza: 'receita',
    valor: 3000,
    dia_mes: 5,
    data_inicio: '2026-01-01',
    data_fim: null,
    created_at: '2026-01-01T00:00:00Z',
    ...parcial,
  }
}

function parcelada(parcial: Partial<ParceladaDetalhada>): ParceladaDetalhada {
  return {
    id: 'p1',
    descricao: 'Compra',
    categoria_id: 'cat-despesa',
    categoria_natureza: 'despesa',
    valor_total: 300,
    numero_parcelas: 3,
    data_primeira_parcela: '2026-08-01',
    juros_mensal: 0,
    created_at: '2026-08-01T00:00:00Z',
    ...parcial,
  }
}

describe('calcularParcelas', () => {
  it('absorve o resto de centavo inteiro na última parcela', () => {
    const parcelas = calcularParcelas(
      parcelada({ valor_total: 100, numero_parcelas: 3 }),
    )
    expect(parcelas.map((p) => p.valor)).toEqual([33.33, 33.33, 33.34])
    const soma = parcelas.reduce((total, p) => total + p.valor, 0)
    expect(Math.round(soma * 100) / 100).toBe(100)
  })

  it('gera uma parcela por mês a partir da primeira', () => {
    const parcelas = calcularParcelas(
      parcelada({ data_primeira_parcela: '2026-08-15', numero_parcelas: 3 }),
    )
    expect(parcelas.map((p) => p.mes)).toEqual([
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
    ])
  })

  it('aplica PMT quando há juros', () => {
    const parcelas = calcularParcelas(
      parcelada({ valor_total: 1000, numero_parcelas: 2, juros_mensal: 5 }),
    )
    // PMT = 1000*0.05 / (1 - 1.05^-2) ≈ 537.80
    expect(parcelas[0]?.valor).toBeCloseTo(537.8, 1)
    expect(parcelas[1]?.valor).toBeCloseTo(537.8, 1)
  })
})

describe('mediaVariavelPorCategoria', () => {
  it('calcula a média sobre os meses considerados, ignorando outras categorias', () => {
    const resumo = [
      { categoria_id: 'v1', mes: '2026-05-01', total: 100 },
      { categoria_id: 'v1', mes: '2026-06-01', total: 200 },
      { categoria_id: 'v1', mes: '2026-07-01', total: 300 },
      { categoria_id: 'fixo', mes: '2026-07-01', total: 999 },
    ]
    const resultado = mediaVariavelPorCategoria(
      resumo,
      new Set(['v1']),
      ['2026-05-01', '2026-06-01', '2026-07-01'],
    )
    expect(resultado).toEqual({ v1: 200 })
  })

  it('usa o que houver quando o histórico é mais curto que a janela', () => {
    const resumo = [{ categoria_id: 'v1', mes: '2026-07-01', total: 90 }]
    const resultado = mediaVariavelPorCategoria(
      resumo,
      new Set(['v1']),
      ['2026-05-01', '2026-06-01', '2026-07-01'],
    )
    expect(resultado.v1).toBe(90)
  })
})

describe('categoriasElegiveisParaMediaVariavel', () => {
  it('exclui categoria variável que já tem compromisso recorrente vinculado', () => {
    const categorias = [
      { id: 'energia', natureza: 'despesa', tipo: 'variavel' },
      { id: 'lanche', natureza: 'despesa', tipo: 'variavel' },
    ]
    const compromissos = [{ categoria_id: 'energia' }]
    const resultado = categoriasElegiveisParaMediaVariavel(categorias, compromissos)
    expect(resultado).toEqual(new Set(['lanche']))
  })

  it('ignora categorias fixas e de receita, com ou sem compromisso', () => {
    const categorias = [
      { id: 'aluguel', natureza: 'despesa', tipo: 'fixo' },
      { id: 'salario', natureza: 'receita', tipo: null },
    ]
    const resultado = categoriasElegiveisParaMediaVariavel(categorias, [])
    expect(resultado.size).toBe(0)
  })
})

describe('mesesComHistorico', () => {
  it('conta só os meses da janela que aparecem no resumo', () => {
    const resumo = [
      { mes: '2026-08-01' },
      { mes: '2026-08-01' }, // categoria diferente, mesmo mês — não deve contar 2x
    ]
    const resultado = mesesComHistorico(resumo, [
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
    ])
    expect(resultado).toBe(1)
  })

  it('devolve o tamanho da janela quando todos os meses têm dado', () => {
    const resumo = [{ mes: '2026-07-01' }, { mes: '2026-08-01' }]
    const resultado = mesesComHistorico(resumo, ['2026-07-01', '2026-08-01'])
    expect(resultado).toBe(2)
  })

  it('devolve 0 quando a janela é toda vazia', () => {
    expect(mesesComHistorico([], ['2026-08-01'])).toBe(0)
  })
})

describe('projetarFluxoCaixa', () => {
  it('mês corrente sai como real, a partir só de lançamentos', () => {
    const resultado = projetarFluxoCaixa({
      hoje: '2026-08-10',
      meses: 1,
      compromissos: [compromisso({ valor: 99999 })],
      parcelas: [],
      lancamentosRealizados: [
        { valor: 3000, data: '2026-08-05', categoria_natureza: 'receita' },
        { valor: 800, data: '2026-08-08', categoria_natureza: 'despesa' },
      ],
      mediaVariavelPorCategoria: {},
    })
    const mesAtual = resultado[0]

    expect(mesAtual?.fonte).toBe('real')
    expect(mesAtual?.receitaPrevista).toBe(3000)
    expect(mesAtual?.comprometido).toBe(800)
    expect(mesAtual?.saldoDoMes).toBe(2200)
  })

  it('meses futuros combinam compromissos, parcelas e variável estimado', () => {
    const resultado = projetarFluxoCaixa({
      hoje: '2026-08-10',
      meses: 2,
      compromissos: [
        compromisso({ valor: 3000, categoria_natureza: 'receita' }),
        compromisso({
          id: 'c2',
          valor: 1000,
          categoria_natureza: 'despesa',
          dia_mes: 10,
        }),
      ],
      parcelas: [parcelada({ valor_total: 300, numero_parcelas: 3 })],
      lancamentosRealizados: [],
      mediaVariavelPorCategoria: { v1: 200 },
    })

    const mesFuturo = resultado[1]
    expect(mesFuturo?.fonte).toBe('projetado')
    expect(mesFuturo?.receitaPrevista).toBe(3000)
    // 1000 fixo + 100 da parcela (300/3) + 200 variável
    expect(mesFuturo?.comprometido).toBe(1100)
    expect(mesFuturo?.variavelEstimado).toBe(200)
    expect(mesFuturo?.saldoDoMes).toBe(3000 - 1100 - 200)
  })

  it('receitaSobrescrita substitui a receita vinda de compromissos', () => {
    const resultado = projetarFluxoCaixa({
      hoje: '2026-08-10',
      meses: 2,
      compromissos: [compromisso({ valor: 3000 })],
      parcelas: [],
      lancamentosRealizados: [],
      mediaVariavelPorCategoria: {},
      receitaSobrescrita: { '2026-09-01': 5000 },
    })
    expect(resultado[1]?.receitaPrevista).toBe(5000)
  })

  it('acumula o saldo mês a mês', () => {
    const resultado = projetarFluxoCaixa({
      hoje: '2026-08-10',
      meses: 3,
      compromissos: [compromisso({ valor: 1000 })],
      parcelas: [],
      lancamentosRealizados: [],
      mediaVariavelPorCategoria: {},
    })
    expect(resultado[1]?.saldoAcumulado).toBe(resultado[1]?.saldoDoMes)
    expect(resultado[2]?.saldoAcumulado).toBe(
      (resultado[1]?.saldoDoMes ?? 0) + (resultado[2]?.saldoDoMes ?? 0),
    )
  })

  it('compraHipotetica soma às parcelas reais sem alterar o array recebido', () => {
    const parcelasReais = [parcelada({ id: 'real' })]
    const resultado = projetarFluxoCaixa({
      hoje: '2026-08-10',
      meses: 2,
      compromissos: [],
      parcelas: parcelasReais,
      lancamentosRealizados: [],
      mediaVariavelPorCategoria: {},
      compraHipotetica: parcelada({
        id: 'hipotetica',
        valor_total: 900,
        numero_parcelas: 3,
      }),
    })
    // 100 (real, 300/3) + 300 (hipotética, 900/3)
    expect(resultado[1]?.comprometido).toBe(400)
    expect(parcelasReais).toHaveLength(1)
  })
})
