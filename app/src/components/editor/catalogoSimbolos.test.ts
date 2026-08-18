import { describe, expect, it } from 'vitest'
import {
  SIMBOLOS,
  filtrarSimbolos,
  montarInsercao,
  simboloPorGatilho,
  simboloPorPalavra,
  simbolosRapidos,
} from './catalogoSimbolos'

describe('catálogo', () => {
  it('não tem gatilho repetido — gatilho é a chave da lista', () => {
    const gatilhos = SIMBOLOS.map((simbolo) => simbolo.gatilho)
    expect(new Set(gatilhos).size).toBe(gatilhos.length)
  })

  /*
   * Vale inclusive para a "fórmula em branco": ela é `{}`, e não vazia.
   * Um nó inline sem conteúdo nenhum não recebe cursor no `contenteditable`
   * — o que se digitasse saía fora da fórmula —, então até ela precisa de um
   * buraco onde o cursor pouse.
   */
  it('todo símbolo tem latex não vazio', () => {
    for (const simbolo of SIMBOLOS) {
      expect(simbolo.latex.trim()).not.toBe('')
    }
  })

  it('a fórmula em branco é a primeira — `//` e Enter abrem uma', () => {
    expect(SIMBOLOS[0]?.gatilho).toBe('formula')
  })

  it('a fórmula em branco tem onde o cursor pousar', () => {
    const branco = SIMBOLOS[0]
    expect(branco?.latex).toContain('{}')
    expect(montarInsercao(branco!, true).buracos).toHaveLength(1)
  })

  /*
   * O invariante era "todo gatilho é minúsculo", e a unificação dos catálogos
   * o quebrou de propósito: `\Delta` e `\delta` são símbolos diferentes e a
   * única coisa que os distingue é a caixa. Escrever `deltamaiusculo` para
   * preservar a regra seria pior — ninguém digita isso, e o LaTeX que se quer
   * aprender é `\Delta` mesmo.
   *
   * O que continua valendo, e é o que a regra realmente protegia: gatilho sem
   * espaço (a busca quebra em espaço) e sem repetição.
   */
  it('todo gatilho é sem espaço e só de letras', () => {
    for (const simbolo of SIMBOLOS) {
      expect(simbolo.gatilho).toBe(simbolo.gatilho.trim())
      expect(simbolo.gatilho).toMatch(/^[A-Za-z]+$/)
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

describe('simboloPorPalavra — o Tab do CampoMatematico', () => {
  it('acha a palavra sozinha', () => {
    expect(simboloPorPalavra('alpha')?.latex).toBe('\\alpha')
  })

  it('acha depois de um operador — o caso que o buffer de teclas perdia', () => {
    // `x+alpha` acumulava `xalpha` no buffer antigo, porque `+` não era letra
    // e também não zerava. Bastava uma letra antes na fórmula para o atalho
    // nunca mais funcionar.
    expect(simboloPorPalavra('x+alpha')?.latex).toBe('\\alpha')
  })

  it('acha depois de dígito e de LaTeX já escrito', () => {
    expect(simboloPorPalavra('2beta')?.latex).toBe('\\beta')
    expect(simboloPorPalavra('\frac{}{}gamma')?.latex).toBe('\\gamma')
  })

  it('distingue a caixa: delta e Delta são símbolos diferentes', () => {
    expect(simboloPorPalavra('delta')?.latex).toBe('\\delta')
    expect(simboloPorPalavra('Delta')?.latex).toBe('\\Delta')
  })

  it('prefere o maior gatilho quando um é sufixo do outro', () => {
    // `theta` termina em `eta`, que também é símbolo. O mais longo vence.
    expect(simboloPorPalavra('theta')?.latex).toBe('\\theta')
    expect(simboloPorPalavra('eta')?.latex).toBe('\\eta')
  })

  it('devolve undefined quando não há palavra convertível', () => {
    expect(simboloPorPalavra('')).toBeUndefined()
    expect(simboloPorPalavra('x+2')).toBeUndefined()
    expect(simboloPorPalavra('naoexiste')).toBeUndefined()
  })

  it('gamma existe — era o símbolo que só o Tab conhecia', () => {
    expect(simboloPorGatilho('gamma')).toBeDefined()
  })
})

describe('o catálogo é a única fonte para os três caminhos', () => {
  it('não há gatilho repetido', () => {
    const vistos = SIMBOLOS.map((s) => s.gatilho)
    expect(new Set(vistos).size).toBe(vistos.length)
  })

  it('a barra rápida do diálogo tem gregas e operadores', () => {
    expect(simbolosRapidos('grega').length).toBeGreaterThan(0)
    expect(simbolosRapidos('operador').length).toBeGreaterThan(0)
  })

  it('todo símbolo da barra é alcançável pelo Tab e pelo //', () => {
    for (const simbolo of [
      ...simbolosRapidos('grega'),
      ...simbolosRapidos('operador'),
    ]) {
      expect(simboloPorPalavra(simbolo.gatilho)).toBe(simbolo)
      expect(filtrarSimbolos(simbolo.gatilho)).toContain(simbolo)
    }
  })
})
