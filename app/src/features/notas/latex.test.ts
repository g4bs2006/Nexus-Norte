import { describe, expect, it } from 'vitest'
import { SIMBOLOS, filtrarSimbolos, montarInsercao } from './latex'

describe('catálogo', () => {
  it('não tem gatilho repetido — gatilho é a chave da lista', () => {
    const gatilhos = SIMBOLOS.map((simbolo) => simbolo.gatilho)
    expect(new Set(gatilhos).size).toBe(gatilhos.length)
  })

  /*
   * A fórmula em branco é a ÚNICA entrada sem latex, e é assim de propósito:
   * é ela que abre um nó vazio para se escrever dentro (`simbolos.ts`). O
   * teste continua guardando o resto do catálogo contra entrada sem conteúdo
   * — que seria um item de menu que não insere nada.
   */
  it('só a fórmula em branco tem latex vazio', () => {
    const vazios = SIMBOLOS.filter((simbolo) => simbolo.latex.trim() === '')
    expect(vazios.map((simbolo) => simbolo.gatilho)).toEqual(['formula'])
  })

  it('a fórmula em branco é a primeira — `//` e Enter abrem uma', () => {
    expect(SIMBOLOS[0]?.gatilho).toBe('formula')
  })

  it('todo gatilho é minúsculo e sem espaço', () => {
    for (const simbolo of SIMBOLOS) {
      expect(simbolo.gatilho).toBe(simbolo.gatilho.toLowerCase().trim())
      expect(simbolo.gatilho).not.toContain(' ')
    }
  })
})

describe('filtrarSimbolos', () => {
  it('acha por prefixo do gatilho', () => {
    expect(filtrarSimbolos('int')[0]?.gatilho).toBe('int')
  })

  it('põe o casamento por prefixo antes do casamento por texto', () => {
    const achados = filtrarSimbolos('int')
    const posInt = achados.findIndex((s) => s.gatilho === 'int')
    const posOutro = achados.findIndex((s) => s.gatilho === 'oint')
    expect(posInt).toBeLessThan(posOutro)
  })

  it('acha pelo sinônimo em português', () => {
    expect(filtrarSimbolos('soma').map((s) => s.gatilho)).toContain('sum')
    expect(filtrarSimbolos('fracao').map((s) => s.gatilho)).toContain('frac')
  })

  it('devolve o catálogo inteiro com termo vazio', () => {
    expect(filtrarSimbolos('')).toHaveLength(SIMBOLOS.length)
  })

  it('devolve vazio para termo que não casa com nada', () => {
    expect(filtrarSimbolos('zzzzz')).toEqual([])
  })

  it('ignora caixa e espaço em volta', () => {
    expect(filtrarSimbolos('  INT ')[0]?.gatilho).toBe('int')
  })
})

describe('montarInsercao', () => {
  const frac = SIMBOLOS.find((s) => s.gatilho === 'frac')!

  it('embrulha em $ quando está fora de fórmula', () => {
    expect(montarInsercao(frac, false).texto).toBe('$\\frac{}{}$')
  })

  it('sai cru quando já está dentro de fórmula', () => {
    expect(montarInsercao(frac, true).texto).toBe('\\frac{}{}')
  })

  it('aponta os buracos entre as chaves', () => {
    const { texto, buracos } = montarInsercao(frac, true)
    // '\frac{}{}' — os buracos ficam logo depois de cada '{'
    for (const buraco of buracos) {
      expect(texto[buraco - 1]).toBe('{')
      expect(texto[buraco]).toBe('}')
    }
    expect(buracos).toHaveLength(2)
  })

  it('desloca os buracos pelo $ de abertura', () => {
    const dentro = montarInsercao(frac, true)
    const fora = montarInsercao(frac, false)
    expect(fora.buracos[0]).toBe((dentro.buracos[0] as number) + 1)
  })

  it('não inventa buraco em símbolo sem chaves', () => {
    const pi = SIMBOLOS.find((s) => s.gatilho === 'pi')!
    expect(montarInsercao(pi, true).buracos).toEqual([])
  })
})
