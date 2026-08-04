/**
 * Utilitários compartilhados de gráfico (Bloco E do brief).
 *
 * Os gráficos vinham com tratamento padrão do Recharts: só cores trocadas, sem
 * área, sem ênfase e sem estado vazio. Isto padroniza o pouco que é comum entre
 * eles.
 */

interface PropsPonto {
  cx?: number
  cy?: number
  index?: number
}

/**
 * Desenha marcador apenas no último ponto da série.
 *
 * Marcar todos os pontos polui a linha; marcar só o final destaca o valor atual
 * — que é o único sobre o qual ainda se pode agir. Os intermediários seguem
 * acessíveis pelo `activeDot` no hover.
 */
export function pontoFinal(total: number, cor: string) {
  return function Ponto(props: PropsPonto) {
    const { cx, cy, index } = props
    if (cx === undefined || cy === undefined || index === undefined) return null
    // Recharts exige um nó por ponto; devolver null quebra a contagem de chaves
    if (index !== total - 1) return <g key={index} />

    return (
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r={4}
        fill={cor}
        stroke="var(--card)"
        strokeWidth={2}
      />
    )
  }
}

/** Estilo do tooltip, alinhado à paleta. Repetido em 5 gráficos até aqui. */
export const ESTILO_TOOLTIP = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  fontSize: 12,
  color: 'var(--popover-foreground)',
} as const

/** Eixos discretos: rótulo em cor secundária, linha na cor de borda. */
export const EIXO = {
  tick: { fontSize: 11, fill: 'var(--muted-foreground)' },
  stroke: 'var(--border)',
} as const
