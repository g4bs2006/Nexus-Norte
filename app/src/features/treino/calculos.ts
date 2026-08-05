import { SEMANAS_SINAL_ESTAGNACAO } from '@/lib/constants'

/**
 * Cálculos de Treino (plano, seção 4.2).
 *
 * Funções puras: recebem os dados já carregados, sem tocar em rede ou na data
 * do sistema (plano, seção 9).
 *
 * Convenção do schema: cada `execucoes_exercicio` é UMA SÉRIE.
 */

/**
 * 1RM estimado pela fórmula de Epley: `carga × (1 + reps/30)`.
 *
 * É a mesma fórmula usada pelo trigger `trg_registrar_pr` no Postgres — a
 * duplicação é intencional: o banco garante o PR mesmo em escritas fora da UI,
 * e o cliente precisa do valor para exibir sem esperar o round-trip.
 */
export function umRmEstimado(carga: number, reps: number): number {
  return carga * (1 + reps / 30)
}

export interface FrequenciaSemana {
  realizados: number
  previstos: number
  /** `null` quando nada foi previsto para a semana. */
  percentual: number | null
}

/**
 * Execuções reais versus ocorrências previstas no fluxograma (plano 4.2 +
 * resolução 10.17 — o fluxograma é a fonte única do que estava planejado).
 */
export function frequenciaSemana(
  realizados: number,
  previstos: number,
): FrequenciaSemana {
  return {
    realizados,
    previstos,
    percentual: previstos > 0 ? (realizados / previstos) * 100 : null,
  }
}

export type Progressao = 'subindo' | 'estagnado' | 'caindo' | 'indefinido'

export interface SessaoExercicio {
  /** Data da execução, em ISO. */
  data: string
  /** Melhor 1RM estimado da sessão. */
  melhor1rm: number
}

/**
 * Agrupa séries por data e devolve o melhor 1RM de cada sessão, da mais antiga
 * para a mais recente. Base das demais análises de progressão.
 */
export function sessoesPorData(
  series: readonly { data: string; carga_real: number; reps_reais: number }[],
): SessaoExercicio[] {
  const melhorPorData = new Map<string, number>()

  for (const serie of series) {
    const estimado = umRmEstimado(serie.carga_real, serie.reps_reais)
    const atual = melhorPorData.get(serie.data)
    if (atual === undefined || estimado > atual) {
      melhorPorData.set(serie.data, estimado)
    }
  }

  return [...melhorPorData.entries()]
    .map(([data, melhor1rm]) => ({ data, melhor1rm }))
    .sort((a, b) => a.data.localeCompare(b.data))
}

/**
 * Compara a última sessão com a anterior (plano 4.2).
 *
 * A margem de 1% evita que ruído de arredondamento — trocar 8 reps de 80kg por
 * 6 de 85kg, por exemplo — seja lido como progressão real.
 */
export function progressaoCarga(
  sessoes: readonly SessaoExercicio[],
): Progressao {
  if (sessoes.length < 2) return 'indefinido'

  const ultima = sessoes[sessoes.length - 1]
  const anterior = sessoes[sessoes.length - 2]
  if (!ultima || !anterior) return 'indefinido'

  const margem = anterior.melhor1rm * 0.01
  if (ultima.melhor1rm > anterior.melhor1rm + margem) return 'subindo'
  if (ultima.melhor1rm < anterior.melhor1rm - margem) return 'caindo'
  return 'estagnado'
}

/**
 * Sinaliza estagnação quando o melhor 1RM não supera, nas últimas N sessões, o
 * melhor registrado antes delas (plano 4.2).
 *
 * Precisa de histórico suficiente: com menos sessões que a janela, não há como
 * afirmar estagnação — e sinalizar cedo faria todo exercício novo parecer
 * travado.
 */
export function sinalEstagnacao(
  sessoes: readonly SessaoExercicio[],
  janela: number = SEMANAS_SINAL_ESTAGNACAO,
): boolean {
  if (sessoes.length <= janela) return false

  const recentes = sessoes.slice(-janela)
  const anteriores = sessoes.slice(0, -janela)

  const melhorAnterior = Math.max(...anteriores.map((s) => s.melhor1rm))
  const melhorRecente = Math.max(...recentes.map((s) => s.melhor1rm))

  return melhorRecente <= melhorAnterior
}

export interface RecordeAgrupado {
  exercicio_base_id: string
  exercicio_nome: string
  /** Maior 1RM já registrado para este exercício, em qualquer treino. */
  melhor1rm: number
  carga: number
  reps: number
  data: string
}

interface PrParaAgrupar {
  exercicio_base_id: string
  exercicio_nome: string
  um_rm_estimado: number
  carga: number
  reps: number
  data: string
}

/**
 * Um recorde por exercício: o maior 1RM histórico (resolução 10.18).
 *
 * A tabela guarda cada marca batida, então um exercício tem várias linhas ao
 * longo do tempo. Aqui fica só a maior de cada — é isso que "recorde" significa.
 * Ordena do 1RM mais alto para o mais baixo.
 *
 * Antes da resolução 10.18 o PR era por exercício-dentro-de-um-treino, então o
 * mesmo movimento em dois treinos aparecia duas vezes com marcas diferentes.
 */
export function recordesPorExercicio(
  prs: readonly PrParaAgrupar[],
): RecordeAgrupado[] {
  const melhorPorBase = new Map<string, RecordeAgrupado>()

  for (const pr of prs) {
    const atual = melhorPorBase.get(pr.exercicio_base_id)
    if (atual !== undefined && atual.melhor1rm >= pr.um_rm_estimado) continue

    melhorPorBase.set(pr.exercicio_base_id, {
      exercicio_base_id: pr.exercicio_base_id,
      exercicio_nome: pr.exercicio_nome,
      melhor1rm: pr.um_rm_estimado,
      carga: pr.carga,
      reps: pr.reps,
      data: pr.data,
    })
  }

  return [...melhorPorBase.values()].sort((a, b) => b.melhor1rm - a.melhor1rm)
}

export interface SerieComGrupo {
  grupo_muscular: string | null
  carga_real: number
  reps_reais: number
}

/**
 * Volume por grupo muscular: Σ(reps × carga) de cada série (plano 4.2).
 *
 * O plano escreve "séries × reps × carga"; como cada linha de
 * `execucoes_exercicio` já é uma série, somar linha a linha dá o mesmo
 * resultado sem depender do número de séries planejado.
 *
 * Séries sem grupo definido entram em 'Sem grupo' em vez de serem descartadas.
 */
export function volumeGrupoMuscular(
  series: readonly SerieComGrupo[],
): Record<string, number> {
  const volume: Record<string, number> = {}

  for (const serie of series) {
    const grupo = serie.grupo_muscular ?? 'Sem grupo'
    volume[grupo] = (volume[grupo] ?? 0) + serie.carga_real * serie.reps_reais
  }

  return volume
}

// --- Sessões realizadas (resolução 10.21) -----------------------------------

/** Campos de `SerieExecutada` de que o agrupamento depende. */
export interface SerieDeSessao {
  id: string
  execucao_treino_id: string
  exercicio_id: string
  exercicio_base_id: string
  carga_real: number
  reps_reais: number
  rpe: number | null
  data: string
  treino_id: string
  execucao_criada_em: string
  execucao_finalizada_em: string | null
  execucao_hora_inicio: string | null
  execucao_duracao_minutos: number | null
  grupo_muscular: string | null
  exercicio_nome: string
}

/** PR mínimo para cruzar com a sessão. */
export interface RecordeParaCruzar {
  exercicio_base_id: string
  data: string
  um_rm_estimado: number
}

export interface ExercicioDaSessao {
  exercicio_base_id: string
  nome: string
  grupo_muscular: string | null
  series: SerieDeSessao[]
  /** Marcado como pulado naquela sessão (resolução 10.22). */
  pulado: boolean
}

/** Pulado mínimo para cruzar com a sessão. */
export interface PuladoParaCruzar {
  execucao_treino_id: string
  exercicio_base_id: string
  exercicio_nome: string
  grupo_muscular: string | null
}

export interface SessaoRealizada {
  /** Id em `execucoes_treino`. */
  id: string
  treino_id: string
  data: string
  emAndamento: boolean
  /** Horário informado pelo usuário, em `HH:MM`. Nulo = não informado. */
  horaInicio: string | null
  /**
   * Duração do treino, informada pelo usuário. Nulo = não informada.
   *
   * NÃO é derivada dos timestamps (resolução 10.24): `created_at` e
   * `finalizado_em` medem quanto tempo se passou REGISTRANDO, não treinando, e só
   * coincidem quando a sessão é anotada série a série do começo ao fim. Nas duas
   * sessões reais que existiam o número derivado estava errado — 0 min num
   * registro em lote e 18 min num treino feito horas antes.
   */
  duracaoMinutos: number | null
  /**
   * Minutos entre a primeira série gravada e o encerramento.
   *
   * Exibido como contexto ("registrado ao longo de X"), nunca como duração do
   * treino. Nulo enquanto em andamento.
   */
  spanRegistroMinutos: number | null
  totalSeries: number
  /** Σ(reps × carga) da sessão inteira. */
  volume: number
  exercicios: ExercicioDaSessao[]
  /** Recordes que caíram nesta sessão. */
  recordes: RecordeParaCruzar[]
}

/**
 * Agrupa séries soltas nas sessões a que pertencem.
 *
 * Agrupa por `execucao_treino_id` e não por data: não há unique em
 * `(treino_id, data)`, então dois treinos no mesmo dia são duas sessões
 * distintas e precisam ser lidas como tais.
 *
 * Os recordes são atribuídos por data **e** por exercício presente na sessão. Só
 * a data seria ambíguo com duas sessões no mesmo dia; exigir que o exercício
 * esteja na sessão resolve todos os casos menos o de repetir o mesmo movimento
 * nos dois treinos do dia — aí o recorde aparece nos dois, e preferimos mostrar
 * duas vezes a esconder.
 *
 * Ordem: mais recente primeiro, com a sessão em andamento no topo.
 */
export function sessoesRealizadas(
  series: readonly SerieDeSessao[],
  recordes: readonly RecordeParaCruzar[] = [],
  pulados: readonly PuladoParaCruzar[] = [],
): SessaoRealizada[] {
  const porSessao = new Map<string, SerieDeSessao[]>()
  for (const serie of series) {
    const lista = porSessao.get(serie.execucao_treino_id)
    if (lista) lista.push(serie)
    else porSessao.set(serie.execucao_treino_id, [serie])
  }

  const sessoes = [...porSessao.entries()].map(([id, doSessao]) => {
    // A primeira série define os campos da sessão: todas carregam os mesmos
    const primeira = doSessao[0] as SerieDeSessao

    const porExercicio = new Map<string, ExercicioDaSessao>()
    for (const serie of doSessao) {
      const atual = porExercicio.get(serie.exercicio_base_id)
      if (atual) atual.series.push(serie)
      else {
        porExercicio.set(serie.exercicio_base_id, {
          exercicio_base_id: serie.exercicio_base_id,
          nome: serie.exercicio_nome,
          grupo_muscular: serie.grupo_muscular,
          series: [serie],
          pulado: false,
        })
      }
    }

    /*
     * Pulados entram depois dos feitos, e só se não houver série do mesmo
     * exercício.
     *
     * O gatilho no banco já impede as duas marcas juntas, mas ler nesta ordem
     * torna a exibição determinística de todo jeito: série gravada é fato mais
     * forte que a marca de pulado, e um dado incoerente nunca apareceria como
     * feito e pulado ao mesmo tempo.
     */
    for (const pulado of pulados) {
      if (pulado.execucao_treino_id !== id) continue
      if (porExercicio.has(pulado.exercicio_base_id)) continue
      porExercicio.set(pulado.exercicio_base_id, {
        exercicio_base_id: pulado.exercicio_base_id,
        nome: pulado.exercicio_nome,
        grupo_muscular: pulado.grupo_muscular,
        series: [],
        pulado: true,
      })
    }

    const basesDaSessao = new Set(doSessao.map((s) => s.exercicio_base_id))

    return {
      id,
      treino_id: primeira.treino_id,
      data: primeira.data,
      emAndamento: primeira.execucao_finalizada_em === null,
      horaInicio: primeira.execucao_hora_inicio?.slice(0, 5) ?? null,
      duracaoMinutos: primeira.execucao_duracao_minutos,
      spanRegistroMinutos: duracaoDaSessao(
        primeira.execucao_criada_em,
        primeira.execucao_finalizada_em,
      ),
      totalSeries: doSessao.length,
      volume: doSessao.reduce(
        (soma, s) => soma + s.carga_real * s.reps_reais,
        0,
      ),
      exercicios: [...porExercicio.values()],
      recordes: recordes.filter(
        (pr) =>
          pr.data === primeira.data && basesDaSessao.has(pr.exercicio_base_id),
      ),
    }
  })

  return sessoes.sort(
    (a, b) =>
      Number(b.emAndamento) - Number(a.emAndamento) ||
      b.data.localeCompare(a.data),
  )
}

/** Intervalo entre a primeira série e o encerramento — tempo de REGISTRO. */
function duracaoDaSessao(
  criadaEm: string,
  finalizadaEm: string | null,
): number | null {
  if (finalizadaEm === null) return null
  const minutos =
    (new Date(finalizadaEm).getTime() - new Date(criadaEm).getTime()) / 60_000
  return minutos > 0 ? Math.round(minutos) : null
}

/** `95` → `1h35`; `48` → `48min` */
export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos}min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
