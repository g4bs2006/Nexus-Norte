/**
 * Formas de pagamento — conjunto fechado (resolução 10.23).
 *
 * Era texto livre digitado a cada lançamento, o que produz o mesmo problema que a
 * biblioteca de exercícios resolveu: "Débito", "debito" e "Débito " viram três
 * formas distintas e nenhum filtro agrupa direito.
 *
 * Constante em vez de tabela de referência porque são quatro valores que não
 * mudam, sem atributo nenhum além do nome — o CHECK no banco é a garantia, e uma
 * tabela aqui seria cerimônia sem ganho. Os valores gravados são os slugs; o
 * rótulo existe só para a tela.
 */

export const FORMAS_PAGAMENTO = [
  { valor: 'debito', rotulo: 'Débito' },
  { valor: 'credito', rotulo: 'Crédito' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'Pix' },
] as const

export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]['valor']

const ROTULOS = new Map<string, string>(
  FORMAS_PAGAMENTO.map(({ valor, rotulo }) => [valor, rotulo]),
)

/**
 * Rótulo de exibição do slug.
 *
 * Devolve o próprio valor quando não reconhece: o CHECK do banco impede valor
 * fora do conjunto, mas esconder um dado inesperado é pior que mostrá-lo cru.
 */
export function rotuloFormaPagamento(valor: string): string {
  return ROTULOS.get(valor) ?? valor
}
