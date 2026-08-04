import { useMemo } from 'react'
import { getDate, getDaysInMonth } from 'date-fns'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import {
  diasRestantesNoMes,
  inicioSemana,
  limitesDoMes,
  mesDeISO,
  paraISO,
  ultimosMeses,
} from '@/lib/datas'
import {
  gastoDisponivelGeral,
  gastoDisponivelPlanejado,
  metaTotalDespesas,
  progressoCategoria,
  saldoProjetadoFimMes,
  statusDiario,
  totaisDoMes,
} from '@/features/financeiro/calculos'
import {
  useCandidatosCorte,
  useCategorias,
  useCheckDia,
  useInvestimentos,
  useLancamentos,
  usePlanejamentoSemana,
  useReceitaDoMes,
  useResumoMensal,
  useSalvarCheck,
  useSalvarPlanejamento,
} from '@/features/financeiro/hooks'
import { CardReceitaDespesa } from '@/features/financeiro/componentes/CardReceitaDespesa'
import { CardDisponivelHoje } from '@/features/financeiro/componentes/CardDisponivelHoje'
import { CardCategoria } from '@/features/financeiro/componentes/CardCategoria'
import { ChecksDiarios } from '@/features/financeiro/componentes/ChecksDiarios'
import { GradePlanejamentoSemanal } from '@/features/financeiro/componentes/GradePlanejamentoSemanal'
import { GraficoTendencia } from '@/features/financeiro/componentes/GraficoTendencia'
import { SecaoAtencao } from '@/features/financeiro/componentes/SecaoAtencao'
import { SecaoInvestimentos } from '@/features/financeiro/componentes/SecaoInvestimentos'
import { DialogCategoria } from '@/features/financeiro/componentes/DialogCategoria'
import { DialogInvestimento } from '@/features/financeiro/componentes/DialogInvestimento'
import { DialogLancamento } from '@/features/financeiro/componentes/DialogLancamento'

const MESES_TENDENCIA = 6

export default function FinanceiroPage() {
  // Estabilizado por render: usado como chave de cache e base de todo cálculo
  // de data. Recriar a cada render invalidaria as queries continuamente.
  const hoje = useMemo(() => new Date(), [])
  const hojeISO = paraISO(hoje)
  const mesAtual = mesDeISO(hoje)
  const semana = paraISO(inicioSemana(hoje))
  const { inicio: inicioMes, fim: fimMes } = limitesDoMes(hoje)
  const meses = useMemo(() => ultimosMeses(hoje, MESES_TENDENCIA), [hoje])

  const categorias = useCategorias()
  const receita = useReceitaDoMes(mesAtual)
  const lancamentosMes = useLancamentos(inicioMes, fimMes)
  const planejamento = usePlanejamentoSemana(semana)
  const candidatos = useCandidatosCorte()
  const investimentos = useInvestimentos(inicioMes, fimMes)
  const resumo = useResumoMensal(meses[0] ?? mesAtual, mesAtual)
  const check = useCheckDia(hojeISO)

  const salvarPlanejamento = useSalvarPlanejamento()
  const salvarCheck = useSalvarCheck()

  // Memoizado para não recriar o array a cada render — sem isso o `useMemo`
  // dos cálculos abaixo recalcularia sempre, perdendo a razão de existir.
  const listaCategorias = useMemo(
    () => categorias.data ?? [],
    [categorias.data],
  )
  const receitaDoMes = receita.data ?? 0

  const calculos = useMemo(() => {
    const totais = totaisDoMes(listaCategorias)
    const metaTotal = metaTotalDespesas(listaCategorias, receitaDoMes)

    // Gasto de hoje considera apenas despesas — uma receita lançada hoje não
    // deve pintar o dia de vermelho.
    const idsDespesa = new Set(
      listaCategorias.filter((c) => c.natureza === 'despesa').map((c) => c.id),
    )
    const gastoDeHoje = (lancamentosMes.data ?? [])
      .filter((l) => l.data === hojeISO && idsDespesa.has(l.categoria_id))
      .reduce((total, l) => total + l.valor, 0)

    const disponivelPlanejado = gastoDisponivelPlanejado(
      planejamento.data ?? [],
      hoje.getDay(),
    )

    return {
      totais,
      metaTotal,
      gastoDeHoje,
      disponivelPlanejado,
      disponivelGeral: gastoDisponivelGeral(
        metaTotal,
        totais.despesa,
        diasRestantesNoMes(hoje),
      ),
      status: statusDiario(gastoDeHoje, disponivelPlanejado),
      progressoMes: progressoCategoria(totais.despesa, metaTotal) ?? 0,
      saldoProjetado: saldoProjetadoFimMes({
        receitaDoMes,
        gastoAteAgora: totais.despesa,
        diaAtual: getDate(hoje),
        diasNoMes: getDaysInMonth(hoje),
      }),
    }
  }, [listaCategorias, receitaDoMes, lancamentosMes.data, planejamento.data, hoje, hojeISO])

  if (categorias.isPending) {
    return (
      <>
        <PageHeader titulo="Financeiro" />
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </>
    )
  }

  if (categorias.isError) {
    return (
      <>
        <PageHeader titulo="Financeiro" />
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
        acoes={
          <>
            <DialogCategoria />
            <DialogLancamento categorias={listaCategorias} hoje={hoje} />
          </>
        }
      />

      {listaCategorias.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>Nenhuma categoria cadastrada ainda.</p>
            <p className="text-xs">
              Comece criando uma categoria de receita (ex: Salário) e algumas de
              despesa — as metas e o planejamento da semana dependem delas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <CardReceitaDespesa
            totais={calculos.totais}
            saldoProjetado={calculos.saldoProjetado}
          />

          <CardDisponivelHoje
            disponivelGeral={calculos.disponivelGeral}
            disponivelPlanejado={calculos.disponivelPlanejado}
            gastoDeHoje={calculos.gastoDeHoje}
            status={calculos.status}
            progressoMes={calculos.progressoMes}
            metaTotal={calculos.metaTotal}
            despesaTotal={calculos.totais.despesa}
          />

          <ChecksDiarios
            check={check.data ?? null}
            diaSemana={hoje.getDay()}
            onAlterar={(campos) =>
              salvarCheck.mutate({ data: hojeISO, campos })
            }
          />

          <SecaoAtencao candidatos={candidatos.data ?? []} />

          <GradePlanejamentoSemanal
            semanaInicio={semana}
            categorias={listaCategorias}
            planejamento={planejamento.data ?? []}
            salvando={salvarPlanejamento.isPending}
            onSalvar={(entradas) =>
              salvarPlanejamento.mutate({ semanaInicio: semana, entradas })
            }
          />

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Categorias de despesa</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {despesas.map((categoria) => (
                <CardCategoria
                  key={categoria.id}
                  categoria={categoria}
                  receitaDoMes={receitaDoMes}
                />
              ))}
            </div>
          </section>

          <GraficoTendencia
            meses={meses}
            resumo={resumo.data ?? []}
            categorias={listaCategorias}
            receitaDoMes={receitaDoMes}
          />

          <SecaoInvestimentos
            investimentos={investimentos.data ?? []}
            acao={<DialogInvestimento hoje={hoje} />}
          />
        </div>
      )}
    </>
  )
}
