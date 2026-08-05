import { describe, expect, it } from 'vitest'
import { formatarDecimal, parseDecimal } from './numeros'

describe('parseDecimal', () => {
  it('aceita a vírgula do teclado brasileiro', () => {
    expect(parseDecimal('87,5')).toBe(87.5)
    expect(parseDecimal('12,50')).toBe(12.5)
    expect(parseDecimal('0,1')).toBe(0.1)
  })

  it('aceita o ponto como separador decimal', () => {
    expect(parseDecimal('87.5')).toBe(87.5)
    expect(parseDecimal('0.01')).toBe(0.01)
  })

  it('lê inteiro sem separador', () => {
    expect(parseDecimal('42')).toBe(42)
    expect(parseDecimal('0')).toBe(0)
  })

  it('trata ponto em grupos de três como milhar, não como decimal', () => {
    // Sem esta regra "1.500" viraria 1,5 — erro de mil vezes num app de finanças
    expect(parseDecimal('1.500')).toBe(1500)
    expect(parseDecimal('12.345.678')).toBe(12345678)
  })

  it('com vírgula presente, o ponto é milhar', () => {
    expect(parseDecimal('1.234,56')).toBe(1234.56)
    expect(parseDecimal('12.345.678,90')).toBe(12345678.9)
  })

  it('aceita negativo', () => {
    // Rendimento de investimento pode ser prejuízo no período
    expect(parseDecimal('-250,75')).toBe(-250.75)
    expect(parseDecimal('-1.500')).toBe(-1500)
  })

  it('ignora espaço em volta', () => {
    expect(parseDecimal('  87,5  ')).toBe(87.5)
  })

  it('devolve NaN para vazio em vez de zero', () => {
    // `Number('')` é 0, e zero é valor legítimo: confundir os dois esconde dado
    expect(parseDecimal('')).toBeNaN()
    expect(parseDecimal('   ')).toBeNaN()
  })

  it('devolve NaN para entrada incompleta', () => {
    expect(parseDecimal('-')).toBeNaN()
    expect(parseDecimal(',')).toBeNaN()
    expect(parseDecimal('.')).toBeNaN()
  })

  it('devolve NaN para o que não é número', () => {
    expect(parseDecimal('abc')).toBeNaN()
    expect(parseDecimal('12abc')).toBeNaN()
    expect(parseDecimal('1,2,3')).toBeNaN()
    expect(parseDecimal('1.2.3')).toBeNaN()
  })

  it('rejeita o que Number aceitaria mas um campo numérico não deveria', () => {
    expect(parseDecimal('0x1f')).toBeNaN()
    expect(parseDecimal('1e5')).toBeNaN()
    expect(parseDecimal('Infinity')).toBeNaN()
  })
})

describe('formatarDecimal', () => {
  it('escreve o decimal com vírgula', () => {
    expect(formatarDecimal(87.5)).toBe('87,5')
    expect(formatarDecimal(1234.56)).toBe('1234,56')
  })

  it('mantém inteiro sem separador', () => {
    expect(formatarDecimal(42)).toBe('42')
    expect(formatarDecimal(0)).toBe('0')
  })

  it('ausência vira campo vazio, não zero', () => {
    expect(formatarDecimal(null)).toBe('')
    expect(formatarDecimal(undefined)).toBe('')
    expect(formatarDecimal(Number.NaN)).toBe('')
  })

  it('volta por parseDecimal sem perder o valor', () => {
    for (const valor of [0, 0.1, 42, 87.5, 1234.56, -250.75]) {
      expect(parseDecimal(formatarDecimal(valor))).toBe(valor)
    }
  })
})
