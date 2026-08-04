import { useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarraProgresso } from '@/components/BarraProgresso'
import { deISO, paraISO } from '@/lib/datas'
import { useCriarSessao, useExcluirSessao } from '../hooks'
import { frequenciaEstudoSemana } from '../calculos'
import type { SessaoEstudo } from '../types'

const DIAS_GRAFICO = 14

interface AbaSessoesProps {
  materiaId: string
  sessoes: readonly SessaoEstudo[]
  hoje: Date
}

export function AbaSessoes({ materiaId, sessoes, hoje }: AbaSessoesProps) {
  const criar = useCriarSessao()
  const excluir = useExcluirSessao()

  const [data, setData] = useState(paraISO(hoje))
  const [duracao, setDuracao] = useState('')
  const [meta, setMeta] = useState('')

  const frequencia = useMemo(() => {
    const limite = paraISO(subDays(hoje, 6))
    const daSemana = sessoes.filter((sessao) => sessao.data >= limite)
    return frequenciaEstudoSemana(daSemana, 7)
  }, [sessoes, hoje])

  // Minutos por dia nos últimos 14 dias, incluindo dias sem estudo
  const dadosGrafico = useMemo(() => {
    const porData = new Map<string, number>()
    for (const sessao of sessoes) {
      porData.set(
        sessao.data,
        (porData.get(sessao.data) ?? 0) + sessao.duracao_minutos,
      )
    }

    const dias: { dia: string; minutos: number }[] = []
    for (let i = DIAS_GRAFICO - 1; i >= 0; i -= 1) {
      const dia = subDays(hoje, i)
      const iso = paraISO(dia)
      dias.push({ dia: format(dia, 'dd/MM'), minutos: porData.get(iso) ?? 0 })
    }
    return dias
  }, [sessoes, hoje])

  async function adicionar() {
    const minutos = Number(duracao)
    if (!Number.isInteger(minutos) || minutos <= 0) return
    const metaNumero = Number(meta)
    await criar.mutateAsync({
      materia_id: materiaId,
      data,
      duracao_minutos: minutos,
      meta_diaria_minutos:
        Number.isInteger(metaNumero) && metaNumero > 0 ? metaNumero : null,
    })
    setDuracao('')
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-muted-foreground text-xs">
                Estudado nos últimos 7 dias
              </p>
              <p className="metric-lg">
                {Math.floor(frequencia.minutosEstudados / 60)}h
                {String(frequencia.minutosEstudados % 60).padStart(2, '0')}
              </p>
            </div>
            {frequencia.percentual !== null && (
              <p className="text-muted-foreground text-xs tabular-nums">
                {Math.round(frequencia.percentual)}% da meta
              </p>
            )}
          </div>
          {frequencia.percentual === null ? (
            <p className="text-muted-foreground text-xs">
              Defina uma meta diária ao registrar a sessão para acompanhar o
              percentual.
            </p>
          ) : (
            <BarraProgresso
              valor={frequencia.percentual}
              classeCor="bg-estudos"
              rotulo="Meta de estudo da semana"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="sessao-data">
              Data
            </Label>
            <Input
              id="sessao-data"
              type="date"
              className="h-8"
              value={data}
              onChange={(evento) => setData(evento.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="sessao-duracao">
              Minutos
            </Label>
            <Input
              id="sessao-duracao"
              type="number"
              min="1"
              step="5"
              className="h-8 w-24 tabular-nums"
              placeholder="60"
              value={duracao}
              onChange={(evento) => setDuracao(evento.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="sessao-meta">
              Meta diária
            </Label>
            <Input
              id="sessao-meta"
              type="number"
              min="1"
              step="5"
              className="h-8 w-24 tabular-nums"
              placeholder="—"
              value={meta}
              onChange={(evento) => setMeta(evento.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => void adicionar()}
            disabled={criar.isPending}
          >
            <Plus className="size-4" />
            Registrar
          </Button>
        </CardContent>
      </Card>

      {sessoes.length > 0 && (
        <Card>
          <CardContent>
            <p className="text-muted-foreground mb-3 text-xs">
              Minutos por dia — últimos {DIAS_GRAFICO} dias
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  stroke="var(--border)"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  stroke="var(--border)"
                  width={32}
                />
                <Tooltip
                  formatter={(valor) => `${valor} min`}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                    color: 'var(--popover-foreground)',
                  }}
                />
                <Bar dataKey="minutos" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {sessoes.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {sessoes.slice(0, 20).map((sessao) => (
                <li
                  key={sessao.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div>
                    <p className="text-sm tabular-nums">
                      {format(deISO(sessao.data), 'dd/MM/yyyy')} ·{' '}
                      {sessao.duracao_minutos} min
                    </p>
                    {sessao.meta_diaria_minutos !== null && (
                      <p className="text-muted-foreground text-xs">
                        meta do dia: {sessao.meta_diaria_minutos} min
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-status-risco size-7 shrink-0"
                    aria-label="Remover sessão"
                    onClick={() => excluir.mutate(sessao.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
