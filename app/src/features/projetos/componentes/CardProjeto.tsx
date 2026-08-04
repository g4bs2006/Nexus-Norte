import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarraProgresso } from '@/components/BarraProgresso'
import { cn } from '@/lib/utils'
import { ROTULOS_STATUS_PROJETO, type Projeto } from '../types'

interface CardProjetoProps {
  projeto: Projeto
  percentual: number | null
  diasSemAtualizacao: number | null
  momentumBaixo: boolean
}

/**
 * Card de projeto. Momentum baixo reduz a opacidade — o card "esfria"
 * visualmente (plano 5.3), sem esconder a informação.
 */
export function CardProjeto({
  projeto,
  percentual,
  diasSemAtualizacao,
  momentumBaixo,
}: CardProjetoProps) {
  const concluido = projeto.status === 'concluido'
  // Projeto concluído não esfria: não se espera mais movimento nele
  const esfriar = momentumBaixo && !concluido

  return (
    <Card
      className={cn(
        'hover:border-foreground/20 transition-all',
        esfriar && 'opacity-60 hover:opacity-100',
      )}
    >
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/projetos/${projeto.id}`}
              className="block truncate text-sm font-medium hover:underline"
            >
              {projeto.nome}
            </Link>
            {projeto.descricao && (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {projeto.descricao}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0 font-normal">
            {ROTULOS_STATUS_PROJETO[projeto.status]}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>Marcos concluídos</span>
            <span className="tabular-nums">
              {percentual === null ? 'sem marcos' : `${Math.round(percentual)}%`}
            </span>
          </div>
          <BarraProgresso
            valor={percentual ?? 0}
            classeCor="bg-projetos"
            rotulo="Marcos concluídos"
          />
        </div>

        <p
          className={cn(
            'text-xs',
            esfriar ? 'text-status-atencao' : 'text-muted-foreground',
          )}
        >
          {diasSemAtualizacao === null
            ? 'Nenhum progresso registrado'
            : diasSemAtualizacao === 0
              ? 'Atualizado hoje'
              : `Última atualização há ${diasSemAtualizacao} ${
                  diasSemAtualizacao === 1 ? 'dia' : 'dias'
                }`}
        </p>
      </CardContent>
    </Card>
  )
}
