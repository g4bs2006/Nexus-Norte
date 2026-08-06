// app/src/features/financeiro/componentes/SecaoComposicaoGastos.tsx
import { PieChart } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BarraProgresso } from '@/components/BarraProgresso'
import { formatarMoeda } from '@/lib/datas'
import { composicaoGastos } from '../calculos'
import type { Categoria } from '../types'

interface SecaoComposicaoGastosProps {
  categorias: readonly Categoria[]
}

/**
 * "Pra onde vai o dinheiro": as categorias de despesa do mês, do maior para o
 * menor gasto, com a proporção sobre o total (melhoria de gráficos, 06/08).
 *
 * O grid de `CardCategoria` mostra cada categoria contra a própria meta, mas
 * nenhuma tela deixa comparar categorias entre si — não dá para ver de cara que
 * uma é 40% do gasto do mês só olhando os anéis, um por um. Reaproveita
 * `composicaoGastos` (que por sua vez reaproveita `rankingGastos` e
 * `progressoCategoria`, sem cálculo novo) e a cor livre da categoria, do mesmo
 * jeito que `ListaLancamentos` já usa como pastilha de identificação.
 */
export function SecaoComposicaoGastos({
  categorias,
}: SecaoComposicaoGastosProps) {
  const composicao = composicaoGastos(categorias)

  if (composicao.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="size-4" />
          Pra onde vai o dinheiro
        </CardTitle>
        <CardDescription>
          Categorias de despesa do mês, por participação no total.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {composicao.map((entrada) => (
            <li key={entrada.categoria_id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <Link
                  to={`/financeiro/categorias/${entrada.categoria_id}`}
                  className="truncate hover:underline"
                >
                  {entrada.nome}
                </Link>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {formatarMoeda(entrada.total)}
                  {entrada.percentual !== null &&
                    ` · ${Math.round(entrada.percentual)}%`}
                </span>
              </div>
              <BarraProgresso
                valor={entrada.percentual ?? 0}
                cor={entrada.cor ?? undefined}
                classeCor={!entrada.cor ? 'bg-financeiro' : undefined}
                className="h-1.5"
                rotulo={`${entrada.nome}: ${Math.round(entrada.percentual ?? 0)}% do gasto do mês`}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
