import { useMemo, type ReactNode } from 'react'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { deISO, formatarMoeda } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { useExcluirInvestimento } from '../hooks'
import type { Investimento } from '../types'
import { DialogInvestimento } from './DialogInvestimento'

interface SecaoInvestimentosProps {
  investimentos: readonly Investimento[]
  acao?: ReactNode
  hoje?: Date
}

/** Aporte total e rendimento do mês (plano 2.3 + resolução 10.4). */
export function SecaoInvestimentos({
  investimentos,
  acao,
  hoje,
}: SecaoInvestimentosProps) {
  const hojeDate = useMemo(() => hoje ?? new Date(), [hoje])

  // Resolução 10.4: uma linha por evento, separadas por `tipo`.
  let aportes = 0
  let rendimentos = 0
  for (const item of investimentos) {
    if (item.tipo === 'aporte') aportes += item.valor
    else rendimentos += item.valor
  }

  const excluir = useExcluirInvestimento()

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Investimentos</CardTitle>
          <CardDescription>Movimentações do mês.</CardDescription>
        </div>
        {acao}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Aportado no mês</p>
            <p className="metric-md">{formatarMoeda(aportes)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Rendimento no mês</p>
            {/* Só prejuízo ganha cor — rendimento positivo é o esperado */}
            <p
              className={cn(
                'metric-md',
                rendimentos < 0 && 'text-status-risco',
              )}
            >
              {formatarMoeda(rendimentos)}
            </p>
          </div>
        </div>

        {investimentos.length > 0 && (
          <ul className="divide-border divide-y">
            {investimentos.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="capitalize">{item.tipo}</span>
                    {item.descricao && (
                      <span className="text-muted-foreground ml-1.5">
                        — {item.descricao}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {format(deISO(item.data), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={cn(
                      'text-sm tabular-nums',
                      item.tipo === 'rendimento' &&
                        item.valor < 0 &&
                        'text-status-risco',
                    )}
                  >
                    {formatarMoeda(item.valor)}
                  </span>
                  <DialogInvestimento hoje={hojeDate} investimento={item} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-status-risco size-7"
                    aria-label="Excluir investimento"
                    onClick={() => excluir.mutate(item.id)}
                    disabled={excluir.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
