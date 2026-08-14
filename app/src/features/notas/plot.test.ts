import { describe, expect, it } from 'vitest'
import { lerPlot } from './plot'

describe('lerPlot', () => {
  it('lê uma expressão sozinha, sem domínio', () => {
    expect(lerPlot('x^2')).toEqual({
      expressoes: ['x^2'],
      x: null,
      y: null,
      erros: [],
    })
  })

  it('trata intervalo solto como domínio', () => {
    expect(lerPlot('sin(x)\n-5:5')).toEqual({
      expressoes: ['sin(x)'],
      x: { de: -5, ate: 5 },
      y: null,
      erros: [],
    })
  })

  it('aceita os dois eixos nomeados', () => {
    expect(lerPlot('1/x\nx: -3:3\ny: -10:10')).toEqual({
      expressoes: ['1/x'],
      x: { de: -3, ate: 3 },
      y: { de: -10, ate: 10 },
      erros: [],
    })
  })

  it('guarda várias expressões na ordem escrita', () => {
    expect(lerPlot('x^2\nx^3\n2x').expressoes).toEqual(['x^2', 'x^3', '2x'])
  })

  it('ignora linha vazia e comentário', () => {
    expect(lerPlot('\n# a parábola\nx^2\n').expressoes).toEqual(['x^2'])
  })

  it('recusa intervalo invertido em vez de desenhar vazio', () => {
    const plot = lerPlot('x: 5:-5')
    expect(plot.x).toBeNull()
    expect(plot.erros).toEqual(['x: 5:-5'])
  })

  it('recusa intervalo degenerado', () => {
    expect(lerPlot('y: 2:2').erros).toEqual(['y: 2:2'])
  })

  it('aceita decimal no intervalo', () => {
    expect(lerPlot('sin(x)\n0:6.28').x).toEqual({ de: 0, ate: 6.28 })
  })

  it('devolve vazio para bloco vazio', () => {
    expect(lerPlot('')).toEqual({
      expressoes: [],
      x: null,
      y: null,
      erros: [],
    })
  })
})
