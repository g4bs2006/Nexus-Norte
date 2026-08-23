import { differenceInCalendarDays, format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { deISO, paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { statusAtividade } from '../calculos'
import { useDefinirConclusaoAtividade } from '../hooks'
import type { Atividade } from '../types'
import { DialogAtividade } from './DialogAtividade'

interface SecaoEntregasProps {
  atividades: readonly Atividade[]
  nomePorMateria: ReadonlyMap<string, string>
  hoje: Date
}

/** Quantos dias à frente ainda contam como "próxima". Duas semanas de horizonte. */
const HORIZONTE_DIAS = 14

/**
 * Entregas que pedem atenção no hub de Estudos.
 *
 * Atrasadas primeiro e sem corte de horizonte — prazo vencido não expira da
 * lista só porque ficou velho. As próximas param em duas semanas: um trabalho
 * para o mês que vem não é resposta para "o que eu faço hoje", e listá-lo
 * afogaria o que é.
 */
export function SecaoEntregas({
  atividades,
  nomePorMateria,
  hoje,
}: SecaoEntregasProps) {
  const definirConclusao = useDefinirConclusaoAtividade()
  const hojeISO = paraISO(hoje)

  const atrasadas = atividades.filter(
    (atividade) => statusAtividade(atividade, hojeISO) === 'atrasada',
  )

  const proximas = atividades
    .filter((atividade) => {
      if (statusAtividade(atividade, hojeISO) !== 'pendente') return false
      const dias = differenceInCalendarDays(deISO(atividade.data_entrega), hoje)
      return dias <= HORIZONTE_DIAS
    })
    .sort((a, b) => a.data_entrega.localeCompare(b.data_entrega))

  const listadas = [...atrasadas, ...proximas]

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Entregas</CardTitle>
          <CardDescription>
            {atrasadas.length > 0
              ? `${atrasadas.length} ${atrasadas.length === 1 ? 'atrasada' : 'atrasadas'} e o que vence nas próximas duas semanas.`
              : 'O que vence nas próximas duas semanas.'}
          </CardDescription>
        </div>
        <DialogAtividade />
      </CardHeader>
      <CardContent>
        {listadas.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma entrega próxima.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {listadas.map((atividade) => {
              const atrasada =
                statusAtividade(atividade, hojeISO) === 'atrasada'
              const dias = differenceInCalendarDays(
                deISO(atividade.data_entrega),
                hoje,
              )
              const materia = nomePorMateria.get(atividade.materia_id)

              return (
                <li
                  key={atividade.id}
                  className="border-border/50 hover:bg-accent/40 flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() =>
                      definirConclusao.mutate({
                        id: atividade.id,
                        concluida: true,
                      })
                    }
                    aria-label={`Concluir ${atividade.titulo}`}
                    className="shrink-0"
                  />

                  <Link
                    to={`/estudos/${atividade.materia_id}`}
                    className="min-w-0 flex-1"
                  >
                    <span className="block truncate text-sm font-medium">
                      {atividade.titulo}
                    </span>
                    {materia && (
                      <span className="text-muted-foreground block truncate text-xs">
                        {materia}
                      </span>
                    )}
                  </Link>

                  <span
                    className={cn(
                      'shrink-0 text-right text-xs tabular-nums',
                      atrasada
                        ? 'text-status-risco font-medium'
                        : 'text-muted-foreground',
                    )}
                  >
                    <span className="block">
                      {format(deISO(atividade.data_entrega), 'dd/MM')}
                    </span>
                    <span className="block">
                      {atrasada
                        ? `${Math.abs(dias)}d atrás`
                        : dias === 0
                          ? 'hoje'
                          : `em ${dias}d`}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
