import { describe, expect, it } from 'vitest'
import { planejarArestas, planejarPropagacao, planejarTopicos } from './grafo'

/** Notas que já existem, no formato que `planejarArestas` consulta. */
function resolver(...slugs: string[]): ReadonlyMap<string, string> {
  return new Map(slugs.map((slug) => [slug, `id-${slug}`]))
}

describe('planejarArestas', () => {
  it('resolve destino_id do slug que já tem nota', () => {
    expect(planejarArestas('Ver [[limites]]', resolver('limites'))).toEqual([
      { destino_slug: 'limites', destino_id: 'id-limites' },
    ])
  })

  it('grava aresta com destino_id nulo para slug inexistente', () => {
    expect(planejarArestas('Ver [[ainda-nao-escrita]]', resolver())).toEqual([
      { destino_slug: 'ainda-nao-escrita', destino_id: null },
    ])
  })

  it('é a lista completa, então link removido do texto some do plano', () => {
    const antes = planejarArestas('[[limites]] e [[derivadas]]', resolver('limites'))
    const depois = planejarArestas('[[limites]]', resolver('limites'))

    expect(antes.map((aresta) => aresta.destino_slug)).toEqual([
      'limites',
      'derivadas',
    ])
    expect(depois.map((aresta) => aresta.destino_slug)).toEqual(['limites'])
  })

  it('não cria aresta da nota para ela mesma', () => {
    expect(
      planejarArestas('Ver [[limites]]', resolver('limites'), 'limites'),
    ).toEqual([])
  })

  it('não duplica aresta quando o mesmo destino é citado duas vezes', () => {
    expect(
      planejarArestas('[[limites]] e [[limites|de novo]]', resolver('limites')),
    ).toEqual([{ destino_slug: 'limites', destino_id: 'id-limites' }])
  })

  it('não vê link dentro de código nem de matemática', () => {
    expect(planejarArestas('`[[limites]]` $[[x]]$', resolver('limites'))).toEqual(
      [],
    )
  })

  it('devolve vazio quando a nota não cita ninguém', () => {
    expect(planejarArestas('texto solto', resolver('limites'))).toEqual([])
  })
})

describe('planejarTopicos', () => {
  it('é a lista completa, então hashtag removida some do plano', () => {
    expect(planejarTopicos('#taylor e #series')).toHaveLength(2)
    expect(planejarTopicos('#taylor')).toEqual([
      { slug: 'taylor', nome: 'taylor' },
    ])
  })
})

describe('planejarPropagacao', () => {
  it('reescreve o link de entrada preservando o texto exibido', () => {
    const citantes = [
      { id: 'a', conteudo: 'Ver [[limites|o que vimos antes]]' },
      { id: 'b', conteudo: 'Ver [[limites]]' },
    ]

    expect(planejarPropagacao(citantes, 'limites', 'limites-1')).toEqual([
      { id: 'a', conteudo: 'Ver [[limites-1|o que vimos antes]]' },
      { id: 'b', conteudo: 'Ver [[limites-1]]' },
    ])
  })

  it('deixa de fora a nota cujo conteúdo não mudaria', () => {
    const citantes = [
      { id: 'a', conteudo: 'Ver [[limites]]' },
      { id: 'b', conteudo: 'Ver [[derivadas]]' },
      { id: 'c', conteudo: 'só cita dentro de `[[limites]]`' },
    ]

    expect(planejarPropagacao(citantes, 'limites', 'limites-1')).toEqual([
      { id: 'a', conteudo: 'Ver [[limites-1]]' },
    ])
  })

  it('devolve vazio quando ninguém cita o slug', () => {
    expect(
      planejarPropagacao([{ id: 'a', conteudo: 'nada' }], 'limites', 'novo'),
    ).toEqual([])
  })
})
