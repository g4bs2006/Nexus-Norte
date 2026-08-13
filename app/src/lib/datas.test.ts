import { describe, expect, it } from 'vitest'
import { formatarDuracao, inicioSemana, paraISO } from './datas'

/**
 * Datas fixas de 2026-08: 02 é domingo, 05 quarta, 08 sábado, 09 domingo.
 * Construídas com `new Date(ano, mês, dia)` — o mês é 0-indexado — porque
 * `new Date('2026-08-05')` seria interpretado como UTC e cairia no dia 4 no
 * fuso do Brasil.
 */
describe('inicioSemana', () => {
  it('volta para o domingo anterior a partir de uma quarta', () => {
    expect(paraISO(inicioSemana(new Date(2026, 7, 5)))).toBe('2026-08-02')
  })

  it('devolve o próprio dia quando recebe um domingo', () => {
    expect(paraISO(inicioSemana(new Date(2026, 7, 2)))).toBe('2026-08-02')
  })

  it('volta seis dias a partir de um sábado', () => {
    expect(paraISO(inicioSemana(new Date(2026, 7, 8)))).toBe('2026-08-02')
  })

  it('o domingo seguinte já abre a semana seguinte', () => {
    expect(paraISO(inicioSemana(new Date(2026, 7, 9)))).toBe('2026-08-09')
  })
})

describe('formatarDuracao', () => {
  it('formata horas e minutos', () => {
    expect(formatarDuracao(210)).toBe('3h30')
    expect(formatarDuracao(120)).toBe('2h')
    expect(formatarDuracao(45)).toBe('45min')
  })

  it('usa travessão para zero', () => {
    expect(formatarDuracao(0)).toBe('—')
  })
})
