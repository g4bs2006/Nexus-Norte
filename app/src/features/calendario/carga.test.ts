import { describe, expect, it } from 'vitest'
import { cargaPorDia, escalaCarga, formatarCarga, ordenarDoDia } from './carga'
import type { EventoCalendario } from './eventos'

// 2026-08-03 é segunda; 2026-08-05, quarta (dia 3 em getDay()).
const SEMANA = { de: '2026-08-03', ate: '2026-08-09' }
const QUARTA = new Date(2026, 7, 5)

function aula(data: string, inicio: string, fim: string): EventoCalendario {
  return {
    id: `fluxograma:regra-aula:${data}`,
    origemId: 'regra-aula',
    titulo: 'Cálculo II',
    inicio: `${data}T${inicio}:00`,
    fim: `${data}T${fim}:00`,
    diaInteiro: false,
    camada: 'estudos',
    tipo: 'aula',
  }
}

function treino(data: string, inicio: string, fim: string): EventoCalendario {
  return {
    id: `fluxograma:regra-treino:${data}`,
    origemId: 'regra-treino',
    titulo: 'Treino B',
    inicio: `${data}T${inicio}:00`,
    fim: `${data}T${fim}:00`,
    diaInteiro: false,
    camada: 'treino',
    tipo: 'treino',
  }
}

function prova(data: string): EventoCalendario {
  return {
    id: `avaliacao:p1`,
    titulo: 'Prova de Cálculo II',
    inicio: data,
    diaInteiro: true,
    camada: 'estudos',
    tipo: 'prova',
  }
}

function trabalho(data: string, inicio: string, fim: string): EventoCalendario {
  return {
    id: `fluxograma:regra-trabalho:${data}`,
    origemId: 'regra-trabalho',
    titulo: 'Escritório',
    inicio: `${data}T${inicio}:00`,
    fim: `${data}T${fim}:00`,
    diaInteiro: false,
    camada: 'trabalho',
    tipo: 'trabalho',
  }
}

describe('cargaPorDia', () => {
  it('devolve uma entrada por dia, inclusive os vazios', () => {
    const dias = cargaPorDia(
      [aula('2026-08-03', '08:00', '10:00')],
      SEMANA,
      QUARTA,
    )

    expect(dias).toHaveLength(7)
    expect(dias.map((d) => d.data)).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ])
    expect(dias[1]?.minutosRotina).toBe(0)
    expect(dias[1]?.segmentos).toEqual([])
  })

  it('soma a rotina do dia em minutos, por camada', () => {
    const dias = cargaPorDia(
      [
        aula('2026-08-03', '08:00', '10:00'),
        treino('2026-08-03', '18:00', '19:30'),
      ],
      SEMANA,
      QUARTA,
    )

    expect(dias[0]?.minutosRotina).toBe(210)
    expect(dias[0]?.segmentos).toEqual([
      { camada: 'estudos', minutos: 120 },
      { camada: 'treino', minutos: 90 },
    ])
  })

  it('mantém a ordem das camadas independente da ordem dos eventos', () => {
    const dias = cargaPorDia(
      [
        treino('2026-08-03', '18:00', '19:30'),
        aula('2026-08-03', '08:00', '10:00'),
      ],
      SEMANA,
      QUARTA,
    )

    expect(dias[0]?.segmentos.map((s) => s.camada)).toEqual([
      'estudos',
      'treino',
    ])
  })

  describe('fatia por matéria dentro da camada (13/08)', () => {
    function aulaColorida(
      materia: string,
      cor: string,
      data: string,
      inicio: string,
      fim: string,
    ): EventoCalendario {
      return {
        ...aula(data, inicio, fim),
        id: `fluxograma:${materia}:${data}`,
        origemId: materia,
        titulo: materia,
        cor,
      }
    }

    it('duas matérias com cor viram duas fatias de estudos', () => {
      const dias = cargaPorDia(
        [
          aulaColorida('Cálculo II', '#4a87c4', '2026-08-03', '08:00', '10:00'),
          aulaColorida('Física IV', '#c4554d', '2026-08-03', '14:00', '15:00'),
        ],
        SEMANA,
        QUARTA,
      )

      expect(dias[0]?.segmentos).toEqual([
        { camada: 'estudos', minutos: 120, cor: '#4a87c4', rotulo: 'Cálculo II' },
        { camada: 'estudos', minutos: 60, cor: '#c4554d', rotulo: 'Física IV' },
      ])
      // O total não muda: a fatia é um corte da mesma soma
      expect(dias[0]?.minutosRotina).toBe(180)
    })

    it('duas aulas da MESMA matéria somam numa fatia só', () => {
      const dias = cargaPorDia(
        [
          aulaColorida('Cálculo II', '#4a87c4', '2026-08-03', '08:00', '10:00'),
          aulaColorida('Cálculo II', '#4a87c4', '2026-08-03', '16:00', '17:00'),
        ],
        SEMANA,
        QUARTA,
      )

      expect(dias[0]?.segmentos).toHaveLength(1)
      expect(dias[0]?.segmentos[0]?.minutos).toBe(180)
    })

    it('matéria sem cor continua caindo na fatia da camada', () => {
      const dias = cargaPorDia(
        [
          aula('2026-08-03', '08:00', '10:00'),
          aulaColorida('Física IV', '#c4554d', '2026-08-03', '14:00', '15:00'),
        ],
        SEMANA,
        QUARTA,
      )

      const semCor = dias[0]?.segmentos.find((s) => s.cor === undefined)
      expect(semCor).toEqual({ camada: 'estudos', minutos: 120 })
      expect(semCor?.rotulo).toBeUndefined()
    })

    it('fatia maior primeiro, e a ordem das camadas se mantém', () => {
      const dias = cargaPorDia(
        [
          treino('2026-08-03', '18:00', '19:30'),
          aulaColorida('Física IV', '#c4554d', '2026-08-03', '14:00', '15:00'),
          aulaColorida('Cálculo II', '#4a87c4', '2026-08-03', '08:00', '11:00'),
        ],
        SEMANA,
        QUARTA,
      )

      expect(
        dias[0]?.segmentos.map((s) => [s.camada, s.minutos]),
      ).toEqual([
        ['estudos', 180],
        ['estudos', 60],
        ['treino', 90],
      ])
    })

    it('remarcada soma na matéria, sem duplicar o rótulo', () => {
      const base = aulaColorida(
        'Cálculo II',
        '#4a87c4',
        '2026-08-03',
        '08:00',
        '09:00',
      )
      const dias = cargaPorDia(
        [
          base,
          {
            ...base,
            id: 'fluxograma:calculo:2026-08-03:remarcada',
            titulo: 'Cálculo II (remarcado)',
            inicio: '2026-08-03T15:00:00',
            fim: '2026-08-03T16:00:00',
          },
        ],
        SEMANA,
        QUARTA,
      )

      expect(dias[0]?.segmentos).toEqual([
        { camada: 'estudos', minutos: 120, cor: '#4a87c4', rotulo: 'Cálculo II' },
      ])
    })
  })

  it('separa prazo de rotina — prazo não entra na barra', () => {
    const dias = cargaPorDia(
      [aula('2026-08-06', '08:00', '10:00'), prova('2026-08-06')],
      SEMANA,
      QUARTA,
    )

    const quinta = dias[3]
    expect(quinta?.data).toBe('2026-08-06')
    expect(quinta?.minutosRotina).toBe(120)
    expect(quinta?.prazos.map((p) => p.tipo)).toEqual(['prova'])
  })

  it('não conta o sono como carga', () => {
    const sono: EventoCalendario = {
      id: 'sono:1:2026-08-03',
      titulo: 'Sono',
      inicio: '2026-08-03T23:30:00',
      fim: '2026-08-04T07:00:00',
      diaInteiro: false,
      camada: 'sono',
      tipo: 'sono',
    }

    const dias = cargaPorDia([sono], SEMANA, QUARTA)

    expect(dias[0]?.minutosRotina).toBe(0)
    expect(dias[0]?.segmentos).toEqual([])
  })

  it('marca hoje e o passado', () => {
    const dias = cargaPorDia([], SEMANA, QUARTA)

    expect(dias.map((d) => d.ehHoje)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
    ])
    expect(dias.map((d) => d.ehPassado)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ])
  })

  describe('sono abaixo da meta', () => {
    // Quarta é dia 3; segunda, dia 1. Meta de 8h nos dois.
    const plano = [
      {
        id: 'p1',
        dia_semana: 1,
        hora_dormir_alvo: '23:00:00',
        hora_acordar_alvo: '07:00:00',
      },
      {
        id: 'p3',
        dia_semana: 3,
        hora_dormir_alvo: '23:00:00',
        hora_acordar_alvo: '07:00:00',
      },
    ]

    it('marca o dia passado que dormiu menos que a meta', () => {
      const dias = cargaPorDia(SEM_EVENTOS, SEMANA, QUARTA, plano, [
        { data: '2026-08-03', horas_calculadas: 6 },
      ])

      expect(dias[0]?.sonoAbaixo).toBe(true)
    })

    it('não marca quando dormiu a meta ou mais', () => {
      const dias = cargaPorDia(SEM_EVENTOS, SEMANA, QUARTA, plano, [
        { data: '2026-08-03', horas_calculadas: 8 },
      ])

      expect(dias[0]?.sonoAbaixo).toBe(false)
    })

    it('não marca hoje: a noite ainda não aconteceu', () => {
      const dias = cargaPorDia(SEM_EVENTOS, SEMANA, QUARTA, plano, [
        { data: '2026-08-05', horas_calculadas: 4 },
      ])

      expect(dias[2]?.ehHoje).toBe(true)
      expect(dias[2]?.sonoAbaixo).toBe(false)
    })

    it('não marca dia sem registro nem dia sem meta', () => {
      const dias = cargaPorDia(SEM_EVENTOS, SEMANA, QUARTA, plano, [])
      expect(dias[0]?.sonoAbaixo).toBe(false)

      const semMeta = cargaPorDia(
        SEM_EVENTOS,
        SEMANA,
        QUARTA,
        [],
        [{ data: '2026-08-03', horas_calculadas: 3 }],
      )
      expect(semMeta[0]?.sonoAbaixo).toBe(false)
    })
  })

  describe('check pendente', () => {
    it('marca dia passado com rotina e sem conclusão', () => {
      const dias = cargaPorDia(
        [aula('2026-08-03', '08:00', '10:00')],
        SEMANA,
        QUARTA,
        [],
        [],
        [],
      )

      expect(dias[0]?.checkPendente).toBe(true)
    })

    it('não marca quando a conclusão existe para aquele dia', () => {
      const dias = cargaPorDia(
        [aula('2026-08-03', '08:00', '10:00')],
        SEMANA,
        QUARTA,
        [],
        [],
        ['regra-aula@2026-08-03'],
      )

      expect(dias[0]?.checkPendente).toBe(false)
    })

    it('não confunde a conclusão de outro dia', () => {
      const dias = cargaPorDia(
        [aula('2026-08-03', '08:00', '10:00')],
        SEMANA,
        QUARTA,
        [],
        [],
        ['regra-aula@2026-08-04'],
      )

      expect(dias[0]?.checkPendente).toBe(true)
    })

    it('não marca hoje nem o futuro', () => {
      const dias = cargaPorDia(
        [
          aula('2026-08-05', '08:00', '10:00'),
          aula('2026-08-06', '08:00', '10:00'),
        ],
        SEMANA,
        QUARTA,
      )

      expect(dias[2]?.checkPendente).toBe(false)
      expect(dias[3]?.checkPendente).toBe(false)
    })

    it('não marca dia passado sem rotina prevista', () => {
      const dias = cargaPorDia([prova('2026-08-03')], SEMANA, QUARTA)
      expect(dias[0]?.checkPendente).toBe(false)
    })

    it('trabalho não liga o sinal, mesmo sem conclusão (resolução 10.48.0)', () => {
      const dias = cargaPorDia(
        [trabalho('2026-08-03', '09:00', '18:00')],
        SEMANA,
        QUARTA,
        [],
        [],
        [],
      )
      expect(dias[0]?.checkPendente).toBe(false)
    })
  })

  describe('minutosLivres (resolução 10.48.1)', () => {
    it('desconta sono planejado e rotina de 1440', () => {
      const dias = cargaPorDia(
        [aula('2026-08-03', '08:00', '10:00')],
        SEMANA,
        QUARTA,
        [{ id: 'p1', dia_semana: 1, hora_dormir_alvo: '23:00', hora_acordar_alvo: '07:00' }],
      )
      // 1440 - 480 (8h de sono) - 120 (aula) = 840
      expect(dias[0]?.minutosLivres).toBe(840)
    })

    it('trabalho também desconta, como qualquer rotina', () => {
      const dias = cargaPorDia(
        [
          aula('2026-08-03', '08:00', '10:00'),
          trabalho('2026-08-03', '13:00', '18:00'),
        ],
        SEMANA,
        QUARTA,
        [{ id: 'p1', dia_semana: 1, hora_dormir_alvo: '23:00', hora_acordar_alvo: '07:00' }],
      )
      // 1440 - 480 - 120 (aula) - 300 (trabalho) = 540
      expect(dias[0]?.minutosLivres).toBe(540)
    })

    it('usa SONO_PADRAO_MINUTOS quando não há planejamento de sono pro dia', () => {
      const dias = cargaPorDia([], SEMANA, QUARTA)
      // 1440 - 480 (padrão) - 0 = 960, não 1440
      expect(dias[0]?.minutosLivres).toBe(960)
    })

    it('nunca fica negativo — rotina que estoura o dia produz 0', () => {
      const dias = cargaPorDia(
        [trabalho('2026-08-03', '00:00', '23:59')],
        SEMANA,
        QUARTA,
      )
      expect(dias[0]?.minutosLivres).toBe(0)
    })

    it('prazo (prova) não desconta minutosLivres', () => {
      const comProva = cargaPorDia([prova('2026-08-03')], SEMANA, QUARTA)
      const semNada = cargaPorDia([], SEMANA, QUARTA)
      expect(comProva[0]?.minutosLivres).toBe(semNada[0]?.minutosLivres)
    })
  })

  it('devolve vazio com intervalo invertido', () => {
    expect(
      cargaPorDia([], { de: '2026-08-09', ate: '2026-08-03' }, QUARTA),
    ).toEqual([])
  })
})

const SEM_EVENTOS: readonly EventoCalendario[] = []

describe('escalaCarga', () => {
  it('usa a maior carga do período', () => {
    const dias = cargaPorDia(
      [
        aula('2026-08-03', '08:00', '10:00'),
        aula('2026-08-06', '08:00', '14:00'),
      ],
      SEMANA,
      QUARTA,
    )

    expect(escalaCarga(dias)).toBe(360)
  })

  it('aplica piso de 2h para meia hora não virar barra cheia', () => {
    const dias = cargaPorDia(
      [aula('2026-08-03', '08:00', '08:30')],
      SEMANA,
      QUARTA,
    )

    expect(escalaCarga(dias)).toBe(120)
  })

  it('não quebra sem dias', () => {
    expect(escalaCarga([])).toBe(120)
  })
})

describe('formatarCarga', () => {
  it('formata horas e minutos', () => {
    expect(formatarCarga(210)).toBe('3h30')
    expect(formatarCarga(120)).toBe('2h')
    expect(formatarCarga(45)).toBe('45min')
  })

  it('usa travessão para zero', () => {
    expect(formatarCarga(0)).toBe('—')
  })
})

describe('ordenarDoDia', () => {
  it('põe prazo antes da rotina, mesmo sem horário', () => {
    const ordenado = ordenarDoDia([
      aula('2026-08-06', '08:00', '10:00'),
      prova('2026-08-06'),
    ])

    expect(ordenado.map((e) => e.tipo)).toEqual(['prova', 'aula'])
  })

  it('ordena a rotina por horário', () => {
    const ordenado = ordenarDoDia([
      treino('2026-08-03', '18:00', '19:30'),
      aula('2026-08-03', '08:00', '10:00'),
    ])

    expect(ordenado.map((e) => e.tipo)).toEqual(['aula', 'treino'])
  })

  it('deixa o sono por último, mesmo começando antes', () => {
    const sono: EventoCalendario = {
      id: 'sono:1:2026-08-03',
      titulo: 'Sono',
      inicio: '2026-08-03T05:00:00',
      fim: '2026-08-03T07:00:00',
      diaInteiro: false,
      camada: 'sono',
      tipo: 'sono',
    }

    const ordenado = ordenarDoDia([sono, aula('2026-08-03', '08:00', '10:00')])

    expect(ordenado.map((e) => e.tipo)).toEqual(['aula', 'sono'])
  })
})

// --- desfecho não é carga planejada (resolução 10.31) ------------------------

describe('eventos com estado ficam fora da barra de carga', () => {
  /** Cancelado carrega o horário do padrão que deixou de valer. */
  function cancelado(data: string): EventoCalendario {
    return {
      id: `cancelado:regra-treino:${data}`,
      origemId: 'regra-treino',
      titulo: 'Legs',
      inicio: `${data}T18:00:00`,
      fim: `${data}T19:00:00`,
      diaInteiro: false,
      camada: 'treino',
      tipo: 'treino',
      estado: 'cancelado',
    }
  }

  /** Realizado: `origemId` é o treino, não a regra do fluxograma. */
  function feito(data: string): EventoCalendario {
    return {
      id: `execucao:e1`,
      origemId: 'treino-pull',
      titulo: 'Pull',
      inicio: `${data}T11:00:00`,
      diaInteiro: false,
      camada: 'treino',
      tipo: 'treino',
      estado: 'feito',
    }
  }

  it('cancelado não soma tempo comprometido', () => {
    const dias = cargaPorDia([cancelado('2026-08-05')], SEMANA, QUARTA)
    const quarta = dias.find((dia) => dia.data === '2026-08-05')

    expect(quarta?.minutosRotina).toBe(0)
    expect(quarta?.segmentos).toEqual([])
  })

  it('realizado não gera anel de "rotina sem check" no dia em que aconteceu', () => {
    // Terça é passado em relação a QUARTA; sem esta regra o dia em que o treino
    // ACONTECEU aparecia como rotina prevista cujo check não saiu
    const dias = cargaPorDia([feito('2026-08-04')], SEMANA, QUARTA)
    const terca = dias.find((dia) => dia.data === '2026-08-04')

    expect(terca?.checkPendente).toBe(false)
    expect(terca?.minutosRotina).toBe(0)
  })

  it('a rotina prevista continua contando normalmente', () => {
    const dias = cargaPorDia(
      [treino('2026-08-05', '18:00', '19:30'), cancelado('2026-08-05')],
      SEMANA,
      QUARTA,
    )
    const quarta = dias.find((dia) => dia.data === '2026-08-05')

    // 90 min da rotina prevista, zero do cancelado
    expect(quarta?.minutosRotina).toBe(90)
  })
})
