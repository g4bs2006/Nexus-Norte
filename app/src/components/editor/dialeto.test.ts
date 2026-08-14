import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { remarkDialeto } from './dialeto'

/**
 * Round-trip do dialeto: o texto tem que voltar igual ao que entrou.
 *
 * Este arquivo existe por causa de um bug real, medido em 14/08: o remark
 * ESCAPA colchete duplo ao serializar, então `[[series-de-taylor]]` voltava
 * como `\[\[series-de-taylor]]`. Como `extrairLinks` não reconhece o escapado
 * — e não deve mesmo, `\[` é escape de Markdown —, editar uma nota no editor
 * rico apagava os links e os desenhos dela.
 *
 * Os testes abaixo são o que impede isso de voltar. Se algum falhar com
 * `\[\[`, o escape voltou e o grafo está sendo destruído a cada salvamento.
 */

const processador = unified()
  .use(remarkParse)
  .use(remarkDialeto)
  .use(remarkStringify)

/** Markdown → mdast → Markdown, que é o caminho que o editor faz ao salvar. */
function daVolta(texto: string): string {
  return String(processador.processSync(texto)).trim()
}

describe('round-trip do wikilink', () => {
  it('não escapa os colchetes — a regressão que motivou este arquivo', () => {
    const volta = daVolta('ver [[series-de-taylor]] aqui')
    expect(volta).not.toContain('\\[')
    expect(volta).toBe('ver [[series-de-taylor]] aqui')
  })

  it('preserva o texto exibido', () => {
    expect(daVolta('ver [[limites|o que vimos]] aqui')).toBe(
      'ver [[limites|o que vimos]] aqui',
    )
  })

  it('sobrevive a duas voltas, que é o que salvar duas vezes faz', () => {
    const uma = daVolta('ver [[limites]] aqui')
    expect(daVolta(uma)).toBe(uma)
  })

  it('preserva vários links na mesma linha', () => {
    expect(daVolta('[[a]] e [[b]] e [[c]]')).toBe('[[a]] e [[b]] e [[c]]')
  })

  it('preserva link dentro de item de lista', () => {
    expect(daVolta('* um [[a]]\n* dois')).toBe('* um [[a]]\n* dois')
  })
})

describe('round-trip do desenho', () => {
  const id = '3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607'

  it('não escapa a referência', () => {
    const volta = daVolta(`antes ![[desenho:${id}]] depois`)
    expect(volta).not.toContain('\\[')
    expect(volta).toBe(`antes ![[desenho:${id}]] depois`)
  })

  it('sobrevive a duas voltas', () => {
    const uma = daVolta(`![[desenho:${id}]]`)
    expect(daVolta(uma)).toBe(uma)
  })

  it('deixa embed com uuid torto virar texto, sem quebrar', () => {
    // Não precisa voltar idêntico — precisa NÃO virar nó de desenho e não
    // derrubar o parse.
    expect(() => daVolta('![[desenho:nao-e-uuid]]')).not.toThrow()
  })
})

describe('round-trip do destaque', () => {
  it('preserva ==destaque==', () => {
    expect(daVolta('isto ==cai na prova== com certeza')).toBe(
      'isto ==cai na prova== com certeza',
    )
  })

  it('sobrevive a duas voltas', () => {
    const uma = daVolta('==importante==')
    expect(daVolta(uma)).toBe(uma)
  })

  it('convive com negrito na mesma linha', () => {
    expect(daVolta('**forte** e ==destacado==')).toBe(
      '**forte** e ==destacado==',
    )
  })

  it('deixa == solto em paz', () => {
    expect(daVolta('a == b')).toBe('a == b')
  })
})

describe('o que o dialeto não pode estragar', () => {
  it('fórmula continua intacta', () => {
    expect(daVolta('formula $x^2$ inline')).toBe('formula $x^2$ inline')
  })

  it('tópico continua intacto', () => {
    expect(daVolta('topico #taylor no texto')).toBe('topico #taylor no texto')
  })

  it('link normal de markdown não vira wikilink', () => {
    expect(daVolta('[texto](https://exemplo.com)')).toBe(
      '[texto](https://exemplo.com)',
    )
  })

  it('cerca de código passa sem ser tocada', () => {
    const cerca = '```mermaid\ngraph TD; A-->B\n```'
    expect(daVolta(cerca)).toBe(cerca)
  })

  it('colchete simples segue sendo colchete', () => {
    expect(daVolta('array\\[0]')).toContain('[0]')
  })
})
