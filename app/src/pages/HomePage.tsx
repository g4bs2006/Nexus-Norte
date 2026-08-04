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
import { CheckDia } from '@/components/CheckDia'
import { BarraProgresso } from '@/components/BarraProgresso'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

    /**
     * Severidade da semana. Sem nada previsto no fluxograma não há aderência a
     * julgar — seria injusto pintar de vermelho quem não planejou treino.
     */
    const status =
      frequencia.percentual === null
        ? ('ok' as const)
        : frequencia.percentual >= 100
          ? ('ok' as const)
          : frequencia.percentual >= 50
            ? ('atencao' as const)
            : ('risco' as const)

    return {
      frequencia,
      status,
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

  /**
   * Contagem do dia. Inclui o check semanal só no domingo, senão o denominador
   * mostraria uma tarefa que não existe hoje.
   */
  const { concluidos, totalChecks } = useMemo(() => {
    const ehDomingo = hoje.getDay() === 0
    const fixos = [
      check.data?.financeiro_registrado ?? false,
      ...(ehDomingo ? [check.data?.planejamento_semana_feito ?? false] : []),
    ]
    const todos = [...fixos, ...checksFluxograma.map((i) => i.concluido)]

    return {
      concluidos: todos.filter(Boolean).length,
      totalChecks: todos.length,
    }
  }, [check.data, checksFluxograma, hoje])

  const proximosEventos = useMemo(
    () =>
      construirEventos(fontes, proximos)
        // Sono é recorrente diário e inundaria a lista de próximos eventos
        .filter((evento) => evento.camada !== 'sono')
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .slice(0, EVENTOS_NA_HOME),
    [fontes, proximos],
  )


  return (
    <>
      <PageHeader
        titulo="Home"
        descricao={format(hoje, "EEEE, d 'de' MMMM")}
      />

      <div className="space-y-6">
        {/*
          O dia — assinatura da Home (Bloco C do brief).
          Promovido a bloco de destaque: é a tese do plano ("checks são ação,
          não resultado") e o que se toca todo dia. O resto da página é quieto
          de propósito, para este ser o único lugar com peso visual.
        */}
        <Card className="border-foreground/15 shadow-none">
          <CardHeader>
            <div className="flex items-baseline justify-between gap-3">
              <div className="space-y-1.5">
                <CardTitle className="text-base">O dia</CardTitle>
                <CardDescription>
                  {totalChecks === 0
                    ? 'Nada previsto para hoje.'
                    : concluidos === totalChecks
                      ? 'Tudo feito.'
                      : `${concluidos} de ${totalChecks} feito${concluidos === 1 ? '' : 's'}.`}
                </CardDescription>
              </div>
              {totalChecks > 0 && (
                <span
                  className={cn(
                    'metric-md shrink-0',
                    concluidos === totalChecks && 'text-status-ok',
                  )}
                >
                  {concluidos}/{totalChecks}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalChecks > 0 && (
              <BarraProgresso
                valor={(concluidos / totalChecks) * 100}
                classeCor={
                  concluidos === totalChecks ? 'bg-status-ok' : 'bg-foreground/60'
                }
                rotulo="Checks concluídos hoje"
              />
            )}

            <ul className="space-y-0.5">
              <li>
                <CheckDia
                  id="home-check-financeiro"
                  marcado={check.data?.financeiro_registrado ?? false}
                  onAlternar={(marcado) =>
                    salvarCheck.mutate({
                      data: hojeISO,
                      campos: { financeiro_registrado: marcado },
                    })
                  }
                >
                  Lancei os gastos de hoje
                </CheckDia>
              </li>

              {/* Ritual de domingo (plano 2.4) */}
              {hoje.getDay() === 0 && (
                <li>
                  <CheckDia
                    id="home-check-planejamento"
                    marcado={check.data?.planejamento_semana_feito ?? false}
                    onAlternar={(marcado) =>
                      salvarCheck.mutate({
                        data: hojeISO,
                        campos: { planejamento_semana_feito: marcado },
                      })
                    }
                  >
                    Planejei a semana
                  </CheckDia>
                </li>
              )}
            </ul>

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

        {/* Faixa de status dos pilares — resumo antes do detalhe (Bloco D) */}
        <div className="surgir-grupo grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniCard
            titulo="Financeiro"
            icone={Wallet}
            classeCor="text-financeiro"
            rota="/financeiro"
            status={financeiro.status}
            valor={
              financeiro.temDados ? formatarMoeda(financeiro.totais.saldo) : '—'
            }
            detalhe={
              financeiro.temDados
                ? `projeção ${formatarMoeda(financeiro.saldoProjetado)}`
                : 'sem categorias'
            }
          />

          <MiniCard
            titulo="Estudos"
            icone={GraduationCap}
            classeCor="text-estudos"
            rota="/estudos"
            status={estudos.emRisco.length > 0 ? 'risco' : 'ok'}
            valor={
              estudos.total === 0
                ? '—'
                : estudos.emRisco.length > 0
                  ? `${estudos.emRisco.length} em risco`
                  : 'Tudo certo'
            }
            detalhe={
              estudos.total === 0
                ? 'sem matérias'
                : estudos.proxima
                  ? `${estudos.proxima.avaliacao.nome} em ${
                      estudos.proxima.dias === 0
                        ? 'hoje'
                        : `${estudos.proxima.dias} dias`
                    }`
                  : 'sem avaliação marcada'
            }
          />

          <MiniCard
            titulo="Treino"
            icone={Dumbbell}
            classeCor="text-treino"
            rota="/treino"
            status={treino.status}
            valor={
              treino.temDados
                ? `${treino.frequencia.realizados}/${treino.frequencia.previstos || '—'}`
                : '—'
            }
            detalhe={
              !treino.temDados
                ? 'sem treinos'
                : treino.ultimoPr
                  ? `PR ${treino.ultimoPr.um_rm_estimado.toFixed(1)}kg · ${treino.nomeExercicio ?? 'exercício'}`
                  : 'nenhum PR ainda'
            }
          />

          <MiniCard
            titulo="Projetos"
            icone={FolderKanban}
            classeCor="text-projetos"
            rota="/projetos"
            status={projetosResumo.frios.length > 0 ? 'atencao' : 'ok'}
            valor={
              projetosResumo.total === 0
                ? '—'
                : projetosResumo.frios.length > 0
                  ? `${projetosResumo.frios.length} paradinho${projetosResumo.frios.length === 1 ? '' : 's'}`
                  : 'Em movimento'
            }
            detalhe={
              projetosResumo.total === 0
                ? 'sem projetos'
                : projetosResumo.maisAtivo
                  ? `ativo: ${projetosResumo.maisAtivo.projeto.nome}`
                  : 'nenhum log ainda'
            }
          />
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
