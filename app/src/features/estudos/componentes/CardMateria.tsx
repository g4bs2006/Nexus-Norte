import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Status } from '../types'

const ROTULO_STATUS: Record<Status, string> = {
  ok: 'Tranquilo',
  atencao: 'Atenção',
  risco: 'Risco',
}

const CLASSE_STATUS: Record<Status, string> = {
  ok: 'text-status-ok',
  atencao: 'text-status-atencao',
  risco: 'text-status-risco',
}

const CLASSE_PONTO: Record<Status, string> = {
  ok: 'bg-status-ok',
  atencao: 'bg-status-atencao',
  risco: 'bg-status-risco',
}

interface CardMateriaProps {
  id: string
  nome: string
  professor: string | null
  media: number | null
  faltasRestantes: number
  limiteFaltas: number
  status: Status
  proximaAvaliacao: { nome: string; dias: number } | null
}

/** Card de matéria: média, faltas restantes e contagem regressiva (plano 3.3). */
export function CardMateria({
  id,
  nome,
  professor,
  media,
  faltasRestantes,
  limiteFaltas,
  status,
  proximaAvaliacao,
}: CardMateriaProps) {
  // Faltas próximas do limite ganham cor de alerta (plano 3.3)
  const faltasCriticas = limiteFaltas > 0 && faltasRestantes <= 2

  return (
    <Card className="hover:border-foreground/20 transition-colors">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/estudos/${id}`}
              className="block truncate text-sm font-medium hover:underline"
            >
              {nome}
            </Link>
            {professor && (
              <p className="text-muted-foreground truncate text-xs">
                {professor}
              </p>
            )}
          </div>
          <Badge
            variant="secondary"
            className={cn('shrink-0 gap-1.5 font-normal', CLASSE_STATUS[status])}
          >
            <span
              aria-hidden
              className={cn('size-1.5 rounded-full', CLASSE_PONTO[status])}
            />
            {ROTULO_STATUS[status]}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted-foreground text-[11px]">Média</p>
            <p className="text-lg tabular-nums">
              {media === null ? '—' : media.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[11px]">Faltas restantes</p>
            <p
              className={cn(
                'text-lg tabular-nums',
                faltasCriticas && 'text-status-risco',
              )}
            >
              {limiteFaltas === 0 ? '—' : faltasRestantes}
              {limiteFaltas > 0 && (
                <span className="text-muted-foreground text-xs">
                  {' '}
                  / {limiteFaltas}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CalendarClock className="size-3.5 shrink-0" />
          {proximaAvaliacao ? (
            <span className="truncate">
              {proximaAvaliacao.nome} em{' '}
              {proximaAvaliacao.dias === 0
                ? 'hoje'
                : `${proximaAvaliacao.dias} ${proximaAvaliacao.dias === 1 ? 'dia' : 'dias'}`}
            </span>
          ) : (
            <span>Sem avaliação marcada</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
