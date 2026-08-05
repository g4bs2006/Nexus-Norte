import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EstadoVazio } from '@/components/EstadoVazio'
import { SkeletonPagina } from '@/components/Skeletons'
import {
  GradeFluxograma,
  type ItemFluxograma,
} from '@/components/GradeFluxograma'
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
import { inicioSemana, paraISO } from '@/lib/datas'
import { expandirRecorrencia } from '@/lib/recorrencia'
import { addDays } from 'date-fns'
import {
  frequenciaSemana,
  volumeGrupoMuscular,
} from '@/features/treino/calculos'
import {
  useExcluirExercicio,
  useExcluirFluxogramaTreino,
  useExcluirTreino,
  useExecucoes,
  useExercicios,
  useFluxogramaTreino,
  usePersonalRecords,
  useLesoes,
  useRegistroCorporal,
  useSeries,
  useTreinos,
} from '@/features/treino/hooks'
import { DialogBiblioteca } from '@/features/treino/componentes/DialogBiblioteca'
import { DialogExecucao } from '@/features/treino/componentes/DialogExecucao'
import { DialogExercicio } from '@/features/treino/componentes/DialogExercicio'
import { DialogFluxogramaTreino } from '@/features/treino/componentes/DialogFluxogramaTreino'
import { DialogTreino } from '@/features/treino/componentes/DialogTreino'
import { SecaoCorporal } from '@/features/treino/componentes/SecaoCorporal'
import { SecaoLesoes } from '@/features/treino/componentes/SecaoLesoes'
import { SecaoPRs } from '@/features/treino/componentes/SecaoPRs'

export default function TreinoPage() {
  const hoje = useMemo(() => new Date(), [])
  const hojeISO = paraISO(hoje)

  const semana = useMemo(() => {
    const inicio = inicioSemana(hoje)
    return { de: paraISO(inicio), ate: paraISO(addDays(inicio, 6)) }
  }, [hoje])

  const treinos = useTreinos()
  const exercicios = useExercicios()
  const fluxograma = useFluxogramaTreino()
  const execucoesSemana = useExecucoes(semana.de, semana.ate)
  const seriesSemana = useSeries(semana.de, semana.ate)
  const prs = usePersonalRecords()
  const corporal = useRegistroCorporal()
  const lesoes = useLesoes()

  const excluirTreino = useExcluirTreino()
  const excluirExercicio = useExcluirExercicio()
  const excluirFluxograma = useExcluirFluxogramaTreino()

  const listaTreinos = useMemo(() => treinos.data ?? [], [treinos.data])
  const listaExercicios = useMemo(
    () => exercicios.data ?? [],
    [exercicios.data],
  )
  const listaFluxograma = useMemo(
    () => fluxograma.data ?? [],
    [fluxograma.data],
  )

  const nomePorTreino = useMemo(
    () => new Map(listaTreinos.map((treino) => [treino.id, treino.nome])),
    [listaTreinos],
  )
  /** Treinos previstos para hoje, derivados do fluxograma (plano 4.3). */
  const treinosDeHoje = useMemo(() => {
    const ocorrencias = expandirRecorrencia(listaFluxograma, {
      de: hojeISO,
      ate: hojeISO,
    })
    return ocorrencias.flatMap((ocorrencia) => {
      const treino = listaTreinos.find(
        (item) => item.id === ocorrencia.regra.treino_id,
      )
      return treino
        ? [{ treino, horario: ocorrencia.regra.horario_inicio }]
        : []
    })
  }, [listaFluxograma, hojeISO, listaTreinos])

  /**
   * Frequência da semana: execuções reais contra ocorrências previstas no
   * fluxograma (resolução 10.17).
   */
  const frequencia = useMemo(() => {
    const previstos = expandirRecorrencia(listaFluxograma, semana).length
    return frequenciaSemana(execucoesSemana.data?.length ?? 0, previstos)
  }, [listaFluxograma, semana, execucoesSemana.data])

  const volume = useMemo(
    () => volumeGrupoMuscular(seriesSemana.data ?? []),
    [seriesSemana.data],
  )

  const itensGrade: ItemFluxograma[] = useMemo(
    () =>
      listaFluxograma.map((item) => ({
        id: item.id,
        dia_semana: item.dia_semana,
        horario_inicio: item.horario_inicio,
        horario_fim: item.horario_fim,
        rotulo: nomePorTreino.get(item.treino_id) ?? 'Treino',
      })),
    [listaFluxograma, nomePorTreino],
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
            <DialogFluxogramaTreino treinos={listaTreinos} />
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
          descricao="Crie o treino, adicione os exercícios e agende-o no fluxograma — é o fluxograma que define o treino de hoje e a frequência da semana."
          acao={<DialogTreino />}
        />
      ) : (
        <div className="space-y-6">
          {/* Treino de hoje (plano 4.3) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Treino de hoje</CardTitle>
              <CardDescription>Derivado do fluxograma semanal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {treinosDeHoje.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum treino previsto para hoje.
                </p>
              ) : (
                treinosDeHoje.map(({ treino, horario }) => {
                  const doTreino = listaExercicios.filter
                    ? listaExercicios.filter(
                        (item) => item.treino_id === treino.id,
                      )
                    : []
                  return (
                    <div
                      key={treino.id}
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
                      <DialogExecucao
                        treino={treino}
                        exercicios={doTreino}
                        hoje={hoje}
                      />
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
                  Agende treinos no fluxograma para acompanhar a aderência.
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
                    <CardContent>
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
                                  to={`/treino/${exercicio.id}`}
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
                              <div className="flex shrink-0 items-center gap-0.5">
                                <DialogExercicio
                                  treinoId={treino.id}
                                  treinoNome={treino.nome}
                                  exercicio={exercicio}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-status-risco size-7 shrink-0"
                                  aria-label={`Remover ${exercicio.nome}`}
                                  onClick={() =>
                                    excluirExercicio.mutate(exercicio.id)
                                  }
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fluxograma semanal</CardTitle>
              <CardDescription>
                Treinos planejados — fonte única da frequência.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {itensGrade.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum horário cadastrado. Use "Horário" para adicionar.
                </p>
              ) : (
                <GradeFluxograma
                  itens={itensGrade}
                  classeCorPadrao="bg-treino"
                  onExcluir={(id) => excluirFluxograma.mutate(id)}
                />
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
