import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MiniCardProps {
  titulo: string
  icone: LucideIcon
  /** Classe de cor do pilar (ex: `text-financeiro`). */
  classeCor: string
  rota: string
  children: ReactNode
}

/**
 * Cartão compacto da Home.
 *
 * A Home não duplica dado nem recalcula agregação — apenas apresenta o que os
 * pilares já resolveram (plano 7.1 / 7.2).
 */
export function MiniCard({
  titulo,
  icone: Icone,
  classeCor,
  rota,
  children,
}: MiniCardProps) {
  return (
    <Card className="hover:border-foreground/20 transition-colors">
      <CardContent className="space-y-3">
        <Link
          to={rota}
          className="group flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Icone className={cn('size-4', classeCor)} />
            {titulo}
          </span>
          <ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-colors" />
        </Link>
        {children}
      </CardContent>
    </Card>
  )
}
