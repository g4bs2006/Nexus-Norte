import { describe, expect, it } from 'vitest'
import {
  formatarDuracao,
  frequenciaSemana,
  progressaoCarga,
  recordesPorExercicio,
  sessoesPorData,
  sessoesRealizadas,
  sinalEstagnacao,
  umRmEstimado,
  volumeGrupoMuscular,
  type SerieDeSessao,
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

describe('recordesPorExercicio', () => {
  /**
   * Um PR por linha de `personal_records`; a função reduz para um por exercício
   * base. Este caso é exatamente o bug da resolução 10.18: o mesmo movimento
   * registrado em dois treinos aparecia duas vezes na lista de recordes.
   */
  const pr = (
    base: string,
    nome: string,
    um_rm_estimado: number,
    data: string,
  ) => ({
    exercicio_base_id: base,
    exercicio_nome: nome,
    um_rm_estimado,
    carga: 100,
    reps: 5,
    data,
  })

  it('mantém só o melhor 1RM de cada exercício base', () => {
    const recordes = recordesPorExercicio([
      pr('supino', 'Supino', 110, '2026-01-10'),
      pr('supino', 'Supino', 125, '2026-02-10'),
      pr('supino', 'Supino', 118, '2026-03-10'),
    ])

    expect(recordes).toHaveLength(1)
    expect(recordes[0]?.melhor1rm).toBe(125)
    expect(recordes[0]?.data).toBe('2026-02-10')
  })

  it('não deixa um PR mais recente e mais fraco sobrescrever o melhor', () => {
    const recordes = recordesPorExercicio([
      pr('agacho', 'Agachamento', 140, '2026-01-10'),
      pr('agacho', 'Agachamento', 130, '2026-05-10'),
    ])

    expect(recordes[0]?.melhor1rm).toBe(140)
  })

  it('ordena por 1RM decrescente', () => {
    const recordes = recordesPorExercicio([
      pr('rosca', 'Rosca', 40, '2026-01-10'),
      pr('terra', 'Terra', 180, '2026-01-10'),
      pr('supino', 'Supino', 120, '2026-01-10'),
    ])

    expect(recordes.map((r) => r.exercicio_base_id)).toEqual([
      'terra',
      'supino',
      'rosca',
    ])
  })

  it('devolve lista vazia sem recordes', () => {
    expect(recordesPorExercicio([])).toEqual([])
  })
})

describe('sessoesRealizadas', () => {
  function serie(
    parcial: Partial<SerieDeSessao> & { execucao_treino_id: string },
  ): SerieDeSessao {
    return {
      id: `s-${Math.abs(parcial.carga_real ?? 0)}-${parcial.reps_reais ?? 0}`,
      exercicio_id: 'ex-treino-1',
      exercicio_base_id: 'supino',
      carga_real: 100,
      reps_reais: 5,
      rpe: null,
      data: '2026-08-05',
      treino_id: 'treino-push',
      execucao_criada_em: '2026-08-05T18:00:00.000Z',
      execucao_finalizada_em: '2026-08-05T19:35:00.000Z',
      grupo_muscular: 'peito',
      exercicio_nome: 'Supino Reto',
      ...parcial,
    }
  }

  it('agrupa por sessão, não por data', () => {
    // Dois treinos no mesmo dia: sem unique em (treino_id, data) isso é legítimo,
    // e antes virava uma massa indistinguível
    const sessoes = sessoesRealizadas([
      serie({ execucao_treino_id: 'manha', treino_id: 'push' }),
      serie({ execucao_treino_id: 'noite', treino_id: 'pull' }),
    ])

    expect(sessoes).toHaveLength(2)
    expect(sessoes.map((s) => s.treino_id).sort()).toEqual(['pull', 'push'])
  })

  it('soma volume e conta as séries', () => {
    const sessoes = sessoesRealizadas([
      serie({ execucao_treino_id: 'a', carga_real: 100, reps_reais: 5 }),
      serie({ execucao_treino_id: 'a', carga_real: 100, reps_reais: 4 }),
      serie({ execucao_treino_id: 'a', carga_real: 80, reps_reais: 8 }),
    ])

    expect(sessoes[0]?.totalSeries).toBe(3)
    expect(sessoes[0]?.volume).toBe(500 + 400 + 640)
  })

  it('agrupa as séries por exercício, na ordem em que apareceram', () => {
    const sessoes = sessoesRealizadas([
      serie({
        execucao_treino_id: 'a',
        exercicio_base_id: 'supino',
        exercicio_nome: 'Supino',
        reps_reais: 5,
      }),
      serie({
        execucao_treino_id: 'a',
        exercicio_base_id: 'remada',
        exercicio_nome: 'Remada',
        reps_reais: 10,
      }),
      serie({
        execucao_treino_id: 'a',
        exercicio_base_id: 'supino',
        exercicio_nome: 'Supino',
        reps_reais: 4,
      }),
    ])

    const exercicios = sessoes[0]?.exercicios ?? []
    expect(exercicios.map((e) => e.nome)).toEqual(['Supino', 'Remada'])
    expect(exercicios[0]?.series).toHaveLength(2)
    expect(exercicios[1]?.series).toHaveLength(1)
  })

  it('calcula a duração entre a primeira série e o encerramento', () => {
    const sessoes = sessoesRealizadas([
      serie({
        execucao_treino_id: 'a',
        execucao_criada_em: '2026-08-05T18:00:00.000Z',
        execucao_finalizada_em: '2026-08-05T19:35:00.000Z',
      }),
    ])

    expect(sessoes[0]?.duracaoMinutos).toBe(95)
  })

  it('deixa a duração nula enquanto está em andamento', () => {
    const sessoes = sessoesRealizadas([
      serie({ execucao_treino_id: 'a', execucao_finalizada_em: null }),
    ])

    expect(sessoes[0]?.emAndamento).toBe(true)
    expect(sessoes[0]?.duracaoMinutos).toBe(null)
  })

  it('põe a sessão em andamento no topo, depois as mais recentes', () => {
    const sessoes = sessoesRealizadas([
      serie({ execucao_treino_id: 'antiga', data: '2026-08-01' }),
      serie({ execucao_treino_id: 'recente', data: '2026-08-04' }),
      serie({
        execucao_treino_id: 'aberta',
        data: '2026-08-02',
        execucao_finalizada_em: null,
      }),
    ])

    expect(sessoes.map((s) => s.id)).toEqual(['aberta', 'recente', 'antiga'])
  })

  it('atribui o recorde à sessão que tem aquele exercício', () => {
    const sessoes = sessoesRealizadas(
      [
        serie({
          execucao_treino_id: 'push',
          exercicio_base_id: 'supino',
          data: '2026-08-05',
        }),
        serie({
          execucao_treino_id: 'pull',
          exercicio_base_id: 'remada',
          data: '2026-08-05',
        }),
      ],
      [
        { exercicio_base_id: 'supino', data: '2026-08-05', um_rm_estimado: 125 },
      ],
    )

    const push = sessoes.find((s) => s.id === 'push')
    const pull = sessoes.find((s) => s.id === 'pull')
    expect(push?.recordes).toHaveLength(1)
    expect(pull?.recordes).toHaveLength(0)
  })

  it('não atribui recorde de outra data', () => {
    const sessoes = sessoesRealizadas(
      [serie({ execucao_treino_id: 'a', data: '2026-08-05' })],
      [
        { exercicio_base_id: 'supino', data: '2026-08-04', um_rm_estimado: 125 },
      ],
    )

    expect(sessoes[0]?.recordes).toEqual([])
  })

  it('devolve vazio sem séries', () => {
    expect(sessoesRealizadas([])).toEqual([])
  })
})

describe('formatarDuracao', () => {
  it('usa minutos abaixo de uma hora', () => {
    expect(formatarDuracao(48)).toBe('48min')
  })

  it('usa horas e minutos', () => {
    expect(formatarDuracao(95)).toBe('1h35')
    expect(formatarDuracao(120)).toBe('2h')
  })
})
