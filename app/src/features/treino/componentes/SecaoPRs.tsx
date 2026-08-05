import { useMemo } from 'react'
import { format } from 'date-fns'
import { Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { deISO } from '@/lib/datas'
import { recordesPorExercicio } from '../calculos'
import type { PersonalRecordComNome } from '../types'

interface SecaoPRsProps {
  prs: readonly PersonalRecordComNome[]
  limite?: number
}

/**
 * Recordes pessoais, um por exercício (plano 4.3 + resolução 10.18).
 *
 * Agrupa por exercício base: um recorde de Supino Inclinado vale para todos os
 * treinos que o usam. Antes o PR era por exercício-dentro-de-um-treino, então o
 * mesmo movimento aparecia duas vezes com marcas diferentes.
 */
export function SecaoPRs({ prs, limite = 5 }: SecaoPRsProps) {
  const recordes = useMemo(() => recordesPorExercicio(prs), [prs])

  if (recordes.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="text-treino size-4" />
          Recordes
        </CardTitle>
        <CardDescription>
          Melhor 1RM por exercício, somando todos os treinos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y">
          {recordes.slice(0, limite).map((recorde) => (
            <li
              key={recorde.exercicio_base_id}
              className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Link
                  to={`/treino/${recorde.exercicio_base_id}`}
                  className="block truncate text-sm hover:underline"
                >
                  {recorde.exercicio_nome}
                </Link>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {format(deISO(recorde.data), 'dd/MM/yyyy')} · {recorde.carga}
                  kg × {recorde.reps}
                </p>
              </div>
              <span className="metric-sm text-treino shrink-0">
                {recorde.melhor1rm.toFixed(1)}kg
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
