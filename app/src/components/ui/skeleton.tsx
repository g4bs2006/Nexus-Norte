import { cn } from '@/lib/utils'

/**
 * Pulso próprio no lugar do `animate-pulse` do Tailwind — ver
 * `pulsar-esqueleto` em `index.css` para o porquê da amplitude menor.
 *
 * `prefers-reduced-motion` continua neutralizando pela regra global, que zera
 * duração e conta de iteração de qualquer animação.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('pulso-esqueleto rounded-md bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }
