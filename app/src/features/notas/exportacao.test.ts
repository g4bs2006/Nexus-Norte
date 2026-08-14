import { describe, expect, it } from 'vitest'
import {
  montarArquivos,
  trocarReferencias,
  type NotaExportavel,
} from './exportacao'

const ID = '3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607'

function nota(parcial: Partial<NotaExportavel> = {}): NotaExportavel {
  return {
    slug: 'limites',
    titulo: 'Limites',
    conteudo: 'o que revisar',
    materia_nome: 'Cálculo 1',
    atualizada_em: '2026-08-14T10:00:00Z',
    ...parcial,
  }
}

describe('trocarReferencias', () => {
  it('troca a referência pelo caminho do arquivo', () => {
    const svgs = new Map([[ID, '<svg/>']])
    expect(trocarReferencias(`antes ![[desenho:${ID}]] depois`, svgs)).toBe(
      `antes ![desenho](../desenhos/${ID}.svg) depois`,
    )
  })

  it('troca todas as ocorrências do mesmo desenho', () => {
    const svgs = new Map([[ID, '<svg/>']])
    const saida = trocarReferencias(`![[desenho:${ID}]] e ![[desenho:${ID}]]`, svgs)
    expect(saida).not.toContain('![[desenho:')
    expect(saida.match(/\.\.\/desenhos\//g)).toHaveLength(2)
  })

  it('vira comentário quando o desenho não tem render, sem sumir', () => {
    expect(trocarReferencias(`![[desenho:${ID}]]`, new Map())).toBe(
      `<!-- desenho ${ID} sem render exportado -->`,
    )
  })

  it('não altera conteúdo sem referência nenhuma', () => {
    const conteudo = 'texto com [[link]] e $x^2$'
    expect(trocarReferencias(conteudo, new Map())).toBe(conteudo)
  })
})

describe('montarArquivos', () => {
  it('gera um .md por nota, na pasta da matéria', () => {
    const arquivos = montarArquivos([nota()], [])
    expect(arquivos.map((a) => a.caminho)).toEqual(['calculo-1/limites.md'])
  })

  it('põe o cabeçalho YAML antes do conteúdo', () => {
    const texto = montarArquivos([nota()], [])[0]?.texto ?? ''
    expect(texto).toContain('titulo: Limites')
    expect(texto).toContain('materia: Cálculo 1')
    expect(texto).toContain('slug: limites')
    expect(texto.endsWith('o que revisar')).toBe(true)
  })

  it('põe entre aspas o título que quebraria o YAML', () => {
    const texto =
      montarArquivos([nota({ titulo: 'Cálculo 2: séries' })], [])[0]?.texto ?? ''
    expect(texto).toContain('titulo: "Cálculo 2: séries"')
  })

  it('gera um .svg por desenho com render', () => {
    const arquivos = montarArquivos([], [{ id: ID, svg: '<svg/>' }])
    expect(arquivos).toEqual([
      { caminho: `desenhos/${ID}.svg`, texto: '<svg/>' },
    ])
  })

  it('deixa de fora o desenho sem render', () => {
    expect(montarArquivos([], [{ id: ID, svg: null }])).toEqual([])
  })

  it('separa notas de matérias diferentes em pastas diferentes', () => {
    const arquivos = montarArquivos(
      [
        nota({ slug: 'taylor', materia_nome: 'Cálculo 2' }),
        nota({ slug: 'sinais', materia_nome: 'Sinais e Sistemas' }),
      ],
      [],
    )
    expect(arquivos.map((a) => a.caminho)).toEqual([
      'calculo-2/taylor.md',
      'sinais-e-sistemas/sinais.md',
    ])
  })

  it('devolve vazio quando não há nada a exportar', () => {
    expect(montarArquivos([], [])).toEqual([])
  })
})
