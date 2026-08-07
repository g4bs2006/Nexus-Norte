import { describe, expect, it } from 'vitest'
import {
  alocarSugestao,
  construirTimeline,
  correlacaoSonoAderencia,
  detectarConflitos,
  detectarFalhas,
  detectarSobrecarga,
  pressaoDosPrazos,
  sugerirRealocacao,
} from './planejador'
import type { DiaCarga } from './carga'
import type { EventoCalendario, FonteAvaliacao } from './eventos'

const HOJE = '2026-08-03'

function diaVazio(data: string, minutosLivres: number): DiaCarga {
  return {
    data,
    segmentos: [],
    minutosRotina: 0,
    minutosLivres,
    prazos: [],
    sonoAbaixo: false,
    checkPendente: false,
    ehHoje: data === HOJE,
    ehPassado: data < HOJE,
  }
}

function avaliacao(parcial: Partial<FonteAvaliacao>): FonteAvaliacao {
  return {
    id: 'p1',
    nome: 'Prova de Cálculo II',
    data: '2026-08-08',
    nota: null,
    materia_id: 'calc2',
    ...parcial,
  }
}

describe('pressaoDosPrazos', () => {
  it('soma minutosLivres até a véspera, excluindo o dia da prova', () => {
    const dias = [
      diaVazio('2026-08-03', 100),
      diaVazio('2026-08-04', 100),
      diaVazio('2026-08-05', 100),
      diaVazio('2026-08-06', 100),
      diaVazio('2026-08-07', 100),
      // 08 é o dia da prova — não deveria entrar na soma
      diaVazio('2026-08-08', 999),
    ]

    const [pressao] = pressaoDosPrazos(
      [avaliacao({ data: '2026-08-08' })],
      HOJE,
      dias,
      new Map(),
      new Map(),
    )

    expect(pressao?.minutosLivresAte).toBe(500)
    expect(pressao?.diasRestantes).toBe(5)
  })

  it('sem meta cadastrada, não inventa status nem meta restante', () => {
    const dias = [diaVazio('2026-08-03', 100), diaVazio('2026-08-04', 100)]
    const [pressao] = pressaoDosPrazos(
      [avaliacao({ data: '2026-08-05' })],
      HOJE,
      dias,
      new Map(),
      new Map(),
    )

    expect(pressao?.minutosMetaRestante).toBeUndefined()
    expect(pressao?.status).toBeUndefined()
  })

  it('risco quando a folga é menor que a meta restante', () => {
    const dias = [diaVazio('2026-08-03', 60), diaVazio('2026-08-04', 60)]
    const [pressao] = pressaoDosPrazos(
      [avaliacao({ data: '2026-08-05', materia_id: 'calc2' })],
      HOJE,
      dias,
      new Map([['calc2', 600]]), // meta: 10h
      new Map([['calc2', 0]]),
    )

    // folga = 120min, meta restante = 600min → risco
    expect(pressao?.minutosMetaRestante).toBe(600)
    expect(pressao?.status).toBe('risco')
  })

  it('ok quando a folga cobre a meta restante', () => {
    const dias = [diaVazio('2026-08-03', 300), diaVazio('2026-08-04', 300)]
    const [pressao] = pressaoDosPrazos(
      [avaliacao({ data: '2026-08-05', materia_id: 'calc2' })],
      HOJE,
      dias,
      new Map([['calc2', 600]]),
      new Map([['calc2', 0]]),
    )

    expect(pressao?.status).toBe('ok')
  })

  it('desconta o que já foi estudado da meta', () => {
    const dias = [diaVazio('2026-08-03', 100)]
    const [pressao] = pressaoDosPrazos(
      [avaliacao({ data: '2026-08-04', materia_id: 'calc2' })],
      HOJE,
      dias,
      new Map([['calc2', 600]]),
      new Map([['calc2', 400]]),
    )

    expect(pressao?.minutosMetaRestante).toBe(200)
  })

  it('meta restante nunca fica negativa mesmo estudando além da meta', () => {
    const dias = [diaVazio('2026-08-03', 100)]
    const [pressao] = pressaoDosPrazos(
      [avaliacao({ data: '2026-08-04', materia_id: 'calc2' })],
      HOJE,
      dias,
      new Map([['calc2', 600]]),
      new Map([['calc2', 900]]),
    )

    expect(pressao?.minutosMetaRestante).toBe(0)
  })

  it('ignora avaliação sem data e avaliação já passada', () => {
    const resultado = pressaoDosPrazos(
      [
        avaliacao({ id: 'sem-data', data: null }),
        avaliacao({ id: 'passada', data: '2026-08-01' }),
      ],
      HOJE,
      [],
      new Map(),
      new Map(),
    )
    expect(resultado).toEqual([])
  })

  it('ordena pela mais próxima primeiro', () => {
    const resultado = pressaoDosPrazos(
      [
        avaliacao({ id: 'longe', data: '2026-08-20' }),
        avaliacao({ id: 'perto', data: '2026-08-05' }),
      ],
      HOJE,
      [],
      new Map(),
      new Map(),
    )
    expect(resultado.map((p) => p.avaliacaoId)).toEqual(['perto', 'longe'])
  })
})

function evento(parcial: Partial<EventoCalendario>): EventoCalendario {
  return {
    id: 'e1',
    titulo: 'Evento',
    inicio: '2026-08-03T08:00:00',
    fim: '2026-08-03T09:00:00',
    diaInteiro: false,
    camada: 'estudos',
    tipo: 'aula',
    ...parcial,
  }
}

describe('detectarConflitos', () => {
  it('acusa sobreposição parcial', () => {
    const conflitos = detectarConflitos([
      evento({ id: 'a', inicio: '2026-08-03T08:00:00', fim: '2026-08-03T09:30:00' }),
      evento({ id: 'b', inicio: '2026-08-03T09:00:00', fim: '2026-08-03T10:00:00' }),
    ])
    expect(conflitos).toHaveLength(1)
    expect(conflitos[0]?.eventoA.id).toBe('a')
    expect(conflitos[0]?.eventoB.id).toBe('b')
  })

  it('ignora eventos adjacentes — fim de um igual ao início do outro', () => {
    const conflitos = detectarConflitos([
      evento({ id: 'a', inicio: '2026-08-03T08:00:00', fim: '2026-08-03T09:00:00' }),
      evento({ id: 'b', inicio: '2026-08-03T09:00:00', fim: '2026-08-03T10:00:00' }),
    ])
    expect(conflitos).toEqual([])
  })

  it('ignora eventos de dias diferentes', () => {
    const conflitos = detectarConflitos([
      evento({ id: 'a', inicio: '2026-08-03T08:00:00', fim: '2026-08-03T20:00:00' }),
      evento({ id: 'b', inicio: '2026-08-04T08:30:00', fim: '2026-08-04T09:00:00' }),
    ])
    expect(conflitos).toEqual([])
  })

  it('ignora dia inteiro e cancelado', () => {
    const conflitos = detectarConflitos([
      evento({ id: 'a', diaInteiro: true, inicio: '2026-08-03', fim: undefined }),
      evento({
        id: 'b',
        inicio: '2026-08-03T08:00:00',
        fim: '2026-08-03T09:00:00',
        estado: 'cancelado',
      }),
      evento({ id: 'c', inicio: '2026-08-03T08:30:00', fim: '2026-08-03T09:30:00' }),
    ])
    expect(conflitos).toEqual([])
  })
})

describe('detectarSobrecarga', () => {
  function dia(data: string, minutosLivres: number): DiaCarga {
    return {
      data,
      segmentos: [],
      minutosRotina: 0,
      minutosLivres,
      prazos: [],
      sonoAbaixo: false,
      checkPendente: false,
      ehHoje: false,
      ehPassado: false,
    }
  }

  it('aponta os dias com folga zero', () => {
    const resultado = detectarSobrecarga([dia('2026-08-03', 0), dia('2026-08-04', 60)])
    expect(resultado).toEqual([{ data: '2026-08-03', minutosLivres: 0 }])
  })

  it('respeita um piso maior que zero', () => {
    const resultado = detectarSobrecarga(
      [dia('2026-08-03', 20), dia('2026-08-04', 60)],
      30,
    )
    expect(resultado).toEqual([{ data: '2026-08-03', minutosLivres: 20 }])
  })
})

describe('alocarSugestao', () => {
  it('prioriza os dias com mais folga', () => {
    const dias = [
      diaVazio('2026-08-03', 60),
      diaVazio('2026-08-04', 240),
      diaVazio('2026-08-05', 120),
    ]
    const resultado = alocarSugestao(180, dias)
    // 240 (04) sozinho já cobre os 180 pedidos
    expect(resultado).toEqual([{ data: '2026-08-04', minutos: 180 }])
  })

  it('respeita o teto diário mesmo com folga sobrando', () => {
    const dias = [diaVazio('2026-08-03', 600)]
    const resultado = alocarSugestao(600, dias)
    // ESTUDO_MAXIMO_DIA_MINUTOS = 240; sobra sem dia pra alocar o resto
    expect(resultado).toEqual([{ data: '2026-08-03', minutos: 240 }])
  })

  it('espalha por vários dias quando um só não basta', () => {
    const dias = [diaVazio('2026-08-03', 200), diaVazio('2026-08-04', 200)]
    const resultado = alocarSugestao(300, dias)
    expect(resultado).toEqual([
      { data: '2026-08-03', minutos: 200 },
      { data: '2026-08-04', minutos: 100 },
    ])
  })

  it('não gera bloco menor que o mínimo', () => {
    const dias = [diaVazio('2026-08-03', 200), diaVazio('2026-08-04', 10)]
    const resultado = alocarSugestao(210, dias)
    // 04 só tem 10min de folga — fica de fora, não vira bloco de 10min
    expect(resultado).toEqual([{ data: '2026-08-03', minutos: 200 }])
  })

  it('desconta o que outras sugestões aceitas já comprometeram', () => {
    const dias = [diaVazio('2026-08-03', 200)]
    const resultado = alocarSugestao(
      150,
      dias,
      new Map([['2026-08-03', 100]]),
    )
    // 200 - 100 já comprometido = 100 disponível
    expect(resultado).toEqual([{ data: '2026-08-03', minutos: 100 }])
  })

  it('devolve vazio quando não há necessidade', () => {
    expect(alocarSugestao(0, [diaVazio('2026-08-03', 200)])).toEqual([])
  })

  it('devolve ordenado por data, não pela ordem de alocação', () => {
    const dias = [
      diaVazio('2026-08-03', 100),
      diaVazio('2026-08-04', 300),
      diaVazio('2026-08-05', 100),
    ]
    const resultado = alocarSugestao(200, dias)
    // aloca no 04 primeiro (maior folga), mas a saída vem em ordem de data
    expect(resultado.map((s) => s.data)).toEqual(['2026-08-04'])
  })
})

describe('detectarFalhas', () => {
  it('acusa cancelado no passado', () => {
    const falhas = detectarFalhas(
      [
        evento({
          id: 'f1',
          origemId: 'treino-b',
          inicio: '2026-08-01T18:00:00',
          fim: '2026-08-01T19:00:00',
          estado: 'cancelado',
          camada: 'treino',
        }),
      ],
      new Set(),
      HOJE,
    )
    expect(falhas).toEqual([
      {
        fluxogramaId: 'treino-b',
        data: '2026-08-01',
        titulo: 'Evento',
        duracaoMinutos: 60,
        motivo: 'cancelado',
      },
    ])
  })

  it('acusa sem_check quando não há conclusão pra rotina passada', () => {
    const falhas = detectarFalhas(
      [
        evento({
          id: 'f1',
          origemId: 'aula-1',
          inicio: '2026-08-01T08:00:00',
          fim: '2026-08-01T10:00:00',
        }),
      ],
      new Set(),
      HOJE,
    )
    expect(falhas[0]?.motivo).toBe('sem_check')
  })

  it('não acusa quando a conclusão existe', () => {
    const falhas = detectarFalhas(
      [
        evento({
          id: 'f1',
          origemId: 'aula-1',
          inicio: '2026-08-01T08:00:00',
          fim: '2026-08-01T10:00:00',
        }),
      ],
      new Set(['aula-1@2026-08-01']),
      HOJE,
    )
    expect(falhas).toEqual([])
  })

  it('ignora hoje e o futuro', () => {
    const falhas = detectarFalhas(
      [
        evento({
          id: 'f1',
          origemId: 'aula-1',
          inicio: `${HOJE}T08:00:00`,
          fim: `${HOJE}T10:00:00`,
        }),
      ],
      new Set(),
      HOJE,
    )
    expect(falhas).toEqual([])
  })

  it('ignora trabalho — não tem check pra faltar (resolução 10.48.0)', () => {
    const falhas = detectarFalhas(
      [
        evento({
          id: 'f1',
          origemId: 'trabalho-1',
          camada: 'trabalho',
          inicio: '2026-08-01T09:00:00',
          fim: '2026-08-01T18:00:00',
        }),
      ],
      new Set(),
      HOJE,
    )
    expect(falhas).toEqual([])
  })

  it('ignora dia inteiro e evento sem origemId', () => {
    const falhas = detectarFalhas(
      [
        evento({ id: 'f1', diaInteiro: true, fim: undefined, origemId: 'x' }),
        evento({ id: 'f2', origemId: undefined }),
      ],
      new Set(),
      HOJE,
    )
    expect(falhas).toEqual([])
  })
})

describe('sugerirRealocacao', () => {
  function diaVazio2(data: string, minutosLivres: number) {
    return {
      data,
      segmentos: [],
      minutosRotina: 0,
      minutosLivres,
      prazos: [],
      sonoAbaixo: false,
      checkPendente: false,
      ehHoje: false,
      ehPassado: false,
    }
  }

  it('sugere um slot que cabe a duração da falha', () => {
    const falhas = detectarFalhas(
      [
        evento({
          id: 'f1',
          origemId: 'treino-b',
          inicio: '2026-08-01T18:00:00',
          fim: '2026-08-01T19:00:00',
          estado: 'cancelado',
        }),
      ],
      new Set(),
      HOJE,
    )
    const [resultado] = sugerirRealocacao(falhas, [diaVazio2('2026-08-04', 120)])
    expect(resultado?.sugestao).toEqual([{ data: '2026-08-04', minutos: 60 }])
  })

  it('duas falhas não disputam o mesmo slot', () => {
    const falhas: ReturnType<typeof detectarFalhas> = [
      { fluxogramaId: 'a', data: '2026-08-01', titulo: 'A', duracaoMinutos: 60, motivo: 'cancelado' },
      { fluxogramaId: 'b', data: '2026-08-01', titulo: 'B', duracaoMinutos: 60, motivo: 'cancelado' },
    ]
    const resultado = sugerirRealocacao(falhas, [diaVazio2('2026-08-04', 90)])
    // A reserva 60 dos 90; sobram 30 pra B, abaixo do bloco mínimo (30 exato, cabe)
    expect(resultado[0]?.sugestao).toEqual([{ data: '2026-08-04', minutos: 60 }])
    expect(resultado[1]?.sugestao).toEqual([{ data: '2026-08-04', minutos: 30 }])
  })
})

function diaCarga(parcial: Partial<DiaCarga>): DiaCarga {
  return {
    data: '2026-08-01',
    segmentos: [],
    minutosRotina: 0,
    minutosLivres: 500,
    prazos: [],
    sonoAbaixo: false,
    checkPendente: false,
    ehHoje: false,
    ehPassado: true,
    ...parcial,
  }
}

describe('correlacaoSonoAderencia', () => {
  // 2026-08-03 é segunda (dia_semana 1)
  function diaComSono(data: string, checkPendente: boolean): DiaCarga {
    return diaCarga({ data, minutosRotina: 60, checkPendente, ehPassado: true })
  }

  it('calcula o percentual de falha separado por grupo de sono', () => {
    const dias = [
      diaComSono('2026-08-03', true),
      diaComSono('2026-08-04', true),
      diaComSono('2026-08-05', false),
      diaComSono('2026-08-06', false),
      diaComSono('2026-08-07', false),
      diaComSono('2026-08-08', false),
    ]
    const horas = new Map([
      ['2026-08-03', 5], // abaixo da meta (8h) — falhou
      ['2026-08-04', 5], // abaixo — falhou
      ['2026-08-05', 5], // abaixo — ok
      ['2026-08-06', 9], // acima — ok
      ['2026-08-07', 9], // acima — ok
      ['2026-08-08', 9], // acima — ok
    ])
    const meta = new Map([
      [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8],
    ])

    const resultado = correlacaoSonoAderencia(dias, horas, meta)
    // sono baixo: 03,04,05 → 2 falharam de 3 = 67%
    expect(resultado.percentualFalhaComSonoBaixo).toBe(67)
    // sono ok: 06,07,08 → 0 falharam de 3 = 0%
    expect(resultado.percentualFalhaComSonoOk).toBe(0)
  })

  it('devolve undefined com menos de 3 dias no grupo', () => {
    const dias = [diaComSono('2026-08-03', true), diaComSono('2026-08-04', false)]
    const horas = new Map([['2026-08-03', 5], ['2026-08-04', 5]])
    const meta = new Map([[1, 8], [2, 8]])

    const resultado = correlacaoSonoAderencia(dias, horas, meta)
    expect(resultado.percentualFalhaComSonoBaixo).toBeUndefined()
    expect(resultado.percentualFalhaComSonoOk).toBeUndefined()
  })

  it('ignora dia sem registro de sono ou sem meta pro dia da semana', () => {
    const dias = [diaComSono('2026-08-03', true)]
    const resultado = correlacaoSonoAderencia(dias, new Map(), new Map())
    expect(resultado.percentualFalhaComSonoBaixo).toBeUndefined()
    expect(resultado.percentualFalhaComSonoOk).toBeUndefined()
  })
})

describe('construirTimeline', () => {
  it('agrupa itens do mesmo dia', () => {
    const resultado = construirTimeline([
      { data: '2026-08-03', texto: 'Treino B' },
      { data: '2026-08-03', texto: 'Gastou R$ 40' },
      { data: '2026-08-02', texto: 'Log do projeto X' },
    ])
    expect(resultado).toHaveLength(2)
    expect(resultado[0]?.data).toBe('2026-08-03')
    expect(resultado[0]?.itens).toHaveLength(2)
  })

  it('ordena do mais recente para o mais antigo', () => {
    const resultado = construirTimeline([
      { data: '2026-08-01', texto: 'a' },
      { data: '2026-08-05', texto: 'b' },
      { data: '2026-08-03', texto: 'c' },
    ])
    expect(resultado.map((d) => d.data)).toEqual([
      '2026-08-05',
      '2026-08-03',
      '2026-08-01',
    ])
  })

  it('devolve vazio sem itens', () => {
    expect(construirTimeline([])).toEqual([])
  })
})
