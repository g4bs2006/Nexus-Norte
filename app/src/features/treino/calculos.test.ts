import { describe, expect, it } from 'vitest'
import {
  frequenciaSemana,
  progressaoCarga,
  sessoesPorData,
  sinalEstagnacao,
  umRmEstimado,
  volumeGrupoMuscular,
} from './calculos'

describe('umRmEstimado', () => {
  it('aplica a fórmula de Epley', () => {
    // 80 * (1 + 8/30) = 101.333…
    expect(umRmEstimado(80, 8)).toBeCloseTo(101.333, 3)
  })

  it('com 1 repetição devolve praticamente a própria carga', () => {
    expect(umRmEstimado(100, 1)).toBeCloseTo(103.333, 3)
  })

  it('confere com o valor calculado pelo trigger do Postgres', () => {
    // Mesmos números validados na migration da Fase 3
    expect(umRmEstimado(85, 6)).toBeCloseTo(102, 6)
    expect(umRmEstimado(70, 8)).toBeCloseTo(88.667, 3)
  })
})

describe('frequenciaSemana', () => {
  it('calcula o percentual de aderência', () => {
    expect(frequenciaSemana(3, 4).percentual).toBeCloseTo(75)
  })

  it('devolve null quando nada foi previsto', () => {
    expect(frequenciaSemana(2, 0).percentual).toBeNull()
  })

  it('permite passar de 100% quando treinou mais que o previsto', () => {
    expect(frequenciaSemana(5, 4).percentual).toBeCloseTo(125)
  })
})

describe('sessoesPorData', () => {
  it('agrupa séries por data mantendo o melhor 1RM de cada dia', () => {
    const sessoes = sessoesPorData([
      { data: '2026-08-01', carga_real: 80, reps_reais: 8 }, // 101.33
      { data: '2026-08-01', carga_real: 85, reps_reais: 6 }, // 102.00 <- melhor
      { data: '2026-07-25', carga_real: 75, reps_reais: 8 }, // 95.00
    ])

    expect(sessoes.map((s) => s.data)).toEqual(['2026-07-25', '2026-08-01'])
    expect(sessoes[1]?.melhor1rm).toBeCloseTo(102)
  })

  it('devolve vazio sem séries', () => {
    expect(sessoesPorData([])).toEqual([])
  })
})

describe('progressaoCarga', () => {
  it('detecta progressão', () => {
    expect(
      progressaoCarga([
        { data: '2026-07-25', melhor1rm: 95 },
        { data: '2026-08-01', melhor1rm: 102 },
      ]),
    ).toBe('subindo')
  })

  it('detecta queda', () => {
    expect(
      progressaoCarga([
        { data: '2026-07-25', melhor1rm: 102 },
        { data: '2026-08-01', melhor1rm: 95 },
      ]),
    ).toBe('caindo')
  })

  it('trata variação dentro da margem de 1% como estagnação', () => {
    expect(
      progressaoCarga([
        { data: '2026-07-25', melhor1rm: 100 },
        { data: '2026-08-01', melhor1rm: 100.5 },
      ]),
    ).toBe('estagnado')
  })

  it('fica indefinido com uma única sessão', () => {
    expect(progressaoCarga([{ data: '2026-08-01', melhor1rm: 100 }])).toBe(
      'indefinido',
    )
  })

  it('fica indefinido sem sessões', () => {
    expect(progressaoCarga([])).toBe('indefinido')
  })
})

describe('sinalEstagnacao', () => {
  it('sinaliza quando as últimas sessões não superam o melhor anterior', () => {
    const sessoes = [
      { data: '2026-07-01', melhor1rm: 105 },
      { data: '2026-07-08', melhor1rm: 100 },
      { data: '2026-07-15', melhor1rm: 101 },
      { data: '2026-07-22', melhor1rm: 100 },
    ]
    expect(sinalEstagnacao(sessoes, 3)).toBe(true)
  })

  it('não sinaliza quando houve novo recorde na janela recente', () => {
    const sessoes = [
      { data: '2026-07-01', melhor1rm: 100 },
      { data: '2026-07-08', melhor1rm: 101 },
      { data: '2026-07-15', melhor1rm: 102 },
      { data: '2026-07-22', melhor1rm: 110 },
    ]
    expect(sinalEstagnacao(sessoes, 3)).toBe(false)
  })

  it('não sinaliza sem histórico suficiente para julgar', () => {
    const sessoes = [
      { data: '2026-07-15', melhor1rm: 100 },
      { data: '2026-07-22', melhor1rm: 100 },
    ]
    expect(sinalEstagnacao(sessoes, 3)).toBe(false)
  })
})

describe('volumeGrupoMuscular', () => {
  it('soma reps × carga por grupo', () => {
    const volume = volumeGrupoMuscular([
      { grupo_muscular: 'peito', carga_real: 80, reps_reais: 8 }, // 640
      { grupo_muscular: 'peito', carga_real: 80, reps_reais: 6 }, // 480
      { grupo_muscular: 'costas', carga_real: 60, reps_reais: 10 }, // 600
    ])

    expect(volume).toEqual({ peito: 1120, costas: 600 })
  })

  it('agrupa séries sem grupo definido em "Sem grupo"', () => {
    const volume = volumeGrupoMuscular([
      { grupo_muscular: null, carga_real: 50, reps_reais: 10 },
    ])

    expect(volume).toEqual({ 'Sem grupo': 500 })
  })

  it('devolve objeto vazio sem séries', () => {
    expect(volumeGrupoMuscular([])).toEqual({})
  })
})
