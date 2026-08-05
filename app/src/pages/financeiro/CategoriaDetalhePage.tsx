import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AnelProgresso } from '@/components/AnelProgresso'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonPagina } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatarMoeda, mesDeISO, ultimosMeses } from '@/lib/datas'
import { metaEfetiva, progressoCategoria } from '@/features/financeiro/calculos'
import {
  useCategorias,
  useExcluirCategoria,
  useLancamentosDaCategoria,
  useReceitaDoMes,
  useResumoMensal,
} from '@/features/financeiro/hooks'
import type { LancamentoDetalhado } from '@/features/financeiro/types'
import { GraficoTendencia } from '@/features/financeiro/componentes/GraficoTendencia'
import { DialogCategoria } from '@/features/financeiro/componentes/DialogCategoria'
import { ListaLancamentos } from '@/features/financeiro/componentes/ListaLancamentos'

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
  const excluirCategoria = useExcluirCategoria()

  const categoria = categorias.data?.find((c) => c.id === id)
  const receitaDoMes = receita.data ?? 0

  /**
   * A consulta da categoria devolve `Lancamento` puro, e `ListaLancamentos` pede
   * `LancamentoDetalhado`. Os campos que faltam são justamente os da categoria,
   * que aqui já estão em mãos — preencher a partir dela é de graça, e pedir outra
   * consulta ao banco para buscar o que já se sabe seria desperdício.
   */
  const lancamentosDetalhados = useMemo<LancamentoDetalhado[]>(() => {
    if (!categoria) return []
    return (lancamentos.data ?? []).map((lancamento) => ({
      ...lancamento,
      categoria_nome: categoria.nome,
      categoria_natureza: categoria.natureza,
      categoria_cor: categoria.cor,
    }))
  }, [lancamentos.data, categoria])

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
          {/*
            Mesma lista da página de lançamentos, não uma tabela própria.
            A tabela aqui era o pior caso do mobile: `whitespace-nowrap` global
            forçava `max-w-0 truncate` na descrição (~80px de texto útil num card
            de ~296px) e a forma de pagamento tinha de ser escondida com
            `hidden sm:inline` para as colunas caberem — no aparelho onde o app
            mais é usado, ela mostrava menos.

            `ListaLancamentos` já resolvia isso na outra página: agrupa por dia com
            saldo, deixa a descrição usar a largura toda e mostra a forma de
            pagamento em vez de sacrificá-la. Reaproveitar é fonte única de
            verdade — duas listas do mesmo dado divergem na primeira mudança.

            A consulta da categoria devolve `Lancamento`, sem os campos da
            categoria; aqui eles são conhecidos, então são preenchidos a partir da
            própria `categoria` em vez de pedir outra consulta ao banco.
          */}
          <ListaLancamentos
            lancamentos={lancamentosDetalhados}
            categorias={categorias.data ?? []}
            hoje={hoje}
            carregando={lancamentos.isPending}
            ocultarCategoria
            mensagemVazia="Nenhum lançamento nesta categoria."
          />
        </section>
      </div>
    </>
  )
}
