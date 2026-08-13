import { useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import { NotebookPen, Pencil, Plus } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
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
import { ESTILO_TOOLTIP } from '@/components/grafico'
import { deISO, paraISO } from '@/lib/datas'
import { useCriarSessao, useAtualizarSessao, useExcluirSessao } from '../hooks'
import { frequenciaEstudoSemana } from '../calculos'
import { DialogNota } from './DialogNota'
import type { NotaEstudo, SessaoEstudo } from '../types'

const DIAS_GRAFICO = 14

interface AbaSessoesProps {
  materiaId: string
  sessoes: readonly SessaoEstudo[]
  hoje: Date
  /**
   * Primeira nota de cada sessão, quando existe.
   *
   * O modelo permite várias notas por sessão, mas a linha da sessão oferece
   * uma: com nota, o botão edita a que está lá; sem nota, cria. Um botão que
   * empilha notas silenciosamente numa linha de lista seria fácil de acionar
   * por engano e difícil de perceber.
   */
  notaPorSessao?: ReadonlyMap<string, NotaEstudo>
}

export function AbaSessoes({
  materiaId,
  sessoes,
  hoje,
  notaPorSessao,
}: AbaSessoesProps) {
  const criar = useCriarSessao()
  const atualizar = useAtualizarSessao()
  const excluir = useExcluirSessao()

  const [data, setData] = useState(paraISO(hoje))
  const [hora, setHora] = useState('')
  const [duracao, setDuracao] = useState('')
  const [meta, setMeta] = useState('')
  const [idEditando, setIdEditando] = useState<string | null>(null)

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

  function iniciarEdicao(sessao: SessaoEstudo) {
    setIdEditando(sessao.id)
    setData(sessao.data)
    setHora(sessao.hora_inicio ? sessao.hora_inicio.slice(0, 5) : '')
    setDuracao(String(sessao.duracao_minutos))
    setMeta(
      sessao.meta_diaria_minutos ? String(sessao.meta_diaria_minutos) : '',
    )
  }

  function cancelarEdicao() {
    setIdEditando(null)
    setData(paraISO(hoje))
    setHora('')
    setDuracao('')
    setMeta('')
  }

  async function salvar() {
    const minutos = Number(duracao)
    if (!Number.isInteger(minutos) || minutos <= 0) return
    const metaNumero = Number(meta)
    const dados = {
      data,
      // Vazio grava nulo: sessão sem hora vira evento de dia inteiro no
      // calendário, e é melhor que uma hora inventada (resolução 10.24).
      hora_inicio: hora === '' ? null : `${hora}:00`,
      duracao_minutos: minutos,
      meta_diaria_minutos:
        Number.isInteger(metaNumero) && metaNumero > 0 ? metaNumero : null,
    }

    if (idEditando) {
      await atualizar.mutateAsync({ id: idEditando, dados })
      cancelarEdicao()
    } else {
      await criar.mutateAsync({
        materia_id: materiaId,
        ...dados,
      })
      setDuracao('')
      setHora('')
    }
  }

  const pendente = criar.isPending || atualizar.isPending

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
            <Label className="text-xs" htmlFor="sessao-hora">
              Hora
            </Label>
            <Input
              id="sessao-hora"
              type="time"
              className="h-8 tabular-nums"
              value={hora}
              onChange={(evento) => setHora(evento.target.value)}
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
          <Button size="sm" onClick={() => void salvar()} disabled={pendente}>
            {idEditando ? (
              <Pencil className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {idEditando ? 'Salvar' : 'Registrar'}
          </Button>
          {idEditando && (
            <Button size="sm" variant="ghost" onClick={cancelarEdicao}>
              Cancelar
            </Button>
          )}
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
                  contentStyle={ESTILO_TOOLTIP}
                />
                <Bar
                  dataKey="minutos"
                  fill="var(--chart-2)"
                  radius={[3, 3, 0, 0]}
                />
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
                  <div className="min-w-0">
                    <p className="text-sm tabular-nums">
                      {format(deISO(sessao.data), 'dd/MM/yyyy')}
                      {sessao.hora_inicio && (
                        <> · {sessao.hora_inicio.slice(0, 5)}</>
                      )}{' '}
                      · {sessao.duracao_minutos} min
                    </p>
                    {sessao.meta_diaria_minutos !== null && (
                      <p className="text-muted-foreground text-xs">
                        meta do dia: {sessao.meta_diaria_minutos} min
                      </p>
                    )}
                    {notaPorSessao?.get(sessao.id) && (
                      <p className="text-muted-foreground truncate text-xs">
                        nota: {notaPorSessao.get(sessao.id)?.titulo}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {/*
                      Anotar o que foi estudado na sessão sem sair da aba. Com
                      nota, edita a existente; sem nota, cria já vinculada.
                    */}
                    <DialogNota
                      materiaId={materiaId}
                      {...(notaPorSessao?.get(sessao.id)
                        ? { nota: notaPorSessao.get(sessao.id) as NotaEstudo }
                        : {
                            sessaoId: sessao.id,
                            tituloInicial: `Sessão de ${format(deISO(sessao.data), 'dd/MM')}`,
                          })}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground size-11 shrink-0 sm:size-7"
                          aria-label={
                            notaPorSessao?.get(sessao.id)
                              ? 'Editar nota da sessão'
                              : 'Anotar esta sessão'
                          }
                        >
                          <NotebookPen className="size-3.5" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-11 shrink-0 sm:size-7"
                      aria-label="Editar sessão"
                      onClick={() => iniciarEdicao(sessao)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <DialogConfirmarExclusao
                      titulo="Remover sessão de estudo"
                      mensagem={`Os ${sessao.duracao_minutos} min de ${format(deISO(sessao.data), 'dd/MM/yyyy')} saem do total de horas da matéria e do gráfico.`}
                      onConfirmar={() => excluir.mutate(sessao.id)}
                      pendente={excluir.isPending}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
