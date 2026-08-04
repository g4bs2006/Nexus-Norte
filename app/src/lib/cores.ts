/**
 * Paleta de cores selecionáveis para categorias, projetos e afins.
 *
 * Tons pastel dessaturados, coerentes com a paleta do design system (plano
 * 1.2) e legíveis nos dois temas — por isso são hex fixos e não variáveis CSS:
 * ficam gravados no banco (`categorias.cor`) e precisam de significado estável.
 */

export interface OpcaoCor {
  readonly valor: string
  readonly nome: string
}

export const CORES_DISPONIVEIS: readonly OpcaoCor[] = [
  { valor: '#4f9d69', nome: 'Verde' },
  { valor: '#4a9c9c', nome: 'Ciano' },
  { valor: '#4a87c4', nome: 'Azul' },
  { valor: '#8b6bb5', nome: 'Roxo' },
  { valor: '#c4708f', nome: 'Rosa' },
  { valor: '#c4554d', nome: 'Vermelho' },
  { valor: '#d0764b', nome: 'Laranja' },
  { valor: '#b8941f', nome: 'Amarelo' },
  { valor: '#8f6b4f', nome: 'Marrom' },
  { valor: '#787774', nome: 'Cinza' },
] as const

export function nomeDaCor(valor: string | null): string | null {
  if (!valor) return null
  return CORES_DISPONIVEIS.find((cor) => cor.valor === valor)?.nome ?? null
}
