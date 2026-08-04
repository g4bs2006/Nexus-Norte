import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/datas'
import { cn } from '@/lib/utils'
import type { TotaisMes } from '../calculos'

interface CardReceitaDespesaProps {
  totais: TotaisMes
  /** Projeção de saldo mantido o ritmo atual de gasto (plano 2.2). */
  saldoProjetado: number
}

/** Card do topo da page: entrada x saída do mês e saldo líquido (plano 2.3). */
export function CardReceitaDespesa({
  totais,
  saldoProjetado,
}: CardReceitaDespesaProps) {
  const saldoPositivo = totais.saldo >= 0

  return (
    <Card>
      <CardContent className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ArrowUpRight className="text-financeiro size-3.5" />
            Receita do mês
          </div>
          <p className="text-financeiro text-xl">
            {formatarMoeda(totais.receita)}
          </p>
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ArrowDownRight className="text-status-risco size-3.5" />
            Despesa do mês
          </div>
          <p className="text-xl">{formatarMoeda(totais.despesa)}</p>
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <TrendingUp className="size-3.5" />
            Saldo líquido
          </div>
          <p
            className={cn(
              'text-xl',
              saldoPositivo ? 'text-status-ok' : 'text-status-risco',
            )}
          >
            {formatarMoeda(totais.saldo)}
          </p>
          <p className="text-muted-foreground text-xs">
            Projeção no fim do mês: {formatarMoeda(saldoProjetado)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
