import { useValorAnimado } from '@/hooks/useValorAnimado'
import { cn } from '@/lib/utils'

interface BarraProgressoProps {
  /** Percentual 0–100. Valores acima de 100 preenchem por completo. */
  valor: number
  /**
   * Classe de cor de fundo do preenchimento (ex: `bg-financeiro`).
   * Sem valor, usa a cor de texto padrão.
   */
  classeCor?: string
  /**
   * Cor CSS explícita do preenchimento. Tem precedência sobre `classeCor` e
   * existe para campos de cor livres no banco (ex: `categorias.cor`), que não
   * podem virar classe Tailwind estática — mesmo motivo de `AnelProgresso`.
   */
  cor?: string | undefined
  className?: string
  /** Rótulo acessível — a barra é informativa, não decorativa. */
  rotulo?: string
}

/**
 * Barra de progresso que anima a partir de 0 na montagem.
 *
 * Substitui o `Progress` do shadcn nos usos do produto: o componente vendored
 * monta já no valor final, então a transição declarada nele nunca dispara, e
 * ele não expõe a cor do preenchimento — necessária para as cores por pilar.
 */
export function BarraProgresso({
  valor,
  classeCor,
  cor,
  className,
  rotulo,
}: BarraProgressoProps) {
  const animado = useValorAnimado(valor) ?? 0
  const preenchido = Math.min(Math.max(animado, 0), 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(Math.min(Math.max(valor, 0), 100))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotulo}
      className={cn(
        'bg-muted relative h-1 w-full overflow-hidden rounded-full',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          !cor && (classeCor ?? 'bg-foreground/70'),
        )}
        style={{ width: `${preenchido}%`, backgroundColor: cor }}
      />
    </div>
  )
}
