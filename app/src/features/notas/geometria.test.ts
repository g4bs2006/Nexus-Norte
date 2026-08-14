import { describe, expect, it } from 'vitest'
import { lerGeometria } from './geometria'

describe('lerGeometria', () => {
  it('lê um slider com valor inicial', () => {
    expect(lerGeometria('slider a: -3:3 = 1').sliders).toEqual([
      { nome: 'a', min: -3, max: 3, valor: 1 },
    ])
  })

  it('começa no meio quando o valor inicial não é dito', () => {
    expect(lerGeometria('slider k: 0:10').sliders).toEqual([
      { nome: 'k', min: 0, max: 10, valor: 5 },
    ])
  })

  it('prende o valor inicial dentro do intervalo', () => {
    expect(lerGeometria('slider a: 0:5 = 99').sliders[0]?.valor).toBe(5)
    expect(lerGeometria('slider a: 0:5 = -99').sliders[0]?.valor).toBe(0)
  })

  it('lê a curva citando o slider', () => {
    expect(lerGeometria('f(x) = a*x^2').curvas).toEqual([
      { nome: 'f', expressao: 'a*x^2' },
    ])
  })

  it('guarda várias curvas na ordem escrita', () => {
    const geo = lerGeometria('f(x) = x^2\ng(x) = 2*a*x - a^2')
    expect(geo.curvas.map((curva) => curva.nome)).toEqual(['f', 'g'])
  })

  it('lê os limites dos dois eixos', () => {
    const geo = lerGeometria('x: -5:5\ny: -2:8')
    expect(geo.x).toEqual({ de: -5, ate: 5 })
    expect(geo.y).toEqual({ de: -2, ate: 8 })
  })

  it('ignora linha vazia e comentário', () => {
    expect(lerGeometria('\n# a parábola\nf(x) = x^2\n').curvas).toHaveLength(1)
  })

  it('recusa intervalo invertido em slider e em eixo', () => {
    expect(lerGeometria('slider a: 3:-3').erros).toEqual(['slider a: 3:-3'])
    expect(lerGeometria('x: 5:1').erros).toEqual(['x: 5:1'])
  })

  it('junta o que não entendeu em erros, sem derrubar o resto', () => {
    const geo = lerGeometria('f(x) = x^2\nisto nao e diretiva')
    expect(geo.curvas).toHaveLength(1)
    expect(geo.erros).toEqual(['isto nao e diretiva'])
  })

  it('devolve vazio para bloco vazio', () => {
    expect(lerGeometria('')).toEqual({
      sliders: [],
      curvas: [],
      x: null,
      y: null,
      erros: [],
    })
  })
})
