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
import type { PersonalRecord } from '../types'

interface SecaoPRsProps {
  prs: readonly PersonalRecord[]
  nomePorExercicio: ReadonlyMap<string, string>
  limite?: number
}

/** PRs recentes com destaque visual (plano 4.3). */
export function SecaoPRs({ prs, nomePorExercicio, limite = 5 }: SecaoPRsProps) {
  if (prs.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="text-treino size-4" />
          Recordes recentes
        </CardTitle>
        <CardDescription>
          1RM estimado por Epley, gravado automaticamente a cada execução.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y">
          {prs.slice(0, limite).map((pr) => (
            <li
              key={pr.id}
              className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Link
                  to={`/treino/${pr.exercicio_id}`}
                  className="block truncate text-sm hover:underline"
                >
                  {nomePorExercicio.get(pr.exercicio_id) ?? 'Exercício'}
                </Link>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {format(deISO(pr.data), 'dd/MM/yyyy')} · {pr.carga}kg ×{' '}
                  {pr.reps}
                </p>
              </div>
              <span className="text-treino shrink-0 text-sm tabular-nums">
                {pr.um_rm_estimado.toFixed(1)}kg
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
