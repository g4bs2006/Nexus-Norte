import type { ComandoEscrita } from './comandos'
import type { ItemMenu } from './MenuSimbolos'

/** Item do `/` que executa um comando de escrita. */
export interface ItemEscrita extends ItemMenu {
  comando: ComandoEscrita
  /** Termos extras para a busca achar. */
  sinonimos?: string
}

/**
 * O que o `/` oferece de estrutura de texto.
 *
 * Mora no kernel porque é Markdown puro: título, lista e citação servem a
 * qualquer texto, não só a nota. A feature acrescenta os blocos dela por
 * injeção, e as duas listas aparecem juntas — como no Notion, onde `/` lista
 * "Heading 1" ao lado de "Code".
 *
 * A ordem é de frequência, não alfabética. Título e lista são o que se usa a
 * cada três parágrafos; tabela e divisor, uma vez por nota.
 */
export const CATALOGO_ESCRITA: readonly ItemEscrita[] = [
  {
    chave: 'titulo1',
    rotulo: 'Título 1',
    amostra: 'H1',
    sinonimos: 'titulo cabecalho secao heading h1',
    comando: { tipo: 'titulo', nivel: 1 },
  },
  {
    chave: 'titulo2',
    rotulo: 'Título 2',
    amostra: 'H2',
    sinonimos: 'titulo subtitulo heading h2',
    comando: { tipo: 'titulo', nivel: 2 },
  },
  {
    chave: 'titulo3',
    rotulo: 'Título 3',
    amostra: 'H3',
    sinonimos: 'titulo heading h3',
    comando: { tipo: 'titulo', nivel: 3 },
  },
  {
    chave: 'lista',
    rotulo: 'Lista',
    amostra: '•',
    sinonimos: 'lista marcadores bullet topicos itens',
    comando: { tipo: 'lista' },
  },
  {
    chave: 'numerada',
    rotulo: 'Lista numerada',
    amostra: '1.',
    sinonimos: 'lista numerada ordenada passos',
    comando: { tipo: 'listaNumerada' },
  },
  {
    chave: 'citacao',
    rotulo: 'Citação',
    amostra: '❝',
    sinonimos: 'citacao quote destaque enunciado',
    comando: { tipo: 'citacao' },
  },
  {
    chave: 'texto',
    rotulo: 'Texto simples',
    amostra: '¶',
    sinonimos: 'texto paragrafo limpar normal',
    comando: { tipo: 'texto' },
  },
  {
    chave: 'divisor',
    rotulo: 'Divisor',
    amostra: '—',
    sinonimos: 'divisor linha separador regua hr',
    comando: { tipo: 'divisor' },
  },
  {
    chave: 'tabela',
    rotulo: 'Tabela',
    amostra: '▦',
    sinonimos: 'tabela grade linhas colunas',
    comando: { tipo: 'tabela' },
  },
  {
    chave: 'codigo',
    rotulo: 'Código',
    amostra: '⌗',
    sinonimos: 'codigo bloco programa',
    comando: { tipo: 'cerca', linguagem: '' },
  },
]

/**
 * Filtra por prefixo da chave primeiro, depois por rótulo e sinônimo.
 *
 * O prefixo antes do resto é o que faz `/tit` mostrar "Título 1" no topo em vez
 * de enterrá-lo entre tudo que menciona título.
 */
export function filtrarEscrita(termo: string): ItemEscrita[] {
  const busca = termo.trim().toLowerCase()
  if (busca === '') return [...CATALOGO_ESCRITA]

  const porPrefixo: ItemEscrita[] = []
  const porTexto: ItemEscrita[] = []

  for (const item of CATALOGO_ESCRITA) {
    if (item.chave.startsWith(busca)) {
      porPrefixo.push(item)
      continue
    }
    const texto = `${item.rotulo} ${item.sinonimos ?? ''}`.toLowerCase()
    if (texto.includes(busca)) porTexto.push(item)
  }

  return [...porPrefixo, ...porTexto]
}
