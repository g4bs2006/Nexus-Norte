import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Minus, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { deISO } from '@/lib/datas'
import { SEMANAS_SINAL_ESTAGNACAO } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  progressaoCarga,
  sessoesPorData,
  sinalEstagnacao,
  umRmEstimado,
  type Progressao,
} from '@/features/treino/calculos'
import {
  useExercicios,
  usePersonalRecords,
  useSeries,
} from '@/features/treino/hooks'

const ROTULO_PROGRESSAO: Record<Progressao, string> = {
  subindo: 'Progredindo',
  estagnado: 'Estagnado',
  caindo: 'Caindo',
  indefinido: 'Sem histórico',
}

const ICONE_PROGRESSAO: Record<Progressao, typeof TrendingUp> = {
  subindo: TrendingUp,
  estagnado: Minus,
  caindo: TrendingDown,
  indefinido: Minus,
}

const CLASSE_PROGRESSAO: Record<Progressao, string> = {
  subindo: 'text-status-ok',
  estagnado: 'text-status-atencao',
  caindo: 'text-status-risco',
  indefinido: 'text-muted-foreground',
}

export default function ExercicioDetalhePage() {
  const { exercicioId } = useParams<{ exercicioId: string }>()

  const exercicios = useExercicios()
  // Sem filtro de data: o histórico completo é o ponto desta página
  const series = useSeries()
  const prs = usePersonalRecords()

  const exercicio = exercicios.data?.find((item) => item.id === exercicioId)

  const doExercicio = useMemo(
    () =>
      (series.data ?? []).filter((serie) => serie.exercicio_id === exercicioId),
    [series.data, exercicioId],
  )

  const sessoes = useMemo(() => sessoesPorData(doExercicio), [doExercicio])
  const progressao = useMemo(() => progressaoCarga(sessoes), [sessoes])
  const estagnado = useMemo(() => sinalEstagnacao(sessoes), [sessoes])

  const dadosGrafico = useMemo(
    () =>
      sessoes.map((sessao) => ({
        dia: format(deISO(sessao.data), 'dd/MM'),
        umRm: Number(sessao.melhor1rm.toFixed(1)),
      })),
    [sessoes],
  )

  const prsDoExercicio = useMemo(
    () =>
      (prs.data ?? []).filter((pr) => pr.exercicio_id === exercicioId),
    [prs.data, exercicioId],
  )

  if (exercicios.isPending) {
    return (
      <>
        <PageHeader titulo="Exercício" />
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </>
    )
  }

  if (!exercicio) {
    return (
      <>
        <PageHeader
          titulo="Exercício não encontrado"
          descricao="Este exercício não existe ou foi excluído."
        />
        <Button asChild variant="secondary" size="sm">
          <Link to="/treino">
            <ArrowLeft className="size-4" />
            Voltar para Treino
          </Link>
        </Button>
      </>
    )
  }

  const Icone = ICONE_PROGRESSAO[progressao]
  const melhorPr = prsDoExercicio.reduce<number | null>(
    (melhor, pr) =>
      melhor === null || pr.um_rm_estimado > melhor ? pr.um_rm_estimado : melhor,
    null,
  )

  return (
    <>
      <PageHeader
        titulo={exercicio.nome}
        descricao={
          [
            exercicio.grupo_muscular,
            `${exercicio.series}×${exercicio.reps_alvo ?? '—'}`,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        acoes={
          <Button asChild variant="ghost" size="sm">
            <Link to="/treino">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Progressão</p>
              <Badge
                variant="secondary"
                className={cn('gap-1.5 font-normal', CLASSE_PROGRESSAO[progressao])}
              >
                <Icone className="size-3.5" />
                {ROTULO_PROGRESSAO[progressao]}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Melhor 1RM</p>
              <p className="text-2xl tabular-nums">
                {melhorPr === null ? '—' : `${melhorPr.toFixed(1)}kg`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Sessões registradas</p>
              <p className="text-2xl tabular-nums">{sessoes.length}</p>
            </div>
          </CardContent>
        </Card>

        {estagnado && (
          <Card className="border-status-atencao/40">
            <CardContent className="flex items-start gap-2.5 text-sm">
              <TriangleAlert className="text-status-atencao mt-0.5 size-4 shrink-0" />
              <p>
                Sem novo recorde nas últimas {SEMANAS_SINAL_ESTAGNACAO} sessões.
                Vale considerar ajuste de carga, volume ou variação do exercício.
              </p>
            </CardContent>
          </Card>
        )}

        {dadosGrafico.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progressão de carga</CardTitle>
              <CardDescription>
                Melhor 1RM estimado de cada sessão.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dadosGrafico}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                    width={48}
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <Tooltip
                    formatter={(valor) => `${valor} kg`}
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      fontSize: 12,
                      color: 'var(--popover-foreground)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="umRm"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-medium">Séries registradas</h2>
          {doExercicio.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="text-muted-foreground text-sm">
                Nenhuma série registrada para este exercício.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-border divide-y">
                  {[...doExercicio]
                    .sort((a, b) => b.data.localeCompare(a.data))
                    .slice(0, 30)
                    .map((serie) => (
                      <li
                        key={serie.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <p className="text-sm tabular-nums">
                          {format(deISO(serie.data), 'dd/MM/yyyy')} ·{' '}
                          {serie.carga_real}kg × {serie.reps_reais}
                          {serie.rpe !== null && (
                            <span className="text-muted-foreground">
                              {' '}
                              · RPE {serie.rpe}
                            </span>
                          )}
                        </p>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          1RM{' '}
                          {umRmEstimado(serie.carga_real, serie.reps_reais).toFixed(
                            1,
                          )}
                        </span>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </>
  )
}
