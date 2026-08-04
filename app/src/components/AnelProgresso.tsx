import type { ReactNode } from 'react'
import { useValorAnimado } from '@/hooks/useValorAnimado'
import { cn } from '@/lib/utils'

interface AnelProgressoProps {
  /** Percentual consumido. Valores acima de 100 preenchem o anel por completo. */
  percentual: number | null
  tamanho?: number
  espessura?: number
  /** Classe de cor aplicada ao arco (usa `currentColor`). */
  className?: string
  /**
   * Cor CSS explícita do arco. Tem precedência sobre `className` e existe para
   * campos de cor livres no banco (ex: `categorias.cor`), que não podem virar
   * classe Tailwind estática.
   */
  cor?: string | undefined
  children?: ReactNode
}

/**
 * Anel de progresso circular. Componente compartilhado — usado pelos cards de
 * categoria (Financeiro) e reaproveitado pelos demais pilares (plano 9).
 */
export function AnelProgresso({
  percentual,
  tamanho = 56,
  espessura = 5,
  className,
  cor,
  children,
}: AnelProgressoProps) {
  const raio = (tamanho - espessura) / 2
  const circunferencia = 2 * Math.PI * raio

  // Parte de 0 na montagem para que a transição abaixo tenha de onde sair.
  const animado = useValorAnimado(percentual)
  const preenchido = Math.min(Math.max(animado ?? 0, 0), 100)
  const recuo = circunferencia * (1 - preenchido / 100)

  return (
    <div
      className="relative shrink-0"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg
        width={tamanho}
        height={tamanho}
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        className={cn('-rotate-90', className)}
        style={cor ? { color: cor } : undefined}
        role="presentation"
      >
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          strokeWidth={espessura}
          className="stroke-muted"
        />
        {percentual !== null && (
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            fill="none"
            strokeWidth={espessura}
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={circunferencia}
            strokeDashoffset={recuo}
            className="transition-[stroke-dashoffset] duration-500"
          />
        )}
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
