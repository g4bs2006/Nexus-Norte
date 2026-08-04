/**
 * Constantes de domínio.
 *
 * Regra do plano (seção 9 / resolução 10.3): valores usados em fórmulas ficam
 * declarados aqui, uma única vez — nunca hardcoded em múltiplos pontos.
 */

/**
 * Nota mínima para aprovação. Usada por `media_projetada` (resolução 10.3),
 * que assume esta nota para avaliações ainda sem resultado lançado.
 */
export const NOTA_MINIMA_APROVACAO = 6.0

/**
 * Dias sem log de progresso a partir dos quais um projeto é considerado
 * "momentum baixo" e esfria visualmente (plano 5.2).
 */
export const DIAS_MOMENTUM_BAIXO = 14

/**
 * Semanas consecutivas sem progressão de carga que disparam sinal de
 * estagnação em um exercício (plano 4.2).
 */
export const SEMANAS_SINAL_ESTAGNACAO = 3

/**
 * Meses consecutivos acima da meta que tornam uma categoria variável
 * candidata a corte (plano 2.2 / resolução 10.9).
 */
export const MESES_CANDIDATO_CORTE = 2

/**
 * Dias da semana na convenção de `Date.getDay()` — 0 = domingo.
 * Alinhado com `planejamento_sono.dia_semana` e `fluxograma_semanal.dia_semana`.
 */
export const DIAS_SEMANA = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6
