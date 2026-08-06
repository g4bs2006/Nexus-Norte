// app/src/features/metas/componentes/CardMeta.tsx
import { Pencil } from 'lucide-react'
import { BarraProgresso } from '@/components/BarraProgresso'
import { CheckDia } from '@/components/CheckDia'
import { Button } from '@/components/ui/button'
import { paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { checkinsNaSemana, progressoNumerico, streakAtual } from '../calculos'
import {
  useAlternarCheckin,
  useAtualizarMeta,
  useCheckinsMeta,
  useProgressoMeta,
} from '../hooks'
import { CLASSE_COR_PILAR, pilarDaMeta, type Meta } from '../types'
import { DialogMeta } from './DialogMeta'

interface CardMetaProps {
  meta: Meta
  hoje: Date
}

/** Card compacto de uma meta — a forma varia por `meta.tipo`. */
export function CardMeta({ meta, hoje }: CardMetaProps) {
  const link = pilarDaMeta(meta)
  const classeCor = link ? CLASSE_COR_PILAR[link.pilar] : 'text-foreground'
  const usaLinkNumerico = meta.tipo === 'numerica' && link !== null

  const progresso = useProgressoMeta(meta.id, usaLinkNumerico)
  const checkins = useCheckinsMeta(meta.id, meta.tipo === 'habito')
  const alternarCheckin = useAlternarCheckin()
  const atualizar = useAtualizarMeta()

  const hojeISO = paraISO(hoje)

  return (
    <div className="border-border bg-card flex w-40 shrink-0 snap-start flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-1">
        <span className={cn('truncate text-sm font-medium', classeCor)}>
          {meta.titulo}
        </span>
        <DialogMeta
          meta={meta}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              aria-label="Editar meta"
            >
              <Pencil className="size-3" />
            </Button>
          }
        />
      </div>

      {meta.tipo === 'numerica' &&
        (() => {
          const valorAtual = usaLinkNumerico
            ? (progresso.data ?? null)
            : meta.valor_atual_manual
          const percentual = progressoNumerico(valorAtual, meta.valor_alvo)
          return (
            <>
              <BarraProgresso
                valor={percentual ?? 0}
                rotulo={`Progresso de ${meta.titulo}`}
              />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">
                  {valorAtual === null ? '—' : valorAtual} /{' '}
                  {meta.valor_alvo ?? '—'} {meta.unidade ?? ''}
                </span>
                {!usaLinkNumerico && (
                  <input
                    type="number"
                    step="any"
                    defaultValue={meta.valor_atual_manual ?? ''}
                    onBlur={(e) => {
                      const valor = e.target.valueAsNumber
                      atualizar.mutate({
                        id: meta.id,
                        dados: {
                          valor_atual_manual: Number.isNaN(valor)
                            ? null
                            : valor,
                        },
                      })
                    }}
                    className="border-input bg-background w-16 rounded border px-1 text-xs"
                    aria-label={`Atualizar valor de ${meta.titulo}`}
                  />
                )}
              </div>
            </>
          )
        })()}

      {meta.tipo === 'marco' && (
        <>
          <CheckDia
            id={`meta-concluida-${meta.id}`}
            marcado={meta.concluida}
            onAlternar={(concluida) => {
              atualizar.mutate({ id: meta.id, dados: { concluida } })
            }}
          >
            Concluída
          </CheckDia>
          <span className="text-muted-foreground text-xs">
            {meta.data_alvo ? `Prazo ${meta.data_alvo}` : 'Sem prazo'}
          </span>
        </>
      )}

      {meta.tipo === 'habito' &&
        (() => {
          const lista = checkins.data ?? []
          const streak = streakAtual(lista, hoje)
          const semana = checkinsNaSemana(lista, hoje)
          const marcadoHoje = lista.some((c) => c.data === hojeISO && c.feito)
          return (
            <>
              <CheckDia
                id={`meta-habito-${meta.id}`}
                marcado={marcadoHoje}
                onAlternar={(feito) => {
                  alternarCheckin.mutate({ metaId: meta.id, data: hojeISO, feito })
                }}
              >
                Hoje
              </CheckDia>
              <span className="text-muted-foreground text-xs">
                {streak} dia{streak === 1 ? '' : 's'} · {semana}/
                {meta.frequencia_alvo ?? '—'} na semana
              </span>
            </>
          )
        })()}

      {meta.tipo === 'livre' && (
        <CheckDia
          id={`meta-concluida-${meta.id}`}
          marcado={meta.concluida}
          onAlternar={(concluida) => {
            atualizar.mutate({ id: meta.id, dados: { concluida } })
          }}
        >
          Concluída
        </CheckDia>
      )}
    </div>
  )
}
