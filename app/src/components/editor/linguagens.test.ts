import { describe, expect, it } from 'vitest'
import {
  LINGUAGENS,
  filtrarLinguagens,
  realcar,
  resolver,
  rotularInfo,
} from './linguagens'

describe('resolver', () => {
  it('aceita a chave, o apelido e o caixa alta', () => {
    expect(resolver('python')?.chave).toBe('python')
    expect(resolver('py')?.chave).toBe('python')
    expect(resolver('  PY  ')?.chave).toBe('python')
    expect(resolver('c++')?.chave).toBe('cpp')
    expect(resolver('yml')?.chave).toBe('yaml')
  })

  it('devolve null para texto puro e para linguagem de fora', () => {
    expect(resolver('')).toBeNull()
    expect(resolver('   ')).toBeNull()
    expect(resolver('elixir')).toBeNull()
  })
})

describe('rotularInfo', () => {
  it('nomeia o vazio de Texto e a desconhecida por ela mesma', () => {
    expect(rotularInfo('')).toBe('Texto')
    expect(rotularInfo('py')).toBe('Python')
    /*
     * O bloco ```` ```elixir ```` de uma nota antiga precisa se anunciar:
     * mostrá-lo como "Texto" esconderia que há um info string ali, e a única
     * pista restante seria abrir o Markdown.
     */
    expect(rotularInfo('elixir')).toBe('elixir')
  })
})

describe('filtrarLinguagens', () => {
  it('sem termo, devolve o catálogo inteiro na ordem', () => {
    expect(filtrarLinguagens('')).toHaveLength(LINGUAGENS.length)
    expect(filtrarLinguagens('')[0]?.rotulo).toBe('Texto')
  })

  it('põe o nome exato antes do prefixo', () => {
    /* `java` é prefixo de `javascript`, que vem ANTES no catálogo. */
    expect(filtrarLinguagens('java')[0]?.chave).toBe('java')
    expect(filtrarLinguagens('java').map((l) => l.chave)).toContain('javascript')
  })

  it('acha por apelido e por rótulo', () => {
    expect(filtrarLinguagens('ts')[0]?.chave).toBe('typescript')
    expect(filtrarLinguagens('shell')[0]?.chave).toBe('bash')
  })

  it('devolve vazio para o que não existe', () => {
    expect(filtrarLinguagens('cobol')).toEqual([])
  })
})

describe('realcar', () => {
  it('não colore texto puro nem linguagem de fora', () => {
    expect(realcar('def f(): pass', '')).toEqual([])
    expect(realcar('defmodule X do end', 'elixir')).toEqual([])
  })

  it('marca a palavra reservada com o deslocamento exato', () => {
    const codigo = 'def somar(a, b):'
    const tokens = realcar(codigo, 'python')

    const palavra = tokens.find((t) => t.classe.includes('hljs-keyword'))
    expect(palavra).toBeDefined()
    expect(codigo.slice(palavra!.inicio, palavra!.fim)).toBe('def')
  })

  it('entrega os trechos em ordem e sem sobreposição', () => {
    const codigo = [
      '# soma',
      'def somar(a, b):',
      '    return a + b  # devolve',
      'texto = "ok"',
    ].join('\n')

    const tokens = realcar(codigo, 'python')
    expect(tokens.length).toBeGreaterThan(0)

    let anterior = 0
    for (const token of tokens) {
      expect(token.inicio).toBeGreaterThanOrEqual(anterior)
      expect(token.fim).toBeGreaterThan(token.inicio)
      anterior = token.fim
    }
    /*
     * O último trecho não pode passar do fim do código: é o que garante que os
     * deslocamentos servem como posição no documento do ProseMirror, que é o
     * único uso que `realce.ts` faz deles.
     */
    expect(anterior).toBeLessThanOrEqual(codigo.length)
  })

  it('resolve o apelido antes de realçar', () => {
    expect(realcar('const x = 1', 'js')).not.toEqual([])
    /* `html` é `xml` no highlight.js — o mapeamento é interno. */
    expect(realcar('<p>oi</p>', 'html')).not.toEqual([])
  })

  it('a classe mais interna vence a de fora', () => {
    /*
     * Numa f-string o `hljs-subst` de dentro é mais específico que o
     * `hljs-string` de fora. Se a de fora vencesse, a interpolação apareceria
     * com a cor de texto literal.
     */
    const codigo = 'f"total: {a + b}"'
    const tokens = realcar(codigo, 'python')
    const dentro = tokens.find((t) => t.classe.includes('subst'))
    expect(dentro).toBeDefined()
    expect(codigo.slice(dentro!.inicio, dentro!.fim)).toContain('a')
  })
})
