import { Moon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { formatarHoras } from '@/features/sono/calculos'

interface IndicadorSonoProps {
  horasDormidas: number | null
  horasMeta: number | null
}

/** Horas dormidas ontem versus a meta do dia (plano 7.1). */
export function IndicadorSono({
  horasDormidas,
  horasMeta,
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
          <span
            className={cn(
              'text-lg tabular-nums',
              abaixo && 'text-status-atencao',
            )}
          >
            {horasDormidas === null ? '—' : formatarHoras(horasDormidas)}
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
            <Progress value={Math.min(percentual, 100)} />
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
