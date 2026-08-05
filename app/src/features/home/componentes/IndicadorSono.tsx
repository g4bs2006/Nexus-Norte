import type { ReactNode } from 'react'
import { Moon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { BarraProgresso } from '@/components/BarraProgresso'
import { cn } from '@/lib/utils'
import { formatarHoras } from '@/features/sono/calculos'

interface IndicadorSonoProps {
  horasDormidas: number | null
  horasMeta: number | null
  /** Ação de registro — o schema de sono não tinha entrada de dados no plano. */
  acao?: ReactNode
}

/** Horas dormidas ontem versus a meta do dia (plano 7.1). */
export function IndicadorSono({
  horasDormidas,
  horasMeta,
  acao,
}: IndicadorSonoProps) {
  const percentual =
    horasDormidas !== null && horasMeta !== null && horasMeta > 0
      ? (horasDormidas / horasMeta) * 100
      : null

  // Dormir bem menos que a meta é o sinal que importa; dormir mais não é alerta.
  const abaixo = percentual !== null && percentual < 85

  return (
    <Card>
      <CardContent className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Moon className="text-sono size-4" />
            Sono de ontem
          </span>
          <span className="flex items-center gap-2">
            <span className={cn('metric-md', abaixo && 'text-status-atencao')}>
              {horasDormidas === null ? '—' : formatarHoras(horasDormidas)}
            </span>
            {acao}
          </span>
        </div>

        {percentual === null ? (
          <p className="text-muted-foreground text-xs">
            {horasDormidas === null
              ? 'Nenhum registro para ontem.'
              : 'Sem meta definida para o dia.'}
          </p>
        ) : (
          <>
            <BarraProgresso
              valor={percentual}
              classeCor="bg-sono"
              rotulo="Sono em relação à meta"
            />
            <p className="text-muted-foreground text-xs">
              meta {formatarHoras(horasMeta as number)} ·{' '}
              {Math.round(percentual)}%
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
