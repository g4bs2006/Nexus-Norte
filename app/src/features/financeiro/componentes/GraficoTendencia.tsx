import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
import { ESTILO_TOOLTIP, pontoFinal } from '@/components/grafico'
import { formatarMoeda, rotuloMes } from '@/lib/datas'
import { metaEfetiva } from '../calculos'
import type { ResumoMensal } from '../api'
import type { Categoria } from '../types'

const TODAS = 'todas'

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

  const dados = useMemo(() => {
    const relevantes = resumo.filter((linha) =>
      selecionada === TODAS
        ? idsDespesa.has(linha.categoria_id)
        : linha.categoria_id === selecionada,
    )

    const porMes = new Map<string, number>()
    for (const linha of relevantes) {
      porMes.set(linha.mes, (porMes.get(linha.mes) ?? 0) + linha.total)
    }

    return meses.map((mes) => ({
      mes: rotuloMes(mes),
      gasto: porMes.get(mes) ?? 0,
    }))
  }, [resumo, meses, selecionada, idsDespesa])

  // Meta de referência: para a visão "todas", a soma das metas; para uma
  // categoria, a sua meta. Resolvida com a receita do mês CORRENTE — metas
  // percentuais em meses passados podem ter sido outras.
  const meta = useMemo(() => {
    const alvo =
      selecionada === TODAS
        ? despesas
        : despesas.filter((c) => c.id === selecionada)
    const soma = alvo.reduce((t, c) => t + (metaEfetiva(c, receitaDoMes) ?? 0), 0)
    return soma > 0 ? soma : null
  }, [despesas, selecionada, receitaDoMes])

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Tendência de gasto</CardTitle>
          <CardDescription>Últimos 6 meses, comparado à meta.</CardDescription>
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
          <AreaChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            {/* Área de preenchimento: dá massa à linha sem competir com ela */}
            <defs>
              <linearGradient id="areaTendencia" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              stroke="var(--border)"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              stroke="var(--border)"
              width={64}
              tickFormatter={(valor: number) =>
                valor >= 1000 ? `${Math.round(valor / 1000)}k` : String(valor)
              }
            />
            <Tooltip
              formatter={(valor) => formatarMoeda(Number(valor))}
              contentStyle={ESTILO_TOOLTIP}
            />
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
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#areaTendencia)"
              // Ênfase no ponto final: é o mês corrente, o único que ainda dá
              // para mudar
              dot={pontoFinal(dados.length, 'var(--chart-1)')}
              activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
