import { describe, expect, it } from 'vitest'
import { checkinsNaSemana, progressoNumerico, streakAtual } from './calculos'
import type { MetaCheckin } from './types'

/** 2026-08-05 é uma quarta-feira; a semana (seg-dom) vai de 08-03 a 08-09. */
const HOJE = new Date(2026, 7, 5)

function checkin(data: string, feito = true): MetaCheckin {
  return { id: data, meta_id: 'meta-1', data, feito }
}

describe('streakAtual', () => {
  it('conta dias consecutivos terminando hoje', () => {
    const checkins = [
      checkin('2026-08-05'),
      checkin('2026-08-04'),
      checkin('2026-08-03'),
    ]
    expect(streakAtual(checkins, HOJE)).toBe(3)
  })

  it('conta a partir de ontem quando hoje ainda não foi marcado', () => {
    const checkins = [checkin('2026-08-04'), checkin('2026-08-03')]
    expect(streakAtual(checkins, HOJE)).toBe(2)
  })

  it('zera quando falta um dia no meio', () => {
    const checkins = [checkin('2026-08-05'), checkin('2026-08-03')]
    expect(streakAtual(checkins, HOJE)).toBe(1)
  })

  it('ignora check-ins marcados feito=false', () => {
    const checkins = [checkin('2026-08-05', false)]
    expect(streakAtual(checkins, HOJE)).toBe(0)
  })

  it('devolve 0 sem check-ins', () => {
    expect(streakAtual([], HOJE)).toBe(0)
  })
})

describe('checkinsNaSemana', () => {
  it('conta só os check-ins dentro da semana (segunda a domingo)', () => {
    const checkins = [
      checkin('2026-08-03'), // segunda — dentro
      checkin('2026-08-05'), // dentro
      checkin('2026-08-09'), // domingo — dentro
      checkin('2026-08-10'), // fora (semana seguinte)
      checkin('2026-08-02'), // fora (semana anterior)
    ]
    expect(checkinsNaSemana(checkins, HOJE)).toBe(3)
  })

  it('ignora feito=false', () => {
    const checkins = [checkin('2026-08-05', false)]
    expect(checkinsNaSemana(checkins, HOJE)).toBe(0)
  })
})

describe('progressoNumerico', () => {
  it('calcula percentual', () => {
    expect(progressoNumerico(50, 200)).toBe(25)
  })

  it('limita em 100 quando o atual passa do alvo', () => {
    expect(progressoNumerico(300, 200)).toBe(100)
  })

  it('devolve null sem alvo', () => {
    expect(progressoNumerico(50, null)).toBeNull()
  })

  it('devolve null sem valor atual', () => {
    expect(progressoNumerico(null, 200)).toBeNull()
  })

  it('devolve null com alvo zero ou negativo', () => {
    expect(progressoNumerico(50, 0)).toBeNull()
  })
})
