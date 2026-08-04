import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { CheckDiario } from '../api'

interface ChecksDiariosProps {
  check: CheckDiario | null
  /** 0 = domingo. O check semanal só aparece no domingo (plano 2.4). */
  diaSemana: number
  onAlterar: (campos: Partial<Omit<CheckDiario, 'data'>>) => void
}

/** Checks de ação do Financeiro: diário e semanal (plano 2.4). */
export function ChecksDiarios({
  check,
  diaSemana,
  onAlterar,
}: ChecksDiariosProps) {
  const ehDomingo = diaSemana === 0

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="check-financeiro"
            checked={check?.financeiro_registrado ?? false}
            onCheckedChange={(marcado) =>
              onAlterar({ financeiro_registrado: marcado === true })
            }
          />
          <Label htmlFor="check-financeiro" className="text-sm font-normal">
            Lancei os gastos de hoje?
          </Label>
        </div>

        {ehDomingo && (
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="check-planejamento"
              checked={check?.planejamento_semana_feito ?? false}
              onCheckedChange={(marcado) =>
                onAlterar({ planejamento_semana_feito: marcado === true })
              }
            />
            <Label htmlFor="check-planejamento" className="text-sm font-normal">
              Planejei a semana?
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
