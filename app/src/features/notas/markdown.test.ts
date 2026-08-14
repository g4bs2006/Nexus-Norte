import { describe, expect, it } from 'vitest'
import {
  fatiar,
  extrairLinks,
  extrairReferenciasDesenho,
  extrairTopicos,
  gerarSlug,
  removerMatematica,
  renomearLinks,
} from './markdown'

describe('gerarSlug', () => {
  it('é estável: o mesmo título dá sempre o mesmo slug', () => {
    expect(gerarSlug('Séries de Taylor')).toBe('series-de-taylor')
    expect(gerarSlug('Séries de Taylor')).toBe(gerarSlug('Séries de Taylor'))
  })

  it('remove acento e cedilha', () => {
    expect(gerarSlug('Integração por Substituição')).toBe(
      'integracao-por-substituicao',
    )
  })

  it('colapsa pontuação e espaço num hífen só, sem sobrar nas pontas', () => {
    expect(gerarSlug('  Transformada de Laplace — parte 2!  ')).toBe(
      'transformada-de-laplace-parte-2',
    )
  })

  it('cai no slug padrão quando não sobra caractere aproveitável', () => {
    expect(gerarSlug('  ***  ')).toBe('nota')
    expect(gerarSlug('')).toBe('nota')
  })

  it('resolve colisão com sufixo numérico', () => {
    expect(gerarSlug('Limites', ['limites'])).toBe('limites-2')
    expect(gerarSlug('Limites', ['limites', 'limites-2'])).toBe('limites-3')
  })

  it('não põe sufixo quando o slug está livre', () => {
    expect(gerarSlug('Limites', ['derivadas'])).toBe('limites')
  })
})

describe('extrairLinks', () => {
  it('acha [[slug]] e [[slug|texto]]', () => {
    const conteudo = 'Ver [[series-de-taylor]] e [[limites|o que vimos antes]].'
    expect(extrairLinks(conteudo)).toEqual(['series-de-taylor', 'limites'])
  })

  it('normaliza o alvo escrito como título', () => {
    expect(extrairLinks('Ver [[Séries de Taylor]]')).toEqual(['series-de-taylor'])
  })

  it('não repete o mesmo destino citado duas vezes', () => {
    expect(extrairLinks('[[limites]] e de novo [[limites|aqui]]')).toEqual([
      'limites',
    ])
  })

  it('ignora [[ dentro de bloco de código', () => {
    const conteudo = [
      'Antes [[limites]]',
      '```mermaid',
      'graph TD; A[[isto e sintaxe]] --> B',
      '```',
      'Depois [[derivadas]]',
    ].join('\n')
    expect(extrairLinks(conteudo)).toEqual(['limites', 'derivadas'])
  })

  it('ignora [[ dentro de $$ e de $', () => {
    const conteudo = 'Fora [[limites]], dentro $$\\begin{bmatrix}[[a]]\\end{bmatrix}$$ e $[[b]]$'
    expect(extrairLinks(conteudo)).toEqual(['limites'])
  })

  it('ignora [[ dentro de código inline', () => {
    expect(extrairLinks('a sintaxe é `[[slug]]` mesmo')).toEqual([])
  })

  it('não confunde embed de desenho com wikilink', () => {
    const conteudo = '![[desenho:3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607]] e [[limites]]'
    expect(extrairLinks(conteudo)).toEqual(['limites'])
  })

  it('devolve vazio quando não há link', () => {
    expect(extrairLinks('texto sem nenhuma aresta')).toEqual([])
  })
})

describe('extrairTopicos', () => {
  it('acha a hashtag e devolve slug com nome legível', () => {
    expect(extrairTopicos('Revisar #regra-da-cadeia hoje')).toEqual([
      { slug: 'regra-da-cadeia', nome: 'regra da cadeia' },
    ])
  })

  it('não repete o mesmo tópico citado duas vezes', () => {
    expect(extrairTopicos('#limites e mais #limites')).toEqual([
      { slug: 'limites', nome: 'limites' },
    ])
  })

  it('não confunde heading com tópico', () => {
    expect(extrairTopicos('# Título da nota\n## Subtítulo')).toEqual([])
  })

  it('ignora âncora de URL', () => {
    expect(extrairTopicos('ver http://exemplo.com/pagina#secao')).toEqual([])
  })

  it('ignora marcação sem letra nenhuma', () => {
    expect(extrairTopicos('questão #2 da lista')).toEqual([])
  })

  it('ignora hashtag dentro de código e de matemática', () => {
    const conteudo = ['`#nao-e-topico`', '$$x #tambem-nao$$', '#e-topico'].join('\n')
    expect(extrairTopicos(conteudo)).toEqual([
      { slug: 'e-topico', nome: 'e topico' },
    ])
  })

  it('acha o tópico no começo do conteúdo', () => {
    expect(extrairTopicos('#taylor abre a nota')).toEqual([
      { slug: 'taylor', nome: 'taylor' },
    ])
  })
})

describe('extrairReferenciasDesenho', () => {
  it('acha o uuid do desenho embutido, sem repetir', () => {
    const conteudo = [
      '![[desenho:3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607]]',
      'e de novo',
      '![[desenho:3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607]]',
    ].join('\n')
    expect(extrairReferenciasDesenho(conteudo)).toEqual([
      '3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607',
    ])
  })

  it('ignora referência com uuid malformado', () => {
    expect(extrairReferenciasDesenho('![[desenho:nao-e-uuid]]')).toEqual([])
  })

  it('ignora referência dentro de bloco de código', () => {
    const conteudo = [
      '```',
      '![[desenho:3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607]]',
      '```',
    ].join('\n')
    expect(extrairReferenciasDesenho(conteudo)).toEqual([])
  })
})

describe('removerMatematica', () => {
  it('não altera nada quando não há fórmula', () => {
    const conteudo = 'A soma converge para o limite da série.'
    expect(removerMatematica(conteudo)).toBe(conteudo)
  })

  it('tira o bloco $$ e preserva o texto em volta', () => {
    expect(
      removerMatematica('Antes\n$$\\frac{\\partial f}{\\partial x}$$\nDepois'),
    ).toBe('Antes\n \nDepois')
  })

  it('tira a fórmula inline sem colar as palavras vizinhas', () => {
    expect(removerMatematica('a$x$b')).toBe('a b')
  })

  it('não trata cifrão de dinheiro como fórmula', () => {
    const conteudo = 'custou R$ 50, sobrou R$ 30'
    expect(removerMatematica(conteudo)).toBe(conteudo)
  })

  it('não mexe em $ dentro de bloco de código', () => {
    const conteudo = ['```', 'echo $HOME e $PATH', '```'].join('\n')
    expect(removerMatematica(conteudo)).toBe(conteudo)
  })
})

describe('fatiar', () => {
  it('devolve uma fatia de texto só, quando não há construção nenhuma', () => {
    expect(fatiar('texto puro')).toEqual([{ tipo: 'texto', texto: 'texto puro' }])
  })

  it('separa texto, link e fórmula na ordem em que aparecem', () => {
    expect(fatiar('antes [[limites]] meio $x^2$ fim')).toEqual([
      { tipo: 'texto', texto: 'antes ' },
      { tipo: 'link', slug: 'limites', rotulo: null },
      { tipo: 'texto', texto: ' meio ' },
      { tipo: 'matematica', latex: 'x^2', bloco: false },
      { tipo: 'texto', texto: ' fim' },
    ])
  })

  it('entrega o latex sem os delimitadores e marca o bloco', () => {
    expect(fatiar('$$\\frac{a}{b}$$')).toEqual([
      { tipo: 'matematica', latex: '\\frac{a}{b}', bloco: true },
    ])
  })

  it('preserva o texto exibido do link', () => {
    expect(fatiar('[[limites|o que vimos]]')).toEqual([
      { tipo: 'link', slug: 'limites', rotulo: 'o que vimos' },
    ])
  })

  it('entrega a cerca com a linguagem e o corpo, sem os delimitadores', () => {
    expect(fatiar('```mermaid\ngraph TD; A-->B\n```')).toEqual([
      { tipo: 'cerca', linguagem: 'mermaid', codigo: 'graph TD; A-->B' },
    ])
  })

  it('não vê link nem fórmula dentro da cerca', () => {
    expect(fatiar('```\n[[nao]] $nao$\n```')).toEqual([
      { tipo: 'cerca', linguagem: '', codigo: '[[nao]] $nao$' },
    ])
  })

  it('preserva as linhas do corpo da cerca', () => {
    expect(fatiar('```plot\nx^2\n-5:5\n```')).toEqual([
      { tipo: 'cerca', linguagem: 'plot', codigo: 'x^2\n-5:5' },
    ])
  })

  it('acha o desenho embutido entre o texto', () => {
    const id = '3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607'
    expect(fatiar(`antes ![[desenho:${id}]] depois`)).toEqual([
      { tipo: 'texto', texto: 'antes ' },
      { tipo: 'desenho', id },
      { tipo: 'texto', texto: ' depois' },
    ])
  })

  it('devolve vazio para conteúdo vazio', () => {
    expect(fatiar('')).toEqual([])
  })
})

describe('renomearLinks', () => {
  it('troca só o alvo pedido', () => {
    expect(
      renomearLinks('[[limites]] e [[derivadas]]', 'limites', 'limites-1'),
    ).toBe('[[limites-1]] e [[derivadas]]')
  })

  it('preserva o texto exibido', () => {
    expect(
      renomearLinks('[[limites|o que vimos antes]]', 'limites', 'limites-1'),
    ).toBe('[[limites-1|o que vimos antes]]')
  })

  it('alcança o link escrito como título', () => {
    expect(renomearLinks('[[Séries de Taylor]]', 'series-de-taylor', 'taylor')).toBe(
      '[[taylor]]',
    )
  })

  it('não mexe em link dentro de código nem de matemática', () => {
    const conteudo = ['`[[limites]]`', '$$[[limites]]$$', '[[limites]]'].join('\n')
    expect(renomearLinks(conteudo, 'limites', 'limites-1')).toBe(
      ['`[[limites]]`', '$$[[limites]]$$', '[[limites-1]]'].join('\n'),
    )
  })

  it('devolve o conteúdo intacto quando o alvo não é citado', () => {
    const conteudo = 'nada aqui aponta para lá'
    expect(renomearLinks(conteudo, 'limites', 'limites-1')).toBe(conteudo)
  })

  it('é no-op quando o slug não muda', () => {
    const conteudo = '[[limites]]'
    expect(renomearLinks(conteudo, 'limites', 'Limites')).toBe(conteudo)
  })
})
