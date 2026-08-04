import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DIAS_SEMANA } from '@/lib/constants'
import { cn } from '@/lib/utils'

/**
 * Item do fluxograma, agnóstico de pilar — Estudos passa matérias, Treino passa
 * treinos (plano 3.3: "componente compartilhado com Treino").
 */
export interface ItemFluxograma {
  id: string
  dia_semana: number
  horario_inicio: string
  horario_fim: string
  rotulo: string
  cor?: string | undefined
}

/** Ordem de exibição: segunda a domingo, apesar de `dia_semana` usar 0 = domingo. */
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0] as const

/** `08:00:00` → `08:00` */
function hora(valor: string): string {
  return valor.slice(0, 5)
}

interface GradeFluxogramaProps {
  itens: readonly ItemFluxograma[]
  /** Classe de cor padrão quando o item não define uma (cor do pilar). */
  classeCorPadrao?: string
  onExcluir?: (id: string) => void
}

export function GradeFluxograma({
  itens,
  classeCorPadrao,
  onExcluir,
}: GradeFluxogramaProps) {
  const porDia = new Map<number, ItemFluxograma[]>()
  for (const item of itens) {
    const lista = porDia.get(item.dia_semana)
    if (lista) lista.push(item)
    else porDia.set(item.dia_semana, [item])
  }
  for (const lista of porDia.values()) {
    lista.sort((a, b) => a.horario_inicio.localeCompare(b.horario_inicio))
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {ORDEM_DIAS.map((dia) => {
        const doDia = porDia.get(dia) ?? []
        return (
          <div key={dia} className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {DIAS_SEMANA[dia]}
            </p>
            {doDia.length === 0 ? (
              <p className="text-muted-foreground/60 text-xs">—</p>
            ) : (
              <ul className="space-y-1">
                {doDia.map((item) => (
                  <li
                    key={item.id}
                    className="border-border bg-card group flex items-start gap-1.5 rounded-md border px-2 py-1.5"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1 size-1.5 shrink-0 rounded-full',
                        !item.cor && (classeCorPadrao ?? 'bg-foreground/40'),
                      )}
                      style={item.cor ? { backgroundColor: item.cor } : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{item.rotulo}</p>
                      <p className="text-muted-foreground text-[11px] tabular-nums">
                        {hora(item.horario_inicio)}–{hora(item.horario_fim)}
                      </p>
                    </div>
                    {onExcluir && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-status-risco size-5 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label={`Remover ${item.rotulo}`}
                        onClick={() => onExcluir(item.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
