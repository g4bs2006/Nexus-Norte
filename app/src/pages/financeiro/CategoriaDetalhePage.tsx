import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { AnelProgresso } from '@/components/AnelProgresso'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonPagina } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deISO, formatarMoeda, mesDeISO, ultimosMeses } from '@/lib/datas'
import { format } from 'date-fns'
import { metaEfetiva, progressoCategoria } from '@/features/financeiro/calculos'
import {
  useCategorias,
  useExcluirLancamento,
  useLancamentosDaCategoria,
  useReceitaDoMes,
  useResumoMensal,
} from '@/features/financeiro/hooks'
import { GraficoTendencia } from '@/features/financeiro/componentes/GraficoTendencia'

const MESES_TENDENCIA = 6

export default function CategoriaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const hoje = useMemo(() => new Date(), [])
  const mesAtual = mesDeISO(hoje)
  const meses = useMemo(() => ultimosMeses(hoje, MESES_TENDENCIA), [hoje])

  const categorias = useCategorias()
  const receita = useReceitaDoMes(mesAtual)
  const lancamentos = useLancamentosDaCategoria(id)
  const resumo = useResumoMensal(meses[0] ?? mesAtual, mesAtual)
  const excluir = useExcluirLancamento()

  const categoria = categorias.data?.find((c) => c.id === id)
  const receitaDoMes = receita.data ?? 0

  if (categorias.isPending) {
    return (
      <>
        <PageHeader titulo="Categoria" />
        <SkeletonPagina variante="detalhe" />
      </>
    )
  }

  if (!categoria) {
    return (
      <>
        <PageHeader
          titulo="Categoria não encontrada"
          descricao="Esta categoria não existe ou foi excluída."
        />
        <Button asChild variant="secondary" size="sm">
          <Link to="/financeiro">
            <ArrowLeft className="size-4" />
            Voltar ao Financeiro
          </Link>
        </Button>
      </>
    )
  }

  const meta = metaEfetiva(categoria, receitaDoMes)
  const progresso = progressoCategoria(categoria.total_gasto_mes, meta)
  const estourou = progresso !== null && progresso > 100

  return (
    <>
      <PageHeader
        titulo={categoria.nome}
        descricao={
          categoria.natureza === 'receita'
            ? 'Categoria de receita'
            : `Despesa ${categoria.tipo === 'fixo' ? 'fixa' : 'variável'}`
        }
        acoes={
          <Button asChild variant="ghost" size="sm">
            <Link to="/financeiro">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center gap-5">
            <AnelProgresso
              percentual={progresso}
              tamanho={72}
              cor={categoria.cor ?? undefined}
              className={
                categoria.cor
                  ? undefined
                  : estourou
                    ? 'text-status-risco'
                    : 'text-financeiro'
              }
            >
              <span className="text-xs tabular-nums">
                {progresso === null ? '—' : `${Math.round(progresso)}%`}
              </span>
            </AnelProgresso>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">
                Gasto no mês corrente
              </p>
              <p className="metric-lg">
                {formatarMoeda(categoria.total_gasto_mes)}
              </p>
              <p className="text-muted-foreground text-xs">
                {meta === null
                  ? 'Sem meta definida'
                  : `Meta: ${formatarMoeda(meta)}${
                      categoria.meta_tipo === 'percentual_renda'
                        ? ` (${categoria.meta_mensal}% da renda)`
                        : ''
                    }`}
              </p>
            </div>
          </CardContent>
        </Card>

        <GraficoTendencia
          meses={meses}
          resumo={resumo.data ?? []}
          categorias={categoria.natureza === 'despesa' ? [categoria] : []}
          receitaDoMes={receitaDoMes}
        />

        <section className="space-y-3">
          <h2 className="text-sm font-medium">Últimos lançamentos</h2>
          {lancamentos.data && lancamentos.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lancamentos.data.map((lancamento) => (
                      <TableRow key={lancamento.id}>
                        <TableCell className="text-muted-foreground text-xs tabular-nums">
                          {format(deISO(lancamento.data), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {lancamento.descricao ?? '—'}
                          {lancamento.forma_pagamento && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              {lancamento.forma_pagamento}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="metric-sm text-right">
                          {formatarMoeda(lancamento.valor)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-status-risco size-7"
                            aria-label="Excluir lançamento"
                            onClick={() => excluir.mutate(lancamento.id)}
                            disabled={excluir.isPending}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed shadow-none">
              <CardContent className="text-muted-foreground text-sm">
                Nenhum lançamento nesta categoria.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </>
  )
}
