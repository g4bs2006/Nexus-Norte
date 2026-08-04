import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatarMoeda } from '@/lib/datas'
import { cn } from '@/lib/utils'

interface CardDisponivelHojeProps {
  /** Meta restante dividida pelos dias que sobram no mês. */
  disponivelGeral: number
  /** Soma do que o ritual de domingo planejou para hoje. */
  disponivelPlanejado: number
  gastoDeHoje: number
  status: 'ok' | 'risco'
  progressoMes: number
  metaTotal: number
  despesaTotal: number
}

/**
 * "Disponível hoje" com os dois números lado a lado — geral e planejado
 * (plano 2.3) — mais a barra de progresso geral do mês.
 */
export function CardDisponivelHoje({
  disponivelGeral,
  disponivelPlanejado,
  gastoDeHoje,
  status,
  progressoMes,
  metaTotal,
  despesaTotal,
}: CardDisponivelHojeProps) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Disponível hoje</p>
            <p className="text-xl">{formatarMoeda(disponivelGeral)}</p>
            <p className="text-muted-foreground text-[11px]">
              meta restante ÷ dias do mês
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Planejado para hoje</p>
            <p className="text-xl">{formatarMoeda(disponivelPlanejado)}</p>
            <p className="text-muted-foreground text-[11px]">
              do planejamento da semana
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Gasto de hoje</p>
            <p
              className={cn(
                'flex items-center gap-2 text-xl',
                status === 'ok' ? 'text-status-ok' : 'text-status-risco',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'size-2 rounded-full',
                  status === 'ok' ? 'bg-status-ok' : 'bg-status-risco',
                )}
              />
              {formatarMoeda(gastoDeHoje)}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {status === 'ok' ? 'dentro do planejado' : 'acima do planejado'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>Progresso do mês</span>
            <span className="tabular-nums">
              {formatarMoeda(despesaTotal)}
              {metaTotal > 0 && ` de ${formatarMoeda(metaTotal)}`}
            </span>
          </div>
          <Progress value={Math.min(progressoMes, 100)} />
        </div>
      </CardContent>
    </Card>
  )
}
