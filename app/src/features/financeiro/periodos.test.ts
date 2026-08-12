import { describe, expect, it } from 'vitest'
import { intervaloDoPreset } from './periodos'

/** 2026-08-05 é uma quarta; a semana (dom-sáb) vai de 08-02 a 08-08. */
const HOJE = new Date(2026, 7, 5)

describe('intervaloDoPreset', () => {
  it('"semana" vai de domingo a sábado', () => {
    expect(intervaloDoPreset('semana', HOJE)).toEqual({
      de: '2026-08-02',
      ate: '2026-08-08',
    })
  })

  it('"hoje" devolve o mesmo dia nos dois lados', () => {
    expect(intervaloDoPreset('hoje', HOJE)).toEqual({
      de: '2026-08-05',
      ate: '2026-08-05',
    })
  })
})
