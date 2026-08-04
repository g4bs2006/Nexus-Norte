import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { addDays, getDate, getDaysInMonth, subDays } from 'date-fns'
import { format } from 'date-fns'
import {
  CalendarDays,
  Dumbbell,
  FolderKanban,
  GraduationCap,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { ChecksFluxograma, type ItemCheckFluxograma } from '@/components/ChecksFluxograma'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  deISO,
  formatarMoeda,
  inicioSemana,
  limitesDoMes,
  mesDeISO,
  paraISO,
} from '@/lib/datas'
import { expandirRecorrencia, ocorrenciasDoDia } from '@/lib/recorrencia'
import { cn } from '@/lib/utils'
import {
  metaTotalDespesas,
  saldoProjetadoFimMes,
  totaisDoMes,
} from '@/features/financeiro/calculos'
import {
  useCategorias,
  useCheckDia,
  useReceitaDoMes,
  useSalvarCheck,
} from '@/features/financeiro/hooks'
import {
  faltasRestantes,
  mediaProjetada,
  proximaAvaliacao,
  riscoReprovacao,
} from '@/features/estudos/calculos'
import {
  useAvaliacoes,
  useConclusoes,
  useDefinirConclusao,
  useFaltas,
  useFluxograma,
  useMaterias,
} from '@/features/estudos/hooks'
import { frequenciaSemana } from '@/features/treino/calculos'
import {
  useExecucoes,
  useExercicios,
  useFluxogramaTreino,
  usePersonalRecords,
  useTreinos,
} from '@/features/treino/hooks'
import {
  diasDesdeUltimaAtualizacao,
  momentumBaixo,
} from '@/features/projetos/calculos'
import { useLogs, useProjetos } from '@/features/projetos/hooks'
import { horasEntre } from '@/features/sono/calculos'
import { usePlanejamentoSono, useRegistroSono } from '@/features/sono/hooks'
import { DialogSono } from '@/features/sono/componentes/DialogSono'
import { construirEventos, COR_CAMADA } from '@/features/calendario/eventos'
import { useFontesCalendario } from '@/features/calendario/hooks'
import { MiniCard } from '@/features/home/componentes/MiniCard'
import { IndicadorSono } from '@/features/home/componentes/IndicadorSono'

const EVENTOS_NA_HOME = 5
const DIAS_PROXIMOS_EVENTOS = 14

export default function HomePage() {
  const hoje = useMemo(() => new Date(), [])
  const hojeISO = paraISO(hoje)
  const ontemISO = paraISO(subDays(hoje, 1))
  const mesAtual = mesDeISO(hoje)
  const { inicio: inicioMes } = limitesDoMes(hoje)

  const semana = useMemo(() => {
    const inicio = inicioSemana(hoje)
    return { de: paraISO(inicio), ate: paraISO(addDays(inicio, 6)) }
  }, [hoje])

  const proximos = useMemo(
    () => ({ de: hojeISO, ate: paraISO(addDays(hoje, DIAS_PROXIMOS_EVENTOS)) }),
    [hoje, hojeISO],
  )

  // --- Financeiro: lê o campo-resumo, sem reagregar (plano 7.2) -------------
  const categorias = useCategorias()
  const receita = useReceitaDoMes(mesAtual)
  const check = useCheckDia(hojeISO)
  const salvarCheck = useSalvarCheck()

  // --- Estudos --------------------------------------------------------------
  const materias = useMaterias()
  const avaliacoes = useAvaliacoes()
  const faltas = useFaltas()
  const fluxogramaEstudos = useFluxograma()
  const conclusoes = useConclusoes(hojeISO)
  const definirConclusao = useDefinirConclusao()

  // --- Treino ---------------------------------------------------------------
  const treinos = useTreinos()
  const exercicios = useExercicios()
  const fluxogramaTreino = useFluxogramaTreino()
  const execucoesSemana = useExecucoes(semana.de, semana.ate)
  const prs = usePersonalRecords()

  // --- Projetos -------------------------------------------------------------
  const projetos = useProjetos()
  const logs = useLogs()

  // --- Sono -----------------------------------------------------------------
  const sonoOntem = useRegistroSono(ontemISO)
  const planoSonoOntem = usePlanejamentoSono(subDays(hoje, 1).getDay())

  // --- Calendário -----------------------------------------------------------
  const { fontes } = useFontesCalendario(proximos.de, proximos.ate)

  const financeiro = useMemo(() => {
    const lista = categorias.data ?? []
    const receitaDoMes = receita.data ?? 0
    const totais = totaisDoMes(lista)
    const metaTotal = metaTotalDespesas(lista, receitaDoMes)

    return {
      totais,
      // Status do mês: vermelho se já estourou a meta, amarelo se passou de 85%
      status:
        metaTotal > 0 && totais.despesa > metaTotal
          ? ('risco' as const)
          : metaTotal > 0 && totais.despesa > metaTotal * 0.85
            ? ('atencao' as const)
            : ('ok' as const),
      saldoProjetado: saldoProjetadoFimMes({
        receitaDoMes,
        gastoAteAgora: totais.despesa,
        diaAtual: getDate(hoje),
        diasNoMes: getDaysInMonth(hoje),
      }),
      temDados: lista.length > 0,
    }
  }, [categorias.data, receita.data, hoje])

  const estudos = useMemo(() => {
    const lista = materias.data ?? []
    const todasAvaliacoes = avaliacoes.data ?? []
    const todasFaltas = faltas.data ?? []

    const emRisco = lista.filter((materia) => {
      const daMateria = todasAvaliacoes.filter(
        (avaliacao) => avaliacao.materia_id === materia.id,
      )
      const totalFaltas = todasFaltas.filter(
        (falta) => falta.materia_id === materia.id,
      ).length
      return (
        riscoReprovacao({
          mediaProjetada: mediaProjetada(daMateria, null),
          faltasRestantes: faltasRestantes(materia.limite_faltas, totalFaltas),
          limiteFaltas: materia.limite_faltas,
        }) === 'risco'
      )
    })

    // Próxima avaliação entre TODAS as matérias (plano 7.1)
    const proxima = proximaAvaliacao(todasAvaliacoes, hoje)
    const nomeMateria = proxima
      ? lista.find((materia) => materia.id === proxima.avaliacao.materia_id)?.nome
      : undefined

    return { total: lista.length, emRisco, proxima, nomeMateria }
  }, [materias.data, avaliacoes.data, faltas.data, hoje])

  const treino = useMemo(() => {
    const previstos = expandirRecorrencia(
      fluxogramaTreino.data ?? [],
      semana,
    ).length
    const frequencia = frequenciaSemana(
      execucoesSemana.data?.length ?? 0,
      previstos,
    )

    const ultimoPr = (prs.data ?? [])[0] ?? null
    const nomeExercicio = ultimoPr
      ? (exercicios.data ?? []).find(
          (item) => item.id === ultimoPr.exercicio_id,
        )?.nome
      : undefined

    return {
      frequencia,
      ultimoPr,
      nomeExercicio,
      temDados: (treinos.data ?? []).length > 0,
    }
  }, [
    fluxogramaTreino.data,
    semana,
    execucoesSemana.data,
    prs.data,
    exercicios.data,
    treinos.data,
  ])

  const projetosResumo = useMemo(() => {
    const lista = projetos.data ?? []
    const todosLogs = logs.data ?? []

    const ativos = lista.filter(
      (projeto) =>
        projeto.status === 'em_andamento' || projeto.status === 'planejamento',
    )

    const comMomentum = ativos.map((projeto) => {
      const dias = diasDesdeUltimaAtualizacao(
        todosLogs.filter((log) => log.projeto_id === projeto.id),
        hoje,
      )
      return { projeto, dias, frio: momentumBaixo(dias) }
    })

    // Mais ativo = menor número de dias desde a última atualização
    const maisAtivo = comMomentum
      .filter((item) => item.dias !== null)
      .sort((a, b) => (a.dias as number) - (b.dias as number))[0]

    return {
      total: lista.length,
      frios: comMomentum.filter((item) => item.frio),
      maisAtivo,
    }
  }, [projetos.data, logs.data, hoje])

  const sono = useMemo(() => {
    const registro = sonoOntem.data
    const plano = planoSonoOntem.data
    return {
      horasDormidas: registro?.horas_calculadas ?? null,
      horasMeta: plano
        ? horasEntre(plano.hora_dormir_alvo, plano.hora_acordar_alvo)
        : null,
    }
  }, [sonoOntem.data, planoSonoOntem.data])

  /** Checks do dia: financeiro + aulas + treinos, em lista única (plano 7.1). */
  const checksFluxograma = useMemo(() => {
    const concluidos = new Set(conclusoes.data ?? [])
    const nomeMateria = new Map(
      (materias.data ?? []).map((materia) => [materia.id, materia.nome]),
    )
    const nomeTreino = new Map(
      (treinos.data ?? []).map((item) => [item.id, item.nome]),
    )

    const aulas: ItemCheckFluxograma[] = ocorrenciasDoDia(
      fluxogramaEstudos.data ?? [],
      hojeISO,
    ).map((ocorrencia) => ({
      fluxogramaId: ocorrencia.regra.id,
      rotulo: nomeMateria.get(ocorrencia.regra.materia_id) ?? 'Aula',
      horario: ocorrencia.regra.horario_inicio.slice(0, 5),
      concluido: concluidos.has(ocorrencia.regra.id),
      remarcada: ocorrencia.remarcada,
    }))

    const treinosHoje: ItemCheckFluxograma[] = ocorrenciasDoDia(
      fluxogramaTreino.data ?? [],
      hojeISO,
    ).map((ocorrencia) => ({
      fluxogramaId: ocorrencia.regra.id,
      rotulo: nomeTreino.get(ocorrencia.regra.treino_id) ?? 'Treino',
      horario: ocorrencia.regra.horario_inicio.slice(0, 5),
      concluido: concluidos.has(ocorrencia.regra.id),
      remarcada: ocorrencia.remarcada,
    }))

    return [...aulas, ...treinosHoje]
  }, [
    conclusoes.data,
    materias.data,
    treinos.data,
    fluxogramaEstudos.data,
    fluxogramaTreino.data,
    hojeISO,
  ])

  const proximosEventos = useMemo(
    () =>
      construirEventos(fontes, proximos)
        // Sono é recorrente diário e inundaria a lista de próximos eventos
        .filter((evento) => evento.camada !== 'sono')
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .slice(0, EVENTOS_NA_HOME),
    [fontes, proximos],
  )

  const CLASSE_STATUS = {
    ok: 'text-status-ok',
    atencao: 'text-status-atencao',
    risco: 'text-status-risco',
  } as const

  return (
    <>
      <PageHeader
        titulo="Home"
        descricao={format(hoje, "EEEE, d 'de' MMMM")}
      />

      <div className="space-y-6">
        {/* Checks do dia — a ação, não o resultado (plano 7.1) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checks de hoje</CardTitle>
            <CardDescription>
              O que precisa ser feito, em uma lista só.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="home-check-financeiro"
                checked={check.data?.financeiro_registrado ?? false}
                onCheckedChange={(marcado) =>
                  salvarCheck.mutate({
                    data: hojeISO,
                    campos: { financeiro_registrado: marcado === true },
                  })
                }
              />
              <Label
                htmlFor="home-check-financeiro"
                className={cn(
                  'text-sm font-normal',
                  check.data?.financeiro_registrado &&
                    'text-muted-foreground line-through',
                )}
              >
                Lancei os gastos de hoje?
              </Label>
            </div>

            {hoje.getDay() === 0 && (
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="home-check-planejamento"
                  checked={check.data?.planejamento_semana_feito ?? false}
                  onCheckedChange={(marcado) =>
                    salvarCheck.mutate({
                      data: hojeISO,
                      campos: { planejamento_semana_feito: marcado === true },
                    })
                  }
                />
                <Label
                  htmlFor="home-check-planejamento"
                  className={cn(
                    'text-sm font-normal',
                    check.data?.planejamento_semana_feito &&
                      'text-muted-foreground line-through',
                  )}
                >
                  Planejei a semana?
                </Label>
              </div>
            )}

            <ChecksFluxograma
              itens={checksFluxograma}
              vazio="Nenhuma aula ou treino previsto para hoje."
              onAlternar={(fluxogramaId, concluido) =>
                definirConclusao.mutate({
                  fluxogramaId,
                  data: hojeISO,
                  concluido,
                })
              }
            />
          </CardContent>
        </Card>

        {/* Mini-cards dos pilares */}
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniCard
            titulo="Financeiro"
            icone={Wallet}
            classeCor="text-financeiro"
            rota="/financeiro"
          >
            {financeiro.temDados ? (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-muted-foreground text-xs">
                    Saldo do mês
                  </span>
                  <span
                    className={cn(
                      'text-lg tabular-nums',
                      CLASSE_STATUS[financeiro.status],
                    )}
                  >
                    {formatarMoeda(financeiro.totais.saldo)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatarMoeda(financeiro.totais.receita)} entrou ·{' '}
                  {formatarMoeda(financeiro.totais.despesa)} saiu
                </p>
                <p className="text-muted-foreground text-xs">
                  projeção: {formatarMoeda(financeiro.saldoProjetado)}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Nenhuma categoria cadastrada.
              </p>
            )}
          </MiniCard>

          <MiniCard
            titulo="Estudos"
            icone={GraduationCap}
            classeCor="text-estudos"
            rota="/estudos"
          >
            {estudos.total > 0 ? (
              <div className="space-y-1.5">
                {estudos.emRisco.length > 0 ? (
                  <div className="space-y-1">
                    <Badge
                      variant="secondary"
                      className="text-status-risco font-normal"
                    >
                      {estudos.emRisco.length}{' '}
                      {estudos.emRisco.length === 1
                        ? 'matéria em risco'
                        : 'matérias em risco'}
                    </Badge>
                    <p className="text-muted-foreground truncate text-xs">
                      {estudos.emRisco.map((materia) => materia.nome).join(', ')}
                    </p>
                  </div>
                ) : (
                  <p className="text-status-ok text-xs">
                    Nenhuma matéria em risco.
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  {estudos.proxima
                    ? `${estudos.proxima.avaliacao.nome}${
                        estudos.nomeMateria ? ` de ${estudos.nomeMateria}` : ''
                      } em ${
                        estudos.proxima.dias === 0
                          ? 'hoje'
                          : `${estudos.proxima.dias} dias`
                      }`
                    : 'Nenhuma avaliação marcada.'}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Nenhuma matéria cadastrada.
              </p>
            )}
          </MiniCard>

          <MiniCard
            titulo="Treino"
            icone={Dumbbell}
            classeCor="text-treino"
            rota="/treino"
          >
            {treino.temDados ? (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-muted-foreground text-xs">
                    Frequência da semana
                  </span>
                  <span className="text-lg tabular-nums">
                    {treino.frequencia.realizados}
                    <span className="text-muted-foreground text-sm">
                      /{treino.frequencia.previstos || '—'}
                    </span>
                  </span>
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {treino.ultimoPr
                    ? `PR recente: ${treino.nomeExercicio ?? 'exercício'} — ${treino.ultimoPr.um_rm_estimado.toFixed(1)}kg`
                    : 'Nenhum PR registrado.'}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Nenhum treino cadastrado.
              </p>
            )}
          </MiniCard>

          <MiniCard
            titulo="Projetos"
            icone={FolderKanban}
            classeCor="text-projetos"
            rota="/projetos"
          >
            {projetosResumo.total > 0 ? (
              <div className="space-y-1.5">
                {projetosResumo.frios.length > 0 ? (
                  <div className="space-y-1">
                    <Badge
                      variant="secondary"
                      className="text-status-atencao font-normal"
                    >
                      {projetosResumo.frios.length} sem movimento
                    </Badge>
                    <p className="text-muted-foreground truncate text-xs">
                      {projetosResumo.frios
                        .map((item) => item.projeto.nome)
                        .join(', ')}
                    </p>
                  </div>
                ) : (
                  <p className="text-status-ok text-xs">
                    Todos os projetos com movimento recente.
                  </p>
                )}
                <p className="text-muted-foreground truncate text-xs">
                  {projetosResumo.maisAtivo
                    ? `Mais ativo: ${projetosResumo.maisAtivo.projeto.nome}`
                    : 'Nenhum log de progresso ainda.'}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Nenhum projeto cadastrado.
              </p>
            )}
          </MiniCard>
        </div>

        <IndicadorSono
          horasDormidas={sono.horasDormidas}
          horasMeta={sono.horasMeta}
          acao={<DialogSono hoje={hoje} />}
        />

        {/* Atalho para o calendário (plano 7.1) */}
        <Card>
          <CardHeader>
            <Link
              to="/calendario"
              className="group flex items-center justify-between gap-2"
            >
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="text-sono size-4" />
                  Próximos eventos
                </CardTitle>
                <CardDescription>
                  Próximos {DIAS_PROXIMOS_EVENTOS} dias.
                </CardDescription>
              </div>
            </Link>
          </CardHeader>
          <CardContent>
            {proximosEventos.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nada agendado para as próximas semanas.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {proximosEventos.map((evento) => (
                  <li
                    key={evento.id}
                    className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0"
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: COR_CAMADA[evento.camada] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {evento.titulo}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {format(deISO(evento.inicio.slice(0, 10)), 'dd/MM')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-xs">
          Mês de referência: {format(deISO(inicioMes), 'MMMM yyyy')}
        </p>
      </div>
    </>
  )
}
