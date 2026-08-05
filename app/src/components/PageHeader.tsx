import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PilarId } from '@/lib/pilares'

/**
 * Classes literais por pilar — o Tailwind precisa das strings estáticas na
 * varredura do código, então não dá para montar `bg-${pilar}` em runtime.
 */
const ACENTO: Record<
  PilarId | 'sono',
  { regua: string; chip: string; icone: string }
> = {
  financeiro: {
    regua: 'bg-financeiro',
    chip: 'bg-financeiro-soft',
    icone: 'text-financeiro',
  },
  estudos: {
    regua: 'bg-estudos',
    chip: 'bg-estudos-soft',
    icone: 'text-estudos',
  },
  treino: {
    regua: 'bg-treino',
    chip: 'bg-treino-soft',
    icone: 'text-treino',
  },
  projetos: {
    regua: 'bg-projetos',
    chip: 'bg-projetos-soft',
    icone: 'text-projetos',
  },
  sono: {
    regua: 'bg-sono',
    chip: 'bg-sono-soft',
    icone: 'text-sono',
  },
}

interface PageHeaderProps {
  titulo: string
  descricao?: string
  acoes?: ReactNode
  /**
   * Pilar da página. Adiciona a régua de acento e o chip do ícone — é o que
   * torna as pages distinguíveis pela periferia da visão, sem ler o título.
   */
  pilar?: PilarId | 'sono'
  icone?: LucideIcon
}

export function PageHeader({
  titulo,
  descricao,
  acoes,
  pilar,
  icone: Icone,
}: PageHeaderProps) {
  const acento = pilar ? ACENTO[pilar] : null

  return (
    <header className="mb-8 space-y-4">
      {acento && (
        <div
          aria-hidden
          className={cn('h-[3px] w-12 rounded-full', acento.regua)}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icone && acento && (
            <span
              aria-hidden
              className={cn(
                'mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg',
                acento.chip,
              )}
            >
              <Icone className={cn('size-4.5', acento.icone)} />
            </span>
          )}
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl">{titulo}</h1>
            {descricao && (
              <p className="text-muted-foreground text-sm">{descricao}</p>
            )}
          </div>
        </div>
        {acoes && (
          <div className="flex shrink-0 items-center gap-2">{acoes}</div>
        )}
      </div>
    </header>
  )
}
