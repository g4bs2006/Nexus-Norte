import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EstadoVazioProps {
  icone: LucideIcon
  /** Classe de cor do pilar — tinge o chip do ícone. */
  classeCor?: string
  classeFundo?: string
  titulo: string
  descricao: string
  /** Ação primária. Uma tela vazia é um convite para agir, não um aviso. */
  acao?: ReactNode
}

/**
 * Estado vazio com convite à ação (Bloco E do brief).
 *
 * Antes eram cards tracejados só com texto: a cópia estava correta, mas nada
 * puxava a primeira ação. O ícone tingido dá âncora visual e a ação primária
 * fica no próprio bloco, em vez de escondida no cabeçalho da página.
 */
export function EstadoVazio({
  icone: Icone,
  classeCor,
  classeFundo,
  titulo,
  descricao,
  acao,
}: EstadoVazioProps) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span
          aria-hidden
          className={cn(
            'grid size-11 place-items-center rounded-xl',
            classeFundo ?? 'bg-muted',
          )}
        >
          <Icone className={cn('size-5', classeCor ?? 'text-muted-foreground')} />
        </span>

        <div className="max-w-sm space-y-1">
          <p className="text-sm font-medium">{titulo}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {descricao}
          </p>
        </div>

        {acao && <div className="pt-1">{acao}</div>}
      </CardContent>
    </Card>
  )
}
