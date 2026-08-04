import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface ItemCheckFluxograma {
  /** Id do registro em `fluxograma_semanal`. */
  fluxogramaId: string
  rotulo: string
  horario: string
  concluido: boolean
  remarcada: boolean
}

interface ChecksFluxogramaProps {
  itens: readonly ItemCheckFluxograma[]
  /** Texto exibido quando o dia não tem nada previsto. */
  vazio: string
  onAlternar: (fluxogramaId: string, concluido: boolean) => void
}

/**
 * Checks do dia derivados do fluxograma (plano 3.4 e 4.4).
 *
 * Quais itens aparecem é derivado na leitura (resolução 10.5); o estado de
 * concluído vem de `conclusoes_fluxograma` (resolução 10.15).
 */
export function ChecksFluxograma({
  itens,
  vazio,
  onAlternar,
}: ChecksFluxogramaProps) {
  if (itens.length === 0) {
    return <p className="text-muted-foreground text-sm">{vazio}</p>
  }

  return (
    <ul className="space-y-2.5">
      {itens.map((item) => (
        <li key={item.fluxogramaId} className="flex items-center gap-2.5">
          <Checkbox
            id={`check-${item.fluxogramaId}`}
            checked={item.concluido}
            onCheckedChange={(marcado) =>
              onAlternar(item.fluxogramaId, marcado === true)
            }
          />
          <Label
            htmlFor={`check-${item.fluxogramaId}`}
            className={cn(
              'flex-1 text-sm font-normal',
              item.concluido && 'text-muted-foreground line-through',
            )}
          >
            {item.rotulo}
            <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">
              {item.horario}
            </span>
            {item.remarcada && (
              <span className="text-status-atencao ml-1.5 text-xs">
                remarcado
              </span>
            )}
          </Label>
        </li>
      ))}
    </ul>
  )
}
