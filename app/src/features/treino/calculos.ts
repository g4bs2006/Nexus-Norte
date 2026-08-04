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
