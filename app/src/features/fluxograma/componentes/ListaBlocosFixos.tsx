import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { DIAS_SEMANA } from '@/lib/constants'
import { formatarDuracao } from '@/lib/datas'
import {
  ORDEM_DIAS_SEMANA,
  agruparPorDiaSemana,
  horaCurta,
  minutosDe,
} from '@/lib/fluxograma'
import { useMediaQuery } from '@/hooks/useMediaQuery'

import { DialogFluxogramaLivre } from './DialogFluxogramaLivre'
import type { FluxogramaLivre } from '../api'

interface LinhaBlocoProps {
  item: FluxogramaLivre
  onExcluir: (id: string) => void
  excluindo: boolean
  /** No mobile as ações ficam sempre visíveis; no desktop, no hover. */
  acoesSempreVisiveis: boolean
}

function LinhaBloco({
  item,
  onExcluir,
  excluindo,
  acoesSempreVisiveis,
}: LinhaBlocoProps) {
  return (
    <li className="border-border bg-card group flex items-center gap-2 rounded-md border px-2 py-1.5">
      <span aria-hidden className="bg-trabalho size-1.5 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs">{item.rotulo}</p>
        <p className="text-muted-foreground text-[11px] tabular-nums">
          {horaCurta(item.horario_inicio)}–{horaCurta(item.horario_fim)} ·{' '}
          {formatarDuracao(minutosDe(item.horario_fim) - minutosDe(item.horario_inicio))}
        </p>
      </div>
      <div
        className={
          acoesSempreVisiveis
            ? 'flex shrink-0 items-center'
            : 'flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'
        }
      >
        <DialogFluxogramaLivre bloco={item} />
        <DialogConfirmarExclusao
          titulo={`Remover ${item.rotulo}`}
          mensagem={`${item.rotulo}, ${horaCurta(item.horario_inicio)}–${horaCurta(item.horario_fim)}, sai da rotina fixa da semana.`}
          onConfirmar={() => onExcluir(item.id)}
          pendente={excluindo}
          classeTrigger={
            acoesSempreVisiveis
              ? 'text-muted-foreground hover:text-status-risco size-11 shrink-0'
              : 'text-muted-foreground hover:text-status-risco size-7 shrink-0'
          }
        />
      </div>
    </li>
  )
}

interface ListaBlocosFixosProps {
  itens: readonly FluxogramaLivre[]
  onExcluir: (id: string) => void
  excluindo?: boolean
}

/**
 * Blocos fixos da semana, em duas formas.
 *
 * No celular, **só os dias que têm bloco**: a grade de sete colunas do
 * `GradeFluxograma` vira uma coluna única no mobile e renderiza os sete dias
 * com cabeçalho, inclusive os vazios — três blocos ocupavam uma tela inteira de
 * rolagem para mostrar três linhas. A partir de `sm:` a grade volta, porque aí
 * as colunas cabem lado a lado e o dia vazio custa nada.
 *
 * Só uma das duas formas é montada por vez — decidido em JS pelo mesmo
 * breakpoint que `GradeMes` usa, e não escondido por CSS — para não duplicar
 * `DialogFluxogramaLivre`/`DialogConfirmarExclusao` (cada um com seu próprio
 * `useForm`/`useEffect`) por bloco.
 */
export function ListaBlocosFixos({
  itens,
  onExcluir,
  excluindo = false,
}: ListaBlocosFixosProps) {
  const telaEstreita = useMediaQuery('(width < 40rem)')
  const porDia = agruparPorDiaSemana(itens)

  if (telaEstreita) {
    const diasComBloco = ORDEM_DIAS_SEMANA.filter((dia) => porDia.has(dia))

    return (
      <div className="space-y-4">
        {diasComBloco.map((dia) => (
          <div key={dia} className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {DIAS_SEMANA[dia]}
            </p>
            <ul className="space-y-1">
              {(porDia.get(dia) ?? []).map((item) => (
                <LinhaBloco
                  key={item.id}
                  item={item}
                  onExcluir={onExcluir}
                  excluindo={excluindo}
                  acoesSempreVisiveis
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

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
                  <LinhaBloco
                    key={item.id}
                    item={item}
                    onExcluir={onExcluir}
                    excluindo={excluindo}
                    acoesSempreVisiveis={false}
                  />
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
