import { describe, expect, it } from 'vitest'
import { formatarHoras, horasEntre } from './calculos'

describe('horasEntre', () => {
  it('trata sono que cruza a meia-noite', () => {
    // Mesmo caso validado contra a coluna gerada no Postgres
    expect(horasEntre('23:30:00', '07:15:00')).toBeCloseTo(7.75)
  })

  it('calcula intervalo dentro do mesmo dia', () => {
    expect(horasEntre('13:00:00', '14:30:00')).toBeCloseTo(1.5)
  })

  it('devolve 0 para horas iguais', () => {
    expect(horasEntre('22:00:00', '22:00:00')).toBe(0)
  })

  it('aceita hora sem segundos', () => {
    expect(horasEntre('23:00', '07:00')).toBeCloseTo(8)
  })
})

describe('formatarHoras', () => {
  it('formata horas fracionadas', () => {
    expect(formatarHoras(7.75)).toBe('7h45')
  })

  it('preenche minutos com zero', () => {
    expect(formatarHoras(8)).toBe('8h00')
  })

  it('formata menos de uma hora', () => {
    expect(formatarHoras(0.5)).toBe('0h30')
  })
})
