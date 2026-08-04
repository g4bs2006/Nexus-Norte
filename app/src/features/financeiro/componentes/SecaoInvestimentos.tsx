import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatarMoeda } from '@/lib/datas'
import { cn } from '@/lib/utils'
import type { Investimento } from '../types'

interface SecaoInvestimentosProps {
  investimentos: readonly Investimento[]
  acao?: ReactNode
}

/** Aporte total e rendimento do mês (plano 2.3 + resolução 10.4). */
export function SecaoInvestimentos({
  investimentos,
  acao,
}: SecaoInvestimentosProps) {
  // Resolução 10.4: uma linha por evento, separadas por `tipo`.
  let aportes = 0
  let rendimentos = 0
  for (const item of investimentos) {
    if (item.tipo === 'aporte') aportes += item.valor
    else rendimentos += item.valor
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Investimentos</CardTitle>
          <CardDescription>Movimentações do mês.</CardDescription>
        </div>
        {acao}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Aportado no mês</p>
          <p className="text-lg tabular-nums">{formatarMoeda(aportes)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Rendimento no mês</p>
          <p
            className={cn(
              'text-lg tabular-nums',
              rendimentos > 0 && 'text-status-ok',
              rendimentos < 0 && 'text-status-risco',
            )}
          >
            {formatarMoeda(rendimentos)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
