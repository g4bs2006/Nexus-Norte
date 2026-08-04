import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Status } from '@/features/financeiro/types'

/** Listra de severidade — encoda estado em forma, não só em cor. */
const LISTRA: Record<Status, string> = {
  ok: 'bg-transparent',
  atencao: 'bg-status-atencao',
  risco: 'bg-status-risco',
}

interface MiniCardProps {
  titulo: string
  icone: LucideIcon
  /** Classe de cor do pilar (ex: `text-financeiro`). */
  classeCor: string
  rota: string
  /** Valor principal — já formatado. */
  valor: ReactNode
  /** Uma linha de contexto abaixo do valor. */
  detalhe: ReactNode
  /**
   * Severidade. Só `atencao` e `risco` desenham a listra: se tudo ganhasse
   * marca, a marca deixaria de chamar atenção.
   */
  status?: Status
}

/**
 * Tile compacto de pilar na Home.
 *
 * Reescrito no Bloco D: eram quatro cards grandes de peso visual idêntico, o
 * que achatava a hierarquia da página (item 4 do diagnóstico). Agora são tiles
 * densos numa linha, com listra de severidade à esquerda — o que precisa de
 * atenção lê antes do detalhe.
 */
export function MiniCard({
  titulo,
  icone: Icone,
  classeCor,
  rota,
  valor,
  detalhe,
  status = 'ok',
}: MiniCardProps) {
  return (
    <Link
      to={rota}
      className={cn(
        'group border-border bg-card relative flex flex-col gap-1.5 overflow-hidden rounded-lg border p-3 transition-colors',
        'hover:border-foreground/20',
      )}
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-[3px]', LISTRA[status])}
      />

      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icone className={cn('size-3.5', classeCor)} />
        {titulo}
      </span>

      <span className="metric-md truncate">{valor}</span>

      <span className="text-muted-foreground truncate text-xs">{detalhe}</span>
    </Link>
  )
}
