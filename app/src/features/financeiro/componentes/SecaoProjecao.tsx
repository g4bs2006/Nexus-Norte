import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EIXO, ESTILO_TOOLTIP } from '@/components/grafico'
import { formatarMoeda, rotuloMes } from '@/lib/datas'
import {
  HORIZONTE_PROJECAO_PADRAO,
  MESES_MEDIA_VARIAVEL,
} from '@/lib/constants'
import {
  categoriasElegiveisParaMediaVariavel,
  estimativaVariavelPorCategoria,
  mesesComHistorico,
  projetarFluxoCaixa,
} from '../projecao'
import type { ProjecaoMensal } from '../projecao'
import type { ResumoMensal } from '../api'
import type { Categoria } from '../types'
import type { CompromissoDetalhado, ParceladaDetalhada } from '../projecao'

interface SecaoProjecaoProps {
  hoje: string
  compromissos: readonly CompromissoDetalhado[]
  parceladas: readonly ParceladaDetalhada[]
  categorias: readonly Categoria[]
  resumo: readonly ResumoMensal[]
  lancamentosDoMes: readonly {
    valor: number
    data: string
    categoria_natureza: string
  }[]
  mesesResumo: readonly string[]
}

interface PontoGrafico {
  mes: string
  media: number
  pessimista: number
  /** Base invisível da faixa empilhada — sempre o menor dos dois valores. */
  faixaBase: number
  /** Altura da faixa colorida — a distância entre média e pessimista. */
  faixaAltura: number
  fonte: ProjecaoMensal['fonte']
}

interface ConteudoTooltipProps extends TooltipContentProps {
  pontos: readonly ProjecaoMensal[]
  pontosPessimistas: readonly ProjecaoMensal[]
}

function ConteudoTooltip({
  active,
  payload,
  label,
  pontos,
  pontosPessimistas,
}: ConteudoTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const rotulo = String(label)
  const indice = payload[0]?.payload
    ? (payload[0].payload as PontoGrafico)
    : undefined
  const ponto = pontos.find((p) => rotuloMes(p.mes) === indice?.mes)
  const pessimista = pontosPessimistas.find(
    (p) => rotuloMes(p.mes) === indice?.mes,
  )
  if (!ponto) return null

  return (
    <div style={ESTILO_TOOLTIP} className="min-w-[10rem] space-y-1 px-2.5 py-1.5">
      <p className="font-medium">
        {rotulo} {ponto.fonte === 'projetado' && '· projetado'}
      </p>
      <p className="flex justify-between gap-3">
        <span>Receita</span>
        <span className="tabular-nums">{formatarMoeda(ponto.receitaPrevista)}</span>
      </p>
      <p className="flex justify-between gap-3">
        <span>Comprometido</span>
        <span className="tabular-nums">{formatarMoeda(ponto.comprometido)}</span>
      </p>
      {ponto.variavelEstimado > 0 && (
        <p className="flex justify-between gap-3">
          <span>Variável (média)</span>
          <span className="tabular-nums">
            {formatarMoeda(ponto.variavelEstimado)}
          </span>
        </p>
      )}
      <p className="text-muted-foreground flex justify-between gap-3 border-t pt-1">
        <span>Saldo acumulado</span>
        <span
          className={
            ponto.saldoAcumulado < 0
              ? 'text-status-risco tabular-nums'
              : 'tabular-nums'
          }
        >
          {formatarMoeda(ponto.saldoAcumulado)}
        </span>
      </p>
      {pessimista && pessimista.saldoAcumulado !== ponto.saldoAcumulado && (
        <p className="text-muted-foreground flex justify-between gap-3">
          <span>Se o mês for ruim</span>
          <span
            className={
              pessimista.saldoAcumulado < 0
                ? 'text-status-atencao tabular-nums'
                : 'tabular-nums'
            }
          >
            {formatarMoeda(pessimista.saldoAcumulado)}
          </span>
        </p>
      )}
    </div>
  )
}

/**
 * Aba "Planejamento" do Financeiro (resolução 10.43): tabela dos próximos
 * meses, gráfico de saldo acumulado e alerta de saldo negativo.
 *
 * O `mês corrente` sai de `projetarFluxoCaixa` com `fonte: 'real'` — só o que
 * já foi lançado. Os meses seguintes projetam a partir dos compromissos, das
 * parcelas e da média histórica do variável.
 */
export function SecaoProjecao({
  hoje,
  compromissos,
  parceladas,
  categorias,
  resumo,
  lancamentosDoMes,
  mesesResumo,
}: SecaoProjecaoProps) {
  const categoriasVariaveis = useMemo(
    () => categoriasElegiveisParaMediaVariavel(categorias, compromissos),
    [categorias, compromissos],
  )

  const janela = useMemo(
    () => mesesResumo.slice(-MESES_MEDIA_VARIAVEL),
    [mesesResumo],
  )

  const estimativaVariavel = useMemo(
    () => estimativaVariavelPorCategoria(resumo, categoriasVariaveis, janela),
    [resumo, categoriasVariaveis, janela],
  )

  const historicoInsuficiente =
    mesesComHistorico(resumo, janela) < MESES_MEDIA_VARIAVEL &&
    Object.keys(estimativaVariavel.media).length > 0

  const lancamentosTipados = lancamentosDoMes as {
    valor: number
    data: string
    categoria_natureza: 'receita' | 'despesa'
  }[]

  // Duas passagens pelo mesmo motor (10.47.6): a média sozinha, apresentada
  // como linha sólida, dá à projeção uma precisão que ela não tem — a
  // pergunta que importa não é "cabe na média?", é "cabe se o mês for ruim?".
  const projecao = useMemo(
    () =>
      projetarFluxoCaixa({
        hoje,
        meses: HORIZONTE_PROJECAO_PADRAO,
        compromissos,
        parcelas: parceladas,
        lancamentosRealizados: lancamentosTipados,
        mediaVariavelPorCategoria: estimativaVariavel.media,
      }),
    [hoje, compromissos, parceladas, lancamentosTipados, estimativaVariavel],
  )

  const projecaoPessimista = useMemo(
    () =>
      projetarFluxoCaixa({
        hoje,
        meses: HORIZONTE_PROJECAO_PADRAO,
        compromissos,
        parcelas: parceladas,
        lancamentosRealizados: lancamentosTipados,
        mediaVariavelPorCategoria: estimativaVariavel.pior,
      }),
    [hoje, compromissos, parceladas, lancamentosTipados, estimativaVariavel],
  )

  const mesComSaldoNegativo = projecao.find((p) => p.saldoAcumulado < 0)
  // Só relevante quando a média não já acusou o mesmo problema — "às vezes
  // aperta" é uma notícia diferente de "aperta de qualquer forma".
  const mesComSaldoNegativoPessimista = mesComSaldoNegativo
    ? undefined
    : projecaoPessimista.find((p) => p.saldoAcumulado < 0)

  const dadosGrafico: PontoGrafico[] = projecao.map((p, indice) => {
    const pessimista = projecaoPessimista[indice]?.saldoAcumulado ?? p.saldoAcumulado
    return {
      mes: rotuloMes(p.mes),
      media: p.saldoAcumulado,
      pessimista,
      faixaBase: Math.min(p.saldoAcumulado, pessimista),
      faixaAltura: Math.abs(p.saldoAcumulado - pessimista),
      fonte: p.fonte,
    }
  })

  return (
    <div className="space-y-4">
      {mesComSaldoNegativo && (
        <Card className="border-status-risco/40">
          <CardContent className="text-status-risco flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              No ritmo atual, o saldo acumulado fica negativo em{' '}
              <strong>{rotuloMes(mesComSaldoNegativo.mes)}</strong> (
              {formatarMoeda(mesComSaldoNegativo.saldoAcumulado)}).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Negativo só no pessimista, não na média (10.47.6): é uma notícia
          diferente — "depende do mês", não "vai faltar". */}
      {mesComSaldoNegativoPessimista && (
        <Card className="border-status-atencao/40">
          <CardContent className="text-status-atencao flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Na média o saldo se mantém positivo, mas depende do mês: se o
              variável vier como o pior mês recente,{' '}
              <strong>{rotuloMes(mesComSaldoNegativoPessimista.mes)}</strong>{' '}
              fica negativo.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo acumulado projetado</CardTitle>
          {historicoInsuficiente && (
            <p className="text-muted-foreground text-xs">
              Menos de {MESES_MEDIA_VARIAVEL} meses de histórico — o gasto
              variável estimado usa o que houver, com confiança menor.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={dadosGrafico} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="mes" tick={EIXO.tick} stroke={EIXO.stroke} />
              <YAxis
                tick={EIXO.tick}
                stroke={EIXO.stroke}
                width={64}
                tickFormatter={(valor: number) =>
                  valor >= 1000 || valor <= -1000
                    ? `${Math.round(valor / 1000)}k`
                    : String(valor)
                }
              />
              <Tooltip
                content={(props) => (
                  <ConteudoTooltip
                    {...props}
                    pontos={projecao}
                    pontosPessimistas={projecaoPessimista}
                  />
                )}
              />
              {/* Faixa entre média e pessimista (10.47.6): duas Area
                  empilhadas — a primeira é a base invisível (o menor dos
                  dois valores), a segunda é a distância entre eles, colorida.
                  É o idioma padrão do Recharts pra "faixa entre duas linhas",
                  que não existe como componente único. */}
              <Area
                type="monotone"
                dataKey="faixaBase"
                stackId="banda"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="faixaAltura"
                stackId="banda"
                stroke="none"
                fill="var(--chart-1)"
                fillOpacity={0.12}
                isAnimationActive={false}
              />
              {/* Uma linha só pra média: o trecho projetado ainda é a mesma
                  série, só visualmente diferenciado — duas <Line> criaria uma
                  descontinuidade falsa no ponto de corte. */}
              <Line
                type="monotone"
                dataKey="media"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={(props: { cx?: number; cy?: number; index?: number }) => {
                  const { cx, cy, index } = props
                  if (cx === undefined || cy === undefined || index === undefined)
                    return <g key={index} />
                  const ponto = dadosGrafico[index]
                  const projetado = ponto?.fonte === 'projetado'
                  return (
                    <circle
                      key={index}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={projetado ? 'var(--card)' : 'var(--chart-1)'}
                      stroke="var(--chart-1)"
                      strokeWidth={projetado ? 1.5 : 0}
                    />
                  )
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-muted-foreground mt-2 text-xs">
            A faixa sombreada mostra a diferença entre o gasto variável médio
            e o pior mês recente daquela categoria.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Próximos {HORIZONTE_PROJECAO_PADRAO} meses
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <div className="min-w-[36rem] space-y-1 p-4">
            <div className="text-muted-foreground grid grid-cols-6 gap-2 text-xs">
              <span>Mês</span>
              <span className="text-right">Receita</span>
              <span className="text-right">Comprometido</span>
              <span className="text-right">Variável</span>
              <span className="text-right">Saldo do mês</span>
              <span className="text-right">Acumulado</span>
            </div>
            {projecao.map((mes) => (
              <div
                key={mes.mes}
                className={
                  'grid grid-cols-6 gap-2 rounded-md px-1 py-1.5 text-sm ' +
                  (mes.fonte === 'projetado'
                    ? 'text-muted-foreground'
                    : 'bg-muted/40')
                }
              >
                <span>
                  {rotuloMes(mes.mes)}
                  {mes.fonte === 'projetado' && (
                    <span className="ml-1 text-[10px] italic">projetado</span>
                  )}
                </span>
                <span className="text-right tabular-nums">
                  {formatarMoeda(mes.receitaPrevista)}
                </span>
                <span className="text-right tabular-nums">
                  {formatarMoeda(mes.comprometido)}
                </span>
                <span className="text-right tabular-nums">
                  {formatarMoeda(mes.variavelEstimado)}
                </span>
                <span
                  className={
                    'text-right tabular-nums ' +
                    (mes.saldoDoMes < 0 ? 'text-status-risco' : '')
                  }
                >
                  {formatarMoeda(mes.saldoDoMes)}
                </span>
                <span
                  className={
                    'text-right font-medium tabular-nums ' +
                    (mes.saldoAcumulado < 0 ? 'text-status-risco' : '')
                  }
                >
                  {formatarMoeda(mes.saldoAcumulado)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
