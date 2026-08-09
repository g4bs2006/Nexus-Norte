import { describe, expect, it } from 'vitest'
import { canceladasDeHoje, type RegraRotulada } from './canceladas'
import type { ExcecaoRecorrencia } from '@/lib/recorrencia'

const HOJE = '2026-08-09'

const REGRAS: RegraRotulada[] = [
  { id: 'aula-1', horario_inicio: '08:00:00', rotulo: 'Cálculo II' },
  { id: 'trabalho-1', horario_inicio: '09:00:00', rotulo: 'Escritório' },
]

function cancelamento(
  fluxogramaId: string,
  data: string,
): ExcecaoRecorrencia {
  return { fluxograma_id: fluxogramaId, data, status: 'cancelado' }
}

describe('canceladasDeHoje', () => {
  it('inclui bloco livre cancelado hoje', () => {
    const resultado = canceladasDeHoje(
      REGRAS,
      [cancelamento('trabalho-1', HOJE)],
      HOJE,
    )

    expect(resultado).toEqual([
      {
        fluxogramaId: 'trabalho-1',
        rotulo: 'Escritório',
        horario: '09:00',
        data: HOJE,
      },
    ])
  })

  it('inclui aula cancelada hoje', () => {
    const resultado = canceladasDeHoje(
      REGRAS,
      [cancelamento('aula-1', HOJE)],
      HOJE,
    )

    expect(resultado.map((c) => c.rotulo)).toEqual(['Cálculo II'])
  })

  it('ignora cancelamento de outra data', () => {
    const resultado = canceladasDeHoje(
      REGRAS,
      [cancelamento('trabalho-1', '2026-08-08')],
      HOJE,
    )

    expect(resultado).toEqual([])
  })

  it('ignora remarcação — só cancelamento tem o que desfazer', () => {
    const remarcada: ExcecaoRecorrencia = {
      fluxograma_id: 'trabalho-1',
      data: HOJE,
      status: 'remarcado',
      nova_data: '2026-08-10',
    }

    expect(canceladasDeHoje(REGRAS, [remarcada], HOJE)).toEqual([])
  })

  it('ignora exceção cuja regra não está na lista recebida', () => {
    const resultado = canceladasDeHoje(
      REGRAS,
      [cancelamento('regra-que-nao-veio', HOJE)],
      HOJE,
    )

    expect(resultado).toEqual([])
  })

  it('trunca o horário para HH:MM', () => {
    const resultado = canceladasDeHoje(
      REGRAS,
      [cancelamento('aula-1', HOJE)],
      HOJE,
    )

    expect(resultado[0]?.horario).toBe('08:00')
  })
})
