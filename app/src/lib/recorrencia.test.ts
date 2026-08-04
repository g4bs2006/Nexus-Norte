import { describe, expect, it } from 'vitest'
import { expandirRecorrencia, ocorrenciasDoDia } from './recorrencia'

// 2026-08-03 é uma segunda-feira; 2026-08-09, o domingo seguinte.
const SEGUNDA = '2026-08-03'
const DOMINGO = '2026-08-09'

const AULA_SEGUNDA = { id: 'aula-seg', dia_semana: 1 }
const AULA_QUARTA = { id: 'aula-qua', dia_semana: 3 }
const AULA_DOMINGO = { id: 'aula-dom', dia_semana: 0 }

describe('expandirRecorrencia', () => {
  it('gera uma ocorrência por dia da semana correspondente', () => {
    const ocorrencias = expandirRecorrencia(
      [AULA_SEGUNDA, AULA_QUARTA],
      { de: SEGUNDA, ate: DOMINGO },
    )

    expect(ocorrencias.map((o) => [o.regra.id, o.data])).toEqual([
      ['aula-seg', '2026-08-03'],
      ['aula-qua', '2026-08-05'],
    ])
  })

  it('cobre múltiplas semanas', () => {
    const ocorrencias = expandirRecorrencia([AULA_SEGUNDA], {
      de: SEGUNDA,
      ate: '2026-08-24',
    })

    expect(ocorrencias.map((o) => o.data)).toEqual([
      '2026-08-03',
      '2026-08-10',
      '2026-08-17',
      '2026-08-24',
    ])
  })

  it('trata domingo como dia 0', () => {
    const ocorrencias = expandirRecorrencia([AULA_DOMINGO], {
      de: SEGUNDA,
      ate: DOMINGO,
    })

    expect(ocorrencias.map((o) => o.data)).toEqual(['2026-08-09'])
  })

  it('omite ocorrências canceladas por exceção', () => {
    const ocorrencias = expandirRecorrencia(
      [AULA_SEGUNDA],
      { de: SEGUNDA, ate: '2026-08-17' },
      [
        {
          fluxograma_id: 'aula-seg',
          data: '2026-08-10',
          status: 'cancelado',
        },
      ],
    )

    expect(ocorrencias.map((o) => o.data)).toEqual(['2026-08-03', '2026-08-17'])
  })

  it('mantém e sinaliza ocorrências remarcadas', () => {
    const ocorrencias = expandirRecorrencia(
      [AULA_SEGUNDA],
      { de: SEGUNDA, ate: SEGUNDA },
      [
        {
          fluxograma_id: 'aula-seg',
          data: SEGUNDA,
          status: 'remarcado',
        },
      ],
    )

    expect(ocorrencias).toHaveLength(1)
    expect(ocorrencias[0]?.remarcada).toBe(true)
  })

  it('não deixa exceção de uma regra afetar outra na mesma data', () => {
    const ocorrencias = expandirRecorrencia(
      [AULA_SEGUNDA, { id: 'outra-seg', dia_semana: 1 }],
      { de: SEGUNDA, ate: SEGUNDA },
      [{ fluxograma_id: 'aula-seg', data: SEGUNDA, status: 'cancelado' }],
    )

    expect(ocorrencias.map((o) => o.regra.id)).toEqual(['outra-seg'])
  })

  it('devolve vazio sem regras', () => {
    expect(expandirRecorrencia([], { de: SEGUNDA, ate: DOMINGO })).toEqual([])
  })

  it('devolve vazio quando o intervalo está invertido', () => {
    expect(
      expandirRecorrencia([AULA_SEGUNDA], { de: DOMINGO, ate: SEGUNDA }),
    ).toEqual([])
  })
})

describe('ocorrenciasDoDia', () => {
  it('devolve apenas o que cai no dia pedido', () => {
    const ocorrencias = ocorrenciasDoDia(
      [AULA_SEGUNDA, AULA_QUARTA],
      '2026-08-05',
    )

    expect(ocorrencias.map((o) => o.regra.id)).toEqual(['aula-qua'])
  })

  it('respeita cancelamento no próprio dia', () => {
    const ocorrencias = ocorrenciasDoDia([AULA_SEGUNDA], SEGUNDA, [
      { fluxograma_id: 'aula-seg', data: SEGUNDA, status: 'cancelado' },
    ])

    expect(ocorrencias).toEqual([])
  })
})
