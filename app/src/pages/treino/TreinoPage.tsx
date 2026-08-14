import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EstadoVazio } from '@/components/EstadoVazio'
import { SkeletonPagina } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BarraProgresso } from '@/components/BarraProgresso'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { deISO, inicioSemana, paraISO } from '@/lib/datas'
import { addDays } from 'date-fns'
import {
  frequenciaSemana,
  sessoesRealizadas,
  volumeGrupoMuscular,
} from '@/features/treino/calculos'
import {
  useExcluirExercicio,
  useExcluirTreino,
  useExcluirTreinoAgendado,
  useExecucoes,
  useExercicios,
  usePersonalRecords,
  useLesoes,
  useRegistroCorporal,
  usePulados,
  useSeries,
  useTreinos,
  useTreinosAgendados,
} from '@/features/treino/hooks'
import { DialogAgendarTreino } from '@/features/treino/componentes/DialogAgendarTreino'
import { DialogBiblioteca } from '@/features/treino/componentes/DialogBiblioteca'
import { DialogExecucao } from '@/features/treino/componentes/DialogExecucao'
import { DialogExercicio } from '@/features/treino/componentes/DialogExercicio'
import { DialogTreino } from '@/features/treino/componentes/DialogTreino'
import { SecaoCorporal } from '@/features/treino/componentes/SecaoCorporal'
import { SecaoLesoes } from '@/features/treino/componentes/SecaoLesoes'
import { SecaoPRs } from '@/features/treino/componentes/SecaoPRs'
import { SecaoSessoes } from '@/features/treino/componentes/SecaoSessoes'

export default function TreinoPage() {
  const hoje = useMemo(() => new Date(), [])
  const hojeISO = paraISO(hoje)

  const semana = useMemo(() => {
    const inicio = inicioSemana(hoje)
    return { de: paraISO(inicio), ate: paraISO(addDays(inicio, 6)) }
  }, [hoje])

  const treinos = useTreinos()
  const exercicios = useExercicios()
  const agendados = useTreinosAgendados(semana.de, semana.ate)
  const execucoesSemana = useExecucoes(semana.de, semana.ate)
  const seriesSemana = useSeries(semana.de, semana.ate)
  const puladosSemana = usePulados(semana.de, semana.ate)
  const prs = usePersonalRecords()
  const corporal = useRegistroCorporal()
  const lesoes = useLesoes()

  const excluirTreino = useExcluirTreino()
  const excluirExercicio = useExcluirExercicio()
  const excluirAgendado = useExcluirTreinoAgendado()

  const listaTreinos = useMemo(() => treinos.data ?? [], [treinos.data])
  const listaExercicios = useMemo(
    () => exercicios.data ?? [],
    [exercicios.data],
  )
  const listaAgendados = useMemo(() => agendados.data ?? [], [agendados.data])

  const nomePorTreino = useMemo(
    () => new Map(listaTreinos.map((treino) => [treino.id, treino.nome])),
    [listaTreinos],
  )

  const treinoPorId = useMemo(
    () => new Map(listaTreinos.map((treino) => [treino.id, treino])),
    [listaTreinos],
  )

  /** Treinos agendados para hoje (chat 2026-08-14: data própria, sem regra semanal). */
  const treinosDeHoje = useMemo(() => {
    return listaAgendados.flatMap((agendado) => {
      if (agendado.data !== hojeISO) return []
      const treino = treinoPorId.get(agendado.treino_id)
      return treino
        ? [
            {
              id: agendado.id,
              treino,
              horario: agendado.horario_inicio,
              horarioFim: agendado.horario_fim,
            },
          ]
        : []
    })
  }, [listaAgendados, hojeISO, treinoPorId])

  /**
   * Frequência da semana: execuções reais contra treinos agendados
   * (resolução 10.17, adaptada ao chat 2026-08-14).
   */
  const frequencia = useMemo(() => {
    // Só sessões finalizadas contam: a linha nasce na primeira série gravada, e
    // um treino abandonado no meio não é um treino feito (resolução 10.21)
    const realizados = (execucoesSemana.data ?? []).filter(
      (execucao) => execucao.finalizado_em !== null,
    ).length
    return frequenciaSemana(realizados, listaAgendados.length)
  }, [listaAgendados, execucoesSemana.data])

  const volume = useMemo(
    () => volumeGrupoMuscular(seriesSemana.data ?? []),
    [seriesSemana.data],
  )

  /** Sessões da semana, agrupadas a partir das séries (resolução 10.21). */
  const sessoes = useMemo(
    () =>
      sessoesRealizadas(
        seriesSemana.data ?? [],
        prs.data ?? [],
        puladosSemana.data ?? [],
      ),
    [seriesSemana.data, prs.data, puladosSemana.data],
  )

  if (treinos.isPending) {
    return (
      <>
        <PageHeader titulo="Treino" pilar="treino" icone={Dumbbell} />
        <SkeletonPagina variante="lista" />
      </>
    )
  }

  if (treinos.isError) {
    return (
      <>
        <PageHeader titulo="Treino" pilar="treino" icone={Dumbbell} />
        <Card className="border-status-risco/40">
          <CardContent className="text-status-risco text-sm">
            Erro ao carregar: {treinos.error.message}
          </CardContent>
        </Card>
      </>
    )
  }

  const gruposComVolume = Object.entries(volume).sort((a, b) => b[1] - a[1])

  return (
    <>
      <PageHeader
        titulo="Treino"
        descricao="Execuções, progressão de carga e recordes pessoais."
        pilar="treino"
        icone={Dumbbell}
        acoes={
          <>
            <DialogBiblioteca />
            <DialogAgendarTreino treinos={listaTreinos} />
            <DialogTreino />
          </>
        }
      />

      {listaTreinos.length === 0 ? (
        <EstadoVazio
          icone={Dumbbell}
          classeCor="text-treino"
          classeFundo="bg-treino-soft"
          titulo="Monte o primeiro treino"
          descricao="Crie o treino, adicione os exercícios e agende-o numa data — é o agendamento que define o treino de hoje e a frequência da semana."
          acao={<DialogTreino />}
        />
      ) : (
        <div className="surgir-grupo space-y-6">
          {/* Treino de hoje (plano 4.3, com data própria desde o chat 2026-08-14) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Treino de hoje</CardTitle>
              <CardDescription>Agendado nesta data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {treinosDeHoje.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum treino agendado para hoje.
                </p>
              ) : (
                treinosDeHoje.map((agendado) => {
                  const { treino, horario } = agendado
                  const doTreino = listaExercicios.filter(
                    (item) => item.treino_id === treino.id,
                  )
                  return (
                    <div
                      key={agendado.id}
                      className="border-border flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <Dumbbell className="text-treino size-4" />
                          {treino.nome}
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {horario.slice(0, 5)}
                          </span>
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {doTreino.length === 0
                            ? 'Sem exercícios cadastrados'
                            : doTreino.map((item) => item.nome).join(' · ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <DialogExecucao
                          treino={treino}
                          exercicios={doTreino}
                          hoje={hoje}
                        />
                        {/*
                          Cancelar hoje é excluir a linha: sem regra semanal
                          por baixo, não há padrão para "voltar a seguir".
                        */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground size-8"
                          onClick={() => excluirAgendado.mutate(agendado.id)}
                          disabled={excluirAgendado.isPending}
                          title="Remover da agenda"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Frequência semanal (plano 4.3) */}
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Frequência da semana
                  </p>
                  <p className="metric-lg">
                    {frequencia.realizados}
                    <span className="text-muted-foreground text-base">
                      /{frequencia.previstos || '—'}
                    </span>
                  </p>
                </div>
                {frequencia.percentual !== null && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {Math.round(frequencia.percentual)}%
                  </span>
                )}
              </div>
              {frequencia.percentual === null ? (
                <p className="text-muted-foreground text-xs">
                  Agende treinos nesta semana para acompanhar a aderência.
                </p>
              ) : (
                <BarraProgresso
                  valor={frequencia.percentual}
                  classeCor="bg-treino"
                  rotulo="Frequência da semana"
                />
              )}
            </CardContent>
          </Card>

          <SecaoSessoes
            sessoes={sessoes}
            nomePorTreino={nomePorTreino}
            treinos={listaTreinos}
            exercicios={listaExercicios}
            hoje={hoje}
          />

          <SecaoPRs prs={prs.data ?? []} />

          {/* Volume por grupo muscular (plano 4.2) */}
          {gruposComVolume.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Volume da semana por grupo
                </CardTitle>
                <CardDescription>
                  Soma de repetições × carga de cada série.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-border divide-y">
                  {gruposComVolume.map(([grupo, total]) => (
                    <li
                      key={grupo}
                      className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0"
                    >
                      <span className="capitalize">{grupo}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {Math.round(total).toLocaleString('pt-BR')} kg
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Treinos e exercícios */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Treinos</h2>
            <div className="space-y-3">
              {listaTreinos.map((treino) => {
                const doTreino = listaExercicios.filter(
                  (item) => item.treino_id === treino.id,
                )
                return (
                  <Card key={treino.id}>
                    <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm">
                          {treino.nome}
                        </CardTitle>
                        {treino.tipo_nome && (
                          <CardDescription className="capitalize">
                            {treino.tipo_nome}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <DialogTreino treino={treino} />
                        <DialogExercicio
                          treinoId={treino.id}
                          treinoNome={treino.nome}
                        />
                        <DialogConfirmarExclusao
                          titulo={`Excluir ${treino.nome}`}
                          mensagem={`Todos os exercícios e configurações associados ao treino "${treino.nome}" serão removidos.`}
                          onConfirmar={async () => {
                            await excluirTreino.mutateAsync(treino.id)
                          }}
                          pendente={excluirTreino.isPending}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {doTreino.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Nenhum exercício. Use "Exercício" para adicionar.
                        </p>
                      ) : (
                        <ul className="divide-border divide-y">
                          {doTreino.map((exercicio) => (
                            <li
                              key={exercicio.id}
                              className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                            >
                              <div className="min-w-0">
                                <Link
                                  // Id do exercício BASE, não da linha do
                                  // treino: é o que a rota espera (10.18)
                                  to={`/treino/${exercicio.exercicio_base_id}`}
                                  className="block truncate text-sm hover:underline"
                                >
                                  {exercicio.nome}
                                </Link>
                                <p className="text-muted-foreground text-xs tabular-nums">
                                  {exercicio.series}×
                                  {exercicio.reps_alvo ?? '—'}
                                  {exercicio.carga_alvo !== null &&
                                    ` · ${exercicio.carga_alvo}kg`}
                                  {exercicio.grupo_muscular && (
                                    <span className="capitalize">
                                      {' '}
                                      · {exercicio.grupo_muscular}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1 sm:gap-0.5">
                                <DialogExercicio
                                  treinoId={treino.id}
                                  treinoNome={treino.nome}
                                  exercicio={exercicio}
                                />
                                <DialogConfirmarExclusao
                                  titulo={`Remover ${exercicio.nome}`}
                                  mensagem={`O exercício sai do treino ${treino.nome}. As séries já registradas em sessões passadas continuam no histórico.`}
                                  onConfirmar={() =>
                                    excluirExercicio.mutate(exercicio.id)
                                  }
                                  pendente={excluirExercicio.isPending}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/*
                       * Registrar não depende do fluxograma: dá para lançar um
                       * treino fora do previsto, ou a sessão de outro dia — a
                       * data é campo do formulário.
                       */}
                      {doTreino.length > 0 && (
                        <DialogExecucao
                          treino={treino}
                          exercicios={doTreino}
                          hoje={hoje}
                          rotulo="Registrar sessão"
                          variante="secondary"
                          larguraTotal
                        />
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agenda da semana</CardTitle>
              <CardDescription>
                Treinos marcados nesta semana — fonte única da frequência.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {listaAgendados.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum treino agendado. Use "Agendar" para marcar um.
                </p>
              ) : (
                <ul className="divide-border divide-y">
                  {listaAgendados.map((agendado) => (
                    <li
                      key={agendado.id}
                      className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {nomePorTreino.get(agendado.treino_id) ?? 'Treino'}
                        </p>
                        <p className="text-muted-foreground text-xs tabular-nums capitalize">
                          {deISO(agendado.data).toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit',
                          })}{' '}
                          · {agendado.horario_inicio.slice(0, 5)}–
                          {agendado.horario_fim.slice(0, 5)}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground size-8 shrink-0"
                        onClick={() => excluirAgendado.mutate(agendado.id)}
                        disabled={excluirAgendado.isPending}
                        title="Remover da agenda"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <SecaoCorporal registros={corporal.data ?? []} hoje={hoje} />
          <SecaoLesoes lesoes={lesoes.data ?? []} hoje={hoje} />
        </div>
      )}
    </>
  )
}
