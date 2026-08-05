/**
 * Leitura de número decimal digitado por gente, não por máquina.
 *
 * **Por que existe.** Os campos decimais eram `<input type="number">` lidos com
 * `Number(...)` ou `valueAsNumber`. O teclado brasileiro oferece **vírgula** como
 * separador decimal, e para um `type="number"` a vírgula é inválida: o navegador
 * descarta a entrada, `.value` volta `''` e `valueAsNumber` volta `NaN`. No mobile,
 * onde o separador do teclado numérico é a vírgula, isso significava digitar 87,5
 * e o formulário receber nada — reprovando na validação com o número na tela.
 *
 * O comportamento é dependente de navegador (Chrome localiza a entrada, Safari
 * não), o que é justamente o pior caso: funciona na máquina de quem programou e
 * falha no aparelho de quem usa. Daí a regra virar código nosso, com teste.
 *
 * Os campos que usam isto são `type="text"` com `inputMode="decimal"`, não
 * `type="number"` — é a única forma de a vírgula chegar até aqui.
 */

/** Só agrupamento de milhar: `1.500`, `12.345.678`. Sem vírgula e sem decimais. */
const SO_MILHAR = /^-?\d{1,3}(\.\d{3})+$/

/**
 * Converte texto em número aceitando vírgula ou ponto como separador decimal.
 *
 * Devolve `NaN` para qualquer coisa que não seja um número — inclusive texto
 * vazio, que `Number('')` traduziria para `0`. Zero é um valor legítimo em
 * vários campos, então confundir "não informado" com "zero" esconderia dado.
 *
 * Regras de separador, na ordem:
 *
 * 1. **Tem vírgula** → a vírgula é o separador decimal e os pontos são
 *    agrupamento de milhar: `1.234,56` → `1234.56`.
 * 2. **Só pontos, em grupos de três** → é agrupamento, não decimal: `1.500` →
 *    `1500`. Sem esta regra, quem digitasse mil e quinhentos do jeito brasileiro
 *    lançaria **R$ 1,50** — um erro de mil vezes, em silêncio, num app de
 *    finanças.
 * 3. **Qualquer outro ponto** → separador decimal: `87.5` → `87.5`.
 */
export function parseDecimal(bruto: string): number {
  const limpo = bruto.trim()
  if (limpo === '') return Number.NaN

  let normalizado: string
  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (SO_MILHAR.test(limpo)) {
    normalizado = limpo.replace(/\./g, '')
  } else {
    normalizado = limpo
  }

  // `Number` aceita coisas que um campo numérico não deveria: '0x1f', '1e5',
  // Infinity, espaço em branco. A varredura explícita rejeita tudo que não seja
  // dígitos com um separador e um sinal opcional.
  if (!/^-?\d*\.?\d+$/.test(normalizado)) return Number.NaN

  return Number(normalizado)
}

/**
 * Texto inicial de um campo decimal a partir do valor guardado.
 *
 * `null` e `NaN` viram `''` — campo vazio, que é como "não informado" se
 * apresenta. O número sai com **vírgula**, porque é assim que ele foi digitado e
 * é assim que ele é lido em português; `parseDecimal` aceita a vírgula de volta.
 */
export function formatarDecimal(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return ''
  return String(valor).replace('.', ',')
}
