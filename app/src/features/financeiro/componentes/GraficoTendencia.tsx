import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EIXO, ESTILO_TOOLTIP, pontoFinal } from '@/components/grafico'
import { formatarMoeda, rotuloMes } from '@/lib/datas'
import { metaEfetiva, tendenciaMensal } from '../calculos'
import type { ResumoMensal } from '../api'
import type { Categoria } from '../types'

const TODAS = 'todas'

interface PontoGrafico {
  mes: string
  gasto: number
  receita: number
  saldo: number
}

// Sem generics explícitos: <Tooltip> não é genérico na sua assinatura JSX
// (usa os defaults ValueType/NameType do recharts internamente), então o
// `props` que a função de `content` recebe também vem nesses defaults —
// narrowing para <number, string> aqui só criava incompatibilidade de tipo
// entre o que o Tooltip passa e o que este componente declarava aceitar.
interface ConteudoTooltipProps extends TooltipContentProps {
  mostrarReceita: boolean
  rotuloGasto: string
}

/**
 * Tooltip customizado: o saldo não é uma série desenhada no gráfico (a área
 * de receita já mostra a diferença visualmente), mas ainda é útil como
 * número exato — ler no dado do ponto em vez de recalcular no componente.
 */
function ConteudoTooltip({
  active,
  payload,
  label,
  mostrarReceita,
  rotuloGasto,
}: ConteudoTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const ponto = payload[0]?.payload as PontoGrafico | undefined
  if (!ponto) return null

  return (
    <div
      style={ESTILO_TOOLTIP}
      className="min-w-[9rem] space-y-1 px-2.5 py-1.5"
    >
      <p className="font-medium">{label}</p>
      <p className="flex justify-between gap-3">
        <span style={{ color: 'var(--chart-1)' }}>{rotuloGasto}</span>
        <span className="tabular-nums">{formatarMoeda(ponto.gasto)}</span>
      </p>
      {mostrarReceita && (
        <>
          <p className="flex justify-between gap-3">
            <span style={{ color: 'var(--chart-2)' }}>Receita</span>
            <span className="tabular-nums">
              {formatarMoeda(ponto.receita)}
            </span>
          </p>
          <p className="text-muted-foreground flex justify-between gap-3 border-t pt-1">
            <span>Saldo</span>
            <span
              className={
                ponto.saldo < 0 ? 'text-status-risco tabular-nums' : 'tabular-nums'
              }
            >
              {formatarMoeda(ponto.saldo)}
            </span>
          </p>
        </>
      )}
    </div>
  )
}

interface GraficoTendenciaProps {
  meses: readonly string[]
  resumo: readonly ResumoMensal[]
  categorias: readonly Categoria[]
  receitaDoMes: number
}

/** Tendência de gasto x meta nos últimos 6 meses, com seletor de categoria (plano 2.3). */
export function GraficoTendencia({
  meses,
  resumo,
  categorias,
  receitaDoMes,
}: GraficoTendenciaProps) {
  const [selecionada, setSelecionada] = useState<string>(TODAS)

  const despesas = useMemo(
    () => categorias.filter((c) => c.natureza === 'despesa'),
    [categorias],
  )

  const idsDespesa = useMemo(
    () => new Set(despesas.map((c) => c.id)),
    [despesas],
  )

  const idsReceita = useMemo(
    () =>
      new Set(
        categorias.filter((c) => c.natureza === 'receita').map((c) => c.id),
      ),
    [categorias],
  )

  // A série de receita só aparece na visão agregada ("todas as despesas"):
  // comparar o gasto de UMA categoria com a renda inteira nesse mesmo
  // traçado confundiria mais do que ajudaria — a visão de categoria única
  // continua só gasto x meta, como antes.
  const mostrarReceita = selecionada === TODAS

  const dados = useMemo(() => {
    const idsGasto =
      selecionada === TODAS ? idsDespesa : new Set([selecionada])
    return tendenciaMensal(resumo, meses, idsGasto, idsReceita).map(
      (ponto) => ({ ...ponto, mes: rotuloMes(ponto.mes) }),
    )
  }, [resumo, meses, selecionada, idsDespesa, idsReceita])

  // Meta de referência: para a visão "todas", a soma das metas; para uma
  // categoria, a sua meta. Resolvida com a receita do mês CORRENTE — metas
  // percentuais em meses passados podem ter sido outras.
  const meta = useMemo(() => {
    const alvo =
      selecionada === TODAS
        ? despesas
        : despesas.filter((c) => c.id === selecionada)
    const soma = alvo.reduce(
      (t, c) => t + (metaEfetiva(c, receitaDoMes) ?? 0),
      0,
    )
    return soma > 0 ? soma : null
  }, [despesas, selecionada, receitaDoMes])

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">
            {mostrarReceita ? 'Tendência de gasto e receita' : 'Tendência de gasto'}
          </CardTitle>
          <CardDescription>
            {mostrarReceita
              ? 'Últimos 6 meses — gasto, receita e meta.'
              : 'Últimos 6 meses, comparado à meta.'}
          </CardDescription>
        </div>
        <Select value={selecionada} onValueChange={setSelecionada}>
          <SelectTrigger className="w-[11rem] shrink-0" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as despesas</SelectItem>
            {despesas.map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={dados}
            margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          >
            {/* Área de preenchimento: dá massa à linha sem competir com ela */}
            <defs>
              <linearGradient id="areaTendencia" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.22}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="areaReceita" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis dataKey="mes" tick={EIXO.tick} stroke={EIXO.stroke} />
            <YAxis
              tick={EIXO.tick}
              stroke={EIXO.stroke}
              width={64}
              tickFormatter={(valor: number) =>
                valor >= 1000 ? `${Math.round(valor / 1000)}k` : String(valor)
              }
            />
            <Tooltip
              content={(props) => (
                <ConteudoTooltip
                  {...props}
                  mostrarReceita={mostrarReceita}
                  rotuloGasto={selecionada === TODAS ? 'Gasto total' : 'Gasto'}
                />
              )}
            />
            {mostrarReceita && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {meta !== null && (
              <ReferenceLine
                y={meta}
                stroke="var(--status-atencao)"
                strokeDasharray="4 4"
                label={{
                  value: 'meta',
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: 'var(--muted-foreground)',
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="gasto"
              name={selecionada === TODAS ? 'Gasto total' : 'Gasto'}
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#areaTendencia)"
              // Ênfase no ponto final: é o mês corrente, o único que ainda dá
              // para mudar
              dot={pontoFinal(dados.length, 'var(--chart-1)')}
              activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
            />
            {mostrarReceita && (
              <Area
                type="monotone"
                dataKey="receita"
                name="Receita"
                stroke="var(--chart-2)"
                strokeWidth={2}
                fill="url(#areaReceita)"
                dot={pontoFinal(dados.length, 'var(--chart-2)')}
                activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
