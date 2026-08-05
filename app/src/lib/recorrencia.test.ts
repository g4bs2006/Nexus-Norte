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
    const ocorrencias = expandirRecorrencia([AULA_SEGUNDA, AULA_QUARTA], {
      de: SEGUNDA,
      ate: DOMINGO,
    })

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

  it('move a ocorrência remarcada para a nova data', () => {
    const ocorrencias = expandirRecorrencia(
      [AULA_SEGUNDA],
      { de: SEGUNDA, ate: DOMINGO },
      [
        {
          fluxograma_id: 'aula-seg',
          data: SEGUNDA,
          status: 'remarcado',
          nova_data: '2026-08-06',
        },
      ],
    )

    expect(ocorrencias).toHaveLength(1)
    expect(ocorrencias[0]?.data).toBe('2026-08-06')
    expect(ocorrencias[0]?.remarcada).toBe(true)
    expect(ocorrencias[0]?.dataOriginal).toBe(SEGUNDA)
  })

  it('remarca para um dia da semana que a regra não cobre', () => {
    // O caso real: "treinei quinta em vez de terça". O laço por dia da semana
    // nunca geraria quinta, então o destino tem de entrar por outro caminho.
    const ocorrencias = expandirRecorrencia(
      [AULA_SEGUNDA],
      { de: SEGUNDA, ate: DOMINGO },
      [
        {
          fluxograma_id: 'aula-seg',
          data: SEGUNDA,
          status: 'remarcado',
          nova_data: '2026-08-08', // sábado
        },
      ],
    )

    expect(ocorrencias.map((o) => o.data)).toEqual(['2026-08-08'])
  })

  it('sobrescreve o horário quando a remarcação traz um', () => {
    const comHorario = {
      id: 'aula-seg',
      dia_semana: 1,
      horario_inicio: '08:00:00',
      horario_fim: '10:00:00',
    }

    const ocorrencias = expandirRecorrencia(
      [comHorario],
      { de: SEGUNDA, ate: DOMINGO },
      [
        {
          fluxograma_id: 'aula-seg',
          data: SEGUNDA,
          status: 'remarcado',
          nova_data: '2026-08-06',
          novo_horario_inicio: '19:00:00',
          novo_horario_fim: '21:00:00',
        },
      ],
    )

    expect(ocorrencias[0]?.regra.horario_inicio).toBe('19:00:00')
    expect(ocorrencias[0]?.regra.horario_fim).toBe('21:00:00')
    // A regra original não pode ter sido mutada — outras datas ainda a usam
    expect(comHorario.horario_inicio).toBe('08:00:00')
  })

  it('herda o horário do padrão quando a remarcação só muda o dia', () => {
    const ocorrencias = expandirRecorrencia(
      [{ id: 'aula-seg', dia_semana: 1, horario_inicio: '08:00:00' }],
      { de: SEGUNDA, ate: DOMINGO },
      [
        {
          fluxograma_id: 'aula-seg',
          data: SEGUNDA,
          status: 'remarcado',
          nova_data: '2026-08-06',
          novo_horario_inicio: null,
          novo_horario_fim: null,
        },
      ],
    )

    expect(ocorrencias[0]?.regra.horario_inicio).toBe('08:00:00')
  })

  it('aceita remarcação no mesmo dia, só mudando o horário', () => {
    const ocorrencias = expandirRecorrencia(
      [{ id: 'aula-seg', dia_semana: 1, horario_inicio: '08:00:00' }],
      { de: SEGUNDA, ate: SEGUNDA },
      [
        {
          fluxograma_id: 'aula-seg',
          data: SEGUNDA,
          status: 'remarcado',
          nova_data: SEGUNDA,
          novo_horario_inicio: '14:00:00',
          novo_horario_fim: '16:00:00',
        },
      ],
    )

    expect(ocorrencias).toHaveLength(1)
    expect(ocorrencias[0]?.data).toBe(SEGUNDA)
    expect(ocorrencias[0]?.regra.horario_inicio).toBe('14:00:00')
  })

  it('some da origem sem aparecer no destino quando o destino está fora do intervalo', () => {
    const ocorrencias = expandirRecorrencia(
      [AULA_SEGUNDA],
      { de: SEGUNDA, ate: DOMINGO },
      [
        {
          fluxograma_id: 'aula-seg',
          data: SEGUNDA,
          status: 'remarcado',
          nova_data: '2026-09-01',
        },
      ],
    )

    expect(ocorrencias).toEqual([])
  })

  it('traz o destino mesmo com a data original fora do intervalo', () => {
    // Empurrada de 31/07 (julho) para 03/08 (agosto): ao olhar agosto, a data
    // original nem aparece no intervalo, mas o destino tem de aparecer.
    const ocorrencias = expandirRecorrencia(
      [AULA_SEGUNDA],
      { de: SEGUNDA, ate: DOMINGO },
      [
        {
          fluxograma_id: 'aula-seg',
          data: '2026-07-31',
          status: 'remarcado',
          nova_data: '2026-08-05',
        },
      ],
    )

    expect(ocorrencias.map((o) => [o.data, o.remarcada])).toEqual([
      ['2026-08-03', false],
      ['2026-08-05', true],
    ])
  })

  it('ordena por data e depois por horário', () => {
    const manha = {
      id: 'manha',
      dia_semana: 3,
      horario_inicio: '08:00:00',
    }
    const noite = { id: 'noite', dia_semana: 1, horario_inicio: '20:00:00' }

    const ocorrencias = expandirRecorrencia(
      [manha, noite],
      { de: SEGUNDA, ate: DOMINGO },
      [
        // A remarcada cai na quarta às 12h: tem de ficar DEPOIS da aula da
        // manhã de quarta, não no fim da lista
        {
          fluxograma_id: 'noite',
          data: SEGUNDA,
          status: 'remarcado',
          nova_data: '2026-08-05',
          novo_horario_inicio: '12:00:00',
          novo_horario_fim: '13:00:00',
        },
      ],
    )

    expect(ocorrencias.map((o) => [o.data, o.regra.horario_inicio])).toEqual([
      ['2026-08-05', '08:00:00'],
      ['2026-08-05', '12:00:00'],
    ])
  })

  it('ignora remarcação cuja regra não está na lista', () => {
    const ocorrencias = expandirRecorrencia(
      [AULA_SEGUNDA],
      { de: SEGUNDA, ate: DOMINGO },
      [
        {
          fluxograma_id: 'regra-de-outro-pilar',
          data: SEGUNDA,
          status: 'remarcado',
          nova_data: '2026-08-06',
        },
      ],
    )

    expect(ocorrencias.map((o) => o.data)).toEqual(['2026-08-03'])
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
