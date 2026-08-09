import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { DIAS_SEMANA } from '@/lib/constants'
import {
  ORDEM_DIAS_SEMANA,
  agruparPorDiaSemana,
  horaCurta,
} from '@/lib/fluxograma'
import { DialogFluxogramaLivre } from './DialogFluxogramaLivre'
import type { FluxogramaLivre } from '../api'

function minutosDe(valor: string): number {
  const [horas = '0', minutos = '0'] = valor.split(':')
  return Number(horas) * 60 + Number(minutos)
}

/** `09:00`–`18:00` → `9h`; `09:00`–`11:30` → `2h30`. */
function duracao(inicio: string, fim: string): string {
  const total = minutosDe(fim) - minutosDe(inicio)
  const horas = Math.floor(total / 60)
  const resto = total % 60
  if (horas === 0) return `${resto}min`
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`
}

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
      <span aria-hidden className="bg-trabalho mt-0.5 size-1.5 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs">{item.rotulo}</p>
        <p className="text-muted-foreground text-[11px] tabular-nums">
          {horaCurta(item.horario_inicio)}–{horaCurta(item.horario_fim)} ·{' '}
          {duracao(item.horario_inicio, item.horario_fim)}
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
 */
export function ListaBlocosFixos({
  itens,
  onExcluir,
  excluindo = false,
}: ListaBlocosFixosProps) {
  const porDia = agruparPorDiaSemana(itens)
  const diasComBloco = ORDEM_DIAS_SEMANA.filter((dia) => porDia.has(dia))

  return (
    <>
      {/* Mobile: só os dias povoados */}
      <div className="space-y-4 sm:hidden">
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

      {/* Desktop: a semana inteira, dias vazios incluídos */}
      <div className="hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-4">
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
    </>
  )
}
