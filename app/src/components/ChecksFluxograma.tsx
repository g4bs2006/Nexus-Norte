import { CheckDia } from '@/components/CheckDia'

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
    <ul className="space-y-0.5">
      {itens.map((item) => (
        <li key={item.fluxogramaId}>
          <CheckDia
            id={`check-${item.fluxogramaId}`}
            marcado={item.concluido}
            onAlternar={(marcado) => onAlternar(item.fluxogramaId, marcado)}
            detalhe={item.horario}
            {...(item.remarcada ? { aviso: 'remarcado' } : {})}
          >
            {item.rotulo}
          </CheckDia>
        </li>
      ))}
    </ul>
  )
}
