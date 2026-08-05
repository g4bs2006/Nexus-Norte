import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { deISO, formatarMoeda } from '@/lib/datas'
import { cn } from '@/lib/utils'
import type { Categoria, Lancamento } from '../types'

/** Quantos cabem sem competir com o resto do painel. */
const QUANTOS = 5

interface SecaoUltimosLancamentosProps {
  lancamentos: readonly Lancamento[]
  categorias: readonly Categoria[]
}

/**
 * Os últimos lançamentos do mês, com atalho para a lista completa (10.23).
 *
 * Fica no painel para que "o que lancei hoje" custe zero clique — é a pergunta
 * mais frequente, e conferir se algo ficou de fora é o uso diário do pilar.
 *
 * Não recebe consulta própria: os lançamentos do mês já eram carregados na página
 * para calcular o gasto de hoje e depois descartados. Aproveitar o que já está em
 * memória custa nada.
 */
export function SecaoUltimosLancamentos({
  lancamentos,
  categorias,
}: SecaoUltimosLancamentosProps) {
  const naturezaPorCategoria = new Map(
    categorias.map((categoria) => [categoria.id, categoria.natureza]),
  )
  const nomePorCategoria = new Map(
    categorias.map((categoria) => [categoria.id, categoria.nome]),
  )

  // A consulta já vem por data desc; `created_at` desempata o mesmo dia
  const ultimos = [...lancamentos]
    .sort(
      (a, b) =>
        b.data.localeCompare(a.data) ||
        b.created_at.localeCompare(a.created_at),
    )
    .slice(0, QUANTOS)

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Últimos lançamentos</CardTitle>
          <CardDescription>Deste mês.</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0 text-xs">
          <Link to="/financeiro/lancamentos">
            Ver todos
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {ultimos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum lançamento neste mês.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {ultimos.map((lancamento) => {
              const entrada =
                naturezaPorCategoria.get(lancamento.categoria_id) === 'receita'
              const nomeCategoria =
                nomePorCategoria.get(lancamento.categoria_id) ?? 'Categoria'

              return (
                <li
                  key={lancamento.id}
                  className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                    {format(deISO(lancamento.data), 'dd/MM')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {lancamento.descricao ?? nomeCategoria}
                  </span>
                  <span
                    className={cn(
                      'metric-sm shrink-0',
                      // Só a entrada ganha cor: verde em toda saída normal
                      // esvaziaria o significado do verde
                      entrada ? 'text-status-ok' : 'text-foreground',
                    )}
                  >
                    {entrada ? '+' : '−'}
                    {formatarMoeda(lancamento.valor)}
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
