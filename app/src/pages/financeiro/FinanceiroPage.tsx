import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Receipt, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EstadoVazio } from '@/components/EstadoVazio'
import { SkeletonPagina } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  limitesDoMes,
  mesDeISO,
  paraISO,
  ultimosMeses,
} from '@/lib/datas'
import { totaisDoMes } from '@/features/financeiro/calculos'
import {
  useCandidatosCorte,
  useCategorias,
  useCheckDia,
  useInvestimentos,
  useLancamentos,
  useReceitaDoMes,
  useResumoMensal,
  useSalvarCheck,
} from '@/features/financeiro/hooks'
import { HorizonteFinanceiro } from '@/features/financeiro/componentes/HorizonteFinanceiro'
import { useEventosFinanceiros } from '@/features/financeiro/caixa-hooks'
import { expandirEventos } from '@/features/financeiro/horizonte'
import { CardReceitaDespesa } from '@/features/financeiro/componentes/CardReceitaDespesa'
import { CardSugestaoInvestimento } from '@/features/financeiro/componentes/CardSugestaoInvestimento'
import { CardCategoria } from '@/features/financeiro/componentes/CardCategoria'
import { ChecksDiarios } from '@/features/financeiro/componentes/ChecksDiarios'
import { GraficoTendencia } from '@/features/financeiro/componentes/GraficoTendencia'
import { SecaoComposicaoGastos } from '@/features/financeiro/componentes/SecaoComposicaoGastos'
import { SecaoAtencao } from '@/features/financeiro/componentes/SecaoAtencao'
import { SecaoInvestimentos } from '@/features/financeiro/componentes/SecaoInvestimentos'
import { DialogCategoria } from '@/features/financeiro/componentes/DialogCategoria'
import { DialogInvestimento } from '@/features/financeiro/componentes/DialogInvestimento'
import { DialogLancamento } from '@/features/financeiro/componentes/DialogLancamento'
import { LancamentoRapido } from '@/features/financeiro/componentes/LancamentoRapido'
import { SecaoUltimosLancamentos } from '@/features/financeiro/componentes/SecaoUltimosLancamentos'

const MESES_TENDENCIA = 6

export default function FinanceiroPage() {
  // Estabilizado por render: usado como chave de cache e base de todo cálculo
  // de data. Recriar a cada render invalidaria as queries continuamente.
  const hoje = useMemo(() => new Date(), [])
  const hojeISO = paraISO(hoje)
  const mesAtual = mesDeISO(hoje)
  const { inicio: inicioMes, fim: fimMes } = limitesDoMes(hoje)
  const meses = useMemo(() => ultimosMeses(hoje, MESES_TENDENCIA), [hoje])

  const categorias = useCategorias()
  const receita = useReceitaDoMes(mesAtual)
  const lancamentosMes = useLancamentos(inicioMes, fimMes)
  const candidatos = useCandidatosCorte()
  const investimentos = useInvestimentos(inicioMes, fimMes)
  const resumo = useResumoMensal(meses[0] ?? mesAtual, mesAtual)
  const check = useCheckDia(hojeISO)
  const compromissos = useEventosFinanceiros()

  const salvarCheck = useSalvarCheck()

  // Memoizado para não recriar o array a cada render — sem isso o `useMemo`
  // dos cálculos abaixo recalcularia sempre, perdendo a razão de existir.
  const listaCategorias = useMemo(
    () => categorias.data ?? [],
    [categorias.data],
  )
  const receitaDoMes = receita.data ?? 0

  const totais = useMemo(() => totaisDoMes(listaCategorias), [listaCategorias])

  // Camada de previsto x realizado no card do topo (resolução 10.43, efeito
  // colateral já previsto na spec): compromissos recorrentes do mês corrente,
  // por natureza. Só um resumo — a projeção completa mora em /planejamento.
  const previsto = useMemo(() => {
    if (!compromissos.data) return undefined
    const ocorrencias = expandirEventos(compromissos.data, inicioMes, fimMes)
    return ocorrencias.reduce(
      (total, o) => {
        if (o.categoria_natureza === 'receita') {
          total.receita += o.valor
        } else {
          total.despesa += o.valor
        }
        return total
      },
      { receita: 0, despesa: 0 },
    )
  }, [compromissos.data, inicioMes, fimMes])

  if (categorias.isPending) {
    return (
      <>
        <PageHeader titulo="Financeiro" pilar="financeiro" icone={Wallet} />
        <SkeletonPagina variante="financeiro" />
      </>
    )
  }

  if (categorias.isError) {
    return (
      <>
        <PageHeader titulo="Financeiro" pilar="financeiro" icone={Wallet} />
        <Card className="border-status-risco/40">
          <CardContent className="text-status-risco text-sm">
            Erro ao carregar: {categorias.error.message}
          </CardContent>
        </Card>
      </>
    )
  }

  const despesas = listaCategorias.filter((c) => c.natureza === 'despesa')

  return (
    <>
      <PageHeader
        titulo="Financeiro"
        descricao="Planejado vs. realizado, metas por categoria e investimentos."
        pilar="financeiro"
        icone={Wallet}
        acoes={
          <>
            {/* Caminho explícito para a lista, sem depender de rolar até o card
                de últimos lançamentos e achar o atalho no cabeçalho dele */}
            <Button asChild variant="secondary" size="sm">
              <Link to="/financeiro/lancamentos">
                <Receipt className="size-4" />
                Lançamentos
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/financeiro/planejamento">
                <CalendarClock className="size-4" />
                Planejamento
              </Link>
            </Button>
            <DialogCategoria />
            <DialogLancamento categorias={listaCategorias} hoje={hoje} />
          </>
        }
      />

      {listaCategorias.length === 0 ? (
        <EstadoVazio
          icone={Wallet}
          classeCor="text-financeiro"
          classeFundo="bg-financeiro-soft"
          titulo="Comece pelas categorias"
          descricao="Crie uma categoria de receita, como Salário, e algumas de despesa. As metas e os gráficos dependem delas."
          acao={<DialogCategoria />}
        />
      ) : (
        <div className="space-y-6">
          <HorizonteFinanceiro />

          {/* Primeiro elemento da página: é a ação mais frequente (Bloco D) */}
          <LancamentoRapido categorias={listaCategorias} hoje={hoje} />

          <CardReceitaDespesa
            totais={totais}
            previsto={previsto}
          />



          <ChecksDiarios
            check={check.data ?? null}
            diaSemana={hoje.getDay()}
            onAlterar={(campos) =>
              salvarCheck.mutate({ data: hojeISO, campos })
            }
          />

          <SecaoAtencao candidatos={candidatos.data ?? []} />



          <section className="space-y-3">
            <h2 className="text-sm font-medium">Categorias de despesa</h2>
            <div className="surgir-grupo grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {despesas.map((categoria) => (
                <CardCategoria
                  key={categoria.id}
                  categoria={categoria}
                  receitaDoMes={receitaDoMes}
                />
              ))}
            </div>
          </section>

          <SecaoComposicaoGastos categorias={listaCategorias} />

          <GraficoTendencia
            meses={meses}
            resumo={resumo.data ?? []}
            categorias={listaCategorias}
            receitaDoMes={receitaDoMes}
          />

          {/*
            Resumo apontando para a lista completa (resolução 10.23). Os
            lançamentos do mês já eram buscados aqui para calcular o gasto de hoje
            e eram descartados — mostrar os últimos não custa consulta nenhuma.
          */}
          <SecaoUltimosLancamentos
            lancamentos={lancamentosMes.data ?? []}
            categorias={listaCategorias}
          />

          <CardSugestaoInvestimento />

          <SecaoInvestimentos
            investimentos={investimentos.data ?? []}
            acao={<DialogInvestimento hoje={hoje} />}
            hoje={hoje}
          />
        </div>
      )}
    </>
  )
}
