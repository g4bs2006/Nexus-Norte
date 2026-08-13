import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { DIAS_SEMANA } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { ORDEM_DIAS_SEMANA, agruparPorDiaSemana, horaCurta } from '@/lib/fluxograma'

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
  const porDia = agruparPorDiaSemana(itens)

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {ORDEM_DIAS_SEMANA.map((dia) => {
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
                      style={
                        item.cor ? { backgroundColor: item.cor } : undefined
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{item.rotulo}</p>
                      <p className="text-muted-foreground text-[11px] tabular-nums">
                        {horaCurta(item.horario_inicio)}–{horaCurta(item.horario_fim)}
                      </p>
                    </div>
                    {onExcluir && (
                      /*
                       * Era um `size-5` (20px) com `opacity-0
                       * group-hover:opacity-100` — desenhado para mouse e quebrado
                       * no toque das duas pontas: no celular não existe hover, então
                       * o alvo ficava invisível mas clicável, e 20px é metade da
                       * régua do dedo. Apagar por acidente um horário que não se vê
                       * é o pior arranjo possível.
                       *
                       * Agora é visível sempre no mobile com 44px, e volta a
                       * aparecer no hover de `sm:` para cima, onde o mouse existe e
                       * o ícone permanente poluiria a grade.
                       */
                      <DialogConfirmarExclusao
                        titulo={`Remover ${item.rotulo}`}
                        mensagem={`${item.rotulo}, ${horaCurta(item.horario_inicio)}–${horaCurta(item.horario_fim)}, sai da rotina fixa da semana.`}
                        onConfirmar={() => onExcluir(item.id)}
                        classeTrigger="text-muted-foreground hover:text-status-risco size-11 shrink-0 sm:size-5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      />
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
