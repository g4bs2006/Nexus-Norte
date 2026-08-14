import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Status } from '@/lib/dominio'

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
  local: string | null
  /** Hex da paleta fixa (lib/cores.ts), ou nulo para cair na cor do pilar. */
  cor: string | null
  media: number | null
  faltasRestantes: number
  limiteFaltas: number
  status: Status
  proximaAvaliacao: { nome: string; dias: number } | null
  /**
   * Gatilho de nota, injetado pela composição.
   *
   * Nota é outra feature desde 14/08, e feature não importa feature (README —
   * a regra de dependência). Quem monta o card é `EstudosPage`, que pode
   * importar as duas.
   */
  acaoNota?: ReactNode
}

/** Card de matéria: média, faltas restantes e contagem regressiva (plano 3.3). */
export function CardMateria({
  id,
  nome,
  professor,
  local,
  cor,
  media,
  faltasRestantes,
  limiteFaltas,
  status,
  proximaAvaliacao,
  acaoNota,
}: CardMateriaProps) {
  // Faltas próximas do limite ganham cor de alerta (plano 3.3)
  const faltasCriticas = limiteFaltas > 0 && faltasRestantes <= 2
  const professorELocal = [professor, local].filter(Boolean).join(' · ')

  return (
    <Card className="hover:border-foreground/20 transition-colors">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/estudos/${id}`}
              className="flex items-center gap-1.5 truncate text-sm font-medium hover:underline"
            >
              <span
                aria-hidden
                className={cn('size-2 shrink-0 rounded-full', !cor && 'bg-estudos')}
                style={cor ? { backgroundColor: cor } : undefined}
              />
              <span className="truncate">{nome}</span>
            </Link>
            {professorELocal && (
              <p className="text-muted-foreground truncate text-xs">
                {professorELocal}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {/*
              Anotar sem abrir a matéria. A ideia de nota costuma chegar no
              meio da listagem — "preciso revisar isso" — e obrigar a navegar
              até o detalhe é onde ela se perde.
            */}
            {acaoNota}
            <Badge
              variant="secondary"
              className={cn(
                'shrink-0 gap-1.5 font-normal',
                CLASSE_STATUS[status],
              )}
            >
              <span
                aria-hidden
                className={cn('size-1.5 rounded-full', CLASSE_PONTO[status])}
              />
              {ROTULO_STATUS[status]}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted-foreground text-[11px]">Média</p>
            <p className="metric-md">
              {media === null ? '—' : media.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[11px]">
              Faltas restantes
            </p>
            <p
              className={cn('metric-md', faltasCriticas && 'text-status-risco')}
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
