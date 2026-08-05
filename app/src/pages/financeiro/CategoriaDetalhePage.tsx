import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AnelProgresso } from '@/components/AnelProgresso'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
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
  useExcluirCategoria,
  useExcluirLancamento,
  useLancamentosDaCategoria,
  useReceitaDoMes,
  useResumoMensal,
} from '@/features/financeiro/hooks'
import { GraficoTendencia } from '@/features/financeiro/componentes/GraficoTendencia'
import { DialogCategoria } from '@/features/financeiro/componentes/DialogCategoria'
import { DialogLancamento } from '@/features/financeiro/componentes/DialogLancamento'

const MESES_TENDENCIA = 6

export default function CategoriaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hoje = useMemo(() => new Date(), [])
  const mesAtual = mesDeISO(hoje)
  const meses = useMemo(() => ultimosMeses(hoje, MESES_TENDENCIA), [hoje])

  const categorias = useCategorias()
  const receita = useReceitaDoMes(mesAtual)
  const lancamentos = useLancamentosDaCategoria(id)
  const resumo = useResumoMensal(meses[0] ?? mesAtual, mesAtual)
  const excluirLancamento = useExcluirLancamento()
  const excluirCategoria = useExcluirCategoria()

  const categoria = categorias.data?.find((c) => c.id === id)
  const receitaDoMes = receita.data ?? 0

  if (categorias.isPending) {
    return (
      <>
        <PageHeader titulo="Categoria" pilar="financeiro" />
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
          pilar="financeiro"
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
        pilar="financeiro"
        acoes={
          <div className="flex items-center gap-1">
            <DialogCategoria categoria={categoria} />
            <DialogConfirmarExclusao
              titulo="Excluir categoria"
              mensagem={`Todos os lançamentos de "${categoria.nome}" serão perdidos. Essa ação não pode ser desfeita.`}
              onConfirmar={async () => {
                await excluirCategoria.mutateAsync(categoria.id)
                navigate('/financeiro')
              }}
              pendente={excluirCategoria.isPending}
            />
            <Button asChild variant="ghost" size="sm">
              <Link to="/financeiro">
                <ArrowLeft className="size-4" />
                Voltar
              </Link>
            </Button>
          </div>
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
                      {/*
                        Larguras apertadas no mobile para a tabela caber em
                        ~296px sem rolagem horizontal — antes valor e ações
                        nasciam fora da tela.
                      */}
                      <TableHead className="w-20 sm:w-28">Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      {/*
                        84px: o alvo de excluir subiu para 44px no toque e agora
                        divide a célula com o de editar. Aperta a descrição, e é
                        mais um motivo para esta tabela virar lista de cards no
                        mobile — o alvo do dedo não cabe em coluna de tabela.
                      */}
                      <TableHead className="w-[5.25rem] sm:w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lancamentos.data.map((lancamento) => (
                      <TableRow key={lancamento.id}>
                        <TableCell className="text-muted-foreground text-xs tabular-nums">
                          {format(deISO(lancamento.data), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="max-w-0 truncate text-sm">
                          {lancamento.descricao ?? '—'}
                          {/* Forma de pagamento é contexto: sai no mobile */}
                          {lancamento.forma_pagamento && (
                            <span className="text-muted-foreground ml-2 hidden text-xs sm:inline">
                              {lancamento.forma_pagamento}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="metric-sm text-right">
                          {formatarMoeda(lancamento.valor)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 sm:gap-0.5">
                            <DialogLancamento
                              categorias={categorias.data ?? []}
                              hoje={hoje}
                              lancamento={lancamento}
                            />
                            <DialogConfirmarExclusao
                              titulo="Excluir lançamento"
                              mensagem={`${formatarMoeda(lancamento.valor)} em ${format(deISO(lancamento.data), 'dd/MM/yyyy')}${
                                lancamento.descricao
                                  ? ` — ${lancamento.descricao}`
                                  : ''
                              }. Essa ação não pode ser desfeita.`}
                              onConfirmar={() =>
                                excluirLancamento.mutate(lancamento.id)
                              }
                              pendente={excluirLancamento.isPending}
                            />
                          </div>
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
