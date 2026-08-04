import { Link } from 'react-router-dom'
import { AnelProgresso } from '@/components/AnelProgresso'
import { Card, CardContent } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { metaEfetiva, progressoCategoria } from '../calculos'
import type { Categoria } from '../types'

interface CardCategoriaProps {
  categoria: Categoria
  receitaDoMes: number
}

/** Card de categoria com anel de progresso, gasto/meta e cor (plano 2.3). */
export function CardCategoria({ categoria, receitaDoMes }: CardCategoriaProps) {
  const meta = metaEfetiva(categoria, receitaDoMes)
  const progresso = progressoCategoria(categoria.total_gasto_mes, meta)
  const estourou = progresso !== null && progresso > 100

  return (
    <Card className="hover:border-foreground/20 transition-colors">
      <CardContent className="flex items-center gap-4">
        <AnelProgresso
          percentual={progresso}
          // `cor` é texto livre na tabela; sem valor, cai na cor do pilar —
          // ou no vermelho de risco quando a meta estourou.
          cor={categoria.cor ?? undefined}
          className={cn(
            !categoria.cor &&
              (estourou ? 'text-status-risco' : 'text-financeiro'),
          )}
        >
          <span
            className={cn(
              'text-[11px] tabular-nums',
              estourou && 'text-status-risco',
            )}
          >
            {progresso === null ? '—' : `${Math.round(progresso)}%`}
          </span>
        </AnelProgresso>

        <div className="min-w-0 flex-1 space-y-0.5">
          <Link
            to={`/financeiro/categorias/${categoria.id}`}
            className="block truncate text-sm font-medium hover:underline"
          >
            {categoria.nome}
          </Link>
          <p className="text-muted-foreground text-xs">
            {formatarMoeda(categoria.total_gasto_mes)}
            {meta !== null && ` de ${formatarMoeda(meta)}`}
          </p>
          <p className="text-muted-foreground text-[11px] capitalize">
            {categoria.tipo ?? categoria.natureza}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
