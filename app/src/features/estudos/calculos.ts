import { differenceInCalendarDays } from 'date-fns'
import {
  FALTAS_ATENCAO,
  MARGEM_ATENCAO_MEDIA,
  NOTA_MINIMA_APROVACAO,
} from '@/lib/constants'
import { deISO } from '@/lib/datas'
import type {
  Avaliacao,
  ConfigCalculoMedia,
  Materia,
  SessaoEstudo,
  Status,
} from './types'

/**
 * Cálculos de Estudos (plano, seção 3.2 + resolução 10.3).
 *
 * Funções puras: a data de referência entra sempre como parâmetro, nunca é
 * lida do sistema dentro da função (plano, seção 9).
 */

type AvaliacaoCalculo = Pick<Avaliacao, 'peso' | 'nota'>

/**
 * Média atual da matéria (plano 3.2).
 *
 * `manual` devolve a nota informada; `ponderada` faz Σ(nota × peso) ÷ Σ(peso)
 * considerando **apenas avaliações já corrigidas** — tratar pendentes como
 * zero faria toda matéria começar reprovada.
 *
 * Retorna `null` quando não há base para calcular.
 */
export function mediaMateria(
  avaliacoes: readonly AvaliacaoCalculo[],
  config: Pick<ConfigCalculoMedia, 'tipo' | 'nota_manual'> | null,
): number | null {
  if (config?.tipo === 'manual') return config.nota_manual

  let somaPonderada = 0
  let somaPesos = 0
  for (const avaliacao of avaliacoes) {
    if (avaliacao.nota === null) continue
    somaPonderada += avaliacao.nota * avaliacao.peso
    somaPesos += avaliacao.peso
  }

  if (somaPesos === 0) return null
  return somaPonderada / somaPesos
}

/**
 * Média projetada (resolução 10.3).
 *
 * Assume a nota mínima de aprovação para as avaliações ainda sem nota — um
 * "pior caso realista" que responde "se eu passar raspando no que falta, onde
 * eu termino?". É o que alimenta o semáforo de risco.
 *
 * Diferente de `mediaMateria`, considera o peso TOTAL da matéria, incluindo o
 * das avaliações pendentes.
 */
export function mediaProjetada(
  avaliacoes: readonly AvaliacaoCalculo[],
  config: Pick<ConfigCalculoMedia, 'tipo' | 'nota_manual'> | null,
  notaMinima: number = NOTA_MINIMA_APROVACAO,
): number | null {
  // Média manual não se projeta: o valor é declarado, não derivado.
  if (config?.tipo === 'manual') return config.nota_manual
  if (avaliacoes.length === 0) return null

  let soma = 0
  let somaPesos = 0
  for (const avaliacao of avaliacoes) {
    soma += (avaliacao.nota ?? notaMinima) * avaliacao.peso
    somaPesos += avaliacao.peso
  }

  if (somaPesos === 0) return null
  return soma / somaPesos
}

/** Faltas que ainda podem ser usadas. Nunca negativo (plano 3.2). */
export function faltasRestantes(
  limiteFaltas: number,
  totalFaltas: number,
): number {
  return Math.max(limiteFaltas - totalFaltas, 0)
}

export interface ParametrosRisco {
  mediaProjetada: number | null
  faltasRestantes: number
  limiteFaltas: number
  notaMinima?: number
}

/**
 * Semáforo de risco de reprovação: cruza média projetada com faltas restantes
 * (plano 3.2). O pior dos dois eixos define o resultado — não adianta a média
 * estar ótima se as faltas já estouraram.
 *
 * Matérias sem `limite_faltas` configurado (0) não são julgadas pelo eixo de
 * presença, senão toda matéria nasceria vermelha.
 */
export function riscoReprovacao({
  mediaProjetada: projetada,
  faltasRestantes: restantes,
  limiteFaltas,
  notaMinima = NOTA_MINIMA_APROVACAO,
}: ParametrosRisco): Status {
  const controlaFaltas = limiteFaltas > 0

  if (controlaFaltas && restantes <= 0) return 'risco'
  if (projetada !== null && projetada < notaMinima) return 'risco'

  if (controlaFaltas && restantes <= FALTAS_ATENCAO) return 'atencao'
  if (projetada !== null && projetada < notaMinima + MARGEM_ATENCAO_MEDIA) {
    return 'atencao'
  }

  return 'ok'
}

export interface FrequenciaEstudo {
  minutosEstudados: number
  metaMinutos: number
  /** Percentual da meta cumprido; `null` quando não há meta definida. */
  percentual: number | null
}

/**
 * Minutos estudados em um intervalo, comparados à meta (plano 3.2).
 *
 * A meta vem de `meta_diaria_minutos` da própria sessão, que guarda a
 * referência histórica do dia — multiplicada pelos dias do intervalo.
 */
export function frequenciaEstudoSemana(
  sessoes: readonly Pick<
    SessaoEstudo,
    'duracao_minutos' | 'meta_diaria_minutos'
  >[],
  diasNoIntervalo: number,
): FrequenciaEstudo {
  let minutosEstudados = 0
  let metaDiaria: number | null = null

  for (const sessao of sessoes) {
    minutosEstudados += sessao.duracao_minutos
    // Usa a meta mais recente encontrada como referência do período
    if (sessao.meta_diaria_minutos !== null) {
      metaDiaria = sessao.meta_diaria_minutos
    }
  }

  const metaMinutos = metaDiaria === null ? 0 : metaDiaria * diasNoIntervalo

  return {
    minutosEstudados,
    metaMinutos,
    percentual: metaMinutos > 0 ? (minutosEstudados / metaMinutos) * 100 : null,
  }
}

export interface ProximaAvaliacao {
  avaliacao: Avaliacao
  dias: number
}

/**
 * Próxima avaliação sem nota e com data futura, e em quantos dias cai
 * (plano 3.2). Avaliações sem data marcada são ignoradas — não há contagem
 * regressiva possível.
 */
export function proximaAvaliacao(
  avaliacoes: readonly Avaliacao[],
  hoje: Date,
): ProximaAvaliacao | null {
  let melhor: ProximaAvaliacao | null = null

  for (const avaliacao of avaliacoes) {
    if (avaliacao.nota !== null || avaliacao.data === null) continue
    const dias = differenceInCalendarDays(deISO(avaliacao.data), hoje)
    if (dias < 0) continue
    if (melhor === null || dias < melhor.dias) melhor = { avaliacao, dias }
  }

  return melhor
}

/**
 * A data cai dentro do período de aulas da matéria (discussão em uso, 06/08).
 *
 * `data_inicio`/`data_fim` são independentes e opcionais — sem um dos dois
 * (ou os dois), aquele lado não limita nada. Matéria sem período nenhum
 * sempre devolve `true`, preservando o comportamento de antes desta
 * resolução: o fluxograma continua gerando aula todo dia da semana marcado,
 * sem fim.
 */
export function dentroDoPeriodoMateria(
  data: string,
  materia: Pick<Materia, 'data_inicio' | 'data_fim'>,
): boolean {
  if (materia.data_inicio !== null && data < materia.data_inicio) return false
  if (materia.data_fim !== null && data > materia.data_fim) return false
  return true
}

/** Acerto na lista de exercícios, em percentual (plano 3.3). */
export function percentualAcerto(
  totalQuestoes: number,
  questoesErradas: readonly number[],
): number | null {
  if (totalQuestoes <= 0) return null
  const acertos = totalQuestoes - questoesErradas.length
  return (Math.max(acertos, 0) / totalQuestoes) * 100
}
