import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
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
import { mediaVariavelPorCategoria, projetarFluxoCaixa } from '../projecao'
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
  saldoAcumulado: number
  fonte: ProjecaoMensal['fonte']
}

interface ConteudoTooltipProps extends TooltipContentProps {
  pontos: readonly ProjecaoMensal[]
}

function ConteudoTooltip({ active, payload, label, pontos }: ConteudoTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const rotulo = String(label)
  const indice = payload[0]?.payload
    ? (payload[0].payload as PontoGrafico)
    : undefined
  const ponto = pontos.find((p) => rotuloMes(p.mes) === indice?.mes)
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
          <span>Variável (estimado)</span>
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
    () =>
      new Set(
        categorias
          .filter((c) => c.natureza === 'despesa' && c.tipo === 'variavel')
          .map((c) => c.id),
      ),
    [categorias],
  )

  const mediaVariavel = useMemo(() => {
    const janela = mesesResumo.slice(-MESES_MEDIA_VARIAVEL)
    return mediaVariavelPorCategoria(resumo, categoriasVariaveis, janela)
  }, [resumo, categoriasVariaveis, mesesResumo])

  const historicoInsuficiente =
    mesesResumo.length < MESES_MEDIA_VARIAVEL &&
    Object.keys(mediaVariavel).length > 0

  const projecao = useMemo(
    () =>
      projetarFluxoCaixa({
        hoje,
        meses: HORIZONTE_PROJECAO_PADRAO,
        compromissos,
        parcelas: parceladas,
        lancamentosRealizados: lancamentosDoMes as {
          valor: number
          data: string
          categoria_natureza: 'receita' | 'despesa'
        }[],
        mediaVariavelPorCategoria: mediaVariavel,
      }),
    [hoje, compromissos, parceladas, lancamentosDoMes, mediaVariavel],
  )

  const mesComSaldoNegativo = projecao.find((p) => p.saldoAcumulado < 0)

  const dadosGrafico: PontoGrafico[] = projecao.map((p) => ({
    mes: rotuloMes(p.mes),
    saldoAcumulado: p.saldoAcumulado,
    fonte: p.fonte,
  }))

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
            <LineChart data={dadosGrafico} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
              <Tooltip content={(props) => <ConteudoTooltip {...props} pontos={projecao} />} />
              {/* Uma linha só: o trecho projetado ainda é a mesma série, só
                  visualmente diferenciado — duas <Line> criaria uma
                  descontinuidade falsa no ponto de corte. */}
              <Line
                type="monotone"
                dataKey="saldoAcumulado"
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
            </LineChart>
          </ResponsiveContainer>
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
