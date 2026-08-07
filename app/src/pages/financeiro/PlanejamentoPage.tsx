import { useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonPagina } from '@/components/Skeletons'
import { Card, CardContent } from '@/components/ui/card'
import {
  limitesDoMes,
  mesDeISO,
  paraISO,
  ultimosMeses,
} from '@/lib/datas'
import { MESES_MEDIA_VARIAVEL } from '@/lib/constants'
import {
  useCategorias,
  useCompromissos,
  useLancamentosDetalhados,
  useParceladas,
  useResumoMensal,
} from '@/features/financeiro/hooks'
import { ListaCompromissos } from '@/features/financeiro/componentes/ListaCompromissos'
import { ListaParceladas } from '@/features/financeiro/componentes/ListaParceladas'
import { SecaoProjecao } from '@/features/financeiro/componentes/SecaoProjecao'
import { SheetSimulador } from '@/features/financeiro/componentes/SheetSimulador'

/**
 * Aba "Planejamento" do Financeiro (resolução 10.43) — página própria, no
 * mesmo padrão de `/financeiro/lancamentos`: a page do pilar já é densa, e
 * compromissos + parcelas + projeção somados a ela extrapolariam o que cabe
 * numa tela.
 */
export default function PlanejamentoPage() {
  const hoje = useMemo(() => new Date(), [])
  const hojeISO = paraISO(hoje)
  const mesAtual = mesDeISO(hoje)
  const { inicio: inicioMes, fim: fimMes } = limitesDoMes(hoje)
  // Meses do histórico usado pela média do variável (constante da resolução
  // 10.43) + o mês corrente, que a projeção sempre precisa poder excluir dele.
  const mesesResumo = useMemo(
    () => ultimosMeses(hoje, MESES_MEDIA_VARIAVEL),
    [hoje],
  )

  const categorias = useCategorias()
  const compromissos = useCompromissos()
  const parceladas = useParceladas()
  const resumo = useResumoMensal(mesesResumo[0] ?? mesAtual, mesAtual)
  const lancamentosMes = useLancamentosDetalhados({
    de: inicioMes,
    ate: fimMes,
  })

  const carregando =
    categorias.isPending ||
    compromissos.isPending ||
    parceladas.isPending ||
    resumo.isPending ||
    lancamentosMes.isPending

  if (carregando) {
    return (
      <>
        <PageHeader
          titulo="Planejamento"
          pilar="financeiro"
          icone={CalendarClock}
        />
        <SkeletonPagina variante="financeiro" />
      </>
    )
  }

  if (categorias.isError) {
    return (
      <>
        <PageHeader
          titulo="Planejamento"
          pilar="financeiro"
          icone={CalendarClock}
        />
        <Card className="border-status-risco/40">
          <CardContent className="text-status-risco text-sm">
            Erro ao carregar: {categorias.error.message}
          </CardContent>
        </Card>
      </>
    )
  }

  const listaCategorias = categorias.data ?? []
  const listaCompromissos = compromissos.data ?? []
  const listaParceladas = parceladas.data ?? []
  // `LancamentoDetalhado.categoria_natureza` vem do banco como `string`
  // (colunas com CHECK não narrowam sozinhas — mesma razão da resolução em
  // `types.ts`). O motor de projeção só precisa dos três campos abaixo.
  const lancamentosParaProjecao = (lancamentosMes.data ?? []).map((l) => ({
    valor: l.valor,
    data: l.data,
    categoria_natureza: l.categoria_natureza as 'receita' | 'despesa',
  }))

  return (
    <>
      <PageHeader
        titulo="Planejamento"
        descricao="A camada do meio: o que ainda não aconteceu, mas já se sabe que vai."
        pilar="financeiro"
        icone={CalendarClock}
        acoes={
          <SheetSimulador
            categorias={listaCategorias}
            compromissos={listaCompromissos}
            parceladas={listaParceladas}
            resumo={resumo.data ?? []}
            mesesResumo={mesesResumo}
            lancamentosDoMes={lancamentosParaProjecao}
            hoje={hojeISO}
          />
        }
      />

      <div className="surgir-grupo space-y-6">
        <SecaoProjecao
          hoje={hojeISO}
          compromissos={listaCompromissos}
          parceladas={listaParceladas}
          categorias={listaCategorias}
          resumo={resumo.data ?? []}
          lancamentosDoMes={lancamentosParaProjecao}
          mesesResumo={mesesResumo}
        />

        <ListaCompromissos
          compromissos={listaCompromissos}
          categorias={listaCategorias}
        />

        <ListaParceladas
          parceladas={listaParceladas}
          categorias={listaCategorias}
        />
      </div>
    </>
  )
}
