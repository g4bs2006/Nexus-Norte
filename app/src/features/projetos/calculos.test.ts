import { describe, expect, it } from 'vitest'
import {
  diasDesdeUltimaAtualizacao,
  momentumBaixo,
  percentualConcluido,
} from './calculos'

const HOJE = new Date(2026, 7, 4) // 2026-08-04

describe('percentualConcluido', () => {
  it('conta apenas marcos feitos', () => {
    expect(
      percentualConcluido([
        { status: 'feito' },
        { status: 'fazendo' },
        { status: 'a_fazer' },
        { status: 'feito' },
      ]),
    ).toBe(50)
  })

  it('devolve 100 quando todos estão feitos', () => {
    expect(percentualConcluido([{ status: 'feito' }])).toBe(100)
  })

  it('devolve null sem marcos, não 0', () => {
    // 0% sugeriria projeto parado; null diz "ainda não decomposto"
    expect(percentualConcluido([])).toBeNull()
  })

  it('não conta "fazendo" como concluído', () => {
    expect(percentualConcluido([{ status: 'fazendo' }])).toBe(0)
  })
})

describe('diasDesdeUltimaAtualizacao', () => {
  it('usa o log mais recente, independente da ordem', () => {
    expect(
      diasDesdeUltimaAtualizacao(
        [{ data: '2026-07-20' }, { data: '2026-08-01' }, { data: '2026-07-25' }],
        HOJE,
      ),
    ).toBe(3)
  })

  it('devolve 0 para log de hoje', () => {
    expect(diasDesdeUltimaAtualizacao([{ data: '2026-08-04' }], HOJE)).toBe(0)
  })

  it('devolve null quando nunca houve log', () => {
    expect(diasDesdeUltimaAtualizacao([], HOJE)).toBeNull()
  })

  it('não devolve negativo para log com data futura', () => {
    expect(diasDesdeUltimaAtualizacao([{ data: '2026-08-10' }], HOJE)).toBe(0)
  })
})

describe('momentumBaixo', () => {
  it('sinaliza a partir do limite', () => {
    expect(momentumBaixo(14, 14)).toBe(true)
    expect(momentumBaixo(20, 14)).toBe(true)
  })

  it('não sinaliza abaixo do limite', () => {
    expect(momentumBaixo(13, 14)).toBe(false)
    expect(momentumBaixo(0, 14)).toBe(false)
  })

  it('trata projeto sem nenhum log como momentum baixo', () => {
    expect(momentumBaixo(null)).toBe(true)
  })
})
