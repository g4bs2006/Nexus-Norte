import { TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatarMoeda } from '@/lib/datas'
import { MESES_CANDIDATO_CORTE } from '@/lib/constants'
import type { CandidatoCorte } from '../types'

interface SecaoAtencaoProps {
  candidatos: readonly CandidatoCorte[]
}

/**
 * Candidatos a corte: categorias variáveis que estouraram a meta em meses
 * seguidos (plano 2.3). Calculado na leitura — ver nota na migration da Fase 1.
 */
export function SecaoAtencao({ candidatos }: SecaoAtencaoProps) {
  if (candidatos.length === 0) return null

  return (
    <Card className="border-status-atencao/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TriangleAlert className="text-status-atencao size-4" />
          Atenção
        </CardTitle>
        <CardDescription>
          Categorias variáveis acima da meta por {MESES_CANDIDATO_CORTE} meses
          seguidos — candidatas a corte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y">
          {candidatos.map((candidato) => (
            <li
              key={candidato.categoria_id}
              className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0"
            >
              <Link
                to={`/financeiro/categorias/${candidato.categoria_id}`}
                className="hover:underline"
              >
                {candidato.nome}
              </Link>
              <span className="text-muted-foreground text-xs tabular-nums">
                meta {formatarMoeda(candidato.meta_efetiva)} ·{' '}
                {candidato.meses_estourados} meses
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
