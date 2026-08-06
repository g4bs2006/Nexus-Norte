import { describe, expect, it } from 'vitest'
import {
  dentroDoPeriodoMateria,
  faltasRestantes,
  frequenciaEstudoSemana,
  mediaMateria,
  mediaProjetada,
  percentualAcerto,
  proximaAvaliacao,
  riscoReprovacao,
} from './calculos'
import type { Avaliacao } from './types'

function avaliacao(parcial: Partial<Avaliacao>): Avaliacao {
  return {
    id: 'id',
    materia_id: 'materia',
    nome: 'P1',
    peso: 1,
    nota: null,
    data: null,
    created_at: '2026-08-01T00:00:00Z',
    ...parcial,
  }
}

const HOJE = new Date(2026, 7, 4) // 2026-08-04

describe('mediaMateria', () => {
  it('faz a média ponderada apenas das avaliações corrigidas', () => {
    // (8*2 + 6*3) / (2+3) = 6.8 — a pendente de peso 5 não entra
    const media = mediaMateria(
      [
        { nota: 8, peso: 2 },
        { nota: 6, peso: 3 },
        { nota: null, peso: 5 },
      ],
      null,
    )
    expect(media).toBeCloseTo(6.8)
  })

  it('usa a nota manual quando configurada, ignorando as avaliações', () => {
    const media = mediaMateria([{ nota: 2, peso: 1 }], {
      tipo: 'manual',
      nota_manual: 7.5,
    })
    expect(media).toBe(7.5)
  })

  it('devolve null quando nenhuma avaliação foi corrigida', () => {
    expect(mediaMateria([{ nota: null, peso: 2 }], null)).toBeNull()
  })

  it('devolve null sem avaliações', () => {
    expect(mediaMateria([], null)).toBeNull()
  })
})

describe('mediaProjetada', () => {
  it('assume a nota mínima nas pendentes e usa o peso total', () => {
    // (8*2 + 6*3) + (6*5) = 34 + 30 = 64; / 10 = 6.4
    const projetada = mediaProjetada(
      [
        { nota: 8, peso: 2 },
        { nota: 6, peso: 3 },
        { nota: null, peso: 5 },
      ],
      null,
    )
    expect(projetada).toBeCloseTo(6.4)
  })

  it('difere da média atual justamente por incluir o peso pendente', () => {
    const avaliacoes = [
      { nota: 10, peso: 1 },
      { nota: null, peso: 9 },
    ]
    expect(mediaMateria(avaliacoes, null)).toBe(10)
    // (10*1 + 6*9) / 10 = 6.4
    expect(mediaProjetada(avaliacoes, null)).toBeCloseTo(6.4)
  })

  it('respeita nota mínima customizada', () => {
    // (0 pendente com mínima 7) -> (7*1)/1 = 7
    expect(mediaProjetada([{ nota: null, peso: 1 }], null, 7)).toBe(7)
  })

  it('não projeta média manual', () => {
    expect(
      mediaProjetada([{ nota: null, peso: 1 }], {
        tipo: 'manual',
        nota_manual: 9,
      }),
    ).toBe(9)
  })

  it('devolve null sem avaliações', () => {
    expect(mediaProjetada([], null)).toBeNull()
  })
})

describe('faltasRestantes', () => {
  it('subtrai as faltas do limite', () => {
    expect(faltasRestantes(15, 4)).toBe(11)
  })

  it('nunca fica negativo', () => {
    expect(faltasRestantes(10, 14)).toBe(0)
  })
})

describe('riscoReprovacao', () => {
  it('fica verde com média folgada e faltas sobrando', () => {
    expect(
      riscoReprovacao({
        mediaProjetada: 8.5,
        faltasRestantes: 10,
        limiteFaltas: 15,
      }),
    ).toBe('ok')
  })

  it('fica vermelho quando a média projetada não aprova', () => {
    expect(
      riscoReprovacao({
        mediaProjetada: 5.2,
        faltasRestantes: 10,
        limiteFaltas: 15,
      }),
    ).toBe('risco')
  })

  it('fica vermelho quando as faltas estouraram, mesmo com média ótima', () => {
    expect(
      riscoReprovacao({
        mediaProjetada: 9.8,
        faltasRestantes: 0,
        limiteFaltas: 15,
      }),
    ).toBe('risco')
  })

  it('fica amarelo com média apenas na margem acima do mínimo', () => {
    expect(
      riscoReprovacao({
        mediaProjetada: 6.5,
        faltasRestantes: 10,
        limiteFaltas: 15,
      }),
    ).toBe('atencao')
  })

  it('fica amarelo quando restam poucas faltas', () => {
    expect(
      riscoReprovacao({
        mediaProjetada: 9,
        faltasRestantes: 2,
        limiteFaltas: 15,
      }),
    ).toBe('atencao')
  })

  it('ignora o eixo de faltas quando não há limite configurado', () => {
    expect(
      riscoReprovacao({
        mediaProjetada: 9,
        faltasRestantes: 0,
        limiteFaltas: 0,
      }),
    ).toBe('ok')
  })

  it('fica verde sem média calculável e com faltas em folga', () => {
    expect(
      riscoReprovacao({
        mediaProjetada: null,
        faltasRestantes: 12,
        limiteFaltas: 15,
      }),
    ).toBe('ok')
  })
})

describe('frequenciaEstudoSemana', () => {
  it('soma os minutos e compara com a meta do período', () => {
    const resultado = frequenciaEstudoSemana(
      [
        { duracao_minutos: 60, meta_diaria_minutos: 30 },
        { duracao_minutos: 45, meta_diaria_minutos: 30 },
      ],
      7,
    )

    expect(resultado.minutosEstudados).toBe(105)
    expect(resultado.metaMinutos).toBe(210)
    expect(resultado.percentual).toBeCloseTo(50)
  })

  it('devolve percentual null quando nenhuma sessão define meta', () => {
    const resultado = frequenciaEstudoSemana(
      [{ duracao_minutos: 60, meta_diaria_minutos: null }],
      7,
    )

    expect(resultado.minutosEstudados).toBe(60)
    expect(resultado.percentual).toBeNull()
  })

  it('lida com período sem sessões', () => {
    expect(frequenciaEstudoSemana([], 7)).toEqual({
      minutosEstudados: 0,
      metaMinutos: 0,
      percentual: null,
    })
  })
})

describe('proximaAvaliacao', () => {
  it('escolhe a avaliação futura mais próxima sem nota', () => {
    const resultado = proximaAvaliacao(
      [
        avaliacao({ nome: 'P3', data: '2026-08-20' }),
        avaliacao({ nome: 'P2', data: '2026-08-10' }),
      ],
      HOJE,
    )

    expect(resultado?.avaliacao.nome).toBe('P2')
    expect(resultado?.dias).toBe(6)
  })

  it('inclui avaliação marcada para hoje', () => {
    const resultado = proximaAvaliacao(
      [avaliacao({ nome: 'Hoje', data: '2026-08-04' })],
      HOJE,
    )
    expect(resultado?.dias).toBe(0)
  })

  it('ignora avaliações já corrigidas', () => {
    const resultado = proximaAvaliacao(
      [avaliacao({ nome: 'P1', data: '2026-08-10', nota: 7 })],
      HOJE,
    )
    expect(resultado).toBeNull()
  })

  it('ignora avaliações sem data marcada', () => {
    expect(proximaAvaliacao([avaliacao({ data: null })], HOJE)).toBeNull()
  })

  it('ignora datas passadas', () => {
    expect(
      proximaAvaliacao([avaliacao({ data: '2026-07-30' })], HOJE),
    ).toBeNull()
  })
})

describe('dentroDoPeriodoMateria', () => {
  it('devolve true sempre quando a matéria não tem período', () => {
    expect(
      dentroDoPeriodoMateria('2026-08-06', {
        data_inicio: null,
        data_fim: null,
      }),
    ).toBe(true)
  })

  it('devolve false antes do início', () => {
    expect(
      dentroDoPeriodoMateria('2026-08-01', {
        data_inicio: '2026-08-03',
        data_fim: null,
      }),
    ).toBe(false)
  })

  it('devolve false depois do fim', () => {
    expect(
      dentroDoPeriodoMateria('2026-12-20', {
        data_inicio: null,
        data_fim: '2026-12-15',
      }),
    ).toBe(false)
  })

  it('inclui as duas pontas do intervalo', () => {
    const materia = { data_inicio: '2026-08-03', data_fim: '2026-12-15' }
    expect(dentroDoPeriodoMateria('2026-08-03', materia)).toBe(true)
    expect(dentroDoPeriodoMateria('2026-12-15', materia)).toBe(true)
  })

  it('devolve true no meio do intervalo', () => {
    expect(
      dentroDoPeriodoMateria('2026-10-01', {
        data_inicio: '2026-08-03',
        data_fim: '2026-12-15',
      }),
    ).toBe(true)
  })
})

describe('percentualAcerto', () => {
  it('calcula o acerto a partir das erradas', () => {
    expect(percentualAcerto(10, [4, 7])).toBe(80)
  })

  it('devolve 100 quando não errou nada', () => {
    expect(percentualAcerto(5, [])).toBe(100)
  })

  it('não fica negativo se houver mais erradas que questões', () => {
    expect(percentualAcerto(2, [1, 2, 3])).toBe(0)
  })

  it('devolve null sem total de questões', () => {
    expect(percentualAcerto(0, [])).toBeNull()
  })
})
