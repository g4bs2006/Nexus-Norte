import { describe, expect, it } from 'vitest'
import {
  agruparPorCategoria,
  metasDaCategoria,
  moverNaCategoria,
  moverParaCategoria,
  moverParaExtremo,
  posicaoNaCategoria,
} from './ordenacao'
import type { CategoriaMeta, Meta } from './types'

function meta(
  id: string,
  ordem: number,
  categoria_meta_id: string | null = null,
  criada_em = `2026-08-01T00:00:0${ordem}Z`,
): Meta {
  return {
    id,
    titulo: id,
    descricao: null,
    categoria_meta_id,
    pilar: null,
    concluida: false,
    data_alvo: null,
    no_check_diario: false,
    ordem,
    criada_em,
    concluida_em: null,
  }
}

function categoria(id: string, ordem: number): CategoriaMeta {
  return {
    id,
    nome: id,
    cor: '#4a87c4',
    ordem,
    criada_em: `2026-08-01T00:00:0${ordem}Z`,
  }
}

describe('metasDaCategoria', () => {
  it('filtra pela categoria e ordena por ordem', () => {
    const metas = [meta('b', 1, 'cat'), meta('solta', 0), meta('a', 0, 'cat')]
    expect(metasDaCategoria(metas, 'cat').map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('usa criada_em para desempatar ordem repetida', () => {
    // Legado: metas antigas nasceram todas com ordem = 0.
    const metas = [
      meta('segunda', 0, 'cat', '2026-08-02T00:00:00Z'),
      meta('primeira', 0, 'cat', '2026-08-01T00:00:00Z'),
    ]
    expect(metasDaCategoria(metas, 'cat').map((m) => m.id)).toEqual([
      'primeira',
      'segunda',
    ])
  })

  it('trata null como o grupo sem categoria', () => {
    const metas = [meta('solta', 0), meta('na-cat', 0, 'cat')]
    expect(metasDaCategoria(metas, null).map((m) => m.id)).toEqual(['solta'])
  })
})

describe('agruparPorCategoria', () => {
  it('mantém categoria vazia no resultado — é destino visível para mover', () => {
    const grupos = agruparPorCategoria([], [categoria('vazia', 0)])
    expect(grupos).toHaveLength(1)
    expect(grupos[0]?.categoria?.id).toBe('vazia')
    expect(grupos[0]?.metas).toEqual([])
  })

  it('põe as metas sem categoria por último', () => {
    const grupos = agruparPorCategoria(
      [meta('solta', 0), meta('na-cat', 0, 'cat')],
      [categoria('cat', 0)],
    )
    expect(grupos.map((g) => g.categoria?.id ?? null)).toEqual(['cat', null])
  })

  it('omite o grupo sem categoria quando não há meta solta', () => {
    const grupos = agruparPorCategoria(
      [meta('na-cat', 0, 'cat')],
      [categoria('cat', 0)],
    )
    expect(grupos).toHaveLength(1)
  })

  it('respeita a ordem das categorias', () => {
    const grupos = agruparPorCategoria([], [categoria('b', 1), categoria('a', 0)])
    expect(grupos.map((g) => g.categoria?.id)).toEqual(['a', 'b'])
  })
})

describe('posicaoNaCategoria', () => {
  it('conta só as irmãs da mesma categoria', () => {
    const metas = [
      meta('a', 0, 'cat'),
      meta('b', 1, 'cat'),
      meta('outra', 0, 'outra-cat'),
    ]
    expect(posicaoNaCategoria(metas, 'b')).toEqual({ indice: 1, total: 2 })
  })

  it('devolve indice -1 para meta inexistente', () => {
    expect(posicaoNaCategoria([], 'fantasma')).toEqual({ indice: -1, total: 0 })
  })
})

describe('moverNaCategoria', () => {
  it('troca com a vizinha de cima', () => {
    const metas = [meta('a', 0, 'cat'), meta('b', 1, 'cat'), meta('c', 2, 'cat')]
    expect(moverNaCategoria(metas, 'c', -1)).toEqual([
      { id: 'c', ordem: 1 },
      { id: 'b', ordem: 2 },
    ])
  })

  it('troca com a vizinha de baixo', () => {
    const metas = [meta('a', 0, 'cat'), meta('b', 1, 'cat')]
    expect(moverNaCategoria(metas, 'a', 1)).toEqual([
      { id: 'b', ordem: 0 },
      { id: 'a', ordem: 1 },
    ])
  })

  it('não faz nada no topo nem no fim', () => {
    const metas = [meta('a', 0, 'cat'), meta('b', 1, 'cat')]
    expect(moverNaCategoria(metas, 'a', -1)).toEqual([])
    expect(moverNaCategoria(metas, 'b', 1)).toEqual([])
  })

  it('ignora metas de outra categoria ao calcular a vizinhança', () => {
    const metas = [
      meta('a', 0, 'cat'),
      meta('intrusa', 1, 'outra'),
      meta('b', 2, 'cat'),
    ]
    // 'b' é a segunda de 'cat', então subir a leva para a primeira posição.
    expect(moverNaCategoria(metas, 'b', -1)).toEqual([
      { id: 'b', ordem: 0 },
      { id: 'a', ordem: 1 },
    ])
  })

  it('normaliza o legado de ordem toda zerada', () => {
    const metas = [
      meta('a', 0, 'cat', '2026-08-01T00:00:00Z'),
      meta('b', 0, 'cat', '2026-08-02T00:00:00Z'),
      meta('c', 0, 'cat', '2026-08-03T00:00:00Z'),
    ]
    // Trocar dois zeros não moveria nada; renumerar resolve.
    expect(moverNaCategoria(metas, 'c', -1)).toEqual([
      { id: 'c', ordem: 1 },
      { id: 'b', ordem: 2 },
    ])
  })

  it('devolve vazio para meta inexistente', () => {
    expect(moverNaCategoria([], 'fantasma', 1)).toEqual([])
  })
})

describe('moverParaExtremo', () => {
  it('leva a meta do fim direto para o topo', () => {
    const metas = [
      meta('a', 0, 'cat'),
      meta('b', 1, 'cat'),
      meta('c', 2, 'cat'),
    ]
    expect(moverParaExtremo(metas, 'c', 'topo')).toEqual([
      { id: 'c', ordem: 0 },
      { id: 'a', ordem: 1 },
      { id: 'b', ordem: 2 },
    ])
  })

  it('leva a meta do topo direto para o fim', () => {
    const metas = [
      meta('a', 0, 'cat'),
      meta('b', 1, 'cat'),
      meta('c', 2, 'cat'),
    ]
    expect(moverParaExtremo(metas, 'a', 'fim')).toEqual([
      { id: 'b', ordem: 0 },
      { id: 'c', ordem: 1 },
      { id: 'a', ordem: 2 },
    ])
  })

  it('não faz nada quando a meta já está na ponta pedida', () => {
    const metas = [meta('a', 0, 'cat'), meta('b', 1, 'cat')]
    expect(moverParaExtremo(metas, 'a', 'topo')).toEqual([])
    expect(moverParaExtremo(metas, 'b', 'fim')).toEqual([])
  })

  it('ignora metas de outra categoria ao calcular a ponta', () => {
    const metas = [
      meta('a', 0, 'cat'),
      meta('intrusa', 1, 'outra'),
      meta('b', 5, 'cat'),
      meta('c', 6, 'cat'),
    ]
    expect(moverParaExtremo(metas, 'c', 'topo')).toEqual([
      { id: 'c', ordem: 0 },
      { id: 'a', ordem: 1 },
      { id: 'b', ordem: 2 },
    ])
  })

  it('devolve vazio para meta inexistente', () => {
    expect(moverParaExtremo([], 'fantasma', 'topo')).toEqual([])
  })
})

describe('moverParaCategoria', () => {
  it('põe a meta no fim da categoria de destino', () => {
    const metas = [
      meta('viajante', 0, 'origem'),
      meta('ja-estava', 0, 'destino'),
    ]
    expect(moverParaCategoria(metas, 'viajante', 'destino')).toEqual([
      { id: 'viajante', ordem: 1, categoria_meta_id: 'destino' },
    ])
  })

  it('fecha o buraco deixado na categoria de origem', () => {
    const metas = [
      meta('a', 0, 'origem'),
      meta('viajante', 1, 'origem'),
      meta('c', 2, 'origem'),
    ]
    expect(moverParaCategoria(metas, 'viajante', null)).toEqual([
      { id: 'c', ordem: 1 },
      { id: 'viajante', ordem: 0, categoria_meta_id: null },
    ])
  })

  it('move para categoria vazia', () => {
    const metas = [meta('viajante', 0, 'origem')]
    expect(moverParaCategoria(metas, 'viajante', 'vazia')).toEqual([
      { id: 'viajante', ordem: 0, categoria_meta_id: 'vazia' },
    ])
  })

  it('tira a meta de qualquer categoria com destino null', () => {
    const metas = [meta('viajante', 0, 'cat')]
    expect(moverParaCategoria(metas, 'viajante', null)).toEqual([
      { id: 'viajante', ordem: 0, categoria_meta_id: null },
    ])
  })

  it('não faz nada quando o destino é a categoria atual', () => {
    const metas = [meta('a', 0, 'cat')]
    expect(moverParaCategoria(metas, 'a', 'cat')).toEqual([])
    expect(moverParaCategoria([meta('solta', 0)], 'solta', null)).toEqual([])
  })

  it('devolve vazio para meta inexistente', () => {
    expect(moverParaCategoria([], 'fantasma', 'cat')).toEqual([])
  })
})
